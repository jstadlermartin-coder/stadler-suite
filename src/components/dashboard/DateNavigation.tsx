'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import DatePickerOverlay from '@/components/calendar/DatePickerOverlay';
import { HolidaySettings, defaultHolidaySettings } from '@/lib/holidays';

interface DateNavigationProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  holidaySettings?: HolidaySettings;
}

export default function DateNavigation({
  currentDate,
  onDateChange,
  holidaySettings
}: DateNavigationProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const goToPreviousDay = () => {
    onDateChange(subDays(currentDate, 1));
  };

  const goToNextDay = () => {
    onDateChange(addDays(currentDate, 1));
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const formatDateDisplay = (date: Date): string => {
    if (isToday(date)) {
      return 'Heute';
    }

    const tomorrow = addDays(new Date(), 1);
    if (format(date, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd')) {
      return 'Morgen';
    }

    const yesterday = subDays(new Date(), 1);
    if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return 'Gestern';
    }

    return format(date, 'EEE, d. MMM', { locale: de });
  };

  return (
    <div className="flex items-center gap-1">
      {/* Previous Day Button */}
      <button
        onClick={goToPreviousDay}
        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        aria-label="Vorheriger Tag"
      >
        <ChevronLeft className="h-5 w-5 text-slate-600" />
      </button>

      {/* Date Display - Clickable to open DatePicker */}
      <button
        onClick={() => setShowDatePicker(!showDatePicker)}
        className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 rounded-lg transition-colors min-w-[120px] justify-center"
      >
        <Calendar className="h-4 w-4 text-slate-500" />
        <span className="text-sm font-medium text-slate-700">
          {formatDateDisplay(currentDate)}
        </span>
      </button>

      {/* Next Day Button */}
      <button
        onClick={goToNextDay}
        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        aria-label="Nächster Tag"
      >
        <ChevronRight className="h-5 w-5 text-slate-600" />
      </button>

      {/* Today Button - only show if not today */}
      {!isToday(currentDate) && (
        <button
          onClick={goToToday}
          className="ml-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          Heute
        </button>
      )}

      {/* DatePicker Overlay */}
      {showDatePicker && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDatePicker(false)}
          />
          {/* DatePicker */}
          <div className="absolute top-full right-0 mt-2 z-50 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden min-w-[300px]">
            <DatePickerOverlay
              isOpen={true}
              onClose={() => setShowDatePicker(false)}
              currentDate={currentDate}
              onDateSelect={(date) => {
                onDateChange(date);
                setShowDatePicker(false);
              }}
              holidaySettings={holidaySettings || defaultHolidaySettings}
            />
          </div>
        </>
      )}
    </div>
  );
}
