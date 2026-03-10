/**
 * Service MCP pour Lean Lead Machine MVP
 * Client simplifié pour l'API MCP via Supabase
 */

interface MCPCompany {
  siren: string;
  nom_complet: string;
  code_postal: string;
  ville: string;
  code_naf: string;
  libelle_naf: string;
  tranche_effectif: string;
  date_creation: string;
  latitude: number;
  longitude: number;
  website?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
}

interface MCPSearchParams {
  codePostal?: string;
  rayonKm?: number;
  codeNaf?: string;
  libelleNaf?: string;
  trancheEffectif?: string;
  ville?: string;
  page?: number;
  limit?: number;
}

interface MCPSearchResponse {
  entreprises: MCPCompany[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export class MCPService {
  private baseURL: string;
  private cache: Map<string, { data: any; timestamp: number }>;
  private cacheTTL: number;

  constructor() {
    // Utiliser l'URL MCP Supabase configurée via variable d'environnement
    this.baseURL = process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'https://mcp.supabase.com/mcp';
    this.cache = new Map();
    this.cacheTTL = 24 * 60 * 60 * 1000; // 24h en ms (RGPD compliance)
  }

  private generateCacheKey(params: MCPSearchParams): string {
    const sorted = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key as keyof MCPSearchParams]}`)
      .join('&');
    return `mcp:${sorted}`;
  }

  private async fetchFromCache<T>(key: string): Promise<T | null> {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private async storeInCache(key: string, data: any): Promise<void> {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  async searchCompanies(params: MCPSearchParams): Promise<MCPSearchResponse> {
    const cacheKey = this.generateCacheKey(params);
    
    // Essayez le cache d'abord
    const cached = await this.fetchFromCache<MCPSearchResponse>(cacheKey);
    if (cached) {
      console.log('Cache hit for MCP search');
      return cached;
    }

    try {
      // Pour le MVP, simulation de données
      // En production, remplacer par l'appel réel à l'API MCP
      console.log('MCP search (simulated for MVP):', params);
      
      // Simulation de données pour le MVP
      const mockCompanies: MCPCompany[] = this.generateMockCompanies(params);
      
      const response: MCPSearchResponse = {
        entreprises: mockCompanies,
        total: mockCompanies.length,
        page: params.page || 1,
        limit: params.limit || 50,
        hasMore: false
      };

      // Mettre en cache
      await this.storeInCache(cacheKey, response);
      
      return response;
    } catch (error) {
      console.error('MCP search error:', error);
      throw new Error(`MCP search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCompanyDetails(siren: string): Promise<MCPCompany | null> {
    const cacheKey = `company:${siren}`;
    
    const cached = await this.fetchFromCache<MCPCompany>(cacheKey);
    if (cached) return cached;

    try {
      // Simulation pour MVP
      console.log('MCP company details (simulated):', siren);
      
      const mockCompany: MCPCompany = {
        siren,
        nom_complet: `Entreprise ${siren}`,
        code_postal: '75001',
        ville: 'Paris',
        code_naf: '62.01A',
        libelle_naf: 'Programmation informatique',
        tranche_effectif: '11',
        date_creation: '2020-01-01',
        latitude: 48.8566,
        longitude: 2.3522,
        website: `https://example-${siren}.com`,
        email: `contact@example-${siren}.com`,
        phone: '+33123456789',
        linkedin: `https://linkedin.com/company/example-${siren}`
      };

      await this.storeInCache(cacheKey, mockCompany);
      return mockCompany;
    } catch (error) {
      console.error('MCP company details error:', error);
      return null;
    }
  }

  private generateMockCompanies(params: MCPSearchParams): MCPCompany[] {
    const companies: MCPCompany[] = [];
    const count = params.limit || 10;
    
    for (let i = 0; i < count; i++) {
      const siren = `8${String(i).padStart(8, '0')}`;
      companies.push({
        siren,
        nom_complet: `Entreprise ${params.codePostal || params.codeNaf || 'Test'} ${i + 1}`,
        code_postal: params.codePostal || '75001',
        ville: params.ville || 'Paris',
        code_naf: params.codeNaf || '62.01A',
        libelle_naf: params.libelleNaf || 'Programmation informatique',
        tranche_effectif: params.trancheEffectif || '11',
        date_creation: '2020-01-01',
        latitude: 48.8566 + (Math.random() - 0.5) * 0.1,
        longitude: 2.3522 + (Math.random() - 0.5) * 0.1,
        website: `https://example-${siren}.com`,
        email: `contact@example-${siren}.com`,
        phone: '+33123456789',
        linkedin: `https://linkedin.com/company/example-${siren}`
      });
    }
    
    return companies;
  }
}