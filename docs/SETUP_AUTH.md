# Configuration de l'Authentification Supabase

Ce document explique comment configurer le système d'authentification Supabase pour Lean Lead Machine.

## 1. Configuration Supabase

### 1.1. Récupérer les clés d'API

1. Accédez à votre projet Supabase : `https://ukfgelvdhiubvptwkkoy.supabase.co`
2. Allez dans **Settings → API**
3. Récupérez les informations suivantes :
   - **URL** : `https://ukfgelvdhiubvptwkkoy.supabase.co`
   - **anon key** : La clé publique
   - **service_role key** : La clé secrète (admin)

### 1.2. Mettre à jour les variables d'environnement

Dans `.env.local` et sur Vercel, ajoutez/modifiez :

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://ukfgelvdhiubvptwkkoy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon_supabase
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role_supabase
```

## 2. Création des Tables

### 2.1. Exécuter le script SQL

1. Allez dans l'éditeur SQL de Supabase
2. Copiez-collez le contenu de `supabase_tables.sql`
3. Exécutez le script

### 2.2. Vérifier les tables créées

Les tables suivantes doivent être créées :
- `profiles` : Extension des utilisateurs auth
- `user_searches` : Historique des recherches
- `user_exports` : Historique des exports
- `user_credits` : Gestion des crédits (optionnel)

## 3. Configuration de l'Email

### 3.1. Configurer l'email de confirmation

1. Allez dans **Authentication → Providers → Email**
2. Activez "Confirm email"
3. Configurez le template d'email si nécessaire

### 3.2. Configurer la réinitialisation de mot de passe

1. Dans **Authentication → URL Configuration**
2. Définissez :
   - **Site URL** : `https://votre-domaine.vercel.app`
   - **Redirect URLs** : Ajoutez `https://votre-domaine.vercel.app/reset-password`

## 4. Déploiement sur Vercel

### 4.1. Variables d'environnement

Sur Vercel, ajoutez toutes les variables de `.env.local` :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- Les autres variables Google Maps, etc.

### 4.2. Désactiver la protection par mot de passe

1. Allez dans **Vercel → Project → Settings → Security**
2. Désactivez "Password Protection"
3. Sauvegardez les changements

## 5. Tests de l'Authentification

### 5.1. Tests manuels

1. **Inscription** : `/register`
   - Créer un compte avec email/mot de passe
   - Vérifier la redirection vers `/dashboard`

2. **Connexion** : `/login`
   - Se connecter avec le compte créé
   - Vérifier la persistance de session

3. **Profil** : `/profile`
   - Modifier le nom complet
   - Vérifier la mise à jour

4. **Déconnexion** : Bouton de déconnexion
   - Vérifier la redirection vers `/login`

5. **Réinitialisation mot de passe** : `/forgot-password`
   - Demander un lien de réinitialisation
   - Vérifier la réception de l'email

### 5.2. Tests de sécurité

1. **Routes protégées** : Accéder à `/dashboard` sans être connecté
   - Doit rediriger vers `/login`

2. **Routes publiques** : `/login`, `/register` quand connecté
   - Doit rediriger vers `/dashboard`

3. **Validation mot de passe** : Test des règles de complexité

## 6. Sécurité

### 6.1. RLS (Row Level Security)

Les politiques RLS sont configurées pour :
- Les utilisateurs ne voient que leurs propres données
- Les utilisateurs ne peuvent modifier que leur propre profil

### 6.2. Cookies sécurisés

- `httpOnly` : Empêche l'accès JavaScript
- `secure` : Uniquement en HTTPS
- `sameSite: 'lax'` : Protection CSRF

### 6.3. Validation côté serveur

Toutes les validations sont faites côté serveur :
- Longueur et complexité des mots de passe
- Format des emails
- Authentification des requêtes

## 7. Dépannage

### 7.1. Erreurs courantes

**"Supabase admin client non configuré"**
- Vérifiez que `SUPABASE_SERVICE_ROLE_KEY` est défini

**"Email non confirmé"**
- Activez l'auto-confirmation dans Supabase Auth settings
- Ou vérifiez votre boîte email

**"Cookies non définis"**
- Vérifiez que le domaine est le même entre frontend et Supabase
- Vérifiez les paramètres `sameSite` et `secure`

### 7.2. Logs de débogage

1. **Console navigateur** : Erreurs JavaScript
2. **Network tab** : Requêtes API échouées
3. **Supabase Logs** : `Dashboard → Logs → Auth`
4. **Vercel Logs** : `Deployments → Runtime Logs`

## 8. Maintenance

### 8.1. Sauvegarde des données

- Exports réguliers depuis Supabase
- Sauvegarde de la base de données

### 8.2. Monitoring

- Surveiller les taux d'échec d'authentification
- Surveiller les tentatives de brute force
- Logs d'activité utilisateur

## 9. RGPD Compliance

### 9.1. Données personnelles

- Les utilisateurs peuvent supprimer leur compte
- Les données sont automatiquement supprimées en cascade
- Historique de 30 jours conservé pour audit

### 9.2. Consentement

- Conditions d'utilisation acceptées à l'inscription
- Politique de confidentialité accessible
- Option de désinscription des emails

---

**Support** : Pour toute question, contactez l'équipe technique.