'use client';

import { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  MessageSquare,
  FileText,
  X,
  Send
} from 'lucide-react';
import WhatsAppChat from '@/components/chat/WhatsAppChat';

// Types for customer data
export interface CustomerData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    postalCode?: string;
    city?: string;
    country?: string;
  };
  notes?: string;
}

export interface BookingItem {
  id: string;
  displayId?: string;
  checkIn: string;
  checkOut: string;
  roomName?: string;
  roomNumber?: string;
  adults: number;
  children?: number;
  status: 'lead' | 'offer' | 'booked' | 'cancelled' | 'lost';
  createdAt?: string;
}

// Status configuration
export type StatusValue = 'lost' | 'lead' | 'offer' | 'booked';

interface StatusOption {
  value: StatusValue;
  label: string;
  color: string;
}

const statusOptions: StatusOption[] = [
  { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-700' },
  { value: 'lead', label: 'Lead', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'offer', label: 'Offer', color: 'bg-blue-100 text-blue-700' },
  { value: 'booked', label: 'Booked', color: 'bg-green-100 text-green-700' },
];

const statusColors: Record<string, string> = {
  'lost': 'bg-red-100 text-red-700',
  'lead': 'bg-yellow-100 text-yellow-700',
  'offer': 'bg-blue-100 text-blue-700',
  'booked': 'bg-green-100 text-green-700',
  'cancelled': 'bg-red-100 text-red-700',
};

const statusLabels: Record<string, string> = {
  'lost': 'Lost',
  'lead': 'Lead',
  'offer': 'Offer',
  'booked': 'Gebucht',
  'cancelled': 'Storniert',
};

// Stage configuration (for Database mode)
export type StageValue = 'prospekt' | 'stammgast' | 'vip' | 'blacklist' | 'lead' | 'booked' | 'past_booking';

const stageColors: Record<StageValue, string> = {
  'prospekt': 'bg-slate-100 text-slate-700',
  'stammgast': 'bg-emerald-100 text-emerald-700',
  'vip': 'bg-amber-100 text-amber-700',
  'blacklist': 'bg-red-100 text-red-700',
  'lead': 'bg-yellow-100 text-yellow-700',
  'booked': 'bg-green-100 text-green-700',
  'past_booking': 'bg-slate-100 text-slate-600',
};

const stageLabels: Record<StageValue, string> = {
  'prospekt': 'Prospekt',
  'stammgast': 'Stammgast',
  'vip': 'VIP',
  'blacklist': 'Blacklist',
  'lead': 'Lead',
  'booked': 'Booked',
  'past_booking': 'Past Booking',
};

interface CustomerDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerData | null;
  bookings?: BookingItem[];
  inquiries?: BookingItem[];
  // For status change (Offer Office mode)
  currentStatus?: StatusValue;
  onStatusChange?: (status: StatusValue) => void;
  showStatusBar?: boolean;
  // For stage display (Database mode)
  stage?: StageValue;
}

