import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MCPService } from '@/lib/services/mcp.service';
import { CacheService } from '@/lib/services/cache.service';
import { CSVExportService } from '@/lib/services/csv-export.service';
import { rateLimit } from '@/lib/middleware/rate-limit';

// Schéma de validation pour l'export
const exportSchema = z.object({
  filters: z.object({
    codePostal: z.string().regex(/^[0-9]{5}$/, 'Code postal invalide').optional(),
    rayonKm: z.coerce.number().min(1).max(100).optional(),
    codeNaf: z.string().regex(/^[0-9]{2}\.[0-9]{2}[A-Z]$/, 'Code NAF invalide').optional(),
    trancheEffectif: z.enum([
      '00', '01', '02', '03', '11', '12', '21', '22', '31', '32', '41', '42', '51', '52', '53'
    ]).optional(),
    ville: z.string().min(2).max(50).optional()
  }),
  format: z.object({
    separator: z.enum([',', ';', '\t']).default(';'),
    encoding: z.enum(['utf8', 'utf16le', 'latin1']).default('utf8'),
    includeHeaders: z.boolean().default(true),
    includeBOM: z.boolean().default(true)
  }).optional()
}).refine(
  data => data.filters.codePostal || data.filters.codeNaf || data.filters.trancheEffectif,
  {
    message: 'Au moins un filtre est requis',
    path: ['filters']
  }
);

export type ExportRequest = z.infer<typeof exportSchema>;

// Initialisation des services
const mcpService = new MCPService();
const cacheService = new CacheService();
const csvService = new CSVExportService();

