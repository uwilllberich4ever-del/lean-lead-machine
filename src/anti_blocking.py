#!/usr/bin/env python3
"""
Module anti-blocage pour "The Hunter"
Gestion des headers, délais, rotation IP, et respect robots.txt
"""

import random
import time
import asyncio
from typing import Dict, List, Optional, Tuple
import logging
from urllib.parse import urlparse, urljoin
import aiohttp
from aiohttp import ClientSession, ClientTimeout

logger = logging.getLogger(__name__)


class AntiBlockingManager:
    """Gestionnaire anti-blocage pour le scraping web"""
    
    def __init__(self):
        # Pool de User-Agents réalistes
        self.user_agents = [
            # Chrome sur Windows
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
            
            # Firefox sur Windows
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
            
            # Safari sur Mac
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            
            # Chrome sur Linux
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
        ]
        
        # Headers de référence réalistes
        self.base_headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
        }
        
        # Délais configurés
        self.min_delay = 0.5  # secondes
        self.max_delay = 2.0  # secondes
        
        # Cache robots.txt (volatile, durée de vie limitée)
        self._robots_cache = {}
        self._cache_ttl = 300  # 5 minutes
        
        # Statistiques de requêtes
        self.request_count = 0
        self.blocked_count = 0
        
    def get_random_user_agent(self) -> str:
        """Retourne un User-Agent aléatoire"""
        return random.choice(self.user_agents)
    
    def get_headers(self, referer: str = None) -> Dict[str, str]:
        """
        Génère des headers HTTP réalistes
        
        Args:
            referer: URL referer (optionnel)
            
        Returns:
            Dictionnaire de headers
        """
        headers = self.base_headers.copy()
        headers['User-Agent'] = self.get_random_user_agent()
        
        if referer:
            headers['Referer'] = referer
        
        # Ajout d'headers spécifiques au navigateur
        if 'Chrome' in headers['User-Agent']:
            headers['Sec-Ch-Ua'] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"'
            headers['Sec-Ch-Ua-Mobile'] = '?0'
            headers['Sec-Ch-Ua-Platform'] = '"Windows"'
        elif 'Firefox' in headers['User-Agent']:
            headers['DNT'] = '1'
        
        return headers
    
    async def random_delay(self):
        """Délai aléatoire entre les requêtes"""
        delay = random.uniform(self.min_delay, self.max_delay)
        await asyncio.sleep(delay)
        return delay
    
    async def check_robots_txt(self, url: str, session: ClientSession = None) -> Tuple[bool, Optional[str]]:
        """
        Vérifie robots.txt pour une URL
        
        Args:
            url: URL cible
            session: Session aiohttp (optionnel)
            
        Returns:
            Tuple (is_allowed, disallow_reason)
        """
        parsed_url = urlparse(url)
        base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
        robots_url = f"{base_url}/robots.txt"
        
        # Vérification du cache
        cache_key = base_url
        if cache_key in self._robots_cache:
            cached_time, rules = self._robots_cache[cache_key]
            if time.time() - cached_time < self._cache_ttl:
                return self._check_url_against_rules(url, rules, base_url)
        
        try:
            # Récupération de robots.txt
            if session:
                async with session.get(robots_url, timeout=ClientTimeout(total=5)) as response:
                    if response.status == 200:
                        robots_content = await response.text()
                    else:
                        # Si robots.txt n'existe pas, tout est autorisé
                        self._robots_cache[cache_key] = (time.time(), {})
                        return True, None
            else:
                async with aiohttp.ClientSession() as temp_session:
                    async with temp_session.get(robots_url, timeout=ClientTimeout(total=5)) as response:
                        if response.status == 200:
                            robots_content = await response.text()
                        else:
                            self._robots_cache[cache_key] = (time.time(), {})
                            return True, None
            
            # Parsing de robots.txt
            rules = self._parse_robots_txt(robots_content)
            self._robots_cache[cache_key] = (time.time(), rules)
            
            return self._check_url_against_rules(url, rules, base_url)
            
        except Exception as e:
            logger.debug(f"Erreur lors de la vérification de robots.txt: {e}")
            # En cas d'erreur, on autorise par défaut
            return True, None
    
    def _parse_robots_txt(self, content: str) -> Dict[str, List[str]]:
        """
        Parse le contenu de robots.txt
        
        Args:
            content: Contenu de robots.txt
            
        Returns:
            Dictionnaire avec règles par user-agent
        """
        rules = {'*': []}  # Règles par défaut pour tous les user-agents
        current_ua = '*'
        
        for line in content.split('\n'):
            line = line.strip()
            
            # Ignore les commentaires
            if '#' in line:
                line = line.split('#')[0].strip()
            
            if not line:
                continue
            
            # Détection du user-agent
            if line.lower().startswith('user-agent:'):
                current_ua = line.split(':', 1)[1].strip()
                if current_ua not in rules:
                    rules[current_ua] = []
            
            # Détection des règles Disallow
            elif line.lower().startswith('disallow:'):
                path = line.split(':', 1)[1].strip()
                if path and current_ua in rules:
                    rules[current_ua].append(path)
        
        return rules
    
    def _check_url_against_rules(self, url: str, rules: Dict[str, List[str]], base_url: str) -> Tuple[bool, Optional[str]]:
        """
        Vérifie si une URL est autorisée selon les règles robots.txt
        
        Args:
            url: URL à vérifier
            rules: Règles parsées
            base_url: URL de base
            
        Returns:
            Tuple (is_allowed, disallow_reason)
        """
        parsed_url = urlparse(url)
        path = parsed_url.path
        
        # Vérifie les règles pour tous les user-agents
        for ua_pattern in ['*', 'Googlebot', 'Bingbot', 'Slurp', 'DuckDuckBot', 'Baiduspider']:
            if ua_pattern in rules:
                for disallow_path in rules[ua_pattern]:
                    if disallow_path and path.startswith(disallow_path):
                        return False, f"Bloqué par robots.txt pour {ua_pattern}: {disallow_path}"
        
        return True, None
    
    async def make_request(
        self, 
        url: str, 
        session: ClientSession, 
        referer: str = None,
        check_robots: bool = True
    ) -> Optional[aiohttp.ClientResponse]:
        """
        Effectue une requête HTTP avec gestion anti-blocage
        
        Args:
            url: URL cible
            session: Session aiohttp
            referer: URL referer
            check_robots: Vérifier robots.txt
            
        Returns:
            Response aiohttp ou None en cas d'erreur
        """
        self.request_count += 1
        
        # Vérification robots.txt
        if check_robots:
            is_allowed, reason = await self.check_robots_txt(url, session)
            if not is_allowed:
                logger.warning(f"URL bloquée par robots.txt: {url} - {reason}")
                self.blocked_count += 1
                return None
        
        # Délai aléatoire
        delay = await self.random_delay()
        logger.debug(f"Délai de {delay:.2f}s avant requête vers {url}")
        
        # Headers
        headers = self.get_headers(referer)
        
        try:
            # Timeout configurable
            timeout = ClientTimeout(total=10, connect=5, sock_read=5)
            
            # Requête HTTP
            async with session.get(url, headers=headers, timeout=timeout) as response:
                
                # Gestion des codes de statut
                if response.status == 200:
                    return response
                elif response.status == 429:  # Too Many Requests
                    logger.warning(f"Rate limiting détecté sur {url}")
                    self.blocked_count += 1
                    
                    # Attente exponentielle
                    retry_after = response.headers.get('Retry-After')
                    if retry_after:
                        wait_time = int(retry_after)
                    else:
                        wait_time = min(60, 2 ** min(self.blocked_count, 6))
                    
                    logger.info(f"Attente de {wait_time}s avant nouvelle tentative")
                    await asyncio.sleep(wait_time)
                    return None
                    
                elif response.status == 403:  # Forbidden
                    logger.warning(f"Accès interdit à {url}")
                    self.blocked_count += 1
                    return None
                    
                else:
                    logger.debug(f"Statut HTTP {response.status} pour {url}")
                    return None
                    
        except asyncio.TimeoutError:
            logger.warning(f"Timeout pour {url}")
            return None
        except Exception as e:
            logger.error(f"Erreur lors de la requête vers {url}: {e}")
            return None
    
    def get_stats(self) -> Dict[str, int]:
        """Retourne les statistiques de requêtes"""
        return {
            'total_requests': self.request_count,
            'blocked_requests': self.blocked_count,
            'success_rate': ((self.request_count - self.blocked_count) / self.request_count * 100 
                           if self.request_count > 0 else 100),
        }
    
    def clear_cache(self):
        """Vide le cache robots.txt"""
        self._robots_cache.clear()
        logger.debug("Cache robots.txt vidé")


