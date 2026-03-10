# Lean Lead Machine - MVP V1
## Document RST Simplifié - Moteur de Recherche Légal

**Date:** 10 mars 2026  
**Auteur:** Business Analyst - "The Strategist"  
**Version:** 1.0  
**Statut:** Pour validation technique

---

## 1. Catalogue des Filtres de Recherche Validés

### 1.1 Filtres de Base (Priorité Sprint 1)

#### USR-001 - Ciblage Local
| Filtre | Type | Description | Validation | Source MCP |
|--------|------|-------------|------------|------------|
| **Code Postal** | Texte (5 chiffres) | Filtre exact sur code postal | Format: 75001, 13001, etc. | `adresse.codePostal` |
| **Rayon (km)** | Numérique (1-100) | Rayon de recherche autour du code postal | Uniquement avec code postal | Calcul géographique |
| **Ville** | Texte | Filtre sur nom de ville | Auto-complétion suggérée | `adresse.libelleCommune` |

#### USR-002 - Ciblage Sectoriel
| Filtre | Type | Description | Validation | Source MCP |
|--------|------|-------------|------------|------------|
| **Code NAF** | Texte (5 caractères) | Activité principale de l'entreprise | Format: 62.01Z, 10.11A | `activitePrincipale.code` |
| **Libellé NAF** | Texte | Recherche textuelle sur activité | Auto-complétion | `activitePrincipale.libelle` |
| **Tranche d'Effectif** | Liste déroulante | Effectif salarié de l'entreprise | Valeurs: 0, 1-2, 3-5, 6-9, 10-19, 20-49, 50-99, 100-199, 200-249, 250-499, 500-999, 1000+ | `trancheEffectif` |

### 1.2 Filtres Secondaires (V2+)
*Note: Pour MVP, ces filtres seront disponibles en V2*

| Filtre | Type | Priorité |
|--------|------|----------|
| **Date de création** (après/avant) | Date | V2 |
| **Statut juridique** | Liste | V2 |
| **Chiffre d'affaires** | Plage numérique | V2 |
| **Région** | Liste | V2 |

---

## 2. Schéma de la Fiche Entreprise

### 2.1 Vue Liste (Résultats de recherche)

**Colonnes affichées par défaut:**
1. **Dénomination** (`denomination`)
2. **SIREN** (`siren`) - format: XXX XXX XXX
3. **Code postal** (`adresse.codePostal`)
4. **Ville** (`adresse.libelleCommune`)
5. **Code NAF** (`activitePrincipale.code`)
6. **Tranche d'effectif** (`trancheEffectif`)

**Tri par défaut:** Pertinence (score de matching)

### 2.2 Vue Détail (Fiche complète)

**Section 1: Identité**
- **Dénomination sociale:** `denomination`
- **SIREN:** `siren` (format: XXX XXX XXX)
- **SIRET du siège:** `siret`
- **Date de création:** `dateCreation` (format: JJ/MM/AAAA)
- **Statut juridique:** `categorieJuridique.libelle`

**Section 2: Localisation**
- **Adresse complète:** 
  - `adresse.numeroVoie` `adresse.typeVoie` `adresse.libelleVoie`
  - `adresse.codePostal` `adresse.libelleCommune`
- **Région:** `adresse.libelleRegion`
- **Pays:** France (fixe)

**Section 3: Activité**
- **Code NAF:** `activitePrincipale.code`
- **Libellé NAF:** `activitePrincipale.libelle`
- **Date début d'activité:** `dateDebut`

**Section 4: Effectifs**
- **Tranche d'effectif:** `trancheEffectif` (affichage texte: "10 à 19 salariés")
- **Effectif salarié:** `effectif` (si disponible)

**Section 5: Direction** *(via RNE)*
- **Dirigeant principal:** 
  - Nom: `dirigeant.nom`
  - Prénom: `dirigeant.prenom`
  - Qualité: `dirigeant.qualite` (ex: "Président", "Gérant")
- **Date de nomination:** `dirigeant.dateNomination`

### 2.3 Mapping des Champs Golden Record → API MCP

| Champ Golden Record | Champ API MCP | Type | Notes |
|-------------------|---------------|------|-------|
| Dénomination | `denomination` | string | Nom officiel |
| SIREN | `siren` | string (9 chiffres) | Format: 123456789 |
| Adresse complète | `adresse.*` | object | Construction: numéro + type + voie + CP + ville |
| Nom/Prénom dirigeant | `dirigeant.nom` + `dirigeant.prenom` | string | Via endpoint RNE |
| Date de création | `dateCreation` | date | Format ISO 8601 |
| Code NAF | `activitePrincipale.code` | string (5 chars) | Format: XX.XXZ |
| Tranche d'effectif | `trancheEffectif` | string | Code: 00, 01, 02, etc. |
| Code postal | `adresse.codePostal` | string (5 chars) | |
| Ville | `adresse.libelleCommune` | string | |

---

## 3. Règles de Gestion des Erreurs

### 3.1 Scénarios d'Erreur

#### A. Aucun résultat
**Message:** "Aucune entreprise ne correspond à vos critères de recherche."
**Actions suggérées:**
- Élargir le rayon de recherche
- Vérifier le code postal
- Essayer un code NAF plus large (2 premiers chiffres)

#### B. Trop de résultats (>500)
**Message:** "Votre recherche a retourné plus de 500 résultats. Veuillez affiner vos critères pour obtenir une liste exploitable."
**Limite technique:** API retourne max 500 résultats, pagination désactivée en V1.

