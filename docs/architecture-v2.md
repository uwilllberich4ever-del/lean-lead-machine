# Architecture Data V2 - Intégration API MCP Réelle

## 1. Vue d'Ensemble

### 1.1 Objectifs
- Remplacer les mock data par l'API MCP réelle
- Maintenir les performances < 1s
- Respecter les contraintes RGPD (cache 24h max)
- Architecture stateless et scalable

### 1.2 Composants Principaux
```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Next.js Frontend)                │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTPS (API Routes)
┌─────────────────▼───────────────────────────────────────────┐
│               Vercel Edge Functions                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ API Proxy   │  │ Cache Layer │  │ Rate Limiter│        │
│  │ /api/mcp/*  │  │ (Redis)     │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTPS (Authentifié)
┌─────────────────▼───────────────────────────────────────────┐
│                  API MCP data.gouv.fr                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ SIRENE      │  │ RNE         │  │ Géocodage   │        │
│  │ (Entreprises)│  │ (Dirigeants)│  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## 2. Système de Cache Redis/Upstash

### 2.1 Stratégie de Cache
```typescript
interface CacheStrategy {
  // Clé de cache: hash des paramètres de recherche
  key: `mcp:search:${string}` | `mcp:company:${string}`;
  
  // TTL: 24h maximum (RGPD)
  ttl: number; // en secondes (86400 = 24h)
  
  // Stratégie d'invalidation
  invalidation: 'TTL' | 'write-through';
  
  // Fallback: mock data si cache expiré + API down
  fallbackEnabled: true;
}
```

### 2.2 Implémentation avec Upstash Redis
```typescript
import { Redis } from '@upstash/redis';

