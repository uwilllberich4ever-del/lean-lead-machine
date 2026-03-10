# Catalogue d'Exigences - Lean Lead Machine
## Méthode Volere - Version 1.0

**Date:** 10 mars 2026  
**Auteur:** Business Analyst (The Strategist)  
**Projet:** Lean Lead Machine - Plateforme B2B SaaS de prospection  
**Statut:** Draft initial

---

## 1. Contexte du Projet

### 1.1 Vision
Une plateforme SaaS B2B de prospection commerciale qui transforme la recherche de leads en un processus rapide, efficace et conforme RGPD, en exploitant exclusivement les données publiques officielles françaises.

### 1.2 Principes Architecturaux
- **Stateless:** Pas de stockage de données personnelles
- **Source unique:** Serveur MCP https://mcp.data.gouv.fr/mcp pour SIRENE/RNE
- **Bridge permanent:** Table de correspondance SIREN ↔ Google PlaceID ↔ Website URL
- **Cache temporaire:** 24h maximum (conformité RGPD)
- **Stack technique:** Next.js, Tailwind, Supabase, Stripe

### 1.3 Public Cible
- **Utilisateurs primaires:** Commerciaux B2B, SDR (Sales Development Representatives)
- **Segment:** PME/ETI françaises avec besoin de prospection ciblée
- **Profil:** Non-technique, besoin de rapidité et simplicité

---

## 2. Exigences Métier (BIZ) - Sprint 1

### BIZ-001: Réduction du temps de recherche
**Description:** Réduire le temps de recherche d'informations sur une entreprise de 15-30 minutes à moins de 2 minutes.
**Justification:** Un commercial passe en moyenne 30% de son temps en recherche administrative.
**Priorité:** Critique
**Gain attendu:** +25% de temps disponible pour la vente

### BIZ-002: Conformité RGPD automatique
**Description:** Garantir la conformité RGPD sans action manuelle de l'utilisateur.
**Justification:** Risque juridique et réputationnel pour les entreprises clientes.
**Priorité:** Haute
**Gain attendu:** Élimination des risques de non-conformité

### BIZ-003: Source unique fiable
**Description:** Utiliser exclusivement des données officielles (SIRENE/RNE) pour garantir la fiabilité.
**Justification:** Les données commerciales privées sont souvent obsolètes ou incomplètes.
**Priorité:** Haute
**Gain attendu:** Taux de précision >95% vs ~70% des solutions alternatives

### BIZ-004: Modèle économique SaaS simple
**Description:** Facturation mensuelle par utilisateur avec essai gratuit.
**Justification:** Adoption rapide par les PME, faible friction d'entrée.
**Priorité:** Moyenne
**Gain attendu:** Taux de conversion >5% depuis l'essai gratuit

---

## 3. Exigences Utilisateur (USR) - Sprint 1

### USR-001: Recherche par nom d'entreprise
**Description:** En tant que commercial, je veux rechercher une entreprise par son nom pour obtenir ses informations officielles rapidement.
**Workflow:**
1. Saisir le nom de l'entreprise
2. Voir la liste des résultats correspondants
3. Sélectionner l'entreprise correcte
4. Obtenir la fiche complète en <2 secondes
**Critères d'acceptation:**
- Temps de réponse <2s pour 90% des requêtes
- Interface responsive (mobile/desktop)
- Suggestions en temps réel après 3 caractères

### USR-002: Recherche par SIREN
**Description:** En tant que commercial, je veux rechercher une entreprise par son SIREN pour une identification exacte.
**Workflow:**
1. Saisir le SIREN (9 chiffres)
2. Valider la saisie
3. Obtenir la fiche unique correspondante
**Critères d'acceptation:**
- Validation format SIREN en temps réel
- Message d'erreur clair si SIREN invalide
- Fiche affichée en <1s

### USR-003: Fiche entreprise complète
**Description:** En tant que commercial, je veux voir toutes les informations essentielles d'une entreprise sur une seule page.
**Informations requises:**
- Raison sociale et forme juridique
- Adresse postale complète
- Code NAF/APE et libellé
- Date de création
- Effectif (tranche)
- Statut (actif/cessé)
- Capital social (si disponible)
**Critères d'acceptation:**
- Layout optimisé pour scanning rapide
- Groupement logique des informations
- Icônes visuelles pour statuts

