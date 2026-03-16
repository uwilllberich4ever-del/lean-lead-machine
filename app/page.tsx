import SearchDashboard from "@/components/search-dashboard";
import StatsOverview from "@/components/stats-overview";
import RecentSearches from "@/components/recent-searches";

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Prospection B2B : <span className="text-primary">Trouvez des leads qualifiés en 45 secondes</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Accédez à toutes les entreprises françaises avec leurs données officielles (INSEE).
          Passez de 18 minutes de recherche manuelle à 45 secondes par entreprise ciblée.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <SearchDashboard />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <StatsOverview />
          <RecentSearches />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-5">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Comment trouver vos prochains clients en 3 étapes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-10 h-10 bg-primary-light text-primary rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-3">
              1
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Définissez votre cible</h3>
            <p className="text-sm text-gray-600">
              Utilisez des filtres précis : code postal, rayon (1-100km), secteur d'activité (NAF) et taille d'entreprise.
            </p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-primary-light text-primary rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-3">
              2
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Explorez les fiches détaillées</h3>
            <p className="text-sm text-gray-600">
              Consultez les données légales à jour, la localisation sur carte, et les contacts vérifiés pour chaque entreprise.
            </p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-primary-light text-primary rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-3">
              3
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Exportez et prospectez</h3>
            <p className="text-sm text-gray-600">
              Téléchargez votre liste en CSV (jusqu'à 500 entreprises) ou importez directement dans votre CRM.
            </p>
          </div>
        </div>
      </div>

      <section className="bg-primary rounded-2xl p-10 mx-4 my-8 text-center">
        <h2 className="text-white text-2xl font-bold mb-2">🚀 Testez gratuitement pendant 14 jours</h2>
        <p className="text-white opacity-90 mb-1">Accédez à toutes les fonctionnalités premium sans carte de crédit.</p>
        <p className="text-white opacity-90 mb-6">Seulement 29€/mois ensuite – moins cher qu'un café par jour.</p>
        <a href="/register" className="inline-block bg-white text-primary font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors">
          Commencer gratuitement →
        </a>
      </section>
    </div>
  );
}