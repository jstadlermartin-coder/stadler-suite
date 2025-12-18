'use client';

import { useState } from 'react';
import { Plus, Edit2, Calendar, Euro } from 'lucide-react';

const categories = [
  { id: '1', name: 'DZ Seeblick', basePrice: 170 },
  { id: '2', name: 'DZ Balkon', basePrice: 150 },
  { id: '3', name: 'DZ Standard', basePrice: 120 },
  { id: '4', name: 'EZ Standard', basePrice: 90 },
  { id: '5', name: 'Suite', basePrice: 280 },
];

const seasons = [
  { id: '1', name: 'Nebensaison', startDate: '2024-01-01', endDate: '2024-05-31', multiplier: 0.85, color: 'bg-blue-100' },
  { id: '2', name: 'Hauptsaison Sommer', startDate: '2024-06-01', endDate: '2024-08-31', multiplier: 1.3, color: 'bg-red-100' },
  { id: '3', name: 'Zwischensaison', startDate: '2024-09-01', endDate: '2024-10-31', multiplier: 1.0, color: 'bg-amber-100' },
  { id: '4', name: 'Weihnachten/Silvester', startDate: '2024-12-20', endDate: '2025-01-06', multiplier: 1.4, color: 'bg-red-100' },
];

export default function PricingPage() {
  const [activeTab, setActiveTab] = useState<'prices' | 'seasons'>('prices');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Preise</h1>
          <p className="mt-1 text-slate-600">Zimmerpreise und Saisonen verwalten</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="h-5 w-5" />
          <span>Neue Saison</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('prices')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'prices' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Preisübersicht
        </button>
        <button
          onClick={() => setActiveTab('seasons')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'seasons' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Saisonen
        </button>
      </div>

      {activeTab === 'prices' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Kategorie</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">Grundpreis</th>
                {seasons.map(season => (
                  <th key={season.id} className="text-right px-6 py-4 text-sm font-semibold text-slate-700">
                    {season.name}
                    <span className="block text-xs font-normal text-slate-500">
                      x{season.multiplier}
                    </span>
                  </th>
                ))}
                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-700"></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{category.name}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(category.basePrice)}
                    </span>
                  </td>
                  {seasons.map(season => (
                    <td key={season.id} className="px-6 py-4 text-right">
                      <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                        season.multiplier > 1 ? 'text-red-700 bg-red-50' :
                        season.multiplier < 1 ? 'text-green-700 bg-green-50' :
                        'text-slate-700 bg-slate-50'
                      }`}>
                        {formatCurrency(Math.round(category.basePrice * season.multiplier))}
                      </span>
                    </td>
                  ))}
                  <td className="px-6 py-4 text-center">
                    <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                      <Edit2 className="h-4 w-4 text-slate-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'seasons' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {seasons.map((season) => (
            <div
              key={season.id}
              className={`${season.color} rounded-xl border border-slate-200 p-5`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900">{season.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                    <Calendar className="h-4 w-4" />
                    {formatDate(season.startDate)} - {formatDate(season.endDate)}
                  </div>
                </div>
                <button className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                  <Edit2 className="h-4 w-4 text-slate-600" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Euro className="h-5 w-5 text-slate-600" />
                <span className="text-2xl font-bold text-slate-900">
                  {season.multiplier > 1 ? '+' : ''}{Math.round((season.multiplier - 1) * 100)}%
                </span>
                <span className="text-sm text-slate-600">
                  {season.multiplier > 1 ? 'Aufschlag' : season.multiplier < 1 ? 'Rabatt' : 'Standardpreis'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
