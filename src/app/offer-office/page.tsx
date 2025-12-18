'use client';

import { useState } from 'react';
import { Plus, X, User, Mail, Phone, Calendar, Users, Baby, MessageSquare, ChevronRight, GripVertical } from 'lucide-react';

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

  return (
    <div className="flex-1 min-w-[280px] max-w-[320px]">
      {/* Column Header */}
      <div className={`flex items-center gap-2 mb-4 px-2`}>
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <span className="text-sm text-slate-400 ml-auto">{columnInquiries.length}</span>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {columnInquiries.map((inquiry) => (
          <button
            key={inquiry.id}
            onClick={() => onInquiryClick(inquiry)}
            className="w-full bg-white border border-slate-200 rounded-xl p-4 text-left hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{inquiry.customerName}</p>
                <p className="text-sm text-slate-500 truncate">{inquiry.email}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
              <span>{inquiry.checkIn} - {inquiry.checkOut}</span>
              <span>{inquiry.adults + inquiry.children} Gäste</span>
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

// Lead Form Drawer
function LeadFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  roomCategories
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Inquiry, 'id' | 'status' | 'createdAt'>) => void;
  roomCategories: { id: string; name: string; maxOccupancy: number }[];
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [childrenAges, setChildrenAges] = useState<number[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Update children ages when count changes
  const handleChildrenChange = (count: number) => {
    setChildren(count);
    if (count > childrenAges.length) {
      setChildrenAges([...childrenAges, ...Array(count - childrenAges.length).fill(0)]);
    } else {
      setChildrenAges(childrenAges.slice(0, count));
    }
  };

  const handleSubmit = () => {
    if (!name.trim() || !email.trim() || !checkIn || !checkOut) return;

    onSubmit({
      customerName: name,
      email,
      phone,
      checkIn,
      checkOut,
      adults,
      children,
      childrenAges: children > 0 ? childrenAges : undefined,
      selectedCategories,
      notes: notes.trim() || undefined
    });

    // Reset form
    setName('');
    setEmail('');
    setPhone('');
    setCheckIn('');
    setCheckOut('');
    setAdults(2);
    setChildren(0);
    setChildrenAges([]);
    setSelectedCategories([]);
    setNotes('');
    onClose();
  };

  // Filter categories that fit the guest count
  const totalGuests = adults + children;
  const availableCategories = roomCategories.filter(c => c.maxOccupancy >= totalGuests);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      )}
      <div
        className={`
          fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50
          transform transition-transform duration-300 ease-out overflow-auto
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Neue Anfrage</h2>
            <p className="text-sm text-slate-500">Lead-Formular erstellen</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6 pb-32">
          {/* Kontaktdaten */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Kontaktdaten
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name *"
                className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-Mail *"
                className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Telefon"
                className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Reisezeitraum */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Reisezeitraum
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Anreise *</label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Abreise *</label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  min={checkIn}
                  className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Gäste */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Gäste
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Erwachsene</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setAdults(Math.max(1, adults - 1))}
                    className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="text-xl font-semibold w-8 text-center">{adults}</span>
                  <button
                    onClick={() => setAdults(adults + 1)}
                    className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Kinder</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleChildrenChange(Math.max(0, children - 1))}
                    className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="text-xl font-semibold w-8 text-center">{children}</span>
                  <button
                    onClick={() => handleChildrenChange(children + 1)}
                    className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Kinderalter */}
            {children > 0 && (
              <div className="bg-slate-50 rounded-xl p-4">
                <label className="block text-xs text-slate-500 mb-2">Alter der Kinder</label>
                <div className="flex flex-wrap gap-2">
                  {childrenAges.map((age, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">Kind {index + 1}:</span>
                      <select
                        value={age}
                        onChange={(e) => {
                          const newAges = [...childrenAges];
                          newAges[index] = parseInt(e.target.value);
                          setChildrenAges(newAges);
                        }}
                        className="px-3 py-2 bg-white rounded-lg border border-slate-200 text-sm"
                      >
                        {Array.from({ length: 18 }, (_, i) => (
                          <option key={i} value={i}>{i} Jahre</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Zimmerkategorien */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3">
              Passende Zimmerkategorien
            </h3>
            {availableCategories.length > 0 ? (
              <div className="space-y-2">
                {availableCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      if (selectedCategories.includes(category.id)) {
                        setSelectedCategories(selectedCategories.filter(c => c !== category.id));
                      } else {
                        setSelectedCategories([...selectedCategories, category.id]);
                      }
                    }}
                    className={`
                      w-full p-4 rounded-xl text-left transition-all
                      ${selectedCategories.includes(category.id)
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 hover:bg-slate-200'
                      }
                    `}
                  >
                    <p className="font-medium">{category.name}</p>
                    <p className={`text-sm ${selectedCategories.includes(category.id) ? 'text-slate-300' : 'text-slate-500'}`}>
                      Max. {category.maxOccupancy} Personen
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-orange-50 rounded-xl p-4 text-center">
                <p className="text-orange-700 text-sm">
                  Keine Kategorie für {totalGuests} Gäste verfügbar
                </p>
              </div>
            )}
          </div>

          {/* Notizen */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Besondere Wünsche
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Besondere Anfragen oder Wünsche..."
              rows={4}
              className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-100 bg-white">
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !email.trim() || !checkIn || !checkOut}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anfrage erstellen
          </button>
        </div>
      </div>
    </>
  );
}

// CDS Drawer (Customer Detail Sheet)
function CustomerDetailSheet({
  isOpen,
  onClose,
  inquiry,
  onStatusChange
}: {
  isOpen: boolean;
  onClose: () => void;
  inquiry: Inquiry | null;
  onStatusChange: (id: string, status: InquiryStatus) => void;
}) {
  const [activeTab, setActiveTab] = useState<'info' | 'inquiries'>('info');

  if (!inquiry) return null;

  const statusOptions: { value: InquiryStatus; label: string; color: string }[] = [
    { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-700' },
    { value: 'lead', label: 'Lead', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'offer', label: 'Offer', color: 'bg-blue-100 text-blue-700' },
    { value: 'booked', label: 'Booked', color: 'bg-green-100 text-green-700' },
  ];

  const currentStatus = statusOptions.find(s => s.value === inquiry.status);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      )}
      <div
        className={`
          fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
              <User className="h-6 w-6 text-slate-600" />
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

        {/* Status */}
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
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'info' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-500'}`}
          >
            Informationen
          </button>
          <button
            onClick={() => setActiveTab('inquiries')}
            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'inquiries' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-500'}`}
          >
            Anfragen
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto h-[calc(100%-280px)]">
          {activeTab === 'info' ? (
            <div className="space-y-4">
              {/* Kontakt */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-3 text-slate-400 mb-2">
                  <Mail className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase">E-Mail</span>
                </div>
                <a href={`mailto:${inquiry.email}`} className="text-slate-900 font-medium hover:text-blue-600">
                  {inquiry.email}
                </a>
              </div>

              {inquiry.phone && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 text-slate-400 mb-2">
                    <Phone className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Telefon</span>
                  </div>
                  <a href={`tel:${inquiry.phone}`} className="text-slate-900 font-medium hover:text-blue-600">
                    {inquiry.phone}
                  </a>
                </div>
              )}

              {/* Reisedaten */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-3 text-slate-400 mb-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase">Reisezeitraum</span>
                </div>
                <p className="text-slate-900 font-medium">
                  {inquiry.checkIn} - {inquiry.checkOut}
                </p>
              </div>

              {/* Gäste */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-3 text-slate-400 mb-2">
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase">Gäste</span>
                </div>
                <p className="text-slate-900 font-medium">
                  {inquiry.adults} Erwachsene{inquiry.children > 0 && `, ${inquiry.children} Kinder`}
                </p>
                {inquiry.childrenAges && inquiry.childrenAges.length > 0 && (
                  <p className="text-sm text-slate-500 mt-1">
                    Alter: {inquiry.childrenAges.join(', ')} Jahre
                  </p>
                )}
              </div>

              {/* Notizen */}
              {inquiry.notes && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 text-slate-400 mb-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Wünsche</span>
                  </div>
                  <p className="text-slate-900">{inquiry.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Aktuelle Anfrage */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${currentStatus?.color}`}>
                    {currentStatus?.label}
                  </span>
                  <span className="text-xs text-slate-400">{inquiry.createdAt}</span>
                </div>
                <p className="text-sm text-slate-600">
                  {inquiry.checkIn} - {inquiry.checkOut}
                </p>
                <p className="text-sm text-slate-500">
                  {inquiry.adults} Erw.{inquiry.children > 0 && `, ${inquiry.children} Ki.`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function OfferOfficePage() {
  const [leadDrawerOpen, setLeadDrawerOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [cdsOpen, setCdsOpen] = useState(false);

  // Demo Zimmerkategorien
  const roomCategories = [
    { id: '1', name: 'Doppelzimmer', maxOccupancy: 3 },
    { id: '2', name: 'Suite', maxOccupancy: 4 },
    { id: '3', name: 'Einzelzimmer', maxOccupancy: 1 },
    { id: '4', name: 'Familienzimmer', maxOccupancy: 6 },
  ];

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
      createdAt: '10.01.2025'
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
      createdAt: '08.01.2025'
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
      createdAt: '05.01.2025'
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
      createdAt: '01.01.2025'
    }
  ]);

  const handleCreateInquiry = (data: Omit<Inquiry, 'id' | 'status' | 'createdAt'>) => {
    const newInquiry: Inquiry = {
      ...data,
      id: Date.now().toString(),
      status: 'lead',
      createdAt: new Date().toLocaleDateString('de-DE')
    };
    setInquiries([newInquiry, ...inquiries]);
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
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Offer Office</h1>
          <p className="text-sm text-slate-500">Anfragen und Leads verwalten</p>
        </div>
        <button
          onClick={() => setLeadDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Lead
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 h-full min-w-max">
          {columns.map((column) => (
            <KanbanColumn
              key={column.status}
              title={column.title}
              status={column.status}
              inquiries={inquiries}
              color={column.color}
              onInquiryClick={handleInquiryClick}
            />
          ))}
        </div>
      </div>

      {/* Lead Form Drawer */}
      <LeadFormDrawer
        isOpen={leadDrawerOpen}
        onClose={() => setLeadDrawerOpen(false)}
        onSubmit={handleCreateInquiry}
        roomCategories={roomCategories}
      />

      {/* Customer Detail Sheet */}
      <CustomerDetailSheet
        isOpen={cdsOpen}
        onClose={() => {
          setCdsOpen(false);
          setSelectedInquiry(null);
        }}
        inquiry={selectedInquiry}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
