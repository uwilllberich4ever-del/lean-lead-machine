/**
 * Tests de performance pour l'intégration API MCP V2
 */

import { getMCPService } from '@/lib/services/mcp-v2.service';
import { getCSVExportService } from '@/lib/services/csv-export-v2.service';

// Configuration des tests
const TEST_CONFIG = {
  iterations: 10, // Nombre d'itérations par test
  warmup: 3, // Itérations d'échauffement
  timeout: 10000, // Timeout par test (ms)
  thresholds: {
    searchLatency: 1000, // 1s max
    detailsLatency: 500, // 500ms max
    exportLatency: 2000, // 2s max pour 500 lignes
    cacheHitRate: 0.8, // 80% minimum
    successRate: 0.95, // 95% minimum
  }
};

// Données de test
const TEST_CASES = {
  search: [
    { codePostal: '75001', limit: 10 },
    { codePostal: '69001', codeNaf: '62.01Z', limit: 20 },
    { codePostal: '13001', rayonKm: 5, limit: 50 },
    { ville: 'Paris', trancheEffectif: '11', limit: 30 },
  ],
  companyDetails: [
    '123456789', // SIREN fictif - à remplacer par des vrais pour les tests
    '987654321',
    '456789123',
  ],
};

interface BenchmarkResult {
  name: string;
  iterations: number;
  successes: number;
  failures: number;
  successRate: number;
  latency: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  cacheStats?: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  passed: boolean;
}

class PerformanceBenchmark {
  private mcpService = getMCPService();
  private csvService = getCSVExportService();
  private results: BenchmarkResult[] = [];

  async runAllTests() {
    console.log('🚀 Démarrage des tests de performance MCP V2\n');
    
    // Test de connexion
    await this.testConnection();
    
    // Tests de recherche
    for (const [index, params] of TEST_CASES.search.entries()) {
      await this.testSearch(`Search ${index + 1}`, params);
    }
    
    // Tests détails entreprise
    for (const [index, siren] of TEST_CASES.companyDetails.entries()) {
      await this.testCompanyDetails(`Company Details ${index + 1}`, siren);
    }
    
    // Test export CSV
    await this.testCSVExport();
    
    // Affichage des résultats
    this.printResults();
    
    // Validation des seuils
    return this.validateThresholds();
  }

  private async testConnection() {
    console.log('🔌 Test de connexion API MCP...');
    
    const startTime = Date.now();
    const connected = await this.mcpService.testConnection();
    const latency = Date.now() - startTime;
    
    if (connected) {
      console.log(`✅ Connexion OK (${latency}ms)`);
    } else {
      console.log(`❌ Connexion échouée (${latency}ms)`);
    }
    
    return connected;
  }

  private async testSearch(name: string, params: any) {
    console.log(`\n🔍 Test: ${name}`);
    console.log(`Params: ${JSON.stringify(params)}`);
    
    const latencies: number[] = [];
    let successes = 0;
    let failures = 0;
    let cacheHits = 0;
    let cacheMisses = 0;

    // Échauffement
    for (let i = 0; i < TEST_CONFIG.warmup; i++) {
      try {
        await this.mcpService.searchCompanies(params);
      } catch (error) {
        // Ignorer les erreurs d'échauffement
      }
    }

    // Tests réels
    for (let i = 0; i < TEST_CONFIG.iterations; i++) {
      const startTime = Date.now();
      
      try {
        const result = await this.mcpService.searchCompanies(params);
        const latency = Date.now() - startTime;
        
        latencies.push(latency);
        successes++;
        
        // Statistiques cache
        if (result.metadata.cache.hit) {
          cacheHits++;
        } else {
          cacheMisses++;
        }
        
        console.log(`  Iteration ${i + 1}: ${latency}ms (cache: ${result.metadata.cache.hit ? 'HIT' : 'MISS'})`);
      } catch (error) {
        failures++;
        console.log(`  Iteration ${i + 1}: ERROR - ${error.message}`);
      }
    }

    const result = this.calculateResult(
      name,
      latencies,
      successes,
      failures,
      cacheHits,
      cacheMisses
    );

    this.results.push(result);
    return result;
  }

