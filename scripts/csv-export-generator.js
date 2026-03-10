#!/usr/bin/env node

/**
 * Générateur CSV pour Lean Lead Machine
 * Export des données entreprises au format CSV conforme RGPD
 */

const { stringify } = require('csv-stringify/sync');
const fs = require('fs').promises;
const path = require('path');

class CSVExportGenerator {
  constructor(config = {}) {
    this.config = {
      maxRows: config.maxRows || 500,
      encoding: config.encoding || 'utf8',
      delimiter: config.delimiter || ';',
      includeBOM: config.includeBOM !== false, // true par défaut
      ...config
    };
  }
  
  /**
   * Valide les données avant export
   * @param {Array} companies - Liste d'entreprises
   * @throws {Error} Si validation échoue
   */
  validateExport(companies) {
    if (!Array.isArray(companies)) {
      throw new Error('Les données doivent être un tableau');
    }
    
    if (companies.length === 0) {
      throw new Error('Aucune donnée à exporter');
    }
    
    if (companies.length > this.config.maxRows) {
      throw new Error(
        `Limite d'export dépassée: ${companies.length} > ${this.config.maxRows} lignes maximum`
      );
    }
    
    // Vérifier la structure des données
    const firstCompany = companies[0];
    const requiredFields = ['denomination', 'siren', 'codePostal'];
    
    for (const field of requiredFields) {
      if (!firstCompany.hasOwnProperty(field)) {
        throw new Error(`Champ requis manquant: ${field}`);
      }
    }
  }
  
  /**
   * Formate une entreprise pour l'export CSV
   * @param {Object} company - Données entreprise
   * @returns {Object} Ligne formatée pour CSV
   */
  formatCompanyForExport(company) {
    // Formatage de l'adresse complète
    const adresseComplete = [
      company.numeroVoie,
      company.typeVoie,
      company.libelleVoie,
      company.codePostal,
      company.libelleCommune
    ]
      .filter(Boolean)
      .join(' ');
    
    // Formatage du dirigeant
    const dirigeantNom = company.dirigeants?.[0]?.nom || '';
    const dirigeantPrenom = company.dirigeants?.[0]?.prenom || '';
    const dirigeantQualite = company.dirigeants?.[0]?.qualite || '';
    
    // Formatage de la tranche d'effectif (texte)
    const trancheEffectifText = this.getTrancheEffectifText(company.trancheEffectif);
    
    // Formatage de la date (JJ/MM/AAAA)
    const dateCreation = company.dateCreation
      ? this.formatDate(company.dateCreation)
      : '';
    
    return {
      // Section Identité
      'Dénomination': company.denomination || '',
      'SIREN': company.siren || '',
      'SIRET': company.siret || '',
      'Date de création': dateCreation,
      'Statut juridique': company.categorieJuridique?.libelle || '',
      
      // Section Localisation
      'Adresse complète': adresseComplete,
      'Numéro voie': company.numeroVoie || '',
      'Type voie': company.typeVoie || '',
      'Libellé voie': company.libelleVoie || '',
      'Code postal': company.codePostal || '',
      'Ville': company.libelleCommune || '',
      'Région': company.libelleRegion || '',
      
      // Section Activité
      'Code NAF': company.activitePrincipale?.code || '',
      'Libellé NAF': company.activitePrincipale?.libelle || '',
      'Date début activité': company.dateDebut
        ? this.formatDate(company.dateDebut)
        : '',
      
      // Section Effectifs
      'Tranche d\'effectif': trancheEffectifText,
      'Effectif salarié': company.effectif || '',
      
      // Section Direction
      'Nom dirigeant': dirigeantNom,
      'Prénom dirigeant': dirigeantPrenom,
      'Qualité dirigeant': dirigeantQualite,
      'Date nomination': company.dirigeants?.[0]?.dateNomination
        ? this.formatDate(company.dirigeants[0].dateNomination)
        : ''
    };
  }
  
  /**
   * Convertit le code tranche d'effectif en texte
   * @private
   */
  getTrancheEffectifText(code) {
    const mapping = {
      '00': '0 salarié',
      '01': '1 ou 2 salariés',
      '02': '3 à 5 salariés',
      '03': '6 à 9 salariés',
      '11': '10 à 19 salariés',
      '12': '20 à 49 salariés',
      '21': '50 à 99 salariés',
      '22': '100 à 199 salariés',
      '31': '200 à 249 salariés',
      '32': '250 à 499 salariés',
      '41': '500 à 999 salariés',
      '42': '1000 à 1999 salariés',
      '51': '2000 à 4999 salariés',
      '52': '5000 à 9999 salariés',
      '53': '10000 salariés et plus'
    };
    
    return mapping[code] || code;
  }
  
