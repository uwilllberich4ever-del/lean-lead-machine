-- Table de mapping SIREN <-> Google PlaceID <-> Website URL
-- Pour le projet Lean Lead Machine
-- Créé le 10 mars 2026

CREATE TABLE IF NOT EXISTS bridge (
    -- Identifiant unique de l'entreprise (SIREN)
    siren VARCHAR(9) PRIMARY KEY,
    
    -- Identifiant Google Places
    google_place_id VARCHAR(255) UNIQUE,
    
    -- URL du site web de l'entreprise
    website_url VARCHAR(500),
    
    -- Score de confiance du matching (0-100)
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    
    -- Coordonnées GPS de l'INSEE pour validation
    gps_lat DECIMAL(10, 8),
    gps_lng DECIMAL(11, 8),
    
    -- Timestamp de dernière mise à jour
    last_mapped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Métadonnées pour le cache et la gestion des quotas
    last_verified_at TIMESTAMP WITH TIME ZONE,
    verification_count INTEGER DEFAULT 0,
    
    -- Index pour les recherches fréquentes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_bridge_google_place_id ON bridge(google_place_id);
CREATE INDEX IF NOT EXISTS idx_bridge_confidence_score ON bridge(confidence_score);
CREATE INDEX IF NOT EXISTS idx_bridge_last_mapped_at ON bridge(last_mapped_at);
CREATE INDEX IF NOT EXISTS idx_bridge_website_url ON bridge(website_url);

-- Table de cache temporaire pour les requêtes API (conformité RGPD 24h)
CREATE TABLE IF NOT EXISTS api_cache (
    cache_key VARCHAR(255) PRIMARY KEY,
    cache_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE GENERATED ALWAYS AS (created_at + INTERVAL '24 hours') STORED
);

-- Index pour le nettoyage automatique du cache expiré
CREATE INDEX IF NOT EXISTS idx_api_cache_expires_at ON api_cache(expires_at);

-- Fonction pour nettoyer automatiquement le cache expiré
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM api_cache WHERE expires_at < CURRENT_TIMESTAMP;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Déclencheur pour nettoyer le cache avant les insertions
CREATE TRIGGER trigger_cleanup_cache
BEFORE INSERT ON api_cache
EXECUTE FUNCTION cleanup_expired_cache();

-- Vue pour les statistiques de matching
CREATE OR REPLACE VIEW bridge_stats AS
SELECT 
    COUNT(*) as total_entries,
    COUNT(google_place_id) as matched_entries,
    COUNT(website_url) as websites_found,
    AVG(confidence_score) as avg_confidence,
    MIN(last_mapped_at) as oldest_mapping,
    MAX(last_mapped_at) as newest_mapping
FROM bridge;

-- Commentaires sur les colonnes
COMMENT ON TABLE bridge IS 'Table de correspondance entre SIREN, Google PlaceID et site web';
COMMENT ON COLUMN bridge.siren IS 'Numéro SIREN (9 chiffres) - identifiant unique INSEE';
COMMENT ON COLUMN bridge.google_place_id IS 'Identifiant unique Google Places pour l''établissement';
COMMENT ON COLUMN bridge.website_url IS 'URL du site web officiel de l''entreprise';
COMMENT ON COLUMN bridge.confidence_score IS 'Score de confiance du matching (0-100) basé sur la similarité des adresses et coordonnées';
COMMENT ON COLUMN bridge.gps_lat IS 'Latitude GPS de l''INSEE pour validation';
COMMENT ON COLUMN bridge.gps_lng IS 'Longitude GPS de l''INSEE pour validation';
COMMENT ON COLUMN bridge.last_mapped_at IS 'Date et heure de la dernière mise à jour du mapping';
COMMENT ON COLUMN bridge.last_verified_at IS 'Date et heure de la dernière vérification';
COMMENT ON COLUMN bridge.verification_count IS 'Nombre de fois où ce mapping a été vérifié';

-- Contraintes de validation
ALTER TABLE bridge ADD CONSTRAINT chk_siren_format 
CHECK (siren ~ '^[0-9]{9}$');

ALTER TABLE bridge ADD CONSTRAINT chk_gps_coordinates 
CHECK (
    (gps_lat IS NULL AND gps_lng IS NULL) OR
    (gps_lat BETWEEN -90 AND 90 AND gps_lng BETWEEN -180 AND 180)
);

ALTER TABLE bridge ADD CONSTRAINT chk_website_url 
CHECK (
    website_url IS NULL OR 
    website_url ~ '^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:/[^ ]*)?$'
);