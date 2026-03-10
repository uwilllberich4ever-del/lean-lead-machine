# RÉSUMÉ EXÉCUTIF - MVP V1 LEAN LEAD MACHINE

## 🎯 Objectif
Concevoir un moteur de recherche B2B légal pour la prospection commerciale, utilisant exclusivement les données officielles SIRENE/RNE via le serveur MCP data.gouv.fr.

## 📋 Filtres de Recherche (Sprint 1)

### USR-001 - Ciblage Local
- **Code Postal** (5 chiffres) - filtre exact
- **Rayon** (1-100 km) - recherche géographique autour du CP
- **Ville** - auto-complétion

### USR-002 - Ciblage Sectoriel  
- **Code NAF** (5 caractères, ex: 62.01Z)
- **Libellé NAF** - recherche textuelle
- **Tranche d'Effectif** (liste: 0, 1-2, 3-5, ..., 1000+)

## 📊 Golden Record - Champs à Afficher

### Vue Liste (6 colonnes)
1. Dénomination
2. SIREN (formaté)
3. Code postal
4. Ville  
5. Code NAF
6. Tranche d'effectif

### Vue Détail (5 sections)
1. **Identité:** Dénomination, SIREN, date création
2. **Localisation:** Adresse complète, CP, ville
3. **Activité:** Code NAF, libellé
4. **Effectifs:** Tranche (texte)
5. **Direction:** Nom/prénom dirigeant (via RNE)

## ⚡ Contraintes Techniques

### Performance
- **API Response:** < 1s (P95)
- **Architecture:** Stateless - pas de session
- **Cache:** Temporaire 24h max (RGPD)
- **Données:** Uniquement MCP, pas de scraping

### Export CSV
- **Limite:** 500 lignes maximum
- **Colonnes:** 12 champs fixes
- **Format:** UTF-8, séparateur point-virgule
- **Génération:** Côté client, pas de stockage serveur

## 🚨 Gestion des Erreurs (Messages Utilisateur)

| Scénario | Message | Action |
|----------|---------|--------|
| Aucun résultat | "Aucune entreprise ne correspond à vos critères" | Suggestions d'élargissement |
| >500 résultats | "Trop de résultats (>500). Affinez vos critères." | Limitation technique MVP |
| CP invalide | "Code postal invalide (5 chiffres requis)" | Validation regex |
| Rayon sans CP | "Le rayon nécessite un code postal valide" | Désactivation champ |
| API indisponible | "Service temporairement indisponible" | Réessai auto 30s |

## 🛠️ Stack Technique
- **Frontend:** Next.js 14 + Tailwind
- **Backend:** Next.js API Routes (proxy MCP)
- **Cache:** Redis/Supabase (TTL 24h)
- **Déploiement:** Vercel

## 📅 Prochaines Étapes Immédiates

1. **Architecte:** Valider document RST complet
2. **Data Engineer:** Implémenter proxy MCP avec:
   - Cache Redis 24h
   - Service géolocalisation pour rayon
   - Aggrégation SIRENE + RNE
   - Rate limiting adapté aux quotas MCP
3. **Frontend:** Développer interface recherche + export CSV
4. **QA:** Tests performance + conformité RGPD

## ⏱️ Deadline
**Immédiate** - L'architecte peut lancer le data engineer dès validation.

---

## ✅ Critères de Succès MVP
- [ ] Recherche CP + rayon fonctionnelle
- [ ] Filtrage NAF/effectif opérationnel  
- [ ] Fiche entreprise complète (SIRENE+RNE)
- [ ] Export CSV 500 lignes max
- [ ] Performance < 1s recherche simple
- [ ] Conformité RGPD (cache 24h)

---

**Document complet RST:** `LeanLeadMachine_MVP_V1_RST.md`
**Prêt pour implémentation technique immédiate.**
