import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// GET: Récupérer l'historique des exports
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

    // Récupérer les exports
    const { data: exports, error: exportError, count } = await supabase
      .from('user_exports')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (exportError) {
      console.error('Erreur récupération exports:', exportError);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des exports' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exports: exports || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des exports:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// POST: Enregistrer un nouvel export
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

    // Récupérer les données de l'export
    const { filename, row_count } = await request.json();

    // Validation
    if (!filename || typeof row_count !== 'number') {
      return NextResponse.json(
        { error: 'Paramètres d\'export invalides' },
        { status: 400 }
      );
    }

    // Enregistrer l'export
    const { data: exportItem, error: insertError } = await supabase
      .from('user_exports')
      .insert({
        user_id: user.id,
        filename,
        row_count,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erreur enregistrement export:', insertError);
      return NextResponse.json(
        { error: 'Erreur lors de l\'enregistrement de l\'export' },
        { status: 500 }
      );
    }

    return NextResponse.json(exportItem, { status: 201 });

  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de l\'export:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}