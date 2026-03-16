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
  HelpCircle,
  Bell,
  TrendingUp,
  Target,
  Shield
} from 'lucide-react';
import { useAuth } from '@/components/auth-context';
import ProtectedRoute from '@/components/protected-route';
import { getUserSearches, getUserExports, countUserSearches } from '@/lib/supabase';
import { ActiveBadge, CAC40Badge, AlertBadge } from '@/components/status-badge';

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
        const totalSearches = await countUserSearches(user.id);
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

  const handleDownloadExport = async (exportId: string, filename: string) => {
    try {
      // Pour l'instant, on simule un téléchargement
      // Dans une version future, on pourrait appeler l'API pour récupérer le fichier
      const response = await fetch(`/api/export/csv?siren=${exportId}`);
      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      alert('Impossible de télécharger le fichier. Veuillez réessayer.');
    }
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
        <div className="min-h-screen bg-surface py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement du dashboard...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-surface">
        {/* Hero card bleu */}
        <div className="bg-primary text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold">
                  Bonjour, {profile?.full_name || user?.email?.split('@')[0] || 'Utilisateur'} 👋
                </h1>
                <p className="mt-1 opacity-90">
                  Bienvenue sur votre tableau de bord Lean Lead Machine
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 backdrop-blur-sm">
                    💳 10 crédits disponibles
                  </span>
                  <ActiveBadge />
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 backdrop-blur-sm">
                    <Bell className="h-3 w-3 mr-1" /> 3 alertes actives
                  </span>
                </div>
              </div>
              <div className="mt-4 sm:mt-0">
                <Link
                  href="/"
                  className="inline-flex items-center px-4 py-2 bg-white text-primary font-semibold rounded-lg shadow-md hover:bg-gray-50 transition-colors"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Nouvelle recherche
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Grille 2 colonnes de cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Colonne gauche */}
            <div className="space-y-8">
              {/* Statistiques */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow-card p-5 border border-gray-100">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Search className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-500">Recherches</div>
                      <div className="text-2xl font-semibold text-navy">{stats.totalSearches}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-card p-5 border border-gray-100">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-teal/10 flex items-center justify-center">
                        <Download className="h-5 w-5 text-teal" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-500">Exports CSV</div>
                      <div className="text-2xl font-semibold text-navy">{stats.totalExports}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-card p-5 border border-gray-100">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                        <Building className="h-5 w-5 text-success" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-500">Entreprises</div>
                      <div className="text-2xl font-semibold text-navy">{stats.totalCompanies}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-card p-5 border border-gray-100">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-warning" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-500">Dernière</div>
                      <div className="text-lg font-semibold text-navy">
                        {stats.lastSearchDate ? formatDate(stats.lastSearchDate) : 'Aucune'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recherches récentes */}
              <div className="bg-white rounded-xl shadow-card-lg border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-navy">Recherches récentes</h3>
                    <Link
                      href="/searches"
                      className="text-sm font-medium text-primary hover:text-primary/80"
                    >
                      Voir tout
                    </Link>
                  </div>
                </div>
                <div className="px-6 py-4">
                  {recentSearches.length > 0 ? (
                    <div className="flow-root">
                      <ul className="-my-4 divide-y divide-gray-100">
                        {recentSearches.map((search) => (
                          <li key={search.id} className="py-4">
                            <div className="flex items-center space-x-4">
                              <div className="flex-shrink-0">
                                <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center">
                                  <Search className="h-4 w-4 text-gray-600" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-navy truncate">
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
                                  href={`/?${new URLSearchParams({
                                    postalCode: search.search_params?.codePostal || '',
                                    nafCode: search.search_params?.codeNaf || '',
                                    employeeRange: search.search_params?.trancheEffectif || '',
                                    radius: search.search_params?.rayonKm || '10',
                                  })}`}
                                  className="inline-flex items-center px-3 py-1 border border-primary/20 text-xs font-medium rounded-full text-primary bg-primary/5 hover:bg-primary/10"
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
                        className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90"
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Faire une première recherche
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions rapides */}
              <div className="bg-white rounded-xl shadow-card-lg border border-gray-100 p-6">
                <h3 className="text-lg font-medium text-navy mb-4">Actions rapides</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Link
                    href="/"
                    className="bg-surface rounded-lg p-4 hover:bg-gray-50 transition-colors border border-gray-200"
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Search className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-navy">Nouvelle recherche</h4>
                        <p className="text-xs text-gray-500">Trouver des entreprises</p>
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/profile"
                    className="bg-surface rounded-lg p-4 hover:bg-gray-50 transition-colors border border-gray-200"
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-teal/10 flex items-center justify-center">
                          <Users className="h-4 w-4 text-teal" />
                        </div>
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-navy">Mon profil</h4>
                        <p className="text-xs text-gray-500">Gérer mes informations</p>
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/"
                    className="bg-surface rounded-lg p-4 hover:bg-gray-50 transition-colors border border-gray-200"
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                          <Download className="h-4 w-4 text-success" />
                        </div>
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-navy">Exporter</h4>
                        <p className="text-xs text-gray-500">Télécharger en CSV</p>
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/help"
                    className="bg-surface rounded-lg p-4 hover:bg-gray-50 transition-colors border border-gray-200"
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-warning/10 flex items-center justify-center">
                          <HelpCircle className="h-4 w-4 text-warning" />
                        </div>
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-navy">Aide & Support</h4>
                        <p className="text-xs text-gray-500">Documentation et contact</p>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Colonne droite */}
            <div className="space-y-8">
              {/* Exports récents */}
              <div className="bg-white rounded-xl shadow-card-lg border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-navy">Exports récents</h3>
                    <Link
                      href="/exports"
                      className="text-sm font-medium text-primary hover:text-primary/80"
                    >
                      Voir tout
                    </Link>
                  </div>
                </div>
                <div className="px-6 py-4">
                  {recentExports.length > 0 ? (
                    <div className="flow-root">
                      <ul className="-my-4 divide-y divide-gray-100">
                        {recentExports.map((exportItem) => (
                          <li key={exportItem.id} className="py-4">
                            <div className="flex items-center space-x-4">
                              <div className="flex-shrink-0">
                                <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                                  <FileText className="h-4 w-4 text-success" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-navy truncate">
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
                                  onClick={() => handleDownloadExport(exportItem.id, exportItem.filename)}
                                  className="inline-flex items-center px-3 py-1 border border-success/20 text-xs font-medium rounded-full text-success bg-success/5 hover:bg-success/10"
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

              {/* Insights et badges */}
              <div className="bg-white rounded-xl shadow-card-lg border border-gray-100 p-6">
                <h3 className="text-lg font-medium text-navy mb-4">Insights & Badges</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <TrendingUp className="h-5 w-5 text-teal mr-3" />
                      <div>
                        <p className="text-sm font-medium text-navy">Performance recherche</p>
                        <p className="text-xs text-gray-500">+24% vs mois dernier</p>
                      </div>
                    </div>
                    <CAC40Badge />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Target className="h-5 w-5 text-primary mr-3" />
                      <div>
                        <p className="text-sm font-medium text-navy">Taux de conversion</p>
                        <p className="text-xs text-gray-500">18% des leads contactés</p>
                      </div>
                    </div>
                    <ActiveBadge />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Shield className="h-5 w-5 text-success mr-3" />
                      <div>
                        <p className="text-sm font-medium text-navy">Données sécurisées</p>
                        <p className="text-xs text-gray-500">RGPD conforme</p>
                      </div>
                    </div>
                    <AlertBadge />
                  </div>
                </div>
              </div>

              {/* Entreprises suivies */}
              <div className="bg-white rounded-xl shadow-card-lg border border-gray-100 p-6">
                <h3 className="text-lg font-medium text-navy mb-4">Entreprises suivies</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-navy">TechCorp SAS</p>
                      <p className="text-xs text-gray-500">Paris 75008 • 50-99 employés</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ActiveBadge />
                      <button className="text-teal hover:text-teal/80">
                        <Bell className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-navy">GreenEnergy SA</p>
                      <p className="text-xs text-gray-500">Lyon 69002 • 100-249 employés</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ActiveBadge />
                      <button className="text-gray-400 hover:text-gray-600">
                        <Bell className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-navy">LogiTransports</p>
                      <p className="text-xs text-gray-500">Marseille 13001 • 10-19 employés</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <AlertBadge />
                      <button className="text-teal hover:text-teal/80">
                        <Bell className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Link
                    href="/followed"
                    className="text-sm font-medium text-primary hover:text-primary/80"
                  >
                    Voir toutes les entreprises suivies →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
