# Checklist de Déploiement - Authentification Supabase

## 📋 Pré-requis

### 1. Configuration Supabase
- [ ] **Projet Supabase** : `ukfgelvdhiubvptwkkoy.supabase.co`
- [ ] **Clé anon** : Récupérée depuis Settings → API
- [ ] **Clé service role** : Récupérée depuis Settings → API
- [ ] **Tables créées** : Exécuter `supabase_tables.sql`

### 2. Variables d'Environnement
- [ ] `.env.local` (développement) :
  ```bash
  NEXT_PUBLIC_SUPABASE_URL=https://ukfgelvdhiubvptwkkoy.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
  SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role
  ```
- [ ] **Vercel Environment Variables** (identique à `.env.local`)

### 3. Configuration Supabase Auth
- [ ] **Email confirmation** : Activée (ou auto-confirm pour MVP)
- [ ] **Site URL** : `https://votre-domaine.vercel.app`
- [ ] **Redirect URLs** : `https://votre-domaine.vercel.app/reset-password`

## 🚀 Étapes de Déploiement

### Phase 1 : Préparation
1. [ ] **Backup** : Sauvegarder l'ancienne version
2. [ ] **Tests locaux** : Exécuter `./test-auth.sh`
3. [ ] **Build test** : `npm run build`
4. [ ] **Type checking** : `npm run type-check`

### Phase 2 : Déploiement Vercel
1. [ ] **Push code** : `git push origin main`
2. [ ] **Vérifier deployment** : Vercel Dashboard → Deployments
3. [ ] **Variables env** : Vérifier dans Vercel → Settings → Environment Variables
4. [ ] **Password Protection** : Désactiver dans Vercel → Settings → Security

### Phase 3 : Post-Déploiement
1. [ ] **Tests production** : `./test-auth.sh https://votre-domaine.vercel.app`
2. [ ] **Email testing** : Tester l'inscription et reset password
3. [ ] **Performance** : Vérifier les temps de chargement
4. [ ] **Logs** : Monitorer les erreurs dans Vercel Logs

## 🧪 Tests à Effectuer

### Tests Fonctionnels
- [ ] **Inscription** : `/register` → création compte → redirection dashboard
- [ ] **Connexion** : `/login` → connexion → session persistante
- [ ] **Profil** : `/profile` → modification nom → vérification mise à jour
- [ ] **Déconnexion** : Bouton déconnexion → redirection login
- [ ] **Reset password** : `/forgot-password` → email reçu → reset fonctionnel
- [ ] **Dashboard** : `/dashboard` → affichage données utilisateur

### Tests Sécurité
- [ ] **Routes protégées** : Accès `/dashboard` sans auth → redirection `/login`
- [ ] **Routes publiques** : `/login` quand connecté → redirection `/dashboard`
- [ ] **Validation password** : Test règles complexité (8+ chars, majuscule, chiffre)
- [ ] **Cookies** : Vérifier `httpOnly`, `secure`, `sameSite`
- [ ] **CSRF** : Test protection cross-site requests

### Tests Performance
- [ ] **Temps chargement** : Pages < 2s
- [ ] **Bundle size** : Audit avec `npm run build`
- [ ] **API response** : Endpoints < 500ms
- [ ] **Mobile** : Responsive design OK

## 🔧 Dépannage

### Problèmes Courants

#### 1. "Supabase admin client non configuré"
```
Solution: Vérifier SUPABASE_SERVICE_ROLE_KEY dans .env.local et Vercel
```

#### 2. "Email non confirmé"
```
Solution: 
1. Activer "Auto-confirm" dans Supabase → Authentication → Providers → Email
2. OU vérifier la boîte email de l'utilisateur
```

#### 3. "Cookies non définis"
```
Solution:
1. Vérifier sameSite/secure settings dans middleware.ts
2. S'assurer que le domaine est le même (localhost en dev, votre-domaine en prod)
3. Vérifier que le navigateur accepte les cookies tiers
```

#### 4. "Erreur CORS"
```
Solution:
1. Vérifier NEXT_PUBLIC_APP_URL dans .env.local
2. Configurer CORS dans Supabase → Settings → API
```

### Logs de Débogage

#### Vercel Logs
```bash
# Accéder aux logs
vercel logs --prod

# Filtre erreurs
vercel logs --prod | grep -i "error\|fail"
```

#### Supabase Logs
1. Dashboard → Logs → Auth
2. Dashboard → Logs → Postgres
3. Dashboard → Logs → Realtime

#### Console Navigateur
1. F12 → Console (erreurs JS)
2. F12 → Network (requêtes API)
3. F12 → Application → Cookies

## 📊 Monitoring Post-Déploiement

### Métriques à Surveiller
- **Taux de succès auth** : > 95%
- **Temps réponse API** : < 500ms
- **Erreurs 4xx/5xx** : < 1%
- **Utilisateurs actifs** : Tracking quotidien
- **Storage usage** : Croissance base de données

### Alertes à Configurer
- [ ] **Rate limiting** : Alertes sur tentatives brute force
- [ ] **Downtime** : Monitoring uptime (Pingdom, UptimeRobot)
- [ ] **Errors** : Alertes sur erreurs > 5%
- [ ] **Performance** : Alertes sur temps réponse > 2s

## 🔄 Rollback Plan

### Si Problèmes Majeurs
1. [ ] **Identifier l'issue** : Logs, métriques, user reports
2. [ ] **Revert commit** : `git revert` ou rollback Vercel
3. [ ] **Rétablir ancien système** : Réactiver password protection Vercel
4. [ ] **Communiquer** : Informer les utilisateurs affectés

### Données à Sauvegarder
- **Tables Supabase** : `profiles`, `user_searches`, `user_exports`
- **Fichiers exports** : CSV téléchargés par les utilisateurs
- **Logs auth** : Historique des connexions

## 📝 Documentation à Mettre à Jour

### Pour l'Équipe
- [ ] `SETUP_AUTH.md` : Configuration et maintenance
- [ ] `AUTH_IMPLEMENTATION.md` : Architecture et features
- [ ] `README.md` : Mettre à jour la section auth

### Pour les Utilisateurs
- [ ] **FAQ** : Questions courantes sur le nouveau système
- [ ] **Guide migration** : Pour les utilisateurs existants
- [ ] **Support** : Contacts et procédures

## 🎯 Critères de Succès

### Technique
- [ ] 0 erreurs en production pendant 24h
- [ ] Performance stable (temps réponse < 500ms)
- [ ] 100% uptime sauf maintenance planifiée

### Utilisateur
- [ ] Feedback positif sur le nouveau système
- [ ] Taux de succès inscription > 90%
- [ ] Réduction tickets support auth

### Business
- [ ] Augmentation utilisateurs actifs
- [ ] Réduction coûts maintenance
- [ ] Scalability prouvée

---

**Responsable** : Équipe Technique  
**Date cible** : ASAP  
**Statut** : En attente de déploiement  

**Dernière mise à jour** : 2026-03-10  
**Version** : 1.0.0