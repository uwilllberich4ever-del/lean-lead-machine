import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';

// GET: Récupérer le profil utilisateur
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Récupérer le profil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Erreur récupération profil:', profileError);
      return NextResponse.json(
        { error: 'Profil non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(profile);

  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// PUT: Mettre à jour le profil
export async function PUT(request: NextRequest) {
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
            // Ne rien faire pour PUT
          },
        },
      }
    );

    // Récupérer l'utilisateur authentifié
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Récupérer les données de mise à jour
    const updates = await request.json();

    // Valider les données
    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Données de mise à jour invalides' },
        { status: 400 }
      );
    }

    // Filtrer les champs autorisés
    const allowedUpdates = ['full_name'];
    const filteredUpdates: any = {};
    
    for (const key of allowedUpdates) {
      if (key in updates) {
        filteredUpdates[key] = updates[key];
      }
    }

    // Mettre à jour le profil
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update(filteredUpdates)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Erreur mise à jour profil:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du profil' },
        { status: 500 }
      );
    }

    return NextResponse.json(profile);

  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// DELETE: Supprimer le compte utilisateur
export async function DELETE(request: NextRequest) {
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
            // Ne rien faire pour DELETE
          },
        },
      }
    );

    // Récupérer l'utilisateur authentifié
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Vérifier la confirmation dans le body
    const { confirmation } = await request.json();
    
    if (confirmation !== 'DELETE_ACCOUNT') {
      return NextResponse.json(
        { error: 'Confirmation requise pour supprimer le compte' },
        { status: 400 }
      );
    }

    // Supprimer l'utilisateur avec le client admin
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Configuration serveur incomplète' },
        { status: 500 }
      );
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Erreur suppression utilisateur:', deleteError);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du compte' },
        { status: 500 }
      );
    }

    // Réponse de succès
    const response = NextResponse.json({ 
      message: 'Compte supprimé avec succès' 
    });

    // Supprimer les cookies
    response.cookies.delete('sb-access-token');
    response.cookies.delete('sb-refresh-token');

    return response;

  } catch (error) {
    console.error('Erreur lors de la suppression du compte:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}