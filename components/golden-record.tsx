"use client";

import { MapPin, Building, Users, Calendar, Globe, Phone, Mail, Linkedin, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";

interface GoldenRecordProps {
  company: any;
}

export default function GoldenRecord({ company }: GoldenRecordProps) {
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // Simulate map loading
  useState(() => {
    const timer = setTimeout(() => {
      setMapLoaded(true);
    }, 1000);
    return () => clearTimeout(timer);
  });

  const sections = [
    {
      title: "Identité légale",
      icon: Building,
      items: [
        { label: "Dénomination sociale", value: company.name },
        { label: "SIREN", value: company.siren },
        { label: "Forme juridique", value: company.legalForm },
        { label: "Date de création", value: company.creationDate },
        { label: "Statut", value: company.status, status: "success" },
      ],
    },
    {
      title: "Localisation",
      icon: MapPin,
      items: [
        { label: "Adresse complète", value: company.address },
        { label: "Code postal", value: company.postalCode },
        { label: "Ville", value: company.city },
        { label: "Région", value: company.region },
      ],
    },
    {
      title: "Activité",
      icon: Building,
      items: [
        { label: "Code NAF/APE", value: company.nafCode },
        { label: "Libellé NAF", value: company.nafLabel },
        { label: "Tranche d'effectif", value: company.employeeRange },
      ],
    },
  ];

  const contactItems = [
    company.website && { label: "Site web", value: company.website, icon: Globe, type: "link" },
    company.phone && { label: "Téléphone", value: company.phone, icon: Phone, type: "phone" },
    company.email && { label: "Email", value: company.email, icon: Mail, type: "email" },
    company.linkedin && { label: "LinkedIn", value: company.linkedin, icon: Linkedin, type: "link" },
  ].filter(Boolean);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-xl p-8 border border-blue-100">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center mb-2">
            <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
            <h2 className="text-2xl font-bold text-gray-900">Golden Record</h2>
          </div>
          <p className="text-gray-600">
            Fiche unique consolidée - Données officielles MCP data.gouv.fr
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-full">
            <CheckCircle className="w-4 h-4 mr-1" />
            <span className="text-sm font-medium">Données vérifiées</span>
          </div>
          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Mise à jour: Aujourd'hui
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Legal data */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center mb-4">
                  <section.icon className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="font-semibold text-gray-900">{section.title}</h3>
                </div>
                <div className="space-y-3">
                  {section.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-500">{item.label}</p>
                        <p className="font-medium text-gray-900">{item.value}</p>
                      </div>
                      {item.status === "success" && (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Contacts section */}
          {contactItems.length > 0 && (
            <div className="mt-6 bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Linkedin className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="font-semibold text-gray-900">Contacts & Réseaux</h3>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Données enrichies automatiquement
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {contactItems.map((item: any, index) => (
                  <a
                    key={index}
                    href={
                      item.type === "email" ? `mailto:${item.value}` :
                      item.type === "phone" ? `tel:${item.value}` :
                      item.value
                    }
                    target={item.type === "link" ? "_blank" : undefined}
                    rel={item.type === "link" ? "noopener noreferrer" : undefined}
                    className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors group"
                  >
                    <item.icon className="w-6 h-6 text-blue-600 mb-2 group-hover:text-blue-800" />
                    <p className="text-sm text-gray-600 text-center">{item.label}</p>
                    <p className="text-xs text-gray-500 text-center truncate w-full mt-1">
                      {item.type === "link" ? new URL(item.value).hostname : item.value}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Map and quick actions */}
        <div className="space-y-6">
          {/* Map placeholder */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <MapPin className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="font-semibold text-gray-900">Localisation</h3>
              </div>
              {!mapLoaded && (
                <div className="text-xs text-gray-500 animate-pulse">Chargement...</div>
              )}
            </div>
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
              {mapLoaded ? (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                    <p className="font-medium text-gray-900">{company.city}</p>
                    <p className="text-sm text-gray-600">Google Maps intégré</p>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
            <div className="mt-4 text-center">
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Ouvrir dans Google Maps →
              </button>
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Actions rapides</h3>
            <div className="space-y-3">
              <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                Exporter en CSV
              </button>
              <button className="w-full border border-blue-600 text-blue-600 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors">
                Ajouter au CRM
              </button>
              <button className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                Trouver des entreprises similaires
              </button>
              <button className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                Programmer un rappel
              </button>
            </div>
          </div>

          {/* Data quality */}
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
            <h3 className="font-semibold text-gray-900 mb-3">Qualité des données</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Complétude</span>
                  <span className="font-medium">92%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: "92%" }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Fraîcheur</span>
                  <span className="font-medium">24h</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: "100%" }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Confiance</span>
                  <span className="font-medium">95%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500" style={{ width: "95%" }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}