'use client';

import { useState } from 'react';
import { Plus, Hotel, Users, Check, X, Wrench, Edit2 } from 'lucide-react';

const roomsData = [
  { id: '1', name: 'Zimmer 1', category: 'DZ Seeblick', floor: 1, beds: 2, maxPersons: 3, status: 'active', amenities: ['Balkon', 'Seeblick', 'TV', 'WLAN'] },
  { id: '2', name: 'Zimmer 2', category: 'DZ Seeblick', floor: 1, beds: 2, maxPersons: 3, status: 'active', amenities: ['Balkon', 'Seeblick', 'TV', 'WLAN'] },
  { id: '3', name: 'Zimmer 3', category: 'DZ Balkon', floor: 2, beds: 2, maxPersons: 2, status: 'active', amenities: ['Balkon', 'TV', 'WLAN'] },
  { id: '4', name: 'Zimmer 4', category: 'DZ Balkon', floor: 2, beds: 2, maxPersons: 2, status: 'maintenance', amenities: ['Balkon', 'TV', 'WLAN'] },
  { id: '5', name: 'Zimmer 5', category: 'EZ Standard', floor: 2, beds: 1, maxPersons: 1, status: 'active', amenities: ['TV', 'WLAN'] },
  { id: '6', name: 'Zimmer 6', category: 'Suite', floor: 3, beds: 2, maxPersons: 4, status: 'active', amenities: ['Balkon', 'Seeblick', 'TV', 'WLAN', 'Minibar', 'Badewanne'] },
  { id: '7', name: 'Zimmer 7', category: 'DZ Standard', floor: 1, beds: 2, maxPersons: 2, status: 'active', amenities: ['TV', 'WLAN'] },
  { id: '8', name: 'Zimmer 8', category: 'DZ Standard', floor: 1, beds: 2, maxPersons: 2, status: 'inactive', amenities: ['TV', 'WLAN'] },
];

const statusConfig: Record<string, { label: string; color: string; icon: typeof Check }> = {
  active: { label: 'Aktiv', color: 'text-green-600 bg-green-100', icon: Check },
  inactive: { label: 'Inaktiv', color: 'text-slate-600 bg-slate-100', icon: X },
  maintenance: { label: 'Wartung', color: 'text-amber-600 bg-amber-100', icon: Wrench },
};

export default function RoomsPage() {
  const [filter, setFilter] = useState<string>('all');

  const filteredRooms = roomsData.filter(room =>
    filter === 'all' || room.status === filter
  );

  // Group by category
  const categories = [...new Set(roomsData.map(r => r.category))];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Zimmer</h1>
          <p className="mt-1 text-slate-600">
            {roomsData.filter(r => r.status === 'active').length} von {roomsData.length} Zimmern aktiv
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="h-5 w-5" />
          <span>Neues Zimmer</span>
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Alle
        </button>
        {Object.entries(statusConfig).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === key ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {config.label}
          </button>
        ))}
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredRooms.map((room) => {
          const StatusIcon = statusConfig[room.status].icon;
          return (
            <div
              key={room.id}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Hotel className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{room.name}</h3>
                    <p className="text-sm text-slate-500">{room.category}</p>
                  </div>
                </div>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <Edit2 className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Stockwerk</span>
                  <span className="font-medium text-slate-900">{room.floor}. OG</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Betten</span>
                  <span className="font-medium text-slate-900">{room.beds}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Max. Personen</span>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span className="font-medium text-slate-900">{room.maxPersons}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex flex-wrap gap-1 mb-3">
                  {room.amenities.slice(0, 4).map((amenity) => (
                    <span
                      key={amenity}
                      className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded"
                    >
                      {amenity}
                    </span>
                  ))}
                  {room.amenities.length > 4 && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                      +{room.amenities.length - 4}
                    </span>
                  )}
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[room.status].color}`}>
                  <StatusIcon className="h-3 w-3" />
                  {statusConfig[room.status].label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
