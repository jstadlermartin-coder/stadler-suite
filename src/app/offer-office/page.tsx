'use client';

import { useState, useMemo, useEffect } from 'react';
import { Plus, X, User, Calendar, Users, ChevronRight, ChevronLeft, MessageSquare, Link2, Mail, Phone, MapPin, Baby, Minus, Check, Send, Copy, Trash2, ExternalLink, Loader2, Settings, Euro, CalendarDays, UserCheck, BedDouble, Eye, EyeOff } from 'lucide-react';
// CustomerDetailSheet import removed - using InquiryDetailDrawer instead
import { getLeadLinks, addLeadLink, deleteLeadLink, LeadLink, LeadLinkField } from '@/lib/firestore';

// Time filter type
type TimeFilter = 'week' | 'month' | 'year' | 'all';

// Types
type InquiryStatus = 'lost' | 'lead' | 'offer' | 'booked';

interface Inquiry {
  id: string;
  status: InquiryStatus;
  customerName: string;
  email: string;
  phone?: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  childrenAges?: number[];
  selectedCategories: string[];
  notes?: string;
  createdAt: string;
  totalPrice?: number;
}

interface ChildPriceTier {
  id: string;
  ageFrom: number;
  ageTo: number;
  price: number;
}

interface RoomCategory {
  id: string;
  name: string;
  maxOccupancy: number;
  basePrice: number;
  description?: string;
}