export async function POST(request: NextRequest) {
  try {
    // Rate limiting plus strict pour les exports
    const rateLimitResult = await rateLimit(request, { max: 10, windowMs: 60000 });
    if (rateLimitResult.limited) {
      return rateLimitResult.response;
    }

    // Récupérer et valider la requête
    const body = await request.json().catch(() => ({}));
    const validationResult = exportSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Paramètres d\'export invalides',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { filters, format = {} } = validationResult.data;
    const exportConfig = {
      separator: format.separator || ';',
      encoding: format.encoding || 'utf8',
      includeHeaders: format.includeHeaders !== false,
      includeBOM: format.includeBOM !== false,
      maxRows: 500 // Limite MVP
    };

    // Vérifier que rayonKm n'est pas utilisé sans codePostal
    if (filters.rayonKm && !filters.codePostal) {
      return NextResponse.json(
        {
          success: false,
          error: 'RADIUS_WITHOUT_POSTAL',
          message: 'Le filtre "rayon" nécessite un code postal valide'
        },
        { status: 400 }
      );
    }

    console.log(`📤 Début export avec filtres: ${JSON.stringify(filters)}`);

    // Étape 1: Récupérer les entreprises
    const startTime = Date.now();
    
    // Générer la clé de cache pour la recherche
    const searchCacheKey = await cacheService.generateSearchCacheKey({
      ...filters,
      limit: 500, // Maximum pour export
      page: 1
    });

    // Vérifier le cache pour les données
    let companies = [];
    const cachedSearch = await cacheService.get(searchCacheKey);
    
    if (cachedSearch?.entreprises) {
      console.log('📦 Utilisation données depuis cache');
      companies = cachedSearch.entreprises.slice(0, 500); // Limiter à 500
    } else {
      console.log('🔍 Recherche MCP pour export');
      
      // Rechercher les entreprises via MCP
      const searchResults = await mcpService.searchCompanies({
        ...filters,
        limit: 500,
        page: 1
      });

      companies = searchResults.entreprises || [];
      
      // Mettre en cache pour les prochaines requêtes
      if (companies.length > 0) {
        await cacheService.set(searchCacheKey, {
          entreprises: companies,
          total: companies.length
        }, 3600); // 1h pour les exports
      }
    }

    // Vérifier la limite de 500 lignes
    if (companies.length > exportConfig.maxRows) {
      return NextResponse.json(
        {
          success: false,
          error: 'EXPORT_LIMIT_EXCEEDED',
          message: `L'export dépasse la limite de ${exportConfig.maxRows} lignes`,
          details: {
            maxRows: exportConfig.maxRows,
            foundRows: companies.length,
            suggestions: [
              'Réduire le rayon de recherche',
              'Ajouter un filtre par code NAF',
              'Limiter à une tranche d\'effectif spécifique'
            ]
          }
        },
        { status: 400 }
      );
    }

    // Vérifier qu'il y a des données
    if (companies.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'NO_DATA',
          message: 'Aucune entreprise trouvée pour ces critères',
          suggestion: 'Élargissez vos critères de recherche'
        },
        { status: 404 }
      );
    }

    console.log(`📊 ${companies.length} entreprises à exporter`);

    // Étape 2: Récupérer les détails complets pour chaque entreprise
    const companiesWithDetails = [];
    
    for (const company of companies) {
      try {
        const cacheKey = `company:${company.siren}`;
        let companyDetails = await cacheService.get(cacheKey);
        
        if (!companyDetails) {
          companyDetails = await mcpService.getCompanyDetails(company.siren);
          await cacheService.set(cacheKey, companyDetails, 86400); // 24h
        }
        
        companiesWithDetails.push(companyDetails);
      } catch (error) {
        console.warn(`⚠️ Impossible de récupérer les détails pour ${company.siren}:`, error.message);
        // Utiliser les données de base si les détails échouent
        companiesWithDetails.push(company);
      }
    }

    // Étape 3: Générer le CSV
    const csvGenerationStart = Date.now();
    const exportResult = await csvService.generateCSV(companiesWithDetails, exportConfig);
    const csvGenerationTime = Date.now() - csvGenerationStart;

    // Étape 4: Générer le nom de fichier
    const filename = csvService.generateFilename('entreprises_export');
    const totalTime = Date.now() - startTime;

    console.log(`✅ Export généré: ${filename} (${companies.length} lignes, ${totalTime}ms)`);

    // Étape 5: Retourner la réponse avec le fichier
    const headers = new Headers();
    headers.set('Content-Type', 'text/csv; charset=utf-8');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    headers.set('Content-Length', exportResult.buffer.length.toString());
    headers.set('X-Export-Metadata', JSON.stringify({
      rowCount: companies.length,
      generationTime: csvGenerationTime,
      totalTime,
      cacheUsed: !!cachedSearch,
      maxRows: exportConfig.maxRows,
      filters
    }));

    // Headers de cache pour éviter les exports répétitifs
    headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    return new NextResponse(exportResult.buffer, {
      status: 200,
      headers
    });

  } catch (error: any) {
    console.error('❌ Erreur lors de l\'export:', error);

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
          message: 'La génération de l\'export a pris trop de temps',
          suggestion: 'Veuillez réduire le nombre d\'entreprises à exporter'
        },
        { status: 504 }
      );
    }

    if (error.message?.includes('Limite d\'export dépassée')) {
      return NextResponse.json(
        {
          success: false,
          error: 'EXPORT_LIMIT_EXCEEDED',
          message: error.message,
          details: {
            maxRows: 500,
            suggestion: 'Affinez vos critères de recherche'
          }
        },
        { status: 400 }
      );
    }

    // Erreur générique
    return NextResponse.json(
      {
        success: false,
        error: 'EXPORT_FAILED',
        message: 'Une erreur est survenue lors de la génération de l\'export',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // GET non supporté pour l'export (trop de paramètres)
  return NextResponse.json(
    {
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Utilisez POST pour les exports CSV'
    },
    { status: 405 }
  );
}

// Endpoint pour vérifier la taille d'un export avant génération
export async function HEAD(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = {
      codePostal: searchParams.get('codePostal'),
      codeNaf: searchParams.get('codeNaf'),
      trancheEffectif: searchParams.get('trancheEffectif')
    };

    // Vérifier qu'au moins un filtre est présent
    const hasFilter = filters.codePostal || filters.codeNaf || filters.trancheEffectif;
    if (!hasFilter) {
      return new NextResponse(null, {
        status: 400,
        headers: {
          'X-Export-Error': 'NO_FILTERS'
        }
      });
    }

    // Estimation basée sur des recherches similaires
    const cacheKey = await cacheService.generateSearchCacheKey({
      ...filters,
      limit: 500,
      page: 1
    });

    const cachedData = await cacheService.get(cacheKey);
    let estimatedRows = 0;

    if (cachedData?.entreprises) {
      estimatedRows = Math.min(cachedData.entreprises.length, 500);
    } else {
      // Estimation approximative basée sur les filtres
      if (filters.codePostal && filters.codeNaf) {
        estimatedRows = 50; // Estimation conservatrice
      } else if (filters.codePostal) {
        estimatedRows = 200;
      } else {
        estimatedRows = 500; // Maximum
      }
    }

    const headers = new Headers();
    headers.set('X-Export-Estimated-Rows', estimatedRows.toString());
    headers.set('X-Export-Max-Rows', '500');
    headers.set('X-Export-Cache-Available', cachedData ? 'true' : 'false');

    return new NextResponse(null, {
      status: 200,
      headers
    });

  } catch (error) {
    return new NextResponse(null, {
      status: 500,
      headers: {
        'X-Export-Error': 'ESTIMATION_FAILED'
      }
    });
  }
}

// Options CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}
