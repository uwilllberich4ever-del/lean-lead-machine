"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  Building, MapPin, Users, Calendar, Globe, Phone, Mail, 
  Linkedin, Download, Share2, Star, ChevronRight, Loader2 
} from "lucide-react";
import GoldenRecord from "@/components/golden-record";

export default function CompanyPage() {
  const params = useParams();
  const siren = params.siren as string;
  
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [enrichmentStage, setEnrichmentStage] = useState(1); // 1: Legal, 2: Map, 3: Contacts

  useEffect(() => {
    // Simulate API call with progressive loading
    const loadData = async () => {
      setLoading(true);
      
      // Stage 1: Legal data (immediate)
      setTimeout(() => {
        setCompany({
          id: 1,
          siren: siren,
          name: "Tech Solutions SAS",
          legalForm: "Société par Actions Simplifiée",
          address: "12 Rue de la Paix, 75001 Paris",
          postalCode: "75001",
          city: "Paris",
          region: "Île-de-France",
          nafCode: "62.01Z",
          nafLabel: "Programmation informatique",
          creationDate: "2018-03-15",
          employeeRange: "10 à 19 salariés",
          status: "Actif",
          capital: "150000 €",
          turnover: "2.5M €",
        });
        setEnrichmentStage(2);
      }, 500);

      // Stage 2: Map data (parallel)
      setTimeout(() => {
        setEnrichmentStage(3);
      }, 1500);

      // Stage 3: Contacts data (lazy)
      setTimeout(() => {
        setCompany(prev => ({
          ...prev,
          website: "https://techsolutions.fr",
          phone: "+33 1 23 45 67 89",
          email: "contact@techsolutions.fr",
          linkedin: "https://linkedin.com/company/tech-solutions",
          googlePlaceId: "ChIJ1234567890",
          coordinates: { lat: 48.8566, lng: 2.3522 },
          executives: [
            { name: "Jean Dupont", role: "Président", linkedin: "https://linkedin.com/in/jeandupont" },
            { name: "Marie Martin", role: "Directrice Technique", linkedin: "https://linkedin.com/in/mariemartin" },
          ],
        }));
        setEnrichmentStage(4); // Complete
        setLoading(false);
      }, 3000);
    };

    loadData();
  }, [siren]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Chargement de la fiche entreprise</h2>
          <div className="mt-6 space-y-4 max-w-md mx-auto">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${enrichmentStage >= 1 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                {enrichmentStage > 1 ? '✓' : '1'}
              </div>
              <div className="flex-1">
                <p className="font-medium">Données légales</p>
                <p className="text-sm text-gray-500">SIRENE/RNE - Données officielles</p>
              </div>
              {enrichmentStage === 1 && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
            </div>
            
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${enrichmentStage >= 2 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                {enrichmentStage > 2 ? '✓' : '2'}
              </div>
              <div className="flex-1">
                <p className="font-medium">Carte et localisation</p>
                <p className="text-sm text-gray-500">Google Maps - PlaceID</p>
              </div>
              {enrichmentStage === 2 && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
            </div>
            
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${enrichmentStage >= 3 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                {enrichmentStage > 3 ? '✓' : '3'}
              </div>
              <div className="flex-1">
                <p className="font-medium">Contacts et réseaux</p>
                <p className="text-sm text-gray-500">Recherche du dirigeant en cours...</p>
              </div>
              {enrichmentStage === 3 && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">SIREN: {company.siren}</span>
            <ChevronRight className="w-4 h-4 mx-2" />
            <span>Fiche Golden Record</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
          <p className="text-gray-600 mt-2">{company.address}</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </button>
          <button className="flex items-center border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">
            <Share2 className="w-4 h-4 mr-2" />
            Partager
          </button>
          <button className="flex items-center border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">
            <Star className="w-4 h-4 mr-2" />
            Favoris
          </button>
        </div>
      </div>

      <GoldenRecord company={company} />

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {["overview", "contacts", "similar", "history"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab === "overview" && "Aperçu"}
                {tab === "contacts" && "Contacts"}
                {tab === "similar" && "Entreprises similaires"}
                {tab === "history" && "Historique"}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations clés</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Building className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Forme juridique</p>
                      <p className="font-medium">{company.legalForm}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Date de création</p>
                      <p className="font-medium">{company.creationDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Users className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Effectif</p>
                      <p className="font-medium">{company.employeeRange}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Activité</h3>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Code NAF/APE</p>
                  <p className="font-bold text-blue-800 text-lg">{company.nafCode}</p>
                  <p className="text-gray-700">{company.nafLabel}</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Capital social</p>
                    <p className="font-bold text-gray-900">{company.capital}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">CA estimé</p>
                    <p className="font-bold text-gray-900">{company.turnover}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "contacts" && company.executives && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {company.executives.map((exec: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">{exec.name}</h4>
                        <p className="text-sm text-gray-600">{exec.role}</p>
                      </div>
                      <a
                        href={exec.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Linkedin className="w-5 h-5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-6">
                <h4 className="font-semibold text-gray-900 mb-4">Coordonnées de l'entreprise</h4>
                <div className="flex flex-wrap gap-4">
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-800"
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      Site web
                    </a>
                  )}
                  {company.phone && (
                    <div className="flex items-center text-gray-700">
                      <Phone className="w-4 h-4 mr-2" />
                      {company.phone}
                    </div>
                  )}
                  {company.email && (
                    <a
                      href={`mailto:${company.email}`}
                      className="flex items-center text-blue-600 hover:text-blue-800"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </a>
                  )}
                  {company.linkedin && (
                    <a
                      href={company.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-800"
                    >
                      <Linkedin className="w-4 h-4 mr-2" />
                      LinkedIn
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}