### USR-004: Export rapide
**Description:** En tant que commercial, je veux exporter les informations d'une entreprise pour les intégrer à mon CRM.
**Formats:**
- Copier dans le presse-papier (format structuré)
- Télécharger en CSV
- Télécharger en PDF (fiche formatée)
**Critères d'acceptation:**
- Export en <3 secondes
- Format compatible avec HubSpot, Salesforce, Pipedrive
- Options de personnalisation des champs exportés

### USR-005: Historique de recherche
**Description:** En tant que commercial, je veux voir mon historique de recherches récentes pour retrouver rapidement une entreprise.
**Workflow:**
1. Accéder à l'historique depuis le dashboard
2. Voir les 20 dernières recherches
3. Recharger une fiche en un clic
**Critères d'acceptation:**
- Conservation 30 jours maximum (RGPD)
- Tri chronologique inversé
- Recherche dans l'historique

---

## 4. Exigences Fonctionnelles (FNC) - Sprint 1

### FNC-001: Interface de recherche
**Spécifications:**
- Champ de recherche principal avec autocomplétion
- Bouton de recherche et raccourci Entrée
- Indicateur de chargement en temps réel
- Message "Aucun résultat" avec suggestions
**Stack:** Next.js 14, Tailwind CSS, React Hook Form

### FNC-002: Intégration MCP SIRENE/RNE
**Spécifications:**
- Client MCP pour le serveur https://mcp.data.gouv.fr/mcp
- Gestion des erreurs réseau et timeouts
- Cache Redis avec TTL 24h
- Logging des appels pour monitoring
**Stack:** Node.js MCP client, Redis, Winston logging

### FNC-003: Table Bridge permanente
**Spécifications:**
- Table Supabase: `company_bridge`
- Colonnes: `siren` (PK), `google_place_id`, `website_url`, `updated_at`
- Index sur toutes les colonnes de recherche
- Job de maintenance quotidien pour nettoyage
**Stack:** Supabase PostgreSQL, pg_cron

### FNC-004: Système d'authentification
**Spécifications:**
- Inscription avec email/mot de passe
- Connexion persistante (JWT 7 jours)
- Mot de passe oublié
- Dashboard utilisateur basique
**Stack:** Supabase Auth, NextAuth.js

### FNC-005: Page de résultats
**Spécifications:**
- Liste paginée (10 résultats/page)
- Carte par résultat avec info essentielle
- Filtres: département, code NAF, effectif
- Tri: pertinence, nom alphabétique
**Stack:** Next.js Server Components, Suspense

### FNC-006: Page détail entreprise
**Spécifications:**
- Layout en 3 colonnes (info, carte, actions)
- Carte Google Maps intégrée (via PlaceID)
- Boutons d'action: export, favoris, partage
- Section "Entreprises similaires"
**Stack:** Google Maps API, React Leaflet

### FNC-007: Système d'export
**Spécifications:**
- API endpoint `/api/export/:format`
- Génération CSV en mémoire
- Génération PDF avec Puppeteer
- Compression ZIP pour multiples exports
**Stack:** Papa Parse, Puppeteer, JSZip

### FNC-008: Dashboard utilisateur
**Spécifications:**
- Statistiques: recherches/jour, entreprises consultées
- Historique des 20 dernières recherches
- Gestion du profil (email, notification)
- Lien vers support/FAQ
**Stack:** Chart.js, TanStack Table

### FNC-009: Système de paiement
**Spécifications:**
- Intégration Stripe Checkout
- Plan: 29€/mois/utilisateur
- Essai gratuit 14 jours
- Page de facturation et historique
**Stack:** Stripe, Stripe Checkout

### FNC-010: Administration basique
**Spécifications:**
- Vue des utilisateurs actifs
- Statistiques d'utilisation globales
- Logs d'erreurs MCP
- Gestion du cache (purge manuelle)
**Stack:** Supabase Admin, Retool embarqué

---

