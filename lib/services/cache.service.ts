/**
 * Service de cache pour Lean Lead Machine MVP
 * Cache en mémoire avec expiration automatique
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class CacheService {
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number;

  constructor() {
    this.cache = new Map();
    this.defaultTTL = 24 * 60 * 60 * 1000; // 24h par défaut (RGPD compliance)
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    };
    
    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async getTTL(key: string): Promise<number> {
    const entry = this.cache.get(key);
    if (!entry) return 0;

    const now = Date.now();
    const elapsed = now - entry.timestamp;
    const remaining = entry.ttl - elapsed;
    return Math.max(0, Math.floor(remaining / 1000)); // Retourne en secondes
  }

  // Méthodes utilitaires pour les recherches MCP
  generateSearchKey(params: Record<string, any>): string {
    const sorted = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `search:${sorted}`;
  }

  async cacheSearchResults<T>(params: Record<string, any>, results: T): Promise<void> {
    const key = this.generateSearchKey(params);
    await this.set(key, results, 24 * 60 * 60 * 1000); // 24h
  }

  async getCachedSearchResults<T>(params: Record<string, any>): Promise<T | null> {
    const key = this.generateSearchKey(params);
    return this.get<T>(key);
  }
}