# 📋 SPRINT 2 — Spécifications Fonctionnelles MCP Data.gouv.fr

> **Référence :** ROADMAP_OFFICIELLE.md - Sprint 2  
> **Date :** 2026-03-16  
> **Rédigé par :** Business Analyst Agent  
> **Statut :** ✅ Validé par Adrien

---

## 🎯 Objectif Business
Remplacer les données fictives du dashboard par de vraies données INSEE via l'API MCP data.gouv.fr afin de :
1. Livrer une valeur réelle aux utilisateurs dès le premier usage
2. Valider le product-market fit avec des données authentiques
3. Préparer le terrain pour la monétisation Freemium (Sprint 4)

**Impact business attendu :** Conversion visiteurs → utilisateurs freemium augmentée de 30% grâce à la crédibilité des données réelles.

---

## 📊 Critères d'Acceptation Détaillés

### ✅ CA-2.1 — Intégration API MCP en Production
- [ ] L'API MCP data.gouv.fr répond correctement dans l'environnement Vercel Production
- [ ] La clé API est configurée en variables d'environnement (`NEXT_PUBLIC_MCP_API_KEY` ou équivalent)
- [ ] Les appels API respectent les rate limits (max 10 req/s, 1000 req/jour)
- [ ] Monitoring des appels API avec logs structurés (timestamp, endpoint, statut, durée)

### ✅ CA-2.2 — Remplacement Complet des Données Mockées
- [ ] **Aucune** donnée mockée (`mock`, `fake`, `sample`) en production
- [ ] Les composants `CompanyCard` et `CompanyDetail` utilisent exclusivement les données MCP
- [ ] Les filtres secteur + localisation fonctionnent avec les vraies données
- [ ] Le dashboard affiche ≥ 10 entreprises réelles par requête par défaut

### ✅ CA-2.3 — Performance et Expérience Utilisateur
- [ ] Temps de réponse API < 3 secondes (P95)
- [ ] Loader/skeleton visible pendant les appels API (>500ms)
- [ ] Cache côté client (localStorage) pour les résultats récents (TTL: 1h)
- [ ] Pagination infinie ou "Voir plus" pour les résultats > 50 entreprises

### ✅ CA-2.4 — Gestion des Erreurs Robuste
- [ ] Timeout API (30s) avec message utilisateur clair : "L'API met trop de temps à répondre, veuillez réessayer"
- [ ] Rate limit atteint : message "Limite d'appels atteinte, réessayez dans 1 minute"
- [ ] Erreur 404/500 : message "Service temporairement indisponible" avec bouton réessayer
- [ ] Données manquantes : afficher "Non disponible" au lieu de valeurs nulles/vides

### ✅ CA-2.5 — Format des Données et Affichage
- [ ] Format JSON standardisé (voir section "Golden Record" ci-dessous)
- [ ] Champs prioritaires affichés en vue liste (SIREN, dénomination, NAF, ville, effectif)
- [ ] Fiche détail complète avec tous les champs disponibles
- [ ] Données formatées pour l'utilisateur (NAF libellé, effectif en tranches, dates en FR)

### ✅ CA-2.6 — Tests et Qualité
- [ ] Tests unitaires pour les parsers de données MCP → format interne
- [ ] Tests d'intégration avec mock API pour les scénarios d'erreur
- [ ] Tests de non-régression sur l'UI existante (screenshots comparatifs)
- [ ] Audit accessibilité (contraste, labels ARIA) sur les nouveaux composants

---

## 🏆 Format JSON "Golden Record" Attendue

### Structure de Base
```json
{
  "metadata": {
    "source": "api_mcp_data_gouv_fr",
    "timestamp": "2026-03-16T10:30:00Z",
    "request_id": "req_abc123",
    "page": 1,
    "total_results": 150,
    "results_per_page": 10
  },
  "companies": [
    {
      "id": "siren_123456789",
      "siren": "123456789",
      "siret_siege": "12345678900001",
      "denomination": "ENTREPRISE EXEMPLE SARL",
      "enseigne": "ENTREPRISE EXEMPLE",
      "naf": {
        "code": "6201Z",
        "libelle": "Programmation informatique"
      },
      "effectif": {
        "tranche": "10-19",
        "min": 10,
        "max": 19,
        "libelle": "10 à 19 salariés"
      },
      "adresse": {
        "complement": "Bâtiment A",
        "numero_voie": "15",
        "type_voie": "RUE",
        "libelle_voie": "DE L'EXEMPLE",
        "code_postal": "75001",
        "ville": "PARIS",
        "region": "ILE-DE-FRANCE",
        "departement": "75"
      },
      "juridique": {
        "forme": "SARL",
        "capital": 10000,
        "date_creation": "2015-06-15",
        "date_radiation": null,
        "statut": "Active"
      },
      "contact": {
        "telephone": "+33123456789",
        "email": "contact@entreprise-exemple.fr",
        "website": "https://www.entreprise-exemple.fr"
      },
      "score_qualite": 0.85,
      "derniere_maj": "2026-01-15"
    }
  ]
}
```

