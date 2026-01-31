'use client';

import { useState, useMemo } from 'react';
import { format, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { CaphotelBooking } from '@/lib/firestore';
import { getStatsForDateRange, DashboardStats as Stats } from '@/lib/dashboard-utils';

interface DashboardStatsProps {
  bookings: CaphotelBooking[];
  totalRooms: number;
  startDate: Date;
}

type TimeRange = 7 | 14 | 30;

export default function DashboardStats({ bookings, totalRooms, startDate }: DashboardStatsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(7);

  // Calculate stats for the selected time range
  const statsData = useMemo(() => {
    return getStatsForDateRange(bookings, totalRooms, startDate, timeRange);
  }, [bookings, totalRooms, startDate, timeRange]);

  // Find max values for scaling
  const maxValue = useMemo(() => {
    let max = 0;
    statsData.forEach(({ stats }) => {
      max = Math.max(max, stats.arrivals, stats.departures, stats.inHouse);
    });
    return Math.max(max, 1); // Avoid division by zero
  }, [statsData]);

  // Calculate occupancy percentage
  const getOccupancyPercentage = (inHouse: number): number => {
    return totalRooms > 0 ? Math.round((inHouse / totalRooms) * 100) : 0;
  };

  // Format date for display
  const formatDateLabel = (date: Date, index: number): string => {
    if (timeRange <= 7) {
      return format(date, 'EEE', { locale: de });
    }
    if (timeRange <= 14) {
      return format(date, 'd.M.', { locale: de });
    }
    // For 30 days, show every 3rd date
    if (index % 3 === 0) {
      return format(date, 'd.M.', { locale: de });
    }
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Auslastung</h3>
        <div className="flex gap-2">
          {([7, 14, 30] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                timeRange === range
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {range} Tage
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-slate-600">Anreisen</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-slate-600">Abreisen</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-slate-600">Belegt</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-300" />
          <span className="text-slate-600">Frei</span>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-slate-50 rounded-2xl p-6">
        <div className="flex items-end gap-1 h-64 overflow-x-auto pb-2">
          {statsData.map(({ date, stats }, index) => {
            const barWidth = timeRange <= 7 ? 'w-12' : timeRange <= 14 ? 'w-8' : 'w-4';
            const occupancy = getOccupancyPercentage(stats.inHouse);

            return (
              <div
                key={index}
                className={`flex-shrink-0 flex flex-col items-center ${barWidth}`}
              >
                {/* Bars Container */}
                <div className="flex items-end gap-0.5 h-48 w-full">
                  {/* Arrivals Bar */}
                  <div
                    className="flex-1 bg-green-500 rounded-t transition-all duration-300"
                    style={{
                      height: `${(stats.arrivals / maxValue) * 100}%`,
                      minHeight: stats.arrivals > 0 ? '4px' : '0'
                    }}
                    title={`Anreisen: ${stats.arrivals}`}
                  />
                  {/* Departures Bar */}
                  <div
                    className="flex-1 bg-orange-500 rounded-t transition-all duration-300"
                    style={{
                      height: `${(stats.departures / maxValue) * 100}%`,
                      minHeight: stats.departures > 0 ? '4px' : '0'
                    }}
                    title={`Abreisen: ${stats.departures}`}
                  />
                  {/* Occupancy Bar (Stacked: Occupied + Free) */}
                  <div className="flex-1 flex flex-col-reverse h-full">
                    <div
                      className="bg-blue-500 rounded-t transition-all duration-300"
                      style={{
                        height: `${(stats.inHouse / totalRooms) * 100}%`,
                        minHeight: stats.inHouse > 0 ? '4px' : '0'
                      }}
                      title={`Belegt: ${stats.inHouse}`}
                    />
                    <div
                      className="bg-slate-200 transition-all duration-300"
                      style={{
                        height: `${(stats.available / totalRooms) * 100}%`
                      }}
                      title={`Frei: ${stats.available}`}
                    />
                  </div>
                </div>

                {/* Date Label */}
                <div className="mt-2 text-xs text-slate-500 text-center truncate w-full">
                  {formatDateLabel(date, index)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Arrivals */}
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-sm text-green-600 font-medium mb-1">Anreisen gesamt</p>
          <p className="text-2xl font-bold text-green-700">
            {statsData.reduce((sum, { stats }) => sum + stats.arrivals, 0)}
          </p>
        </div>

        {/* Total Departures */}
        <div className="bg-orange-50 rounded-xl p-4">
          <p className="text-sm text-orange-600 font-medium mb-1">Abreisen gesamt</p>
          <p className="text-2xl font-bold text-orange-700">
            {statsData.reduce((sum, { stats }) => sum + stats.departures, 0)}
          </p>
        </div>

        {/* Average Occupancy */}
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-sm text-blue-600 font-medium mb-1">Ø Auslastung</p>
          <p className="text-2xl font-bold text-blue-700">
            {Math.round(
              statsData.reduce((sum, { stats }) => sum + getOccupancyPercentage(stats.inHouse), 0) /
                statsData.length
            )}%
          </p>
        </div>

        {/* Revenue Potential (Nights Sold) */}
        <div className="bg-slate-100 rounded-xl p-4">
          <p className="text-sm text-slate-600 font-medium mb-1">Übernachtungen</p>
          <p className="text-2xl font-bold text-slate-700">
            {statsData.reduce((sum, { stats }) => sum + stats.inHouse, 0)}
          </p>
        </div>
      </div>

      {/* Daily Details Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h4 className="font-semibold text-slate-900">Tagesübersicht</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Datum</th>
                <th className="text-right px-4 py-2 font-medium text-green-600">Anreisen</th>
                <th className="text-right px-4 py-2 font-medium text-orange-600">Abreisen</th>
                <th className="text-right px-4 py-2 font-medium text-blue-600">Belegt</th>
                <th className="text-right px-4 py-2 font-medium text-slate-600">Frei</th>
                <th className="text-right px-4 py-2 font-medium text-slate-600">Auslastung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {statsData.slice(0, timeRange <= 7 ? 7 : 14).map(({ date, stats }, index) => {
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <tr
                    key={index}
                    className={isToday ? 'bg-blue-50' : 'hover:bg-slate-50'}
                  >
                    <td className="px-4 py-2.5">
                      <span className={`font-medium ${isToday ? 'text-blue-600' : 'text-slate-900'}`}>
                        {format(date, 'EEE, d. MMM', { locale: de })}
                      </span>
                      {isToday && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                          Heute
                        </span>
                      )}
                    </td>
                    <td className="text-right px-4 py-2.5 text-green-600 font-medium">
                      {stats.arrivals}
                    </td>
                    <td className="text-right px-4 py-2.5 text-orange-600 font-medium">
                      {stats.departures}
                    </td>
                    <td className="text-right px-4 py-2.5 text-blue-600 font-medium">
                      {stats.inHouse}
                    </td>
                    <td className="text-right px-4 py-2.5 text-slate-600">
                      {stats.available}
                    </td>
                    <td className="text-right px-4 py-2.5">
                      <span
                        className={`font-medium ${
                          getOccupancyPercentage(stats.inHouse) >= 80
                            ? 'text-green-600'
                            : getOccupancyPercentage(stats.inHouse) >= 50
                            ? 'text-yellow-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {getOccupancyPercentage(stats.inHouse)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {timeRange > 14 && (
          <div className="px-4 py-2 bg-slate-50 text-center text-sm text-slate-500">
            Zeige erste 14 Tage. Wähle 7 oder 14 Tage für vollständige Tabelle.
          </div>
        )}
      </div>
    </div>
  );
}