class MCPCache {
  private redis: Redis;
  private readonly TTL = 86400; // 24h en secondes
  
  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL,
      token: process.env.UPSTASH_REDIS_TOKEN,
    });
  }
  
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      return data as T;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }
  
  async set(key: string, data: any): Promise<void> {
    try {
      await this.redis.setex(key, this.TTL, data);
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }
  
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }
  
  generateSearchKey(params: MCPSearchParams): string {
    const sorted = Object.keys(params)
      .sort()
      .map(k => `${k}=${params[k as keyof MCPSearchParams]}`)
      .join('&');
    return `mcp:search:${hash(sorted)}`;
  }
  
  generateCompanyKey(siren: string): string {
    return `mcp:company:${siren}`;
  }
}
```

### 2.3 Politique de Cache
- **Recherches**: Cache 24h, invalidé par nouveaux paramètres
- **Détails entreprise**: Cache 24h, invalidé manuellement si besoin
- **Suggestions**: Cache 1h (données moins critiques)
- **Purge automatique**: Cron job quotidien pour données > 24h

## 3. Stratégie de Pagination

### 3.1 Pagination côté API MCP
```typescript
interface PaginationParams {
  page: number;      // Page courante (1-indexed)
  limit: number;     // Résultats par page (max 500)
  offset?: number;   // Alternative: offset-based
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

### 3.2 Gestion des Grands Résultats
```typescript
class PaginationService {
  private readonly MAX_PAGE_SIZE = 500;
  private readonly DEFAULT_PAGE_SIZE = 50;
  
  async paginateSearch(
    params: MCPSearchParams,
    page: number = 1,
    limit: number = this.DEFAULT_PAGE_SIZE
  ): Promise<PaginatedResponse<MCPCompany>> {
    // Valider les limites
    const validatedLimit = Math.min(limit, this.MAX_PAGE_SIZE);
    
    // Calculer l'offset
    const offset = (page - 1) * validatedLimit;
    
    // Appeler API MCP avec pagination
    const response = await this.callMCPSearch({
      ...params,
      page,
      limit: validatedLimit
    });
    
    return {
      data: response.entreprises,
      pagination: {
        page,
        limit: validatedLimit,
        total: response.total,
        totalPages: Math.ceil(response.total / validatedLimit),
        hasNext: response.hasMore,
        hasPrev: page > 1
      }
    };
  }
  
  // Optimisation: pré-charger la page suivante
  async prefetchNextPage(
    currentParams: MCPSearchParams,
    currentPage: number
  ): Promise<void> {
    const nextPage = currentPage + 1;
    const cacheKey = this.generateCacheKey({
      ...currentParams,
      page: nextPage
    });
    
    // Vérifier si déjà en cache
    const cached = await cache.get(cacheKey);
    if (!cached) {
      // Pré-charger en arrière-plan
      this.paginateSearch(currentParams, nextPage)
        .then(data => cache.set(cacheKey, data))
        .catch(error => console.warn('Prefetch failed:', error));
    }
  }
}
```

### 3.3 Pagination Infinite Scroll
```typescript
// Hook React pour infinite scroll
function useInfiniteMCP(searchParams: MCPSearchParams) {
  const queryClient = useQueryClient();
  const pageSize = 50;
  
  return useInfiniteQuery({
    queryKey: ['mcp-search', searchParams],
    queryFn: ({ pageParam = 1 }) => 
      paginationService.paginateSearch(searchParams, pageParam, pageSize),
    getNextPageParam: (lastPage) => 
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
    getPreviousPageParam: (firstPage) => 
      firstPage.pagination.hasPrev ? firstPage.pagination.page - 1 : undefined,
    
    // Optimisation: pré-charger les pages suivantes
    onSuccess: (data) => {
      const lastPage = data.pages[data.pages.length - 1];
      if (lastPage.pagination.hasNext) {
        paginationService.prefetchNextPage(
          searchParams, 
          lastPage.pagination.page
        );
      }
    }
  });
}
```

## 4. Gestion des Erreurs et Retry Logic

### 4.1 Stratégie de Retry
```typescript
class RetryManager {
  private readonly maxAttempts = 3;
  private readonly baseDelay = 1000; // 1s
  private readonly maxDelay = 10000; // 10s
  
  async withRetry<T>(
    operation: () => Promise<T>,
    shouldRetry: (error: any) => boolean = this.defaultRetryCondition
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === this.maxAttempts || !shouldRetry(error)) {
          break;
        }
        
        // Backoff exponentiel avec jitter
        const delay = this.calculateBackoff(attempt);
        await this.sleep(delay);
        
        console.log(`Retry attempt ${attempt}/${this.maxAttempts} after ${delay}ms`);
      }
    }
    
    throw lastError;
  }
  
  private defaultRetryCondition(error: any): boolean {
    // Retry sur erreurs réseau et rate limiting
    const status = error.response?.status;
    return (
      !status || // Erreur réseau
      status === 429 || // Too Many Requests
      status >= 500 // Erreurs serveur
    );
  }
  
  private calculateBackoff(attempt: number): number {
    const exponential = this.baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000; // Jitter aléatoire
    return Math.min(exponential + jitter, this.maxDelay);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 4.2 Circuit Breaker Pattern
```typescript
class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private readonly failureThreshold = 5;
  private readonly resetTimeout = 30000; // 30s
  private lastFailureTime = 0;
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker OPEN - service unavailable');
      }
    }
    
    try {
      const result = await operation();
      
      // Réussite: réinitialiser si en HALF_OPEN
      if (this.state === 'HALF_OPEN') {
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
  
  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
  
  private reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
  }
}
```

### 4.3 Fallback vers Mock Data
```typescript
class MCPFallbackService {
  private circuitBreaker = new CircuitBreaker();
  private retryManager = new RetryManager();
  private cache = new MCPCache();
  
  async searchWithFallback(params: MCPSearchParams): Promise<MCPSearchResponse> {
    try {
      // Essayer avec circuit breaker et retry
      return await this.circuitBreaker.execute(() =>
        this.retryManager.withRetry(() => this.searchMCP(params))
      );
    } catch (error) {
      console.warn('MCP API failed, falling back to cache/mock:', error);
      
      // 1. Essayer le cache
      const cached = await this.getFromCache(params);
      if (cached) {
        console.log('Serving from cache');
        return cached;
      }
      
      // 2. Fallback vers mock data
      console.log('Serving mock data');
      return this.generateMockResponse(params);
    }
  }
  
  private async searchMCP(params: MCPSearchParams): Promise<MCPSearchResponse> {
    // Appel réel à l'API MCP
    const response = await fetchMCPApi(params);
    
    // Mettre en cache
    await this.cache.set(this.generateCacheKey(params), response);
    
    return response;
  }
}
```

## 5. Monitoring des Performances

### 5.1 Métriques Clés
```typescript
interface PerformanceMetrics {
  // Latence
  apiLatency: number; // ms
  cacheLatency: number; // ms
  totalLatency: number; // ms
  
