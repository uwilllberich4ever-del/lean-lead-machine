# EXEMPLES D'APPELS API MCP - MVP V1

## 1. Recherche d'Entreprises (Endpoint Principal)

### Requête
```json
POST /entreprises/search
{
  "filters": {
    "localisation": {
      "codePostal": "75001",
      "rayonKm": 10,
      "ville": "Paris"
    },
    "activite": {
      "codeNaf": "62.01Z",
      "libelleNaf": "programmation informatique"
    },
    "effectif": {
      "tranche": "32"  // Code: 32 = 20-49 salariés
    }
  },
  "pagination": {
    "page": 1,
    "limit": 50
  },
  "sort": {
    "field": "denomination",
    "order": "asc"
  }
}
```

### Réponse (Succès)
```json
{
  "success": true,
  "data": {
    "entreprises": [
      {
        "siren": "123456789",
        "denomination": "TECHNOLOGIES FRANCE SARL",
        "adresse": {
          "numeroVoie": "12",
          "typeVoie": "RUE",
          "libelleVoie": "DE LA PAIX",
          "codePostal": "75001",
          "libelleCommune": "PARIS",
          "libelleRegion": "ILE-DE-FRANCE"
        },
        "activitePrincipale": {
          "code": "62.01Z",
          "libelle": "Programmation informatique"
        },
        "trancheEffectif": "32",
        "dateCreation": "2015-06-15",
        "categorieJuridique": {
          "code": "5710",
          "libelle": "SAS"
        }
      }
    ],
    "pagination": {
      "total": 245,
      "page": 1,
      "limit": 50,
      "pages": 5
    },
    "metadata": {
      "queryTime": 0.45,
      "cacheHit": true,
      "cacheTtl": 86400
    }
  }
}
```

### Réponse (Aucun Résultat)
```json
{
  "success": true,
  "data": {
    "entreprises": [],
    "pagination": {
      "total": 0,
      "page": 1,
      "limit": 50,
      "pages": 0
    },
    "metadata": {
      "queryTime": 0.12,
      "cacheHit": false,
      "suggestions": [
        "Élargir le rayon de recherche",
        "Vérifier le code postal",
        "Essayer un code NAF plus large (ex: 62 au lieu de 62.01Z)"
      ]
    }
  }
}
```

## 2. Détail d'une Entreprise + Dirigeant

### Requête
```json
GET /entreprises/123456789
```

### Réponse
```json
{
  "success": true,
  "data": {
    "identite": {
      "siren": "123456789",
      "siret": "12345678900015",
      "denomination": "TECHNOLOGIES FRANCE SARL",
      "dateCreation": "2015-06-15",
      "categorieJuridique": {
        "code": "5710",
        "libelle": "SAS"
      },
      "statut": "Active"
    },
    "localisation": {
      "adresseComplete": "12 RUE DE LA PAIX 75001 PARIS",
      "numeroVoie": "12",
      "typeVoie": "RUE",
      "libelleVoie": "DE LA PAIX",
      "codePostal": "75001",
      "libelleCommune": "PARIS",
      "libelleRegion": "ILE-DE-FRANCE",
      "latitude": 48.866667,
      "longitude": 2.333333
    },
    "activite": {
      "codeNaf": "62.01Z",
      "libelleNaf": "Programmation informatique",
      "dateDebut": "2015-06-15"
    },
    "effectifs": {
      "trancheEffectif": "32",
      "trancheLibelle": "20 à 49 salariés",
      "effectif": 35
    },
    "dirigeants": [
      {
        "nom": "DUPONT",
        "prenom": "Jean",
        "qualite": "Président",
        "dateNomination": "2015-06-15",
        "dateNaissance": "1980-05-12"
      }
    ],
    "metadata": {
      "source": "SIRENE + RNE",
      "lastUpdated": "2026-03-09T14:30:00Z",
      "cacheTtl": 86400
    }
  }
}
```

## 3. Auto-complétion

### Requête NAF
```json
GET /suggestions/naf?q=info&limit=10
```

