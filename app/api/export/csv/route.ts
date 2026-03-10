import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companies, columns = 'default' } = body;

    // Validate input
    if (!companies || !Array.isArray(companies)) {
      return NextResponse.json(
        { error: "Liste d'entreprises requise" },
        { status: 400 }
      );
    }

    // Limit to 500 companies as per MVP requirements
    const limitedCompanies = companies.slice(0, 500);

    // Define columns based on selection
    const columnDefinitions = {
      default: [
        { header: "Dénomination", key: "denomination" },
        { header: "SIREN", key: "siren" },
        { header: "Adresse", key: "fullAddress" },
        { header: "Code postal", key: "postalCode" },
        { header: "Ville", key: "city" },
        { header: "Code NAF", key: "nafCode" },
        { header: "Libellé NAF", key: "nafLabel" },
        { header: "Tranche d'effectif", key: "employeeRange" },
        { header: "Date de création", key: "creationDate" },
        { header: "Nom dirigeant", key: "directorName" },
        { header: "Prénom dirigeant", key: "directorFirstName" },
        { header: "Qualité dirigeant", key: "directorRole" },
      ],
      minimal: [
        { header: "Dénomination", key: "denomination" },
        { header: "SIREN", key: "siren" },
        { header: "Adresse", key: "fullAddress" },
        { header: "Code NAF", key: "nafCode" },
        { header: "Effectif", key: "employeeRange" },
      ],
      extended: [
        { header: "Dénomination", key: "denomination" },
        { header: "SIREN", key: "siren" },
        { header: "Adresse", key: "fullAddress" },
        { header: "Code postal", key: "postalCode" },
        { header: "Ville", key: "city" },
        { header: "Région", key: "region" },
        { header: "Code NAF", key: "nafCode" },
        { header: "Libellé NAF", key: "nafLabel" },
        { header: "Tranche d'effectif", key: "employeeRange" },
        { header: "Effectif exact", key: "exactEmployees" },
        { header: "Date de création", key: "creationDate" },
        { header: "Statut", key: "status" },
        { header: "Capital social", key: "capital" },
        { header: "Nom dirigeant", key: "directorName" },
        { header: "Prénom dirigeant", key: "directorFirstName" },
        { header: "Qualité dirigeant", key: "directorRole" },
        { header: "Date nomination", key: "directorDate" },
        { header: "Site web", key: "website" },
        { header: "Téléphone", key: "phone" },
        { header: "Email", key: "email" },
      ]
    };

    const selectedColumns = columnDefinitions[columns as keyof typeof columnDefinitions] || columnDefinitions.default;

    // Generate CSV content
    const headers = selectedColumns.map(col => `"${col.header}"`).join(';');
    
    const rows = limitedCompanies.map(company => {
      return selectedColumns.map(col => {
        const value = company[col.key] || '';
        // Escape quotes and wrap in quotes if contains semicolon or quotes
        const escapedValue = String(value).replace(/"/g, '""');
        return `"${escapedValue}"`;
      }).join(';');
    });

    const csvContent = [headers, ...rows].join('\n');

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `entreprises_export_${timestamp}.csv`;

    // Return CSV file
    const headersResponse = new Headers();
    headersResponse.set('Content-Type', 'text/csv; charset=utf-8');
    headersResponse.set('Content-Disposition', `attachment; filename="${filename}"`);
    headersResponse.set('X-Export-Metadata', JSON.stringify({
      count: limitedCompanies.length,
      columns: selectedColumns.length,
      limit: 500,
      generatedAt: new Date().toISOString(),
      source: "MCP data.gouv.fr"
    }));

    return new NextResponse(csvContent, {
      status: 200,
      headers: headersResponse,
    });

  } catch (error) {
    console.error('[CSV Export Error]:', error);
    return NextResponse.json(
      { 
        error: "Erreur lors de la génération du CSV",
        message: "Une erreur est survenue lors de l'export. Veuillez réessayer.",
        maxLimit: 500
      },
      { status: 500 }
    );
  }
}

// GET endpoint for direct download with query params
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const siren = searchParams.get('siren');
    
    if (!siren) {
      return NextResponse.json(
        { error: "Paramètre SIREN requis" },
        { status: 400 }
      );
    }

    // Mock company data for single export
    const mockCompany = {
      denomination: "Tech Solutions SAS",
      siren: siren,
      fullAddress: "12 Rue de la Paix, 75001 Paris",
      postalCode: "75001",
      city: "Paris",
      nafCode: "62.01Z",
      nafLabel: "Programmation informatique",
      employeeRange: "10 à 19 salariés",
      creationDate: "15/03/2018",
      directorName: "Dupont",
      directorFirstName: "Jean",
      directorRole: "Président",
    };

    const headers = [
      "Dénomination", "SIREN", "Adresse", "Code postal", "Ville",
      "Code NAF", "Libellé NAF", "Tranche d'effectif", "Date de création",
      "Nom dirigeant", "Prénom dirigeant", "Qualité dirigeant"
    ].map(h => `"${h}"`).join(';');

    const row = [
      mockCompany.denomination,
      mockCompany.siren,
      mockCompany.fullAddress,
      mockCompany.postalCode,
      mockCompany.city,
      mockCompany.nafCode,
      mockCompany.nafLabel,
      mockCompany.employeeRange,
      mockCompany.creationDate,
      mockCompany.directorName,
      mockCompany.directorFirstName,
      mockCompany.directorRole,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';');

    const csvContent = [headers, row].join('\n');
    const filename = `entreprise_${siren}_${new Date().toISOString().slice(0, 10)}.csv`;

    const headersResponse = new Headers();
    headersResponse.set('Content-Type', 'text/csv; charset=utf-8');
    headersResponse.set('Content-Disposition', `attachment; filename="${filename}"`);

    return new NextResponse(csvContent, {
      status: 200,
      headers: headersResponse,
    });

  } catch (error) {
    console.error('[CSV Single Export Error]:', error);
    return NextResponse.json(
      { error: "Erreur lors de l'export" },
      { status: 500 }
    );
  }
}