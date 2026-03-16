import SearchDashboard from "@/components/search-dashboard";
import StatsOverview from "@/components/stats-overview";
import RecentSearches from "@/components/recent-searches";

export default function Home() {
  return (
    <div className="space-y-6">
      {/* Hero card bleu style Pappers */}
      <div className="bg-primary rounded-2xl p-8 md:p-12 text-center text-white">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Prospection B2B : Trouvez des leads qualifiés en 45 secondes
        </h1>
        <p className="text-lg md:text-xl opacity-90 max-w-3xl mx-auto mb-8">
          Accédez à toutes les entreprises françaises avec leurs données officielles (INSEE).
          Passez de 18 minutes de recherche manuelle à 45 secondes par entreprise ciblée.
        </p>
        <a 
          href="/register" 
          className="inline-block bg-white text-primary font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
        >
          Commencer gratuitement →
        </a>
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

      <div className="bg-white rounded-xl shadow-card-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-navy mb-4">Comment trouver vos prochains clients en 3 étapes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">
              1
            </div>
            <h3 className="text-sm font-semibold text-navy mb-2">Définissez votre cible</h3>
            <p className="text-sm text-gray-600">
              Utilisez des filtres précis : code postal, rayon (1-100km), secteur d'activité (NAF) et taille d'entreprise.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">
              2
            </div>
            <h3 className="text-sm font-semibold text-navy mb-2">Explorez les fiches détaillées</h3>
            <p className="text-sm text-gray-600">
              Consultez les données légales à jour, la localisation sur carte, et les contacts vérifiés pour chaque entreprise.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">
              3
            </div>
            <h3 className="text-sm font-semibold text-navy mb-2">Exportez et prospectez</h3>
            <p className="text-sm text-gray-600">
              Téléchargez votre liste en CSV (jusqu'à 500 entreprises) ou importez directement dans votre CRM.
            </p>
          </div>
        </div>
      </div>

      <section className="bg-surface rounded-2xl p-8 border border-gray-200 text-center">
        <h2 className="text-2xl font-bold text-navy mb-2">🚀 Testez gratuitement pendant 14 jours</h2>
        <p className="text-gray-600 mb-1">Accédez à toutes les fonctionnalités premium sans carte de crédit.</p>
        <p className="text-gray-600 mb-6">Seulement 29€/mois ensuite – moins cher qu'un café par jour.</p>
        <a href="/register" className="inline-block bg-primary text-white font-semibold px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors shadow-md">
          Commencer gratuitement →
        </a>
      </section>
    </div>
  );
}