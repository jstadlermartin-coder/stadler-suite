'use client';

import { useState, createContext, useContext, ReactNode, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar, Users, User, Mail, Phone, Plus, Minus, Bed, Check } from 'lucide-react';
import { addBooking } from '@/lib/firestore';

// Initial data that can be passed when opening wizard
interface InitialBookingData {
  checkIn?: Date;
  checkOut?: Date;
  roomId?: string;
}

// Context für den Wizard
interface BookingWizardContextType {
  isOpen: boolean;
  initialData: InitialBookingData | null;
  open: (data?: InitialBookingData) => void;
  close: () => void;
}

const BookingWizardContext = createContext<BookingWizardContextType | undefined>(undefined);

export function useBookingWizard() {
  const context = useContext(BookingWizardContext);
  if (!context) {
    throw new Error('useBookingWizard must be used within BookingWizardProvider');
  }
  return context;
}

export function BookingWizardProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialData, setInitialData] = useState<InitialBookingData | null>(null);

  const open = (data?: InitialBookingData) => {
    setInitialData(data || null);
    setIsOpen(true);
  };
  const close = () => {
    setIsOpen(false);
    setInitialData(null);
  };

  return (
    <BookingWizardContext.Provider value={{ isOpen, initialData, open, close }}>
      {children}
    </BookingWizardContext.Provider>
  );
}

// Plus Button für Header - Outline Style
export function NewBookingButton() {
  const { open } = useBookingWizard();

  return (
    <button
      onClick={() => open()}
      className="h-12 w-12 border-2 border-blue-600 bg-white hover:bg-blue-50 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105"
      aria-label="Neue Buchung"
    >
      <Plus className="h-6 w-6 text-blue-600" />
    </button>
  );
}

// Demo room categories
const roomCategories = [
  { id: 'dz-seeblick', name: 'DZ Seeblick', maxAdults: 2, maxChildren: 1, available: 2 },
  { id: 'dz-balkon', name: 'DZ Balkon', maxAdults: 2, maxChildren: 2, available: 1 },
  { id: 'dz-standard', name: 'DZ Standard', maxAdults: 2, maxChildren: 1, available: 3 },
  { id: 'ez-standard', name: 'EZ Standard', maxAdults: 1, maxChildren: 0, available: 2 },
  { id: 'suite', name: 'Suite', maxAdults: 4, maxChildren: 2, available: 1 },
  { id: 'familienzimmer', name: 'Familienzimmer', maxAdults: 3, maxChildren: 3, available: 1 },
];

