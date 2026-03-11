import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Récupérer le token d'accès depuis les cookies
    const accessToken = request.cookies.get('sb-access-token')?.value;
    
    if (accessToken && supabaseAdmin) {
      // Invalider la session côté Supabase
      await supabaseAdmin.auth.admin.signOut(accessToken);
    }

    // Créer la réponse de déconnexion
    const response = NextResponse.redirect(new URL('/login', request.url));

    // Supprimer les cookies d'authentification
    response.cookies.delete('sb-access-token');
    response.cookies.delete('sb-refresh-token');

    return response;

  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    
    // Même en cas d'erreur, on supprime les cookies
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('sb-access-token');
    response.cookies.delete('sb-refresh-token');
    
    return response;
  }
}

// Gérer aussi les requêtes GET pour la déconnexion
export async function GET(request: NextRequest) {
  return POST(request);
}