'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, getProfile, Profile } from '@/lib/supabase';

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any; data: Profile | null }>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fonction pour rafraîchir le profil
  const refreshProfile = async () => {
    if (user) {
      const userProfile = await getProfile(user.id);
      setProfile(userProfile);
    }
  };

  // Initialiser l'authentification
  useEffect(() => {
    // Vérifier la session active
    const initializeAuth = async () => {
      setIsLoading(true);
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erreur lors de la récupération de la session:', error);
          setUser(null);
          setProfile(null);
        } else if (session?.user) {
          setUser(session.user);
          
          // Récupérer le profil utilisateur
          const userProfile = await getProfile(session.user.id);
          setProfile(userProfile);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'auth:', error);
        setUser(null);
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          
          // Récupérer le profil utilisateur
          const userProfile = await getProfile(session.user.id);
          setProfile(userProfile);
        } else {
          setUser(null);
          setProfile(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fonction de connexion
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      // Le reste est géré par onAuthStateChange
      return { error: null };
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      return { error };
    }
  };

  // Fonction d'inscription
  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || '',
          },
        },
      });

      if (error) {
        return { error };
      }

      // Créer le profil si l'inscription réussit
      if (data.user) {
        // La création du profil se fera via un trigger côté serveur
        // ou via l'API route /api/auth/register
      }

      return { error: null };
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      return { error };
    }
  };

  // Fonction de déconnexion
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // Le reste est géré par onAuthStateChange
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  // Fonction de mise à jour du profil
  const updateProfileFn = async (updates: Partial<Profile>) => {
    if (!user) {
      return { error: new Error('Utilisateur non connecté'), data: null };
    }

    try {
      // Mettre à jour via l'API
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { error: new Error(errorData.error || 'Erreur de mise à jour'), data: null };
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      
      return { error: null, data: updatedProfile };
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      return { error, data: null };
    }
  };

  const value = {
    user,
    profile,
    isLoading,
    signIn,
    signUp,
    signOut,
    updateProfile: updateProfileFn,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}