#!/usr/bin/env python3
"""
Web Scraper "The Hunter" - Module principal d'extraction
Stateless absolu: aucune donnée persistante
"""

import re
import asyncio
import aiohttp
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
import time
import random
from typing import Dict, List, Optional, Set
import logging

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WebScraper:
    """Scraper web stateless pour extraction de contacts"""
    
    def __init__(self, user_agent: str = None):
        self.user_agent = user_agent or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        self.session = None
        self.visited_urls = set()  # Pour éviter les doublons pendant le crawl
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            headers={
                'User-Agent': self.user_agent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            },
            timeout=aiohttp.ClientTimeout(total=10)
        )
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
        # Nettoyage complet (stateless)
        self.visited_urls.clear()
        
    async def fetch_url(self, url: str) -> Optional[str]:
        """Récupère le contenu HTML d'une URL avec anti-blocage basique"""
        if not self.session:
            raise RuntimeError("Session non initialisée. Utilisez 'async with WebScraper() as scraper:'")
            
        try:
            # Délai aléatoire pour éviter le blocage
            await asyncio.sleep(random.uniform(0.5, 1.5))
            
            async with self.session.get(url) as response:
                if response.status == 200:
                    return await response.text()
                else:
                    logger.warning(f"Statut HTTP {response.status} pour {url}")
                    return None
        except Exception as e:
            logger.error(f"Erreur lors de la récupération de {url}: {e}")
            return None
    
    def extract_emails(self, html: str, base_url: str) -> List[str]:
        """Extrait les emails du contenu HTML"""
        # Pattern pour emails
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        emails = set(re.findall(email_pattern, html, re.IGNORECASE))
        
        # Filtre les emails génériques de contact
        contact_emails = []
        for email in emails:
            email_lower = email.lower()
            # Priorité aux emails de contact génériques
            if any(domain in email_lower for domain in ['contact', 'sales', 'info', 'support', 'hello']):
                contact_emails.insert(0, email)
            else:
                contact_emails.append(email)
                
        return list(dict.fromkeys(contact_emails))  # Supprime les doublons en gardant l'ordre
    
    def extract_phones(self, html: str) -> List[str]:
        """Extrait les numéros de téléphone (formats français et internationaux)"""
        # Patterns pour téléphones
        patterns = [
            # Format français: 01 23 45 67 89, 01.23.45.67.89, 01-23-45-67-89
            r'(?:\+33|0)[1-9](?:[ .-]?\d{2}){4}',
            # Format international: +33 1 23 45 67 89
            r'\+\d{1,3}[ .-]?\d{1,4}(?:[ .-]?\d{2,3}){3,4}',
            # Format avec parenthèses: (01) 23 45 67 89
            r'\(0\d\)[ .-]?\d{2}(?:[ .-]?\d{2}){3}',
        ]
        
        phones = set()
        for pattern in patterns:
            found = re.findall(pattern, html)
            phones.update(found)
            
        # Nettoyage et formatage
        cleaned_phones = []
        for phone in phones:
            # Supprime les espaces, points, tirets
            cleaned = re.sub(r'[ .\-()]', '', phone)
            # Ajoute l'indicatif +33 si numéro français sans indicatif
            if cleaned.startswith('0') and len(cleaned) == 10:
                cleaned = '+33' + cleaned[1:]
            cleaned_phones.append(cleaned)
            
        return list(set(cleaned_phones))
    
    def extract_social_links(self, html: str, base_url: str) -> Dict[str, str]:
        """Extrait les liens vers les réseaux sociaux"""
        soup = BeautifulSoup(html, 'html.parser')
        social_links = {}
        
        # Patterns pour les réseaux sociaux
        social_patterns = {
            'linkedin': ['linkedin.com', 'linked.in'],
            'twitter': ['twitter.com', 'x.com'],
            'facebook': ['facebook.com', 'fb.com'],
            'instagram': ['instagram.com', 'instagr.am'],
            'youtube': ['youtube.com', 'youtu.be'],
            'github': ['github.com'],
        }
        
        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href'].lower()
            
            for platform, domains in social_patterns.items():
                if any(domain in href for domain in domains):
                    # Convertir en URL absolue si nécessaire
                    if href.startswith('/'):
                        href = urljoin(base_url, href)
                    elif not href.startswith(('http://', 'https://')):
                        href = urljoin(base_url, href)
                    
                    social_links[platform] = href
                    break
        
        return social_links
    
    def find_contact_pages(self, html: str, base_url: str) -> List[str]:
        """Trouve les URLs des pages de contact"""
        soup = BeautifulSoup(html, 'html.parser')
        contact_urls = []
        
        # Mots-clés pour les pages de contact
        contact_keywords = ['contact', 'about', 'team', 'equipe', 'nous', 'company', 'société']
        
        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href']
            text = a_tag.get_text().lower()
            
            # Vérifie si le lien ou le texte contient des mots-clés de contact
            if any(keyword in text for keyword in contact_keywords) or \
               any(keyword in href.lower() for keyword in contact_keywords):
                
                # Convertir en URL absolue
                if href.startswith('/'):
                    href = urljoin(base_url, href)
                elif not href.startswith(('http://', 'https://')):
                    href = urljoin(base_url, href)
                
                # Vérifier que c'est une URL valide du même domaine
                if urlparse(href).netloc == urlparse(base_url).netloc:
                    contact_urls.append(href)
        
        return list(set(contact_urls))[:5]  # Limite à 5 URLs
    
    def extract_executive_names(self, html: str) -> List[str]:
        """Extrait les noms de dirigeants potentiels"""
        soup = BeautifulSoup(html, 'html.parser')
        names = []
        
        # Recherche dans les titres (h1-h6) et paragraphes
        text_elements = soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div'])
        
        # Patterns pour les noms de dirigeants
        title_patterns = [
            'CEO', 'Directeur', 'Directrice', 'Président', 'Présidente',
            'Fondateur', 'Fondatrice', 'Manager', 'Responsable', 'Head of'
        ]
        
        for element in text_elements:
            text = element.get_text().strip()
            
            # Vérifie si le texte contient un titre de dirigeant
            if any(pattern.lower() in text.lower() for pattern in title_patterns):
                # Essaye d'extraire un nom (2-3 mots commençant par une majuscule)
                words = text.split()
                for i in range(len(words) - 1):
                    if words[i][0].isupper() and words[i+1][0].isupper():
                        name = ' '.join(words[i:i+2])
                        if len(name.split()) >= 2 and name not in names:
                            names.append(name)
        
        return names[:10]  # Limite à 10 noms
    
    async def crawl_site(self, url: str, max_pages: int = 3) -> Dict:
        """Crawl le site web pour extraire les informations"""
        start_time = time.time()
        self.visited_urls.clear()
        
        try:
            # Récupération de la page d'accueil
            main_html = await self.fetch_url(url)
            if not main_html:
                return self._empty_result(url)
            
            self.visited_urls.add(url)
            
            # Extraction des données de la page principale
            result = {
                'website_url': url,
                'emails': self.extract_emails(main_html, url),
                'phones': self.extract_phones(main_html),
                'social_links': self.extract_social_links(main_html, url),
                'executives': [{'name': name, 'linkedin': ''} for name in self.extract_executive_names(main_html)],
            }
            
            # Recherche des pages de contact
            contact_urls = self.find_contact_pages(main_html, url)
            
            # Crawl des pages de contact (limitée)
            tasks = []
            for contact_url in contact_urls[:max_pages-1]:
                if contact_url not in self.visited_urls:
                    tasks.append(self._crawl_page(contact_url, url))
            
            if tasks:
                contact_results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Fusion des résultats
                for contact_result in contact_results:
                    if isinstance(contact_result, dict):
                        # Fusion des emails
                        result['emails'] = list(set(result['emails'] + contact_result.get('emails', [])))
                        # Fusion des téléphones
                        result['phones'] = list(set(result['phones'] + contact_result.get('phones', [])))
                        # Fusion des liens sociaux
                        result['social_links'].update(contact_result.get('social_links', {}))
                        # Fusion des dirigeants
                        existing_names = {exec['name'] for exec in result['executives']}
                        for exec in contact_result.get('executives', []):
                            if exec['name'] not in existing_names:
                                result['executives'].append(exec)
            
            # Vérification du temps d'exécution
            execution_time = time.time() - start_time
            if execution_time > 5:
                logger.warning(f"Temps d'exécution élevé: {execution_time:.2f}s")
            
            return result
            
        except Exception as e:
            logger.error(f"Erreur lors du crawl: {e}")
            return self._empty_result(url)
    
    async def _crawl_page(self, url: str, base_url: str) -> Dict:
        """Crawl une page individuelle"""
        if url in self.visited_urls:
            return {}
            
        self.visited_urls.add(url)
        html = await self.fetch_url(url)
        
        if not html:
            return {}
        
        return {
            'emails': self.extract_emails(html, base_url),
            'phones': self.extract_phones(html),
            'social_links': self.extract_social_links(html, base_url),
            'executives': [{'name': name, 'linkedin': ''} for name in self.extract_executive_names(html)],
        }
    
    def _empty_result(self, url: str) -> Dict:
        """Retourne un résultat vide"""
        return {
            'website_url': url,
            'emails': [],
            'phones': [],
            'social_links': {},
            'executives': [],
        }


async def scrape_website(url: str) -> Dict:
    """
    Fonction principale pour scraper un site web.
    Usage: result = await scrape_website("https://example.com")
    """
    async with WebScraper() as scraper:
        return await scraper.crawl_site(url)


# Fonction synchrone pour compatibilité
def scrape_website_sync(url: str) -> Dict:
    """Version synchrone pour les environnements non-async"""
    return asyncio.run(scrape_website(url))


if __name__ == "__main__":
    # Test du scraper
    import sys
    
    if len(sys.argv) > 1:
        test_url = sys.argv[1]
        print(f"Test du scraper sur: {test_url}")
        
        result = scrape_website_sync(test_url)
        
        print("\n=== RÉSULTATS ===")
        print(f"URL: {result['website_url']}")
        print(f"Emails: {result['emails']}")
        print(f"Téléphones: {result['phones']}")
        print(f"Réseaux sociaux: {result['social_links']}")
        print(f"Dirigeants: {result['executives']}")
    else:
        print("Usage: python scraper.py <url>")