// Wizard Drawer
export function NewBookingWizard() {
  const { isOpen, close, initialData } = useBookingWizard();
  const [step, setStep] = useState(1);

  // Step 1: Dates
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [selectingDate, setSelectingDate] = useState<'checkIn' | 'checkOut'>('checkIn');
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Step 2: Guests
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState<number[]>([]);

  // Step 3: Room Categories
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Step 4: Contact
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Step 5: Type (moved to end)
  const [bookingType, setBookingType] = useState<'inquiry' | 'booking' | null>(null);

  // Apply initial data when wizard opens with pre-filled dates
  useEffect(() => {
    if (isOpen && initialData) {
      if (initialData.checkIn) {
        setCheckIn(initialData.checkIn);
        setCalendarMonth(initialData.checkIn);
      }
      if (initialData.checkOut) {
        setCheckOut(initialData.checkOut);
      }
      // If both dates are provided, skip to step 2 (guests)
      if (initialData.checkIn && initialData.checkOut) {
        setStep(2);
      }
    }
  }, [isOpen, initialData]);

  // Reset on close
  const handleClose = () => {
    close();
    setTimeout(() => {
      setStep(1);
      setCheckIn(null);
      setCheckOut(null);
      setSelectingDate('checkIn');
      setAdults(2);
      setChildren([]);
      setSelectedCategories([]);
      setName('');
      setEmail('');
      setPhone('');
      setBookingType(null);
    }, 300);
  };

  // Calendar Helper
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    const startDay = (firstDay.getDay() + 6) % 7;
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const isDateInRange = (date: Date) => {
    if (!checkIn || !checkOut) return false;
    return date > checkIn && date < checkOut;
  };

  const isDateSelected = (date: Date) => {
    if (checkIn && date.toDateString() === checkIn.toDateString()) return true;
    if (checkOut && date.toDateString() === checkOut.toDateString()) return true;
    return false;
  };

  const handleDateClick = (date: Date) => {
    if (selectingDate === 'checkIn') {
      setCheckIn(date);
      setCheckOut(null);
      setSelectingDate('checkOut');
    } else {
      if (checkIn && date > checkIn) {
        setCheckOut(date);
      } else {
        setCheckIn(date);
        setCheckOut(null);
      }
    }
  };

  // Filter suitable room categories based on guest count
  const suitableCategories = roomCategories.filter(cat => {
    const totalGuests = adults + children.length;
    const maxGuests = cat.maxAdults + cat.maxChildren;
    return cat.available > 0 && (
      // Single category can accommodate all
      (adults <= cat.maxAdults && children.length <= cat.maxChildren) ||
      // Or for larger groups, show larger rooms
      (totalGuests <= maxGuests)
    );
  });

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  // Validation
  const canProceedStep1 = checkIn && checkOut;
  const canProceedStep2 = adults > 0;
  const canProceedStep3 = selectedCategories.length > 0;
  const canProceedStep4 = name.trim().length > 0;
  const canSubmit = bookingType !== null;

  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!checkIn || !checkOut || !bookingType) return;

    setSaving(true);
    try {
      const formatDateForDB = (date: Date) => {
        return date.toISOString().split('T')[0];
      };

      // Build booking data - only include optional fields if they have values
      const bookingData = {
        guestName: name,
        checkIn: formatDateForDB(checkIn),
        checkOut: formatDateForDB(checkOut),
        adults,
        children,
        categoryIds: selectedCategories,
        status: bookingType === 'inquiry' ? 'inquiry' as const : 'confirmed' as const,
        createdAt: new Date().toISOString(),
        ...(email && email.trim() ? { guestEmail: email.trim() } : {}),
        ...(phone && phone.trim() ? { guestPhone: phone.trim() } : {})
      };

      const bookingId = await addBooking(bookingData);

      if (bookingId) {
        console.log('Booking saved with ID:', bookingId);
        handleClose();
      } else {
        console.error('Failed to save booking');
        alert('Fehler beim Speichern der Buchung');
      }
    } catch (error) {
      console.error('Error saving booking:', error);
      alert('Fehler beim Speichern der Buchung');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const monthNames = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni',
                      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

  const stepTitles = ['Reisezeitraum', 'Personenanzahl', 'Zimmerkategorie', 'Kontaktdaten', 'Abschluss'];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-slate-600" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Neue Buchung</h2>
              <p className="text-sm text-slate-500">{stepTitles[step - 1]}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex gap-1 p-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-colors ${
                s <= step ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Step 1: Dates */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Date Selection Display */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => setSelectingDate('checkIn')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectingDate === 'checkIn'
                      ? 'border-blue-600 bg-blue-50'
                      : checkIn ? 'border-green-500 bg-green-50' : 'border-slate-200'
                  }`}
                >
                  <div className="text-xs text-slate-500">Anreise</div>
                  <div className={`font-semibold text-lg ${checkIn ? 'text-slate-900' : 'text-slate-400'}`}>
                    {checkIn ? formatDate(checkIn) : 'Wählen'}
                  </div>
                </button>
                <button
                  onClick={() => setSelectingDate('checkOut')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectingDate === 'checkOut'
                      ? 'border-blue-600 bg-blue-50'
                      : checkOut ? 'border-green-500 bg-green-50' : 'border-slate-200'
                  }`}
                >
                  <div className="text-xs text-slate-500">Abreise</div>
                  <div className={`font-semibold text-lg ${checkOut ? 'text-slate-900' : 'text-slate-400'}`}>
                    {checkOut ? formatDate(checkOut) : 'Wählen'}
                  </div>
                </button>
              </div>

              {/* Calendar */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                    className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5 text-slate-600" />
                  </button>
                  <span className="font-semibold text-slate-900">
                    {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                  </span>
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                    className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <ChevronRight className="h-5 w-5 text-slate-600" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-slate-500 py-1">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth(calendarMonth).map((date, i) => {
                    if (!date) {
                      return <div key={i} className="aspect-square" />;
                    }

                    const isSelected = isDateSelected(date);
                    const isInRange = isDateInRange(date);
                    const isToday = date.toDateString() === new Date().toDateString();
                    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

                    return (
                      <button
                        key={i}
                        onClick={() => !isPast && handleDateClick(date)}
                        disabled={isPast}
                        className={`
                          aspect-square rounded-lg text-sm font-medium transition-all
                          ${isPast ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-slate-200'}
                          ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                          ${isInRange ? 'bg-blue-100 text-blue-800' : ''}
                          ${isToday && !isSelected ? 'ring-2 ring-blue-600 ring-inset' : ''}
                        `}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Guests */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  <Users className="inline h-4 w-4 mr-2" />
                  Erwachsene
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                      key={num}
                      onClick={() => setAdults(num)}
                      className={`
                        aspect-square rounded-xl text-xl font-semibold transition-all
                        ${adults === num
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }
                      `}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={() => setAdults(10)}
                    className={`
                      aspect-square rounded-xl text-lg font-semibold transition-all
                      ${adults >= 10
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }
                    `}
                  >
                    9+
                  </button>
                </div>
                {adults >= 10 && (
                  <div className="mt-3 flex items-center justify-center gap-4">
                    <button
                      onClick={() => setAdults(Math.max(10, adults - 1))}
                      className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200"
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                    <span className="text-3xl font-bold w-16 text-center">{adults}</span>
                    <button
                      onClick={() => setAdults(adults + 1)}
                      className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-700">Kinder</label>
                  <button
                    onClick={() => setChildren([...children, 6])}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    Kind hinzufügen
                  </button>
                </div>

                {children.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6 bg-slate-50 rounded-xl">
                    Keine Kinder
                  </p>
                ) : (
                  <div className="space-y-3">
                    {children.map((age, index) => (
                      <div key={index} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl">
                        <span className="text-sm text-slate-600 w-16">Kind {index + 1}</span>
                        <select
                          value={age}
                          onChange={(e) => {
                            const newChildren = [...children];
                            newChildren[index] = parseInt(e.target.value);
                            setChildren(newChildren);
                          }}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        >
                          {Array.from({ length: 18 }, (_, i) => (
                            <option key={i} value={i}>
                              {i === 0 ? 'Unter 1 Jahr' : `${i} Jahre`}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => setChildren(children.filter((_, i) => i !== index))}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Room Categories */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 mb-4">
                Passende Zimmerkategorien für {adults} Erwachsene{children.length > 0 ? ` und ${children.length} Kind${children.length > 1 ? 'er' : ''}` : ''}:
              </p>

              {suitableCategories.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl">
                  <Bed className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Keine passenden Kategorien verfügbar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {suitableCategories.map(category => {
                    const isSelected = selectedCategories.includes(category.id);
                    return (
                      <button
                        key={category.id}
                        onClick={() => toggleCategory(category.id)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-slate-900">{category.name}</div>
                            <div className="text-sm text-slate-500">
                              Max. {category.maxAdults} Erw. + {category.maxChildren} Kind{category.maxChildren !== 1 ? 'er' : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-green-600 font-medium">
                              {category.available} frei
                            </span>
                            {isSelected && (
                              <div className="h-6 w-6 bg-blue-600 rounded-full flex items-center justify-center">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Contact */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <User className="inline h-4 w-4 mr-2" />
                  Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Vor- und Nachname"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Mail className="inline h-4 w-4 mr-2" />
                  E-Mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@beispiel.com"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Phone className="inline h-4 w-4 mr-2" />
                  Telefon
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+43 664 1234567"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Step 5: Booking Type (Final) */}
          {step === 5 && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-slate-900">Zusammenfassung</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Zeitraum</span>
                    <span className="text-slate-900">{formatDate(checkIn)} - {formatDate(checkOut)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gäste</span>
                    <span className="text-slate-900">{adults} Erw.{children.length > 0 ? ` + ${children.length} Kind${children.length > 1 ? 'er' : ''}` : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kategorie</span>
                    <span className="text-slate-900">
                      {selectedCategories.map(id => roomCategories.find(c => c.id === id)?.name).join(', ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gast</span>
                    <span className="text-slate-900">{name}</span>
                  </div>
                </div>
              </div>

              {/* Type Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Art der Erstellung
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setBookingType('inquiry')}
                    className={`p-5 rounded-xl border-2 transition-all ${
                      bookingType === 'inquiry'
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`text-xl font-semibold ${bookingType === 'inquiry' ? 'text-amber-600' : 'text-slate-900'}`}>
                      Anfrage
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      Angebot wird gesendet
                    </div>
                  </button>
                  <button
                    onClick={() => setBookingType('booking')}
                    className={`p-5 rounded-xl border-2 transition-all ${
                      bookingType === 'booking'
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`text-xl font-semibold ${bookingType === 'booking' ? 'text-green-600' : 'text-slate-900'}`}>
                      Buchung
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      Bestätigung wird gesendet
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200">
          {step < 5 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2) ||
                (step === 3 && !canProceedStep3) ||
                (step === 4 && !canProceedStep4)
              }
              className={`
                w-full py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2
                ${(
                  (step === 1 && canProceedStep1) ||
                  (step === 2 && canProceedStep2) ||
                  (step === 3 && canProceedStep3) ||
                  (step === 4 && canProceedStep4)
                )
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-slate-300 cursor-not-allowed'
                }
              `}
            >
              Weiter
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`
                w-full py-4 rounded-xl font-semibold text-white transition-all
                ${canSubmit
                  ? bookingType === 'inquiry'
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-green-600 hover:bg-green-700'
                  : 'bg-slate-300 cursor-not-allowed'
                }
              `}
            >
              {bookingType === 'inquiry' ? 'Anfrage erstellen' : 'Buchung erstellen'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
