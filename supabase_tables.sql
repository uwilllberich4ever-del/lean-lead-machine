-- Tables pour l'authentification Supabase - Lean Lead Machine
-- Exécuter dans l'éditeur SQL de Supabase

-- 1. Table profiles (extension de auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table user_searches (historique des recherches)
CREATE TABLE IF NOT EXISTS public.user_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  search_params JSONB NOT NULL,
  results_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table user_exports (historique des exports)
CREATE TABLE IF NOT EXISTS public.user_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table user_credits (gestion des crédits - optionnel pour V2)
CREATE TABLE IF NOT EXISTS public.user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer des index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_searches_user_id ON public.user_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_user_searches_created_at ON public.user_searches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_exports_user_id ON public.user_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_user_exports_created_at ON public.user_exports(created_at DESC);

-- Activer RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour profiles
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Politiques RLS pour user_searches
CREATE POLICY "Users can view their own searches" 
  ON public.user_searches FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own searches" 
  ON public.user_searches FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Politiques RLS pour user_exports
CREATE POLICY "Users can view their own exports" 
  ON public.user_exports FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exports" 
  ON public.user_exports FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Politiques RLS pour user_credits
CREATE POLICY "Users can view their own credits" 
  ON public.user_credits FOR SELECT 
  USING (auth.uid() = user_id);

-- Fonction pour mettre à jour le timestamp updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour profiles
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Commentaires pour documentation
COMMENT ON TABLE public.profiles IS 'Profiles utilisateurs étendant auth.users';
COMMENT ON TABLE public.user_searches IS 'Historique des recherches effectuées par les utilisateurs';
COMMENT ON TABLE public.user_exports IS 'Historique des exports CSV effectués par les utilisateurs';
COMMENT ON TABLE public.user_credits IS 'Gestion des crédits utilisateurs (pour V2)';