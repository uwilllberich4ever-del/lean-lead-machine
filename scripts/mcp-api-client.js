#!/usr/bin/env node

/**
 * Client API MCP pour Lean Lead Machine
 * Script de test et d'intégration avec le serveur MCP data.gouv.fr
 */

const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class MCPClient {
  constructor(config = {}) {
    this.baseURL = config.baseURL || 'https://mcp.data.gouv.fr/mcp';
    this.apiKey = config.apiKey || process.env.MCP_API_KEY;
    this.cacheDir = config.cacheDir || './.cache/mcp';
    this.cacheTTL = config.cacheTTL || 24 * 60 * 60 * 1000; // 24h en ms
    this.timeout = config.timeout || 5000; // 5s
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
      }
    });
    
    // Créer le répertoire cache si nécessaire
    this.initCache();
  }
  
  async initCache() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      console.log(`Cache directory initialized: ${this.cacheDir}`);
    } catch (error) {
      console.warn(`Could not create cache directory: ${error.message}`);
    }
  }
  
  generateCacheKey(params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return crypto
      .createHash('md5')
      .update(sortedParams)
      .digest('hex');
  }
  
  async getFromCache(cacheKey) {
    try {
      const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);
      const stats = await fs.stat(cacheFile);
      
      // Vérifier si le cache est expiré
      const now = Date.now();
      const fileAge = now - stats.mtimeMs;
      
      if (fileAge > this.cacheTTL) {
        await fs.unlink(cacheFile);
        return null;
      }
      
      const data = await fs.readFile(cacheFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null; // Fichier non trouvé ou erreur
    }
  }
  
  async saveToCache(cacheKey, data) {
    try {
      const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);
      await fs.writeFile(cacheFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn(`Could not save to cache: ${error.message}`);
    }
  }
  
  /**
   * Recherche d'entreprises avec filtres
   * @param {Object} filters - Filtres de recherche
   * @returns {Promise<Array>} Liste d'entreprises
   */
  async searchCompanies(filters = {}) {
    const requiredFilters = ['codePostal', 'codeNaf', 'trancheEffectif'];
    const hasRequiredFilter = requiredFilters.some(filter => filters[filter]);
    
    if (!hasRequiredFilter) {
      throw new Error('Au moins un filtre est requis (codePostal, codeNaf ou trancheEffectif)');
    }
    
    // Valider le code postal si présent
    if (filters.codePostal && !/^[0-9]{5}$/.test(filters.codePostal)) {
      throw new Error('Code postal invalide (5 chiffres requis)');
    }
    
    // Valider le code NAF si présent
    if (filters.codeNaf && !/^[0-9]{2}\.[0-9]{2}[A-Z]$/.test(filters.codeNaf)) {
      throw new Error('Code NAF invalide (format: XX.XXZ)');
    }
    
    const cacheKey = this.generateCacheKey(filters);
    const cachedData = await this.getFromCache(cacheKey);
    
    if (cachedData) {
      console.log(`Cache hit for search: ${cacheKey}`);
      return cachedData;
    }
    
    console.log(`Cache miss for search: ${cacheKey}`);
    
    try {
      // Note: L'endpoint exact MCP peut varier
      // Ceci est un exemple d'implémentation
      const response = await this.client.post('/entreprises/search', {
        filters: this.normalizeFilters(filters),
        pagination: {
          page: filters.page || 1,
          limit: Math.min(filters.limit || 50, 500)
        }
      });
      
      const data = response.data;
      
      // Sauvegarder dans le cache
      await this.saveToCache(cacheKey, data);
      
      return data;
    } catch (error) {
      this.handleApiError(error);
    }
  }
  
  /**
   * Récupère les détails d'une entreprise par SIREN
   * @param {string} siren - Numéro SIREN (9 chiffres)
   * @returns {Promise<Object>} Détails de l'entreprise
   */
  async getCompanyDetails(siren) {
    if (!/^[0-9]{9}$/.test(siren)) {
      throw new Error('SIREN invalide (9 chiffres requis)');
    }
    
    const cacheKey = `company:${siren}`;
    const cachedData = await this.getFromCache(cacheKey);
    
    if (cachedData) {
      console.log(`Cache hit for company: ${siren}`);
      return cachedData;
    }
    
    console.log(`Cache miss for company: ${siren}`);
    
    try {
      // Appel SIRENE pour données de base
      const sireneResponse = await this.client.get(`/sirene/companies/${siren}`);
      
      // Appel RNE pour dirigeants (en parallèle si possible)
      const rneResponse = await this.client.get(`/rne/dirigeants/${siren}`);
      
      const companyData = {
        ...sireneResponse.data,
        dirigeants: rneResponse.data?.dirigeants || []
      };
      
      // Sauvegarder dans le cache
      await this.saveToCache(cacheKey, companyData);
      
      return companyData;
    } catch (error) {
      this.handleApiError(error);
    }
  }
  
  /**
   * Suggestions auto-complétion pour NAF
   * @param {string} query - Terme de recherche
   * @param {number} limit - Nombre maximum de résultats
   * @returns {Promise<Array>} Suggestions NAF
   */
  async getNafSuggestions(query, limit = 10) {
    if (!query || query.length < 2) {
      throw new Error('Requête trop courte (minimum 2 caractères)');
    }
    
    const cacheKey = `suggest:naf:${query.toLowerCase()}`;
    const cachedData = await this.getFromCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    try {
      const response = await this.client.get('/suggestions/naf', {
        params: { q: query, limit }
      });
      
      const suggestions = response.data?.suggestions || [];
      
      // Sauvegarder dans le cache (TTL plus court)
      await this.saveToCache(cacheKey, suggestions);
      
      return suggestions;
    } catch (error) {
      this.handleApiError(error);
    }
  }
  
  /**
   * Suggestions auto-complétion pour villes
   * @param {string} query - Terme de recherche
   * @param {number} limit - Nombre maximum de résultats
   * @returns {Promise<Array>} Suggestions villes
   */
  async getCitySuggestions(query, limit = 10) {
    if (!query || query.length < 2) {
      throw new Error('Requête trop courte (minimum 2 caractères)');
    }
    
    const cacheKey = `suggest:ville:${query.toLowerCase()}`;
    const cachedData = await this.getFromCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    try {
      const response = await this.client.get('/suggestions/villes', {
        params: { q: query, limit }
      });
      
      const suggestions = response.data?.suggestions || [];
      
      // Sauvegarder dans le cache (TTL plus court)
      await this.saveToCache(cacheKey, suggestions);
      
      return suggestions;
    } catch (error) {
      this.handleApiError(error);
    }
  }
  
  /**
   * Normalise les filtres pour l'API MCP
   * @private
   */
  normalizeFilters(filters) {
    const normalized = { ...filters };
    
    // Convertir rayon en mètres si présent
    if (normalized.rayonKm) {
      normalized.rayonMetres = normalized.rayonKm * 1000;
      delete normalized.rayonKm;
    }
    
    // Normaliser la tranche d'effectif
    if (normalized.trancheEffectif) {
      // Mapping des codes d'effectif
      const effectifMapping = {
        '0': '00',
        '1-2': '01',
        '3-5': '02',
        '6-9': '03',
        '10-19': '11',
        '20-49': '21',
        '50-99': '31',
        '100-199': '32',
        '200-249': '41',
        '250-499': '42',
        '500-999': '51',
        '1000+': '52'
      };
      
      if (effectifMapping[normalized.trancheEffectif]) {
        normalized.trancheEffectif = effectifMapping[normalized.trancheEffectif];
      }
    }
    
    return normalized;
  }
  
  /**
   * Gère les erreurs d'API de manière uniforme
   * @private
   */
  handleApiError(error) {
    if (error.response) {
      // Erreur HTTP avec réponse
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          throw new Error(`Requête invalide: ${data?.message || 'Paramètres incorrects'}`);
        case 401:
          throw new Error('Authentification requise. Vérifiez votre clé API.');
        case 403:
          throw new Error('Accès interdit. Vérifiez vos permissions.');
        case 404:
          throw new Error('Ressource non trouvée.');
        case 429:
          throw new Error('Trop de requêtes. Veuillez ralentir.');
        case 500:
          throw new Error('Erreur interne du serveur MCP.');
        case 503:
          throw new Error('Service MCP temporairement indisponible.');
        default:
          throw new Error(`Erreur HTTP ${status}: ${data?.message || 'Erreur inconnue'}`);
      }
    } else if (error.request) {
      // Pas de réponse reçue
      throw new Error('Pas de réponse du serveur MCP. Vérifiez votre connexion.');
    } else {
      // Erreur de configuration
      throw new Error(`Erreur de configuration: ${error.message}`);
    }
  }
  
  /**
   * Test de connexion au serveur MCP
   * @returns {Promise<boolean>} true si connecté
   */
  async testConnection() {
    try {
      await this.client.get('/health');
      console.log('✅ Connexion MCP OK');
      return true;
    } catch (error) {
      console.error('❌ Échec connexion MCP:', error.message);
      return false;
    }
  }
  
  /**
   * Nettoie le cache expiré
   * @returns {Promise<number>} Nombre de fichiers supprimés
   */
  async cleanupCache() {
    try {
      const files = await fs.readdir(this.cacheDir);
      let deletedCount = 0;
      const now = Date.now();
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(this.cacheDir, file);
        const stats = await fs.stat(filePath);
        const fileAge = now - stats.mtimeMs;
        
        if (fileAge > this.cacheTTL) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }
      
      console.log(`🧹 Cache nettoyé: ${deletedCount} fichiers expirés supprimés`);
      return deletedCount;
    } catch (error) {
      console.warn(`Erreur lors du nettoyage du cache: ${error.message}`);
      return 0;
    }
  }
}

// Export pour utilisation comme module
module.exports = MCPClient;

// Exécution en ligne de commande
if (require.main === module) {
  async function main() {
    const client = new MCPClient();
    
    // Test de connexion
    const connected = await client.testConnection();
    if (!connected) {
      process.exit(1);
    }
    
    // Exemple d'utilisation
    console.log('\n🔍 Exemple de recherche:');
    try {
      const results = await client.searchCompanies({
        codePostal: '75001',
        rayonKm: 5,
        codeNaf: '62.01Z',
        limit: 10
      });
      
      console.log(`📊 ${results.length} entreprises trouvées`);
      
      if (results.length > 0) {
        console.log('\nPremière entreprise:');
        console.log(JSON.stringify(results[0], null, 2));
      }
    } catch (error) {
      console.error('Erreur recherche:', error.message);
    }
    
    // Nettoyage cache
    await client.cleanupCache();
  }
  
  main().catch(console.error);
}