class IPRotationManager:
    """Gestionnaire de rotation IP (placeholder pour implémentation future)"""
    
    def __init__(self):
        self.proxies = []
        self.current_proxy_index = 0
        
    def add_proxy(self, proxy_url: str):
        """Ajoute un proxy à la rotation"""
        self.proxies.append(proxy_url)
        logger.info(f"Proxy ajouté: {proxy_url}")
    
    def get_next_proxy(self) -> Optional[str]:
        """Retourne le prochain proxy de la rotation"""
        if not self.proxies:
            return None
        
        proxy = self.proxies[self.current_proxy_index]
        self.current_proxy_index = (self.current_proxy_index + 1) % len(self.proxies)
        
        return proxy
    
    def validate_proxy(self, proxy_url: str) -> bool:
        """
        Valide un proxy (à implémenter)
        
        Args:
            proxy_url: URL du proxy
            
        Returns:
            True si le proxy est valide
        """
        # Implémentation future: tester la connectivité du proxy
        return True
    
    def get_proxy_stats(self) -> Dict:
        """Retourne les statistiques des proxies"""
        return {
            'total_proxies': len(self.proxies),
            'current_index': self.current_proxy_index,
            'proxies': self.proxies.copy(),
        }


class CAPTCHASolver:
    """Gestionnaire CAPTCHA (placeholder pour fallback manuel)"""
    
    def __init__(self):
        self.captcha_count = 0
        
    def detect_captcha(self, html: str) -> bool:
        """
        Détecte la présence d'un CAPTCHA dans le HTML
        
        Args:
            html: Contenu HTML
            
        Returns:
            True si CAPTCHA détecté
        """
        captcha_indicators = [
            'captcha',
            'recaptcha',
            'hcaptcha',
            'cloudflare',
            'security check',
            'robot check',
        ]
        
        html_lower = html.lower()
        for indicator in captcha_indicators:
            if indicator in html_lower:
                return True
        
        return False
    
    async def solve_captcha(self, html: str, url: str) -> Optional[str]:
        """
        Tente de résoudre un CAPTCHA (fallback manuel)
        
        Args:
            html: Contenu HTML avec CAPTCHA
            url: URL de la page
            
        Returns:
            Solution du CAPTCHA ou None
        """
        self.captcha_count += 1
        logger.warning(f"CAPTCHA détecté sur {url} (#{self.captcha_count})")
        
        # Pour l'instant, retourne None pour indiquer qu'une intervention manuelle est nécessaire
        # Dans une implémentation complète, on pourrait intégrer un service de résolution de CAPTCHA
        return None
    
    def get_stats(self) -> Dict:
        """Retourne les statistiques CAPTCHA"""
        return {
            'captchas_encountered': self.captcha_count,
            'requires_manual_fallback': self.captcha_count > 0,
        }


# Instance globale pour une utilisation facile
anti_blocking = AntiBlockingManager()
ip_rotation = IPRotationManager()
captcha_solver = CAPTCHASolver()


async def test_anti_blocking():
    """Test du module anti-blocage"""
    print("=== Test du module anti-blocage ===")
    
    test_urls = [
        "https://www.google.com/",
        "https://www.github.com/",
        "https://www.wikipedia.org/",
    ]
    
    async with aiohttp.ClientSession() as session:
        for url in test_urls:
            print(f"\nTest de {url}:")
            
            # Vérification robots.txt
            allowed, reason = await anti_blocking.check_robots_txt(url, session)
            print(f"  Robots.txt: {'Autorisé' if allowed else f'Bloqué ({reason})'}")
            
            # Requête avec anti-blocage
            response = await anti_blocking.make_request(url, session)
            if response:
                print(f"  Requête réussie: HTTP {response.status}")
            else:
                print(f"  Requête échouée")
            
            # Délai entre les tests
            await asyncio.sleep(1)
    
    print(f"\nStatistiques: {anti_blocking.get_stats()}")


if __name__ == "__main__":
    # Test du module
    asyncio.run(test_anti_blocking())