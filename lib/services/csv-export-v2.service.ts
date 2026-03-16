/**
 * Service d'export CSV V2 pour Lean Lead Machine
 * Compatible avec les Golden Records MCP
 */

import { GoldenRecord } from './mcp-v2.service';

export interface CSVExportOptions {
  columns?: 'default' | 'minimal' | 'extended' | string[];
  includeHeaders?: boolean;
  delimiter?: string;
  encoding?: 'utf-8' | 'utf-8-bom' | 'windows-1252';
  maxRows?: number;
}

export class CSVExportServiceV2 {
  private readonly DEFAULT_MAX_ROWS = 500;
  private readonly DEFAULT_DELIMITER = ';'; // Standard français

  /**
   * Map custom encoding strings to valid Node.js BufferEncoding
   */
  private mapEncoding(encoding: string): BufferEncoding {
    switch (encoding) {
      case 'utf-8':
        return 'utf8';
      case 'utf-8-bom':
        return 'utf8'; // BOM will be added separately
      case 'windows-1252':
        return 'latin1'; // closest match
      default:
        return encoding as BufferEncoding;
    }
  }
  
  /**
   * Génère un CSV à partir d'une liste d'entreprises
   */
  generateCSV(
    companies: GoldenRecord[],
    options: CSVExportOptions = {}
  ): string {
    // Valider et limiter le nombre de lignes
    const maxRows = options.maxRows || this.DEFAULT_MAX_ROWS;
    this.validateExportLimit(companies, maxRows);
    
    const limitedCompanies = companies.slice(0, maxRows);
    
    // Déterminer les colonnes à exporter
    const columns = this.getColumns(options.columns || 'default');
    
    // Générer les en-têtes
    const headers = columns.map(col => this.escapeCSV(col.header, options.delimiter));
    
    // Générer les lignes
    const rows = limitedCompanies.map(company => 
      columns.map(col => {
        const value = this.getValue(company, col.key);
        return this.escapeCSV(value, options.delimiter);
      })
    );
    
    // Construire le contenu CSV
    let csvContent = '';
    
    if (options.includeHeaders !== false) {
      csvContent += headers.join(options.delimiter || this.DEFAULT_DELIMITER) + '\n';
    }
    
    csvContent += rows.map(row => row.join(options.delimiter || this.DEFAULT_DELIMITER)).join('\n');
    
    // Ajouter BOM si nécessaire pour Excel
    if (options.encoding === 'utf-8-bom') {
      const BOM = '\uFEFF';
      csvContent = BOM + csvContent;
    }
    
    return csvContent;
  }
  
  /**
   * Génère un nom de fichier significatif
   */
  generateFilename(
    companies: GoldenRecord[],
    searchParams?: Record<string, any>,
    options: CSVExportOptions = {}
  ): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const count = companies.length;
    
    // Extraire les filtres pour le nom de fichier
    const filters: string[] = [];
    
    if (searchParams) {
      if (searchParams.codePostal) filters.push(`cp${searchParams.codePostal}`);
      if (searchParams.rayonKm) filters.push(`rayon${searchParams.rayonKm}km`);
      if (searchParams.codeNaf) filters.push(`naf${searchParams.codeNaf.replace('.', '')}`);
      if (searchParams.trancheEffectif) filters.push(`eff${searchParams.trancheEffectif}`);
      if (searchParams.ville) filters.push(this.sanitizeFilename(searchParams.ville));
    }
    
    const filterStr = filters.length > 0 ? `_${filters.join('_')}` : '';
    const countStr = count > 0 ? `_${count}entreprises` : '';
    
