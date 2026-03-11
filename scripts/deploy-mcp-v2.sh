#!/bin/bash

# Script de déploiement et rollback pour l'intégration MCP V2
# Usage: ./scripts/deploy-mcp-v2.sh [deploy|rollback|status]

set -e  # Exit on error

# Configuration
ENV=${NODE_ENV:-production}
BACKUP_DIR="./.backup/mcp-migration"
LOG_FILE="./logs/mcp-deploy-$(date +%Y%m%d-%H%M%S).log"
VERSION="v2.0.0-mcp"

# Couleurs pour le logging
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions de logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Vérification des prérequis
check_prerequisites() {
    log_info "Vérification des prérequis..."
    
    # Vérifier Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js n'est pas installé"
        exit 1
    fi
    
    # Vérifier npm
    if ! command -v npm &> /dev/null; then
        log_error "npm n'est pas installé"
        exit 1
    }
    
    # Vérifier les variables d'environnement
    required_vars=(
        "MCP_API_URL"
        "MCP_API_KEY"
        "UPSTASH_REDIS_URL"
        "UPSTASH_REDIS_TOKEN"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_warning "Variable $var non définie"
        fi
    done
    
    # Créer les répertoires nécessaires
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$(dirname "$LOG_FILE")"
    
    log_success "Prérequis vérifiés"
}

