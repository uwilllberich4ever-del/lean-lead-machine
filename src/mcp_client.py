#!/usr/bin/env python3
"""
Client MCP pour le projet Lean Lead Machine
Interface avec le serveur MCP de data.gouv.fr
"""

import os
import requests
import json
import time
from typing import Dict, Optional, List, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
import logging

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class EntrepriseInfo:
    """Informations d'une entreprise depuis le MCP"""
    siren: str
    nom_complet: str
    nom_raison_sociale: str
    adresse: str
    code_postal: str
    ville: str
    departement: str
    region: str
    activite_principale: str
    tranche_effectif: str
    date_creation: str
    etat_administratif: str
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    website: Optional[str] = None

class MCPClient:
    """Client pour l'API MCP de data.gouv.fr"""
    
    BASE_URL = "https://mcp.data.gouv.fr/mcp"
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialise le client MCP
        
        Args:
            api_key: Clé API optionnelle (si requise)
        """
        self.api_key = api_key or os.getenv('MCP_API_KEY')
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'LeanLeadMachine/1.0',
            'Accept': 'application/json'
        })
        
        if self.api_key:
            self.session.headers['Authorization'] = f'Bearer {self.api_key}'
        
        # Gestion des quotas
        self.rate_limit_remaining = 100  Valeur par défaut
        self.rate_limit_reset = datetime.now()
        self.last_request_time = None
        
    def _handle_rate_limit(self):
        """Gère les limites de taux d'appel"""
        if self.last_request_time:
            elapsed = (datetime.now() - self.last_request_time).total_seconds()
            if elapsed < 0.1:  # Minimum 100ms entre les requêtes
                time.sleep(0.1 - elapsed)
        
        self.last_request_time = datetime.now()
    
    def _check_quota(self):
        """Vérifie les quotas disponibles"""
        if self.rate_limit_remaining <= 0:
            reset_in = (self.rate_limit_reset - datetime.now()).total_seconds()
            if reset_in > 0:
                logger.warning(f"Quota épuisé. Attente de {reset_in:.0f} secondes")
                time.sleep(reset_in)
    
    def recherche_entreprises(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Recherche d'entreprises par nom ou SIREN
        
        Args:
            query: Terme de recherche (nom ou SIREN)
            limit: Nombre maximum de résultats
            
        Returns:
            Liste d'entreprises correspondantes
        """
        self._check_quota()
        self._handle_rate_limit()
        
        endpoint = f"{self.BASE_URL}/recherche-entreprises"
        params = {
            'q': query,
            'limit': limit,
            'fields': 'siren,nom_complet,adresse,code_postal,ville,departement,region,activite_principale,tranche_effectif,date_creation,etat_administratif'
        }
        
        try:
            response = self.session.get(endpoint, params=params, timeout=10)
            response.raise_for_status()
            
            # Mise à jour des informations de quota
            self._update_rate_limits(response.headers)
            
            data = response.json()
            logger.info(f"Recherche '{query}' : {len(data.get('results', []))} résultats")
            return data.get('results', [])
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erreur lors de la recherche: {e}")
            return []
    
    def donnees_unifiees(self, siren: str) -> Optional[EntrepriseInfo]:
        """
        Récupère les données unifiées d'une entreprise par SIREN
        
        Args:
            siren: Numéro SIREN (9 chiffres)
            
        Returns:
            Informations complètes de l'entreprise ou None
        """
        self._check_quota()
        self._handle_rate_limit()
        
        endpoint = f"{self.BASE_URL}/donnees-unifiees/{siren}"
        
        try:
            response = self.session.get(endpoint, timeout=10)
            response.raise_for_status()
            
            # Mise à jour des informations de quota
            self._update_rate_limits(response.headers)
            
            data = response.json()
            
            # Extraction des coordonnées GPS si disponibles
            gps_lat = None
            gps_lng = None
            if 'coordonnees' in data:
                coords = data['coordonnees']
                gps_lat = coords.get('latitude')
                gps_lng = coords.get('longitude')
            
            # Construction de l'adresse complète
            adresse = self._format_adresse(data)
            
            entreprise = EntrepriseInfo(
                siren=data.get('siren', ''),
                nom_complet=data.get('nom_complet', ''),
                nom_raison_sociale=data.get('nom_raison_sociale', ''),
                adresse=adresse,
                code_postal=data.get('code_postal', ''),
                ville=data.get('ville', ''),
                departement=data.get('departement', ''),
                region=data.get('region', ''),
                activite_principale=data.get('activite_principale', ''),
                tranche_effectif=data.get('tranche_effectif', ''),
                date_creation=data.get('date_creation', ''),
                etat_administratif=data.get('etat_administratif', ''),
                gps_lat=gps_lat,
                gps_lng=gps_lng
            )
            
            logger.info(f"Données récupérées pour SIREN {siren}: {entreprise.nom_complet}")
            return entreprise
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erreur lors de la récupération des données pour SIREN {siren}: {e}")
            return None
    
    def _format_adresse(self, data: Dict[str, Any]) -> str:
        """Formate une adresse complète à partir des données MCP"""
        parts = []
        
        # Numéro et voie
        if data.get('numero_voie'):
            parts.append(str(data['numero_voie']))
        if data.get('type_voie'):
            parts.append(data['type_voie'])
        if data.get('libelle_voie'):
            parts.append(data['libelle_voie'])
        
        # Code postal et ville
        if data.get('code_postal') and data.get('ville'):
            parts.append(f"{data['code_postal']} {data['ville']}")
        
        return ' '.join(parts) if parts else ''
    
    def _update_rate_limits(self, headers: Dict[str, str]):
        """Met à jour les informations de quota depuis les headers"""
        if 'X-RateLimit-Remaining' in headers:
            try:
                self.rate_limit_remaining = int(headers['X-RateLimit-Remaining'])
            except (ValueError, TypeError):
                pass
        
        if 'X-RateLimit-Reset' in headers:
            try:
                reset_timestamp = int(headers['X-RateLimit-Reset'])
                self.rate_limit_reset = datetime.fromtimestamp(reset_timestamp)
            except (ValueError, TypeError):
                pass
    
    def get_quota_info(self) -> Dict[str, Any]:
        """Retourne les informations de quota actuelles"""
        return {
            'remaining': self.rate_limit_remaining,
            'reset_at': self.rate_limit_reset.isoformat(),
            'reset_in_seconds': max(0, (self.rate_limit_reset - datetime.now()).total_seconds())
        }


# Exemple d'utilisation
if __name__ == "__main__":
    # Test du client MCP
    client = MCPClient()
    
    # Recherche d'exemple
    print("=== Test de recherche ===")
    results = client.recherche_entreprises("Google", limit=3)
    for i, result in enumerate(results, 1):
        print(f"{i}. {result.get('nom_complet')} - {result.get('adresse')}")
    
    # Données unifiées (exemple avec un SIREN connu)
    print("\n=== Test données unifiées ===")
    siren_test = "552032534"  # Exemple: Société par actions simplifiée
    entreprise = client.donnees_unifiees(siren_test)
    
    if entreprise:
        print(f"SIREN: {entreprise.siren}")
        print(f"Nom: {entreprise.nom_complet}")
        print(f"Adresse: {entreprise.adresse}")
        print(f"GPS: {entreprise.gps_lat}, {entreprise.gps_lng}")
    
    # Informations de quota
    print("\n=== Informations de quota ===")
    quota = client.get_quota_info()
    print(f"Requêtes restantes: {quota['remaining']}")
    print(f"Réinitialisation dans: {quota['reset_in_seconds']:.0f} secondes")