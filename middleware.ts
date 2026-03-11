import { NextResponse, type NextRequest } from 'next/server';

// Middleware temporairement désactivé pour MVP V1
// L'authentification sera activée en V2
export async function middleware(request: NextRequest) {
  // Pour le MVP V1, autoriser toutes les requêtes
  // L'authentification sera implémentée plus tard
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Pas de protection pour le moment
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};