import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AuthProvider } from "@/components/auth-context";
import Navbar from "@/components/navbar";
import Link from "next/link";

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
      <body className={`${inter.className} h-full bg-surface`}>
        <Providers>
          <AuthProvider>
            <div className="min-h-screen flex flex-col">
              <Navbar />
              
              <main className="flex-1 container mx-auto px-4 py-6">
                {children}
              </main>
              
              <footer className="bg-white border-t py-6">
                <div className="container mx-auto px-4 text-center text-gray-600">
                  <p>© 2026 Lean Lead Machine. Conforme RGPD. Données officielles via MCP data.gouv.fr</p>
                  <p className="text-sm mt-2">Temps moyen de recherche réduit de 18 min à 45 sec</p>
                  <div className="mt-4 flex justify-center space-x-6 text-sm">
                    <Link href="/terms" className="text-gray-500 hover:text-gray-700">Conditions d'utilisation</Link>
                    <Link href="/privacy" className="text-gray-500 hover:text-gray-700">Politique de confidentialité</Link>
                    <Link href="/contact" className="text-gray-500 hover:text-gray-700">Contact</Link>
                  </div>
                </div>
              </footer>

              {/* Bouton IA flottant */}
              <div className="fixed bottom-6 right-6 z-50">
                <button className="bg-teal text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-shadow">
                  🤖 IA
                </button>
              </div>
            </div>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}