#!/usr/bin/env python3
"""
Module de matching SIREN -> Google PlaceID
Utilise les données MCP et l'API Google Places
"""

import os
import googlemaps
from typing import Optional, Dict, Any, Tuple
import logging
from dataclasses import dataclass
from fuzzywuzzy import fuzz
from geopy.distance import geodesic
import re

from mcp_client import EntrepriseInfo

logger = logging.getLogger(__name__)

@dataclass
class MatchingResult:
    """Résultat d'un matching entreprise -> Google Places"""
    siren: str
    google_place_id: Optional[str] = None
    website_url: Optional[str] = None
    confidence_score: int = 0
    matched_name: Optional[str] = None
    matched_address: Optional[str] = None
    validation_status: str = "pending"  # pending, validated, rejected
    validation_notes: Optional[str] = None
    gps_distance_km: Optional[float] = None

class GooglePlacesMatcher:
    """Service de matching avec Google Places API"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialise le matcher Google Places
        
        Args:
            api_key: Clé API Google Places
        """
        self.api_key = api_key or os.getenv('GOOGLE_PLACES_API_KEY')
        if not self.api_key:
            raise ValueError("Clé API Google Places requise")
        
        self.gmaps = googlemaps.Client(key=self.api_key)
        
        # Configuration du matching
        self.min_confidence_score = 70  # Score minimum pour accepter un match
        self.max_gps_distance_km = 1.0  # Distance maximum entre coordonnées INSEE et Google
        self.name_similarity_threshold = 80  # Seuil de similarité des noms
        self.address_similarity_threshold = 75  # Seuil de similarité des adresses
    
    def find_place_id(self, entreprise: EntrepriseInfo) -> MatchingResult:
        """
        Trouve le Google PlaceID pour une entreprise
        
        Args:
            entreprise: Informations de l'entreprise depuis MCP
            
        Returns:
            Résultat du matching
        """
        result = MatchingResult(siren=entreprise.siren)
        
        try:
            # Étape 1: Recherche par nom et adresse
            search_query = self._build_search_query(entreprise)
            logger.info(f"Recherche Google Places: {search_query}")
            
            # Recherche textuelle
            places_result = self.gmaps.find_place(
                input=search_query,
                input_type='textquery',
                fields=['place_id', 'name', 'formatted_address', 'website', 'geometry']
            )
            
            if places_result.get('status') != 'OK' or not places_result.get('candidates'):
                logger.warning(f"Aucun résultat Google Places pour {entreprise.nom_complet}")
                result.validation_notes = "Aucun résultat trouvé dans Google Places"
                return result
            
            # Étape 2: Évaluation des candidats
            best_candidate = None
            best_score = 0
            
            for candidate in places_result['candidates']:
                score = self._evaluate_candidate(candidate, entreprise)
                
                if score > best_score:
                    best_score = score
                    best_candidate = candidate
            
            # Étape 3: Validation du meilleur candidat
            if best_candidate and best_score >= self.min_confidence_score:
                result.google_place_id = best_candidate['place_id']
                result.website_url = best_candidate.get('website')
                result.confidence_score = best_score
                result.matched_name = best_candidate.get('name')
                result.matched_address = best_candidate.get('formatted_address')
                
                # Validation GPS si disponible
                if entreprise.gps_lat and entreprise.gps_lng:
                    validation = self._validate_with_gps(best_candidate, entreprise)
                    result.gps_distance_km = validation['distance_km']
                    result.validation_status = validation['status']
                    result.validation_notes = validation['notes']
                else:
                    result.validation_status = "no_gps_data"
                    result.validation_notes = "Pas de coordonnées GPS INSEE disponibles"
                
                logger.info(f"Match trouvé pour {entreprise.siren}: score={best_score}, place_id={result.google_place_id}")
            else:
                result.validation_notes = f"Score trop bas: {best_score} < {self.min_confidence_score}"
                logger.warning(f"Match rejeté pour {entreprise.siren}: score={best_score}")
            
        except Exception as e:
            logger.error(f"Erreur lors du matching Google Places pour {entreprise.siren}: {e}")
            result.validation_notes = f"Erreur technique: {str(e)}"
        
        return result
    
    def _build_search_query(self, entreprise: EntrepriseInfo) -> str:
        """Construit la requête de recherche Google Places"""
        # Utilise le nom complet et l'adresse
        query_parts = [entreprise.nom_complet]
        
        if entreprise.adresse:
            # Nettoyage de l'adresse
            clean_address = self._clean_address(entreprise.adresse)
            query_parts.append(clean_address)
        
        if entreprise.ville:
            query_parts.append(entreprise.ville)
        
        return ' '.join(query_parts)
    
    def _clean_address(self, address: str) -> str:
        """Nettoie une adresse pour la recherche"""
        # Supprime les caractères spéciaux et normalise
        address = re.sub(r'[^\w\s,.-]', ' ', address)
        address = re.sub(r'\s+', ' ', address).strip()
        
        # Abréviations courantes
        replacements = {
            'AVENUE': 'AV',
            'BOULEVARD': 'BD',
            'RUE': '',
            'PLACE': 'PL',
            'IMPASSE': 'IMP',
            'CHEMIN': 'CHE',
            'ROUTE': 'RT',
            'QUAI': 'QU',
        }
        
        for full, abbr in replacements.items():
            address = re.sub(rf'\b{full}\b', abbr, address, flags=re.IGNORECASE)
        
        return address
    
    def _evaluate_candidate(self, candidate: Dict[str, Any], entreprise: EntrepriseInfo) -> int:
        """Évalue un candidat Google Places et retourne un score de confiance"""
        score = 0
        
        # 1. Similarité du nom (40 points max)
        candidate_name = candidate.get('name', '')
        name_similarity = fuzz.token_sort_ratio(entreprise.nom_complet.lower(), candidate_name.lower())
        name_score = min(40, int(name_similarity * 0.4))
        score += name_score
        
        # 2. Similarité de l'adresse (30 points max)
        candidate_address = candidate.get('formatted_address', '')
        if entreprise.adresse and candidate_address:
            address_similarity = fuzz.partial_ratio(
                self._normalize_address(entreprise.adresse),
                self._normalize_address(candidate_address)
            )
            address_score = min(30, int(address_similarity * 0.3))
            score += address_score
        
        # 3. Correspondance ville/département (20 points)
        if entreprise.ville and entreprise.ville.lower() in candidate_address.lower():
            score += 20
        elif entreprise.departement and entreprise.departement in candidate_address:
            score += 15
        
        # 4. Présence d'un site web (10 points bonus)
        if candidate.get('website'):
            score += 10
        
        return min(100, score)  # Cap à 100
    
    def _normalize_address(self, address: str) -> str:
        """Normalise une adresse pour la comparaison"""
        # Convertit en minuscules
        address = address.lower()
        
        # Supprime les accents (approximatif)
        address = re.sub(r'[éèêë]', 'e', address)
        address = re.sub(r'[àâä]', 'a', address)
        address = re.sub(r'[îï]', 'i', address)
        address = re.sub(r'[ôö]', 'o', address)
        address = re.sub(r'[ùûü]', 'u', address)
        address = re.sub(r'[ç]', 'c', address)
        
        # Supprime les caractères spéciaux
        address = re.sub(r'[^\w\s]', ' ', address)
        
        # Supprime les espaces multiples
        address = re.sub(r'\s+', ' ', address).strip()
        
        return address
    
    def _validate_with_gps(self, candidate: Dict[str, Any], entreprise: EntrepriseInfo) -> Dict[str, Any]:
        """Valide un candidat avec les coordonnées GPS INSEE"""
        result = {
            'status': 'pending',
            'distance_km': None,
            'notes': None
        }
        
        try:
            # Récupère les coordonnées Google
            geometry = candidate.get('geometry', {})
            location = geometry.get('location', {})
            
            if not location or 'lat' not in location or 'lng' not in location:
                result['status'] = 'no_google_gps'
                result['notes'] = 'Pas de coordonnées GPS dans le résultat Google'
                return result
            
            google_lat = location['lat']
            google_lng = location['lng']
            
            # Calcule la distance
            insee_coords = (entreprise.gps_lat, entreprise.gps_lng)
            google_coords = (google_lat, google_lng)
            
            distance_km = geodesic(insee_coords, google_coords).kilometers
            result['distance_km'] = distance_km
            
            # Validation basée sur la distance
            if distance_km <= self.max_gps_distance_km:
                result['status'] = 'validated'
                result['notes'] = f'Distance GPS acceptable: {distance_km:.3f} km'
            else:
                result['status'] = 'rejected'
                result['notes'] = f'Distance GPS trop grande: {distance_km:.3f} km > {self.max_gps_distance_km} km'
                
        except Exception as e:
            result['status'] = 'validation_error'
            result['notes'] = f'Erreur lors de la validation GPS: {str(e)}'
        
        return result
    
    def get_place_details(self, place_id: str) -> Optional[Dict[str, Any]]:
        """
        Récupère les détails complets d'un lieu
        
        Args:
            place_id: Identifiant Google Places
            
        Returns:
            Détails du lieu ou None
        """
        try:
            details = self.gmaps.place(
                place_id=place_id,
                fields=['name', 'formatted_address', 'website', 'formatted_phone_number',
                       'international_phone_number', 'opening_hours', 'rating',
                       'user_ratings_total', 'price_level', 'types', 'geometry']
            )
            
            if details.get('status') == 'OK':
                return details.get('result')
            else:
                logger.warning(f"Erreur lors de la récupération des détails pour {place_id}: {details.get('status')}")
                return None
                
        except Exception as e:
            logger.error(f"Exception lors de la récupération des détails pour {place_id}: {e}")
            return None


# Exemple d'utilisation
if __name__ == "__main__":
    # Configuration du logging
    logging.basicConfig(level=logging.INFO)
    
    # Test avec une entreprise fictive
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
    
    print("=== Test Google Places Matcher ===")
    
    # Note: Nécessite une clé API Google Places valide
    api_key = os.getenv('GOOGLE_PLACES_API_KEY')
    if not api_key:
        print("ERREUR: Définissez la variable d'environnement GOOGLE_PLACES_API_KEY")
    else:
        matcher = GooglePlacesMatcher(api_key=api_key)
        result = matcher.find_place_id(test_entreprise)
        
        print(f"SIREN: {result.siren}")
        print(f"Place ID: {result.google_place_id}")
        print(f"Site web: {result.website_url}")
        print(f"Score de confiance: {result.confidence_score}/100")
        print(f"Statut validation: {result.validation_status}")
        print(f"Notes: {result.validation_notes}")
        
        if result.gps_distance_km:
            print(f"Distance GPS: {result.gps_distance_km:.3f} km")