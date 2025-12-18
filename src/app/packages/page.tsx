'use client';

import { Plus, Edit2, Calendar, Check, Users, Euro } from 'lucide-react';

const packagesData = [
  {
    id: '1',
    name: 'Romantik-Wochenende',
    description: '2 Nächte im Doppelzimmer mit Seeblick inkl. Candlelight Dinner',
    nights: 2,
    price: 450,
    pricePerPerson: false,
    includes: ['2 Übernachtungen im DZ Seeblick', 'Frühstücksbuffet', '4-Gang Candlelight Dinner', 'Flasche Prosecco', 'Late Checkout 14 Uhr'],
    validFrom: '2024-01-01',
    validTo: '2024-12-31',
    active: true,
    categories: ['DZ Seeblick', 'Suite'],
  },
  {
    id: '2',
    name: 'Familien-Spaß',
    description: '3 Nächte für Familien mit Kindern unter 12 Jahren',
    nights: 3,
    price: 180,
    pricePerPerson: true,
    includes: ['3 Übernachtungen', 'Halbpension', 'Kinder bis 6 gratis', 'Kindermenü', 'Spielplatz Nutzung'],
    validFrom: '2024-06-01',
    validTo: '2024-08-31',
    active: true,
    categories: ['DZ Balkon', 'DZ Standard'],
  },
  {
    id: '3',
    name: 'Wanderwoche',
    description: '7 Nächte mit geführten Wanderungen',
    nights: 7,
    price: 890,
    pricePerPerson: true,
    includes: ['7 Übernachtungen', 'Halbpension', '3 geführte Wanderungen', 'Lunchpaket', 'Wanderkarte'],
    validFrom: '2024-05-01',
    validTo: '2024-10-31',
    active: true,
    categories: ['DZ Standard', 'DZ Balkon', 'EZ Standard'],
  },
  {
    id: '4',
    name: 'Silvester Gala',
    description: '3 Nächte mit Silvester-Gala-Dinner',
    nights: 3,
    price: 680,
    pricePerPerson: true,
    includes: ['3 Übernachtungen (30.12.-02.01.)', 'Frühstücksbuffet', '5-Gang Silvester-Gala-Menü', 'Mitternachtssekt', 'Live-Musik'],
    validFrom: '2024-12-30',
    validTo: '2025-01-02',
    active: true,
    categories: ['DZ Seeblick', 'Suite', 'DZ Balkon'],
  },
];

export default function PackagesPage() {
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
      year: 'numeric',
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pauschalen</h1>
          <p className="mt-1 text-slate-600">{packagesData.filter(p => p.active).length} aktive Pauschalen</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="h-5 w-5" />
          <span>Neue Pauschale</span>
        </button>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {packagesData.map((pkg) => (
          <div
            key={pkg.id}
            className={`bg-white rounded-xl border ${pkg.active ? 'border-slate-200' : 'border-slate-200 opacity-60'} overflow-hidden`}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{pkg.name}</h3>
                  <p className="text-slate-600 mt-1">{pkg.description}</p>
                </div>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <Edit2 className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              <div className="flex items-center gap-6 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-slate-400" />
                  <span className="text-slate-900 font-medium">{pkg.nights} Nächte</span>
                </div>
                <div className="flex items-center gap-2">
                  <Euro className="h-5 w-5 text-emerald-500" />
                  <span className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(pkg.price)}
                  </span>
                  <span className="text-sm text-slate-500">
                    {pkg.pricePerPerson ? '/ Person' : 'gesamt'}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-slate-700 mb-2">Inkludiert:</p>
                <ul className="space-y-1">
                  {pkg.includes.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {pkg.categories.map((cat) => (
                  <span key={cat} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg">
                    {cat}
                  </span>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="text-sm text-slate-500">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  {formatDate(pkg.validFrom)} - {formatDate(pkg.validTo)}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  pkg.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {pkg.active ? 'Aktiv' : 'Inaktiv'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
