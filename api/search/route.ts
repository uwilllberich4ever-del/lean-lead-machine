import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MCPService } from '@/lib/services/mcp.service';
import { CacheService } from '@/lib/services/cache.service';
import { rateLimit } from '@/lib/middleware/rate-limit';

// Schéma de validation des filtres
const searchSchema = z.object({
  codePostal: z.string().regex(/^[0-9]{5}$/, 'Code postal invalide (5 chiffres requis)'),
  rayonKm: z.coerce.number().min(1).max(100).optional(),
  codeNaf: z.string().regex(/^[0-9]{2}\.[0-9]{2}[A-Z]$/, 'Code NAF invalide (format: XX.XXZ)').optional(),
  libelleNaf: z.string().min(2).max(100).optional(),
  trancheEffectif: z.enum([
    '00', '01', '02', '03', '11', '12', '21', '22', '31', '32', '41', '42', '51', '52', '53'
  ]).optional(),
  ville: z.string().min(2).max(50).optional(),
  page: z.coerce.number().min(1).max(10).default(1),
  limit: z.coerce.number().min(1).max(500).default(50)
});

export type SearchFilters = z.infer<typeof searchSchema>;

// Initialisation des services
const mcpService = new MCPService();
const cacheService = new CacheService();

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request);
    if (rateLimitResult.limited) {
      return rateLimitResult.response;
    }

    // Récupérer et valider les paramètres
    const searchParams = request.nextUrl.searchParams;
    const filters = {
      codePostal: searchParams.get('codePostal'),
      rayonKm: searchParams.get('rayonKm'),
      codeNaf: searchParams.get('codeNaf'),
      libelleNaf: searchParams.get('libelleNaf'),
      trancheEffectif: searchParams.get('trancheEffectif'),
      ville: searchParams.get('ville'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit')
    };

    // Valider les filtres
    const validationResult = searchSchema.safeParse(filters);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Paramètres de recherche invalides',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const validatedFilters = validationResult.data;

    // Vérifier que rayonKm n'est pas utilisé sans codePostal
    if (validatedFilters.rayonKm && !validatedFilters.codePostal) {
      return NextResponse.json(
        {
          success: false,
          error: 'RADIUS_WITHOUT_POSTAL',
          message: 'Le filtre "rayon" nécessite un code postal valide'
        },
        { status: 400 }
      );
    }

    // Vérifier qu'au moins un filtre est présent
    const hasFilter = validatedFilters.codePostal || 
                      validatedFilters.codeNaf || 
                      validatedFilters.trancheEffectif;
    
    if (!hasFilter) {
      return NextResponse.json(
        {
          success: false,
          error: 'NO_FILTERS',
          message: 'Au moins un filtre est requis (codePostal, codeNaf ou trancheEffectif)'
        },
        { status: 400 }
      );
    }

    // Générer la clé de cache
    const cacheKey = cacheService.generateSearchKey(validatedFilters);
    
    // Vérifier le cache
    const cachedData = await cacheService.get<{ success: boolean; data: any }>(cacheKey);
    if (cachedData) {
      const cacheTtl = await cacheService.getTTL(cacheKey);
      const response = {
        ...cachedData,
        data: {
          ...cachedData.data,
          metadata: {
            ...cachedData.data.metadata,
            cacheHit: true,
            cacheTtl
          }
        }
      };
      return NextResponse.json(response);
    }

    console.log(`🔍 Recherche MCP: ${JSON.stringify(validatedFilters)}`);

    // Appeler le service MCP
    const startTime = Date.now();
    const mcpResponse = await mcpService.searchCompanies(validatedFilters);
    const queryTime = Date.now() - startTime;

    // Formater la réponse
    const responseData = {
      success: true,
      data: {
        entreprises: mcpResponse.entreprises || [],
        pagination: {
          total: mcpResponse.total || 0,
          page: validatedFilters.page,
          limit: validatedFilters.limit,
          pages: Math.ceil((mcpResponse.total || 0) / validatedFilters.limit)
        },
        metadata: {
          queryTime,
          cacheHit: false,
          cacheTtl: 86400, // 24h en secondes
          source: 'MCP',
          filters: validatedFilters
        }
      }
    };

    // Mettre en cache (24h)
    await cacheService.set(cacheKey, responseData, 86400);

    // Headers de cache pour le client
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=300');
    headers.set('X-Cache', 'MISS');
    headers.set('X-Query-Time', queryTime.toString());

    return NextResponse.json(responseData, { headers });

  } catch (error: any) {
    console.error('❌ Erreur recherche:', error);

    // Gérer les erreurs spécifiques
    if (error.code === 'MCP_UNAVAILABLE') {
      return NextResponse.json(
        {
          success: false,
          error: 'MCP_UNAVAILABLE',
          message: 'Le service de données est temporairement indisponible',
          suggestion: 'Veuillez réessayer dans quelques instants'
        },
        { status: 503 }
      );
    }

    if (error.code === 'TIMEOUT') {
      return NextResponse.json(
        {
          success: false,
          error: 'TIMEOUT',
          message: 'La recherche a pris trop de temps',
          suggestion: 'Veuillez affiner vos critères de recherche'
        },
        { status: 504 }
      );
    }

    if (error.code === 'NO_RESULTS') {
      return NextResponse.json(
        {
          success: true,
          data: {
            entreprises: [],
            pagination: {
              total: 0,
              page: 1,
              limit: 50,
              pages: 0
            },
            metadata: {
              queryTime: 0,
              cacheHit: false,
              suggestions: [
                'Élargir le rayon de recherche',
                'Vérifier le code postal',
                'Essayer un code NAF plus large (ex: 62 au lieu de 62.01Z)'
              ]
            }
          }
        },
        { status: 200 }
      );
    }

    // Erreur générique
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Une erreur est survenue lors de la recherche',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request);
    if (rateLimitResult.limited) {
      return rateLimitResult.response;
    }

    // Récupérer le body
    const body = await request.json().catch(() => ({}));

    // Valider les filtres
    const validationResult = searchSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Paramètres de recherche invalides',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const validatedFilters = validationResult.data;

    // Vérifier que rayonKm n'est pas utilisé sans codePostal
    if (validatedFilters.rayonKm && !validatedFilters.codePostal) {
      return NextResponse.json(
        {
          success: false,
          error: 'RADIUS_WITHOUT_POSTAL',
          message: 'Le filtre "rayon" nécessite un code postal valide'
        },
        { status: 400 }
      );
    }

    // Vérifier qu'au moins un filtre est présent
    const hasFilter = validatedFilters.codePostal || 
                      validatedFilters.codeNaf || 
                      validatedFilters.trancheEffectif;
    
    if (!hasFilter) {
      return NextResponse.json(
        {
          success: false,
          error: 'NO_FILTERS',
          message: 'Au moins un filtre est requis (codePostal, codeNaf ou trancheEffectif)'
        },
        { status: 400 }
      );
    }

    // Générer la clé de cache
    const cacheKey = cacheService.generateSearchKey(validatedFilters);
    
    // Vérifier le cache
    const cachedData = await cacheService.get<{ success: boolean; data: any }>(cacheKey);
    if (cachedData) {
      const cacheTtl = await cacheService.getTTL(cacheKey);
      const response = {
        ...cachedData,
        data: {
          ...cachedData.data,
          metadata: {
            ...cachedData.data.metadata,
            cacheHit: true,
            cacheTtl
          }
        }
      };
      return NextResponse.json(response);
    }

    console.log(`🔍 Recherche MCP (POST): ${JSON.stringify(validatedFilters)}`);

    // Appeler le service MCP
    const startTime = Date.now();
    const mcpResponse = await mcpService.searchCompanies(validatedFilters);
    const queryTime = Date.now() - startTime;

    // Formater la réponse
    const responseData = {
      success: true,
      data: {
        entreprises: mcpResponse.entreprises || [],
        pagination: {
          total: mcpResponse.total || 0,
          page: validatedFilters.page,
          limit: validatedFilters.limit,
          pages: Math.ceil((mcpResponse.total || 0) / validatedFilters.limit)
        },
        metadata: {
          queryTime,
          cacheHit: false,
          cacheTtl: 86400,
          source: 'MCP',
          filters: validatedFilters
        }
      }
    };

    // Mettre en cache (24h)
    await cacheService.set(cacheKey, responseData, 86400);

    // Headers de cache pour le client
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=300');
    headers.set('X-Cache', 'MISS');
    headers.set('X-Query-Time', queryTime.toString());

    return NextResponse.json(responseData, { headers });

  } catch (error: any) {
    console.error('❌ Erreur recherche POST:', error);

    // Gérer les erreurs spécifiques
    if (error.code === 'MCP_UNAVAILABLE') {
      return NextResponse.json(
        {
          success: false,
          error: 'MCP_UNAVAILABLE',
          message: 'Le service de données est temporairement indisponible',
          suggestion: 'Veuillez réessayer dans quelques instants'
        },
        { status: 503 }
      );
    }

    if (error.code === 'TIMEOUT') {
      return NextResponse.json(
        {
          success: false,
          error: 'TIMEOUT',
          message: 'La recherche a pris trop de temps',
          suggestion: 'Veuillez affiner vos critères de recherche'
        },
        { status: 504 }
      );
    }

    if (error.code === 'NO_RESULTS') {
      return NextResponse.json(
        {
          success: true,
          data: {
            entreprises: [],
            pagination: {
              total: 0,
              page: 1,
              limit: 50,
              pages: 0
            },
            metadata: {
              queryTime: 0,
              cacheHit: false,
              suggestions: [
                'Élargir le rayon de recherche',
                'Vérifier le code postal',
                'Essayer un code NAF plus large (ex: 62 au lieu de 62.01Z)'
              ]
            }
          }
        },
        { status: 200 }
      );
    }

    // Erreur générique
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Une erreur est survenue lors de la recherche',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// Options CORS pour les requêtes préflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}
