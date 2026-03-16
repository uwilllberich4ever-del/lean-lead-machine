"use client";

import { CreditCard, Zap, Shield, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/toast";

const creditPacks = [
  { id: 1, name: "Starter", credits: 100, price: 9, popular: false },
  { id: 2, name: "Pro", credits: 500, price: 29, popular: true },
  { id: 3, name: "Business", credits: 2000, price: 99, popular: false },
  { id: 4, name: "Enterprise", credits: 10000, price: 399, popular: false },
];

const creditUsage = [
  { action: "Recherche simple", credits: 1 },
  { action: "Fiche entreprise complète", credits: 3 },
  { action: "Export CSV (par entreprise)", credits: 2 },
  { action: "Enrichissement LinkedIn", credits: 5 },
  { action: "Carte Google Maps", credits: 1 },
];

const transactionHistory = [
  { id: 1, date: "2026-03-10", description: "Achat pack Pro", amount: 500, type: "credit" },
  { id: 2, date: "2026-03-09", description: "Export CSV (42 entreprises)", amount: -84, type: "debit" },
  { id: 3, date: "2026-03-08", description: "Recherches avancées", amount: -23, type: "debit" },
  { id: 4, date: "2026-03-07", description: "Achat pack Starter", amount: 100, type: "credit" },
  { id: 5, date: "2026-03-06", description: "Fiches entreprises", amount: -45, type: "debit" },
];

export default function CreditsPage() {
  const [currentCredits, setCurrentCredits] = useState(247);
  const [selectedPack, setSelectedPack] = useState(2);
  const [isProcessing, setIsProcessing] = useState(false);
  const { addToast } = useToast();

  const handlePurchase = async (packId: number) => {
    setIsProcessing(true);
    const pack = creditPacks.find(p => p.id === packId);
    if (!pack) return;

    // Simulate payment processing
    setTimeout(() => {
      setCurrentCredits(prev => prev + pack.credits);
      setIsProcessing(false);
      addToast(`Achat réussi ! ${pack.credits} crédits ont été ajoutés à votre compte.`, 'success');
    }, 1500);
  };

  const totalSpent = transactionHistory
    .filter(t => t.type === "debit")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalPurchased = transactionHistory
    .filter(t => t.type === "credit")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des crédits</h1>
          <p className="text-gray-600 mt-2">Achetez et gérez vos crédits pour utiliser Lean Lead Machine</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-gray-900">{currentCredits}</div>
          <div className="text-gray-600">crédits disponibles</div>
        </div>
      </div>

      {/* Credit status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Votre solde</h3>
            <Zap className="w-5 h-5 text-blue-600" />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Crédits utilisés</span>
                <span className="font-medium">{totalSpent}</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500" 
                  style={{ width: `${(totalSpent / (totalSpent + currentCredits)) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">{currentCredits}</div>
              <div className="text-sm text-gray-600">crédits restants</div>
            </div>
            {currentCredits < 50 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
                  <span className="text-sm text-yellow-800">Vos crédits sont bientôt épuisés</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Coût d'utilisation</h3>
            <CreditCard className="w-5 h-5 text-green-600" />
          </div>
          <div className="space-y-3">
            {creditUsage.map((usage, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span className="text-gray-700">{usage.action}</span>
                <span className="font-medium text-gray-900">{usage.credits} crédit{usage.credits > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-gray-500">
            <p>1 crédit ≈ 0.10€ (pack Pro)</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Garanties</h3>
            <Shield className="w-5 h-5 text-purple-600" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <span className="text-sm">Crédits valables 12 mois</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <span className="text-sm">Pas d'engagement</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <span className="text-sm">Remboursement sous 30 jours</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <span className="text-sm">Facture disponible</span>
            </div>
          </div>
          <div className="mt-6">
            <button className="w-full border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Voir ma facturation
            </button>
          </div>
        </div>
      </div>

      {/* Credit packs */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Acheter des crédits</h2>
          <div className="text-sm text-gray-600">
            Meilleur rapport qualité/prix : <span className="font-semibold text-blue-600">Pack Pro</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {creditPacks.map((pack) => (
            <div
              key={pack.id}
              className={`border rounded-xl p-6 transition-all cursor-pointer ${
                selectedPack === pack.id
                  ? "border-blue-500 ring-2 ring-blue-100"
                  : "border-gray-200 hover:border-blue-300"
              } ${pack.popular ? "relative" : ""}`}
              onClick={() => setSelectedPack(pack.id)}
            >
              {pack.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    POPULAIRE
                  </div>
                </div>
              )}
              
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-gray-900">{pack.name}</div>
                <div className="text-3xl font-bold text-blue-600 mt-2">{pack.credits}</div>
                <div className="text-gray-600">crédits</div>
              </div>
              
              <div className="text-center mb-6">
                <div className="text-2xl font-bold text-gray-900">{pack.price}€</div>
                <div className="text-sm text-gray-500">
                  soit {(pack.price / pack.credits).toFixed(2)}€/crédit
                </div>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePurchase(pack.id);
                }}
                disabled={isProcessing}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  selectedPack === pack.id
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Traitement...
                  </div>
                ) : (
                  "Acheter maintenant"
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Paiement sécurisé par</p>
              <div className="flex items-center space-x-2 mt-1">
                <CreditCard className="w-6 h-6 text-gray-400" />
                <span className="text-sm font-medium">Stripe</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Total sélectionné</p>
              <p className="text-xl font-bold text-gray-900">
                {creditPacks.find(p => p.id === selectedPack)?.price}€
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction history */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Historique des transactions</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Description</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Montant</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Type</th>
              </tr>
            </thead>
            <tbody>
              {transactionHistory.map((transaction) => (
                <tr key={transaction.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-3 px-4 text-sm text-gray-700">{transaction.date}</td>
                  <td className="py-3 px-4 text-sm text-gray-700">{transaction.description}</td>
                  <td className="py-3 px-4">
                    <span className={`text-sm font-medium ${
                      transaction.type === "credit" ? "text-green-600" : "text-red-600"
                    }`}>
                      {transaction.type === "credit" ? "+" : "-"}{Math.abs(transaction.amount)} crédits
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      transaction.type === "credit"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {transaction.type === "credit" ? "Achat" : "Utilisation"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-between items-center pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Total dépensé: <span className="font-medium text-gray-900">{totalPurchased} crédits achetés</span>
          </div>
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            Exporter l'historique (CSV)
          </button>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Questions fréquentes</h3>
        <div className="space-y-4">
          <div>
            <p className="font-medium text-gray-900">Les crédits ont-ils une date d'expiration ?</p>
            <p className="text-sm text-gray-600 mt-1">
              Oui, les crédits sont valables 12 mois à partir de la date d'achat. Vous recevrez une notification 30 jours avant l'expiration.
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Puis-je me faire rembourser mes crédits ?</p>
            <p className="text-sm text-gray-600 mt-1">
              Oui, vous pouvez demander un remboursement sous 30 jours pour tout crédit non utilisé. Contactez notre support.
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Comment sont facturés les crédits ?</p>
            <p className="text-sm text-gray-600 mt-1">
              Vous recevez une facture par email après chaque achat. Toutes les factures sont disponibles dans votre espace client.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}