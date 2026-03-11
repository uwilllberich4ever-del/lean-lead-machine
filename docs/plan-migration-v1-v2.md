# Plan de Migration V1 → V2
## Passage des Mock Data à l'API MCP Réelle

## 1. Vue d'Ensemble

### 1.1 Objectifs de la Migration
- **Fonctionnel**: Remplacer les données simulées par les données officielles MCP
- **Performance**: Maintenir les temps de réponse < 1s
- **Fiabilité**: Mise en place de fallbacks et monitoring
- **Sécurité**: Conformité RGPD avec cache limité à 24h

### 1.2 Phases de Migration
```
Phase 1: Préparation (1-2 jours)
  ├── Analyse API MCP réelle
  ├── Configuration environnement
  ├── Développement services V2
  └── Tests unitaires

Phase 2: Intégration Progressive (3-5 jours)
  ├── Déploiement services V2 en parallèle
  ├── A/B testing limité
  ├── Monitoring performances
  └── Corrections bugs

Phase 3: Basculement (1 jour)
  ├── Migration données cache
  ├── Switch traffic 100% V2
  ├── Validation complète
  └── Plan rollback prêt

Phase 4: Post-Migration (2-3 jours)
  ├── Optimisation fine
  ├── Documentation finale
  └── Formation équipe
```

## 2. Préparation Technique

### 2.1 Configuration Environnement
```bash
# Variables d'environnement à ajouter
MCP_API_URL=https://api.data.gouv.fr
MCP_API_KEY=votre_cle_api_mcp
UPSTASH_REDIS_URL=redis://...
UPSTASH_REDIS_TOKEN=votre_token_redis

# Variables optionnelles
MCP_CACHE_TTL=86400  # 24h en secondes
MCP_MAX_RETRIES=3
MCP_RATE_LIMIT=60    # req/min
```

### 2.2 Dépendances à Ajouter
```json
{
  "dependencies": {
    "@upstash/redis": "^1.0.0",
    "compression": "^1.7.0",
    "node-cache": "^5.0.0"
  },
  "devDependencies": {
    "@types/compression": "^1.7.0",
    "jest": "^29.0.0",
    "supertest": "^6.0.0"
  }
}
```

## 3. Migration des Services

### 3.1 Service MCP (mcp.service.ts → mcp-v2.service.ts)

**Changements majeurs**:
1. **Remplacement des mock data** par des appels API réels
2. **Ajout du cache Redis** avec TTL 24h
3. **Implémentation retry logic** avec exponential backoff
4. **Gestion des erreurs** avec fallback vers mock data
5. **Monitoring** des performances intégré

**Compatibilité ascendante**:
```typescript
// Ancienne interface (V1)
interface MCPSearchParams {
  codePostal?: string;
  rayonKm?: number;
  codeNaf?: string;
  // ... autres paramètres
}

// Nouvelle interface (V2) - identique pour compatibilité
interface MCPSearchParams {
  codePostal?: string;
  rayonKm?: number;
  codeNaf?: string;
  // ... mêmes paramètres
}
```

**Migration étape par étape**:
1. Créer `mcp-v2.service.ts` avec la nouvelle implémentation
2. Tester en parallèle avec l'ancien service
3. Mettre à jour les imports progressivement
4. Supprimer l'ancien service une fois validé

### 3.2 Service CSV Export (csv-export.service.ts → csv-export-v2.service.ts)

**Améliorations**:
1. **Support des Golden Records** avec données enrichies
2. **Colonnes configurables** (minimal, default, extended)
3. **Encodage multiple** (UTF-8, UTF-8-BOM pour Excel)
4. **Validation améliorée** avec messages d'erreur clairs

**Migration**:
```typescript
// Avant (V1)
import { CSVExportService } from './csv-export.service';

// Après (V2)
import { getCSVExportService } from './csv-export-v2.service';
const csvService = getCSVExportService();
```

## 4. Migration des Routes API

### 4.1 Route `/api/mcp/companies`

**Structure actuelle (V1)**:
```typescript
// Mock data uniquement
const mockCompanies = [...];
export async function GET(request: NextRequest) {
  // Retourne toujours mock data
}
```