  /**
   * Formate une date ISO en JJ/MM/AAAA
   * @private
   */
  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      return dateString;
    }
  }
  
  /**
   * Génère le contenu CSV
   * @param {Array} companies - Liste d'entreprises
   * @returns {Buffer} Contenu CSV encodé
   */
  async generateCSV(companies) {
    this.validateExport(companies);
    
    // Formater toutes les entreprises
    const formattedData = companies.map(company =>
      this.formatCompanyForExport(company)
    );
    
    // Définir les colonnes (ordre spécifique)
    const columns = [
      // Identité
      { key: 'Dénomination', header: 'Dénomination' },
      { key: 'SIREN', header: 'SIREN' },
      { key: 'SIRET', header: 'SIRET' },
      { key: 'Date de création', header: 'Date de création' },
      { key: 'Statut juridique', header: 'Statut juridique' },
      
      // Localisation
      { key: 'Adresse complète', header: 'Adresse complète' },
      { key: 'Code postal', header: 'Code postal' },
      { key: 'Ville', header: 'Ville' },
      { key: 'Région', header: 'Région' },
      
      // Activité
      { key: 'Code NAF', header: 'Code NAF' },
      { key: 'Libellé NAF', header: 'Libellé NAF' },
      
      // Effectifs
      { key: 'Tranche d\'effectif', header: 'Tranche d\'effectif' },
      
      // Direction
      { key: 'Nom dirigeant', header: 'Nom dirigeant' },
      { key: 'Prénom dirigeant', header: 'Prénom dirigeant' },
      { key: 'Qualité dirigeant', header: 'Qualité dirigeant' }
    ];
    
    // Générer le CSV
    const csvString = stringify(formattedData, {
      columns,
      delimiter: this.config.delimiter,
      header: true,
      quoted: true,
      quoted_empty: true
    });
    
    // Ajouter BOM si configuré (pour Excel UTF-8)
    let finalContent = csvString;
    if (this.config.includeBOM) {
      finalContent = '\uFEFF' + csvString;
    }
    
    // Encoder selon la configuration
    const buffer = Buffer.from(finalContent, this.config.encoding);
    
    return {
      buffer,
      rowCount: companies.length,
      columnCount: columns.length,
      fileSize: buffer.length
    };
  }
  
  /**
   * Génère un nom de fichier avec timestamp
   * @param {string} prefix - Préfixe du fichier
   * @returns {string} Nom de fichier
   */
  generateFilename(prefix = 'entreprises_export') {
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, 19);
    
    return `${prefix}_${timestamp}.csv`;
  }
  
  /**
   * Exporte les données vers un fichier
   * @param {Array} companies - Liste d'entreprises
   * @param {string} outputDir - Répertoire de sortie
   * @param {string} filename - Nom du fichier (optionnel)
   * @returns {Promise<Object>} Informations sur l'export
   */
  async exportToFile(companies, outputDir = './exports', filename = null) {
    // Créer le répertoire si nécessaire
    await fs.mkdir(outputDir, { recursive: true });
    
    // Générer le nom de fichier
    const finalFilename = filename || this.generateFilename();
    const filePath = path.join(outputDir, finalFilename);
    
    // Générer le CSV
    const { buffer, rowCount, columnCount, fileSize } = await this.generateCSV(companies);
    
    // Écrire le fichier
    await fs.writeFile(filePath, buffer);
    
    // Générer un fichier de métadonnées
    const metadata = {
      exportDate: new Date().toISOString(),
      filename: finalFilename,
      rowCount,
      columnCount,
      fileSize,
      encoding: this.config.encoding,
      delimiter: this.config.delimiter,
      maxRows: this.config.maxRows,
      source: 'Lean Lead Machine MVP V1',
      rgpdCompliant: true,
      cacheTTL: '24h'
    };
    
    const metadataPath = filePath.replace('.csv', '.metadata.json');
    await fs.writeFile(
      metadataPath,
      JSON.stringify(metadata, null, 2)
    );
    
    return {
      filePath,
      metadataPath,
      filename: finalFilename,
      ...metadata
    };
  }
  
  /**
   * Exporte les données pour téléchargement HTTP
   * @param {Array} companies - Liste d'entreprises
   * @returns {Promise<Object>} Données pour réponse HTTP
   */
  async exportForDownload(companies) {
    const { buffer, rowCount } = await this.generateCSV(companies);
    const filename = this.generateFilename();
    
    return {
      buffer,
      filename,
      rowCount,
      contentType: 'text/csv; charset=utf-8',
      contentDisposition: `attachment; filename="${filename}"`,
      contentLength: buffer.length
    };
  }
  
  /**
   * Valide un fichier CSV existant
   * @param {string} filePath - Chemin du fichier CSV
   * @returns {Promise<Object>} Résultats de validation
   */
  async validateCSVFile(filePath) {
    try {
      const content = await fs.readFile(filePath, this.config.encoding);
      const stats = await fs.stat(filePath);
      
      // Compter les lignes (approximatif)
      const lines = content.split('\n').filter(line => line.trim());
      const rowCount = lines.length - 1; // Exclure l'en-tête
      
      // Vérifier l'en-tête
      const header = lines[0];
      const expectedHeader = [
        'Dénomination', 'SIREN', 'SIRET', 'Date de création',
        'Statut juridique', 'Adresse complète', 'Code postal',
        'Ville', 'Région', 'Code NAF', 'Libellé NAF',
        'Tranche d\'effectif', 'Nom dirigeant', 'Prénom dirigeant',
        'Qualité dirigeant'
      ].join(this.config.delimiter);
      
      const headerValid = header === expectedHeader;
      
      return {
        valid: headerValid && rowCount <= this.config.maxRows,
        filePath,
        fileSize: stats.size,
        rowCount,
        headerValid,
        withinLimit: rowCount <= this.config.maxRows,
        maxRows: this.config.maxRows,
        encoding: this.config.encoding,
        delimiter: this.config.delimiter
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        filePath
      };
    }
  }
}

