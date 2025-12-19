'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Hotel,
  Send,
  CheckCircle,
  Loader2,
  AlertCircle,
  Calendar,
  Users,
  User,
  Mail,
  Phone,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Minus
} from 'lucide-react';
import { getLeadLinkById, saveLeadSubmission, LeadLink } from '@/lib/firestore';

function InquiryWizard() {
  const searchParams = useSearchParams();
  const linkId = searchParams.get('id');

  const [leadLink, setLeadLink] = useState<LeadLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wizard state
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Step 1: Dates
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [selectingDate, setSelectingDate] = useState<'checkIn' | 'checkOut'>('checkIn');
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Step 2: Guests
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState<number[]>([]);

  // Step 3: Contact
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadLink = async () => {
      if (!linkId) {
        setError('Kein Link-ID angegeben.');
        setLoading(false);
        return;
      }

      try {
        const link = await getLeadLinkById(linkId);
        if (link && link.isActive) {
          setLeadLink(link);
        } else {
          setError('Dieser Link ist nicht mehr gültig.');
        }
      } catch {
        setError('Fehler beim Laden des Formulars.');
      } finally {
        setLoading(false);
      }
    };

    loadLink();
  }, [linkId]);

  // Calendar helpers
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

  // Calculate nights
  const calculateNights = () => {
    if (!checkIn || !checkOut) return 0;
    return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Validation
  const canProceedStep1 = checkIn && checkOut;
  const canProceedStep2 = adults > 0;
  const canProceedStep3 = name.trim().length > 0 && email.trim().length > 0;

  const handleSubmit = async () => {
    if (!leadLink || !checkIn || !checkOut) return;

    setSubmitting(true);
    setError(null);

    try {
      await saveLeadSubmission({
        linkId: leadLink.id,
        linkName: leadLink.name,
        data: {
          checkIn: checkIn.toISOString().split('T')[0],
          checkOut: checkOut.toISOString().split('T')[0],
          adults: adults.toString(),
          children: children.length.toString(),
          childrenAges: children.join(','),
          name,
          email,
          phone,
          message
        },
        status: 'new'
      });
      setSubmitted(true);
    } catch {
      setError('Fehler beim Absenden. Bitte versuchen Sie es erneut.');
    } finally {
      setSubmitting(false);
    }
  };

  const monthNames = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni',
                      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

  const stepTitles = ['Reisezeitraum', 'Personenanzahl', 'Kontaktdaten', 'Zusammenfassung'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-500">Laden...</p>
        </div>
      </div>
    );
  }

  if (error && !leadLink) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Oops!</h1>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Vielen Dank!</h1>
          <p className="text-lg text-slate-600 mb-2">Ihre Anfrage wurde erfolgreich gesendet.</p>
          <p className="text-slate-500">Wir werden uns so schnell wie möglich bei Ihnen melden.</p>
          <div className="mt-8 pt-6 border-t border-green-200">
            <p className="text-sm text-green-600 font-medium">Hotel Stadler am Attersee</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="h-5 w-5 text-slate-600" />
                </button>
              )}
              <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <Hotel className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-slate-900">Hotel Stadler</h1>
                <p className="text-xs text-slate-500">{stepTitles[step - 1]}</p>
              </div>
            </div>
            <div className="text-sm text-slate-500">
              Schritt {step}/{totalSteps}
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex gap-1">
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-lg mx-auto px-4 py-6">
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
                      : checkIn ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Anreise
                  </div>
                  <div className={`font-semibold text-lg ${checkIn ? 'text-slate-900' : 'text-slate-400'}`}>
                    {checkIn ? formatDate(checkIn) : 'Wählen'}
                  </div>
                </button>
                <button
                  onClick={() => setSelectingDate('checkOut')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectingDate === 'checkOut'
                      ? 'border-blue-600 bg-blue-50'
                      : checkOut ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Abreise
                  </div>
                  <div className={`font-semibold text-lg ${checkOut ? 'text-slate-900' : 'text-slate-400'}`}>
                    {checkOut ? formatDate(checkOut) : 'Wählen'}
                  </div>
                </button>
              </div>

              {/* Nights indicator */}
              {checkIn && checkOut && (
                <div className="text-center py-2">
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {calculateNights()} {calculateNights() === 1 ? 'Nacht' : 'Nächte'}
                  </span>
                </div>
              )}

              {/* Calendar */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5 text-slate-600" />
                  </button>
                  <span className="font-semibold text-slate-900">
                    {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                  </span>
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
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
                          ${isPast ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-slate-100'}
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
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-4">
                  <Users className="h-4 w-4" />
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
                          ? 'bg-blue-600 text-white shadow-lg'
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
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }
                    `}
                  >
                    9+
                  </button>
                </div>
                {adults >= 10 && (
                  <div className="mt-4 flex items-center justify-center gap-4">
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

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
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
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
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

          {/* Step 3: Contact */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <User className="h-4 w-4" />
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
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <Mail className="h-4 w-4" />
                    E-Mail *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ihre@email.com"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <Phone className="h-4 w-4" />
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

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <MessageSquare className="h-4 w-4" />
                    Besondere Wünsche
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Haben Sie besondere Wünsche oder Fragen?"
                    rows={4}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Summary */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-900 mb-4">Ihre Anfrage</h3>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                    <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <div className="text-sm text-slate-500">Aufenthalt</div>
                      <div className="font-medium text-slate-900">
                        {formatDate(checkIn)} - {formatDate(checkOut)}
                      </div>
                      <div className="text-sm text-blue-600">
                        {calculateNights()} {calculateNights() === 1 ? 'Nacht' : 'Nächte'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <Users className="h-5 w-5 text-slate-600 mt-0.5" />
                    <div>
                      <div className="text-sm text-slate-500">Gäste</div>
                      <div className="font-medium text-slate-900">
                        {adults} Erwachsene{children.length > 0 ? ` + ${children.length} Kind${children.length > 1 ? 'er' : ''}` : ''}
                      </div>
                      {children.length > 0 && (
                        <div className="text-sm text-slate-500">
                          Alter: {children.map(age => age === 0 ? '< 1' : age).join(', ')} Jahre
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <User className="h-5 w-5 text-slate-600 mt-0.5" />
                    <div>
                      <div className="text-sm text-slate-500">Kontakt</div>
                      <div className="font-medium text-slate-900">{name}</div>
                      <div className="text-sm text-slate-600">{email}</div>
                      {phone && <div className="text-sm text-slate-600">{phone}</div>}
                    </div>
                  </div>

                  {message && (
                    <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl">
                      <MessageSquare className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <div className="text-sm text-slate-500">Ihre Nachricht</div>
                        <div className="text-sm text-slate-900">{message}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  {error}
                </div>
              )}

              <p className="text-xs text-slate-500 text-center">
                Mit dem Absenden stimmen Sie zu, dass wir Sie bezüglich Ihrer Anfrage kontaktieren dürfen.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-slate-200">
        <div className="max-w-lg mx-auto px-4 py-4">
          {step < totalSteps ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2) ||
                (step === 3 && !canProceedStep3)
              }
              className={`
                w-full py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2
                ${(
                  (step === 1 && canProceedStep1) ||
                  (step === 2 && canProceedStep2) ||
                  (step === 3 && canProceedStep3)
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
              disabled={submitting}
              className="w-full py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Anfrage senden
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InquiryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-500">Laden...</p>
        </div>
      </div>
    }>
      <InquiryWizard />
    </Suspense>
  );
}
