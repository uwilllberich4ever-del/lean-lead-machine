"use client";

import { History, MapPin, Building, Users } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const recentSearches = [
  {
    id: 1,
    query: "75001 - 10km - Informatique",
    results: 42,
    date: new Date(2026, 2, 10, 14, 30),
    filters: {
      postalCode: "75001",
      radius: 10,
      nafCode: "62.01Z",
    },
  },
  {
    id: 2,
    query: "69001 - 5km - 20-49 salariés",
    results: 18,
    date: new Date(2026, 2, 9, 11, 15),
    filters: {
      postalCode: "69001",
      radius: 5,
      employeeRange: "12",
    },
  },
  {
    id: 3,
    query: "13001 - 20km - Tous secteurs",
    results: 156,
    date: new Date(2026, 2, 8, 16, 45),
    filters: {
      postalCode: "13001",
      radius: 20,
    },
  },
  {
    id: 4,
    query: "31000 - 15km - Commerce",
    results: 23,
    date: new Date(2026, 2, 7, 9, 20),
    filters: {
      postalCode: "31000",
      radius: 15,
      nafCode: "47.11Z",
    },
  },
];

export default function RecentSearches() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Recherches récentes</h2>
        <History className="w-5 h-5 text-gray-400" />
      </div>
      
      <div className="space-y-4">
        {recentSearches.map((search) => (
          <div
            key={search.id}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-gray-900">{search.query}</h3>
              <span className="text-sm text-gray-500">
                {format(search.date, "dd MMM HH:mm", { locale: fr })}
              </span>
            </div>
            
            <div className="flex items-center text-sm text-gray-600 mb-3">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                {search.results} résultats
              </span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                <MapPin className="w-3 h-3 mr-1" />
                {search.filters.postalCode} ({search.filters.radius}km)
              </div>
              
              {search.filters.nafCode && (
                <div className="flex items-center text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  <Building className="w-3 h-3 mr-1" />
                  NAF: {search.filters.nafCode}
                </div>
              )}
              
              {search.filters.employeeRange && (
                <div className="flex items-center text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  <Users className="w-3 h-3 mr-1" />
                  {search.filters.employeeRange === "12" ? "20-49 salariés" : "Toutes tailles"}
                </div>
              )}
            </div>
            
            <button className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">
              Relancer cette recherche →
            </button>
          </div>
        ))}
      </div>
      
      <button className="w-full mt-6 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
        Voir tout l'historique
      </button>
    </div>
  );
}