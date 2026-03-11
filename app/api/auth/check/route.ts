import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  try {
    // Créer le client serveur
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // Ne rien faire pour GET
          },
        },
      }
    );

    // Récupérer l'utilisateur authentifié
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ 
        authenticated: false,
        error: error?.message || 'Non authentifié'
      }, { status: 401 });
    }

    // Récupérer le profil utilisateur
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    return NextResponse.json({ 
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || '',
      }
    });

  } catch (error) {
    console.error('Erreur lors de la vérification d\'authentification:', error);
    return NextResponse.json({ 
      authenticated: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 });
  }
}