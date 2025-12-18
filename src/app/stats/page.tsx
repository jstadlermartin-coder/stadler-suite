'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Users, Euro, Hotel, Calendar } from 'lucide-react';

const monthlyData = [
  { month: 'Jan', bookings: 45, revenue: 12500, occupancy: 42 },
  { month: 'Feb', bookings: 52, revenue: 14200, occupancy: 48 },
  { month: 'Mär', bookings: 68, revenue: 18900, occupancy: 58 },
  { month: 'Apr', bookings: 75, revenue: 21500, occupancy: 65 },
  { month: 'Mai', bookings: 82, revenue: 24800, occupancy: 72 },
  { month: 'Jun', bookings: 95, revenue: 32500, occupancy: 85 },
  { month: 'Jul', bookings: 110, revenue: 42000, occupancy: 95 },
  { month: 'Aug', bookings: 115, revenue: 45000, occupancy: 98 },
  { month: 'Sep', bookings: 88, revenue: 28500, occupancy: 78 },
  { month: 'Okt', bookings: 72, revenue: 22000, occupancy: 65 },
  { month: 'Nov', bookings: 48, revenue: 13500, occupancy: 45 },
  { month: 'Dez', bookings: 85, revenue: 35000, occupancy: 82 },
];

const channelStats = [
  { name: 'Direkt', bookings: 320, revenue: 98500, percentage: 35 },
  { name: 'Booking.com', bookings: 280, revenue: 78000, percentage: 30 },
  { name: 'Website', bookings: 180, revenue: 52000, percentage: 20 },
  { name: 'Expedia', bookings: 95, revenue: 28000, percentage: 10 },
  { name: 'Andere', bookings: 45, revenue: 13500, percentage: 5 },
];

const categoryStats = [
  { name: 'Suite', bookings: 85, revenue: 68000, avgPrice: 285 },
  { name: 'DZ Seeblick', bookings: 245, revenue: 89000, avgPrice: 175 },
  { name: 'DZ Balkon', bookings: 198, revenue: 58000, avgPrice: 155 },
  { name: 'DZ Standard', bookings: 312, revenue: 72000, avgPrice: 125 },
  { name: 'EZ Standard', bookings: 80, revenue: 13000, avgPrice: 95 },
];

export default function StatsPage() {
  const [period, setPeriod] = useState<'month' | 'year'>('year');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate totals
  const totalBookings = monthlyData.reduce((sum, m) => sum + m.bookings, 0);
  const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
  const avgOccupancy = Math.round(monthlyData.reduce((sum, m) => sum + m.occupancy, 0) / monthlyData.length);
  const maxRevenue = Math.max(...monthlyData.map(m => m.revenue));

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Statistiken</h1>
          <p className="mt-1 text-slate-600">Übersicht über Buchungen und Umsatz</p>
        </div>
        <div className="flex items-center bg-white rounded-lg shadow-sm border border-slate-200">
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
              period === 'month' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Monat
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
              period === 'year' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Jahr
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <span className="flex items-center gap-1 text-sm text-green-600">
              <TrendingUp className="h-4 w-4" />
              +12%
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalBookings}</p>
          <p className="text-sm text-slate-500">Buchungen</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Euro className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="flex items-center gap-1 text-sm text-green-600">
              <TrendingUp className="h-4 w-4" />
              +18%
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalRevenue)}</p>
          <p className="text-sm text-slate-500">Umsatz</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Hotel className="h-5 w-5 text-purple-600" />
            </div>
            <span className="flex items-center gap-1 text-sm text-green-600">
              <TrendingUp className="h-4 w-4" />
              +5%
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{avgOccupancy}%</p>
          <p className="text-sm text-slate-500">Ø Auslastung</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <span className="flex items-center gap-1 text-sm text-red-600">
              <TrendingDown className="h-4 w-4" />
              -3%
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalRevenue / totalBookings)}</p>
          <p className="text-sm text-slate-500">Ø Buchungswert</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Umsatz pro Monat</h3>
          <div className="h-64 flex items-end gap-2">
            {monthlyData.map((data) => (
              <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                  style={{ height: `${(data.revenue / maxRevenue) * 200}px` }}
                  title={formatCurrency(data.revenue)}
                />
                <span className="text-xs text-slate-500">{data.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Channel Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Buchungskanäle</h3>
          <div className="space-y-4">
            {channelStats.map((channel) => (
              <div key={channel.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-700">{channel.name}</span>
                  <span className="text-sm font-medium text-slate-900">{channel.percentage}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${channel.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Stats */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Umsatz nach Zimmerkategorie</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Kategorie</th>
              <th className="text-center px-6 py-3 text-sm font-semibold text-slate-700">Buchungen</th>
              <th className="text-right px-6 py-3 text-sm font-semibold text-slate-700">Umsatz</th>
              <th className="text-right px-6 py-3 text-sm font-semibold text-slate-700">Ø Preis/Nacht</th>
            </tr>
          </thead>
          <tbody>
            {categoryStats.map((cat) => (
              <tr key={cat.name} className="border-t border-slate-100">
                <td className="px-6 py-4 font-medium text-slate-900">{cat.name}</td>
                <td className="px-6 py-4 text-center text-slate-700">{cat.bookings}</td>
                <td className="px-6 py-4 text-right font-semibold text-emerald-600">{formatCurrency(cat.revenue)}</td>
                <td className="px-6 py-4 text-right text-slate-700">{formatCurrency(cat.avgPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