  private async testCompanyDetails(name: string, siren: string) {
    console.log(`\n🏢 Test: ${name} (SIREN: ${siren})`);
    
    const latencies: number[] = [];
    let successes = 0;
    let failures = 0;
    let cacheHits = 0;
    let cacheMisses = 0;

    // Échauffement
    for (let i = 0; i < TEST_CONFIG.warmup; i++) {
      try {
        await this.mcpService.getCompanyDetails(siren);
      } catch (error) {
        // Ignorer
      }
    }

    // Tests réels
    for (let i = 0; i < TEST_CONFIG.iterations; i++) {
      const startTime = Date.now();
      
      try {
        const result = await this.mcpService.getCompanyDetails(siren);
        const latency = Date.now() - startTime;
        
        latencies.push(latency);
        successes++;
        
        // Statistiques cache
        if (result.metadata.cacheHit) {
          cacheHits++;
        } else {
          cacheMisses++;
        }
        
        console.log(`  Iteration ${i + 1}: ${latency}ms (cache: ${result.metadata.cacheHit ? 'HIT' : 'MISS'})`);
      } catch (error) {
        failures++;
        console.log(`  Iteration ${i + 1}: ERROR - ${error.message}`);
      }
    }

    const result = this.calculateResult(
      name,
      latencies,
      successes,
      failures,
      cacheHits,
      cacheMisses
    );

    this.results.push(result);
    return result;
  }

  private async testCSVExport() {
    console.log('\n📊 Test: Export CSV (500 entreprises)');
    
    // Générer des données de test
    const testCompanies = [];
    for (let i = 0; i < 500; i++) {
      const siren = `8${String(i).padStart(8, '0')}`;
      testCompanies.push({
        siren,
        denomination: `Entreprise Test ${i + 1}`,
        adresse: {
          complete: `12 Rue de Test, 75001 Paris`,
          codePostal: '75001',
          ville: 'Paris',
          region: 'Île-de-France',
        },
        codeNaf: '62.01Z',
        libelleNaf: 'Programmation informatique',
        trancheEffectif: '11',
        libelleEffectif: '10 à 19 salariés',
        dateCreation: '2020-01-01',
        statut: 'Actif',
        categorieJuridique: 'SAS',
        dirigeants: [
          {
            nomComplet: 'Jean Dupont',
            qualite: 'Président',
            dateNomination: '2020-01-01',
          },
        ],
        metadata: {
          source: 'Test',
          lastUpdated: new Date().toISOString(),
          confidenceScore: 100,
          cacheHit: false,
        },
      });
    }

    const latencies: number[] = [];
    let successes = 0;
    let failures = 0;

    // Échauffement
    for (let i = 0; i < TEST_CONFIG.warmup; i++) {
      try {
        this.csvService.generateCSV(testCompanies.slice(0, 10));
      } catch (error) {
        // Ignorer
      }
    }

    // Tests réels
    for (let i = 0; i < TEST_CONFIG.iterations; i++) {
      const startTime = Date.now();
      
      try {
        const csv = this.csvService.generateCSV(testCompanies, {
          columns: 'extended',
          maxRows: 500,
        });
        
        const latency = Date.now() - startTime;
        latencies.push(latency);
        successes++;
        
        console.log(`  Iteration ${i + 1}: ${latency}ms (${csv.length} bytes)`);
      } catch (error) {
        failures++;
        console.log(`  Iteration ${i + 1}: ERROR - ${error.message}`);
      }
    }

    const result = this.calculateResult(
      'CSV Export (500 rows)',
      latencies,
      successes,
      failures
    );

    this.results.push(result);
    return result;
  }

