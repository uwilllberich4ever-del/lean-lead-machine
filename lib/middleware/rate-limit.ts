/**
 * Middleware de rate limiting pour Lean Lead Machine MVP
 */

import { NextRequest } from 'next/server';

interface RateLimitData {
  count: number;
  firstRequest: number;
  windowStart: number;
}

// Cache en mémoire simple pour le rate limiting
const rateLimitCache = new Map<string, RateLimitData>();

// Configuration du rate limiting
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 min par défaut
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_MAX_REQUESTS || '100', 10);

export async function rateLimit(request: NextRequest): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  // Pour le MVP, on utilise une IP simple
  // En production, utilisez un identifiant utilisateur ou session
  const identifier = request.ip || request.headers.get('x-forwarded-for') || 'anonymous';
  const key = `rate-limit:${identifier}`;
  
  const now = Date.now();
  const windowStart = Math.floor(now / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS;

  let data = rateLimitCache.get(key);
  
  // Si pas de données ou nouvelle fenêtre de temps
  if (!data || data.windowStart < windowStart) {
    data = {
      count: 0,
      firstRequest: now,
      windowStart
    };
  }

  // Incrémenter le compteur
  data.count += 1;
  rateLimitCache.set(key, data);

  // Calculer les métriques
  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - data.count);
  const resetTime = data.windowStart + RATE_LIMIT_WINDOW_MS;
  
  // Vérifier si la limite est dépassée
  const allowed = data.count <= RATE_LIMIT_MAX_REQUESTS;

  // Nettoyer le cache périodiquement (simplifié pour MVP)
  if (Math.random() < 0.01) { // 1% chance de nettoyage à chaque requête
    cleanupRateLimitCache();
  }

  return {
    allowed,
    remaining,
    resetTime
  };
}

function cleanupRateLimitCache(): void {
  const now = Date.now();
  const windowStart = Math.floor(now / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS;
  
  for (const [key, data] of rateLimitCache.entries()) {
    // Supprimer les entrées des fenêtres précédentes
    if (data.windowStart < windowStart) {
      rateLimitCache.delete(key);
    }
  }
}

// Helper pour ajouter les headers de rate limiting à la réponse
export function addRateLimitHeaders(
  headers: Headers,
  rateLimitInfo: { allowed: boolean; remaining: number; resetTime: number }
): void {
  headers.set('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS.toString());
  headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
  headers.set('X-RateLimit-Reset', Math.ceil(rateLimitInfo.resetTime / 1000).toString());
  
  if (!rateLimitInfo.allowed) {
    headers.set('Retry-After', Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000).toString());
  }
}