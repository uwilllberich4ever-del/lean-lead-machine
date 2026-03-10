#!/usr/bin/env python3
"""
API interne pour le projet Lean Lead Machine
Fournit un endpoint pour récupérer PlaceID et site web par SIREN
"""

import os
import sys
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, HTTPException, Query, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
import asyncpg
from cachetools import TTLCache

from bridge_orchestrator import BridgeOrchestrator

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Modèles Pydantic
class SirenRequest(BaseModel):
    """Requête pour un SIREN spécifique"""
    siren: str = Field(..., min_length=9, max_length=9, description="Numéro SIREN (9 chiffres)")
    force_refresh: bool = Field(False, description="Force le re-traitement même si en cache")

    @validator('siren')
    def validate_siren(cls, v):
        if not v.isdigit():
            raise ValueError('Le SIREN doit contenir uniquement des chiffres')
        return v

class SearchRequest(BaseModel):
    """Requête de recherche"""
    query: str = Field(..., min_length=2, description="Terme de recherche")
    limit: int = Field(10, ge=1, le=50, description="Nombre maximum de résultats")

class BridgeResponse(BaseModel):
    """Réponse standard pour les requêtes SIREN"""
    siren: str
    google_place_id: Optional[str] = None
    website_url: Optional[str] = None
    confidence_score: Optional[int] = Field(None, ge=0, le=100)
    status: str
    processed_at: datetime
    cache_until: Optional[datetime] = None
    validation_status: Optional[str] = None
    gps_distance_km: Optional[float] = None
    error: Optional[str] = None

class BatchRequest(BaseModel):
    """Requête pour un batch de SIRENs"""
    sirens: List[str] = Field(..., min_items=1, max_items=100)
    force_refresh: bool = False

class BatchResponse(BaseModel):
    """Réponse pour un batch"""
    total: int
    successful: int
    failed: int
    cached: int
    start_time: datetime
    end_time: datetime
    duration_seconds: float
    results: List[BridgeResponse]

class QuotaInfo(BaseModel):
    """Informations de quota"""
    service: str
    remaining: int
    reset_at: datetime
    reset_in_seconds: float

class APIStats(BaseModel):
    """Statistiques de l'API"""
    total_requests: int
    successful_requests: int
    failed_requests: int
    cache_hit_rate: float
    avg_response_time_ms: float
    uptime_seconds: float

# Cache en mémoire (complément au cache Supabase)
memory_cache = TTLCache(maxsize=1000, ttl=3600)  # 1 heure

