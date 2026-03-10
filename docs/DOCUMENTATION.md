# Documentation du Scraper "The Hunter"

## 📋 Vue d'ensemble

**The Hunter** est un scraper web stateless conçu pour extraire les contacts professionnels d'un site web en moins de 5 secondes. Il transforme une URL en une liste structurée de contacts (emails, téléphones, réseaux sociaux, dirigeants).

## 🎯 Objectifs

- **Performance**: < 5 secondes par requête
- **Stateless**: Aucune donnée persistante
- **RGPD compliant**: Pas de stockage de données personnelles
- **Respectueux**: Respect des robots.txt et CGU
- **Modulaire**: Architecture extensible

## 🏗️ Architecture

```
the_hunter/
├── scraper.py           # Module principal d'extraction web
├── linkedin_search.py   # Recherche de profils LinkedIn
├── anti_blocking.py     # Gestion anti-blocage
├── api_service.py       # Service FastAPI
├── test_scraper.py      # Tests complets
└── requirements.txt     # Dépendances
```

## 🚀 Installation

### Prérequis
- Python 3.8+
- pip

### Installation des dépendances
```bash
pip install -r requirements.txt
```

## 📖 Utilisation

### 1. Scraping basique
```python
from scraper import scrape_website_sync

url = "https://example.com"
result = scrape_website_sync(url)
print(result)
```

### 2. Recherche LinkedIn
```python
from linkedin_search import search_linkedin_profiles_sync

profiles = search_linkedin_profiles_sync("Jean Dupont", "Entreprise SAS", max_results=3)
```

### 3. Service API
```bash
# Lancer le service
python api_service.py

# Test avec curl
curl "http://localhost:8000/scrape?url=https://example.com"
```

## 🔧 Configuration

### Variables d'environnement (optionnel)
```bash
export HUNTER_TIMEOUT=5
export HUNTER_USER_AGENT="Custom Agent"
```

### Configuration anti-blocage
- Délais aléatoires: 0.5-2.0 secondes
- Rotation automatique des User-Agents
- Respect automatique de robots.txt
- Détection CAPTCHA (fallback manuel)

## 📊 Format de réponse

```json
{
  "success": true,
  "website_url": "https://example.com",
  "execution_time": 3.45,
  "data": {
    "emails": ["contact@example.com", "info@example.com"],
    "phones": ["+33123456789"],
    "social_links": {
      "linkedin": "https://linkedin.com/company/example",
      "twitter": "https://twitter.com/example"
    },
    "executives": [
      {
        "name": "Jean Dupont",
        "linkedin": "https://linkedin.com/in/jeandupont",
        "linkedin_match_score": 0.85
      }
    ]
  },
  "metadata": {
    "emails_count": 2,
    "phones_count": 1,
    "social_links_count": 2,
    "executives_count": 1,
    "with_linkedin": true
  }
}
```

## ⚡ Performance

### Contraintes
- **Timeout**: 5 secondes maximum
- **Mémoire**: Usage minimal, nettoyage automatique
- **Réseau**: Limite de 3 pages par site
- **Parallélisme**: Gestion asynchrone optimisée

### Optimisations
- Requêtes asynchrones avec aiohttp
- Cache volatile pour robots.txt (5 minutes)
- Délais aléatoires entre les requêtes
- Timeout configurable par requête

## 🛡️ Sécurité et Légalité

### Conformité RGPD
- **Aucun stockage** de données personnelles
- **Traitement en mémoire** uniquement
- **Données volatiles** (disparaissent après traitement)
- **Consentement implicite** via usage public du site

### Respect des CGU
- Vérification automatique de robots.txt
- Détection et évitement des CAPTCHAs
- Headers HTTP réalistes
- Limitation du taux de requêtes

### Bonnes pratiques
1. **Toujours** vérifier robots.txt avant le scraping
2. **Respecter** les headers `X-Robots-Tag`
3. **Éviter** le surchargement des serveurs cibles
4. **Identifier** clairement votre bot (User-Agent)
5. **Limiter** la fréquence des requêtes

## 🔍 Module LinkedIn

### Fonctionnalités
- Recherche via Google dorking
- Validation des correspondances
- Extraction d'informations publiques
- Scoring de pertinence

### Pattern de recherche
```
site:linkedin.com/in/ "Prénom Nom" "Entreprise"
```

### Limitations
- Accès aux profils publics uniquement
- Dépend de l'indexation Google
- Pas de bypass des restrictions LinkedIn

## 🚨 Limitations connues

### Techniques
1. **Sites JavaScript lourds**: Requiert un headless browser (non implémenté)
2. **CAPTCHAs avancés**: Nécessite une intervention manuelle
3. **Rate limiting agressif**: Peut nécessiter des proxies
4. **Contenu behind login**: Non accessible

### Légales
1. **CGU restrictives**: Certains sites interdisent le scraping
2. **Données sensibles**: Ne pas extraire d'informations privées
3. **Usage commercial**: Vérifier les licences d'utilisation

## 📈 Monitoring

### Métriques disponibles
- Temps d'exécution par requête
- Taux de réussite
- Nombre de requêtes bloquées
- Usage mémoire

### Logs
- Niveau INFO par défaut
- Détection des problèmes (timeout, blocages)
- Traçabilité complète des requêtes

## 🔄 Déploiement

### Docker (recommandé)
```dockerfile
FROM python:3.9-slim
COPY . /app
WORKDIR /app
RUN pip install -r requirements.txt
CMD ["python", "api_service.py"]
```

### Service système (systemd)
```ini
[Unit]
Description=The Hunter Scraper API
After=network.target

[Service]
Type=simple
User=hunter
WorkingDirectory=/opt/the-hunter
ExecStart=/usr/bin/python3 api_service.py
Restart=always

[Install]
WantedBy=multi-user.target
```

## 🧪 Tests

### Tests unitaires
```bash
python -m pytest test_scraper.py -v
```

### Tests d'intégration
```bash
# Test complet avec une URL
python test_scraper.py https://example.com

# Tests automatisés
python test_scraper.py
```

### Validation des contraintes
- Temps d'exécution < 5s
- Aucune donnée persistante
- Format JSON valide
- Respect robots.txt

## 🤝 Contribution

### Développement
1. Fork le repository
2. Crée une branche feature
3. Ajoute des tests
4. Soumets une PR

### Guidelines
- **Stateless**: Jamais de stockage persistant
- **Performance**: Toujours < 5s
- **Tests**: Couverture > 80%
- **Documentation**: Mise à jour obligatoire

## 📞 Support

### Problèmes courants
1. **Timeout**: Augmenter le timeout ou réduire la profondeur
2. **Blocage**: Vérifier robots.txt, ajuster les délais
3. **CAPTCHA**: Intervention manuelle requise
4. **Données manquantes**: Site peut utiliser JavaScript

### Debugging
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 📄 Licence

Ce projet est fourni sous licence MIT. L'utilisateur est responsable du respect des lois locales et des CGU des sites cibles.

---

**Note importante**: Ce scraper est conçu pour un usage éthique et légal. Toujours respecter les termes de service des sites web et les réglementations sur la protection des données.

**Dernière mise à jour**: Mars 2024