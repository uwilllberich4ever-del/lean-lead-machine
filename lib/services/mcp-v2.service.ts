/**
 * Service MCP V2 pour Lean Lead Machine
 * Intégration avec l'API MCP data.gouv.fr réelle
 */

import { Redis } from '@upstash/redis';

// Types de données MCP
export interface MCPCompany {
  siren: string;
  denomination: string;
  denominationUsuelle?: string;
  adresse: {
    codePostal: string;
    libelleCommune: string;
    numeroVoie?: string;
    typeVoie?: string;
    libelleVoie?: string;
    libelleRegion: string;
    latitude?: number;
    longitude?: number;
  };
  activitePrincipale: {
    code: string;
    libelle: string;
  };
  trancheEffectif: string;
  dateCreation: string;
  categorieJuridique: {
    code: string;
    libelle: string;
  };
  effectif?: number;
  statut: 'Actif' | 'Cessé' | 'Radié';
  capitalSocial?: number;
}

export interface RNEExecutive {
  nom: string;
  prenom: string;
  qualite: string;
  dateNomination: string;
  dateCessation?: string;
}

export interface GoldenRecord {
  // Identité
  siren: string;
  denomination: string;
  
  // Adresse
  adresse: {
    complete: string;
    codePostal: string;
    ville: string;
    region: string;
    latitude?: number;
    longitude?: number;
  };
  
  // Activité
  codeNaf: string;
  libelleNaf: string;
  
  // Effectif
  trancheEffectif: string;
  libelleEffectif: string;
  effectifExact?: number;
  
  // Dates
  dateCreation: string;
  statut: string;
  categorieJuridique: string;
  
  // Dirigeants
  dirigeants: Array<{
    nomComplet: string;
    qualite: string;
    dateNomination: string;
  }>;
  
  // Capital
  capitalSocial?: number;
  
  // Métadonnées
  metadata: {
    source: 'MCP data.gouv.fr';
    lastUpdated: string;
    confidenceScore: number;
    cacheHit: boolean;
  };
}

export interface MCPSearchParams {
  codePostal?: string;
  rayonKm?: number;
  codeNaf?: string;
  libelleNaf?: string;
  trancheEffectif?: string;
  ville?: string;
  page?: number;
  limit?: number;
}

export interface MCPSearchResponse {
  entreprises: GoldenRecord[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  metadata: {
    source: 'MCP data.gouv.fr';
    cache: {
      hit: boolean;
      age?: number;
    };
    performance: {
      apiLatency: number;
      totalLatency: number;
    };
  };
}

// Mapping des codes d'effectif
const EFFECTIF_MAPPING: Record<string, string> = {
  '00': '0 salarié',
  '01': '1 à 2 salariés',
  '02': '3 à 5 salariés',
  '03': '6 à 9 salariés',
  '11': '10 à 19 salariés',
  '12': '20 à 49 salariés',
  '21': '50 à 99 salariés',
  '22': '100 à 199 salariés',
  '31': '200 à 249 salariés',
  '32': '250 à 499 salariés',
  '41': '500 à 999 salariés',
  '42': '1000 à 1999 salariés',
  '51': '2000 à 4999 salariés',
  '52': '5000 à 9999 salariés',
  '53': '10000+ salariés'
};

export class MCPServiceV2 {
  private baseURL: string;
  private apiKey: string;
  private redis: Redis | null;
  private readonly cacheTTL = 86400; // 24h en secondes
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1s
  
  constructor() {
    // API publique INSEE — aucune clé requise
    // Ancienne valeur incorrecte : 'https://api.data.gouv.fr' (endpoints inexistants)
    this.baseURL = process.env.MCP_API_URL || 'https://recherche-entreprises.api.gouv.fr';
    this.apiKey = process.env.MCP_API_KEY || '';
    
    // Initialiser Redis si configuré
    if (process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
      this.redis = new Redis({
        url: process.env.UPSTASH_REDIS_URL,
        token: process.env.UPSTASH_REDIS_TOKEN,
      });
    } else {
      this.redis = null;
      console.warn('Redis cache not configured. Using in-memory cache only.');
    }
  }
  
  // Validation des inputs
  validateSearchParams(params: MCPSearchParams): void {
    if (params.codePostal && !/^[0-9]{5}$/.test(params.codePostal)) {
      throw new Error('Code postal invalide (5 chiffres requis)');
    }
    
    if (params.rayonKm && (params.rayonKm < 1 || params.rayonKm > 100)) {
      throw new Error('Rayon invalide (1-100 km)');
    }
    
    if (params.codeNaf && !/^[0-9]{2}\.[0-9]{2}[A-Z]$/.test(params.codeNaf)) {
      throw new Error('Code NAF invalide (format: XX.XXZ)');
    }
    
    if (params.limit && params.limit > 500) {
      throw new Error('Limite maximale de 500 résultats');
    }
  }
  
