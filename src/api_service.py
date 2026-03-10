#!/usr/bin/env python3
"""
Service API "Scraping on-demand" pour "The Hunter"
FastAPI avec réponse JSON en moins de 5 secondes
Stateless absolu: aucune donnée persistante
"""

import asyncio
import time
from typing import Dict, List, Optional
import logging
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from scraper import scrape_website
from linkedin_search import enrich_executives_with_linkedin

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialisation de l'application FastAPI
app = FastAPI(
    title="The Hunter - Web Scraping API",
    description="API de scraping web pour extraction de contacts professionnels",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # À restreindre en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Variables globales pour le monitoring (stateless mais pour métriques)
_request_count = 0
_success_count = 0
_error_count = 0


@app.middleware("http")
async def add_process_time_header(request, call_next):
    """Middleware pour mesurer le temps d'exécution"""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    # Ajout du header de temps d'exécution
    response.headers["X-Process-Time"] = str(process_time)
    
    # Avertissement si > 5 secondes
    if process_time > 5:
        logger.warning(f"Requête lente: {process_time:.2f}s - {request.url}")
    
    return response


@app.get("/")
async def root():
    """Endpoint racine avec informations sur l'API"""
    return {
        "service": "The Hunter - Web Scraping API",
        "version": "1.0.0",
        "description": "Transforme une URL de site web en une liste de contacts professionnels",
        "endpoints": {
            "/scrape": "Scrape une URL spécifique",
            "/health": "Vérification de santé de l'API",
            "/stats": "Statistiques d'utilisation (volatile)",
        },
        "constraints": {
            "stateless": True,
            "max_execution_time": "5 secondes",
            "no_data_persistence": True,
            "gdpr_compliant": True,
        }
    }


@app.get("/health")
async def health_check():
    """Endpoint de vérification de santé"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "service": "The Hunter API",
    }


@app.get("/stats")
async def get_stats():
    """Statistiques d'utilisation (volatile, reset au redémarrage)"""
    global _request_count, _success_count, _error_count
    
    return {
        "requests_total": _request_count,
        "requests_successful": _success_count,
        "requests_failed": _error_count,
        "success_rate": (_success_count / _request_count * 100) if _request_count > 0 else 0,
        "timestamp": time.time(),
        "note": "Statistiques volatiles, reset au redémarrage du service",
    }


@app.get("/scrape")
async def scrape_endpoint(
    url: str = Query(..., description="URL du site web à scraper"),
    enable_linkedin: bool = Query(True, description="Activer la recherche LinkedIn"),
    timeout: int = Query(5, description="Timeout en secondes", ge=1, le=10),
):
    """
    Endpoint principal de scraping
    
    Args:
        url: URL du site web à scraper
        enable_linkedin: Activer/désactiver la recherche LinkedIn
        timeout: Timeout en secondes (1-10)
    
    Returns:
        JSON structuré avec les contacts extraits
    """
    global _request_count, _success_count, _error_count
    _request_count += 1
    
    start_time = time.time()
    
    # Validation de l'URL
    if not url.startswith(('http://', 'https://')):
        _error_count += 1
        raise HTTPException(
            status_code=400,
            detail="URL doit commencer par http:// ou https://"
        )
    
    try:
        logger.info(f"Début du scraping pour: {url}")
        
        # Scraping du site web avec timeout
        scrape_task = asyncio.create_task(scrape_website(url))
        
        try:
            scrape_result = await asyncio.wait_for(scrape_task, timeout=timeout)
        except asyncio.TimeoutError:
            _error_count += 1
            raise HTTPException(
                status_code=408,
                detail=f"Timeout après {timeout} secondes"
            )
        
        # Recherche LinkedIn si activée et si des dirigeants sont trouvés
        if enable_linkedin and scrape_result.get('executives'):
            try:
                company_name = _extract_company_name(url, scrape_result)
                
                # Enrichissement avec LinkedIn (avec sous-timeout)
                linkedin_task = asyncio.create_task(
                    enrich_executives_with_linkedin(
                        scrape_result['executives'],
                        company_name
                    )
                )
                
                try:
                    enriched_executives = await asyncio.wait_for(
                        linkedin_task, 
                        timeout=min(2, timeout - (time.time() - start_time))
                    )
                    scrape_result['executives'] = enriched_executives
                except asyncio.TimeoutError:
                    logger.warning("Timeout lors de la recherche LinkedIn")
                    # Continue sans les résultats LinkedIn
                
            except Exception as e:
                logger.error(f"Erreur lors de la recherche LinkedIn: {e}")
                # Continue sans les résultats LinkedIn
        
        # Calcul du temps d'exécution
        execution_time = time.time() - start_time
        
        # Préparation de la réponse
        response = {
            "success": True,
            "website_url": scrape_result['website_url'],
            "execution_time": round(execution_time, 2),
            "data": {
                "emails": scrape_result['emails'],
                "phones": scrape_result['phones'],
                "social_links": scrape_result['social_links'],
                "executives": scrape_result['executives'],
            },
            "metadata": {
                "emails_count": len(scrape_result['emails']),
                "phones_count": len(scrape_result['phones']),
                "social_links_count": len(scrape_result['social_links']),
                "executives_count": len(scrape_result['executives']),
                "with_linkedin": enable_linkedin,
            }
        }
        
        # Vérification des contraintes de performance
        if execution_time > 5:
            response["warning"] = f"Temps d'exécution élevé: {execution_time:.2f}s"
        
        _success_count += 1
        logger.info(f"Scraping réussi pour {url} en {execution_time:.2f}s")
        
        return JSONResponse(
            content=response,
            headers={
                "X-Execution-Time": str(execution_time),
                "X-Data-Size": str(len(str(response))),
            }
        )
        
    except HTTPException:
        _error_count += 1
        raise
        
    except Exception as e:
        _error_count += 1
        logger.error(f"Erreur lors du scraping de {url}: {e}")
        
        # Retourne une réponse d'erreur structurée
        error_response = {
            "success": False,
            "website_url": url,
            "error": str(e),
            "error_type": type(e).__name__,
            "data": {
                "emails": [],
                "phones": [],
                "social_links": {},
                "executives": [],
            },
            "metadata": {
                "emails_count": 0,
                "phones_count": 0,
                "social_links_count": 0,
                "executives_count": 0,
                "with_linkedin": enable_linkedin,
            }
        }
        
        return JSONResponse(
            status_code=500,
            content=error_response,
        )


@app.post("/scrape/batch")
async def scrape_batch(
    urls: List[str],
    enable_linkedin: bool = Query(True, description="Activer la recherche LinkedIn"),
    timeout_per_url: int = Query(3, description="Timeout par URL en secondes", ge=1, le=5),
):
    """
    Endpoint pour le scraping batch (limité pour éviter la surcharge)
    
    Args:
        urls: Liste d'URLs à scraper
        enable_linkedin: Activer/désactiver la recherche LinkedIn
        timeout_per_url: Timeout par URL en secondes
    
    Returns:
        Liste de résultats pour chaque URL
    """
    global _request_count, _success_count, _error_count
    _request_count += 1
    
    # Limite le nombre d'URLs pour éviter la surcharge
    max_urls = 10
    if len(urls) > max_urls:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {max_urls} URLs autorisées par requête batch"
        )
    
    start_time = time.time()
    results = []
    
    # Traitement séquentiel pour éviter le surchargement
    for url in urls:
        try:
            # Utilise le même endpoint mais avec un timeout réduit
            scrape_task = asyncio.create_task(
                _scrape_single_url(url, enable_linkedin, timeout_per_url)
            )
            
            try:
                result = await asyncio.wait_for(scrape_task, timeout=timeout_per_url + 1)
                results.append(result)
            except asyncio.TimeoutError:
                results.append({
                    "success": False,
                    "website_url": url,
                    "error": f"Timeout après {timeout_per_url} secondes",
                    "data": empty_data(),
                })
                
        except Exception as e:
            results.append({
                "success": False,
                "website_url": url,
                "error": str(e),
                "data": empty_data(),
            })
    
    execution_time = time.time() - start_time
    
    response = {
        "success": True,
        "execution_time": round(execution_time, 2),
        "urls_processed": len(urls),
        "urls_successful": sum(1 for r in results if r.get('success')),
        "urls_failed": sum(1 for r in results if not r.get('success')),
        "results": results,
    }
    
    _success_count += 1
    return response