// Kanban Column Component
function KanbanColumn({
  title,
  status,
  inquiries,
  color,
  onInquiryClick
}: {
  title: string;
  status: InquiryStatus;
  inquiries: Inquiry[];
  color: string;
  onInquiryClick: (inquiry: Inquiry) => void;
}) {
  const columnInquiries = inquiries.filter(i => i.status === status);

  // Calculate total value for column
  const totalValue = columnInquiries.reduce((sum, i) => sum + (i.totalPrice || 0), 0);

  return (
    <div className="w-full md:flex-1 md:min-w-[280px] md:max-w-[320px]">
      {/* Column Header */}
      <div className={`flex items-center gap-2 mb-4 px-2`}>
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <span className="text-sm text-slate-400 ml-auto">{columnInquiries.length}</span>
      </div>
      {totalValue > 0 && (
        <div className="px-2 mb-3">
          <span className="text-xs text-slate-400">Wert: </span>
          <span className="text-sm font-medium text-slate-600">EUR {totalValue.toLocaleString('de-DE')}</span>
        </div>
      )}

      {/* Cards */}
      <div className="space-y-2">
        {columnInquiries.map((inquiry) => (
          <button
            key={inquiry.id}
            onClick={() => onInquiryClick(inquiry)}
            className="w-full bg-white border border-slate-200 rounded-xl p-4 text-left hover:shadow-md transition-shadow"
          >
            {/* Header: Name + Anfragedatum */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-slate-500" />
                </div>
                <p className="font-medium text-slate-900 truncate">{inquiry.customerName}</p>
              </div>
              <span className="text-xs text-slate-400 flex-shrink-0">{inquiry.createdAt}</span>
            </div>

            {/* Preis */}
            {inquiry.totalPrice && inquiry.totalPrice > 0 ? (
              <div className="flex items-center gap-2 mb-2">
                <Euro className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-green-700">EUR {inquiry.totalPrice.toLocaleString('de-DE')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-2 text-slate-400">
                <Euro className="h-4 w-4" />
                <span className="text-sm">Preis ausstehend</span>
              </div>
            )}

            {/* An/Abreise */}
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <span>{inquiry.checkIn} - {inquiry.checkOut}</span>
            </div>

            {/* Personen */}
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <div className="flex items-center gap-1">
                <UserCheck className="h-4 w-4 text-slate-400" />
                <span>{inquiry.adults} Erw.</span>
              </div>
              {inquiry.children > 0 && (
                <div className="flex items-center gap-1">
                  <Baby className="h-4 w-4 text-slate-400" />
                  <span>{inquiry.children} Kind.</span>
                </div>
              )}
            </div>
          </button>
        ))}

        {columnInquiries.length === 0 && (
          <div className="text-center py-8 text-slate-300">
            <MessageSquare className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Keine Anfragen</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Booking Wizard Drawer
function BookingWizardDrawer({
  isOpen,
  onClose,
  onSubmit,
  roomCategories,
  childPriceTiers
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Inquiry, 'id' | 'createdAt'>, action: 'inquiry' | 'book') => void;
  roomCategories: RoomCategory[];
  childPriceTiers: ChildPriceTier[];
}) {
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  // Step 1: Dates
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectingDate, setSelectingDate] = useState<'checkIn' | 'checkOut'>('checkIn');

  // Step 2: Guests
  const [adults, setAdults] = useState(2);
  const [childrenByTier, setChildrenByTier] = useState<Record<string, number>>({});

  // Step 3: Room selection
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Step 4: Personal data
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');

  // Calculate nights
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const diff = checkOut.getTime() - checkIn.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [checkIn, checkOut]);

  // Calculate total children
  const totalChildren = useMemo(() => {
    return Object.values(childrenByTier).reduce((sum, count) => sum + count, 0);
  }, [childrenByTier]);

  // Calculate price
  const calculatePrice = useMemo(() => {
    if (selectedCategories.length === 0 || nights === 0) return { perRoom: 0, total: 0 };

    let total = 0;
    const selectedRooms = roomCategories.filter(c => selectedCategories.includes(c.id));

    selectedRooms.forEach(room => {
      // Base price for adults
      total += room.basePrice * nights * adults;

      // Add children prices
      Object.entries(childrenByTier).forEach(([tierId, count]) => {
        const tier = childPriceTiers.find(t => t.id === tierId);
        if (tier && count > 0) {
          total += tier.price * nights * count;
        }
      });
    });

    return {
      perRoom: selectedRooms.length > 0 ? total / selectedRooms.length : 0,
      total
    };
  }, [selectedCategories, nights, adults, childrenByTier, roomCategories, childPriceTiers]);

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday = 0

    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const handleDateClick = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return;

    if (selectingDate === 'checkIn') {
      setCheckIn(date);
      if (checkOut && date >= checkOut) {
        setCheckOut(null);
      }
      setSelectingDate('checkOut');
    } else {
      if (checkIn && date > checkIn) {
        setCheckOut(date);
      }
    }
  };

  const isDateInRange = (date: Date) => {
    if (!checkIn || !checkOut) return false;
    return date > checkIn && date < checkOut;
  };

  const isDateSelected = (date: Date) => {
    if (checkIn && date.toDateString() === checkIn.toDateString()) return 'checkIn';
    if (checkOut && date.toDateString() === checkOut.toDateString()) return 'checkOut';
    return null;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleSubmit = (action: 'inquiry' | 'book') => {
    if (!checkIn || !checkOut || !name.trim() || !email.trim()) return;

    // Convert childrenByTier to childrenAges array
    const childrenAges: number[] = [];
    Object.entries(childrenByTier).forEach(([tierId, count]) => {
      const tier = childPriceTiers.find(t => t.id === tierId);
      if (tier) {
        for (let i = 0; i < count; i++) {
          childrenAges.push(tier.ageFrom);
        }
      }
    });

    onSubmit({
      status: action === 'book' ? 'booked' : 'lead',
      customerName: name,
      email,
      phone: phone || undefined,
      checkIn: formatDate(checkIn),
      checkOut: formatDate(checkOut),
      adults,
      children: totalChildren,
      childrenAges: childrenAges.length > 0 ? childrenAges : undefined,
      selectedCategories,
      notes: notes.trim() || undefined,
      totalPrice: calculatePrice.total
    }, action);

    // Reset form
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setStep(1);
    setCheckIn(null);
    setCheckOut(null);
    setAdults(2);
    setChildrenByTier({});
    setSelectedCategories([]);
    setName('');
    setEmail('');
    setPhone('');
    setStreet('');
    setCity('');
    setNotes('');
    setSelectingDate('checkIn');
  };

  const canProceed = () => {
    switch (step) {
      case 1: return checkIn && checkOut;
      case 2: return adults > 0;
      case 3: return selectedCategories.length > 0;
      case 4: return name.trim() && email.trim();
      default: return true;
    }
  };

  const totalGuests = adults + totalChildren;
  const availableCategories = roomCategories.filter(c => c.maxOccupancy >= totalGuests);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      )}
      <div
        className={`
          fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl z-50
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Neue Buchung</h2>
            <p className="text-sm text-slate-500">Schritt {step} von {totalSteps}</p>
          </div>
          <button onClick={() => { resetForm(); onClose(); }} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-slate-50">
          <div className="flex gap-2">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  i + 1 <= step ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6" style={{ height: 'calc(100% - 200px)' }}>
          {/* Step 1: Date Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Reisezeitraum wählen</h3>
                <p className="text-sm text-slate-500">Klicke auf den Kalender um An- und Abreise festzulegen</p>
              </div>

              {/* Date Selection Boxes */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSelectingDate('checkIn')}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectingDate === 'checkIn'
                      ? 'border-blue-500 bg-blue-50'
                      : checkIn
                      ? 'border-green-300 bg-green-50'
                      : 'border-slate-200'
                  }`}
                >
                  <p className="text-xs text-slate-500 mb-1">Anreise</p>
                  <p className="font-semibold text-slate-900">
                    {checkIn ? formatDate(checkIn) : 'Auswählen...'}
                  </p>
                </button>
                <button
                  onClick={() => setSelectingDate('checkOut')}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectingDate === 'checkOut'
                      ? 'border-blue-500 bg-blue-50'
                      : checkOut
                      ? 'border-green-300 bg-green-50'
                      : 'border-slate-200'
                  }`}
                >
                  <p className="text-xs text-slate-500 mb-1">Abreise</p>
                  <p className="font-semibold text-slate-900">
                    {checkOut ? formatDate(checkOut) : 'Auswählen...'}
                  </p>
                </button>
              </div>

              {nights > 0 && (
                <div className="text-center py-2 bg-blue-50 rounded-lg">
                  <span className="text-blue-700 font-medium">{nights} {nights === 1 ? 'Nacht' : 'Nächte'}</span>
                </div>
              )}

              {/* Large Calendar */}
              <div className="bg-slate-50 rounded-xl p-4">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                    className="p-2 hover:bg-slate-200 rounded-lg"
                  >
                    <ChevronLeft className="h-5 w-5 text-slate-600" />
                  </button>
                  <h4 className="font-semibold text-slate-900">
                    {calendarMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                  </h4>
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                    className="p-2 hover:bg-slate-200 rounded-lg"
                  >
                    <ChevronRight className="h-5 w-5 text-slate-600" />
                  </button>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth(calendarMonth).map((date, index) => {
                    if (!date) {
                      return <div key={index} className="h-10" />;
                    }

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isPast = date < today;
                    const selected = isDateSelected(date);
                    const inRange = isDateInRange(date);

                    return (
                      <button
                        key={index}
                        onClick={() => handleDateClick(date)}
                        disabled={isPast}
                        className={`
                          h-10 rounded-lg text-sm font-medium transition-all
                          ${isPast ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-slate-200'}
                          ${selected === 'checkIn' ? 'bg-blue-600 text-white' : ''}
                          ${selected === 'checkOut' ? 'bg-blue-600 text-white' : ''}
                          ${inRange ? 'bg-blue-100 text-blue-700' : ''}
                          ${!selected && !inRange && !isPast ? 'text-slate-900' : ''}
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

          {/* Step 2: Guest Selection */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Gäste auswählen</h3>
                <p className="text-sm text-slate-500">Wie viele Personen reisen?</p>
              </div>

              {/* Adults */}
              <div className="bg-slate-50 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Erwachsene</p>
                      <p className="text-sm text-slate-500">Ab 18 Jahre</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setAdults(Math.max(1, adults - 1))}
                      className="h-10 w-10 rounded-full bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center"
                    >
                      <Minus className="h-4 w-4 text-slate-600" />
                    </button>
                    <span className="text-2xl font-bold text-slate-900 w-8 text-center">{adults}</span>
                    <button
                      onClick={() => setAdults(adults + 1)}
                      className="h-10 w-10 rounded-full bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center"
                    >
                      <Plus className="h-4 w-4 text-slate-600" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Children by Age Tier */}
              <div>
                <h4 className="font-medium text-slate-700 mb-3">Kinder</h4>
                <div className="space-y-3">
                  {childPriceTiers.map((tier) => (
                    <div key={tier.id} className="bg-slate-50 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                            <Baby className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {tier.ageFrom === 0 ? 'Baby' : 'Kind'} {tier.ageFrom}-{tier.ageTo} Jahre
                            </p>
                            <p className="text-sm text-slate-500">EUR {tier.price}/Nacht</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setChildrenByTier({
                              ...childrenByTier,
                              [tier.id]: Math.max(0, (childrenByTier[tier.id] || 0) - 1)
                            })}
                            className="h-9 w-9 rounded-full bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center"
                          >
                            <Minus className="h-4 w-4 text-slate-600" />
                          </button>
                          <span className="text-xl font-bold text-slate-900 w-6 text-center">
                            {childrenByTier[tier.id] || 0}
                          </span>
                          <button
                            onClick={() => setChildrenByTier({
                              ...childrenByTier,
                              [tier.id]: (childrenByTier[tier.id] || 0) + 1
                            })}
                            className="h-9 w-9 rounded-full bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center"
                          >
                            <Plus className="h-4 w-4 text-slate-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <span className="text-blue-700 font-medium">
                  Gesamt: {adults} Erwachsene{totalChildren > 0 ? `, ${totalChildren} Kinder` : ''}
                </span>
              </div>
            </div>
          )}

          {/* Step 3: Room Selection */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Zimmerkategorie wählen</h3>
                <p className="text-sm text-slate-500">Passend für {totalGuests} Gäste - wähle bis zu 2 Kategorien</p>
              </div>

              {availableCategories.length > 0 ? (
                <div className="space-y-3">
                  {availableCategories.map((category) => {
                    const isSelected = selectedCategories.includes(category.id);
                    return (
                      <button
                        key={category.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedCategories(selectedCategories.filter(c => c !== category.id));
                          } else if (selectedCategories.length < 2) {
                            setSelectedCategories([...selectedCategories, category.id]);
                          }
                        }}
                        className={`
                          w-full p-5 rounded-xl text-left transition-all border-2
                          ${isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">{category.name}</p>
                            <p className="text-sm text-slate-500">
                              Max. {category.maxOccupancy} Personen
                            </p>
                            {category.description && (
                              <p className="text-sm text-slate-400 mt-1">{category.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900">EUR {category.basePrice}</p>
                            <p className="text-xs text-slate-500">pro Nacht/Person</p>
                            {isSelected && (
                              <div className="mt-2 h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center ml-auto">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-orange-50 rounded-xl p-6 text-center">
                  <p className="text-orange-700 font-medium">
                    Keine Kategorie für {totalGuests} Gäste verfügbar
                  </p>
                  <p className="text-sm text-orange-600 mt-1">
                    Bitte reduziere die Gästeanzahl
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Personal Data */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Persönliche Daten</h3>
                <p className="text-sm text-slate-500">Kontaktdaten des Gastes eingeben</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Vor- und Nachname"
                      className="w-full pl-12 pr-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">E-Mail *</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@beispiel.com"
                      className="w-full pl-12 pr-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Telefon</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+43 664 1234567"
                      className="w-full pl-12 pr-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Adresse</label>
                  <div className="space-y-3">
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        type="text"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="Straße und Hausnummer"
                        className="w-full pl-12 pr-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="PLZ und Ort"
                      className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Besondere Wünsche</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anmerkungen, Wünsche..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Summary */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Zusammenfassung</h3>
                <p className="text-sm text-slate-500">Überprüfe die Buchungsdetails</p>
              </div>

              {/* Guest Info */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h4 className="font-medium text-slate-700 mb-3">Gast</h4>
                <p className="font-semibold text-slate-900">{name}</p>
                <p className="text-sm text-slate-500">{email}</p>
                {phone && <p className="text-sm text-slate-500">{phone}</p>}
              </div>

              {/* Stay Info */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h4 className="font-medium text-slate-700 mb-3">Aufenthalt</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Anreise</p>
                    <p className="font-semibold text-slate-900">{formatDate(checkIn)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Abreise</p>
                    <p className="font-semibold text-slate-900">{formatDate(checkOut)}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-sm text-slate-600">
                    {nights} {nights === 1 ? 'Nacht' : 'Nächte'} • {adults} Erwachsene{totalChildren > 0 ? ` • ${totalChildren} Kinder` : ''}
                  </p>
                </div>
              </div>

              {/* Room Info */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h4 className="font-medium text-slate-700 mb-3">Zimmerkategorie</h4>
                {selectedCategories.map((catId) => {
                  const cat = roomCategories.find(c => c.id === catId);
                  return cat ? (
                    <div key={catId} className="flex items-center justify-between py-2">
                      <span className="font-medium text-slate-900">{cat.name}</span>
                      <span className="text-slate-600">EUR {cat.basePrice}/Nacht</span>
                    </div>
                  ) : null;
                })}
              </div>

              {/* Price Summary */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-medium text-blue-700 mb-3">Preisübersicht</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">{nights} Nächte × {adults} Erwachsene</span>
                    <span className="text-slate-900">EUR {(roomCategories.find(c => selectedCategories.includes(c.id))?.basePrice || 0) * nights * adults}</span>
                  </div>
                  {Object.entries(childrenByTier).map(([tierId, count]) => {
                    if (count === 0) return null;
                    const tier = childPriceTiers.find(t => t.id === tierId);
                    return tier ? (
                      <div key={tierId} className="flex items-center justify-between">
                        <span className="text-slate-600">{count}× Kind ({tier.ageFrom}-{tier.ageTo}J)</span>
                        <span className="text-slate-900">EUR {tier.price * nights * count}</span>
                      </div>
                    ) : null;
                  })}
                  <div className="pt-3 mt-3 border-t border-blue-200 flex items-center justify-between">
                    <span className="font-bold text-blue-900">Gesamtpreis</span>
                    <span className="text-2xl font-bold text-blue-900">EUR {calculatePrice.total}</span>
                  </div>
                </div>
              </div>

              {notes && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <h4 className="font-medium text-slate-700 mb-2">Besondere Wünsche</h4>
                  <p className="text-slate-600">{notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-100 bg-white">
          {step < totalSteps ? (
            <div className="flex gap-3">
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex-1 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50"
                >
                  Zurück
                </button>
              )}
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Weiter
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => handleSubmit('book')}
                className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Check className="h-5 w-5" />
                Jetzt buchen
              </button>
              <button
                onClick={() => handleSubmit('inquiry')}
                className="w-full py-3 border-2 border-blue-600 text-blue-600 rounded-xl font-medium hover:bg-blue-50 flex items-center justify-center gap-2"
              >
                <Send className="h-5 w-5" />
                Anfrage senden
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Inquiry Detail Drawer - shows inquiry details with room suggestions
function InquiryDetailDrawer({
  isOpen,
  onClose,
  inquiry,
  roomCategories,
  onStatusChange
}: {
  isOpen: boolean;
  onClose: () => void;
  inquiry: Inquiry | null;
  roomCategories: RoomCategory[];
  onStatusChange: (id: string, status: InquiryStatus) => void;
}) {
  const [activeTab, setActiveTab] = useState<'details' | 'rooms'>('details');
  const [showAllRooms, setShowAllRooms] = useState(false);

  if (!inquiry) return null;

  const totalGuests = inquiry.adults + inquiry.children;

  // Filter rooms based on guest count
  const availableRooms = showAllRooms
    ? roomCategories
    : roomCategories.filter(room => room.maxOccupancy >= totalGuests);

  // Calculate nights
  const calculateNights = () => {
    const parseDate = (dateStr: string) => {
      const [day, month, year] = dateStr.split('.').map(Number);
      return new Date(year, month - 1, day);
    };
    const checkIn = parseDate(inquiry.checkIn);
    const checkOut = parseDate(inquiry.checkOut);
    return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  };

  const nights = calculateNights();

  // Status options
  const statusOptions: { value: InquiryStatus; label: string; color: string }[] = [
    { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-700' },
    { value: 'lead', label: 'Lead', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'offer', label: 'Offer', color: 'bg-blue-100 text-blue-700' },
    { value: 'booked', label: 'Booked', color: 'bg-green-100 text-green-700' },
  ];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      )}
      <div
        className={`
          fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{inquiry.customerName}</h2>
              <p className="text-sm text-slate-500">{inquiry.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="px-6 py-4 border-b border-slate-100">
          <label className="block text-xs text-slate-500 mb-2">Status</label>
          <div className="flex gap-2">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onStatusChange(inquiry.id, option.value)}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${inquiry.status === option.value
                    ? option.color
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'details'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Anfrage-Details
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'rooms'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Zimmervorschläge
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6" style={{ height: 'calc(100% - 280px)' }}>
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* Inquiry Date */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-3 text-slate-400 mb-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase">Anfragedatum</span>
                </div>
                <p className="text-slate-900 font-medium">{inquiry.createdAt}</p>
              </div>

              {/* Stay Period */}
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-center gap-3 text-blue-600 mb-3">
                  <CalendarDays className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase">Aufenthalt</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Anreise</p>
                    <p className="text-lg font-semibold text-slate-900">{inquiry.checkIn}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Abreise</p>
                    <p className="text-lg font-semibold text-slate-900">{inquiry.checkOut}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-200 text-center">
                  <span className="text-blue-700 font-medium">{nights} {nights === 1 ? 'Nacht' : 'Nächte'}</span>
                </div>
              </div>

              {/* Guests */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-3 text-slate-400 mb-3">
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase">Gäste</span>
                </div>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-blue-600" />
                    <span className="text-slate-900 font-medium">{inquiry.adults} Erwachsene</span>
                  </div>
                  {inquiry.children > 0 && (
                    <div className="flex items-center gap-2">
                      <Baby className="h-5 w-5 text-amber-500" />
                      <span className="text-slate-900 font-medium">{inquiry.children} Kinder</span>
                      {inquiry.childrenAges && inquiry.childrenAges.length > 0 && (
                        <span className="text-slate-400 text-sm">
                          ({inquiry.childrenAges.join(', ')} J.)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Contact */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-3 text-slate-400 mb-3">
                  <Mail className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase">Kontakt</span>
                </div>
                <div className="space-y-2">
                  <a href={`mailto:${inquiry.email}`} className="flex items-center gap-2 text-slate-900 hover:text-blue-600">
                    <Mail className="h-4 w-4 text-slate-400" />
                    {inquiry.email}
                  </a>
                  {inquiry.phone && (
                    <a href={`tel:${inquiry.phone}`} className="flex items-center gap-2 text-slate-900 hover:text-blue-600">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {inquiry.phone}
                    </a>
                  )}
                </div>
              </div>

              {/* Price */}
              {inquiry.totalPrice && inquiry.totalPrice > 0 && (
                <div className="bg-green-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 text-green-600 mb-2">
                    <Euro className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Geschätzter Preis</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">EUR {inquiry.totalPrice.toLocaleString('de-DE')}</p>
                </div>
              )}

              {/* Notes */}
              {inquiry.notes && (
                <div className="bg-amber-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 text-amber-600 mb-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Besondere Wünsche</span>
                  </div>
                  <p className="text-slate-700">{inquiry.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Rooms Tab */}
          {activeTab === 'rooms' && (
            <div className="space-y-4">
              {/* Toggle: Show All Rooms */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-sm text-slate-700">
                  {showAllRooms ? 'Alle Zimmer anzeigen' : `Zimmer für ${totalGuests} Gäste`}
                </span>
                <button
                  onClick={() => setShowAllRooms(!showAllRooms)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    showAllRooms
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {showAllRooms ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {showAllRooms ? 'Alle' : 'Passend'}
                </button>
              </div>

              {/* Room Categories */}
              {availableRooms.length === 0 ? (
                <div className="text-center py-8">
                  <BedDouble className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500">Keine passenden Zimmer</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Versuche &quot;Alle anzeigen&quot; um alle Kategorien zu sehen
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableRooms.map((room) => {
                    const fitsGuests = room.maxOccupancy >= totalGuests;
                    const estimatedPrice = room.basePrice * nights * inquiry.adults;

                    return (
                      <div
                        key={room.id}
                        className={`p-4 rounded-xl border-2 transition-colors ${
                          fitsGuests
                            ? 'border-green-200 bg-green-50'
                            : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <BedDouble className={`h-5 w-5 ${fitsGuests ? 'text-green-600' : 'text-slate-400'}`} />
                              <h4 className="font-semibold text-slate-900">{room.name}</h4>
                            </div>
                            {room.description && (
                              <p className="text-sm text-slate-500 mt-1">{room.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className={`${fitsGuests ? 'text-green-700' : 'text-slate-500'}`}>
                                Max. {room.maxOccupancy} Pers.
                              </span>
                              <span className="text-slate-500">
                                EUR {room.basePrice}/Nacht/Pers.
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-400">Geschätzt</p>
                            <p className={`text-lg font-bold ${fitsGuests ? 'text-green-700' : 'text-slate-600'}`}>
                              EUR {estimatedPrice.toLocaleString('de-DE')}
                            </p>
                            {fitsGuests && (
                              <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-green-200 text-green-800">
                                Passend
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Info */}
              <div className="p-3 bg-blue-50 rounded-xl text-center">
                <p className="text-xs text-blue-600">
                  Preise sind geschätzt basierend auf {nights} Nächte × {inquiry.adults} Erwachsene
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-100 bg-white">
          <div className="flex gap-3">
            <button className="flex-1 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 flex items-center justify-center gap-2">
              <Mail className="h-4 w-4" />
              E-Mail senden
            </button>
            <button className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 flex items-center justify-center gap-2">
              <Check className="h-4 w-4" />
              Angebot erstellen
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Settings Drawer for Offer Office
function SettingsDrawer({
  isOpen,
  onClose,
  leadLinks,
  onCreateLink,
  onDeleteLink,
  loading
}: {
  isOpen: boolean;
  onClose: () => void;
  leadLinks: LeadLink[];
  onCreateLink: (name: string, fields: LeadLinkField[]) => Promise<void>;
  onDeleteLink: (id: string) => Promise<void>;
  loading: boolean;
}) {
  const [activeTab, setActiveTab] = useState<'leads' | 'notifications' | 'templates'>('leads');
  const [view, setView] = useState<'list' | 'create'>('list');
  const [linkName, setLinkName] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Field toggles
  const [fields, setFields] = useState<Record<string, { enabled: boolean; required: boolean }>>({
    name: { enabled: true, required: true },
    email: { enabled: true, required: true },
    phone: { enabled: true, required: false },
    dates: { enabled: true, required: false },
    guests: { enabled: true, required: false },
    message: { enabled: true, required: false },
  });

  const fieldConfig: { type: LeadLinkField['type']; label: string; icon: React.ReactNode }[] = [
    { type: 'name', label: 'Name', icon: <User className="h-4 w-4" /> },
    { type: 'email', label: 'E-Mail', icon: <Mail className="h-4 w-4" /> },
    { type: 'phone', label: 'Telefon', icon: <Phone className="h-4 w-4" /> },
    { type: 'dates', label: 'Reisedatum', icon: <Calendar className="h-4 w-4" /> },
    { type: 'guests', label: 'Personenanzahl', icon: <Users className="h-4 w-4" /> },
    { type: 'message', label: 'Nachricht', icon: <MessageSquare className="h-4 w-4" /> },
  ];

  const toggleField = (type: string) => {
    setFields(prev => ({
      ...prev,
      [type]: { ...prev[type], enabled: !prev[type].enabled }
    }));
  };

  const toggleRequired = (type: string) => {
    if (!fields[type].enabled) return;
    setFields(prev => ({
      ...prev,
      [type]: { ...prev[type], required: !prev[type].required }
    }));
  };

  const handleCreate = async () => {
    if (!linkName.trim()) return;

    setCreating(true);

    const selectedFields: LeadLinkField[] = fieldConfig
      .filter(f => fields[f.type].enabled)
      .map(f => ({
        id: f.type,
        type: f.type,
        required: fields[f.type].required,
        label: f.label
      }));

    await onCreateLink(linkName, selectedFields);

    setLinkName('');
    setView('list');
    setCreating(false);
  };

  const copyLink = async (id: string) => {
    const url = `${window.location.origin}/inquiry?id=${id}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Settings className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Einstellungen</h2>
              <p className="text-sm text-slate-500">Offer Office konfigurieren</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => { setActiveTab('leads'); setView('list'); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'leads'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Lead Links
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'notifications'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Benachrichtigungen
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'templates'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Vorlagen
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Lead Links Tab */}
          {activeTab === 'leads' && (
            <>
              {view === 'list' ? (
                <>
                  {/* Create Button */}
                  <button
                    onClick={() => setView('create')}
                    className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors mb-6"
                  >
                    <Plus className="h-5 w-5" />
                    Neuen Link erstellen
                  </button>

                  {/* Existing Links */}
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                    </div>
                  ) : leadLinks.length === 0 ? (
                    <div className="text-center py-12">
                      <Link2 className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-500">Noch keine Links erstellt</p>
                      <p className="text-sm text-slate-400 mt-1">Erstelle deinen ersten Anfrage-Link</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {leadLinks.map((link) => (
                        <div
                          key={link.id}
                          className="p-4 bg-slate-50 rounded-xl"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-medium text-slate-900">{link.name}</h3>
                              <p className="text-xs text-slate-500 mt-1">
                                {link.fields.length} Felder • Erstellt {new Date(link.createdAt).toLocaleDateString('de-DE')}
                              </p>
                            </div>
                            <div className={`px-2 py-0.5 rounded-full text-xs ${link.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                              {link.isActive ? 'Aktiv' : 'Inaktiv'}
                            </div>
                          </div>

                          {/* Link Actions */}
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => copyLink(link.id)}
                              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                                copiedId === link.id
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              }`}
                            >
                              {copiedId === link.id ? (
                                <>
                                  <Check className="h-4 w-4" />
                                  Kopiert!
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4" />
                                  Link kopieren
                                </>
                              )}
                            </button>
                            <a
                              href={`/inquiry?id=${link.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                            <button
                              onClick={() => onDeleteLink(link.id)}
                              className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Create Form */}
                  <button
                    onClick={() => setView('list')}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Zurück zur Liste
                  </button>

                  <div className="space-y-6">
                    {/* Link Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Link Name</label>
                      <input
                        type="text"
                        value={linkName}
                        onChange={(e) => setLinkName(e.target.value)}
                        placeholder="z.B. Instagram Sommer 2025"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-slate-400 mt-1">Zur internen Identifizierung</p>
                    </div>

                    {/* Field Selection */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-3">Felder auswählen</label>
                      <div className="space-y-2">
                        {fieldConfig.map((field) => (
                          <div
                            key={field.type}
                            className={`p-3 rounded-xl border transition-colors ${
                              fields[field.type].enabled
                                ? 'bg-blue-50 border-blue-200'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => toggleField(field.type)}
                                className="flex items-center gap-3"
                              >
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                                  fields[field.type].enabled ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'
                                }`}>
                                  {field.icon}
                                </div>
                                <span className={`font-medium ${fields[field.type].enabled ? 'text-slate-900' : 'text-slate-400'}`}>
                                  {field.label}
                                </span>
                              </button>

                              {fields[field.type].enabled && (
                                <button
                                  onClick={() => toggleRequired(field.type)}
                                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                    fields[field.type].required
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                                  }`}
                                >
                                  {fields[field.type].required ? 'Pflicht' : 'Optional'}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500">Benachrichtigungseinstellungen</p>
                <p className="text-sm text-slate-400 mt-1">Bald verfügbar</p>
              </div>
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500">E-Mail & WhatsApp Vorlagen</p>
                <p className="text-sm text-slate-400 mt-1">Bald verfügbar</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'leads' && view === 'create' && (
          <div className="p-6 border-t border-slate-200 bg-white">
            <button
              onClick={handleCreate}
              disabled={!linkName.trim() || creating || Object.values(fields).every(f => !f.enabled)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Link2 className="h-5 w-5" />
                  Link erstellen
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default function OfferOfficePage() {
  const [bookingDrawerOpen, setBookingDrawerOpen] = useState(false);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [leadLinks, setLeadLinks] = useState<LeadLink[]>([]);
  const [leadLinksLoading, setLeadLinksLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [cdsOpen, setCdsOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [inquiryDetailOpen, setInquiryDetailOpen] = useState(false);

  // Demo Zimmerkategorien
  const roomCategories: RoomCategory[] = [
    { id: '1', name: 'Doppelzimmer Seeblick', maxOccupancy: 3, basePrice: 85, description: 'Mit Balkon und Seeblick' },
    { id: '2', name: 'Suite', maxOccupancy: 4, basePrice: 145, description: 'Geräumige Suite mit Wohnbereich' },
    { id: '3', name: 'Einzelzimmer', maxOccupancy: 1, basePrice: 65 },
    { id: '4', name: 'Familienzimmer', maxOccupancy: 6, basePrice: 95, description: 'Ideal für Familien' },
  ];

  // Child price tiers (should come from settings)
  const childPriceTiers: ChildPriceTier[] = [
    { id: 'baby', ageFrom: 0, ageTo: 2, price: 0 },
    { id: 'child1', ageFrom: 3, ageTo: 5, price: 15 },
    { id: 'child2', ageFrom: 6, ageTo: 12, price: 30 },
    { id: 'teen', ageFrom: 13, ageTo: 17, price: 45 },
  ];

  // Load lead links
  useEffect(() => {
    const loadLeadLinks = async () => {
      const links = await getLeadLinks();
      setLeadLinks(links);
      setLeadLinksLoading(false);
    };
    loadLeadLinks();
  }, []);

  const handleCreateLeadLink = async (name: string, fields: LeadLinkField[]) => {
    const linkId = await addLeadLink({ name, fields, isActive: true });
    if (linkId) {
      const links = await getLeadLinks();
      setLeadLinks(links);
    }
  };

  const handleDeleteLeadLink = async (id: string) => {
    await deleteLeadLink(id);
    setLeadLinks(leadLinks.filter(l => l.id !== id));
  };

  // Demo Anfragen
  const [inquiries, setInquiries] = useState<Inquiry[]>([
    {
      id: '1',
      status: 'lead',
      customerName: 'Max Mustermann',
      email: 'max.mustermann@example.com',
      phone: '+43 664 1234567',
      checkIn: '15.02.2025',
      checkOut: '18.02.2025',
      adults: 2,
      children: 0,
      selectedCategories: ['1'],
      createdAt: '10.01.2025',
      totalPrice: 510
    },
    {
      id: '2',
      status: 'offer',
      customerName: 'Maria Musterfrau',
      email: 'maria@example.com',
      checkIn: '20.03.2025',
      checkOut: '25.03.2025',
      adults: 2,
      children: 2,
      childrenAges: [5, 8],
      selectedCategories: ['4'],
      notes: 'Kinderbetten gewünscht',
      createdAt: '08.01.2025',
      totalPrice: 665
    },
    {
      id: '3',
      status: 'booked',
      customerName: 'Hans Huber',
      email: 'hans.huber@gmx.at',
      phone: '+43 660 9876543',
      checkIn: '01.02.2025',
      checkOut: '05.02.2025',
      adults: 1,
      children: 0,
      selectedCategories: ['3'],
      createdAt: '05.01.2025',
      totalPrice: 260
    },
    {
      id: '4',
      status: 'lost',
      customerName: 'Anna Schmidt',
      email: 'anna.schmidt@web.de',
      checkIn: '10.01.2025',
      checkOut: '12.01.2025',
      adults: 2,
      children: 0,
      selectedCategories: ['1'],
      createdAt: '01.01.2025',
      totalPrice: 170
    }
  ]);

  // Filter inquiries by time
  const filteredInquiries = useMemo(() => {
    if (timeFilter === 'all') return inquiries;

    const now = new Date();
    const parseDate = (dateStr: string) => {
      const [day, month, year] = dateStr.split('.').map(Number);
      return new Date(year, month - 1, day);
    };

    return inquiries.filter(inquiry => {
      const createdDate = parseDate(inquiry.createdAt);
      const diffDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

      switch (timeFilter) {
        case 'week':
          return diffDays <= 7;
        case 'month':
          return diffDays <= 30;
        case 'year':
          return diffDays <= 365;
        default:
          return true;
      }
    });
  }, [inquiries, timeFilter]);

  const handleCreateBooking = (data: Omit<Inquiry, 'id' | 'createdAt'>, action: 'inquiry' | 'book') => {
    const newInquiry: Inquiry = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date().toLocaleDateString('de-DE')
    };
    setInquiries([newInquiry, ...inquiries]);

    // Here you would send email/WhatsApp notification
    if (action === 'book') {
      console.log('Sending booking confirmation...');
      // TODO: Send confirmation email/WhatsApp
    } else {
      console.log('Sending inquiry/offer...');
      // TODO: Send offer email/WhatsApp
    }
  };

  const handleStatusChange = (id: string, status: InquiryStatus) => {
    setInquiries(inquiries.map(i => i.id === id ? { ...i, status } : i));
  };

  const handleInquiryClick = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setCdsOpen(true);
  };

  const columns: { status: InquiryStatus; title: string; color: string }[] = [
    { status: 'lost', title: 'Lost', color: 'bg-red-500' },
    { status: 'lead', title: 'Lead', color: 'bg-yellow-500' },
    { status: 'offer', title: 'Offer', color: 'bg-blue-500' },
    { status: 'booked', title: 'Booked', color: 'bg-green-500' },
  ];

  return (
    <div className="h-[calc(100vh-60px)] flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Offer Office</h1>
            <p className="text-sm text-slate-500">Anfragen und Buchungen verwalten</p>
          </div>
          <button
            onClick={() => setSettingsDrawerOpen(true)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Einstellungen"
          >
            <Settings className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Time Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 mr-2">Zeitraum:</span>
          {(['all', 'week', 'month', 'year'] as TimeFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                timeFilter === filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filter === 'all' ? 'Alle' : filter === 'week' ? 'Woche' : filter === 'month' ? 'Monat' : 'Jahr'}
            </button>
          ))}
          <span className="ml-4 text-sm text-slate-400">
            {filteredInquiries.length} Anfragen
          </span>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex flex-col md:flex-row gap-4 h-full md:justify-center md:items-start">
          {columns.map((column) => (
            <KanbanColumn
              key={column.status}
              title={column.title}
              status={column.status}
              inquiries={filteredInquiries}
              color={column.color}
              onInquiryClick={handleInquiryClick}
            />
          ))}
        </div>
      </div>

      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={settingsDrawerOpen}
        onClose={() => setSettingsDrawerOpen(false)}
        leadLinks={leadLinks}
        onCreateLink={handleCreateLeadLink}
        onDeleteLink={handleDeleteLeadLink}
        loading={leadLinksLoading}
      />

      {/* Inquiry Detail Drawer */}
      <InquiryDetailDrawer
        isOpen={cdsOpen}
        onClose={() => {
          setCdsOpen(false);
          setSelectedInquiry(null);
        }}
        inquiry={selectedInquiry}
        roomCategories={roomCategories}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
