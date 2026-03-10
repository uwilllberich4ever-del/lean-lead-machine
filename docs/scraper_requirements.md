# Analyse des exigences du scraper "The Hunter"

## Objectif principal
Transformer une URL de site web en une liste de contacts professionnels en moins de 5 secondes.

## Composants à développer

### 1. Module d'extraction web
- **Fonctionnalités**:
  - Récupération du contenu HTML
  - Extraction des emails (regex)
  - Extraction des téléphones (formats français et internationaux)
  - Extraction des liens sociaux (LinkedIn, Twitter, Facebook, etc.)
  - Détection des pages "Contact" et "About"
  - Extraction des noms de dirigeants

### 2. Module LinkedIn
- **Fonctionnalités**:
  - Recherche de profils via Google dorking
  - Pattern: `site:linkedin.com/in/ "Prénom Nom" "Entreprise"`
  - Extraction des données publiques
  - Validation de correspondance avec l'entreprise

### 3. Anti-blocage
- **Mesures**:
  - Headers HTTP réalistes
  - Délais aléatoires
  - Respect robots.txt
  - Rotation d'IP (si disponible)
  - Gestion CAPTCHA (fallback manuel)

### 4. Service API
- **Format de réponse JSON**:
  ```json
  {
    "emails": [],
    "phones": [],
    "social_links": {},
    "executives": []
  }
  ```
- **Contraintes**:
  - Stateless absolu
  - Pas de stockage
  - < 5 secondes par requête
  - Respect RGPD

## Technologies recommandées
- **Python** avec:
  - `requests`/`httpx` pour HTTP
  - `beautifulsoup4` pour parsing HTML
  - `re` pour regex
  - `json` pour formatage
  - `asyncio` pour performance

## Structure du projet
- `scraper.py`: Module principal d'extraction
- `linkedin_search.py`: Module de recherche LinkedIn
- `api_service.py`: Service FastAPI/Flask
- `anti_blocking.py`: Gestion anti-blocage
  