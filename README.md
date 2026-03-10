# Lean Lead Machine - MVP V1

## 🚀 Plateforme B2B SaaS de Prospection Légal

**Lean Lead Machine** est une plateforme de prospection commerciale B2B qui utilise exclusivement les données officielles françaises (SIRENE/RNE) via le serveur MCP data.gouv.fr, garantissant une conformité RGPD totale.

## 📋 Caractéristiques MVP V1

### Filtres de Recherche
- **Ciblage Local** : Code Postal + Rayon (km)
- **Ciblage Sectoriel** : Code NAF + Tranche d'Effectif
- **Export CSV** : 500 lignes maximum

### Architecture
- **Stack** : Next.js 14, Tailwind, Supabase, Stripe
- **Stateless** : Pas de stockage de données personnelles
- **Cache** : Temporaire 24h maximum (RGPD)
- **Performance** : Réponse API < 1s

## 📁 Structure du Projet

```
lean-lead-machine/
├── docs/                    # Documentation complète
├── scripts/                # Scripts de matching et scraping
├── api/                    # Endpoints API (Next.js API Routes)
├── frontend/               # Interface Next.js + Tailwind
├── data/                   # Schémas de données et modèles
├── tests/                  # Tests unitaires et d'intégration
├── config/                 # Configuration environnement
└── README.md
```

## 🚀 Installation

```bash
# Cloner le repository
git clone https://github.com/uwilllberich4ever-del/lean-lead-machine.git
cd lean-lead-machine

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp config/.env.example config/.env.local
# Éditer config/.env.local avec vos clés

# Lancer en développement
npm run dev
```

## 🔧 Configuration

### Variables d'Environnement Requises

```env
# MCP API
NEXT_PUBLIC_MCP_API_URL=https://mcp.data.gouv.fr/mcp
MCP_API_KEY=votre_cle_api

# Supabase
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon

# Redis (Cache)
REDIS_URL=redis://localhost:6379
REDIS_TTL=86400  # 24h en secondes

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## 📊 Données

### Sources
- **SIRENE** : Informations légales des entreprises
- **RNE** : Registre National des Entreprises (dirigeants)
- **MCP** : Serveur officiel data.gouv.fr

### Golden Record MVP V1
- Dénomination sociale
- SIREN
- Adresse complète
- Nom/Prénom du dirigeant
- Date de création
- Code NAF
- Tranche d'effectif
- Code postal
- Ville

## 🔒 Conformité RGPD

1. **Pas de stockage** de données personnelles
2. **Cache temporaire** 24h maximum
3. **Export limité** à 500 lignes
4. **Logs anonymisés** (pas de SIREN dans les logs)
5. **Consentement explicite** pour l'export CSV

## 🧪 Tests

```bash
# Tests unitaires
npm test

# Tests d'intégration
npm run test:integration

# Tests E2E
npm run test:e2e
```

## 📈 Roadmap

### Sprint 1 (MVP V1)
- [x] Recherche par code postal + rayon
- [x] Filtrage par code NAF + effectif
- [x] Export CSV 500 lignes
- [x] Interface responsive

### Sprint 2 (V1.1)
- [ ] Filtres avancés (date création, CA)
- [ ] Sauvegarde des recherches
- [ ] Tableau de bord analytics
- [ ] Intégration Stripe

### Sprint 3 (V1.2)
- [ ] API publique
- [ ] Webhooks
- [ ] Notifications email
- [ ] Multi-langues

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/amazing-feature`)
3. Commit vos changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Contact

- **GitHub** : [@uwilllberich4ever-del](https://github.com/uwilllberich4ever-del)
- **Email** : uwilllberich4ever@gmail.com

---

**Développé avec ❤️ pour les commerciaux B2B français**