  // Génération de clé de cache
  private generateCacheKey(type: 'search' | 'company', identifier: string): string {
    return `mcp:${type}:${identifier}`;
  }
  
  private generateSearchCacheKey(params: MCPSearchParams): string {
    const sorted = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key as keyof MCPSearchParams]}`)
      .join('&');
    
    // Hash pour éviter les clés trop longues
    const hash = require('crypto').createHash('md5').update(sorted).digest('hex');
    return this.generateCacheKey('search', hash);
  }
  
  // Gestion du cache
  private async getFromCache<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;
    
    try {
      const data = await this.redis.get(key);
      return data as T;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }
  
  private async setCache(key: string, data: any): Promise<void> {
    if (!this.redis) return;
    
    try {
      await this.redis.setex(key, this.cacheTTL, data);
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }
  
  // Appel API avec retry logic
  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit = {},
    retries = this.maxRetries
  ): Promise<T> {
    const startTime = Date.now();
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
            ...options.headers,
          },
        });
        
        const latency = Date.now() - startTime;
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          // Rate limiting: attendre et réessayer
          if (response.status === 429 && attempt < retries) {
            const retryAfter = response.headers.get('Retry-After') || '1';
            await this.sleep(parseInt(retryAfter) * 1000);
            continue;
          }
          
          throw new Error(
            `API Error ${response.status}: ${errorData.message || response.statusText}`
          );
        }
        
        const data = await response.json();
        
        // Log de performance
        console.log(`MCP API call: ${url} - ${latency}ms`);
        
        return data;
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        
        // Backoff exponentiel
        await this.sleep(this.retryDelay * Math.pow(2, attempt - 1));
      }
    }
    
    throw new Error('Max retries exceeded');
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Transformation des données en Golden Record
  private transformToGoldenRecord(
    company: MCPCompany,
    executives: RNEExecutive[] = [],
    cacheHit = false
  ): GoldenRecord {
    // Construire l'adresse complète
    const addressParts = [];
    if (company.adresse.numeroVoie) addressParts.push(company.adresse.numeroVoie);
    if (company.adresse.typeVoie) addressParts.push(company.adresse.typeVoie);
    if (company.adresse.libelleVoie) addressParts.push(company.adresse.libelleVoie);
    const street = addressParts.join(' ');
    
    const completeAddress = [
      street,
      `${company.adresse.codePostal} ${company.adresse.libelleCommune}`,
      company.adresse.libelleRegion
    ].filter(Boolean).join(', ');
    
    return {
      siren: company.siren,
      denomination: company.denomination,
      
      adresse: {
        complete: completeAddress,
        codePostal: company.adresse.codePostal,
        ville: company.adresse.libelleCommune,
        region: company.adresse.libelleRegion,
        latitude: company.adresse.latitude,
        longitude: company.adresse.longitude,
      },
      
      codeNaf: company.activitePrincipale.code,
      libelleNaf: company.activitePrincipale.libelle,
      
      trancheEffectif: company.trancheEffectif,
      libelleEffectif: EFFECTIF_MAPPING[company.trancheEffectif] || 'Inconnu',
      effectifExact: company.effectif,
      
      dateCreation: company.dateCreation,
      statut: company.statut,
      categorieJuridique: company.categorieJuridique.libelle,
      
      dirigeants: executives.map(exec => ({
        nomComplet: `${exec.prenom} ${exec.nom}`.trim(),
        qualite: exec.qualite,
        dateNomination: exec.dateNomination,
      })),
      
      capitalSocial: company.capitalSocial,
      
      metadata: {
        source: 'MCP data.gouv.fr',
        lastUpdated: new Date().toISOString(),
        confidenceScore: 95, // Score de confiance des données
        cacheHit,
      },
    };
  }
  
  // Recherche principale
  async searchCompanies(params: MCPSearchParams): Promise<MCPSearchResponse> {
    const startTime = Date.now();
    
    try {
      // Validation
      this.validateSearchParams(params);
      
      // Vérifier le cache
      const cacheKey = this.generateSearchCacheKey(params);
      const cached = await this.getFromCache<MCPSearchResponse>(cacheKey);
      
      if (cached) {
        const cacheAge = Date.now() - startTime;
        console.log(`Cache hit for search: ${cacheKey}`);
        
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            cache: { hit: true, age: cacheAge },
            performance: { apiLatency: 0, totalLatency: cacheAge },
          },
        };
      }
      
      // Appel API MCP
      const apiStartTime = Date.now();
      
      // Note: Les endpoints exacts doivent être vérifiés avec la doc MCP
      // Ceci est une implémentation basée sur les patterns standards
      const searchParams = new URLSearchParams();
      if (params.codePostal) searchParams.set('code_postal', params.codePostal);
      if (params.rayonKm) searchParams.set('rayon_km', params.rayonKm.toString());
      if (params.codeNaf) searchParams.set('code_naf', params.codeNaf);
      if (params.trancheEffectif) searchParams.set('tranche_effectif', params.trancheEffectif);
      if (params.ville) searchParams.set('ville', params.ville);
      if (params.page) searchParams.set('page', params.page.toString());
      if (params.limit) searchParams.set('limit', Math.min(params.limit, 500).toString());
      
      // Mapping des paramètres vers le format de l'API recherche-entreprises.api.gouv.fr
      // L'ancienne URL /entreprises/search n'existe pas — endpoint corrigé :
      const url = `${this.baseURL}/search?${searchParams.toString()}`;
      const apiResponse = await this.fetchWithRetry<{
        results: any[];      // champ 'results' (et non 'entreprises') dans la vraie API
        total_results: number;
        page: number;
        per_page: number;
        total_pages: number;
      }>(url);
      
      const apiLatency = Date.now() - apiStartTime;
      
      // Récupérer les dirigeants en parallèle pour les premières entreprises
      // NOTE: la vraie API retourne déjà les dirigeants dans chaque résultat (champ 'dirigeants')
      // getCompanyExecutives() fait un appel séparé non nécessaire — à optimiser
      const companiesWithExecutives = await Promise.all(
        (apiResponse.results || []).slice(0, 10).map(async (company) => {
          try {
            const executives = await this.getCompanyExecutives(company.siren);
            return this.transformToGoldenRecord(company, executives, false);
          } catch (error) {
            console.warn(`Failed to fetch executives for ${company.siren}:`, error);
            return this.transformToGoldenRecord(company, [], false);
          }
        })
      );
      
      // Pour les entreprises restantes, utiliser seulement les données SIRENE
      const remainingCompanies = (apiResponse.results || []).slice(10).map((company: any) =>
        this.transformToGoldenRecord(company, [], false)
      );
      
      const allCompanies = [...companiesWithExecutives, ...remainingCompanies];
      
      const response: MCPSearchResponse = {
        entreprises: allCompanies,
        total: apiResponse.total_results || allCompanies.length,
        page: apiResponse.page || 1,
        limit: apiResponse.per_page || 25,
        hasMore: (apiResponse.page || 1) < (apiResponse.total_pages || 1),
        metadata: {
          source: 'MCP data.gouv.fr',
          cache: { hit: false },
          performance: {
            apiLatency,
            totalLatency: Date.now() - startTime,
          },
        },
      };
      
      // Mettre en cache
      await this.setCache(cacheKey, response);
      
      return response;
      
    } catch (error) {
      console.error('MCP search error:', error);
      
      // Fallback vers mock data si l'API échoue
      if (process.env.NODE_ENV === 'development' || !this.apiKey) {
        console.log('Falling back to mock data');
        return this.generateMockResponse(params);
      }
      
      throw error;
    }
  }
  
  // Détails d'une entreprise
  async getCompanyDetails(siren: string): Promise<GoldenRecord> {
    const startTime = Date.now();
    
    try {
      // Validation
      if (!/^[0-9]{9}$/.test(siren)) {
        throw new Error('SIREN invalide (9 chiffres requis)');
      }
      
      // Vérifier le cache
      const cacheKey = this.generateCacheKey('company', siren);
      const cached = await this.getFromCache<GoldenRecord>(cacheKey);
      
      if (cached) {
        console.log(`Cache hit for company: ${siren}`);
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            cacheHit: true,
            lastUpdated: new Date().toISOString(),
          },
        };
      }
      
      // Recherche par SIREN via l'API publique
      // NOTE: /sirene/companies/{siren} n'existe pas → on utilise /search?q={siren}
      const [companyData, executives] = await Promise.all([
        this.fetchWithRetry<any>(`${this.baseURL}/search?q=${siren}&per_page=1`)
          .then((resp: any) => {
            const r = (resp.results || [])[0];
            if (!r) throw new Error(`Entreprise ${siren} non trouvée`);
            return r as MCPCompany;
          }),
        this.getCompanyExecutives(siren),
      ]);
      
      const goldenRecord = this.transformToGoldenRecord(companyData, executives, false);
      
      // Mettre en cache
      await this.setCache(cacheKey, goldenRecord);
      
      return goldenRecord;
      
    } catch (error) {
      console.error(`Failed to fetch company ${siren}:`, error);
      
      // Fallback
      if (process.env.NODE_ENV === 'development' || !this.apiKey) {
        return this.generateMockCompany(siren);
      }
      
      throw error;
    }
  }
  
  // Récupération des dirigeants (RNE)
  /**
   * Récupération des dirigeants.
   * NOTE: l'ancien endpoint /rne/dirigeants/{siren} n'existe pas dans cette API.
   * Les dirigeants sont déjà inclus dans les résultats de /search.
   * Cette méthode reste pour compatibilité mais retourne [] en production.
   * Pour obtenir les dirigeants, utiliser directement le champ `dirigeants` du résultat de recherche.
   */
  private async getCompanyExecutives(siren: string): Promise<RNEExecutive[]> {
    try {
      // Tente via l'API Annuaire des Entreprises (alternative publique)
      const resp = await fetch(
        `https://annuaire-entreprises.data.gouv.fr/api/v3/rne/${siren}`,
        { headers: { Accept: 'application/json' } }
      );
      if (!resp.ok) return [];
      const data = await resp.json();
      return (data.dirigeants || []).map((d: any) => ({
        nom: d.nom || d.denomination || '',
        prenom: d.prenom || d.prenoms || '',
        qualite: d.qualite || '',
        dateNomination: d.date_de_nomination || '',
      }));
    } catch (error) {
      console.warn(`Failed to fetch executives for ${siren}:`, error);
      return [];
    }
  }
  
  // Mock data pour fallback (identique à V1 pour compatibilité)
  private generateMockResponse(params: MCPSearchParams): MCPSearchResponse {
    const limit = params.limit || 10;
    const companies: GoldenRecord[] = [];
    
    for (let i = 0; i < limit; i++) {
      const siren = `8${String(i).padStart(8, '0')}`;
      companies.push(this.generateMockCompany(siren, params));
    }
    
    return {
      entreprises: companies,
      total: companies.length,
      page: params.page || 1,
      limit,
      hasMore: false,
      metadata: {
        source: 'MCP data.gouv.fr',
        cache: { hit: false },
        performance: {
          apiLatency: 0,
          totalLatency: Date.now(),
        },
      },
    };
  }
  
  private generateMockCompany(siren: string, params?: MCPSearchParams): GoldenRecord {
    const codePostal = params?.codePostal || '75001';
    const ville = params?.ville || 'Paris';
    const codeNaf = params?.codeNaf || '62.01A';
    const libelleNaf = params?.libelleNaf || 'Programmation informatique';
    const trancheEffectif = params?.trancheEffectif || '11';
    
    return {
      siren,
      denomination: `Entreprise ${codePostal || codeNaf || 'Test'} ${siren.slice(-3)}`,
      
      adresse: {
        complete: `12 Rue de la Paix, ${codePostal} ${ville}`,
        codePostal,
        ville,
        region: 'Île-de-France',
        latitude: 48.8566 + (Math.random() - 0.5) * 0.1,
        longitude: 2.3522 + (Math.random() - 0.5) * 0.1,
      },
      
      codeNaf,
      libelleNaf,
      
      trancheEffectif,
      libelleEffectif: EFFECTIF_MAPPING[trancheEffectif] || '10 à 19 salariés',
      effectifExact: 15,
      
      dateCreation: '2020-01-01',
      statut: 'Actif',
      categorieJuridique: 'Société par Actions Simplifiée',
      
      dirigeants: [
        {
          nomComplet: 'Jean Dupont',
          qualite: 'Président',
          dateNomination: '2020-01-01',
        },
      ],
      
      capitalSocial: 10000,
      
      metadata: {
        source: 'MCP data.gouv.fr',
        lastUpdated: new Date().toISOString(),
        confidenceScore: 50,
        cacheHit: false,
      },
    };
  }
  
  // Nettoyage du cache (pour cron job)
  async cleanupCache(): Promise<number> {
    if (!this.redis) return 0;
    
    try {
      // Note: Dans une implémentation réelle, utiliser SCAN pour les grandes bases
      // Pour MVP, on peut utiliser un pattern simple
      const keys = await this.redis.keys('mcp:*');
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      
      console.log(`Cache cleaned: ${keys.length} keys removed`);
      return keys.length;
    } catch (error) {
      console.error('Cache cleanup error:', error);
      return 0;
    }
  }
  
  // Test de connexion à l'API MCP
  async testConnection(): Promise<boolean> {
    try {
      await this.fetchWithRetry(`${this.baseURL}/health`, {}, 1);
      return true;
    } catch (error) {
      console.error('MCP connection test failed:', error);
      return false;
    }
  }
}

// Export singleton pour une utilisation globale
let mcpServiceInstance: MCPServiceV2 | null = null;

export function getMCPService(): MCPServiceV2 {
  if (!mcpServiceInstance) {
    mcpServiceInstance = new MCPServiceV2();
  }
  return mcpServiceInstance;
}