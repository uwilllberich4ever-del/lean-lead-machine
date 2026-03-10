import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lean Lead Machine - Prospection B2B Intelligente",
  description: "Plateforme SaaS de prospection commerciale B2B basée sur les données officielles françaises",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50`}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <header className="bg-white shadow-sm border-b">
              <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg"></div>
                    <h1 className="text-xl font-bold text-gray-900">Lean Lead Machine</h1>
                  </div>
                  <nav className="hidden md:flex space-x-6">
                    <a href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</a>
                    <a href="/search" className="text-gray-600 hover:text-gray-900">Recherche</a>
                    <a href="/credits" className="text-gray-600 hover:text-gray-900">Crédits</a>
                    <a href="/profile" className="text-gray-600 hover:text-gray-900">Profil</a>
                  </nav>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    Se connecter
                  </button>
                </div>
              </div>
            </header>
            <main className="flex-1 container mx-auto px-4 py-8">
              {children}
            </main>
            <footer className="bg-white border-t py-6">
              <div className="container mx-auto px-4 text-center text-gray-600">
                <p>© 2026 Lean Lead Machine. Conforme RGPD. Données officielles via MCP data.gouv.fr</p>
                <p className="text-sm mt-2">Temps moyen de recherche réduit de 18 min à 45 sec</p>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}