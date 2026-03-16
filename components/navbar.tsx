import Link from 'next/link';
import AuthButtons from './auth-buttons';

export default function Navbar() {
  return (
    <>
      {/* Navbar principale */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-navy">Lean Lead Machine</h1>
                  <p className="text-xs text-teal font-medium">Prospection B2B Intelligente</p>
                </div>
              </Link>
            </div>
            
            <nav className="hidden md:flex space-x-6">
              <Link href="/dashboard" className="text-gray-600 hover:text-primary font-medium">Dashboard</Link>
              <Link href="/" className="text-gray-600 hover:text-primary font-medium">Recherche</Link>
              <Link href="/credits" className="text-gray-600 hover:text-primary font-medium">Crédits</Link>
              <Link href="/profile" className="text-gray-600 hover:text-primary font-medium">Profil</Link>
            </nav>
            
            <AuthButtons />
          </div>
        </div>
      </header>

      {/* Barre de statut */}
      <div className="bg-surface border-b sticky top-14 z-30">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                🔓 <span className="font-medium">Accès gratuit</span> - 10 crédits restants
              </span>
              <span className="text-xs text-gray-500">|</span>
              <span className="text-sm text-gray-600">
                🚀 <span className="font-medium">Temps moyen réduit:</span> 18 min → 45 sec
              </span>
            </div>
            <div className="hidden md:block">
              <span className="text-xs bg-teal/10 text-teal px-2 py-1 rounded-full">
                🆕 Nouveau: Export CSV illimité
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}