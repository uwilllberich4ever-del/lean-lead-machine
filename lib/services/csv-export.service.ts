/**
 * Service d'export CSV pour Lean Lead Machine MVP
 */

interface CompanyRecord {
  siren: string;
  nom_complet: string;
  code_postal: string;
  ville: string;
  code_naf: string;
  libelle_naf: string;
  tranche_effectif: string;
  date_creation: string;
  website?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  latitude: number;
  longitude: number;
}

export class CSVExportService {
  private readonly MAX_ROWS = 500; // Limite MVP

  generateCSV(companies: CompanyRecord[]): string {
    // Limiter le nombre de lignes pour le MVP
    const limitedCompanies = companies.slice(0, this.MAX_ROWS);
    
    // En-têtes CSV (Golden Record V1)
    const headers = [
      'SIREN',
      'Nom complet',
      'Code postal',
      'Ville',
      'Code NAF',
      'Libellé NAF',
      'Tranche effectif',
      'Date création',
      'Site web',
      'Email',
      'Téléphone',
      'LinkedIn',
      'Latitude',
      'Longitude'
    ];

    // Lignes de données
    const rows = limitedCompanies.map(company => [
      company.siren,
      this.escapeCSV(company.nom_complet),
      company.code_postal,
      this.escapeCSV(company.ville),
      company.code_naf,
      this.escapeCSV(company.libelle_naf),
      company.tranche_effectif,
      company.date_creation,
      company.website || '',
      company.email || '',
      company.phone || '',
      company.linkedin || '',
      company.latitude.toString(),
      company.longitude.toString()
    ]);

    // Construire le CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }

  private escapeCSV(field: string): string {
    if (field === null || field === undefined) {
      return '';
    }
    
    const stringField = String(field);
    
    // Si le champ contient des virgules, des guillemets ou des sauts de ligne, l'entourer de guillemets
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n') || stringField.includes('\r')) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    
    return stringField;
  }

  getFilename(params: Record<string, any>): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filters = [];
    
    if (params.codePostal) filters.push(`cp${params.codePostal}`);
    if (params.rayonKm) filters.push(`rayon${params.rayonKm}km`);
    if (params.codeNaf) filters.push(`naf${params.codeNaf.replace('.', '')}`);
    if (params.trancheEffectif) filters.push(`eff${params.trancheEffectif}`);
    
    const filterStr = filters.length > 0 ? `_${filters.join('_')}` : '';
    
    return `entreprises${filterStr}_${date}.csv`;
  }

  validateExportLimit(companies: CompanyRecord[]): void {
    if (companies.length > this.MAX_ROWS) {
      throw new Error(`Export limit exceeded. Maximum ${this.MAX_ROWS} rows allowed for MVP.`);
    }
  }
}