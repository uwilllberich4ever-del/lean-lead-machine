import SearchDashboard from "@/components/search-dashboard";
import StatsOverview from "@/components/stats-overview";
import RecentSearches from "@/components/recent-searches";

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Prospection B2B <span className="text-blue-600">Intelligente</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Transformez votre recherche de leads avec des données officielles françaises.
          De 18 minutes à 45 secondes par entreprise.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <SearchDashboard />
        </div>
        <div className="space-y-8">
          <StatsOverview />
          <RecentSearches />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Comment ça marche ?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
              1
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Recherche ciblée</h3>
            <p className="text-gray-600">
              Filtrez par code postal, rayon, code NAF et effectif pour trouver les entreprises pertinentes.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
              2
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Fiche Golden Record</h3>
            <p className="text-gray-600">
              Obtenez une fiche complète avec données légales, carte Google et contacts en temps réel.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
              3
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Export & Intégration</h3>
            <p className="text-gray-600">
              Exportez en CSV ou intégrez directement dans votre CRM. Jusqu'à 500 leads par export.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg p-8 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Essai gratuit 14 jours</h2>
            <p className="opacity-90">
              Accédez à toutes les fonctionnalités sans engagement. 29€/mois ensuite.
            </p>
          </div>
          <button className="mt-4 md:mt-0 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
            Commencer l'essai gratuit
          </button>
        </div>
      </div>
    </div>
  );
}