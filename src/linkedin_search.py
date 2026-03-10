#!/usr/bin/env python3
"""
Module de recherche LinkedIn pour "The Hunter"
Recherche de profils via Google dorking
"""

import asyncio
import aiohttp
from typing import List, Dict, Optional
import re
import logging
from urllib.parse import quote_plus
import random

logger = logging.getLogger(__name__)

class LinkedInSearcher:
    """Recherche de profils LinkedIn via Google"""
    
    def __init__(self):
        self.session = None
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
        ]
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=15)
        )
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def _build_search_query(self, name: str, company: str = None) -> str:
        """Construit la requête Google dorking pour LinkedIn"""
        query_parts = ['site:linkedin.com/in/']
        
        # Ajoute le nom entre guillemets
        query_parts.append(f'"{name}"')
        
        # Ajoute l'entreprise si fournie
        if company:
            query_parts.append(f'"{company}"')
        
        return ' '.join(query_parts)
    
    async def search_profiles(self, name: str, company: str = None, max_results: int = 5) -> List[Dict]:
        """
        Recherche des profils LinkedIn correspondant au nom et à l'entreprise
        
        Args:
            name: Nom complet de la personne
            company: Nom de l'entreprise (optionnel)
            max_results: Nombre maximum de résultats à retourner
            
        Returns:
            Liste de dictionnaires avec les informations des profils
        """
        if not self.session:
            raise RuntimeError("Session non initialisée")
        
        try:
            # Construction de la requête
            query = self._build_search_query(name, company)
            encoded_query = quote_plus(query)
            
            # URL de recherche Google
            search_url = f"https://www.google.com/search?q={encoded_query}&num={max_results}"
            
            # Headers pour éviter le blocage
            headers = {
                'User-Agent': random.choice(self.user_agents),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Referer': 'https://www.google.com/',
            }
            
            # Délai aléatoire
            await asyncio.sleep(random.uniform(1, 2))
            
            # Requête HTTP
            async with self.session.get(search_url, headers=headers) as response:
                if response.status != 200:
                    logger.warning(f"Statut HTTP {response.status} pour la recherche")
                    return []
                
                html = await response.text()
                
                # Extraction des résultats
                profiles = self._extract_profiles_from_html(html, name, company)
                
                # Limite le nombre de résultats
                return profiles[:max_results]
                
        except Exception as e:
            logger.error(f"Erreur lors de la recherche LinkedIn: {e}")
            return []
    
    def _extract_profiles_from_html(self, html: str, target_name: str, target_company: str = None) -> List[Dict]:
        """
        Extrait les profils LinkedIn des résultats Google
        
        Args:
            html: Contenu HTML de la page de résultats
            target_name: Nom cible pour la validation
            target_company: Entreprise cible pour la validation
            
        Returns:
            Liste de profils extraits et validés
        """
        profiles = []
        
        # Pattern pour les URLs LinkedIn
        linkedin_pattern = r'https?://(?:www\.)?linkedin\.com/in/[a-zA-Z0-9\-_]+'
        
        # Recherche des URLs LinkedIn
        linkedin_urls = re.findall(linkedin_pattern, html)
        
        for url in set(linkedin_urls):  # Supprime les doublons
            try:
                # Extraction basique d'informations depuis l'URL
                profile_id = url.split('/in/')[-1].split('?')[0]
                
                # Construction du profil
                profile = {
                    'url': url,
                    'profile_id': profile_id,
                    'name': self._extract_name_from_url(profile_id),
                    'match_score': self._calculate_match_score(target_name, target_company, profile_id, url),
                }
                
                # Validation basique
                if profile['match_score'] > 0.3:  # Seuil minimum de correspondance
                    profiles.append(profile)
                    
            except Exception as e:
                logger.debug(f"Erreur lors du traitement de l'URL {url}: {e}")
                continue
        
        # Tri par score de correspondance
        profiles.sort(key=lambda x: x['match_score'], reverse=True)
        
        return profiles
    
    def _extract_name_from_url(self, profile_id: str) -> str:
        """Tente d'extraire le nom depuis l'ID de profil"""
        # Remplace les tirets par des espaces
        name = profile_id.replace('-', ' ')
        
        # Capitalise chaque mot
        name = ' '.join(word.capitalize() for word in name.split())
        
        return name
    
    def _calculate_match_score(self, target_name: str, target_company: str, 
                              profile_id: str, profile_url: str) -> float:
        """
        Calcule un score de correspondance entre le profil et la cible
        
        Args:
            target_name: Nom cible
            target_company: Entreprise cible
            profile_id: ID du profil LinkedIn
            profile_url: URL complète du profil
            
        Returns:
            Score entre 0 et 1
        """
        score = 0.0
        
        # Normalisation des noms
        target_name_lower = target_name.lower()
        profile_name = self._extract_name_from_url(profile_id).lower()
        
        # Correspondance exacte du nom
        if target_name_lower == profile_name:
            score += 0.5
        # Correspondance partielle
        elif any(word in profile_name for word in target_name_lower.split()):
            score += 0.3
        # Mots communs
        else:
            target_words = set(target_name_lower.split())
            profile_words = set(profile_name.split())
            common_words = target_words.intersection(profile_words)
            if common_words:
                score += 0.1 * len(common_words)
        
        # Vérification de l'entreprise dans l'URL
        if target_company:
            target_company_lower = target_company.lower()
            if target_company_lower in profile_url.lower():
                score += 0.4
        
        # Bonus pour les profils avec nom complet
        if len(profile_name.split()) >= 2:
            score += 0.1
        
        return min(score, 1.0)  # Limite à 1.0
    
    async def validate_profile(self, profile_url: str, target_name: str, target_company: str = None) -> Dict:
        """
        Valide un profil LinkedIn spécifique
        
        Args:
            profile_url: URL du profil LinkedIn
            target_name: Nom attendu
            target_company: Entreprise attendue
            
        Returns:
            Dictionnaire avec les informations validées
        """
        if not self.session:
            raise RuntimeError("Session non initialisée")
        
        try:
            # Headers pour éviter le blocage
            headers = {
                'User-Agent': random.choice(self.user_agents),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            }
            
            # Délai aléatoire
            await asyncio.sleep(random.uniform(1, 2))
            
            # Récupération de la page publique
            async with self.session.get(profile_url, headers=headers) as response:
                if response.status != 200:
                    return {
                        'url': profile_url,
                        'valid': False,
                        'error': f"HTTP {response.status}",
                        'match_score': 0.0
                    }
                
                html = await response.text()
                
                # Extraction des informations publiques
                public_info = self._extract_public_info(html)
                
                # Calcul du score de correspondance
                match_score = self._calculate_match_score(
                    target_name, target_company, 
                    profile_url.split('/in/')[-1].split('?')[0], 
                    profile_url
                )
                
                # Validation
                is_valid = match_score > 0.5
                
                return {
                    'url': profile_url,
                    'valid': is_valid,
                    'match_score': match_score,
                    'public_info': public_info,
                    'name': target_name,
                    'company': target_company,
                }
                
        except Exception as e:
            logger.error(f"Erreur lors de la validation du profil: {e}")
            return {
                'url': profile_url,
                'valid': False,
                'error': str(e),
                'match_score': 0.0
            }
    
    def _extract_public_info(self, html: str) -> Dict:
        """Extrait les informations publiques d'une page LinkedIn"""
        info = {
            'title': '',
            'location': '',
            'company': '',
            'education': '',
        }
        
        try:
            # Recherche de titres et entreprises (patterns simplifiés)
            title_patterns = [
                r'<title[^>]*>([^<]+)</title>',
                r'og:title["\']\s*content=["\']([^"\']+)["\']',
                r'<h1[^>]*>([^<]+)</h1>',
            ]
            
            for pattern in title_patterns:
                match = re.search(pattern, html, re.IGNORECASE)
                if match:
                    info['title'] = match.group(1).strip()
                    break
            
            # Recherche de localisation
            location_patterns = [
                r'location["\']\s*:["\']\s*([^"\']+)["\']',
                r'<span[^>]*class=["\'][^"\']*location[^"\']*["\'][^>]*>([^<]+)</span>',
            ]
            
            for pattern in location_patterns:
                match = re.search(pattern, html, re.IGNORECASE)
                if match:
                    info['location'] = match.group(1).strip()
                    break
            
            # Recherche d'entreprise
            company_patterns = [
                r'company["\']\s*:["\']\s*([^"\']+)["\']',
                r'<span[^>]*class=["\'][^"\']*company[^"\']*["\'][^>]*>([^<]+)</span>',
            ]
            
            for pattern in company_patterns:
                match = re.search(pattern, html, re.IGNORECASE)
                if match:
                    info['company'] = match.group(1).strip()
                    break
            
        except Exception as e:
            logger.debug(f"Erreur lors de l'extraction d'informations: {e}")
        
        return info


