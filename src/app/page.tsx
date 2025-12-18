'use client';

import { Calendar, Users, Hotel, Euro, TrendingUp, Clock } from 'lucide-react';

const stats = [
  { name: 'Buchungen heute', value: '-', icon: Calendar, color: 'bg-blue-500' },
  { name: 'Ankuenfte heute', value: '-', icon: Users, color: 'bg-green-500' },
  { name: 'Belegte Zimmer', value: '-', icon: Hotel, color: 'bg-purple-500' },
  { name: 'Offene Anfragen', value: '-', icon: Clock, color: 'bg-orange-500' },
  { name: 'Umsatz Monat', value: '-', icon: Euro, color: 'bg-emerald-500' },
  { name: 'Auslastung', value: '-', icon: TrendingUp, color: 'bg-pink-500' },
];

export default function Dashboard() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-slate-600">
          Willkommen bei Stadler Suite - Hotel Stadler am Attersee
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
          >
            <div className="flex items-center">
              <div className={`${stat.color} rounded-lg p-3`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">{stat.name}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Schnellaktionen</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
            <Calendar className="h-8 w-8 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-blue-900">Neue Buchung</span>
          </button>
          <button className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
            <Users className="h-8 w-8 text-green-600 mb-2" />
            <span className="text-sm font-medium text-green-900">Neuer Gast</span>
          </button>
          <button className="flex flex-col items-center justify-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
            <Hotel className="h-8 w-8 text-purple-600 mb-2" />
            <span className="text-sm font-medium text-purple-900">Angebot erstellen</span>
          </button>
          <button className="flex flex-col items-center justify-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
            <Clock className="h-8 w-8 text-orange-600 mb-2" />
            <span className="text-sm font-medium text-orange-900">Anfragen</span>
          </button>
        </div>
      </div>

      {/* Setup Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-amber-900 mb-2">Setup erforderlich</h2>
        <p className="text-amber-800 mb-4">
          Um Stadler Suite zu nutzen, sind folgende Schritte noetig:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-amber-800">
          <li>Firebase Projekt erstellen und Konfiguration eintragen</li>
          <li>CapCorn Bridge auf dem Hotel-PC starten</li>
          <li>Daten aus CapCorn importieren (Zimmer, Gaeste, Buchungen)</li>
          <li>Preise und Pauschalen konfigurieren</li>
        </ol>
      </div>
    </div>
  );
}
