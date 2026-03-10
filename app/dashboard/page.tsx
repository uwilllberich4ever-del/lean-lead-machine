'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Download, 
  Users, 
  Building, 
  Calendar, 
  BarChart3,
  FileText,
  Clock,
  MapPin
} from 'lucide-react';
import { useAuth } from '@/components/auth-context';
import ProtectedRoute from '@/components/protected-route';
import { getUserSearches, getUserExports } from '@/lib/supabase';

type DashboardStats = {
  totalSearches: number;
  totalExports: number;
  totalCompanies: number;
  lastSearchDate: string | null;
};

type RecentSearch = {
  id: string;
  search_params: any;
  results_count: number;
  created_at: string;
};

type RecentExport = {
  id: string;
  filename: string;
  row_count: number;
  created_at: string;
};

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalSearches: 0,
    totalExports: 0,
    totalCompanies: 0,
    lastSearchDate: null,
  });
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [recentExports, setRecentExports] = useState<RecentExport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        // Charger les recherches récentes
        const searches = await getUserSearches(user.id, 5);
        setRecentSearches(searches);

        // Charger les exports récents
        const exports = await getUserExports(user.id, 5);
        setRecentExports(exports);

        // Calculer les statistiques
        const totalSearches = searches.length;
        const totalExports = exports.length;
        const totalCompanies = searches.reduce((sum, search) => sum + search.results_count, 0);
        const lastSearchDate = searches.length > 0 ? searches[0].created_at : null;

        setStats({
          totalSearches,
          totalExports,
          totalCompanies,
          lastSearchDate,
        });
      } catch (error) {
        console.error('Erreur lors du chargement du dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatSearchParams = (params: any) => {
    if (!params) return 'Recherche';
    
    const parts = [];
    if (params.siren) parts.push(`SIREN: ${params.siren}`);
    if (params.nom) parts.push(`Nom: ${params.nom}`);
    if (params.codePostal) parts.push(`CP: ${params.codePostal}`);
    if (params.activite) parts.push(`Activité: ${params.activite}`);
    
    return parts.length > 0 ? parts.join(', ') : 'Recherche personnalisée';
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement du dashboard...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* En-tête */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Bonjour, {profile?.full_name || user?.email?.split('@')[0] || 'Utilisateur'} 👋
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Bienvenue sur votre tableau de bord Lean Lead Machine
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <Link
                  href="/"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Nouvelle recherche
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Statistiques */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Search className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-5">
                    <div className="text-sm font-medium text-gray-500">Recherches effectuées</div>
                    <div className="text-2xl font-semibold text-gray-900">{stats.totalSearches}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Download className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                  <div className="ml-5">
                    <div className="text-sm font-medium text-gray-500">Exports CSV</div>
                    <div className="text-2xl font-semibold text-gray-900">{stats.totalExports}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Building className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                  <div className="ml-5">
                    <div className="text-sm font-medium text-gray-500">Entreprises trouvées</div>
                    <div className="text-2xl font-semibold text-gray-900">{stats.totalCompanies}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-yellow-600" />
                    </div>
                  </div>
                  <div className="ml-5">
                    <div className="text-sm font-medium text-gray-500">Dernière recherche</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {stats.lastSearchDate ? formatDate(stats.lastSearchDate) : 'Aucune'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recherches récentes */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Recherches récentes</h3>
                  <Link
                    href="/searches"
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    Voir tout
                  </Link>
                </div>
              </div>
              <div className="px-6 py-4">
                {recentSearches.length > 0 ? (
                  <div className="flow-root">
                    <ul className="-my-4 divide-y divide-gray-200">
                      {recentSearches.map((search) => (
                        <li key={search.id} className="py-4">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                <Search className="h-4 w-4 text-gray-600" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {formatSearchParams(search.search_params)}
                              </p>
                              <div className="flex items-center mt-1">
                                <Users className="h-3 w-3 text-gray-400 mr-1" />
                                <span className="text-xs text-gray-500">
                                  {search.results_count} entreprise{search.results_count > 1 ? 's' : ''}
                                </span>
                                <span className="mx-2">•</span>
                                <Clock className="h-3 w-3 text-gray-400 mr-1" />
                                <span className="text-xs text-gray-500">
                                  {formatDate(search.created_at)}
                                </span>
                              </div>
                            </div>
                            <div>
                              <Link
                                href="/"
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-full text-blue-700 bg-blue-100 hover:bg-blue-200"
                              >
                                Refaire
                              </Link>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-gray-300 mx-auto" />
                    <p className="mt-2 text-sm text-gray-500">Aucune recherche effectuée</p>
                    <Link
                      href="/"
                      className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Faire une première recherche
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Exports récents */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Exports récents</h3>
                  <Link
                    href="/exports"
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    Voir tout
                  </Link>
                </div>
              </div>
              <div className="px-6 py-4">
                {recentExports.length > 0 ? (
                  <div className="flow-root">
                    <ul className="-my-4 divide-y divide-gray-200">
                      {recentExports.map((exportItem) => (
                        <li key={exportItem.id} className="py-4">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                                <FileText className="h-4 w-4 text-green-600" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {exportItem.filename}
                              </p>
                              <div className="flex items-center mt-1">
                                <BarChart3 className="h-3 w-3 text-gray-400 mr-1" />
                                <span className="text-xs text-gray-500">
                                  {exportItem.row_count} ligne{exportItem.row_count > 1 ? 's' : ''}
                                </span>
                                <span className="mx-2">•</span>
                                <Clock className="h-3 w-3 text-gray-400 mr-1" />
                                <span className="text-xs text-gray-500">
                                  {formatDate(exportItem.created_at)}
                                </span>
                              </div>
                            </div>
                            <div>
                              <button
                                onClick={() => {
                                  // Fonction de téléchargement à implémenter
                                  alert('Téléchargement à implémenter');
                                }}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-full text-green-700 bg-green-100 hover:bg-green-200"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Télécharger
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Download className="h-12 w-12 text-gray-300 mx-auto" />
                    <p className="mt-2 text-sm text-gray-500">Aucun export effectué</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Exportez vos résultats de recherche en CSV
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions rapides */}
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Actions rapides</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                href="/"
                className="bg-white overflow-hidden shadow rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Search className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-medium text-gray-900">Nouvelle recherche</h4>
                    <p className="text-xs text-gray-500">Trouver des entreprises</p>
                  </div>
                </div>
              </Link>

              <Link
                href="/profile"
                className="bg-white overflow-hidden shadow rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-medium text-gray-900">Mon profil</h4>
                    <p className="text-xs text-gray-500">Gérer mes informations</p>
                  </div>
                </div>
              </Link>

              <button
                onClick={() => {
                  // Fonction d'export à implémenter
                  alert('Export à implémenter');
                }}
                className="bg-white overflow-hidden shadow rounded-lg p-6 hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Download className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-medium text-gray-900">Exporter</h4>
                    <p className="text-xs text-gray-500">Télécharger mes données</p>
                  </div>
                </div>
              </button>

              <Link
                href="/help"
                className="bg-white overflow-hidden shadow rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-yellow-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-medium text-gray-900">Aide & Support</h4>
                    <p className="text-xs text-gray-500">Documentation et contact</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