**Nouvelle structure (V2)**:
```typescript
import { getMCPService } from '@/lib/services/mcp-v2.service';

export async function GET(request: NextRequest) {
  const mcpService = getMCPService();
  
  try {
    // Appel réel à l'API MCP avec cache
    const result = await mcpService.searchCompanies(params);
    return NextResponse.json(result);
  } catch (error) {
    // Fallback automatique vers mock data si configuré
    if (process.env.NODE_ENV === 'development') {
      const mockResult = await mcpService.searchCompanies(params); // Utilise le fallback interne
      return NextResponse.json(mockResult);
    }
    throw error;
  }
}
```

### 4.2 Route `/api/export/csv`

**Améliorations**:
1. **Support des Golden Records**
2. **Options d'export configurables**
3. **Meilleure gestion des erreurs**
4. **Headers HTTP optimisés**

## 5. Tests de Performance

### 5.1 Métriques à Surveiller
```typescript
const performanceBenchmarks = {
  v1: {
    searchLatency: '50-100ms', // Mock data
    cacheHitRate: 'N/A',
    apiSuccessRate: '100%', // Toujours mock
  },
  v2: {
    searchLatency: '<1000ms', // Objectif
    cacheHitRate: '>80%', // Objectif
    apiSuccessRate: '>95%', // Objectif
  }
};
```

### 5.2 Tests de Charge
```bash
# Script de test de performance
npm run test:performance -- --scenario=mcp-search

# Scénarios de test
SCENARIOS=(
  "search-postal-code"
  "search-naf-code" 
  "search-combined"
  "company-details"
  "export-csv"
)
```

### 5.3 Monitoring en Production
```typescript
// Métriques à tracker
const metrics = {
  // Performance
  'mcp.api.latency': 'Gauge',
  'mcp.cache.hit_rate': 'Gauge',
  'mcp.search.duration': 'Histogram',
  
  // Fiabilité
  'mcp.api.errors': 'Counter',
  'mcp.fallback.used': 'Counter',
  'mcp.rate_limit.hits': 'Counter',
  
  // Business
  'mcp.searches.total': 'Counter',
  'mcp.companies.viewed': 'Counter',
  'mcp.exports.generated': 'Counter',
};
```

## 6. Plan de Rollback

### 6.1 Conditions de Rollback
```typescript
const rollbackConditions = [
  {
    metric: 'mcp.api.latency.p95',
    threshold: 2000, // 2 secondes
    duration: '5m',
    severity: 'HIGH'
  },
  {
    metric: 'mcp.api.error_rate',
    threshold: 10, // 10%
    duration: '10m', 
    severity: 'CRITICAL'
  },
  {
    metric: 'mcp.cache.hit_rate',
    threshold: 50, // 50%
    duration: '30m',
    severity: 'MEDIUM'
  }
];
```

### 6.2 Procédure de Rollback
```
Étape 1: Détection problème
  ├── Monitoring alerte
  ├── Validation manuelle
  └── Décision rollback

Étape 2: Préparation
  ├── Notification équipe
  ├── Backup données V2
  └── Vérification environnement V1

Étape 3: Exécution
  ├── Switch DNS/load balancer
  ├── Redirection traffic vers V1
  ├── Désactivation services V2
  └── Validation fonctionnelle

Étape 4: Post-Rollback
  ├── Analyse root cause
  ├── Correction problèmes
  ├── Plan re-migration
  └── Documentation incident
```

### 6.3 Script de Rollback Automatique
```bash
#!/bin/bash
# rollback-v2-to-v1.sh

echo "🚨 Début de la procédure de rollback V2 → V1"

# 1. Sauvegarde des données V2
echo "📦 Sauvegarde des données V2..."
BACKUP_DIR="./backup/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR
cp -r ./lib/services/*-v2.* $BACKUP_DIR/

# 2. Restauration des services V1
echo "↩️  Restauration des services V1..."
cp ./lib/services/mcp.service.ts.bak ./lib/services/mcp.service.ts
cp ./lib/services/csv-export.service.ts.bak ./lib/services/csv-export.service.ts

# 3. Mise à jour des imports
echo "🔧 Mise à jour des imports..."
find ./app -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  -e "s/from '\.\.\/lib\/services\/mcp-v2\.service'/from '..\/lib\/services\/mcp.service'/g" \
  -e "s/from '\.\.\/lib\/services\/csv-export-v2\.service'/from '..\/lib\/services\/csv-export.service'/g"

# 4. Redéploiement
echo "🚀 Redéploiement..."
npm run build
vercel deploy --prod

echo "✅ Rollback terminé. V1 restauré."
```

