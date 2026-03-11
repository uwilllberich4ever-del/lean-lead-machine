import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// GET: Récupérer l'historique des recherches
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

    // Récupérer les paramètres de pagination
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Récupérer les recherches
    const { data: searches, error: searchError, count } = await supabase
      .from('user_searches')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (searchError) {
      console.error('Erreur récupération recherches:', searchError);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des recherches' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      searches: searches || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des recherches:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// POST: Enregistrer une nouvelle recherche
export async function POST(request: NextRequest) {
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
            // Ne rien faire pour POST
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

    // Récupérer les données de la recherche
    const { search_params, results_count } = await request.json();

    // Validation
    if (!search_params || typeof results_count !== 'number') {
      return NextResponse.json(
        { error: 'Paramètres de recherche invalides' },
        { status: 400 }
      );
    }

    // Enregistrer la recherche
    const { data: search, error: insertError } = await supabase
      .from('user_searches')
      .insert({
        user_id: user.id,
        search_params,
        results_count,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erreur enregistrement recherche:', insertError);
      return NextResponse.json(
        { error: 'Erreur lors de l\'enregistrement de la recherche' },
        { status: 500 }
      );
    }

    return NextResponse.json(search, { status: 201 });

  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de la recherche:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}