async def search_linkedin_profiles(name: str, company: str = None, max_results: int = 5) -> List[Dict]:
    """
    Fonction principale pour rechercher des profils LinkedIn
    
    Args:
        name: Nom complet de la personne
        company: Nom de l'entreprise (optionnel)
        max_results: Nombre maximum de résultats
        
    Returns:
        Liste de profils trouvés
    """
    async with LinkedInSearcher() as searcher:
        return await searcher.search_profiles(name, company, max_results)


async def enrich_executives_with_linkedin(executives: List[Dict], company: str = None) -> List[Dict]:
    """
    Enrichit une liste de dirigeants avec leurs profils LinkedIn
    
    Args:
        executives: Liste de dictionnaires avec clé 'name'
        company: Nom de l'entreprise pour la validation
        
    Returns:
        Liste enrichie avec les URLs LinkedIn
    """
    enriched = []
    
    async with LinkedInSearcher() as searcher:
        tasks = []
        for exec in executives:
            name = exec.get('name')
            if name:
                tasks.append(searcher.search_profiles(name, company, max_results=1))
        
        # Recherche parallèle
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for i, exec in enumerate(executives):
            enriched_exec = exec.copy()
            
            if i < len(results) and not isinstance(results[i], Exception):
                profiles = results[i]
                if profiles:
                    # Prend le meilleur profil
                    best_profile = profiles[0]
                    enriched_exec['linkedin'] = best_profile['url']
                    enriched_exec['linkedin_match_score'] = best_profile['match_score']
                else:
                    enriched_exec['linkedin'] = ''
                    enriched_exec['linkedin_match_score'] = 0.0
            else:
                enriched_exec['linkedin'] = ''
                enriched_exec['linkedin_match_score'] = 0.0
            
            enriched.append(enriched_exec)
    
    return enriched


# Fonction synchrone pour compatibilité
def search_linkedin_profiles_sync(name: str, company: str = None, max_results: int = 5) -> List[Dict]:
    """Version synchrone"""
    return asyncio.run(search_linkedin_profiles(name, company, max_results))


def enrich_executives_with_linkedin_sync(executives: List[Dict], company: str = None) -> List[Dict]:
    """Version synchrone"""
    return asyncio.run(enrich_executives_with_linkedin(executives, company))


if __name__ == "__main__":
    # Test du module LinkedIn
    import sys
    
    if len(sys.argv) > 1:
        test_name = sys.argv[1]
        test_company = sys.argv[2] if len(sys.argv) > 2 else None
        
        print(f"Recherche LinkedIn pour: {test_name}")
        if test_company:
            print(f"Entreprise: {test_company}")
        
        results = search_linkedin_profiles_sync(test_name, test_company, max_results=3)
        
        print("\n=== RÉSULTATS ===")
        for i, profile in enumerate(results, 1):
            print(f"\nProfil {i}:")
            print(f"  URL: {profile['url']}")
            print(f"  Nom: {profile['name']}")
            print(f"  Score: {profile['match_score']:.2f}")
    else:
        print("Usage: python linkedin_search.py <nom> [entreprise]")