class BridgeAPI:
    """Classe principale de l'API"""
    
    def __init__(self):
        self.app = FastAPI(
            title="Lean Lead Machine Bridge API",
            description="API interne de mapping SIREN ↔ Google PlaceID ↔ Website URL",
            version="1.0.0",
            lifespan=self.lifespan
        )
        
        # Configuration CORS
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],  # À restreindre en production
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # Orchestrateur
        self.orchestrator = None
        
        # Métriques
        self.metrics = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'response_times': [],
            'start_time': datetime.now()
        }
        
        # Configuration des routes
        self.setup_routes()
    
    @asynccontextmanager
    async def lifespan(self, app: FastAPI):
        """Gestion du cycle de vie de l'application"""
        # Démarrage
        logger.info("Démarrage de l'API Bridge...")
        self.orchestrator = BridgeOrchestrator()
        
        # Test de connexion aux services
        await self._test_services()
        
        yield
        
        # Arrêt
        logger.info("Arrêt de l'API Bridge...")
        # Nettoyage si nécessaire
    
    async def _test_services(self):
        """Test de connexion aux services externes"""
        logger.info("Test des services externes...")
        
        # Test MCP
        try:
            # Test simple de recherche
            results = self.orchestrator.mcp_client.recherche_entreprises("test", limit=1)
            logger.info(f"MCP: {'✓' if results is not None else '✗'}")
        except Exception as e:
            logger.warning(f"MCP: ✗ ({e})")
        
        # Test Google Places
        if self.orchestrator.google_matcher:
            logger.info("Google Places: ✓ (configuré)")
        else:
            logger.warning("Google Places: ✗ (non configuré)")
    
    def setup_routes(self):
        """Configure les routes de l'API"""
        
        @self.app.get("/", tags=["Root"])
        async def root():
            """Endpoint racine avec informations sur l'API"""
            return {
                "service": "Lean Lead Machine Bridge API",
                "version": "1.0.0",
                "status": "operational",
                "endpoints": {
                    "health": "/health",
                    "docs": "/docs",
                    "siren": "/siren/{siren}",
                    "search": "/search",
                    "batch": "/batch",
                    "stats": "/stats",
                    "quotas": "/quotas"
                }
            }
        
        @self.app.get("/health", tags=["Health"])
        async def health_check():
            """Vérification de l'état de santé de l'API"""
            return {
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "services": {
                    "mcp": "operational" if self.orchestrator.mcp_client else "unavailable",
                    "google_places": "operational" if self.orchestrator.google_matcher else "unavailable",
                    "database": "not_implemented"  # À implémenter avec Supabase
                }
            }
        
        @self.app.get("/siren/{siren}", response_model=BridgeResponse, tags=["SIREN"])
        async def get_siren_info(
            siren: str,
            force_refresh: bool = Query(False, description="Force le re-traitement"),
            background_tasks: BackgroundTasks = None
        ):
            """
            Récupère les informations de mapping pour un SIREN
            
            - **siren**: Numéro SIREN (9 chiffres)
            - **force_refresh**: Force le re-traitement même si en cache
            """
            self.metrics['total_requests'] += 1
            start_time = datetime.now()
            
            try:
                # Validation du SIREN
                if len(siren) != 9 or not siren.isdigit():
                    raise HTTPException(status_code=400, detail="SIREN invalide. Doit contenir 9 chiffres.")
                
                # Vérification du cache mémoire
                cache_key = f"siren:{siren}:{force_refresh}"
                if not force_refresh and cache_key in memory_cache:
                    self.metrics['successful_requests'] += 1
                    logger.info(f"Cache hit pour SIREN {siren}")
                    return memory_cache[cache_key]
                
                # Traitement
                result = self.orchestrator.process_siren(siren, force_refresh)
                
                # Conversion au format de réponse
                response = self._format_bridge_response(result)
                
                # Mise en cache
                if response.status == "completed":
                    memory_cache[cache_key] = response
                
                # Tâche en arrière-plan pour les statistiques
                if background_tasks:
                    background_tasks.add_task(
                        self._update_metrics,
                        start_time=start_time,
                        success=True
                    )
                
                self.metrics['successful_requests'] += 1
                return response
                
            except Exception as e:
                self.metrics['failed_requests'] += 1
                logger.error(f"Erreur pour SIREN {siren}: {e}")
                
                # Tâche en arrière-plan pour les statistiques
                if background_tasks:
                    background_tasks.add_task(
                        self._update_metrics,
                        start_time=start_time,
                        success=False
                    )
                
                raise HTTPException(status_code=500, detail=f"Erreur interne: {str(e)}")
        
        @self.app.post("/search", tags=["Search"])
        async def search_enterprises(request: SearchRequest):
            """
            Recherche et traite des entreprises par nom
            
            - **query**: Terme de recherche
            - **limit**: Nombre maximum de résultats (1-50)
            """
            self.metrics['total_requests'] += 1
            start_time = datetime.now()
            
            try:
                result = self.orchestrator.search_and_process(
                    query=request.query,
                    limit=request.limit
                )
                
                self.metrics['successful_requests'] += 1
                self._update_metrics(start_time, success=True)
                
                return result
                
            except Exception as e:
                self.metrics['failed_requests'] += 1
                self._update_metrics(start_time, success=False)
                logger.error(f"Erreur lors de la recherche '{request.query}': {e}")
                raise HTTPException(status_code=500, detail=f"Erreur interne: {str(e)}")
        
        @self.app.post("/batch", response_model=BatchResponse, tags=["Batch"])
        async def process_batch(request: BatchRequest):
            """
            Traite un batch de SIRENs
            
            - **sirens**: Liste de numéros SIREN (1-100)
            - **force_refresh**: Force le re-traitement même si en cache
            """
            self.metrics['total_requests'] += 1
            start_time = datetime.now()
            
            try:
                # Validation des SIRENs
                invalid_sirens = []
                for siren in request.sirens:
                    if len(siren) != 9 or not siren.isdigit():
                        invalid_sirens.append(siren)
                
                if invalid_sirens:
                    raise HTTPException(
                        status_code=400,
                        detail=f"SIRENs invalides: {', '.join(invalid_sirens[:5])}"
                    )
                
                # Traitement du batch
                batch_result = self.orchestrator.process_batch(request.sirens)
                
                # Conversion des résultats
                responses = []
                for result in batch_result['results']:
                    responses.append(self._format_bridge_response(result))
                
                response = BatchResponse(
                    total=batch_result['total'],
                    successful=batch_result['successful'],
                    failed=batch_result['failed'],
                    cached=batch_result.get('cached', 0),
                    start_time=datetime.fromisoformat(batch_result['start_time']),
                    end_time=datetime.fromisoformat(batch_result['end_time']),
                    duration_seconds=batch_result['duration_seconds'],
                    results=responses
                )
                
                self.metrics['successful_requests'] += 1
                self._update_metrics(start_time, success=True)
                
                return response
                
            except HTTPException:
                raise
            except Exception as e:
                self.metrics['failed_requests'] += 1
                self._update_metrics(start_time, success=False)
                logger.error(f"Erreur lors du traitement batch: {e}")
                raise HTTPException(status_code=500, detail=f"Erreur interne: {str(e)}")
        
        @self.app.get("/stats", response_model=APIStats, tags=["Statistics"])
        async def get_stats():
            """Récupère les statistiques de l'API"""
            total = self.metrics['total_requests']
            successful = self.metrics['successful_requests']
            failed = self.metrics['failed_requests']
            
            cache_hit_rate = 0.0  # À implémenter avec un suivi dédié
            avg_response_time = 0.0
            
            if self.metrics['response_times']:
                avg_response_time = sum(self.metrics['response_times']) / len(self.metrics['response_times'])
            
            uptime = (datetime.now() - self.metrics['start_time']).total_seconds()
            
            return APIStats(
                total_requests=total,
                successful_requests=successful,
                failed_requests=failed,
                cache_hit_rate=cache_hit_rate,
                avg_response_time_ms=avg_response_time * 1000,
                uptime_seconds=uptime
            )
        
        @self.app.get("/quotas", tags=["Quotas"])
        async def get_quotas():
            """Récupère les informations de quota des services externes"""
            quotas = []
            
            # Quota MCP
            mcp_quota = self.orchestrator.mcp_client.get_quota_info()
            quotas.append(QuotaInfo(
                service="mcp",
                remaining=mcp_quota['remaining'],
                reset_at=datetime.fromisoformat(mcp_quota['reset_at']),
                reset_in_seconds=mcp_quota['reset_in_seconds']
            ))
            
            # Quota Google Places (à implémenter)
            quotas.append(QuotaInfo(
                service="google_places",
                remaining=1000,  # Valeur par défaut
                reset_at=datetime.now() + timedelta(days=1),
                reset_in_seconds=86400
            ))
            
            return quotas
        
        @self.app.get("/clear-cache", tags=["Cache"])
        async def clear_cache():
            """Vide le cache mémoire"""
            memory_cache.clear()
            logger.info("Cache mémoire vidé")
            return {"message": "Cache vidé avec succès", "cache_size": 0}
    
    def _format_bridge_response(self, result: Dict[str, Any]) -> BridgeResponse:
        """Formate un résultat pour la réponse API"""
        matching_result = result.get('matching_result', {})
        
        return BridgeResponse(
            siren=result['siren'],
            google_place_id=matching_result.get('google_place_id'),
            website_url=matching_result.get('website_url'),
            confidence_score=matching_result.get('confidence_score'),
            status=result['status'],
            processed_at=datetime.fromisoformat(result.get('processed_at', datetime.now().isoformat())),
            cache_until=datetime.fromisoformat(result['cache_until']) if 'cache_until' in result else None,
            validation_status=matching_result.get('validation_status'),
            gps_distance_km=matching_result.get('gps_distance_km'),
            error=result.get('error')
        )
    
    def _update_metrics(self, start_time: datetime, success: bool):
        """Met à jour les métriques de performance"""
        response_time = (datetime.now() - start_time).total_seconds()
        self.metrics['response_times'].append(response_time)
        
        # Garde seulement les 100 dernières mesures
        if len(self.metrics['response_times']) > 100:
            self.metrics['response_times'] = self.metrics['response_times'][-100:]


# Point d'entrée
app = BridgeAPI().app

if __name__ == "__main__":
    # Configuration du serveur
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    
    logger.info(f"Démarrage de l'API sur {host}:{port}")
    
    uvicorn.run(
        "api_internal:app",
        host=host,
        port=port,
        reload=os.getenv("API_RELOAD", "false").lower() == "true",
        log_level="info"
    )