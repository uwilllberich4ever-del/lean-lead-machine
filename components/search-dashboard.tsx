"use client";

import { useState, useEffect } from "react";
import { Search, MapPin, Building, Users, Filter } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const searchSchema = z.object({
  postalCode: z.string().regex(/^\d{5}$/, "Code postal invalide (5 chiffres)"),
  radius: z.number().min(1).max(100),
  nafCode: z.string().optional(),
  employeeRange: z.string().optional(),
});

type SearchFormData = z.infer<typeof searchSchema>;

const employeeRanges = [
  { value: "00", label: "0 salarié" },
  { value: "01", label: "1 à 2 salariés" },
  { value: "02", label: "3 à 5 salariés" },
  { value: "03", label: "6 à 9 salariés" },
  { value: "11", label: "10 à 19 salariés" },
  { value: "12", label: "20 à 49 salariés" },
  { value: "21", label: "50 à 99 salariés" },
  { value: "22", label: "100 à 199 salariés" },
  { value: "31", label: "200 à 249 salariés" },
  { value: "32", label: "250 à 499 salariés" },
  { value: "41", label: "500 à 999 salariés" },
  { value: "42", label: "1000+ salariés" },
];

export default function SearchDashboard() {
  const [isSearching, setIsSearching] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      postalCode: "75001",
      radius: 10,
    },
  });

  const postalCode = watch("postalCode");
  const radius = watch("radius");

  const onSubmit = async (data: SearchFormData) => {
    setIsSearching(true);
    // Simulate API call
    setTimeout(() => {
      setSearchResults([
        {
          id: 1,
          name: "Tech Solutions SAS",
          siren: "123456789",
          address: "12 Rue de la Paix, 75001 Paris",
          nafCode: "62.01Z",
          employeeRange: "10 à 19 salariés",
          status: "Actif",
        },
        {
          id: 2,
          name: "Innovation Digital",
          siren: "987654321",
          address: "25 Avenue des Champs-Élysées, 75008 Paris",
          nafCode: "62.02A",
          employeeRange: "20 à 49 salariés",
          status: "Actif",
        },
        {
          id: 3,
          name: "Data Analytics France",
          siren: "456789123",
          address: "8 Boulevard Haussmann, 75009 Paris",
          nafCode: "63.11Z",
          employeeRange: "50 à 99 salariés",
          status: "Actif",
        },
      ]);
      setIsSearching(false);
    }, 1500);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Recherche avancée</h2>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <Filter className="w-4 h-4 mr-2" />
          {showAdvanced ? "Filtres simples" : "Filtres avancés"}
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                Code postal
              </div>
            </label>
            <input
              type="text"
              {...register("postalCode")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="75001"
            />
            {errors.postalCode && (
              <p className="mt-1 text-sm text-red-600">{errors.postalCode.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rayon de recherche
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="1"
                max="100"
                {...register("radius", { valueAsNumber: true })}
                className="flex-1"
              />
              <span className="text-lg font-semibold text-gray-700">{radius} km</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1 km</span>
              <span>100 km</span>
            </div>
          </div>
        </div>

        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center">
                  <Building className="w-4 h-4 mr-2" />
                  Code NAF
                </div>
              </label>
              <input
                type="text"
                {...register("nafCode")}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="62.01Z (Informatique)"
              />
              <p className="mt-1 text-sm text-gray-500">
                Ex: 62.01Z pour Programmation informatique
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Tranche d'effectif
                </div>
              </label>
              <select
                {...register("employeeRange")}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Toutes les tailles</option>
                {employeeRanges.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-600">
            <p>Recherche en temps réel • Données officielles INSEE • Conforme RGPD</p>
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isSearching ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Recherche en cours...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Lancer la recherche
              </>
            )}
          </button>
        </div>
      </form>

      {searchResults.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {searchResults.length} entreprises trouvées
          </h3>
          <div className="space-y-4">
            {searchResults.map((company) => (
              <div
                key={company.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900">{company.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{company.address}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        SIREN: {company.siren}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                        NAF: {company.nafCode}
                      </span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {company.employeeRange}
                      </span>
                    </div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Voir la fiche →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}