// Export pour utilisation comme module
module.exports = CSVExportGenerator;

// Exécution en ligne de commande
if (require.main === module) {
  const yargs = require('yargs/yargs');
  const { hideBin } = require('yargs/helpers');
  
  const argv = yargs(hideBin(process.argv))
    .command('generate', 'Génère un export CSV', {
      input: {
        alias: 'i',
        describe: 'Fichier JSON d\'entrée',
        demandOption: true,
        type: 'string'
      },
      output: {
        alias: 'o',
        describe: 'Répertoire de sortie',
        default: './exports',
        type: 'string'
      },
      maxRows: {
        alias: 'm',
        describe: 'Nombre maximum de lignes',
        default: 500,
        type: 'number'
      }
    })
    .command('validate', 'Valide un fichier CSV', {
      file: {
        alias: 'f',
        describe: 'Fichier CSV à valider',
        demandOption: true,
        type: 'string'
      }
    })
    .demandCommand(1, 'Vous devez spécifier une commande')
    .help()
    .argv;
  
  async function main() {
    const generator = new CSVExportGenerator({
      maxRows: argv.maxRows
    });
    
    if (argv._[0] === 'generate') {
      try {
        // Lire les données d'entrée
        const inputData = await fs.readFile(argv.input, 'utf8');
        const companies = JSON.parse(inputData);
        
        console.log(`📊 Génération export pour ${companies.length} entreprises...`);
        
        // Générer l'export
        const result = await generator.exportToFile(
          companies,
          argv.output
        );
        
        console.log('✅ Export généré avec succès:');
        console.log(`   Fichier: ${result.filePath}`);
        console.log(`   Lignes: ${result.rowCount}`);
        console.log(`   Colonnes: ${result.columnCount}`);
        console.log(`   Taille: ${(result.fileSize / 1024).toFixed(2)} KB`);
        console.log(`   Métadonnées: ${result.metadataPath}`);
        
      } catch (error) {
        console.error('❌ Erreur lors de la génération:', error.message);
        process.exit(1);
      }
    } else if (argv._[0] === 'validate') {
      try {
        console.log(`🔍 Validation du fichier: ${argv.file}`);
        
        const result = await generator.validateCSVFile(argv.file);
        
        if (result.valid) {
          console.log('✅ Fichier CSV valide:');
          console.log(`   Lignes: ${result.rowCount}`);
          console.log(`   Taille: ${(result.fileSize / 1024).toFixed(2)} KB`);
          console.log(`   Encodage: ${result.encoding}`);
          console.log(`   Délimiteur: ${result.delimiter}`);
        } else {
          console.error('❌ Fichier CSV invalide:');
          if (!result.headerValid) {
            console.error('   En-tête incorrect');
          }
          if (!result.withinLimit) {
            console.error(`   Trop de lignes: ${result.rowCount} > ${result.maxRows}`);
          }
          if (result.error) {
            console.error(`   Erreur: ${result.error}`);
          }
          process.exit(1);
        }
      } catch (error) {
        console.error('❌ Erreur lors de la validation:', error.message);
        process.exit(1);
      }
    }
  }
  
  main().catch(console.error);
}