## 5. Exigences Non-Fonctionnelles (NFR) - Sprint 1

### NFR-001: Performance
- Temps de réponse API <200ms P95
- TTFB (Time to First Byte) <100ms
- Score Lighthouse >90
- Support 1000 utilisateurs concurrents

### NFR-002: Sécurité
- HTTPS obligatoire
- Sanitization XSS sur toutes les entrées
- Rate limiting: 100 req/min par IP
- Audit logs pour actions sensibles

### NFR-003: RGPD
- Pas de stockage PII (Personally Identifiable Information)
- Cache max 24h
- Droit à l'effacement automatique
- DPA (Data Processing Agreement) pré-rempli

### NFR-004: Disponibilité
- SLA 99.5% uptime
- Monitoring uptime 24/7
- Backup automatique base Bridge
- Plan de reprise sous 4h

---

## 6. Exigences Métier (BIZ) - Sprint 2

### BIZ-101: Enrichissement prospectif
**Description:** Transformer les données administratives en insights commerciaux actionnables.
**Justification:** Un commercial a besoin de contexte pour personnaliser sa approche.
**Priorité:** Haute
**Gain attendu:** Taux de réponse +15% grâce à la personnalisation

### BIZ-102: Détection d'opportunités
**Description:** Identifier automatiquement les signaux de croissance ou difficultés.
**Justification:** Timing crucial en prospection - frapper au bon moment.
**Priorité:** Moyenne
**Gain attendu:** Qualité des leads +20%

### BIZ-103: Workflow intégré
**Description:** Fluidifier le passage de la recherche à l'action commerciale.
**Justification:** Chaque friction réduit l'adoption et l'efficacité.
**Priorité:** Haute
**Gain attendu:** Temps de traitement lead -40%

---

## 7. Exigences Utilisateur (USR) - Sprint 2

