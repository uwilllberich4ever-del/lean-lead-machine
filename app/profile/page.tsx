'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Calendar, Save, AlertCircle, Check, Trash2, LogOut, Lock } from 'lucide-react';
import { useAuth } from '@/components/auth-context';
import ProtectedRoute from '@/components/protected-route';

export default function ProfilePage() {
  const { user, profile, updateProfile, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'delete'>('profile');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Initialiser les valeurs du profil
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setEmail(user?.email || '');
    }
  }, [profile, user]);

  const handleProfileUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const { error, data } = await updateProfile({ full_name: fullName });
      
      if (error) {
        setError(error.message || 'Erreur lors de la mise à jour du profil');
      } else {
        setSuccess('Profil mis à jour avec succès !');
        refreshProfile();
      }
    } catch (err) {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Tous les champs sont obligatoires');
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas');
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères');
      setIsLoading(false);
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setError('Le nouveau mot de passe doit contenir au moins une majuscule');
      setIsLoading(false);
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setError('Le nouveau mot de passe doit contenir au moins un chiffre');
      setIsLoading(false);
      return;
    }

    try {
      // Note: La modification du mot de passe se fait via Supabase Auth
      // Cette fonctionnalité nécessite une implémentation côté serveur
      setError('La modification du mot de passe n\'est pas encore disponible. Utilisez "Mot de passe oublié" pour réinitialiser.');
    } catch (err) {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountDelete = async () => {
    if (deleteConfirmation !== 'SUPPRIMER') {
      setError('Veuillez taper "SUPPRIMER" pour confirmer la suppression');
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) {
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la suppression du compte');
      }

      await signOut();
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la suppression du compte');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !profile) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow">
            {/* En-tête */}
            <div className="px-6 py-8 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {profile.full_name || 'Mon profil'}
                  </h1>
                  <p className="text-gray-600">{user.email}</p>
                  <p className="text-sm text-gray-500">
                    Membre depuis {formatDate(profile.created_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation par onglets */}
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    activeTab === 'profile'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <User className="h-4 w-4 inline mr-2" />
                  Profil
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    activeTab === 'security'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Lock className="h-4 w-4 inline mr-2" />
                  Sécurité
                </button>
                <button
                  onClick={() => setActiveTab('delete')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    activeTab === 'delete'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Trash2 className="h-4 w-4 inline mr-2" />
                  Supprimer le compte
                </button>
              </nav>
            </div>

            {/* Contenu des onglets */}
            <div className="p-6">
              {error && (
                <div className="mb-6 rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">{error}</h3>
                    </div>
                  </div>
                </div>
              )}

              {success && (
                <div className="mb-6 rounded-md bg-green-50 p-4">
                  <div className="flex">
                    <Check className="h-5 w-5 text-green-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">{success}</h3>
                    </div>
                  </div>
                </div>
              )}

              {/* Onglet Profil */}
              {activeTab === 'profile' && (
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Informations personnelles</h3>
                    
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                          Nom complet
                        </label>
                        <div className="mt-1 relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            id="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Votre nom"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                          Adresse email
                        </label>
                        <div className="mt-1 relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="email"
                            id="email"
                            value={email}
                            disabled
                            className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 sm:text-sm"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          L'email ne peut pas être modifié
                        </p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Informations de compte</h4>
                      <div className="bg-gray-50 rounded-md p-4 space-y-2">
                        <div className="flex items-center text-sm">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">Compte créé le:</span>
                          <span className="ml-2 font-medium">{formatDate(profile.created_at)}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">Dernière mise à jour:</span>
                          <span className="ml-2 font-medium">{formatDate(profile.updated_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                    </button>
                  </div>
                </form>
              )}

              {/* Onglet Sécurité */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Changer le mot de passe</h3>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div>
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                          Mot de passe actuel
                        </label>
                        <input
                          type="password"
                          id="currentPassword"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="••••••••"
                        />
                      </div>

                      <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                          Nouveau mot de passe
                        </label>
                        <input
                          type="password"
                          id="newPassword"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="••••••••"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Minimum 8 caractères, avec une majuscule et un chiffre
                        </p>
                      </div>

                      <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                          Confirmer le nouveau mot de passe
                        </label>
                        <input
                          type="password"
                          id="confirmPassword"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="••••••••"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {isLoading ? 'Modification...' : 'Changer le mot de passe'}
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Sessions actives</h4>
                    <div className="bg-gray-50 rounded-md p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Session actuelle</p>
                          <p className="text-xs text-gray-500">Connecté depuis cet appareil</p>
                        </div>
                        <button
                          onClick={signOut}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <LogOut className="h-4 w-4 mr-1" />
                          Déconnexion
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Onglet Suppression de compte */}
              {activeTab === 'delete' && (
                <div className="space-y-6">
                  <div className="bg-red-50 border border-red-200 rounded-md p-6">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <h3 className="text-lg font-medium text-red-800">Supprimer votre compte</h3>
                        <div className="mt-2 text-red-700">
                          <p className="text-sm">
                            Cette action est irréversible. Toutes vos données seront définitivement supprimées :
                          </p>
                          <ul className="mt-2 text-sm list-disc list-inside space-y-1">
                            <li>Votre profil utilisateur</li>
                            <li>Votre historique de recherches</li>
                            <li>Vos exports CSV</li>
                            <li>Toutes vos données personnelles</li>
                          </ul>
                          <p className="mt-3 text-sm font-medium">
                            Cette action ne peut pas être annulée.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="deleteConfirmation" className="block text-sm font-medium text-gray-700">
                      Pour confirmer, tapez <span className="font-mono text-red-600">SUPPRIMER</span>
                    </label>
                    <input
                      type="text"
                      id="deleteConfirmation"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                      placeholder="SUPPRIMER"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleAccountDelete}
                      disabled={isLoading || deleteConfirmation !== 'SUPPRIMER'}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {isLoading ? 'Suppression...' : 'Supprimer définitivement mon compte'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}