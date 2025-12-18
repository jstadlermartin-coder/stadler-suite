'use client';

import { Mail, Eye, Check, X, Clock, Plus, Send } from 'lucide-react';

const offersData = [
  {
    id: 'A-2024-001',
    guestName: 'Georg Steiner',
    guestEmail: 'g.steiner@web.de',
    checkIn: '2025-01-10',
    checkOut: '2025-01-14',
    nights: 4,
    category: 'Suite',
    totalPrice: 1280,
    status: 'sent',
    sentAt: '2024-12-15T14:30:00',
    expiresAt: '2024-12-22',
  },
  {
    id: 'A-2024-002',
    guestName: 'Familie Hofer',
    guestEmail: 'hofer@email.at',
    checkIn: '2024-12-23',
    checkOut: '2024-12-28',
    nights: 5,
    category: 'DZ Balkon',
    totalPrice: 950,
    status: 'viewed',
    sentAt: '2024-12-17T10:00:00',
    viewedAt: '2024-12-17T16:45:00',
    expiresAt: '2024-12-20',
  },
  {
    id: 'A-2024-003',
    guestName: 'Markus Bauer',
    guestEmail: 'mbauer@company.de',
    checkIn: '2025-01-15',
    checkOut: '2025-01-17',
    nights: 2,
    category: 'DZ Seeblick',
    totalPrice: 380,
    status: 'accepted',
    sentAt: '2024-12-10T09:00:00',
    viewedAt: '2024-12-10T12:30:00',
    respondedAt: '2024-12-11T08:15:00',
    expiresAt: '2024-12-17',
  },
  {
    id: 'A-2024-004',
    guestName: 'Eva Klein',
    guestEmail: 'eva.klein@gmail.com',
    checkIn: '2025-02-14',
    checkOut: '2025-02-16',
    nights: 2,
    category: 'Suite',
    totalPrice: 590,
    status: 'expired',
    sentAt: '2024-12-01T11:00:00',
    expiresAt: '2024-12-08',
  },
];

const statusConfig: Record<string, { label: string; color: string; icon: typeof Mail }> = {
  draft: { label: 'Entwurf', color: 'bg-slate-100 text-slate-700', icon: Mail },
  sent: { label: 'Gesendet', color: 'bg-blue-100 text-blue-700', icon: Send },
  viewed: { label: 'Angesehen', color: 'bg-amber-100 text-amber-700', icon: Eye },
  accepted: { label: 'Angenommen', color: 'bg-green-100 text-green-700', icon: Check },
  declined: { label: 'Abgelehnt', color: 'bg-red-100 text-red-700', icon: X },
  expired: { label: 'Abgelaufen', color: 'bg-slate-100 text-slate-600', icon: Clock },
};

export default function OffersPage() {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Stats
  const stats = {
    total: offersData.length,
    pending: offersData.filter(o => ['sent', 'viewed'].includes(o.status)).length,
    accepted: offersData.filter(o => o.status === 'accepted').length,
    conversionRate: Math.round((offersData.filter(o => o.status === 'accepted').length / offersData.length) * 100),
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Angebote</h1>
          <p className="mt-1 text-slate-600">
            {stats.pending} offene Angebote
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="h-5 w-5" />
          <span>Neues Angebot</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Gesamt</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Offen</p>
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Angenommen</p>
          <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Konversionsrate</p>
          <p className="text-2xl font-bold text-blue-600">{stats.conversionRate}%</p>
        </div>
      </div>

      {/* Offers Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Angebot</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Gast</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Zeitraum</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Kategorie</th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">Preis</th>
              <th className="text-center px-6 py-4 text-sm font-semibold text-slate-700">Status</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Gültig bis</th>
            </tr>
          </thead>
          <tbody>
            {offersData.map((offer) => {
              const StatusIcon = statusConfig[offer.status].icon;
              return (
                <tr key={offer.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer">
                  <td className="px-6 py-4">
                    <p className="font-mono text-sm font-medium text-slate-900">{offer.id}</p>
                    <p className="text-xs text-slate-500">Gesendet: {formatDateTime(offer.sentAt)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{offer.guestName}</p>
                    <p className="text-sm text-slate-500">{offer.guestEmail}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-900">
                      {formatDate(offer.checkIn)} - {formatDate(offer.checkOut)}
                    </p>
                    <p className="text-xs text-slate-500">{offer.nights} Nächte</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-900">{offer.category}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(offer.totalPrice)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[offer.status].color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig[offer.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">{formatDate(offer.expiresAt)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
