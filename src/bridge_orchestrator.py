#!/usr/bin/env python3
"""
Orchestrateur principal pour le projet Lean Lead Machine
Gère le flux complet: MCP -> Google Places -> Supabase
"""

import os
import sys
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import json
from dataclasses import asdict
import time

# Import des modules locaux
from mcp_client import MCPClient, EntrepriseInfo
from google_matcher import GooglePlacesMatcher, MatchingResult

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('bridge_orchestrator.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class BridgeOrchestrator:
    """Orchestrateur principal du système de bridge"""
    
    def __init__(self):
        """Initialise l'orchestrateur avec tous les clients"""
        # Clients API
        self.mcp_client = MCPClient()
        self.google_matcher = None
        
        # Configuration
        self.batch_size = 10  # Nombre d'entreprises à traiter par batch
        self.max_retries = 3  # Nombre maximum de tentatives par entreprise
        self.cache_ttl_hours = 24  # Durée de vie du cache
        
        # Initialisation différée du matcher Google (nécessite API key)
        google_api_key = os.getenv('GOOGLE_PLACES_API_KEY')
        if google_api_key:
            self.google_matcher = GooglePlacesMatcher(api_key=google_api_key)
        else:
            logger.warning("Clé API Google Places non configurée")
    
    def process_siren(self, siren: str, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Traite un SIREN spécifique
        
        Args:
            siren: Numéro SIREN à traiter
            force_refresh: Force le re-traitement même si en cache
            
        Returns:
            Résultat du traitement
        """
        logger.info(f"Début du traitement pour SIREN: {siren}")
        
        # Vérification du cache (à implémenter avec Supabase)
        cached_result = self._get_cached_result(siren)
        if cached_result and not force_refresh:
            logger.info(f"Résultat en cache pour SIREN {siren}")
            return cached_result
        
        # Étape 1: Récupération des données MCP
        entreprise = self.mcp_client.donnees_unifiees(siren)
        if not entreprise:
            return {
                'siren': siren,
                'status': 'error',
                'error': 'Données MCP non disponibles',
                'timestamp': datetime.now().isoformat()
            }
        
        # Étape 2: Matching Google Places
        if not self.google_matcher:
            return {
                'siren': siren,
                'status': 'error',
                'error': 'Google Places API non configurée',
                'entreprise_info': asdict(entreprise),
                'timestamp': datetime.now().isoformat()
            }
        
        matching_result = self.google_matcher.find_place_id(entreprise)
        
        # Étape 3: Préparation du résultat
        result = {
            'siren': siren,
            'status': 'completed',
            'entreprise_info': asdict(entreprise),
            'matching_result': asdict(matching_result),
            'processed_at': datetime.now().isoformat(),
            'cache_until': (datetime.now() + timedelta(hours=self.cache_ttl_hours)).isoformat()
        }
        
        # Étape 4: Sauvegarde en base (à implémenter)
        self._save_to_database(result)
        
        # Étape 5: Mise en cache
        self._cache_result(siren, result)
        
        logger.info(f"Traitement terminé pour SIREN {siren}: score={matching_result.confidence_score}")
        return result
    
    def process_batch(self, sirens: List[str]) -> Dict[str, Any]:
        """
        Traite un batch de SIRENs
        
        Args:
            sirens: Liste de numéros SIREN
            
        Returns:
            Statistiques du batch
        """
        logger.info(f"Début du traitement batch: {len(sirens)} SIRENs")
        
        results = {
            'total': len(sirens),
            'successful': 0,
            'failed': 0,
            'cached': 0,
            'results': [],
            'start_time': datetime.now().isoformat()
        }
        
        for i, siren in enumerate(sirens, 1):
            logger.info(f"Traitement {i}/{len(sirens)}: {siren}")
            
            try:
                result = self.process_siren(siren)
                results['results'].append(result)
                
                if result['status'] == 'completed':
                    results['successful'] += 1
                elif 'cached' in result.get('notes', ''):
                    results['cached'] += 1
                else:
                    results['failed'] += 1
                    
            except Exception as e:
                logger.error(f"Erreur lors du traitement de {siren}: {e}")
                results['failed'] += 1
                results['results'].append({
                    'siren': siren,
                    'status': 'error',
                    'error': str(e)
                })
            
            # Pause pour respecter les quotas
            if i % 5 == 0:
                time.sleep(1)
        
        results['end_time'] = datetime.now().isoformat()
        results['duration_seconds'] = (datetime.fromisoformat(results['end_time']) - 
                                      datetime.fromisoformat(results['start_time'])).total_seconds()
        
        logger.info(f"Batch terminé: {results['successful']} succès, {results['failed']} échecs, {results['cached']} en cache")
        return results
    
    def search_and_process(self, query: str, limit: int = 10) -> Dict[str, Any]:
        """
        Recherche des entreprises et traite les résultats
        
        Args:
            query: Terme de recherche
            limit: Nombre maximum de résultats à traiter
            
        Returns:
            Résultats du traitement
        """
        logger.info(f"Recherche et traitement: '{query}' (limit: {limit})")
        
        # Recherche MCP
        search_results = self.mcp_client.recherche_entreprises(query, limit=limit)
        
        if not search_results:
            return {
                'query': query,
                'status': 'no_results',
                'message': 'Aucun résultat trouvé',
                'timestamp': datetime.now().isoformat()
            }
        
        # Extraction des SIRENs
        sirens = [result['siren'] for result in search_results if 'siren' in result]
        
        # Traitement du batch
        batch_results = self.process_batch(sirens[:limit])
        
        return {
            'query': query,
            'search_results_count': len(search_results),
            'batch_results': batch_results,
            'timestamp': datetime.now().isoformat()
        }
    
    def _get_cached_result(self, siren: str) -> Optional[Dict[str, Any]]:
        """
        Récupère un résultat depuis le cache
        
        Args:
            siren: Numéro SIREN
            
        Returns:
            Résultat en cache ou None
        """
        # À implémenter avec Supabase
        # Pour l'instant, retourne toujours None
        return None
    
    def _cache_result(self, siren: str, result: Dict[str, Any]):
        """
        Met un résultat en cache
        
        Args:
            siren: Numéro SIREN
            result: Résultat à mettre en cache
        """
        # À implémenter avec Supabase
        pass
    
    def _save_to_database(self, result: Dict[str, Any]):
        """
        Sauvegarde un résultat dans la base de données
        
        Args:
            result: Résultat à sauvegarder
        """
        # À implémenter avec Supabase
        logger.info(f"À sauvegarder en base: SIREN {result['siren']}")
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Retourne des statistiques sur le traitement
        
        Returns:
            Statistiques
        """
        # À implémenter avec Supabase
        return {
            'status': 'not_implemented',
            'message': 'Statistiques à implémenter avec Supabase',
            'timestamp': datetime.now().isoformat()
        }


def main():
    """Fonction principale pour les tests"""
    print("=== Bridge Orchestrator - Lean Lead Machine ===\n")
    
    orchestrator = BridgeOrchestrator()
    
    # Test de configuration
    print("1. Test de configuration:")
    print(f"   MCP Client: {'✓' if orchestrator.mcp_client else '✗'}")
    print(f"   Google Matcher: {'✓' if orchestrator.google_matcher else '✗'}")
    
    if not orchestrator.google_matcher:
        print("\n⚠️  Attention: Google Places API non configurée")
        print("   Définissez la variable d'environnement GOOGLE_PLACES_API_KEY")
    
    # Menu interactif
    while True:
        print("\n" + "="*50)
        print("Menu:")
        print("  1. Traiter un SIREN spécifique")
        print("  2. Rechercher et traiter des entreprises")
        print("  3. Traiter un batch de SIRENs")
        print("  4. Quitter")
        
        choice = input("\nVotre choix (1-4): ").strip()
        
        if choice == '1':
            siren = input("SIREN (9 chiffres): ").strip()
            if len(siren) != 9 or not siren.isdigit():
                print("❌ SIREN invalide. Doit contenir 9 chiffres.")
                continue
            
            print(f"\nTraitement de {siren}...")
            result = orchestrator.process_siren(siren)
            
            print(f"\nRésultat:")
            print(f"  Statut: {result.get('status')}")
            
            if 'matching_result' in result:
                mr = result['matching_result']
                print(f"  Place ID: {mr.get('google_place_id', 'Non trouvé')}")
                print(f"  Site web: {mr.get('website_url', 'Non trouvé')}")
                print(f"  Score: {mr.get('confidence_score', 0)}/100")
                print(f"  Validation: {mr.get('validation_status', 'N/A')}")
        
        elif choice == '2':
            query = input("Terme de recherche: ").strip()
            limit = input("Nombre maximum de résultats [10]: ").strip()
            limit = int(limit) if limit.isdigit() else 10
            
            print(f"\nRecherche de '{query}'...")
            result = orchestrator.search_and_process(query, limit)
            
            print(f"\nRésultats de la recherche:")
            print(f"  Requête: {result.get('query')}")
            print(f"  Résultats trouvés: {result.get('search_results_count', 0)}")
            
            if 'batch_results' in result:
                br = result['batch_results']
                print(f"  Traités: {br.get('total', 0)}")
                print(f"  Succès: {br.get('successful', 0)}")
                print(f"  Échecs: {br.get('failed', 0)}")
                print(f"  Durée: {br.get('duration_seconds', 0):.1f}s")
        
        elif choice == '3':
            sirens_input = input("SIRENs (séparés par des virgules): ").strip()
            sirens = [s.strip() for s in sirens_input.split(',') if s.strip()]
            
            # Validation des SIRENs
            valid_sirens = []
            for siren in sirens:
                if len(siren) == 9 and siren.isdigit():
                    valid_sirens.append(siren)
                else:
                    print(f"⚠️  SIREN invalide ignoré: {siren}")
            
            if not valid_sirens:
                print("❌ Aucun SIREN valide fourni")
                continue
            
            print(f"\nTraitement de {len(valid_sirens)} SIRENs...")
            result = orchestrator.process_batch(valid_sirens)
            
            print(f"\nRésultats du batch:")
            print(f"  Total: {result.get('total', 0)}")
            print(f"  Succès: {result.get('successful', 0)}")
            print(f"  Échecs: {result.get('failed', 0)}")
            print(f"  En cache: {result.get('cached', 0)}")
            print(f"  Durée: {result.get('duration_seconds', 0):.1f}s")
        
        elif choice == '4':
            print("\nAu revoir!")
            break
        
        else:
            print("❌ Choix invalide. Veuillez choisir 1-4.")


if __name__ == "__main__":
    main()