# Sauvegarde des fichiers actuels
backup_current_version() {
    log_info "Sauvegarde de la version actuelle..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="$BACKUP_DIR/$timestamp"
    
    mkdir -p "$backup_path"
    
    # Sauvegarder les services
    cp -r ./lib/services/*.ts "$backup_path/" 2>/dev/null || true
    
    # Sauvegarder les routes API
    cp -r ./app/api/mcp "$backup_path/" 2>/dev/null || true
    cp -r ./app/api/export "$backup_path/" 2>/dev/null || true
    
    # Sauvegarder package.json
    cp package.json "$backup_path/"
    cp package-lock.json "$backup_path/" 2>/dev/null || true
    
    log_success "Sauvegarde complétée: $backup_path"
}

# Déploiement de la V2
deploy_v2() {
    log_info "Déploiement de la version MCP V2..."
    
    # 1. Sauvegarde
    backup_current_version
    
    # 2. Installation des dépendances
    log_info "Installation des dépendances..."
    npm install @upstash/redis compression
    
    # 3. Copie des nouveaux services
    log_info "Copie des services V2..."
    cp ./lib/services/mcp-v2.service.ts ./lib/services/mcp.service.ts
    cp ./lib/services/csv-export-v2.service.ts ./lib/services/csv-export.service.ts
    
    # 4. Mise à jour des imports
    log_info "Mise à jour des imports..."
    
    # Mettre à jour les imports dans les routes API
    find ./app/api -name "*.ts" -type f | while read file; do
        sed -i.bak \
            -e "s|from '@/lib/services/mcp.service'|from '@/lib/services/mcp-v2.service'|g" \
            -e "s|from '@/lib/services/csv-export.service'|from '@/lib/services/csv-export-v2.service'|g" \
            "$file"
        rm -f "$file.bak"
    done
    
    # 5. Build et tests
    log_info "Build de l'application..."
    npm run build
    
    log_info "Exécution des tests..."
    npm test 2>&1 | tee -a "$LOG_FILE"
    
    # 6. Tests de performance
    log_info "Tests de performance..."
    if [ -f "./tests/performance/mcp-benchmark.test.ts" ]; then
        npx tsx ./tests/performance/mcp-benchmark.test.ts 2>&1 | tee -a "$LOG_FILE"
    fi
    
    log_success "Déploiement V2 terminé"
    
    # 7. Instructions pour le déploiement final
    echo ""
    echo "="*60
    echo "INSTRUCTIONS POUR LE DÉPLOIEMENT FINAL:"
    echo "="*60
    echo "1. Vérifier les logs: $LOG_FILE"
    echo "2. Tester manuellement les fonctionnalités:"
    echo "   - Recherche par code postal"
    echo "   - Fiche entreprise"
    echo "   - Export CSV"
    echo "3. Déployer en production:"
    echo "   - Sur Vercel: git push"
    echo "   - Manuel: npm run build && npm start"
    echo "4. Surveiller les métriques pendant 24h"
    echo "="*60
}

# Rollback vers V1
rollback_to_v1() {
    log_info "Rollback vers la version V1..."
    
    local latest_backup=$(ls -td "$BACKUP_DIR"/*/ | head -1)
    
    if [ -z "$latest_backup" ]; then
        log_error "Aucune sauvegarde trouvée"
        exit 1
    fi
    
    log_info "Restauration depuis: $latest_backup"
    
    # 1. Restaurer les services
    cp "$latest_backup"/*.ts ./lib/services/ 2>/dev/null || true
    
    # 2. Restaurer les routes API
    if [ -d "$latest_backup/mcp" ]; then
        rm -rf ./app/api/mcp
        cp -r "$latest_backup/mcp" ./app/api/
    fi
    
    if [ -d "$latest_backup/export" ]; then
        rm -rf ./app/api/export
        cp -r "$latest_backup/export" ./app/api/
    fi
    
    # 3. Restaurer package.json
    cp "$latest_backup/package.json" ./
    [ -f "$latest_backup/package-lock.json" ] && cp "$latest_backup/package-lock.json" ./
    
    # 4. Réinstaller les dépendances
    log_info "Réinstallation des dépendances..."
    npm install
    
    # 5. Build
    log_info "Build après rollback..."
    npm run build
    
    log_success "Rollback terminé avec succès"
    
    echo ""
    echo "="*60
    echo "ROLLBACK COMPLÉTÉ:"
    echo "="*60
    echo "1. Version V1 restaurée"
    echo "2. Dépendances réinstallées"
    echo "3. Application rebuildée"
    echo "4. Prêt pour le déploiement"
    echo "="*60
}

# Statut du déploiement
check_status() {
    log_info "Vérification du statut du déploiement..."
    
    echo ""
    echo "="*60
    echo "STATUT DU DÉPLOIEMENT MCP V2"
    echo "="*60
    
    # Vérifier la version des services
    if [ -f "./lib/services/mcp.service.ts" ]; then
        if grep -q "MCPServiceV2" "./lib/services/mcp.service.ts"; then
            echo "Services: ✅ V2 déployée"
        else
            echo "Services: ⚠️  V1 détectée"
        fi
    else
        echo "Services: ❌ Fichier non trouvé"
    fi
    
    # Vérifier les dépendances
    if grep -q "@upstash/redis" "./package.json"; then
        echo "Dépendances: ✅ Redis configuré"
    else
        echo "Dépendances: ⚠️  Redis manquant"
    fi
    
    # Vérifier les variables d'environnement
    echo ""
    echo "Variables d'environnement:"
    for var in MCP_API_URL MCP_API_KEY UPSTASH_REDIS_URL UPSTASH_REDIS_TOKEN; do
        if [ -n "${!var}" ]; then
            echo "  $var: ✅ Définie"
        else
            echo "  $var: ❌ Non définie"
        fi
    done
    
    # Vérifier les sauvegardes
    local backup_count=$(ls -d "$BACKUP_DIR"/*/ 2>/dev/null | wc -l)
    echo ""
    echo "Sauvegardes disponibles: $backup_count"
    
    if [ $backup_count -gt 0 ]; then
        echo "Dernière sauvegarde: $(ls -td "$BACKUP_DIR"/*/ | head -1)"
    fi
    
    echo "="*60
}

# Fonction principale
main() {
    local action=${1:-"status"}
    
    log_info "Démarrage du script avec action: $action"
    log_info "Environnement: $ENV"
    log_info "Log file: $LOG_FILE"
    
    check_prerequisites
    
    case $action in
        "deploy")
            deploy_v2
            ;;
        "rollback")
            rollback_to_v1
            ;;
        "status")
            check_status
            ;;
        *)
            log_error "Action inconnue: $action"
            echo "Usage: $0 [deploy|rollback|status]"
            exit 1
            ;;
    esac
    
    log_success "Action '$action' terminée avec succès"
}

# Exécution
main "$@"