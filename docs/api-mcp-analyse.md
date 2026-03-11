# Analyse de l'API MCP data.gouv.fr

## 1. Introduction

L'API MCP (Moteur de Consultation des Publications) est l'interface officielle du gouvernement français pour accéder aux données des entreprises via les bases SIRENE (données légales) et RNE (Registre National des Entreprises).

## 2. Endpoints Pertinents pour Lean Lead Machine

### 2.1 Recherche d'entreprises
**Endpoint probable**: `POST /entreprises/search` ou `GET /sirene/companies/search`

**Paramètres attendus**:
- `codePostal` (string): Code postal (5 chiffres)
- `rayonMetres` (number): Rayon de recherche en mètres
- `codeNaf` (string): Code NAF (format: XX.XXZ)
- `trancheEffectif` (string): Code tranche d'effectif (00, 01, 02, etc.)
- `ville` (string): Nom de la ville
- `page` (number): Numéro de page
- `limit` (number): Limite de résultats (max 500)

### 2.2 Détails d'une entreprise
**Endpoint probable**: `GET /sirene/companies/{siren}`

**Paramètres**:
- `siren` (string): Numéro SIREN (9 chiffres)

### 2.3 Données RNE (dirigeants)
**Endpoint probable**: `GET /rne/dirigeants/{siren}`

**Paramètres**:
- `siren` (string): Numéro SIREN (9 chiffres)

### 2.4 Suggestions auto-complétion
**Endpoints probables**:
- `GET /suggestions/naf` - Suggestions codes NAF
- `GET /suggestions/villes` - Suggestions villes
- `GET /suggestions/codes-postaux` - Suggestions codes postaux

## 3. Formats de Réponse

### 3.1 Structure SIRENE (entreprise)
```typescript
interface SireneCompany {
  siren: string;
  denomination: string;
  denominationUsuelle?: string;
  adresse: {
    codePostal: string;
    libelleCommune: string;
    numeroVoie: string;
    typeVoie: string;
    libelleVoie: string;
    libelleRegion: string;
    latitude?: number;
    longitude?: number;
  };
  activitePrincipale: {
    code: string;
    libelle: string;
  };
  trancheEffectif: string;
  dateCreation: string;
  categorieJuridique: {
    code: string;
    libelle: string;
  };
  effectif?: number;
  statut: 'Actif' | 'Cessé' | 'Radié';
  capitalSocial?: number;
}
```

### 3.2 Structure RNE (dirigeants)
```typescript
interface RNEExecutive {
  nom: string;
  prenom: string;
  qualite: string; // "Président", "Directeur Général", etc.
  dateNomination: string;
  dateCessation?: string;
}
```

### 3.3 Réponse de recherche paginée
```typescript
interface MCPSearchResponse {
  entreprises: SireneCompany[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  metadata: {
    source: "MCP data.gouv.fr";
    freshness: string; // "24h", "realtime", etc.
    nextUpdate?: string;
  };
}
```

## 4. Limites de Taux et Authentification

### 4.1 Limites de taux (estimation)
- **Sans authentification**: ~10 req/min, ~100 req/jour
- **Avec clé API**: ~60 req/min, ~5000 req/jour
- **Limite de résultats**: 500 par requête maximum

### 4.2 Authentification
- **Méthode**: Bearer Token
- **Obtention**: Inscription sur data.gouv.fr
- **En-tête**: `Authorization: Bearer {API_KEY}`

### 4.3 Headers requis
```http
Accept: application/json
Content-Type: application/json
Authorization: Bearer {API_KEY} (si nécessaire)
```

## 5. Conformité RGPD et Contraintes

### 5.1 Données publiques vs sensibles
- **Publiques**: Dénomination, adresse, NAF, effectif, dirigeants
- **Sensibles**: Email, téléphone (non disponibles via API officielle)
- **Consentement requis**: Pour l'enrichissement via scraping LinkedIn

### 5.2 Cache et rétention
- **Cache maximum**: 24h (conformité RGPD)
- **Purge automatique**: Nécessaire après 24h
- **Stockage**: Pas de base de données permanente (stateless)

### 5.3 Logging et traçabilité
- **Ne pas logger**: SIREN, noms de dirigeants
- **Logger**: Timestamps, types de requêtes, codes d'erreur
- **Anonymisation**: Hash des IPs utilisateurs

## 6. Gestion des Erreurs

