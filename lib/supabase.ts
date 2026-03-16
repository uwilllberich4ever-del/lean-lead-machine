import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client côté client (utilise la clé anonyme)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

// Client côté serveur (utilise la clé de service role si disponible)
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Types pour les tables
export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
};

export type UserSearch = {
  id: string;
  user_id: string;
  search_params: any;
  results_count: number;
  created_at: string;
};

export type UserExport = {
  id: string;
  user_id: string;
  filename: string;
  row_count: number;
  created_at: string;
};

// Fonctions utilitaires
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    return null;
  }
  
  return data as Profile;
}

export async function createProfile(userId: string, email: string, fullName?: string) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email,
      full_name: fullName || null,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Erreur lors de la création du profil:', error);
    return null;
  }
  
  return data as Profile;
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  
  if (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    return null;
  }
  
  return data as Profile;
}

export async function logSearch(userId: string, searchParams: any, resultsCount: number) {
  const { data, error } = await supabase
    .from('user_searches')
    .insert({
      user_id: userId,
      search_params: searchParams,
      results_count: resultsCount,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Erreur lors de l\'enregistrement de la recherche:', error);
    return null;
  }
  
  return data as UserSearch;
}

export async function getUserSearches(userId: string, limit = 10) {
  const { data, error } = await supabase
    .from('user_searches')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Erreur lors de la récupération des recherches:', error);
    return [];
  }
  
  return data as UserSearch[];
}

export async function countUserSearches(userId: string) {
  const { count, error } = await supabase
    .from('user_searches')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  if (error) {
    console.error('Erreur lors du comptage des recherches:', error);
    return 0;
  }
  
  return count || 0;
}

export async function logExport(userId: string, filename: string, rowCount: number) {
  const { data, error } = await supabase
    .from('user_exports')
    .insert({
      user_id: userId,
      filename,
      row_count: rowCount,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Erreur lors de l\'enregistrement de l\'export:', error);
    return null;
  }
  
  return data as UserExport;
}

export async function getUserExports(userId: string, limit = 10) {
  const { data, error } = await supabase
    .from('user_exports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Erreur lors de la récupération des exports:', error);
    return [];
  }
  
  return data as UserExport[];
}