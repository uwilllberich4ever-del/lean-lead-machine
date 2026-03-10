# Spécifications Volere - Lean Lead Machine MVP V1

## 1. Introduction

### 1.1 Objectif du Projet
Développer une plateforme B2B SaaS de prospection commerciale utilisant exclusivement les données officielles françaises (SIRENE/RNE) via le serveur MCP data.gouv.fr.

### 1.2 Portée MVP V1
- Moteur de recherche légal avec filtres basiques
- Export CSV limité à 500 lignes
- Interface responsive simple
- Architecture stateless conforme RGPD

### 1.3 Contraintes
- **Légal** : Utilisation exclusive des données MCP
- **RGPD** : Pas de stockage de données personnelles
- **Performance** : Réponse API < 1s
- **Budget** : MVP avec stack open-source

## 2. Parties Prenantes

| Rôle | Responsabilités | Intérêts |
|------|----------------|----------|
| **Commercial** | Utilisateur final | Trouver des leads qualifiés rapidement |
| **Growth Marketer** | Utilisateur avancé | Cibler des segments spécifiques |
| **Data Engineer** | Implémentation technique | Performance et fiabilité des données |
| **Architecte** | Design technique | Scalabilité et maintenabilité |
| **Product Owner** | Définition produit | ROI et satisfaction utilisateur |
| **Juriste** | Conformité | RGPD et légalité des données |

## 3. User Stories Prioritaires

### USR-001 : Ciblage Local
**En tant que** commercial  
**Je veux** filtrer les entreprises par Code Postal et Rayon (km)  
**Afin de** organiser ma tournée physique efficacement

**Critères d'acceptation:**
- [ ] Saisie code postal (5 chiffres, validation)
- [ ] Sélection rayon 1-100 km
- [ ] Affichage entreprises dans le rayon
- [ ] Calcul distance approximative
- [ ] Limite 500 résultats maximum

### USR-002 : Ciblage Sectoriel
**En tant que** Growth Marketer  
**Je veux** filtrer par Code NAF (Activité) et Tranche d'Effectif  
**Afin de** identifier des comptes stratégiques par secteur

**Critères d'acceptation:**
- [ ] Recherche code NAF (5 caractères)
- [ ] Auto-complétion libellé NAF
- [ ] Sélection tranche d'effectif (liste prédéfinie)
- [ ] Combinaison avec filtres géographiques
- [ ] Export des résultats filtrés

### USR-003 : Export CSV
**En tant que** utilisateur  
**Je veux** exporter les résultats en CSV  
**Afin de** importer les leads dans mon CRM

**Critères d'acceptation:**
- [ ] Bouton export visible après recherche
- [ ] Limite 500 lignes respectée
- [ ] Format CSV standard (UTF-8, point-virgule)
- [ ] Colonnes Golden Record incluses
- [ ] Téléchargement direct navigateur

### USR-004 : Visualisation Fiche
**En tant que** utilisateur  
**Je veux** voir les détails d'une entreprise  
**Afin de** valider sa pertinence avant contact

**Critères d'acceptation:**
- [ ] Clic sur entreprise → fiche détaillée
- [ ] Informations SIRENE complètes
- [ ] Données dirigeant (RNE)
- [ ] Affichage responsive
- [ ] Bouton retour à la liste

## 4. Exigences Fonctionnelles

### 4.1 Recherche
| ID | Exigence | Priorité | Complexité |
|----|----------|----------|------------|
| FR-001 | Recherche par code postal exact | Haute | Basse |
| FR-002 | Filtre rayon 1-100 km | Haute | Moyenne |
| FR-003 | Recherche code NAF (5 caractères) | Haute | Basse |
| FR-004 | Auto-complétion libellé NAF | Moyenne | Moyenne |
| FR-005 | Filtre tranche d'effectif | Haute | Basse |
| FR-006 | Combinaison multiple filtres | Haute | Haute |
| FR-007 | Pagination résultats (50/page) | Moyenne | Moyenne |
| FR-008 | Tri par pertinence/distance | Basse | Moyenne |

### 4.2 Affichage
| ID | Exigence | Priorité | Complexité |
|----|----------|----------|------------|
| FR-009 | Liste résultats avec 6 colonnes | Haute | Basse |
| FR-010 | Fiche entreprise détaillée | Haute | Moyenne |
| FR-011 | Responsive design (mobile/desktop) | Haute | Haute |
| FR-012 | Indicateur chargement/recherche | Moyenne | Basse |
| FR-013 | Messages d'erreur utilisateur | Haute | Basse |
| FR-014 | Compteur résultats | Moyenne | Basse |

### 4.3 Export
| ID | Exigence | Priorité | Complexité |
|----|----------|----------|------------|
| FR-015 | Export CSV 500 lignes max | Haute | Moyenne |
| FR-016 | 12 colonnes Golden Record | Haute | Basse |
| FR-017 | Format UTF-8 avec BOM | Moyenne | Basse |
| FR-018 | Séparateur point-virgule | Moyenne | Basse |
| FR-019 | Nom fichier timestampé | Basse | Basse |
| FR-020 | Téléchargement direct | Haute | Basse |

