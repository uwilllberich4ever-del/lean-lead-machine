import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route: /api/mcp/companies
 * Proxy vers l'API Recherche d'Entreprises (data.gouv.fr)
 * https://recherche-entreprises.api.gouv.fr
 *
 * GET  ?postalCode=75001&nafCode=62.01Z&employeeRange=11&siren=123456789
 * POST { postalCode, radius, nafCode, employeeRange }
 */

const RECHERCHE_ENTREPRISES_URL = 'https://recherche-entreprises.api.gouv.fr';

const employeeRangeMap: Record<string, string> = {
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
  '42': '1000+ salariés',
};

// ─── Données de fallback si l'API est down ────────────────────────────────────
const MOCK_FALLBACK = [
  {
    siren: '123456789',
    denomination: 'Tech Solutions SAS (mock)',
    adresse: { codePostal: '75001', libelleCommune: 'Paris', fullAddress: '12 Rue de la Paix, 75001 Paris' },
    activitePrincipale: { code: '62.01Z', libelle: 'Programmation informatique' },
    trancheEffectif: '11',
    dateCreation: '2018-03-15',
    statut: 'Actif',
    effectif: 15,
  },
];

/** Transforme un résultat de l'API Recherche d'Entreprises en format interne */
function mapCompany(r: any) {
  const siege = r.siege || {};
  const streetParts = [siege.numero_voie, siege.type_voie, siege.libelle_voie].filter(Boolean);
  const street = streetParts.join(' ');
  const fullAddress = [street, `${siege.code_postal || ''} ${siege.libelle_commune || ''}`]
    .filter(s => s.trim())
    .join(', ');

  return {
    siren: r.siren,
    denomination: r.nom_complet || r.nom_raison_sociale || r.siren,
    adresse: {
      codePostal: siege.code_postal || '',
      libelleCommune: siege.libelle_commune || '',
      fullAddress,
    },
    activitePrincipale: {
      code: r.activite_principale || siege.activite_principale || '',
      libelle: '', // non fourni par cette API — voir NAF_LIBELLES dans mcp.service.ts
    },
    trancheEffectif: r.tranche_effectif_salarie || siege.tranche_effectif_salarie || '00',
    employeeRangeLabel: employeeRangeMap[r.tranche_effectif_salarie || '00'] || 'Inconnu',
    dateCreation: r.date_creation || '',
    statut: r.etat_administratif === 'A' ? 'Actif' : 'Cessé',
    effectif: null, // effectif exact non disponible dans cette API
    dirigeants: (r.dirigeants || []).map((d: any) => ({
      nom: d.nom || d.denomination || '',
      prenom: d.prenoms || '',
      qualite: d.qualite || '',
    })),
  };
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const postalCode = sp.get('postalCode');
    const nafCode = sp.get('nafCode');
    const employeeRange = sp.get('employeeRange');
    const siren = sp.get('siren');

    console.log(`[MCP API] GET ${request.nextUrl.search}`);

    // ── Lookup par SIREN ──
    if (siren) {
      const url = `${RECHERCHE_ENTREPRISES_URL}/search?q=${encodeURIComponent(siren)}&per_page=1`;
      const apiResp = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });

      if (!apiResp.ok) {
        return NextResponse.json({ error: 'Entreprise non trouvée' }, { status: 404 });
      }

      const json = await apiResp.json();
      const result = (json.results || [])[0];
      if (!result || result.siren !== siren) {
        return NextResponse.json({ error: 'Entreprise non trouvée' }, { status: 404 });
      }

      const company = mapCompany(result);
      return NextResponse.json({
        ...company,
        fullAddress: company.adresse.fullAddress,
      });
    }

    // ── Recherche générale ──
    const qs = new URLSearchParams();
    qs.set('q', '');
    if (postalCode) qs.set('code_postal', postalCode);
    if (nafCode) qs.set('activite_principale', nafCode);
    if (employeeRange) qs.set('tranche_effectif_salarie', employeeRange);
    qs.set('per_page', '25');
    qs.set('page', sp.get('page') || '1');

    const apiUrl = `${RECHERCHE_ENTREPRISES_URL}/search?${qs.toString()}`;
    console.log('[MCP API] Calling:', apiUrl);

    const apiResp = await fetch(apiUrl, { headers: { Accept: 'application/json' }, cache: 'no-store' });

    if (!apiResp.ok) {
      throw new Error(`API Recherche Entreprises returned ${apiResp.status}`);
    }

    const json = await apiResp.json();
    const companies = (json.results || []).map(mapCompany);

    const response = {
      companies,
      metadata: {
        total: json.total_results || companies.length,
        page: json.page || 1,
        totalPages: json.total_pages || 1,
        perPage: json.per_page || 25,
        hasMore: (json.page || 1) < (json.total_pages || 1),
        cache: {
          source: 'recherche-entreprises.api.gouv.fr',
          freshness: '24h',
          nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    };

    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    headers.set('X-Data-Source', 'recherche-entreprises.api.gouv.fr');
    headers.set('X-Cache-TTL', '86400');

    return new NextResponse(JSON.stringify(response), { status: 200, headers });

  } catch (error) {
    console.error('[MCP API Error] Falling back to mock data:', error);

    // Fallback mock si l'API est down
    return NextResponse.json(
      {
        companies: MOCK_FALLBACK,
        metadata: {
          total: MOCK_FALLBACK.length,
          page: 1,
          totalPages: 1,
          perPage: 25,
          hasMore: false,
          cache: { source: 'mock-fallback', freshness: 'static' },
        },
        _warning: 'API indisponible — données de démonstration',
      },
      {
        status: 200,
        headers: { 'X-Data-Source': 'mock-fallback', 'X-API-Error': 'true' },
      }
    );
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postalCode, nafCode, employeeRange, page } = body;

    if (!postalCode) {
      return NextResponse.json({ error: 'Le code postal est requis' }, { status: 400 });
    }

    if (!/^\d{5}$/.test(postalCode)) {
      return NextResponse.json({ error: 'Code postal invalide (5 chiffres requis)' }, { status: 400 });
    }

    // Déléguer au GET handler
    const mockUrl = new URL('http://localhost/api/mcp/companies');
    mockUrl.searchParams.set('postalCode', postalCode);
    if (nafCode) mockUrl.searchParams.set('nafCode', nafCode);
    if (employeeRange) mockUrl.searchParams.set('employeeRange', employeeRange);
    if (page) mockUrl.searchParams.set('page', String(page));

    return GET(new NextRequest(mockUrl));

  } catch (error) {
    console.error('[MCP API POST Error]:', error);
    return NextResponse.json({ error: 'Erreur de traitement de la requête' }, { status: 500 });
  }
}