### 6.1 Codes d'erreur HTTP
- `400`: Paramètres invalides
- `401`: Authentification requise
- `403`: Accès interdit / quota dépassé
- `404`: Entreprise non trouvée
- `429`: Trop de requêtes
- `500`: Erreur interne serveur
- `503`: Service indisponible

### 6.2 Stratégie de retry
```typescript
const retryStrategy = {
  maxAttempts: 3,
  baseDelay: 1000, // 1s
  maxDelay: 10000, // 10s
  retryableErrors: [429, 500, 502, 503, 504],
  exponentialBackoff: true
};
```

### 6.3 Fallback
- **Niveau 1**: Cache Redis (24h max)
- **Niveau 2**: Mock data (pour démo MVP)
- **Niveau 3**: Message d'erreur utilisateur friendly

## 7. Performance et Optimisation

### 7.1 Objectifs
- **Temps de réponse**: < 1s (P95)
- **Cache hit rate**: > 80%
- **Parallélisation**: Requêtes SIRENE + RNE simultanées
- **Compression**: Gzip pour les réponses JSON

### 7.2 Monitoring
- **Métriques clés**: Latence, taux d'erreur, utilisation cache
- **Alertes**: Latence > 2s, erreur rate > 5%
- **Logs**: Structured logging avec correlation IDs

## 8. Schéma de Données "Golden Record"

### 8.1 Structure consolidée
```typescript
interface GoldenRecord {
  // Données SIRENE
  siren: string;
  denomination: string;
  adresse: {
    complete: string;
    codePostal: string;
    ville: string;
    region: string;
    latitude?: number;
    longitude?: number;
  };
  
  // Activité
  codeNaf: string;
  libelleNaf: string;
  
  // Effectif
  trancheEffectif: string;
  libelleEffectif: string;
  effectifExact?: number;
  
  // Dates
  dateCreation: string;
  statut: string;
  
  // Dirigeants (RNE)
  dirigeants: Array<{
    nomComplet: string;
    qualite: string;
    dateNomination: string;
  }>;
  
  // Enrichissement (optionnel)
  contacts?: {
    website?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
  };
  
  // Métadonnées
  metadata: {
    source: "MCP data.gouv.fr";
    lastUpdated: string;
    confidenceScore: number; // 0-100
  };
}
```

### 8.2 Mapping des codes d'effectif
```typescript
const EFFECTIF_MAPPING: Record<string, string> = {
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
  '42': '1000 à 1999 salariés',
  '51': '2000 à 4999 salariés',
  '52': '5000 à 9999 salariés',
  '53': '10000+ salariés'
};
```

## 9. Validation des Inputs

### 9.1 Code postal
```typescript
function validatePostalCode(code: string): boolean {
  return /^[0-9]{5}$/.test(code);
}
```

### 9.2 SIREN
```typescript
function validateSiren(siren: string): boolean {
  return /^[0-9]{9}$/.test(siren);
}
```

### 9.3 Code NAF
```typescript
function validateNafCode(naf: string): boolean {
  return /^[0-9]{2}\.[0-9]{2}[A-Z]$/.test(naf);
}
```

### 9.4 Rayon
```typescript
function validateRadius(km: number): boolean {
  return km >= 1 && km <= 100;
}
```

## 10. Sécurité

### 10.1 Protection contre les injections
- **Validation stricte**: Tous les paramètres validés
- **Sanitization**: Échappement des caractères spéciaux
- **Limites**: Taille des requêtes, profondeur des JSON

### 10.2 Logging sécurisé
- **Masquer**: Données sensibles dans les logs
- **Audit trail**: Actions utilisateurs sans données personnelles
- **Rotation**: Logs automatiquement purgés après 30 jours

### 10.3 Rotation des clés API
- **Fréquence**: Tous les 90 jours
- **Procédure**: Génération nouvelle clé, migration progressive
- **Révocation**: Anciennes clés désactivées après 7 jours

## 11. Documentation API Réelle

**Note**: La documentation exacte de l'API MCP nécessite une consultation directe. Les informations ci-dessus sont basées sur:
- Les standards des APIs data.gouv.fr
- La documentation SIRENE/RNE existante
- Les patterns d'APIs gouvernementales françaises
- L'analyse du code existant du projet

**Prochaines étapes**:
1. Obtenir un accès API sur data.gouv.fr
2. Tester les endpoints réels
3. Ajuster les schémas selon la réponse réelle
4. Documenter les limites exactes de taux