    return `leanleadmachine_export${filterStr}${countStr}_${date}_${timestamp}.csv`;
  }
  
  /**
   * Valide que l'export ne dépasse pas la limite
   */
  validateExportLimit(companies: GoldenRecord[], maxRows: number = this.DEFAULT_MAX_ROWS): void {
    if (companies.length > maxRows) {
      throw new Error(
        `Limite d'export dépassée. Maximum ${maxRows} lignes autorisées. ` +
        `Veuillez filtrer vos résultats ou exporter en plusieurs fois.`
      );
    }
  }
  
  /**
   * Obtient la liste des colonnes disponibles
   */
  getAvailableColumns(): Array<{ key: string; header: string; description: string }> {
    return [
      { key: 'siren', header: 'SIREN', description: 'Numéro SIREN (9 chiffres)' },
      { key: 'denomination', header: 'Dénomination', description: 'Nom officiel de l\'entreprise' },
      { key: 'adresse.complete', header: 'Adresse complète', description: 'Adresse postale complète' },
      { key: 'adresse.codePostal', header: 'Code postal', description: 'Code postal' },
      { key: 'adresse.ville', header: 'Ville', description: 'Ville' },
      { key: 'adresse.region', header: 'Région', description: 'Région' },
      { key: 'adresse.latitude', header: 'Latitude', description: 'Coordonnée latitude' },
      { key: 'adresse.longitude', header: 'Longitude', description: 'Coordonnée longitude' },
      { key: 'codeNaf', header: 'Code NAF', description: 'Code activité principale' },
      { key: 'libelleNaf', header: 'Libellé NAF', description: 'Libellé de l\'activité' },
      { key: 'trancheEffectif', header: 'Code effectif', description: 'Code tranche d\'effectif' },
      { key: 'libelleEffectif', header: 'Tranche effectif', description: 'Libellé tranche d\'effectif' },
      { key: 'effectifExact', header: 'Effectif exact', description: 'Effectif salarié exact' },
      { key: 'dateCreation', header: 'Date création', description: 'Date de création' },
      { key: 'statut', header: 'Statut', description: 'Statut juridique' },
      { key: 'categorieJuridique', header: 'Catégorie juridique', description: 'Forme juridique' },
      { key: 'dirigeants', header: 'Dirigeants', description: 'Liste des dirigeants' },
      { key: 'capitalSocial', header: 'Capital social', description: 'Capital social en euros' },
      { key: 'metadata.source', header: 'Source données', description: 'Source des données' },
      { key: 'metadata.lastUpdated', header: 'Dernière mise à jour', description: 'Date de mise à jour' },
      { key: 'metadata.confidenceScore', header: 'Score confiance', description: 'Score de confiance des données' },
    ];
  }
  
  /**
   * Obtient les colonnes selon la configuration
   */
  private getColumns(columnsConfig: 'default' | 'minimal' | 'extended' | string[]) {
    const allColumns = this.getAvailableColumns();
    
    if (Array.isArray(columnsConfig)) {
      // Configuration personnalisée
      return allColumns.filter(col => columnsConfig.includes(col.key));
    }
    
    // Configurations prédéfinies
    const configurations = {
      minimal: [
        'siren',
        'denomination',
        'adresse.complete',
        'codeNaf',
        'libelleEffectif',
      ],
      default: [
        'siren',
        'denomination',
        'adresse.complete',
        'adresse.codePostal',
        'adresse.ville',
        'codeNaf',
        'libelleNaf',
        'libelleEffectif',
        'dateCreation',
        'dirigeants',
      ],
      extended: [
        'siren',
        'denomination',
        'adresse.complete',
        'adresse.codePostal',
        'adresse.ville',
        'adresse.region',
        'adresse.latitude',
        'adresse.longitude',
        'codeNaf',
        'libelleNaf',
        'trancheEffectif',
        'libelleEffectif',
        'effectifExact',
        'dateCreation',
        'statut',
        'categorieJuridique',
        'dirigeants',
        'capitalSocial',
        'metadata.source',
        'metadata.lastUpdated',
        'metadata.confidenceScore',
      ],
    };
    
    const selectedKeys = configurations[columnsConfig] || configurations.default;
    return allColumns.filter(col => selectedKeys.includes(col.key));
  }
  
  /**
   * Extrait une valeur d'un GoldenRecord selon une clé path
   */
  private getValue(company: GoldenRecord, key: string): any {
    const keys = key.split('.');
    let value: any = company;
    
    for (const k of keys) {
      if (value === null || value === undefined) {
        return '';
      }
      
      if (k === 'dirigeants' && Array.isArray(value[k])) {
        // Formater la liste des dirigeants
        return value[k]
          .map((d: any) => `${d.nomComplet} (${d.qualite})`)
          .join('; ');
      }
      
      value = value[k];
    }
    
    return value !== null && value !== undefined ? String(value) : '';
  }
  
  /**
   * Échappe une valeur pour le format CSV
   */
  private escapeCSV(value: any, delimiter: string = this.DEFAULT_DELIMITER): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    const stringValue = String(value);
    
    // Caractères spéciaux à échapper
    const needsQuotes = 
      stringValue.includes(delimiter) ||
      stringValue.includes('"') ||
      stringValue.includes('\n') ||
      stringValue.includes('\r') ||
      stringValue.includes('\t') ||
      stringValue.trim() !== stringValue;
    
    if (needsQuotes) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  }
  
  /**
   * Nettoie une chaîne pour l'utiliser dans un nom de fichier
   */
  private sanitizeFilename(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD') // Décompose les accents
      .replace(/[\u0300-\u036f]/g, '') // Supprime les diacritiques
      .replace(/[^a-z0-9_-]/g, '_') // Remplace les caractères spéciaux
      .replace(/_+/g, '_') // Évite les underscores multiples
      .replace(/^_|_$/g, ''); // Supprime les underscores en début/fin
  }
  
  /**
   * Génère les headers HTTP pour le téléchargement
   */
  getDownloadHeaders(filename: string, encoding: string = 'utf-8'): Record<string, string> {
    const contentType = encoding === 'utf-8-bom' 
      ? 'text/csv; charset=utf-8' 
      : `text/csv; charset=${encoding}`;
    
    return {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    };
  }
  
  /**
   * Exporte vers un fichier (Node.js uniquement)
   */
  async exportToFile(
    companies: GoldenRecord[],
    filePath: string,
    options: CSVExportOptions = {}
  ): Promise<void> {
    const fs = await import('fs').then(m => m.promises);
    const csvContent = this.generateCSV(companies, options);
    
    // Créer les répertoires parents si nécessaire
    const dir = await import('path').then(path => path.dirname(filePath));
    await fs.mkdir(dir, { recursive: true });
    
    // Écrire le fichier
    const encoding = options.encoding ? this.mapEncoding(options.encoding) : 'utf8';
    await fs.writeFile(filePath, csvContent, encoding);
    
    console.log(`CSV exporté: ${filePath} (${companies.length} entreprises)`);
  }
}

// Export singleton
let csvExportServiceInstance: CSVExportServiceV2 | null = null;

export function getCSVExportService(): CSVExportServiceV2 {
  if (!csvExportServiceInstance) {
    csvExportServiceInstance = new CSVExportServiceV2();
  }
  return csvExportServiceInstance;
}