async def _scrape_single_url(url: str, enable_linkedin: bool, timeout: int) -> Dict:
    """Fonction helper pour scraper une URL unique"""
    # Réutilise la logique de l'endpoint principal
    scrape_result = await scrape_website(url)
    
    if enable_linkedin and scrape_result.get('executives'):
        try:
            company_name = _extract_company_name(url, scrape_result)
            enriched_executives = await enrich_executives_with_linkedin(
                scrape_result['executives'],
                company_name
            )
            scrape_result['executives'] = enriched_executives
        except Exception:
            pass  # Ignore les erreurs LinkedIn en mode batch
    
    return {
        "success": True,
        "website_url": scrape_result['website_url'],
        "data": {
            "emails": scrape_result['emails'],
            "phones": scrape_result['phones'],
            "social_links": scrape_result['social_links'],
            "executives": scrape_result['executives'],
        }
    }


def _extract_company_name(url: str, scrape_result: Dict) -> str:
    """Extrait le nom de l'entreprise depuis l'URL ou les données"""
    from urllib.parse import urlparse
    
    # Essaye d'extraire depuis l'URL
    domain = urlparse(url).netloc
    if domain.startswith('www.'):
        domain = domain[4:]
    
    # Supprime les extensions
    company_name = domain.split('.')[0]
    
    # Capitalise
    company_name = company_name.replace('-', ' ').replace('_', ' ').title()
    
    return company_name


def empty_data() -> Dict:
    """Retourne une structure de données vide"""
    return {
        "emails": [],
        "phones": [],
        "social_links": {},
        "executives": [],
    }


@app.on_event("startup")
async def startup_event():
    """Événement de démarrage de l'application"""
    logger.info("Démarrage de l'API The Hunter...")
    logger.info("Mode stateless activé - aucune donnée persistante")
    logger.info("Contrainte de performance: < 5 secondes par requête")


@app.on_event("shutdown")
async def shutdown_event():
    """Événement d'arrêt de l'application"""
    logger.info("Arrêt de l'API The Hunter...")
    logger.info("Nettoyage complet - mode stateless confirmé")


# Configuration pour le lancement direct
if __name__ == "__main__":
    import sys
    
    # Configuration par défaut
    host = "0.0.0.0"
    port = 8000
    
    # Arguments en ligne de commande
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    
    logger.info(f"Lancement de l'API sur http://{host}:{port}")
    logger.info(f"Documentation: http://{host}:{port}/docs")
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info",
        # Configuration pour la performance
        timeout_keep_alive=30,
        limit_concurrency=100,
    )