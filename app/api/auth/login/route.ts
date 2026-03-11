import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe sont requis' },
        { status: 400 }
      );
    }

    // Utiliser le client admin pour vérifier les credentials
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Configuration serveur incomplète' },
        { status: 500 }
      );
    }

    // Authentifier l'utilisateur
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('Erreur d\'authentification:', authError);
      
      // Messages d'erreur plus spécifiques
      let errorMessage = 'Email ou mot de passe incorrect';
      if (authError.message.includes('Invalid login credentials')) {
        errorMessage = 'Email ou mot de passe incorrect';
      } else if (authError.message.includes('Email not confirmed')) {
        errorMessage = 'Veuillez confirmer votre email avant de vous connecter';
      } else if (authError.message.includes('Too many requests')) {
        errorMessage = 'Trop de tentatives de connexion. Veuillez réessayer plus tard';
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 401 }
      );
    }

    if (!authData.session) {
      return NextResponse.json(
        { error: 'Erreur lors de la création de la session' },
        { status: 500 }
      );
    }

    // Récupérer l'URL de redirection
    const searchParams = request.nextUrl.searchParams;
    const redirect = searchParams.get('redirect') || '/dashboard';

    // Créer la réponse avec redirection
    const response = NextResponse.redirect(new URL(redirect, request.url));

    // Définir les cookies d'authentification
    const { access_token, refresh_token } = authData.session;
    
    response.cookies.set({
      name: 'sb-access-token',
      value: access_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 jours
    });

    response.cookies.set({
      name: 'sb-refresh-token',
      value: refresh_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 jours
    });

    return response;

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}