### Champs Obligatoires (Doivent toujours être présents)
| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| `siren` | string(9) | Numéro SIREN (9 chiffres) | "123456789" |
| `denomination` | string | Nom officiel de l'entreprise | "ENTREPRISE EXEMPLE SARL" |
| `naf.code` | string(5) | Code NAF/APE (5 caractères) | "6201Z" |
| `naf.libelle` | string | Libellé du secteur | "Programmation informatique" |
| `adresse.ville` | string | Ville du siège social | "PARIS" |
| `effectif.tranche` | string | Tranche d'effectif INSEE | "10-19" |
| `effectif.libelle` | string | Libellé de la tranche | "10 à 19 salariés" |
| `juridique.statut` | string | Statut juridique | "Active", "Radiée" |

### Champs Optionnels (Présents si disponibles)
| Champ | Type | Priorité | Notes |
|-------|------|----------|-------|
| `siret_siege` | string(14) | Haute | SIRET du siège social |
| `enseigne` | string | Moyenne | Enseigne commerciale |
| `adresse.code_postal` | string(5) | Haute | Code postal |
| `adresse.libelle_voie` | string | Moyenne | Nom de la rue |
| `juridique.forme` | string | Haute | Forme juridique (SARL, SAS, etc.) |
| `juridique.capital` | number | Moyenne | Capital social en euros |
| `juridique.date_creation` | date | Haute | Date de création |
| `contact.telephone` | string | Basse | Téléphone |
| `contact.email` | string | Basse | Email |
| `contact.website` | string | Basse | Site web |
| `score_qualite` | float | Moyenne | Score de complétude des données (0-1) |

---

## 🚨 Comportement en Cas d'Erreur API

### Scénario 1 : Timeout (30s)
**Comportement attendu :**
1. Afficher un loader pendant 5 secondes
2. Si >5s sans réponse : message "Recherche en cours, veuillez patienter..."
3. Si timeout (30s) : afficher une card d'erreur avec :
   - Icône ⏱️
   - Titre : "L'API met trop de temps à répondre"
   - Message : "Le service des données entreprises est lent actuellement. Veuillez réessayer dans quelques instants."
   - Bouton : "Réessayer la recherche"

**Logs techniques :**
```json
{
  "level": "WARN",
  "event": "mcp_api_timeout",
  "endpoint": "/search",
  "duration_ms": 30001,
  "timestamp": "2026-03-16T10:30:00Z"
}
```

### Scénario 2 : Rate Limit (429 Too Many Requests)
**Comportement attendu :**
1. Afficher une notification toast en haut de l'écran :
   - "Limite d'appels API atteinte"
   - "Vous pourrez effectuer de nouvelles recherches dans 60 secondes"
   - Compte à rebours visible : "59... 58..."
2. Désactiver les boutons de recherche pendant la période de blocage
3. Proposer une action alternative : "Parcourir les résultats précédents"

**Logs techniques :**
```json
{
  "level": "WARN",
  "event": "mcp_rate_limit",
  "retry_after": 60,
  "user_id": "user_abc123",
  "timestamp": "2026-03-16T10:30:00Z"
}
```

### Scénario 3 : Erreur 5xx (Service Indisponible)
**Comportement attendu :**
1. Afficher un état de dégradation élégant :
   - Header : "Service temporairement indisponible"
   - Message : "Les données entreprises ne sont pas accessibles pour le moment. Notre équipe technique a été alertée."
   - Illustration/icône : 🔧
2. Proposer des données de secours (dernières recherches en cache) si disponibles
3. Bouton "Signaler ce problème" qui ouvre un email pré-rempli

**Logs techniques :**
```json
{
  "level": "ERROR",
  "event": "mcp_5xx_error",
  "status_code": 503,
  "response_body": "...",
  "timestamp": "2026-03-16T10:30:00Z"
}
```

### Scénario 4 : Données Incomplètes/Mal Formées
**Comportement attendu :**
1. Valider le schéma JSON à la réception
2. Si validation échoue : utiliser les données valides et logger l'erreur
3. Afficher "Données partielles" avec badge d'avertissement 🟡
4. Remplacer les champs manquants par "Non disponible" ou masquer la section

**Logs techniques :**
```json
{
  "level": "WARN",
  "event": "mcp_data_validation_failed",
  "missing_fields": ["effectif", "capital"],
  "company_count": 8,
  "timestamp": "2026-03-16T10:30:00Z"
}
```

---

## 🏢 Champs INSEE Prioritaires à Afficher