#### C. Code postal invalide
**Message:** "Le code postal saisi n'est pas valide. Veuillez saisir un code postal français à 5 chiffres."
**Validation:** Regex `^[0-9]{5}$`

#### D. Rayon sans code postal
**Message:** "Le filtre 'Rayon' nécessite un code postal valide."
**Logique:** Désactiver le champ rayon si code postal vide.

#### E. API MCP indisponible
**Message:** "Le service de données est temporairement indisponible. Veuillez réessayer dans quelques instants."
**Fallback:** Aucun cache persistant, réessai automatique après 30s.

#### F. Données dirigeant manquantes
**Message:** "Les informations sur le dirigeant ne sont pas disponibles pour cette entreprise."
**Affichage:** Section "Direction" masquée si données absentes.

### 3.2 États de l'Interface

| État | Composant | Comportement |
|------|-----------|--------------|
| **Chargement** | Bouton recherche | Désactivé + spinner |
| **Succès** | Liste résultats | Affichage avec compteur |
| **Vide** | Zone résultats | Message d'erreur + suggestions |
| **Erreur** | Bannière | Message rouge + icône alerte |

---

## 4. Logique d'Export CSV

### 4.1 Colonnes par Défaut (500 lignes max)

**Ordre des colonnes:**
1. Dénomination
2. SIREN (format: 123456789)
3. Adresse (format: "12 Rue Exemple 75001 Paris")
4. Code postal
5. Ville
6. Code NAF
7. Libellé NAF
8. Tranche d'effectif (texte)
9. Date de création (JJ/MM/AAAA)
10. Nom dirigeant
11. Prénom dirigeant
12. Qualité dirigeant

### 4.2 Format du Fichier
- **Encodage:** UTF-8 avec BOM
- **Séparateur:** Point-virgule (;)
- **Nom de fichier:** `entreprises_export_YYYYMMDD_HHMM.csv`
- **En-têtes:** Français

### 4.3 Limitations MVP
1. **500 lignes maximum** - limitation technique pour performance
2. **Pas de sélection de colonnes** - export fixe en V1
3. **Pas de filtres sauvegardés** - export des résultats courants seulement

---

## 5. Contraintes Techniques Implémentées

### 5.1 Architecture Stateless
- **Session:** Aucune session utilisateur persistante
- **Cache:** Redis/Memcached avec TTL 24h max (conforme RGPD)
- **Cleaning:** Cron job quotidien pour purge cache >24h

### 5.2 Performance Cibles
- **Temps de réponse API:** < 1s (P95)
- **Temps de chargement page:** < 2s
- **Export CSV:** < 5s pour 500 lignes

### 5.3 Sécurité RGPD
- **Pas de stockage** de données personnelles
- **Cache temporaire** 24h maximum
- **Logs anonymisés** (pas de SIREN dans logs)
- **Export CSV** déclenché manuellement par utilisateur

### 5.4 Stack Technique
| Composant | Technologie | Rôle |
|-----------|-------------|------|
| Frontend | Next.js 14 + Tailwind | Interface utilisateur |
| Backend | Next.js API Routes | Proxy vers MCP |
| Cache | Supabase/Redis | Cache temporaire |
| Export | CSV généré côté client | Pas de stockage serveur |
| Déploiement | Vercel | Scaling automatique |

---

## 6. Endpoints API MCP Requis

### 6.1 Recherche Entreprises
```
POST /entreprises/search
{
  "codePostal": "75001",
  "rayonKm": 10,
  "codeNaf": "62.01Z",
  "trancheEffectif": "32"
}
```

### 6.2 Détail Entreprise + Dirigeant
```
GET /entreprises/{siren}
→ Combine SIRENE (identité) + RNE (dirigeants)
```

### 6.3 Auto-complétion
```
GET /suggestions/naf?q=informatique
GET /suggestions/villes?q=paris
```

---

## 7. Recommandations pour le Data Engineer

### 7.1 Priorités d'Implémentation
1. **Proxy MCP** avec cache Redis (TTL 24h)
2. **Service de géolocalisation** pour calcul rayon
3. **Aggrégation SIRENE + RNE** pour fiche complète
4. **Rate limiting** adapté aux quotas MCP

### 7.2 Optimisations Possibles
- **Pré-cache** des codes postaux fréquents
- **Indexation** des champs de recherche fréquents
- **Batch processing** pour exports CSV

### 7.3 Monitoring à Mettre en Place
- Latence des appels MCP
- Taux de succès/cache hit
- Nombre d'exports générés
- Erreurs par type (code postal invalide, etc.)

---

## 8. Validation & Approbation

### 8.1 Critères de Succès MVP
- [ ] Recherche par code postal + rayon fonctionnelle
- [ ] Filtrage par code NAF et effectif opérationnel
- [ ] Affichage fiche entreprise complète (SIRENE + RNE)
- [ ] Export CSV limité à 500 lignes
- [ ] Performance < 1s pour recherche simple
- [ ] Conformité RGPD (cache 24h max)

### 8.2 Prochaines Étapes
1. **Architecte:** Valider ce document RST
2. **Data Engineer:** Implémenter le proxy MCP
3. **Frontend:** Développer l'interface de recherche
4. **QA:** Tests de performance et conformité RGPD

---

**Document approuvé par:**
- [ ] Business Analyst (The Strategist)
- [ ] Technical Architect
- [ ] Product Owner
- [ ] Data Engineer

*Date d'approbation: _____/_____/2026*