export function CustomerDetailSheet({
  isOpen,
  onClose,
  customer,
  bookings = [],
  inquiries = [],
  currentStatus,
  onStatusChange,
  showStatusBar = false,
  stage,
}: CustomerDetailSheetProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'bookings' | 'inquiries' | 'communication'>('info');
  const [commSubTab, setCommSubTab] = useState<'whatsapp' | 'email'>('whatsapp');

  if (!customer) return null;

  // Calculate content height based on whether status bar is shown
  const contentHeight = showStatusBar ? 'h-[calc(100%-240px)]' : 'h-[calc(100%-160px)]';

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
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{customer.name}</h2>
              {customer.email && <p className="text-sm text-slate-500">{customer.email}</p>}
              {stage && (
                <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${stageColors[stage]}`}>
                  {stageLabels[stage]}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Status Bar (for Offer Office mode) */}
        {showStatusBar && currentStatus !== undefined && onStatusChange && (
          <div className="px-6 py-4 border-b border-slate-100">
            <label className="block text-xs text-slate-500 mb-2">Status</label>
            <div className="flex gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onStatusChange(option.value)}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                    ${currentStatus === option.value
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
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'info' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Basisdaten
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'bookings' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Buchungen
          </button>
          <button
            onClick={() => setActiveTab('inquiries')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'inquiries' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Anfragen
          </button>
          <button
            onClick={() => setActiveTab('communication')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'communication' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Komm.
          </button>
        </div>

        {/* Content */}
        <div className={`p-6 overflow-auto ${contentHeight}`}>
          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              {/* Name */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-3 text-slate-400 mb-2">
                  <User className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase">Name</span>
                </div>
                <p className="text-slate-900 font-medium">{customer.name}</p>
              </div>

              {/* Email */}
              {customer.email && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 text-slate-400 mb-2">
                    <Mail className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">E-Mail</span>
                  </div>
                  <a href={`mailto:${customer.email}`} className="text-slate-900 font-medium hover:text-blue-600">
                    {customer.email}
                  </a>
                </div>
              )}

              {/* Phone */}
              {customer.phone && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 text-slate-400 mb-2">
                    <Phone className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Telefon</span>
                  </div>
                  <a href={`tel:${customer.phone}`} className="text-slate-900 font-medium hover:text-blue-600">
                    {customer.phone}
                  </a>
                </div>
              )}

              {/* Address */}
              {customer.address && (customer.address.street || customer.address.city || customer.address.country) && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 text-slate-400 mb-2">
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Adresse</span>
                  </div>
                  <div className="text-slate-900">
                    {customer.address.street && <p>{customer.address.street}</p>}
                    {(customer.address.postalCode || customer.address.city) && (
                      <p>{customer.address.postalCode} {customer.address.city}</p>
                    )}
                    {customer.address.country && <p>{customer.address.country}</p>}
                  </div>
                </div>
              )}

              {/* Notes */}
              {customer.notes && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 text-slate-400 mb-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Notizen</span>
                  </div>
                  <p className="text-slate-900">{customer.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <div className="space-y-3">
              {bookings.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500">Keine Buchungen</p>
                </div>
              ) : (
                bookings.map((booking) => (
                  <div key={booking.id} className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-900">
                        {booking.displayId || `#${booking.id}`}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${statusColors[booking.status]}`}>
                        {statusLabels[booking.status]}
                      </span>
                    </div>
                    {(booking.roomName || booking.roomNumber) && (
                      <p className="text-sm text-slate-600">
                        {booking.roomName || `Zimmer ${booking.roomNumber}`}
                      </p>
                    )}
                    <p className="text-sm text-slate-400">{booking.checkIn} - {booking.checkOut}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {booking.adults} Erw.{(booking.children ?? 0) > 0 ? `, ${booking.children} Kind.` : ''}
                    </p>
                    {booking.createdAt && (
                      <p className="text-xs text-slate-400 mt-1">Erstellt: {booking.createdAt}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Inquiries Tab */}
          {activeTab === 'inquiries' && (
            <div className="space-y-3">
              {inquiries.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500">Keine Anfragen</p>
                </div>
              ) : (
                inquiries.map((inquiry) => (
                  <div key={inquiry.id} className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-900">
                        {inquiry.displayId || `#${inquiry.id}`}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${statusColors[inquiry.status]}`}>
                        {statusLabels[inquiry.status]}
                      </span>
                    </div>
                    {(inquiry.roomName || inquiry.roomNumber) && (
                      <p className="text-sm text-slate-600">
                        {inquiry.roomName || `Zimmer ${inquiry.roomNumber}`}
                      </p>
                    )}
                    <p className="text-sm text-slate-400">{inquiry.checkIn} - {inquiry.checkOut}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {inquiry.adults} Erw.{(inquiry.children ?? 0) > 0 ? `, ${inquiry.children} Kind.` : ''}
                    </p>
                    {inquiry.createdAt && (
                      <p className="text-xs text-slate-400 mt-1">Erstellt: {inquiry.createdAt}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Communication Tab */}
          {activeTab === 'communication' && (
            <div className="h-full flex flex-col -m-6">
              {/* Sub-Tabs */}
              <div className="flex border-b border-slate-200 px-4">
                <button
                  onClick={() => setCommSubTab('whatsapp')}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    commSubTab === 'whatsapp'
                      ? 'text-green-600 border-b-2 border-green-600'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </button>
                <button
                  onClick={() => setCommSubTab('email')}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    commSubTab === 'email'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Mail className="h-4 w-4" />
                  E-Mail
                </button>
              </div>

              {/* Sub-Tab Content */}
              <div className="flex-1 overflow-hidden">
                {commSubTab === 'whatsapp' ? (
                  customer.phone ? (
                    <WhatsAppChat
                      phone={customer.phone}
                      customerName={customer.name}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
                      <Phone className="h-12 w-12 mb-4" />
                      <p className="font-medium">Keine Telefonnummer</p>
                      <p className="text-sm text-center mt-2">
                        Fügen Sie eine Telefonnummer hinzu, um WhatsApp zu nutzen
                      </p>
                    </div>
                  )
                ) : (
                  <div className="p-6 space-y-4">
                    {/* Email Tab Content */}
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                      <Mail className="h-12 w-12 mb-4" />
                      <p className="font-medium text-slate-600">E-Mail Verlauf</p>
                      <p className="text-sm text-center mt-2">
                        Gesendete E-Mails werden hier angezeigt
                      </p>
                    </div>

                    {/* Quick Email Button */}
                    {customer.email && (
                      <a
                        href={`mailto:${customer.email}`}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Send className="h-4 w-4" />
                        E-Mail senden
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
