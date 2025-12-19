'use client';

import { useState } from 'react';
import { Search, Plus, Filter, ChevronDown, Calendar, User, Hotel, Euro, MoreHorizontal } from 'lucide-react';

// Dummy-Daten für Buchungen
const bookingsData = [
  {
    id: 'B-2024-001',
    guestName: 'Thomas Müller',
    email: 'thomas.mueller@email.de',
    roomName: 'Zimmer 1',
    category: 'DZ Seeblick',
    checkIn: '2024-12-20',
    checkOut: '2024-12-24',
    nights: 4,
    adults: 2,
    children: 0,
    totalPrice: 680,
    status: 'confirmed',
    channel: 'direct',
    mealPlan: 'breakfast',
    createdAt: '2024-12-10',
  },
  {
    id: 'B-2024-002',
    guestName: 'Anna Schmidt',
    email: 'anna.schmidt@email.at',
    roomName: 'Zimmer 2',
    category: 'DZ Seeblick',
    checkIn: '2024-12-18',
    checkOut: '2024-12-22',
    nights: 4,
    adults: 2,
    children: 1,
    totalPrice: 720,
    status: 'checked_in',
    channel: 'booking_com',
    mealPlan: 'half_board',
    createdAt: '2024-11-28',
  },
  {
    id: 'B-2024-003',
    guestName: 'Peter Weber',
    email: 'p.weber@company.ch',
    roomName: 'Zimmer 3',
    category: 'DZ Balkon',
    checkIn: '2024-12-22',
    checkOut: '2024-12-28',
    nights: 6,
    adults: 2,
    children: 2,
    totalPrice: 1080,
    status: 'confirmed',
    channel: 'website',
    mealPlan: 'half_board',
    createdAt: '2024-12-05',
  },
  {
    id: 'B-2024-004',
    guestName: 'Maria Fischer',
    email: 'maria.fischer@gmail.com',
    roomName: 'Zimmer 5',
    category: 'EZ Standard',
    checkIn: '2024-12-19',
    checkOut: '2024-12-21',
    nights: 2,
    adults: 1,
    children: 0,
    totalPrice: 180,
    status: 'option',
    channel: 'direct',
    mealPlan: 'breakfast',
    createdAt: '2024-12-15',
  },
  {
    id: 'B-2024-005',
    guestName: 'Klaus Wagner',
    email: 'kwagner@web.de',
    roomName: 'Zimmer 6',
    category: 'Suite',
    checkIn: '2024-12-25',
    checkOut: '2024-12-31',
    nights: 6,
    adults: 2,
    children: 0,
    totalPrice: 1890,
    status: 'confirmed',
    channel: 'direct',
    mealPlan: 'half_board',
    createdAt: '2024-11-15',
  },
  {
    id: 'B-2024-006',
    guestName: 'Hans Gruber',
    email: 'hans.gruber@mail.de',
    roomName: 'Zimmer 4',
    category: 'DZ Balkon',
    checkIn: '2024-12-10',
    checkOut: '2024-12-15',
    nights: 5,
    adults: 2,
    children: 0,
    totalPrice: 850,
    status: 'checked_out',
    channel: 'expedia',
    mealPlan: 'breakfast',
    createdAt: '2024-11-20',
  },
];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  inquiry: { label: 'Anfrage', color: 'text-purple-700', bg: 'bg-purple-100' },
  option: { label: 'Option', color: 'text-amber-700', bg: 'bg-amber-100' },
  confirmed: { label: 'Bestätigt', color: 'text-blue-700', bg: 'bg-blue-100' },
  checked_in: { label: 'Eingecheckt', color: 'text-green-700', bg: 'bg-green-100' },
  checked_out: { label: 'Ausgecheckt', color: 'text-slate-700', bg: 'bg-slate-100' },
  cancelled: { label: 'Storniert', color: 'text-red-700', bg: 'bg-red-100' },
  no_show: { label: 'No-Show', color: 'text-red-700', bg: 'bg-red-100' },
};

const channelLabels: Record<string, string> = {
  direct: 'Direkt',
  website: 'Website',
  booking_com: 'Booking.com',
  expedia: 'Expedia',
  hrs: 'HRS',
  other: 'Sonstige',
};

const mealPlanLabels: Record<string, string> = {
  none: 'Ohne',
  breakfast: 'Frühstück',
  half_board: 'Halbpension',
  full_board: 'Vollpension',
};

export default function BookingsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredBookings = bookingsData.filter(booking => {
    const matchesSearch =
      booking.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;

    return matchesSearch && matchesStatus;
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

  // Stats
  const stats = {
    total: bookingsData.length,
    confirmed: bookingsData.filter(b => b.status === 'confirmed').length,
    checkedIn: bookingsData.filter(b => b.status === 'checked_in').length,
    revenue: bookingsData.reduce((sum, b) => sum + b.totalPrice, 0),
  };

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Buchungen</h1>
          <p className="mt-1 text-slate-600">
            {filteredBookings.length} Buchungen
          </p>
        </div>
        <button className="flex items-center justify-center w-10 h-10 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors" title="Neue Buchung">
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Gesamt</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Bestätigt</p>
          <p className="text-2xl font-bold text-blue-600">{stats.confirmed}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Eingecheckt</p>
          <p className="text-2xl font-bold text-green-600">{stats.checkedIn}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Umsatz</p>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.revenue)}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Suche nach Buchungsnummer, Gast, Email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Alle Status</option>
          {Object.entries(statusConfig).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          <Filter className="h-5 w-5 text-slate-600" />
          <span className="text-slate-700">Mehr Filter</span>
        </button>
      </div>

      {/* Bookings Table */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Buchung</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Gast</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Zimmer</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Zeitraum</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-700">Personen</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">Preis</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-700">Status</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-700">Kanal</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-700"></th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="font-mono text-sm font-medium text-slate-900">{booking.id}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      erstellt am {formatDate(booking.createdAt)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{booking.guestName}</p>
                        <p className="text-sm text-slate-500">{booking.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Hotel className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="font-medium text-slate-900">{booking.roomName}</p>
                        <p className="text-sm text-slate-500">{booking.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-900">
                          {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {booking.nights} Nächte, {mealPlanLabels[booking.mealPlan]}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm text-slate-900">
                      {booking.adults} Erw.{booking.children > 0 ? `, ${booking.children} Kind.` : ''}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(booking.totalPrice)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[booking.status].bg} ${statusConfig[booking.status].color}`}>
                      {statusConfig[booking.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm text-slate-600">
                      {channelLabels[booking.channel]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                      <MoreHorizontal className="h-5 w-5 text-slate-400" />
                    </button>
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