### USR-101: Enrichissement automatique
**Description:** En tant que commercial, je veux voir des informations enrichies sur l'entreprise pour mieux la comprendre.
**Enrichissements souhaités:**
- Site web et technologies utilisées (BuiltWith)
- Présence réseaux sociaux (LinkedIn, Twitter)
- Actualités récentes (Google News)
- Avis clients (Google Reviews)
**Critères d'acceptation:**
- Chargement progressif (squelette d'abord)
- Indicateur de fraîcheur des données
- Option pour rafraîchir manuellement

### USR-102: Scoring de priorité
**Description:** En tant que commercial, je veux un score de priorité pour savoir quelles entreprises contacter en premier.
**Facteurs de scoring:**
- Croissance récente (effectif, capital)
- Technologie moderne (indicateur d'innovation)
- Présence digitale forte
- Localisation (proximité géographique)
**Critères d'acceptation:**
- Score 1-100 avec explication
- Pondération personnalisable
- Historique d'évolution du score

### USR-103: Suggestions de leads similaires
**Description:** En tant que commercial, je veux voir des entreprises similaires à celle que je consulte pour élargir ma prospection.
**Similarité basée sur:**
- Même code NAF/APE
- Même taille d'effectif
- Même région/département
- Technologie similaire
**Critères d'acceptation:**
- 5-10 suggestions pertinentes
- Explication de la similarité
- Option pour exclure des critères

### USR-104: Workflow CRM intégré
**Description:** En tant que commercial, je veux ajouter directement un lead à mon CRM depuis la fiche entreprise.
**Intégrations prioritaires:**
- HubSpot (50% du marché FR)
- Salesforce (20% du marché FR)
- Pipedrive (15% du marché FR)
- Export générique (webhook)
**Critères d'acceptation:**
- Mapping automatique des champs
- Confirmation visuelle de l'envoi
- Log des synchronisations

### USR-105: Alertes de changement
**Description:** En tant que commercial, je veux être alerté quand une entreprise que je suis change d'information importante.
**Changements à monitorer:**
- Changement d'adresse
- Changement de dirigeant
- Modification du capital
- Changement de statut
**Critères d'acceptation:**
- Notification email quotidienne
- Dashboard des changements
- Option de désabonnement par entreprise

---

## 8. Exigences Fonctionnelles (FNC) - Sprint 2

### FNC-101: Système d'enrichissement
**Spécifications:**
- Workers asynchrones pour chaque source
- Cache séparé par source (TTL variable)
- Priorisation intelligente (sources gratuites d'abord)
- Fallback graceful si source indisponible
**Stack:** BullMQ, Redis, Axios avec retry

### FNC-102: API d'enrichissement externe
**Intégrations:**
- Google Places API (reviews, photos)
- LinkedIn Company API (via RapidAPI)
- BuiltWith API (technologies)
- Google News API (actualités)
**Stack:** API routes Next.js, circuit breaker

### FNC-103: Moteur de scoring
**Spécifications:**
- Plugin architecture pour les facteurs de score
- Poids configurables par l'utilisateur
- Calcul en temps réel ou batch
- Explication détaillée du score
**Stack:** Node.js, math.js, explainable AI patterns

### FNC-104: Système de recommandation
**Spécifications:**
- Similarité cosinus sur vecteurs d'entreprise
- Filtrage collaboratif basique
- Exclusion des doublons et déjà contactés
- A/B testing des algorithmes
**Stack:** PostgreSQL vector extension, pgvector

### FNC-105: Connecteurs CRM
**Spécifications:**
- OAuth2 pour chaque CRM
- Mapping de champs configurable
- Synchronisation bidirectionnelle optionnelle
- Log détaillé des erreurs
**Stack:** Next.js API routes, OAuth libs

### FNC-106: Système d'alertes
**Spécifications:**
- Job quotidien de détection de changements
- Queue de notifications avec priorité
- Templates d'email personnalisables
- Centre de notifications in-app
**Stack:** PostgreSQL triggers, Resend (email)

### FNC-107: Tableau de bord avancé
**Spécifications:**
- KPIs commerciaux (taux de conversion, pipeline)
- Visualisation géographique des leads
- Tendances par secteur/region
- Export des rapports
**Stack:** Recharts, Mapbox, TanStack Table

### FNC-108: Recherche avancée
**Spécifications:**
- Filtres combinables (ET/OU)
- Recherche sémantique sur description
- Sauvegarde des recherches
- Partage de recherches entre équipes
**Stack:** PostgreSQL full-text search, query builder

### FNC-109: Gestion des listes
**Spécifications:**
- Création de listes personnelles
- Partage de listes en lecture seule
- Import CSV vers liste
- Export de liste vers CRM
**Stack:** Supabase RLS (Row Level Security)

### FNC-110: API publique (version 1)
**Spécifications:**
- REST API avec clé API
- Rate limiting par plan
- Documentation OpenAPI 3.0
- Playground interactif
**Stack:** Next.js API routes, Swagger UI

---

## 9. Métriques de Succès

### Sprint 1 (MVP)
1. **Temps moyen de recherche:** <2 minutes (vs 15-30 minutes actuel)
2. **Précision des données:** >95% (vs ~70% alternatives)
3. **Taux de conversion essai→payant:** >5%
4. **Score NPS (Net Promoter Score):** >30
5. **Temps d'onboarding:** <3 minutes

### Sprint 2 (Enrichissement)
1. **Taux d'utilisation enrichissements:** >60% des utilisateurs actifs
2. **Qualité leads (score moyen):** >65/100
3. **Taux d'intégration CRM:** >40% des utilisateurs payants

---

## 10. Matrice de Traçabilité (BIZ → USR → FNC)

### Sprint 1

| Exigence BIZ | Exigences USR liées | Exigences FNC liées | NFR associées |
|---|---|---|---|
| **BIZ-001** Réduction temps recherche | USR-001, USR-002, USR-003 | FNC-001, FNC-002, FNC-005, FNC-006 | NFR-001 |
| **BIZ-002** Conformité RGPD | USR-005 (historique limité) | FNC-003 (cache 24h), FNC-002 | NFR-003 |
| **BIZ-003** Source unique fiable | USR-001, USR-002, USR-003 | FNC-002 (MCP SIRENE), FNC-003 (Bridge) | NFR-004 |
| **BIZ-004** Modèle SaaS | USR-004 (export = valeur payante) | FNC-004, FNC-007, FNC-009 | NFR-001, NFR-002 |

### Sprint 2

| Exigence BIZ | Exigences USR liées | Exigences FNC liées |
|---|---|---|
| **BIZ-101** Enrichissement | USR-101, USR-102 | FNC-101, FNC-102, FNC-103 |
| **BIZ-102** Détection opportunités | USR-102, USR-103, USR-105 | FNC-103, FNC-104, FNC-106 |
| **BIZ-103** Workflow intégré | USR-104, USR-105 | FNC-105, FNC-106, FNC-107, FNC-109 |

---

## 11. Analyse de Risques

### Risques Critiques

| ID | Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|---|
| R-01 | **Indisponibilité MCP data.gouv.fr** — source unique down | Moyenne | Critique | Cache 24h + page dégradée "données en cache" + monitoring uptimerobot |
| R-02 | **Rate limiting MCP** — quotas dépassés en charge | Haute | Haute | Cache agressif + queue de requêtes + backoff exponentiel |
| R-03 | **Changement API MCP** — rupture de contrat d'interface | Faible | Critique | Couche d'abstraction MCP + tests d'intégration quotidiens + alertes |
| R-04 | **Non-conformité RGPD inattendue** — cache mal purgé | Faible | Critique | Tests automatisés TTL + audit log purge + DPO review trimestriel |

### Risques Modérés

| ID | Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|---|
| R-05 | **Qualité données Bridge** — PlaceID/URL obsolètes | Moyenne | Moyenne | Job de vérification hebdomadaire + signalement utilisateur |
| R-06 | **Adoption lente** — fonctionnalités insuffisantes au MVP | Moyenne | Haute | Sprint 1 minimal mais complet + feedback loop rapide |
| R-07 | **Coûts API Sprint 2** — Google Places, BuiltWith chers | Haute | Moyenne | Sources gratuites prioritaires + quotas par plan utilisateur |
| R-08 | **Performance dégradée enrichissement** — trop de sources | Moyenne | Moyenne | Chargement progressif + workers async + circuit breaker |

---

## 12. Contraintes Techniques Spécifiques

### 12.1 Serveur MCP data.gouv.fr
- **Protocole:** JSON-RPC via Server-Sent Events (SSE)
- **Données disponibles:** SIRENE (établissements, unités légales) + RNE (dirigeants, bénéficiaires effectifs)
- **Limites connues:** Pas de SLA officiel, données mises à jour quotidiennement
- **Stratégie:** Toujours requêter via le client MCP SDK, jamais en direct

### 12.2 Table Bridge
- **Objectif:** Lien permanent entre l'identifiant officiel (SIREN) et les identifiants commerciaux (Google PlaceID, URL)
- **Alimentation:** Enrichissement progressif au fil des recherches utilisateur
- **Maintenance:** Job CRON vérifiant la validité des PlaceID et URLs (HTTP HEAD)
- **Volumétrie cible:** ~500K lignes à 12 mois

### 12.3 Cache RGPD
- **Implémentation:** Redis avec TTL strict 24h
- **Clé:** `cache:sirene:{siren}` et `cache:rne:{siren}`
- **Purge:** Automatique via TTL + job de sécurité quotidien
- **Monitoring:** Alerte si clé >24h détectée

---

## 13. Estimation de Gain de Temps — Résumé Exécutif

### Le problème aujourd'hui (workflow d'un Sales sans l'outil)

| Étape | Temps moyen | Outils utilisés |
|---|---|---|
| Rechercher le SIREN sur societe.com | 3 min | Navigateur |
| Copier les infos de base | 2 min | Copier-coller |
| Vérifier l'adresse sur Google Maps | 2 min | Google Maps |
| Chercher le site web | 3 min | Google Search |
| Chercher les avis clients | 3 min | Google Reviews |
| Saisir dans le CRM | 5 min | HubSpot/Salesforce |
| **Total par lead** | **18 min** | **5 outils différents** |

### Avec Lean Lead Machine — Sprint 1

| Étape | Temps moyen | Gain |
|---|---|---|
| Recherche + fiche complète | 30 sec | -4.5 min |
| Infos de base + adresse + carte | 0 sec (affiché) | -4 min |
| Site web (via Bridge) | 0 sec (affiché) | -3 min |
| Export CRM (copier/CSV) | 15 sec | -4.75 min |
| **Total par lead** | **45 sec** | **-17 min 15 sec** |

### Avec Lean Lead Machine — Sprint 2

| Étape | Temps moyen | Gain additionnel |
|---|---|---|
| Avis + actualités + techno | 0 sec (enrichi auto) | -3 min |
| Priorisation (scoring) | 0 sec (calculé auto) | -5 min (décision) |
| Push CRM direct | 5 sec (1 clic) | -4 min 55 sec |
| Leads similaires | 0 sec (suggéré auto) | -10 min (recherche manuelle) |
| **Total par lead** | **5 sec** | **-23 min supplémentaires** |

### Impact business annuel (1 commercial)

| Métrique | Sans outil | Sprint 1 | Sprint 2 |
|---|---|---|---|
| Temps par lead | 18 min | 45 sec | 5 sec |
| Leads traités/jour | 25 | 100+ | 200+ |
| Leads traités/mois | 500 | 2000+ | 4000+ |
| Heures économisées/mois | — | 57h | 72h |
| **Équivalent salaire économisé/an** | — | **~17 000€** | **~22 000€** |

> **ROI Sprint 1 :** Un abonnement à 29€/mois rembourse 17 000€/an de temps commercial. **ROI x49.**

---

## 14. Priorités et Dépendances — Roadmap

```
Sprint 1 (Semaines 1-4) — "Search & Display"
├── FNC-004 Auth (S1) ─────────────────────────┐
├── FNC-002 MCP Client (S1-S2) ────────────────┤
├── FNC-003 Table Bridge (S1) ─────────────────┤
├── FNC-001 Interface recherche (S2-S3) ───────┤── FNC-005 Résultats (S3)
├── FNC-006 Fiche détail (S3-S4) ──────────────┘       │
├── FNC-007 Export (S4) ────────────────────────────────┘
├── FNC-008 Dashboard (S3-S4)
├── FNC-009 Stripe (S4)
└── FNC-010 Admin (S4)

Sprint 2 (Semaines 5-8) — "Enrich & Act"
├── FNC-101 Workers enrichissement (S5-S6) ────┐
├── FNC-102 API externes (S5-S6) ──────────────┤
├── FNC-103 Scoring (S6-S7) ───────────────────┤
├── FNC-104 Recommandation (S7) ───────────────┘
├── FNC-105 Connecteurs CRM (S6-S7) ──────────┐
├── FNC-106 Alertes (S7-S8) ──────────────────┤
├── FNC-107 Dashboard avancé (S7-S8) ─────────┘
├── FNC-108 Recherche avancée (S5-S6)
├── FNC-109 Gestion listes (S6-S7)
└── FNC-110 API publique (S8)
```

---

## 15. Glossaire

| Terme | Définition |
|---|---|
| **SIREN** | Système d'Identification du Répertoire des Entreprises (9 chiffres, identifiant unique INSEE) |
| **SIRET** | SIREN + NIC (14 chiffres, identifie un établissement) |
| **NAF/APE** | Nomenclature d'Activités Française / Activité Principale Exercée (code secteur) |
| **RNE** | Registre National des Entreprises (successeur du RCS/RM depuis 2023) |
| **MCP** | Model Context Protocol — protocole de communication avec les serveurs de données |
| **Bridge** | Table de correspondance permanente SIREN ↔ Google PlaceID ↔ Website URL |
| **PlaceID** | Identifiant unique Google Maps pour un lieu physique |
| **TTL** | Time To Live — durée de validité d'une entrée en cache |
| **SDR** | Sales Development Representative — commercial en charge de la prospection |
| **PII** | Personally Identifiable Information — données personnelles au sens RGPD |
| **DPA** | Data Processing Agreement — contrat de sous-traitance données personnelles |

---

*Document généré le 10 mars 2026 — v1.0*  
*Prochaine revue : validation Product Owner avant démarrage Sprint 1*