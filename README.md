# Lean Lead Machine

Plateforme SaaS de prospection commerciale B2B basée sur les données officielles françaises (MCP data.gouv.fr).

## 🎯 Mission

Transformer la recherche de leads B2B de 18 minutes à 45 secondes par entreprise grâce à une interface Google-like et des données consolidées en temps réel.

## ✨ Fonctionnalités MVP

### 1. **Dashboard de Recherche Avancée**
- Filtres validés par le BA :
  - Code postal + rayon (1-100km)
  - Code NAF (activité)
  - Tranche d'effectif (0 à 1000+)
- Interface responsive avec Tailwind CSS
- Recherche en temps réel avec debouncing
- Résultats en < 1s

### 2. **Fiche "Golden Record"**
- Chargement progressif en 3 phases :
  1. **Données légales** (MCP SIRENE/RNE) - immédiat
  2. **Carte Google Maps** (PlaceID) - parallèle
  3. **Contacts LinkedIn** (scraping) - lazy loading
- Skeleton screens pour chaque phase
- Design professionnel avec indicateurs de qualité

### 3. **Système de Crédits & Paiement**
- Intégration Stripe Checkout
- Packs de crédits (100 à 10 000 crédits)
- Dashboard de consommation
- Notifications de crédits faibles
- Historique des transactions

### 4. **Export CSV**
- Génération côté client (pas de charge serveur)
- Limite à 500 lignes pour le MVP
- Colonnes configurables
- Téléchargement direct
- Encodage UTF-8 avec BOM

### 5. **Performance & UX**
- Optimisation des appels API (parallélisme, cache)
- Messages d'état pour opérations longues
- Pagination infinie / lazy loading
- Offline-first pour données déjà chargées
- Conforme RGPD (cache 24h max)

## 🛠 Stack Technique

### Frontend
- **Framework** : Next.js 15+ (App Router)
- **Styling** : Tailwind CSS
- **State Management** : React Query (TanStack)
- **Forms** : React Hook Form + Zod
- **Icons** : Lucide React
- **Dates** : date-fns

### Backend
- **API Routes** : Next.js API Routes
- **Cache** : Redis/Supabase (TTL 24h)
- **Validation** : Zod
- **Rate Limiting** : Custom middleware

### APIs Externes
- **Données entreprises** : MCP data.gouv.fr (SIRENE + RNE)
- **Cartographie** : Google Places API
- **Paiement** : Stripe
- **Scraping** : Service interne "The Hunter"

### Déploiement
- **Platform** : Vercel
- **Database** : Supabase (PostgreSQL)
- **Monitoring** : Vercel Analytics
- **CI/CD** : GitHub Actions

## 📁 Structure du Projet

```
lean-lead-machine/
├── app/
│   ├── api/
│   │   ├── mcp/companies/      # Proxy vers MCP data.gouv.fr
│   │   ├── export/csv/         # Génération CSV
│   │   └── credits/            # Gestion des crédits
│   ├── company/[siren]/        # Fiche entreprise
│   ├── credits/                # Dashboard crédits
│   ├── layout.tsx              # Layout principal
│   └── page.tsx                # Page d'accueil
├── components/
│   ├── search-dashboard.tsx    # Dashboard recherche
│   ├── golden-record.tsx       # Composant fiche entreprise
│   ├── stats-overview.tsx      # Statistiques utilisateur
│   ├── recent-searches.tsx     # Historique recherches
│   └── providers.tsx           # Providers React Query
├── public/                     # Assets statiques
└── package.json
```

## 🚀 Installation & Démarrage

### Prérequis
- Node.js 18+ 
- npm ou yarn
- Compte Vercel (déploiement)
- Compte Supabase (base de données)
- Clés API : MCP, Google Places, Stripe

### Installation locale

```bash
# Cloner le projet
git clone <repository-url>
cd lean-lead-machine

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Éditer .env.local avec vos clés API

# Démarrer le serveur de développement
npm run dev
```

### Variables d'environnement

```env
# API MCP data.gouv.fr
NEXT_PUBLIC_MCP_API_URL=https://api.data.gouv.fr
MCP_API_KEY=votre_cle_api

# Google Places
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=votre_cle_google

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service

# Redis (cache)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=votre_mot_de_passe
```

### Déploiement sur Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel

# Ou via l'interface web Vercel
# 1. Connecter votre repository GitHub
# 2. Configurer les variables d'environnement
# 3. Déployer automatiquement
```

## 🔧 Configuration Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Exécuter le script SQL `bridge_schema.sql` dans l'éditeur SQL
3. Récupérer les URL et clés API
4. Configurer les politiques Row Level Security (RLS)

## 📊 Conformité RGPD

- **Cache temporaire** : 24h maximum
- **Pas de stockage** : Données personnelles non persistées
- **Logs anonymisés** : Pas de SIREN dans les logs
- **Consentement explicite** : Pour le scraping LinkedIn
- **Export manuel** : CSV généré à la demande
- **Purge automatique** : Cron job quotidien

## 🎨 Design System

### Couleurs
- **Primary** : `#2563eb` (Blue 600)
- **Success** : `#16a34a` (Green 600)
- **Warning** : `#ea580c` (Orange 600)
- **Error** : `#dc2626` (Red 600)

### Typographie
- **Font Family** : Inter (Google Fonts)
- **Base Size** : 16px
- **Scale** : Tailwind default

### Composants
- **Boutons** : Rounded-lg, padding cohérent
- **Cartes** : Shadow-lg, rounded-xl, border
- **Formulaires** : Labels clairs, validation en temps réel
- **États** : Loading, success, error, empty

## 🔄 Workflow de Développement

1. **Feature Branch** : `git checkout -b feature/nom-feature`
2. **Développement** : Code + tests
3. **Commit** : `git commit -m "feat: description"`
4. **Push** : `git push origin feature/nom-feature`
5. **Pull Request** : Revue de code
6. **Merge** : Après approbation
7. **Déploiement** : Automatique sur Vercel

## 🧪 Tests

```bash
# Tests unitaires
npm test

# Tests E2E
npm run test:e2e

# Couverture de code
npm run test:coverage
```

## 📈 Métriques de Performance

- **Temps de réponse API** : < 1s (P95)
- **Temps de chargement page** : < 2s
- **Export CSV** : < 5s pour 500 lignes
- **Score Lighthouse** : > 90
- **Cache hit rate** : > 80%

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature
3. Commiter vos changements
4. Push vers la branche
5. Ouvrir une Pull Request

## 📄 Licence

Propriétaire - Tous droits réservés © 2026 Lean Lead Machine

## 📞 Support

- **Email** : support@leanleadmachine.com
- **Documentation** : docs.leanleadmachine.com
- **Status** : status.leanleadmachine.com

---

**Note de l'Architecte** : "L'utilisateur ne doit pas sentir la complexité derrière. Si l'enrichissement LinkedIn prend du temps, affiche un message 'Recherche du dirigeant en cours...' pour maintenir l'engagement."