'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

// Dummy-Daten für Zimmer
const rooms = [
  { id: '1', name: 'Zimmer 1', category: 'DZ Seeblick' },
  { id: '2', name: 'Zimmer 2', category: 'DZ Seeblick' },
  { id: '3', name: 'Zimmer 3', category: 'DZ Balkon' },
  { id: '4', name: 'Zimmer 4', category: 'DZ Balkon' },
  { id: '5', name: 'Zimmer 5', category: 'EZ Standard' },
  { id: '6', name: 'Zimmer 6', category: 'Suite' },
  { id: '7', name: 'Zimmer 7', category: 'DZ Standard' },
  { id: '8', name: 'Zimmer 8', category: 'DZ Standard' },
];

// Dummy-Buchungen
const bookings = [
  { id: 'b1', roomId: '1', guestName: 'Müller', checkIn: '2024-12-20', checkOut: '2024-12-24', status: 'confirmed' },
  { id: 'b2', roomId: '2', guestName: 'Schmidt', checkIn: '2024-12-18', checkOut: '2024-12-22', status: 'checked_in' },
  { id: 'b3', roomId: '3', guestName: 'Weber', checkIn: '2024-12-22', checkOut: '2024-12-28', status: 'confirmed' },
  { id: 'b4', roomId: '5', guestName: 'Fischer', checkIn: '2024-12-19', checkOut: '2024-12-21', status: 'option' },
  { id: 'b5', roomId: '6', guestName: 'Wagner', checkIn: '2024-12-25', checkOut: '2024-12-31', status: 'confirmed' },
];

const statusColors: Record<string, string> = {
  confirmed: 'bg-blue-500',
  checked_in: 'bg-green-500',
  checked_out: 'bg-slate-400',
  option: 'bg-amber-500',
  cancelled: 'bg-red-500',
  inquiry: 'bg-purple-500',
};

const statusLabels: Record<string, string> = {
  confirmed: 'Bestätigt',
  checked_in: 'Eingecheckt',
  checked_out: 'Ausgecheckt',
  option: 'Option',
  cancelled: 'Storniert',
  inquiry: 'Anfrage',
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [daysToShow] = useState(14);

  // Berechne die Tage für die Anzeige
  const dates = useMemo(() => {
    const result = [];
    const startDate = new Date(currentDate);
    startDate.setDate(startDate.getDate() - 2); // 2 Tage vorher starten

    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      result.push(date);
    }
    return result;
  }, [currentDate, daysToShow]);

  const formatDateKey = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatDay = (date: Date) => {
    return date.toLocaleDateString('de-DE', { weekday: 'short' });
  };

  const formatDate = (date: Date) => {
    return date.getDate().toString();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Finde Buchung für ein Zimmer an einem bestimmten Tag
  const getBookingForRoomAndDate = (roomId: string, date: Date) => {
    const dateKey = formatDateKey(date);
    return bookings.find(booking => {
      if (booking.roomId !== roomId) return false;
      return dateKey >= booking.checkIn && dateKey < booking.checkOut;
    });
  };

  // Berechne ob dies der Start einer Buchung ist
  const isBookingStart = (booking: typeof bookings[0], date: Date) => {
    return formatDateKey(date) === booking.checkIn;
  };

  // Berechne die Länge einer Buchung in Tagen (für die Anzeige)
  const getBookingSpan = (booking: typeof bookings[0], startDate: Date) => {
    const checkOut = new Date(booking.checkOut);
    const endIndex = dates.findIndex(d => formatDateKey(d) >= booking.checkOut);
    const startIndex = dates.findIndex(d => formatDateKey(d) === formatDateKey(startDate));

    if (endIndex === -1) {
      return daysToShow - startIndex;
    }
    return endIndex - startIndex;
  };

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Buchungskalender</h1>
          <p className="mt-1 text-slate-600">
            {currentDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white rounded-lg shadow-sm border border-slate-200">
            <button
              onClick={() => navigateWeek(-1)}
              className="p-2 hover:bg-slate-100 rounded-l-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-slate-600" />
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Heute
            </button>
            <button
              onClick={() => navigateWeek(1)}
              className="p-2 hover:bg-slate-100 rounded-r-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-slate-600" />
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="h-5 w-5" />
            <span>Neue Buchung</span>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        {Object.entries(statusLabels).map(([status, label]) => (
          <div key={status} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded ${statusColors[status]}`} />
            <span className="text-sm text-slate-600">{label}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto h-full">
          <table className="w-full border-collapse min-w-max">
            {/* Header */}
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky left-0 z-10 bg-slate-50 border-b border-r border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700 min-w-[150px]">
                  Zimmer
                </th>
                {dates.map((date, index) => (
                  <th
                    key={index}
                    className={`border-b border-slate-200 px-2 py-3 text-center min-w-[80px] ${
                      isWeekend(date) ? 'bg-slate-100' : ''
                    } ${isToday(date) ? 'bg-blue-50' : ''}`}
                  >
                    <div className="text-xs text-slate-500">{formatDay(date)}</div>
                    <div className={`text-lg font-semibold ${isToday(date) ? 'text-blue-600' : 'text-slate-700'}`}>
                      {formatDate(date)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id} className="group">
                  <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-b border-r border-slate-200 px-4 py-3">
                    <div className="font-medium text-slate-900">{room.name}</div>
                    <div className="text-xs text-slate-500">{room.category}</div>
                  </td>
                  {dates.map((date, dateIndex) => {
                    const booking = getBookingForRoomAndDate(room.id, date);
                    const isStart = booking && isBookingStart(booking, date);
                    const span = booking && isStart ? getBookingSpan(booking, date) : 0;

                    // Skip cells that are covered by a booking span
                    if (booking && !isStart) {
                      return null;
                    }

                    return (
                      <td
                        key={dateIndex}
                        colSpan={isStart ? span : 1}
                        className={`border-b border-slate-200 p-1 ${
                          isWeekend(date) ? 'bg-slate-50' : ''
                        } ${isToday(date) ? 'bg-blue-50/50' : ''} ${
                          !booking ? 'hover:bg-slate-100 cursor-pointer' : ''
                        }`}
                      >
                        {booking && isStart && (
                          <div
                            className={`${statusColors[booking.status]} rounded px-2 py-1 text-white text-sm font-medium truncate cursor-pointer hover:opacity-90 transition-opacity`}
                            title={`${booking.guestName} - ${booking.checkIn} bis ${booking.checkOut}`}
                          >
                            {booking.guestName}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