  private calculateResult(
    name: string,
    latencies: number[],
    successes: number,
    failures: number,
    cacheHits: number = 0,
    cacheMisses: number = 0
  ): BenchmarkResult {
    const total = successes + failures;
    const successRate = successes / total;
    
    // Calcul des percentiles
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    
    const result: BenchmarkResult = {
      name,
      iterations: total,
      successes,
      failures,
      successRate,
      latency: {
        min: Math.min(...latencies),
        max: Math.max(...latencies),
        avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
        p50: this.percentile(sortedLatencies, 50),
        p95: this.percentile(sortedLatencies, 95),
        p99: this.percentile(sortedLatencies, 99),
      },
      passed: successRate >= TEST_CONFIG.thresholds.successRate &&
              this.percentile(sortedLatencies, 95) <= this.getThresholdForTest(name),
    };

    // Ajouter les stats cache si disponibles
    if (cacheHits + cacheMisses > 0) {
      const hitRate = cacheHits / (cacheHits + cacheMisses);
      result.cacheStats = {
        hits: cacheHits,
        misses: cacheMisses,
        hitRate,
      };
      result.passed = result.passed && hitRate >= TEST_CONFIG.thresholds.cacheHitRate;
    }

    return result;
  }

  private percentile(sortedArray: number[], p: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  private getThresholdForTest(name: string): number {
    if (name.includes('Search')) return TEST_CONFIG.thresholds.searchLatency;
    if (name.includes('Company Details')) return TEST_CONFIG.thresholds.detailsLatency;
    if (name.includes('CSV Export')) return TEST_CONFIG.thresholds.exportLatency;
    return 1000; // Default
  }

  private printResults() {
    console.log('\n' + '='.repeat(80));
    console.log('📈 RÉSULTATS DES TESTS DE PERFORMANCE');
    console.log('='.repeat(80));
    
    for (const result of this.results) {
      console.log(`\n${result.name}:`);
      console.log(`  Itérations: ${result.iterations} (${result.successes} ✓, ${result.failures} ✗)`);
      console.log(`  Taux de succès: ${(result.successRate * 100).toFixed(1)}%`);
      
      if (result.cacheStats) {
        console.log(`  Cache: ${result.cacheStats.hits} hits, ${result.cacheStats.misses} misses`);
        console.log(`  Taux de hit cache: ${(result.cacheStats.hitRate * 100).toFixed(1)}%`);
      }
      
      console.log(`  Latence (ms):`);
      console.log(`    Min: ${result.latency.min.toFixed(0)}`);
      console.log(`    Max: ${result.latency.max.toFixed(0)}`);
      console.log(`    Avg: ${result.latency.avg.toFixed(0)}`);
      console.log(`    P50: ${result.latency.p50.toFixed(0)}`);
      console.log(`    P95: ${result.latency.p95.toFixed(0)}`);
      console.log(`    P99: ${result.latency.p99.toFixed(0)}`);
      
      const threshold = this.getThresholdForTest(result.name);
      console.log(`  Seuil P95: ${threshold}ms`);
      console.log(`  Statut: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
    }
    
    console.log('\n' + '='.repeat(80));
  }

  private validateThresholds(): boolean {
    const failedTests = this.results.filter(r => !r.passed);
    
    if (failedTests.length === 0) {
      console.log('🎉 TOUS LES TESTS ONT RÉUSSI !');
      return true;
    }
    
    console.log(`\n⚠️  ${failedTests.length} test(s) ont échoué:`);
    for (const test of failedTests) {
      console.log(`  - ${test.name}`);
    }
    
    return false;
  }
}

// Exécution des tests
async function runBenchmarks() {
  const benchmark = new PerformanceBenchmark();
  
  try {
    const success = await benchmark.runAllTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution des benchmarks:', error);
    process.exit(1);
  }
}

// Exécution si appelé directement
if (require.main === module) {
  runBenchmarks();
}

export { PerformanceBenchmark, TEST_CONFIG, TEST_CASES };