import { NextRequest, NextResponse } from 'next/server';

// Mock MCP data for demonstration
const mockCompanies = [
  {
    siren: "123456789",
    denomination: "Tech Solutions SAS",
    adresse: {
      codePostal: "75001",
      libelleCommune: "Paris",
      numeroVoie: "12",
      typeVoie: "Rue",
      libelleVoie: "de la Paix",
      libelleRegion: "Île-de-France"
    },
    activitePrincipale: {
      code: "62.01Z",
      libelle: "Programmation informatique"
    },
    trancheEffectif: "11",
    dateCreation: "2018-03-15",
    categorieJuridique: {
      libelle: "Société par Actions Simplifiée"
    },
    effectif: 15,
    statut: "Actif"
  },
  {
    siren: "987654321",
    denomination: "Innovation Digital",
    adresse: {
      codePostal: "75008",
      libelleCommune: "Paris",
      numeroVoie: "25",
      typeVoie: "Avenue",
      libelleVoie: "des Champs-Élysées",
      libelleRegion: "Île-de-France"
    },
    activitePrincipale: {
      code: "62.02A",
      libelle: "Conseil en systèmes informatiques"
    },
    trancheEffectif: "12",
    dateCreation: "2019-07-22",
    categorieJuridique: {
      libelle: "Société à Responsabilité Limitée"
    },
    effectif: 35,
    statut: "Actif"
  },
  {
    siren: "456789123",
    denomination: "Data Analytics France",
    adresse: {
      codePostal: "75009",
      libelleCommune: "Paris",
      numeroVoie: "8",
      typeVoie: "Boulevard",
      libelleVoie: "Haussmann",
      libelleRegion: "Île-de-France"
    },
    activitePrincipale: {
      code: "63.11Z",
      libelle: "Traitement de données, hébergement et activités connexes"
    },
    trancheEffectif: "21",
    dateCreation: "2020-01-10",
    categorieJuridique: {
      libelle: "Société par Actions Simplifiée"
    },
    effectif: 75,
    statut: "Actif"
  }
];

const employeeRangeMap: Record<string, string> = {
  "00": "0 salarié",
  "01": "1 à 2 salariés",
  "02": "3 à 5 salariés",
  "03": "6 à 9 salariés",
  "11": "10 à 19 salariés",
  "12": "20 à 49 salariés",
  "21": "50 à 99 salariés",
  "22": "100 à 199 salariés",
  "31": "200 à 249 salariés",
  "32": "250 à 499 salariés",
  "41": "500 à 999 salariés",
  "42": "1000+ salariés"
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const postalCode = searchParams.get('postalCode');
    const radius = searchParams.get('radius');
    const nafCode = searchParams.get('nafCode');
    const employeeRange = searchParams.get('employeeRange');
    const siren = searchParams.get('siren');

    // Rate limiting simulation
    const rateLimitKey = request.headers.get('x-forwarded-for') || 'unknown';
    console.log(`[MCP API] Request from ${rateLimitKey} - ${new Date().toISOString()}`);

    // If SIREN is provided, return specific company
    if (siren) {
      const company = mockCompanies.find(c => c.siren === siren);
      if (!company) {
        return NextResponse.json(
          { error: "Entreprise non trouvée" },
          { status: 404 }
        );
      }

      // Simulate RNE data for executives
      const rneData = {
        dirigeants: [
          {
            nom: "Dupont",
            prenom: "Jean",
            qualite: "Président",
            dateNomination: "2018-03-15"
          },
          {
            nom: "Martin",
            prenom: "Marie",
            qualite: "Directrice Technique",
            dateNomination: "2019-05-20"
          }
        ]
      };

      return NextResponse.json({
        ...company,
        dirigeants: rneData.dirigeants,
        employeeRangeLabel: employeeRangeMap[company.trancheEffectif] || "Inconnu",
        fullAddress: `${company.adresse.numeroVoie} ${company.adresse.typeVoie} ${company.adresse.libelleVoie}, ${company.adresse.codePostal} ${company.adresse.libelleCommune}`
      });
    }

    // Filter companies based on search criteria
    let filteredCompanies = [...mockCompanies];

    if (postalCode) {
      filteredCompanies = filteredCompanies.filter(
        company => company.adresse.codePostal.startsWith(postalCode.substring(0, 2))
      );
    }

    if (nafCode) {
      filteredCompanies = filteredCompanies.filter(
        company => company.activitePrincipale.code === nafCode
      );
    }

    if (employeeRange) {
      filteredCompanies = filteredCompanies.filter(
        company => company.trancheEffectif === employeeRange
      );
    }

    // Limit to 500 results as per MVP requirements
    const limitedResults = filteredCompanies.slice(0, 500);

    const response = {
      companies: limitedResults.map(company => ({
        siren: company.siren,
        denomination: company.denomination,
        adresse: {
          codePostal: company.adresse.codePostal,
          libelleCommune: company.adresse.libelleCommune,
          fullAddress: `${company.adresse.numeroVoie} ${company.adresse.typeVoie} ${company.adresse.libelleVoie}, ${company.adresse.codePostal} ${company.adresse.libelleCommune}`
        },
        activitePrincipale: company.activitePrincipale,
        trancheEffectif: company.trancheEffectif,
        employeeRangeLabel: employeeRangeMap[company.trancheEffectif] || "Inconnu",
        dateCreation: company.dateCreation,
        statut: company.statut,
        effectif: company.effectif
      })),
      metadata: {
        total: limitedResults.length,
        limit: 500,
        hasMore: filteredCompanies.length > 500,
        cache: {
          source: "MCP data.gouv.fr",
          freshness: "24h",
          nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      }
    };

    // Add cache headers for RGPD compliance (24h max)
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    headers.set('X-Data-Source', 'MCP data.gouv.fr');
    headers.set('X-Cache-TTL', '86400');
    headers.set('X-RateLimit-Limit', '100');
    headers.set('X-RateLimit-Remaining', '99');

    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('[MCP API Error]:', error);
    return NextResponse.json(
      { 
        error: "Service temporairement indisponible",
        message: "Le service MCP data.gouv.fr ne répond pas. Veuillez réessayer dans quelques instants.",
        retryAfter: 30
      },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postalCode, radius, nafCode, employeeRange } = body;

    // Validate required fields
    if (!postalCode) {
      return NextResponse.json(
        { error: "Le code postal est requis" },
        { status: 400 }
      );
    }

    if (!/^\d{5}$/.test(postalCode)) {
      return NextResponse.json(
        { error: "Code postal invalide (5 chiffres requis)" },
        { status: 400 }
      );
    }

    if (radius && (radius < 1 || radius > 100)) {
      return NextResponse.json(
        { error: "Le rayon doit être compris entre 1 et 100 km" },
        { status: 400 }
      );
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500));

    // Call GET handler with the same logic
    const mockUrl = new URL('http://localhost/api/mcp/companies');
    if (postalCode) mockUrl.searchParams.set('postalCode', postalCode);
    if (nafCode) mockUrl.searchParams.set('nafCode', nafCode);
    if (employeeRange) mockUrl.searchParams.set('employeeRange', employeeRange);

    const mockRequest = new NextRequest(mockUrl);
    return GET(mockRequest);

  } catch (error) {
    console.error('[MCP API POST Error]:', error);
    return NextResponse.json(
      { error: "Erreur de traitement de la requête" },
      { status: 500 }
    );
  }
}