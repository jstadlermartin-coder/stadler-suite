'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useBookingWizard } from '@/components/booking/NewBookingWizard';
import { getBookings, getCategories, getBuildings, Booking, Category, Building } from '@/lib/firestore';
import { getHolidaySettings } from '@/lib/holiday-settings';
import { getHolidayInfoForDate, HolidaySettings, defaultHolidaySettings } from '@/lib/holidays';

interface DisplayRoom {
  id: string;
  name: string;
  category: string;
  buildingId?: string;
  buildingName?: string;
  buildingOrder?: number;
}

interface DisplayBooking {
  id: string;
  roomId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  status: string;
  categoryIds?: string[];
}

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

const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

// Helper: Get days for a month grid
const getDaysForMonth = (month: Date) => {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);

  // Start from Monday
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const days: (Date | null)[] = [];

  // Days from previous month
  for (let i = 0; i < startDay; i++) {
    const d = new Date(year, monthIndex, -startDay + i + 1);
    days.push(d);
  }

  // Days of current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, monthIndex, d));
  }

  // Fill remaining days from next month
  const remaining = 42 - days.length; // 6 rows * 7 days
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, monthIndex + 1, i));
  }

  return days;
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [daysToShow] = useState(14);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date());
  const monthBandRef = useRef<HTMLDivElement>(null);

  // Date selection for new booking
  const [selectingDates, setSelectingDates] = useState(false);
  const [selectedCheckIn, setSelectedCheckIn] = useState<Date | null>(null);
  const [selectedCheckOut, setSelectedCheckOut] = useState<Date | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Data from Firestore
  const [rooms, setRooms] = useState<DisplayRoom[]>([]);
  const [bookings, setBookings] = useState<DisplayBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [holidaySettings, setHolidaySettings] = useState<HolidaySettings>(defaultHolidaySettings);

  const { open: openBookingWizard } = useBookingWizard();

  // Load data from Firestore
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [categoriesData, bookingsData, buildingsData, holidaySettingsData] = await Promise.all([
          getCategories(),
          getBookings(),
          getBuildings(),
          getHolidaySettings()
        ]);

        setHolidaySettings(holidaySettingsData);

        // Create building lookup map
        const buildingMap = new Map<string, Building>();
        buildingsData.forEach((b: Building) => buildingMap.set(b.id, b));

        // Build rooms list from categories
        const roomsList: DisplayRoom[] = [];
        categoriesData.forEach((cat: Category) => {
          cat.rooms?.forEach(room => {
            const building = room.buildingId ? buildingMap.get(room.buildingId) : undefined;
            roomsList.push({
              id: room.id,
              name: room.number || room.name,
              category: cat.name,
              buildingId: room.buildingId,
              buildingName: building?.name || room.buildingName,
              buildingOrder: building?.sortOrder ?? 999
            });
          });
        });

        // Sort rooms: first by building order, then alphabetically by room name/number
        roomsList.sort((a, b) => {
          // First sort by building order (rooms without building come last)
          const orderA = a.buildingOrder ?? 999;
          const orderB = b.buildingOrder ?? 999;
          if (orderA !== orderB) return orderA - orderB;

          // Then by building name
          const buildingNameA = a.buildingName || 'zzz';
          const buildingNameB = b.buildingName || 'zzz';
          if (buildingNameA !== buildingNameB) return buildingNameA.localeCompare(buildingNameB, 'de');

          // Finally by room number/name (natural sort for numbers)
          return a.name.localeCompare(b.name, 'de', { numeric: true });
        });

        // If no rooms in settings, show placeholder
        if (roomsList.length === 0) {
          setRooms([
            { id: 'placeholder-1', name: 'Zimmer 1', category: 'Noch keine Zimmer konfiguriert' }
          ]);
        } else {
          setRooms(roomsList);
        }

        // Convert bookings for display
        const displayBookings: DisplayBooking[] = bookingsData.map((b: Booking) => ({
          id: b.id,
          roomId: b.roomId || '',
          guestName: b.guestName,
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          status: b.status,
          categoryIds: b.categoryIds
        }));

        setBookings(displayBookings);
      } catch (error) {
        console.error('Error loading calendar data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const currentMonth = viewMonth.getMonth();
  const currentYear = viewMonth.getFullYear();
  const todayMonth = new Date().getMonth();
  const todayYear = new Date().getFullYear();

  // Scroll to active month when picker opens
  useEffect(() => {
    if (showDatePicker && monthBandRef.current) {
      const activeBtn = monthBandRef.current.querySelector('[data-active="true"]');
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [showDatePicker, currentMonth]);

  // Sync viewMonth with currentDate
  useEffect(() => {
    setViewMonth(currentDate);
  }, [currentDate]);

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

  const calendarDays = useMemo(() => getDaysForMonth(viewMonth), [viewMonth]);

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

  const isSameMonth = (date: Date, month: Date) => {
    return date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear();
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setViewMonth(new Date());
  };

  const handleDayClick = (day: Date) => {
    setCurrentDate(day);
    setViewMonth(day);
    setShowDatePicker(false);
  };

  const handleMonthSelect = (year: number, month: number) => {
    const newDate = new Date(year, month, 1);
    setViewMonth(newDate);
    setCurrentDate(newDate);
  };

  const navigateMonth = (direction: number) => {
    const newMonth = new Date(viewMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setViewMonth(newMonth);
  };

  // Handle cell click for date selection
  const handleCellClick = (roomId: string, date: Date) => {
    const booking = getBookingForRoomAndDate(roomId, date);
    if (booking) return; // Can't select occupied days

    if (!selectingDates || selectedRoomId !== roomId) {
      // Start new selection
      setSelectingDates(true);
      setSelectedRoomId(roomId);
      setSelectedCheckIn(date);
      setSelectedCheckOut(null);
    } else if (selectedCheckIn && !selectedCheckOut) {
      // Complete selection
      if (date > selectedCheckIn) {
        setSelectedCheckOut(date);
        // Open booking wizard with pre-filled dates
        setTimeout(() => {
          openBookingWizard({
            checkIn: selectedCheckIn,
            checkOut: date,
            roomId: roomId
          });
          // Reset selection after opening wizard
          setSelectingDates(false);
          setSelectedCheckIn(null);
          setSelectedCheckOut(null);
          setSelectedRoomId(null);
        }, 100);
      } else {
        // If clicked date is before check-in, start over
        setSelectedCheckIn(date);
        setSelectedCheckOut(null);
      }
    }
  };

  // Check if a date is in the selection range
  const isInSelectionRange = (roomId: string, date: Date) => {
    if (selectedRoomId !== roomId || !selectedCheckIn) return false;
    if (selectedCheckOut) {
      return date >= selectedCheckIn && date <= selectedCheckOut;
    }
    return date.toDateString() === selectedCheckIn.toDateString();
  };

  // Reset selection when clicking outside
  const resetSelection = () => {
    setSelectingDates(false);
    setSelectedCheckIn(null);
    setSelectedCheckOut(null);
    setSelectedRoomId(null);
  };

  // Finde Buchung für ein Zimmer an einem bestimmten Tag
  const getBookingForRoomAndDate = (roomId: string, date: Date) => {
    const dateKey = formatDateKey(date);
    const room = rooms.find(r => r.id === roomId);

    return bookings.find(booking => {
      // Check date range first
      if (!(dateKey >= booking.checkIn && dateKey < booking.checkOut)) return false;

      // If booking has specific room assigned, check that
      if (booking.roomId && booking.roomId === roomId) return true;

      // If booking has no room but has categoryIds, match by category name
      if (!booking.roomId && booking.categoryIds && room) {
        // Check if room's category matches any of the booking's categories
        // For now, we'll show unassigned bookings on the first available room of matching category
        return false; // Don't show unassigned bookings in room rows
      }

      return false;
    });
  };

  // Berechne ob dies der Start einer Buchung ist
  const isBookingStart = (booking: typeof bookings[0], date: Date) => {
    return formatDateKey(date) === booking.checkIn;
  };

  // Berechne die Länge einer Buchung in Tagen (für die Anzeige)
  const getBookingSpan = (booking: typeof bookings[0], startDate: Date) => {
    const endIndex = dates.findIndex(d => formatDateKey(d) >= booking.checkOut);
    const startIndex = dates.findIndex(d => formatDateKey(d) === formatDateKey(startDate));

    if (endIndex === -1) {
      return daysToShow - startIndex;
    }
    return endIndex - startIndex;
  };

  // Month band elements
  const renderMonthBand = () => {
    const elements: React.ReactNode[] = [];
    const startYear = currentYear - 1;
    const endYear = currentYear + 1;

    for (let year = startYear; year <= endYear; year++) {
      for (let month = 0; month < 12; month++) {
        const isActive = month === currentMonth && year === currentYear;
        const isCurrent = month === todayMonth && year === todayYear;

        // Year separator before January
        if (month === 0 && year > startYear) {
          elements.push(
            <div
              key={`year-${year}`}
              className="flex-shrink-0 px-3 py-1 mx-1 text-xs font-bold text-slate-400 bg-slate-100 rounded-full"
            >
              {year}
            </div>
          );
        }

        elements.push(
          <button
            key={`${year}-${month}`}
            data-active={isActive}
            onClick={() => handleMonthSelect(year, month)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              isActive
                ? 'bg-blue-500 text-white shadow-sm'
                : isCurrent
                  ? 'text-blue-600 bg-blue-50 ring-1 ring-blue-200'
                  : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {MONTHS[month]}
          </button>
        );
      }
    }
    return elements;
  };

  // Format header text
  const getHeaderText = () => {
    const monthName = currentDate.toLocaleDateString('de-DE', { month: 'short' });
    return `${monthName} ${currentDate.getFullYear()}`;
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header mit Monat/Jahr + Dropdown */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        {/* Left: Month/Year with Dropdown */}
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className="flex items-center gap-1 px-3 py-2 text-xl font-medium text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
        >
          {getHeaderText()}
          <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
        </button>

        {/* Right: Navigation + Actions */}
        <div className="flex items-center gap-2">
          {/* Today Button */}
          <button
            onClick={goToToday}
            className="w-10 h-10 text-slate-600 hover:bg-slate-100 rounded-full flex items-center justify-center relative transition-colors"
            title="Heute"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth={1.5} />
              <path strokeLinecap="round" strokeWidth={1.5} d="M3 10h18" />
              <path strokeLinecap="round" strokeWidth={1.5} d="M8 3v3M16 3v3" />
            </svg>
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-[-10%] text-[9px] font-bold text-slate-700">
              {new Date().getDate()}
            </span>
          </button>

          {/* Week Navigation */}
          <div className="flex items-center">
            <button
              onClick={() => navigateWeek(-1)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-slate-600" />
            </button>
            <button
              onClick={() => navigateWeek(1)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-slate-600" />
            </button>
          </div>

        </div>
      </header>

      {/* Date Picker Dropdown */}
      <div className={`overflow-hidden transition-all duration-300 ease-out border-b border-slate-200 ${showDatePicker ? 'max-h-[420px]' : 'max-h-0 border-b-0'}`}>
        <div className="bg-white">
          {/* Mini Calendar */}
          <div className="px-4 pt-3">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-slate-600" />
              </button>
              <h3 className="font-semibold text-slate-900">
                {viewMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={() => navigateMonth(1)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-slate-600" />
              </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(day => (
                <div key={day} className="text-center text-xs font-medium text-slate-400 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-0.5 pb-3">
              {calendarDays.map((day, idx) => {
                if (!day) return <div key={idx} />;
                const inMonth = isSameMonth(day, viewMonth);
                const selected = isSameDay(day, currentDate);
                const today = isToday(day);
                const holidayInfo = getHolidayInfoForDate(day, holidaySettings);
                const hasHoliday = holidayInfo !== null;

                return (
                  <button
                    key={idx}
                    onClick={() => handleDayClick(day)}
                    title={hasHoliday ? holidayInfo.name : undefined}
                    className={`h-9 w-9 mx-auto rounded-full text-sm font-medium transition-all relative
                      ${!inMonth ? 'text-slate-300' : 'text-slate-700 hover:bg-slate-100'}
                      ${selected ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
                      ${today && !selected ? 'text-blue-600 ring-1 ring-blue-300' : ''}
                      ${hasHoliday && !selected ? 'ring-2 ring-orange-400' : ''}
                    `}
                  >
                    {day.getDate()}
                    {hasHoliday && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Month Band */}
          <div className="border-t border-slate-100">
            <div
              ref={monthBandRef}
              className="flex items-center gap-1 px-3 py-2.5 overflow-x-auto"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {renderMonthBand()}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-slate-100 bg-slate-50">
        {Object.entries(statusLabels).slice(0, 4).map(([status, label]) => (
          <div key={status} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded ${statusColors[status]}`} />
            <span className="text-xs text-slate-600">{label}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-slate-500">Laden...</div>
          </div>
        ) : (
          <div className="overflow-auto h-full" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
            <table className="w-full border-collapse table-fixed">
              {/* Header */}
              <thead>
                <tr className="bg-slate-50">
                  <th className="sticky left-0 z-10 bg-slate-50 border-b border-r border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700 w-[140px]">
                    Zimmer
                  </th>
                  {dates.map((date, index) => {
                    const holidayInfo = getHolidayInfoForDate(date, holidaySettings);
                    const hasHoliday = holidayInfo !== null;

                    return (
                      <th
                        key={index}
                        className={`border-b border-slate-200 px-1 py-2 text-center min-w-[60px] ${
                          isWeekend(date) ? 'bg-slate-100' : ''
                        } ${isToday(date) ? 'bg-blue-500 text-white' : ''}`}
                      >
                        <div className={`text-xs ${isToday(date) ? 'text-blue-100' : 'text-slate-500'}`}>{formatDay(date)}</div>
                        <div className={`text-lg font-semibold ${isToday(date) ? 'text-white' : 'text-slate-700'}`}>
                          {formatDate(date)}
                        </div>
                        {hasHoliday && (
                          <div className="flex flex-col items-center mt-1">
                            <div
                              className="w-2 h-2 rounded-full bg-orange-500"
                              title={holidayInfo.name}
                            />
                            <div
                              className={`text-[9px] leading-tight truncate max-w-[56px] ${
                                isToday(date) ? 'text-orange-200' : 'text-orange-600'
                              }`}
                              title={holidayInfo.name}
                            >
                              {holidayInfo.name.split('(')[0].trim()}
                            </div>
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Body */}
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id} className="group">
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-b border-r border-slate-200 px-4 py-2">
                      <div className="font-medium text-slate-900 text-sm">{room.name}</div>
                      <div className="text-xs text-slate-500">
                        {room.buildingName ? `${room.buildingName} · ${room.category}` : room.category}
                      </div>
                    </td>
                    {dates.map((date, dateIndex) => {
                      const booking = getBookingForRoomAndDate(room.id, date);
                      const isStart = booking && isBookingStart(booking, date);
                      const span = booking && isStart ? getBookingSpan(booking, date) : 0;
                      const isSelected = isInSelectionRange(room.id, date);
                      const isSelectionStart = selectedCheckIn && date.toDateString() === selectedCheckIn.toDateString() && selectedRoomId === room.id;
                      const isTodayCell = isToday(date);

                      // Skip cells that are covered by a booking span
                      if (booking && !isStart) {
                        return null;
                      }

                      return (
                        <td
                          key={dateIndex}
                          colSpan={isStart ? span : 1}
                          onClick={() => !booking && handleCellClick(room.id, date)}
                          className={`border-b border-slate-200 p-1 h-12 relative ${
                            isWeekend(date) ? 'bg-slate-50' : ''
                          } ${isTodayCell ? 'bg-blue-100' : ''} ${
                            isSelected ? 'bg-green-100' : ''
                          } ${
                            !booking ? 'hover:bg-slate-200 cursor-pointer' : ''
                          }`}
                        >
                          {booking && isStart && (
                            <div
                              className={`${statusColors[booking.status]} rounded-r-lg px-2 py-1 text-white text-sm font-medium truncate cursor-pointer hover:opacity-90 transition-opacity absolute top-1 bottom-1 left-1/2 right-1`}
                              title={`${booking.guestName} - ${booking.checkIn} bis ${booking.checkOut}`}
                              style={{ width: `calc(${span * 100}% - 50% - 4px)` }}
                            >
                              {booking.guestName}
                            </div>
                          )}
                          {isSelectionStart && !selectedCheckOut && (
                            <div className="absolute inset-1 bg-green-500 rounded opacity-30 animate-pulse" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Unzugewiesene Buchungen */}
                {bookings.filter(b => !b.roomId).length > 0 && (
                  <>
                    <tr>
                      <td
                        colSpan={dates.length + 1}
                        className="bg-amber-50 border-b border-slate-200 px-4 py-2"
                      >
                        <div className="font-medium text-amber-700 text-sm">
                          Nicht zugewiesene Buchungen ({bookings.filter(b => !b.roomId).length})
                        </div>
                      </td>
                    </tr>
                    {bookings.filter(b => !b.roomId).map((booking) => {
                      const checkInDate = new Date(booking.checkIn);
                      const checkOutDate = new Date(booking.checkOut);
                      const startIndex = dates.findIndex(d => formatDateKey(d) === booking.checkIn);
                      const endIndex = dates.findIndex(d => formatDateKey(d) >= booking.checkOut);
                      const span = endIndex === -1 ? daysToShow - Math.max(0, startIndex) : endIndex - Math.max(0, startIndex);

                      return (
                        <tr key={booking.id} className="group">
                          <td className="sticky left-0 z-10 bg-amber-50 group-hover:bg-amber-100 border-b border-r border-slate-200 px-4 py-2">
                            <div className="font-medium text-slate-900 text-sm">{booking.guestName}</div>
                            <div className="text-xs text-slate-500">
                              {checkInDate.toLocaleDateString('de-AT')} - {checkOutDate.toLocaleDateString('de-AT')}
                            </div>
                          </td>
                          {dates.map((date, dateIndex) => {
                            const dateKey = formatDateKey(date);
                            const isInBooking = dateKey >= booking.checkIn && dateKey < booking.checkOut;
                            const isStart = dateKey === booking.checkIn;
                            const isTodayCell = isToday(date);

                            if (isInBooking && !isStart) {
                              return null;
                            }

                            return (
                              <td
                                key={dateIndex}
                                colSpan={isStart ? span : 1}
                                className={`border-b border-slate-200 p-1 h-12 relative ${
                                  isWeekend(date) ? 'bg-slate-50' : ''
                                } ${isTodayCell && !isInBooking ? 'bg-blue-100' : ''}`}
                              >
                                {isStart && (
                                  <div
                                    className={`${statusColors[booking.status]} rounded-lg px-2 py-1 text-white text-sm font-medium truncate cursor-pointer hover:opacity-90 transition-opacity absolute top-1 bottom-1 left-1 right-1`}
                                    title={`${booking.guestName} - ${booking.checkIn} bis ${booking.checkOut}`}
                                  >
                                    {booking.guestName}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
