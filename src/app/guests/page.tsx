'use client';

import { useState } from 'react';
import { Search, Plus, Mail, Phone, MapPin, Calendar, Euro, Star, Filter, ChevronDown, User } from 'lucide-react';

// Dummy-Daten für Gäste
const guestsData = [
  {
    id: '1',
    salutation: 'Herr',
    firstName: 'Thomas',
    lastName: 'Müller',
    email: 'thomas.mueller@email.de',
    phone: '+49 171 1234567',
    city: 'München',
    country: 'Deutschland',
    totalStays: 5,
    totalRevenue: 2450,
    lastStay: '2024-08-15',
    loyaltyTier: 'gold',
    tags: ['Stammgast', 'VIP'],
  },
  {
    id: '2',
    salutation: 'Frau',
    firstName: 'Anna',
    lastName: 'Schmidt',
    email: 'anna.schmidt@email.at',
    phone: '+43 660 9876543',
    city: 'Wien',
    country: 'Österreich',
    totalStays: 12,
    totalRevenue: 5890,
    lastStay: '2024-11-20',
    loyaltyTier: 'platinum',
    tags: ['Stammgast', 'Firmenkunde'],
  },
  {
    id: '3',
    salutation: 'Herr',
    firstName: 'Peter',
    lastName: 'Weber',
    email: 'p.weber@company.ch',
    phone: '+41 79 5551234',
    city: 'Zürich',
    country: 'Schweiz',
    totalStays: 2,
    totalRevenue: 890,
    lastStay: '2024-06-10',
    loyaltyTier: 'silver',
    tags: ['Firmenkunde'],
  },
  {
    id: '4',
    salutation: 'Frau',
    firstName: 'Maria',
    lastName: 'Fischer',
    email: 'maria.fischer@gmail.com',
    phone: '+49 152 8765432',
    city: 'Hamburg',
    country: 'Deutschland',
    totalStays: 1,
    totalRevenue: 320,
    lastStay: '2024-12-01',
    loyaltyTier: 'bronze',
    tags: [],
  },
  {
    id: '5',
    salutation: 'Herr',
    firstName: 'Klaus',
    lastName: 'Wagner',
    email: 'kwagner@web.de',
    phone: '+49 163 1112233',
    city: 'Berlin',
    country: 'Deutschland',
    totalStays: 8,
    totalRevenue: 3200,
    lastStay: '2024-10-05',
    loyaltyTier: 'gold',
    tags: ['VIP', 'Hochzeit'],
  },
];

const loyaltyColors: Record<string, string> = {
  bronze: 'bg-amber-600',
  silver: 'bg-slate-400',
  gold: 'bg-yellow-500',
  platinum: 'bg-slate-700',
};

const loyaltyLabels: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silber',
  gold: 'Gold',
  platinum: 'Platin',
};

export default function GuestsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);

  const filteredGuests = guestsData.filter(guest => {
    const searchLower = searchQuery.toLowerCase();
    return (
      guest.firstName.toLowerCase().includes(searchLower) ||
      guest.lastName.toLowerCase().includes(searchLower) ||
      guest.email?.toLowerCase().includes(searchLower) ||
      guest.city?.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gäste</h1>
          <p className="mt-1 text-slate-600">
            {filteredGuests.length} Gäste gefunden
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="h-5 w-5" />
          <span>Neuer Gast</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Suche nach Name, Email, Ort..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          <Filter className="h-5 w-5 text-slate-600" />
          <span className="text-slate-700">Filter</span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
      </div>

      {/* Loyalty Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {['platinum', 'gold', 'silver', 'bronze'].map((tier) => {
          const count = guestsData.filter(g => g.loyaltyTier === tier).length;
          return (
            <div key={tier} className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className={`${loyaltyColors[tier]} w-10 h-10 rounded-full flex items-center justify-center`}>
                  <Star className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{count}</p>
                  <p className="text-sm text-slate-500">{loyaltyLabels[tier]}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Guest List */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Gast</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Kontakt</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Ort</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-700">Aufenthalte</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">Umsatz</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Letzter Besuch</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((guest) => (
                <tr
                  key={guest.id}
                  onClick={() => setSelectedGuest(guest.id)}
                  className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${
                    selectedGuest === guest.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {guest.salutation} {guest.firstName} {guest.lastName}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          {guest.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="h-4 w-4" />
                        <span>{guest.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="h-4 w-4" />
                        <span>{guest.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="h-4 w-4" />
                      <span>{guest.city}, {guest.country}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-lg font-semibold text-slate-900">{guest.totalStays}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(guest.totalRevenue)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(guest.lastStay)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white ${loyaltyColors[guest.loyaltyTier]}`}>
                      <Star className="h-3 w-3" />
                      {loyaltyLabels[guest.loyaltyTier]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