  // Cache
  cacheHitRate: number; // 0-100%
  cacheSize: number; // items
  cacheEvictions: number;
  
  // API
  apiSuccessRate: number; // 0-100%
  apiErrorRate: number; // 0-100%
  rateLimitRemaining: number;
  
  // Business
  searchesPerMinute: number;
  companiesViewed: number;
  exportsGenerated: number;
}
```

### 5.2 Instrumentation
```typescript
import { metrics } from '@vercel/analytics';

class PerformanceMonitor {
  private timers = new Map<string, number>();
  
  startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }
  
  endTimer(name: string): number {
    const start = this.timers.get(name);
    if (!start) return 0;
    
    const duration = performance.now() - start;
    this.timers.delete(name);
    
    // Envoyer la métrique
    metrics.timing(`mcp.${name}`, duration);
    
    return duration;
  }
  
  recordSearch(params: MCPSearchParams, duration: number): void {
    metrics.increment('mcp.searches.total');
    metrics.gauge('mcp.search.duration', duration);
    
    // Dimensions pour segmentation
    if (params.codePostal) {
      metrics.increment('mcp.searches.by_postal_code');
    }
    if (params.codeNaf) {
      metrics.increment('mcp.searches.by_naf');
    }
  }
  
  recordCacheHit(isHit: boolean): void {
    if (isHit) {
      metrics.increment('mcp.cache.hits');
    } else {
      metrics.increment('mcp.cache.misses');
    }
  }
}
```

### 5.3 Alertes
```yaml
# vercel.json ou configuration monitoring
{
  "alerts": [
    {
      "name": "High API Latency",
      "metric": "mcp.api.latency",
      "threshold": 1000, # 1s
      "window": "5m",
      "condition": "p95 > threshold"
    },
    {
      "name": "Low Cache Hit Rate",
      "metric": "mcp.cache.hit_rate",
      "threshold": 70, # 70%
      "window": "15m",
      "condition": "avg < threshold"
    },
    {
      "name": "High Error Rate",
      "metric": "mcp.api.error_rate",
      "threshold": 5, # 5%
      "window": "10m",
      "condition": "avg > threshold"
    }
  ]
}
```

## 6. Optimisations CDN Vercel Edge

### 6.1 Edge Functions Configuration
```typescript
// app/api/mcp/companies/route.ts
export const runtime = 'edge';
export const maxDuration = 10; // seconds

export async function GET(request: NextRequest) {
  // Utiliser le cache géodistribué de Vercel
  const cache = await caches.open('mcp-cache');
  const cacheKey = new Request(request.url, request);
  
  // Vérifier le cache edge
  const cached = await cache.match(cacheKey);
  if (cached) {
    const age = cached.headers.get('age') || '0';
    if (parseInt(age) < 86400) { // 24h
      return cached;
    }
  }
  
  // Appel API et mise en cache
  const response = await fetchMCPApi(request);
  
  // Cloner pour mise en cache
  const responseToCache = response.clone();
  
  // Mettre en cache edge (24h max)
  const cacheResponse = new Response(responseToCache.body, responseToCache);
  cacheResponse.headers.set('cache-control', 'public, max-age=86400, s-maxage=86400');
  
  // Stocker dans le cache edge
  context.waitUntil(cache.put(cacheKey, cacheResponse));
  
  return response;
}
```

### 6.2 Compression des Réponses
```typescript
import { compress } from 'compression';

export async function GET(request: NextRequest) {
  const response = await fetchMCPApi(request);
  
  // Vérifier si le client supporte la compression
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  const supportsGzip = acceptEncoding.includes('gzip');
  
  if (supportsGzip && response.body) {
    const compressed = await compress(response.body, 'gzip');
    return new Response(compressed, {
      ...response,
      headers: {
        ...response.headers,
        'content-encoding': 'gzip',
        'vary': 'accept-encoding'
      }
    });
  }
  
  return response;
}
```

## 7. Plan de Rollback

### 7.1 Conditions de Rollback
- Latence API > 2s pendant plus de 5 minutes
- Taux d'erreur > 10% pendant plus de 10 minutes
- Cache hit rate