## 7. Checklist de Migration

### 7.1 Pré-Migration
- [ ] Documentation API MCP complète
- [ ] Clés API obtenues et testées
- [ ] Environnement Redis configuré
- [ ] Services V2 développés et testés
- [ ] Tests de performance réalisés
- [ ] Plan de rollback documenté
- [ ] Équipe formée sur les changements

### 7.2 Migration
- [ ] Déploiement services V2 en staging
- [ ] A/B testing avec 10% du traffic
- [ ] Monitoring performances activé
- [ ] Validation fonctionnelle complète
- [ ] Correction des bugs identifiés
- [ ] Augmentation progressive du traffic
- [ ] Basculement 100% vers V2

### 7.3 Post-Migration
- [ ] Surveillance 24h/24 pendant 7 jours
- [ ] Optimisation basée sur les métriques
- [ ] Documentation mise à jour
- [ ] Archive des services V1
- [ ] Revue post-mortem de la migration
- [ ] Plan d'évolution future défini

## 8. Risques et Mitigations

### 8.1 Risques Identifiés
```typescript
const risks = [
  {
    risk: "API MCP non disponible",
    probability: "MEDIUM",
    impact: "HIGH",
    mitigation: "Fallback vers mock data, cache Redis"
  },
  {
    risk: "Performance dégradée",
    probability: "HIGH", 
    impact: "MEDIUM",
    mitigation: "Cache agressif, monitoring proactif"
  },
  {
    risk: "Limites de taux dépassées",
    probability: "MEDIUM",
    impact: "HIGH",
    mitigation: "Rate limiting côté client, cache"
  },
  {
    risk: "Données incomplètes/incohérentes",
    probability: "LOW",
    impact: "MEDIUM",
    mitigation: "Validation données, logs détaillés"
  }
];
```

### 8.2 Stratégies de Mitigation
1. **Cache multi-niveaux**: Redis + mémoire + CDN
2. **Circuit breaker**: Désactivation automatique si échecs répétés
3. **Fallback graduel**: Mock data → cache → API réelle
4. **Monitoring temps réel**: Alertes proactives
5. **Rollback automatisé**: Script prêt à l'exécution

## 9. Communication

### 9.1 Parties Prenantes
- **Équipe technique**: Développeurs, DevOps, QA
- **Product Management**: Product Owner, Product Manager
- **Support client**: Équipe support, documentation
- **Utilisateurs**: Notification via changelog

### 9.2 Plan de Communication
```
J-7: Annonce migration aux équipes internes
J-3: Documentation technique publiée
J-1: Notification maintenance (si nécessaire)
J+0: Migration en production
J+1: Rapport initial de performance
J+7: Revue complète et communication résultats
```

## 10. Ressources Nécessaires

### 10.1 Humaines
- 1 Data Engineer (lead migration)
- 2 Développeurs Full-Stack
- 1 DevOps/Infra
- 1 QA Engineer
- 1 Product Owner

### 10.2 Techniques
- Environnement de staging identique à production
- Outils de monitoring (Datadog, New Relic, etc.)
- Système de cache Redis/Upstash
- Clés API MCP avec quotas suffisants
- Outils de test de charge (k6, Artillery)

### 10.3 Temporelles
- **Préparation**: 3-5 jours
- **Migration**: 2-3 jours  
- **Stabilisation**: 5-7 jours
- **Total estimé**: 10-15 jours calendaires

---

**Note importante**: Cette migration doit être effectuée pendant les heures creuses (nuit ou week-end) pour minimiser l'impact sur les utilisateurs. Un maintien en lecture seule peut être nécessaire pendant le basculement.