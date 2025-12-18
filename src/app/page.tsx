'use client';

import { Calendar, Users, Hotel, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function Dashboard() {
  // Demo-Daten
  const todayStats = {
    arrivals: 3,
    departures: 2,
    inHouse: 12,
    available: 4
  };

  const upcomingArrivals = [
    { id: '1', name: 'Max Mustermann', room: '101', checkIn: 'Heute, 14:00', guests: 2 },
    { id: '2', name: 'Maria Musterfrau', room: '203', checkIn: 'Heute, 15:00', guests: 1 },
    { id: '3', name: 'Hans Huber', room: '102', checkIn: 'Heute, 16:30', guests: 2 },
  ];

  const upcomingDepartures = [
    { id: '1', name: 'Anna Schmidt', room: '301', checkOut: 'Heute, 10:00' },
    { id: '2', name: 'Peter Weber', room: '201', checkOut: 'Heute, 11:00' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Dashboard</h1>
        <p className="text-slate-500">Hotel Stadler am Attersee</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
              <ArrowDownRight className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
              Heute
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-1">{todayStats.arrivals}</p>
          <p className="text-sm text-slate-500">Ankünfte</p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5 text-orange-600" />
            </div>
            <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
              Heute
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-1">{todayStats.departures}</p>
          <p className="text-sm text-slate-500">Abreisen</p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-1">{todayStats.inHouse}</p>
          <p className="text-sm text-slate-500">Im Haus</p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-xl bg-slate-200 flex items-center justify-center">
              <Hotel className="h-5 w-5 text-slate-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-1">{todayStats.available}</p>
          <p className="text-sm text-slate-500">Zimmer frei</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ankünfte */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Ankünfte heute</h2>
            <span className="text-sm text-slate-500">{upcomingArrivals.length} Gäste</span>
          </div>
          <div className="space-y-2">
            {upcomingArrivals.map((arrival) => (
              <div
                key={arrival.id}
                className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <ArrowDownRight className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">{arrival.name}</p>
                  <p className="text-sm text-slate-500">
                    Zimmer {arrival.room} • {arrival.guests} {arrival.guests === 1 ? 'Gast' : 'Gäste'}
                  </p>
                </div>
                <div className="text-sm text-slate-400">
                  {arrival.checkIn}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Abreisen */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Abreisen heute</h2>
            <span className="text-sm text-slate-500">{upcomingDepartures.length} Gäste</span>
          </div>
          <div className="space-y-2">
            {upcomingDepartures.map((departure) => (
              <div
                key={departure.id}
                className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <ArrowUpRight className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">{departure.name}</p>
                  <p className="text-sm text-slate-500">
                    Zimmer {departure.room}
                  </p>
                </div>
                <div className="text-sm text-slate-400">
                  {departure.checkOut}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mt-8 bg-slate-900 text-white rounded-2xl p-6">
        <h3 className="font-semibold mb-2">CapCorn Bridge verbinden</h3>
        <p className="text-slate-400 text-sm mb-4">
          Um echte Daten aus deinem Hotelsystem zu laden, starte die CapCorn Bridge auf deinem Hotel-PC.
        </p>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white text-slate-900 rounded-xl text-sm font-medium hover:bg-slate-100 transition-colors">
            Sync-Seite öffnen
          </button>
          <button className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors">
            Anleitung
          </button>
        </div>
      </div>
    </div>
  );
}
