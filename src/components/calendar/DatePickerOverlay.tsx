'use client';
import { useState, useRef, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, getMonth, getYear, setMonth, setYear } from 'date-fns';
import { de } from 'date-fns/locale';
import { getHolidayInfoForDate, defaultHolidaySettings, HolidaySettings } from '@/lib/holidays';
import { CalendarView } from '@/types/calendar';

interface DatePickerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
  onDateSelect: (date: Date) => void;
  view?: CalendarView;
  holidaySettings?: HolidaySettings;
}

const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

// Helper: Generiere Tage für einen Monat
const getDaysForMonth = (month: Date) => {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
};

export default function DatePickerOverlay({
  isOpen,
  onClose,
  currentDate,
  onDateSelect,
  view = 'day',
  holidaySettings
}: DatePickerOverlayProps) {
  const [viewMonth, setViewMonth] = useState(currentDate);
  const monthBandRef = useRef<HTMLDivElement>(null);
  const yearBandRef = useRef<HTMLDivElement>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchCurrentX, setTouchCurrentX] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const calendarContainerRef = useRef<HTMLDivElement>(null);

  const currentMonthIndex = getMonth(viewMonth);
  const currentYear = getYear(viewMonth);
  const todayMonth = getMonth(new Date());
  const todayYear = getYear(new Date());

  // Scroll zur aktuellen Position wenn geöffnet
  useEffect(() => {
    if (isOpen && monthBandRef.current) {
      const activeBtn = monthBandRef.current.querySelector('[data-active="true"]');
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [isOpen, currentMonthIndex]);

  useEffect(() => {
    if (isOpen && yearBandRef.current && view === 'year') {
      const activeBtn = yearBandRef.current.querySelector('[data-active="true"]');
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [isOpen, currentYear, view]);

  // Sync viewMonth mit currentDate wenn sich currentDate ändert
  useEffect(() => {
    setViewMonth(currentDate);
  }, [currentDate]);

  if (!isOpen) return null;

  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  // 3 Monate: vorheriger, aktueller, nächster
  const prevMonth = subMonths(viewMonth, 1);
  const nextMonth = addMonths(viewMonth, 1);
  const prevDays = getDaysForMonth(prevMonth);
  const currentDays = getDaysForMonth(viewMonth);
  const nextDays = getDaysForMonth(nextMonth);

  // Kalenderbreite für Animation
  const getCalendarWidth = () => {
    if (calendarContainerRef.current) {
      return calendarContainerRef.current.offsetWidth;
    }
    return 300; // Fallback
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    if (isAnimating) return;

    const width = getCalendarWidth();
    const targetOffset = direction === 'left' ? -width : width;

    setIsAnimating(true);
    setSwipeOffset(targetOffset);

    setTimeout(() => {
      const newMonth = direction === 'left'
        ? addMonths(viewMonth, 1)
        : subMonths(viewMonth, 1);

      setViewMonth(newMonth);
      setSwipeOffset(0);
      setIsAnimating(false);

      // Header-Datum aktualisieren
      const newDate = new Date(currentDate);
      newDate.setFullYear(newMonth.getFullYear());
      newDate.setMonth(newMonth.getMonth());
      if (newDate.getMonth() !== newMonth.getMonth()) {
        newDate.setDate(0);
      }
      onDateSelect(newDate);
    }, 250);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAnimating) return;
    setTouchStartX(e.touches[0].clientX);
    setTouchCurrentX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null || isAnimating) return;
    const currentX = e.touches[0].clientX;
    setTouchCurrentX(currentX);
    const diff = currentX - touchStartX;
    setSwipeOffset(diff);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchCurrentX === null || isAnimating) {
      setTouchStartX(null);
      setTouchCurrentX(null);
      return;
    }

    const diff = touchCurrentX - touchStartX;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      handleSwipe(diff < 0 ? 'left' : 'right');
    } else {
      // Zurück zur Mitte
      setSwipeOffset(0);
    }

    setTouchStartX(null);
    setTouchCurrentX(null);
  };

  const handleDayClick = (day: Date) => {
    onDateSelect(day);
    // Nicht schließen - User muss explizit schließen
  };

  // Generiere Jahre: 10 Jahre vor und nach dem aktuellen Jahr (unbegrenzt scrollbar)
  const years: number[] = [];
  for (let y = currentYear - 10; y <= currentYear + 10; y++) {
    years.push(y);
  }

  // Monatsband mit Jahr zwischen Dezember und Januar
  const renderMonthBand = () => {
    const elements: React.ReactNode[] = [];
    const startYear = currentYear - 1;
    const endYear = currentYear + 1;

    for (let year = startYear; year <= endYear; year++) {
      for (let month = 0; month < 12; month++) {
        const isActive = month === currentMonthIndex && year === currentYear;
        const isCurrent = month === todayMonth && year === todayYear;

        // Jahr-Trenner vor Januar (außer beim ersten Jahr)
        if (month === 0 && year > startYear) {
          elements.push(
            <div
              key={`year-${year}`}
              className="flex-shrink-0 px-3 py-1 mx-1 text-xs font-bold text-gray-400 bg-gray-100 rounded-full"
            >
              {year}
            </div>
          );
        }

        elements.push(
          <button
            key={`${year}-${month}`}
            data-active={isActive}
            onClick={() => {
              const newDate = setMonth(setYear(viewMonth, year), month);
              setViewMonth(newDate);
              onDateSelect(newDate);
            }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              isActive
                ? 'bg-blue-500 text-white shadow-sm'
                : isCurrent
                  ? 'text-blue-600 bg-blue-50 ring-1 ring-blue-200'
                  : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {MONTHS[month]}
          </button>
        );
      }
    }
    return elements;
  };

  // Jahresband für Jahresansicht
  const renderYearBand = () => {
    return years.map(year => {
      const isActive = year === currentYear;
      const isCurrent = year === todayYear;

      return (
        <button
          key={year}
          data-active={isActive}
          onClick={() => {
            const newDate = setYear(viewMonth, year);
            setViewMonth(newDate);
            onDateSelect(newDate);
          }}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            isActive
              ? 'bg-blue-500 text-white shadow-sm'
              : isCurrent
                ? 'text-blue-600 bg-blue-50 ring-1 ring-blue-200'
                : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {year}
        </button>
      );
    });
  };

  // Nur Jahresband für Jahresansicht
  if (view === 'year') {
    return (
      <div className="bg-white border-b border-gray-200 shadow-sm">
        {/* Jahresband */}
        <div
          ref={yearBandRef}
          className="flex items-center justify-center gap-2 px-4 py-3 overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {renderYearBand()}
        </div>
      </div>
    );
  }

  const settings = holidaySettings || defaultHolidaySettings;

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      {/* Mini-Kalender mit 3-Monat-Swipe */}
      <div
        ref={calendarContainerRef}
        className="px-4 pt-3 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Wochentage (statisch) */}
        <div className="grid grid-cols-7 mb-1">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* 3 Monate Container - nebeneinander */}
        <div className="relative overflow-hidden">
          <div
            className={`flex ${isAnimating ? 'transition-transform duration-250 ease-out' : ''}`}
            style={{
              width: '300%',
              transform: `translateX(calc(-33.333% + ${swipeOffset}px))`
            }}
          >
            {/* Vorheriger Monat */}
            <div className="w-1/3 flex-shrink-0">
              <div className="grid grid-cols-7 gap-0.5 pb-3">
                {prevDays.map((day, idx) => {
                  const inMonth = isSameMonth(day, prevMonth);
                  const selected = isSameDay(day, currentDate);
                  const today = isToday(day);
                  const holidayInfo = getHolidayInfoForDate(day, settings);
                  const holidayRingColor = holidayInfo?.color || (holidayInfo ? '#fb923c' : undefined);
                  const showHolidayRing = holidayRingColor && !selected && !today;
                  return (
                    <button
                      key={`prev-${idx}`}
                      onClick={() => handleDayClick(day)}
                      className={`relative h-9 w-9 mx-auto rounded-full text-sm font-medium transition-all
                        ${!inMonth ? 'text-gray-300' : ''}
                        ${inMonth && !selected ? 'text-gray-700' : ''}
                        ${selected ? 'bg-blue-500 text-white' : ''}
                        ${today && !selected ? 'text-blue-600 ring-1 ring-blue-300' : ''}
                      `}
                      style={showHolidayRing ? { boxShadow: `0 0 0 2px ${holidayRingColor}` } : undefined}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Aktueller Monat */}
            <div className="w-1/3 flex-shrink-0">
              <div className="grid grid-cols-7 gap-0.5 pb-3">
                {currentDays.map((day, idx) => {
                  const inMonth = isSameMonth(day, viewMonth);
                  const selected = isSameDay(day, currentDate);
                  const today = isToday(day);
                  const holidayInfo = getHolidayInfoForDate(day, settings);
                  const holidayRingColor = holidayInfo?.color || (holidayInfo ? '#fb923c' : undefined);
                  const showHolidayRing = holidayRingColor && !selected && !today;

                  return (
                    <button
                      key={`curr-${idx}`}
                      onClick={() => handleDayClick(day)}
                      className={`relative h-9 w-9 mx-auto rounded-full text-sm font-medium transition-all
                        ${!inMonth ? 'text-gray-300' : ''}
                        ${inMonth && !selected ? 'text-gray-700 hover:bg-gray-100' : ''}
                        ${selected ? 'bg-blue-500 text-white' : ''}
                        ${today && !selected ? 'text-blue-600 ring-1 ring-blue-300' : ''}
                      `}
                      style={showHolidayRing ? { boxShadow: `0 0 0 2px ${holidayRingColor}` } : undefined}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nächster Monat */}
            <div className="w-1/3 flex-shrink-0">
              <div className="grid grid-cols-7 gap-0.5 pb-3">
                {nextDays.map((day, idx) => {
                  const inMonth = isSameMonth(day, nextMonth);
                  const selected = isSameDay(day, currentDate);
                  const today = isToday(day);
                  const holidayInfo = getHolidayInfoForDate(day, settings);
                  const holidayRingColor = holidayInfo?.color || (holidayInfo ? '#fb923c' : undefined);
                  const showHolidayRing = holidayRingColor && !selected && !today;
                  return (
                    <button
                      key={`next-${idx}`}
                      onClick={() => handleDayClick(day)}
                      className={`relative h-9 w-9 mx-auto rounded-full text-sm font-medium transition-all
                        ${!inMonth ? 'text-gray-300' : ''}
                        ${inMonth && !selected ? 'text-gray-700' : ''}
                        ${selected ? 'bg-blue-500 text-white' : ''}
                        ${today && !selected ? 'text-blue-600 ring-1 ring-blue-300' : ''}
                      `}
                      style={showHolidayRing ? { boxShadow: `0 0 0 2px ${holidayRingColor}` } : undefined}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monatsband - horizontal scrollbar */}
      <div className="border-t border-gray-100">
        <div
          ref={monthBandRef}
          className="flex items-center gap-1 px-3 py-2.5 overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onTouchStart={(e) => {
            setTouchStartX(e.touches[0].clientX);
          }}
          onTouchEnd={(e) => {
            if (touchStartX !== null) {
              const diff = touchStartX - e.changedTouches[0].clientX;
              if (Math.abs(diff) > 80) {
                // Swipe zum nächsten Jahr
                const newYear = diff > 0 ? currentYear + 1 : currentYear - 1;
                const newDate = setYear(viewMonth, newYear);
                setViewMonth(newDate);
              }
              setTouchStartX(null);
            }
          }}
        >
          {renderMonthBand()}
        </div>
      </div>
    </div>
  );
}
