import SearchDashboard from "@/components/search-dashboard";
import StatsOverview from "@/components/stats-overview";
import RecentSearches from "@/components/recent-searches";

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Prospection B2B : <span className="text-primary">Trouvez des leads qualifiés en 45 secondes</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Accédez à toutes les entreprises françaises avec leurs données officielles (INSEE).
          Passez de 18 minutes de recherche manuelle à 45 secondes par entreprise ciblée.
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
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Comment trouver vos prochains clients en 3 étapes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-light text-primary rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
              1
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Définissez votre cible</h3>
            <p className="text-gray-600">
              Utilisez des filtres précis : code postal, rayon (1-100km), secteur d'activité (NAF) et taille d'entreprise.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-light text-primary rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
              2
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Explorez les fiches détaillées</h3>
            <p className="text-gray-600">
              Consultez les données légales à jour, la localisation sur carte, et les contacts vérifiés pour chaque entreprise.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-light text-primary rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
              3
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Exportez et prospectez</h3>
            <p className="text-gray-600">
              Téléchargez votre liste en CSV (jusqu'à 500 entreprises) ou importez directement dans votre CRM.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary to-primary-dark rounded-xl shadow-lg p-8 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">🚀 Testez gratuitement pendant 14 jours</h2>
            <p className="opacity-90">
              Accédez à toutes les fonctionnalités premium sans carte de crédit. 
              <br />
              <span className="font-semibold">Seulement 29€/mois ensuite</span> – moins cher qu'un café par jour.
            </p>
          </div>
          <button className="mt-4 md:mt-0 bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-md">
            Démarrer mon essai gratuit →
          </button>
        </div>
      </div>
    </div>
  );
}