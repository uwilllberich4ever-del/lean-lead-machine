/**
 * Middleware de rate limiting pour Lean Lead Machine MVP
 */

import { NextRequest, NextResponse } from 'next/server';

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

interface RateLimitOptions {
  max?: number;
  windowMs?: number;
}

interface RateLimitResult {
  limited: boolean;
  response?: NextResponse;
  remaining?: number;
  resetTime?: number;
}

export async function rateLimit(
  request: NextRequest,
  options?: RateLimitOptions
): Promise<RateLimitResult> {
  // Utiliser les options ou les valeurs par défaut
  const maxRequests = options?.max || RATE_LIMIT_MAX_REQUESTS;
  const windowMs = options?.windowMs || RATE_LIMIT_WINDOW_MS;
  
  // Pour le MVP, on utilise une IP simple
  // En production, utilisez un identifiant utilisateur ou session
  const identifier = request.ip || request.headers.get('x-forwarded-for') || 'anonymous';
  const key = `rate-limit:${identifier}:${maxRequests}:${windowMs}`;
  
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;

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
  const remaining = Math.max(0, maxRequests - data.count);
  const resetTime = data.windowStart + windowMs;
  
  // Vérifier si la limite est dépassée
  const limited = data.count > maxRequests;

  // Nettoyer le cache périodiquement (simplifié pour MVP)
  if (Math.random() < 0.01) { // 1% chance de nettoyage à chaque requête
    cleanupRateLimitCache();
  }

  if (limited) {
    const retryAfter = Math.ceil((resetTime - now) / 1000);
    const response = NextResponse.json(
      {
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: `Trop de requêtes. Réessayez dans ${retryAfter} secondes.`,
        retryAfter
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString()
        }
      }
    );
    
    return {
      limited: true,
      response,
      remaining: 0,
      resetTime
    };
  }

  return {
    limited: false,
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