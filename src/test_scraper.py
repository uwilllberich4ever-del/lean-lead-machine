#!/usr/bin/env python3
"""
Script de test pour le scraper "The Hunter"
Teste tous les modules avec des URLs de test
"""

import asyncio
import time
import json
import sys
from typing import Dict, List

# Import des modules
from scraper import scrape_website, WebScraper
from linkedin_search import search_linkedin_profiles, enrich_executives_with_linkedin
from anti_blocking import anti_blocking, test_anti_blocking
from api_service import _extract_company_name


async def test_web_scraper(url: str) -> Dict:
    """Test du module de scraping web"""
    print(f"\n{'='*60}")
    print(f"Test du scraper web: {url}")
    print('='*60)
    
    start_time = time.time()
    
    try:
        result = await scrape_website(url)
        execution_time = time.time() - start_time
        
        print(f"Temps d'exécution: {execution_time:.2f}s")
        print(f"Emails trouvés: {len(result['emails'])}")
        print(f"Téléphones trouvés: {len(result['phones'])}")
        print(f"Liens sociaux trouvés: {len(result['social_links'])}")
        print(f"Dirigeants trouvés: {len(result['executives'])}")
        
        if result['emails']:
            print(f"\nEmails: {result['emails'][:5]}")  # Affiche les 5 premiers
        if result['phones']:
            print(f"Téléphones: {result['phones'][:5]}")
        if result['social_links']:
            print(f"Réseaux sociaux: {list(result['social_links'].items())[:3]}")
        if result['executives']:
            print(f"Dirigeants: {[e['name'] for e in result['executives'][:3]]}")
        
        # Vérification des contraintes
        if execution_time > 5:
            print(f"⚠️  ATTENTION: Temps d'exécution > 5s: {execution_time:.2f}s")
        
        return result
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return {}


async def test_linkedin_search(name: str, company: str = None):
    """Test du module de recherche LinkedIn"""
    print(f"\n{'='*60}")
    print(f"Test recherche LinkedIn: {name}")
    if company:
        print(f"Entreprise: {company}")
    print('='*60)
    
    start_time = time.time()
    
    try:
        profiles = await search_linkedin_profiles(name, company, max_results=3)
        execution_time = time.time() - start_time
        
        print(f"Temps d'exécution: {execution_time:.2f}s")
        print(f"Profils trouvés: {len(profiles)}")
        
        for i, profile in enumerate(profiles, 1):
            print(f"\nProfil {i}:")
            print(f"  URL: {profile['url']}")
            print(f"  Nom: {profile['name']}")
            print(f"  Score: {profile['match_score']:.2f}")
        
        return profiles
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return []


async def test_enrichment(executives: List[Dict], company: str = None):
    """Test de l'enrichissement avec LinkedIn"""
    print(f"\n{'='*60}")
    print(f"Test enrichissement LinkedIn")
    print(f"Dirigeants: {len(executives)}")
    if company:
        print(f"Entreprise: {company}")
    print('='*60)
    
    if not executives:
        print("Aucun dirigeant à enrichir")
        return []
    
    start_time = time.time()
    
    try:
        enriched = await enrich_executives_with_linkedin(executives, company)
        execution_time = time.time() - start_time
        
        print(f"Temps d'exécution: {execution_time:.2f}s")
        
        for i, exec in enumerate(enriched, 1):
            print(f"\nDirigeant {i}: {exec['name']}")
            if exec.get('linkedin'):
                print(f"  LinkedIn: {exec['linkedin']}")
                print(f"  Score: {exec.get('linkedin_match_score', 0):.2f}")
            else:
                print(f"  LinkedIn: Non trouvé")
        
        return enriched
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return executives


async def test_complete_pipeline(url: str):
    """Test du pipeline complet"""
    print(f"\n{'='*60}")
    print(f"TEST COMPLET DU PIPELINE")
    print(f"URL: {url}")
    print('='*60)
    
    pipeline_start = time.time()
    
    # Étape 1: Scraping web
    print("\n1. Scraping web...")
    scrape_result = await test_web_scraper(url)
    
    if not scrape_result:
        print("❌ Échec du scraping web")
        return
    
    # Étape 2: Extraction nom entreprise
    company_name = _extract_company_name(url, scrape_result)
    print(f"\n2. Entreprise détectée: {company_name}")
    
    # Étape 3: Enrichissement LinkedIn
    if scrape_result.get('executives'):
        print("\n3. Enrichissement LinkedIn...")
        enriched_executives = await test_enrichment(
            scrape_result['executives'], 
            company_name
        )
        scrape_result['executives'] = enriched_executives
    
    # Étape 4: Formatage final
    print("\n4. Formatage des résultats...")
    
    final_result = {
        'website_url': scrape_result['website_url'],
        'execution_time': time.time() - pipeline_start,
        'data': {
            'emails': scrape_result['emails'],
            'phones': scrape_result['phones'],
            'social_links': scrape_result['social_links'],
            'executives': scrape_result['executives'],
        },
        'metadata': {
            'emails_count': len(scrape_result['emails']),
            'phones_count': len(scrape_result['phones']),
            'social_links_count': len(scrape_result['social_links']),
            'executives_count': len(scrape_result['executives']),
        }
    }
    
    # Affichage du résultat JSON
    print("\n" + "="*60)
    print("RÉSULTAT FINAL (format API):")
    print("="*60)
    print(json.dumps(final_result, indent=2, ensure_ascii=False))
    
    # Vérification des contraintes
    print("\n" + "="*60)
    print("VÉRIFICATION DES CONTRAINTES:")
    print("="*60)
    
    total_time = final_result['execution_time']
    if total_time <= 5:
        print(f"✅ Temps d'exécution: {total_time:.2f}s (< 5s)")
    else:
        print(f"❌ Temps d'exécution: {total_time:.2f}s (> 5s)")
    
    data_present = any([
        final_result['metadata']['emails_count'] > 0,
        final_result['metadata']['phones_count'] > 0,
        final_result['metadata']['social_links_count'] > 0,
        final_result['metadata']['executives_count'] > 0,
    ])
    
    if data_present:
        print("✅ Données extraites avec succès")
    else:
        print("⚠️  Aucune donnée extraite")
    
    print(f"\nPipeline terminé en {total_time:.2f} secondes")


async def run_all_tests():
    """Exécute tous les tests"""
    print("🧪 LANCEMENT DES TESTS DU SCRAPER 'THE HUNTER'")
    print("="*60)
    
    # URLs de test (sites publics avec informations de contact)
    test_urls = [
        "https://www.python.org/",
        "https://www.github.com/",
        "https://www.wikipedia.org/",
    ]
    
    # Test anti-blocage
    print("\n🔧 Test du module anti-blocage...")
    await test_anti_blocking()
    
    # Test recherche LinkedIn
    print("\n🔍 Test recherche LinkedIn...")
    await test_linkedin_search("Guido van Rossum", "Python")
    
    # Tests de scraping
    for url in test_urls[:1]:  # Test avec une seule URL pour éviter la surcharge
        await test_complete_pipeline(url)
    
    print("\n" + "="*60)
    print("✅ TOUS LES TESTS TERMINÉS")
    print("="*60)


def main():
    """Fonction principale"""
    if len(sys.argv) > 1:
        # Test avec une URL spécifique
        url = sys.argv[1]
        asyncio.run(test_complete_pipeline(url))
    else:
        # Tests complets
        asyncio.run(run_all_tests())


if __name__ == "__main__":
    main()