### 4.4 Performance
| ID | Exigence | Priorité | Complexité |
|----|----------|----------|------------|
| FR-021 | Réponse API < 1s (P95) | Haute | Haute |
| FR-022 | Cache Redis 24h | Haute | Moyenne |
| FR-023 | Timeout MCP 5s | Haute | Basse |
| FR-024 | Export génération < 5s | Moyenne | Moyenne |
| FR-025 | First Contentful Paint < 2s | Moyenne | Haute |

## 5. Exigences Non-Fonctionnelles

### 5.1 Performance
- **Temps réponse API** : < 1s pour 95% des requêtes
- **Temps chargement page** : < 2s FCP
- **Concurrent users** : 100 utilisateurs simultanés
- **Data freshness** : Cache max 24h

### 5.2 Sécurité
- **RGPD** : Pas de stockage données personnelles
- **Cache** : TTL 24h maximum
- **Logs** : Anonymisation SIREN
- **API keys** : Rotation mensuelle
- **HTTPS** : TLS 1.3 obligatoire

### 5.3 Fiabilité
- **Disponibilité** : 99.5% uptime
- **Backup** : Code sur GitHub, pas de données
- **Monitoring** : Métriques temps réel
- **Alerting** : Slack/Email sur erreurs
- **Retry** : 3 tentatives sur échec MCP

### 5.4 Utilisabilité
- **UI/UX** : Interface intuitive, pas de formation
- **Mobile** : Responsive design
- **Accessibilité** : WCAG 2.1 AA
- **Langue** : Français uniquement (MVP)
- **Help** : Tooltips et messages d'erreur clairs

### 5.5 Compatibilité
- **Navigateurs** : Chrome, Firefox, Safari récents
- **Mobile** : iOS Safari, Chrome mobile
- **CSV** : Compatible Excel, Google Sheets, CRM
- **API** : REST JSON, CORS activé

## 6. Contraintes

### 6.1 Techniques
- **Stack** : Next.js 14, Tailwind, Supabase, Stripe
- **Hosting** : Vercel (frontend), Supabase (cache)
- **Database** : Pas de BDD persistante (stateless)
- **Cache** : Redis/Supabase avec TTL 24h
- **CDN** : Vercel Edge Network

### 6.2 Légales
- **Source données** : Uniquement MCP data.gouv.fr
- **Usage données** : Prospection commerciale B2B
- **RGPD** : Consentement explicite pour export
- **CGU** : Mentions légales complètes
- **Cookies** : Banner obligatoire

### 6.3 Business
- **MVP timeline** : 4 semaines
- **Team** : 1 dev fullstack, 1 data engineer
- **Budget** : $5k pour MVP
- **Monetization** : Freemium à partir de V2
- **Growth** : 100 utilisateurs mois 1

## 7. Risques et Atténuation

| Risque | Impact | Probabilité | Atténuation |
|--------|--------|-------------|-------------|
| MCP API indisponible | Haut | Moyenne | Cache 24h, message utilisateur |
| Performance insuffisante | Moyen | Haute | Cache agressif, pagination |
| Non-conformité RGPD | Très Haut | Basse | Audit juridique, design stateless |
| Usage abusif (scraping) | Moyen | Moyenne | Rate limiting, CAPTCHA sur exports |
| Données incomplètes | Bas | Haute | Messages clairs, filtres simples |
| Concurrents directs | Moyen | Moyenne | Focus légalité, UX supérieur |

## 8. Métriques de Succès

### 8.1 Technique
- **Performance API** : < 1s P95
- **Cache hit rate** : > 70%
- **Error rate** : < 1%
- **Uptime** : > 99.5%

### 8.2 Business
- **User signups** : 100 mois 1
- **Active users** : 30% weekly
- **Exports generated** : 50/semaine
- **User satisfaction** : > 4/5 NPS

### 8.3 Produit
- **Time to first lead** : < 2 minutes
- **Search success rate** : > 80%
- **Export success rate** : > 95%
- **Mobile usage** : > 40%

## 9. Glossaire

- **SIRENE** : Système d'Identification du Répertoire des Entreprises
- **RNE** : Registre National des Entreprises
- **MCP** : Marché de la Commande Publique (serveur data.gouv.fr)
- **NAF** : Nomenclature d'Activités Française
- **Golden Record** : Ensemble minimal de données affichées
- **Stateless** : Architecture sans état, pas de session
- **TTL** : Time To Live (durée de vie cache)

## 10. Références

- [API SIRENE documentation](https://api.gouv.fr/les-api/sirene_v3)
- [RGPD compliance guide](https://www.cnil.fr/)
- [MCP data.gouv.fr](https://mcp.data.gouv.fr)
- [Next.js documentation](https://nextjs.org/docs)
- [Supabase documentation](https://supabase.com/docs)

---

**Version** : 1.0  
**Date** : 10 mars 2026  
**Statut** : Approuvé pour développement  
**Approuvé par** : Product Owner, Architecte, Juriste
