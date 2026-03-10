#!/usr/bin/env python3
"""
Script de test pour valider le système complet du Bridge Builder
"""

import os
import sys
import json
from datetime import datetime

def test_mcp_client():
    """Test du client MCP"""
    print("=== Test du client MCP ===")
    
    try:
        from mcp_client import MCPClient
        
        client = MCPClient()
        
        # Test de recherche
        print("1. Test de recherche...")
        results = client.recherche_entreprises("Google", limit=2)
        print(f"   Résultats: {len(results)}")
        for i, result in enumerate(results, 1):
            print(f"   {i}. {result.get('nom_complet', 'N/A')}")
        
        # Test données unifiées (avec un SIREN connu)
        print("\n2. Test données unifiées...")
        test_sirens = ["552032534", "379750044"]  # Exemples de SIRENs
        for siren in test_sirens:
            entreprise = client.donnees_unifiees(siren)
            if entreprise:
                print(f"   SIREN {siren}: {entreprise.nom_complet}")
                print(f"   Adresse: {entreprise.adresse}")
                if entreprise.gps_lat and entreprise.gps_lng:
                    print(f"   GPS: {entreprise.gps_lat}, {entreprise.gps_lng}")
            else:
                print(f"   SIREN {siren}: Données non disponibles")
        
        # Test quotas
        print("\n3. Test quotas...")
        quota = client.get_quota_info()
        print(f"   Requêtes restantes: {quota['remaining']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def test_google_matcher():
    """Test du matcher Google Places"""
    print("\n=== Test du matcher Google Places ===")
    
    api_key = os.getenv('GOOGLE_PLACES_API_KEY')
    if not api_key:
        print("⚠️  Clé API Google Places non configurée")
        print("   Définissez GOOGLE_PLACES_API_KEY pour tester cette fonctionnalité")
        return None
    
    try:
        from mcp_client import EntrepriseInfo
        from google_matcher import GooglePlacesMatcher
        
        matcher = GooglePlacesMatcher(api_key=api_key)
        
        # Création d'une entreprise de test
        test_entreprise = EntrepriseInfo(
            siren="123456789",
            nom_complet="GOOGLE FRANCE",
            nom_raison_sociale="GOOGLE FRANCE",
            adresse="8 RUE DE LONDRES 75009 PARIS",
            code_postal="75009",
            ville="PARIS",
            departement="75",
            region="ILE-DE-FRANCE",
            activite_principale="Programmation informatique",
            tranche_effectif="500 à 999 salariés",
            date_creation="2000-01-01",
            etat_administratif="Actif",
            gps_lat=48.8792,
            gps_lng=2.3285
        )
        
        print("1. Test de matching...")
        result = matcher.find_place_id(test_entreprise)
        
        print(f"   Place ID: {result.google_place_id or 'Non trouvé'}")
        print(f"   Site web: {result.website_url or 'Non trouvé'}")
        print(f"   Score: {result.confidence_score}/100")
        print(f"   Validation: {result.validation_status}")
        
        if result.google_place_id:
            print("\n2. Test détails du lieu...")
            details = matcher.get_place_details(result.google_place_id)
            if details:
                print(f"   Nom: {details.get('name')}")
                print(f"   Adresse: {details.get('formatted_address')}")
                print(f"   Téléphone: {details.get('formatted_phone_number')}")
                print(f"   Note: {details.get('rating')}/5 ({details.get('user_ratings_total', 0)} avis)")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def test_orchestrator():
    """Test de l'orchestrateur"""
    print("\n=== Test de l'orchestrateur ===")
    
    try:
        from bridge_orchestrator import BridgeOrchestrator
        
        orchestrator = BridgeOrchestrator()
        
        print("1. Test configuration...")
        print(f"   MCP Client: {'✓' if orchestrator.mcp_client else '✗'}")
        print(f"   Google Matcher: {'✓' if orchestrator.google_matcher else '✗'}")
        
        # Test avec un SIREN simple
        print("\n2. Test traitement SIREN...")
        test_siren = "552032534"  # Exemple
        
        result = orchestrator.process_siren(test_siren)
        print(f"   SIREN: {result['siren']}")
        print(f"   Statut: {result['status']}")
        
        if 'matching_result' in result:
            mr = result['matching_result']
            print(f"   Place ID: {mr.get('google_place_id', 'Non trouvé')}")
            print(f"   Score: {mr.get('confidence_score', 0)}/100")
        
        # Test recherche
        print("\n3. Test recherche...")
        search_result = orchestrator.search_and_process("Boulangerie", limit=2)
        print(f"   Requête: {search_result['query']}")
        print(f"   Résultats trouvés: {search_result['search_results_count']}")
        
        if 'batch_results' in search_result:
            br = search_result['batch_results']
            print(f"   Traités: {br['total']}")
            print(f"   Succès: {br['successful']}")
            print(f"   Échecs: {br['failed']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def test_api():
    """Test de l'API (simulé)"""
    print("\n=== Test de l'API (simulé) ===")
    
    try:
        # Vérification des endpoints
        endpoints = [
            ("GET", "/", "Endpoint racine"),
            ("GET", "/health", "Health check"),
            ("GET", "/siren/{siren}", "Info SIREN"),
            ("POST", "/search", "Recherche"),
            ("POST", "/batch", "Batch"),
            ("GET", "/stats", "Statistiques"),
            ("GET", "/quotas", "Quotas"),
        ]
        
        print("Endpoints disponibles:")
        for method, path, desc in endpoints:
            print(f"   {method:6} {path:20} - {desc}")
        
        # Test de format de réponse
        print("\nFormat de réponse attendu pour /siren/{siren}:")
        sample_response = {
            "siren": "123456789",
            "google_place_id": "ChIJ...",
            "website_url": "https://example.com",
            "confidence_score": 85,
            "status": "completed",
            "processed_at": datetime.now().isoformat(),
            "cache_until": (datetime.now().isoformat()),
            "validation_status": "validated",
            "gps_distance_km": 0.125
        }
        
        print(json.dumps(sample_response, indent=2, ensure_ascii=False))
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def test_schema():
    """Test du schéma SQL"""
    print("\n=== Test du schéma SQL ===")
    
    try:
        with open('bridge_schema.sql', 'r') as f:
            content = f.read()
        
        # Vérifications basiques
        checks = [
            ("CREATE TABLE bridge", "Table bridge"),
            ("siren VARCHAR(9) PRIMARY KEY", "Colonne siren"),
            ("google_place_id VARCHAR(255)", "Colonne google_place_id"),
            ("website_url VARCHAR(500)", "Colonne website_url"),
            ("confidence_score INTEGER", "Colonne confidence_score"),
            ("gps_lat DECIMAL(10, 8)", "Colonne gps_lat"),
            ("gps_lng DECIMAL(11, 8)", "Colonne gps_lng"),
            ("last_mapped_at TIMESTAMP", "Colonne last_mapped_at"),
            ("CREATE INDEX", "Index créés"),
            ("CREATE OR REPLACE VIEW", "Vue bridge_stats"),
        ]
        
        all_ok = True
        for check, description in checks:
            if check in content:
                print(f"   ✓ {description}")
            else:
                print(f"   ✗ {description}")
                all_ok = False
        
        # Vérification des contraintes
        constraints = [
            "CHECK (confidence_score >= 0 AND confidence_score <= 100)",
            "CHECK (siren ~ '^[0-9]{9}$')",
            "CHECK (gps_lat BETWEEN -90 AND 90 AND gps_lng BETWEEN -180 AND 180)",
        ]
        
        print("\nContraintes:")
        for constraint in constraints:
            if constraint in content:
                print(f"   ✓ {constraint[:50]}...")
            else:
                print(f"   ✗ {constraint[:50]}...")
                all_ok = False
        
        return all_ok
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def main():
    """Fonction principale de test"""
    print("="*60)
    print("TEST COMPLET DU SYSTÈME BRIDGE BUILDER")
    print("="*60)
    
    results = {}
    
    # Exécution des tests
    results['mcp_client'] = test_mcp_client()
    results['google_matcher'] = test_google_matcher()
    results['orchestrator'] = test_orchestrator()
    results['api'] = test_api()
    results['schema'] = test_schema()
    
    # Résumé
    print("\n" + "="*60)
    print("RÉSUMÉ DES TESTS")
    print("="*60)
    
    total_tests = len(results)
    passed_tests = sum(1 for r in results.values() if r)
    
    for test_name, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        if result is None:
            status = "⚠ SKIP"
        print(f"{test_name:20} {status}")
    
    print("\n" + "="*60)
    print(f"Total: {passed_tests}/{total_tests} tests passés")
    
    if passed_tests == total_tests:
        print("✅ Tous les tests sont passés avec succès!")
    else:
        print("⚠️  Certains tests ont échoué ou ont été ignorés")
    
    # Recommandations
    print("\n" + "="*60)
    print("RECOMMANDATIONS POUR LA MISE EN PRODUCTION")
    print("="*60)
    
    recommendations = [
        "1. Configurez GOOGLE_PLACES_API_KEY dans .env",
        "2. Déployez le schéma SQL sur Supabase/PostgreSQL",
        "3. Configurez les variables d'environnement de production",
        "4. Mettez en place un système de monitoring",
        "5. Configurez les limites de taux d'appel (rate limiting)",
        "6. Mettez en place des sauvegardes régulières",
        "7. Configurez HTTPS pour l'API",
        "8. Mettez en place des logs centralisés",
        "9. Configurez des alertes pour les quotas API",
        "10. Testez avec des données réelles avant le déploiement",
    ]
    
    for rec in recommendations:
        print(f"   {rec}")
    
    return passed_tests == total_tests

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)