### Réponse NAF
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "code": "62.01Z",
        "libelle": "Programmation informatique",
        "score": 0.95
      },
      {
        "code": "62.02Z",
        "libelle": "Conseil en systèmes informatiques",
        "score": 0.87
      },
      {
        "code": "62.03Z",
        "libelle": "Gestion d'installations informatiques",
        "score": 0.76
      }
    ]
  }
}
```

### Requête Villes
```json
GET /suggestions/villes?q=par&limit=5
```

### Réponse Villes
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "codePostal": "75001",
        "ville": "PARIS 01",
        "departement": "75",
        "region": "ILE-DE-FRANCE",
        "score": 0.98
      },
      {
        "codePostal": "75002",
        "ville": "PARIS 02",
        "departement": "75",
        "region": "ILE-DE-FRANCE",
        "score": 0.97
      },
      {
        "codePostal": "13001",
        "ville": "MARSEILLE 01",
        "departement": "13",
        "region": "PROVENCE-ALPES-COTE D'AZUR",
        "score": 0.65
      }
    ]
  }
}
```

## 4. Export CSV

### Requête
```json
POST /export/csv
{
  "filters": {
    "codePostal": "75001",
    "rayonKm": 10,
    "codeNaf": "62.01Z"
  },
  "format": {
    "separator": ";",
    "encoding": "UTF-8",
    "includeHeaders": true
  }
}
```

### Réponse (Déclenchement)
```json
{
  "success": true,
  "data": {
    "exportId": "exp_abc123def456",
    "status": "processing",
    "estimatedRows": 127,
    "downloadUrl": null,
    "message": "Export en cours de génération. Téléchargement disponible dans quelques secondes."
  }
}
```

### Réponse (Succès)
```json
{
  "success": true,
  "data": {
    "exportId": "exp_abc123def456",
    "status": "completed",
    "rows": 127,
    "downloadUrl": "/exports/exp_abc123def456.csv",
    "filename": "entreprises_export_20260310_1430.csv",
    "size": "45.2 KB",
    "generatedAt": "2026-03-10T14:30:15Z"
  }
}
```

### Réponse (Limite Dépassée)
```json
{
  "success": false,
  "error": {
    "code": "EXPORT_LIMIT_EXCEEDED",
    "message": "L'export dépasse la limite de 500 lignes. Veuillez affiner vos critères de recherche.",
    "details": {
      "maxRows": 500,
      "estimatedRows": 1245,
      "suggestions": [
        "Réduire le rayon de recherche",
        "Ajouter un filtre par code NAF",
        "Limiter à une tranche d'effectif spécifique"
      ]
    }
  }
}
```

## 5. Codes d'Erreur Standardisés

| Code | Message | HTTP Status | Action Utilisateur |
|------|---------|-------------|-------------------|
| `INVALID_POSTAL_CODE` | Code postal invalide | 400 | Corriger le format (5 chiffres) |
| `RADIUS_WITHOUT_POSTAL` | Rayon nécessite un code postal | 400 | Saisir un code postal d'abord |
| `NO_RESULTS` | Aucune entreprise trouvée | 200 | Élargir les critères |
| `TOO_MANY_RESULTS` | Plus de 500 résultats | 200 | Affiner la recherche |
| `MCP_UNAVAILABLE` | Service MCP indisponible | 503 | Réessayer plus tard |
| `RATE_LIMITED` | Trop de requêtes | 429 | Attendre 1 minute |
| `EXPORT_LIMIT` | Export >500 lignes | 400 | Réduire le scope |

## 6. En-têtes de Cache

```
Cache-Control: public, max-age=86400, stale-while-revalidate=3600
X-Cache-Source: MCP
X-Cache-Expires: 2026-03-11T14:30:00Z
X-Data-Freshness: 24h
```

## 7. Structure de Cache Redis

### Clés
- `search:cp:75001:naf:62.01Z:eff:32` → Résultats JSON
- `entreprise:123456789` → Fiche complète JSON
- `suggest:naf:info` → Suggestions NAF
- `suggest:ville:par` → Suggestions villes

### TTL
- **Recherches:** 24h (86400 secondes)
- **Fiches entreprises:** 24h
- **Suggestions:** 6h (21600 secondes)
- **Exports:** 1h (3600 secondes)

## 8. Métriques à Monitorer

```json
{
  "metrics": {
    "performance": {
      "mcp_latency_p95": 0.45,
      "cache_hit_rate": 0.78,
      "export_generation_time": 3.2
    },
    "usage": {
      "searches_per_day": 1250,
      "exports_generated": 89,
      "avg_results_per_search": 42
    },
    "errors": {
      "mcp_errors": 12,
      "validation_errors": 45,
      "export_limit_hits": 23
    }
  }
}
```

---

**Notes pour l'implémentation:**
1. Tous les endpoints doivent inclure les en-têtes de cache
2. Validation stricte des inputs côté API
3. Logging structuré pour le monitoring
4. Rate limiting par IP (100 req/min)
5. Timeout MCP: 5 secondes maximum
