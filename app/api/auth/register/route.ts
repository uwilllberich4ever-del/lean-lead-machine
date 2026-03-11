import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, createProfile } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name } = await request.json();

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe sont requis' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères' },
        { status: 400 }
      );
    }

    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins une majuscule' },
        { status: 400 }
      );
    }

    if (!/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins un chiffre' },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur existe déjà (si admin client disponible)
    if (supabaseAdmin) {
      try {
        // Tentative de vérification via listUsers
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = users?.users?.find(user => user.email === email);
        
        if (existingUser) {
          return NextResponse.json(
            { error: 'Un compte avec cet email existe déjà' },
            { status: 409 }
          );
        }
      } catch (error) {
        // Ignorer l'erreur et continuer (la création échouera si doublon)
        console.warn('Impossible de vérifier l\'existence de l\'utilisateur:', error);
      }
    }

    // Créer l'utilisateur avec Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin?.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm pour le MVP
      user_metadata: {
        full_name: full_name || '',
      },
    }) || { data: null, error: new Error('Supabase admin client non configuré') };

    if (authError || !authData?.user) {
      console.error('Erreur création utilisateur:', authError);
      return NextResponse.json(
        { error: authError?.message || 'Erreur lors de la création du compte' },
        { status: 500 }
      );
    }

    // Créer le profil utilisateur
    const profile = await createProfile(authData.user.id, email, full_name);

    if (!profile) {
      // Si le profil n'a pas pu être créé, on supprime l'utilisateur auth
      await supabaseAdmin?.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: 'Erreur lors de la création du profil' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Compte créé avec succès',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name: full_name || '',
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}