### 📱 Vue Liste (CompanyCard) — Priorité Maximale
**Affichage compact, 5 champs essentiels :**

| Champ | Format | Exemple | Justification Business |
|-------|--------|---------|------------------------|
| **SIREN** | `123 456 789` | `123 456 789` | Identifiant unique, crédibilité |
| **Dénomination** | Trunc(30) + "..." | `ENTREPRISE EXEMPLE...` | Reconnaissance immédiate |
| **Secteur (NAF)** | Libellé court | `Programmation info` | Qualification rapide |
| **Ville** | Ville seule | `PARIS` | Localisation géographique |
| **Effectif** | Tranche + icône | `10-19 👥` | Taille pour ciblage |

**Design recommandé :**
```
┌─────────────────────────────────────┐
│ 123 456 789                         │
│ ENTREPRISE EXEMPLE SARL             │
│ Programmation informatique • PARIS  │
│ 10-19 salariés 👥                   │
└─────────────────────────────────────┘
```

### 💻 Fiche Détaillée (CompanyDetail) — Tous les Champs
**Organisation par sections :**

#### Section 1 : Identité (Toujours visible)
- SIREN / SIRET siège
- Dénomination sociale
- Enseigne commerciale (si différente)
- Forme juridique + capital
- Date création + statut

#### Section 2 : Activité & Taille
- Code NAF + libellé complet
- Tranche d'effectif + libellé INSEE
- Score de qualité des données (barre de progression)

#### Section 3 : Localisation
- Adresse complète formatée
- Région + département
- Carte statique (optionnel - Google Maps Static)

#### Section 4 : Contact (Si disponible)
- Téléphone formaté
- Email
- Site web (lien cliquable)

#### Section 5 : Métadonnées
- Dernière mise à jour INSEE
- Source des données
- Score de fraîcheur (jours depuis maj)

---

## 🔧 Recommandations Techniques d'Implémentation

### 1. Service Layer Pattern
```typescript
// services/mcpService.ts
interface MCPCompany {
  siren: string;
  denomination: string;
  // ... autres champs
}

class MCPService {
  async searchCompanies(filters: SearchFilters): Promise<MCPResponse> {
    // Gestion centralisée des erreurs, retry, cache
  }
  
  async getCompanyDetails(siren: string): Promise<MCPCompany> {
    // Récupération détaillée + enrichissement
  }
}
```

### 2. Cache Stratégique
- **Niveau 1 :** localStorage (TTL: 1h) pour les recherches récentes
- **Niveau 2 :** Supabase table `mcp_cache` (TTL: 24h) pour les données fréquentes
- **Niveau 3 :** CDN Vercel Edge (si volumétrie importante)

### 3. Monitoring & Alerting
- **Metriques à tracker :**
  - `mcp_api_latency_p95` < 3000ms
  - `mcp_api_success_rate` > 95%
  - `mcp_cache_hit_ratio` > 60%
- **Alertes :**
  - Slack #alerts si success_rate < 90% pendant 5min
  - Email à Adrien si rate_limit atteint 3x/jour

### 4. Fallback & Graceful Degradation
- Mode "données limitées" si API down > 5min
- Utilisation des dernières données en cache
- Message transparent aux utilisateurs : "Mode dégradé - données du [date]"

---

## 📈 Métriques de Succès Business (Sprint 2)

| Métrique | Cible | Mesure |
|----------|-------|--------|
| **Taux de rebond** | < 40% | Google Analytics |
| **Temps passé sur page** | > 2min | GA / Vercel Analytics |
| **Recherches par session** | ≥ 3 | Logs backend |
| **Conversion vers compte** | > 15% | Supabase Auth logs |
| **Satisfaction utilisateur** | ≥ 4/5 | Survey post-usage |

---

## 🚦 Points de Validation avec Adrien

### À valider avant développement :
- [ ] **PV-2.1** : La clé API MCP est-elle déjà dans les env vars Vercel ?
- [ ] **PV-2.2** : Budget pour cache Redis/Supabase si nécessaire ?
- [ ] **PV-2.3** : Priorité des champs affichés validée (SIREN + dénomination + NAF + ville + effectif) ?

### À valider pendant développement :
- [ ] **PV-2.4** : Design des cards en vue liste (maquette Figma)
- [ ] **PV-2.5** : Comportement erreurs (messages utilisateur)
- [ ] **PV-2.6** : Performance réelle en production (premiers tests)

### À valider avant mise en production :
- [ ] **PV-2.7** : Tests de charge (100 utilisateurs simultanés)
- [ ] **PV-2.8** : Backup/restore des données cache
- [ ] **PV-2.9** : Documentation technique pour le mainteneur

---

*Document de spécifications fonctionnelles — Business Analyst Agent*  
*Pour toute modification, mettre à jour cette spécification et notifier l'équipe technique.*