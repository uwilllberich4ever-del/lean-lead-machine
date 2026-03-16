"use client";

import { TrendingUp, Clock, Users, Download } from "lucide-react";

export default function StatsOverview() {
  const stats = [
    {
      title: "Temps économisé",
      value: "17h 15min",
      description: "Ce mois-ci",
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Entreprises consultées",
      value: "142",
      description: "+12% vs mois dernier",
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Exports CSV",
      value: "8",
      description: "500 lignes max par export",
      icon: Download,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Efficacité",
      value: "94%",
      description: "Taux de matching",
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-5">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Votre activité</h2>
      <div className="space-y-3">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`${stat.bgColor} p-2 rounded-lg mr-3`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{stat.title}</p>
                <p className="text-xs text-gray-500">{stat.description}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-base font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Crédits restants</p>
            <p className="text-xs text-gray-500">Renouvellement le 25/03</p>
          </div>
          <div className="text-right">
            <p className="text-base font-bold text-gray-900">247</p>
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-green-500" style={{ width: "82%" }}></div>
            </div>
          </div>
        </div>
        <button className="w-full mt-3 bg-blue-50 text-blue-600 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
          Acheter des crédits
        </button>
      </div>
    </div>
  );
}