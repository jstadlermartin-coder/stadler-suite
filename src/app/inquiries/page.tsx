'use client';

import { useState } from 'react';
import { Search, Mail, Phone, MessageSquare, Instagram, Globe, Clock, ArrowRight, User } from 'lucide-react';

const inquiriesData = [
  {
    id: '1',
    name: 'Familie Hofer',
    email: 'hofer@email.at',
    phone: '+43 660 1234567',
    source: 'email',
    message: 'Wir würden gerne vom 23.-28. Dezember mit 2 Erwachsenen und 2 Kindern (8 und 12) kommen. Haben Sie noch ein Familienzimmer frei?',
    status: 'new',
    createdAt: '2024-12-17T14:30:00',
    extractedData: {
      checkIn: '2024-12-23',
      checkOut: '2024-12-28',
      adults: 2,
      children: 2,
    },
  },
  {
    id: '2',
    name: 'Markus Bauer',
    email: 'mbauer@company.de',
    source: 'website',
    message: 'Anfrage für ein Doppelzimmer mit Seeblick, 2 Nächte im Januar. Bitte um Preisinfo.',
    status: 'processing',
    createdAt: '2024-12-16T09:15:00',
    extractedData: {
      adults: 2,
      roomType: 'DZ Seeblick',
    },
  },
  {
    id: '3',
    name: 'Lisa M.',
    source: 'instagram',
    message: 'Hey! Habt ihr noch was frei für Silvester? Wären zu zweit.',
    status: 'new',
    createdAt: '2024-12-17T18:45:00',
    extractedData: {
      checkIn: '2024-12-31',
      adults: 2,
    },
  },
  {
    id: '4',
    name: 'Georg Steiner',
    email: 'g.steiner@web.de',
    phone: '+49 171 9876543',
    source: 'phone',
    message: 'Telefonische Anfrage: Suite für 4 Nächte ab 10. Januar, Halbpension gewünscht.',
    status: 'offer_sent',
    createdAt: '2024-12-15T11:00:00',
    extractedData: {
      checkIn: '2025-01-10',
      nights: 4,
      adults: 2,
      mealPlan: 'Halbpension',
      roomType: 'Suite',
    },
  },
];

const sourceIcons: Record<string, typeof Mail> = {
  email: Mail,
  phone: Phone,
  website: Globe,
  instagram: Instagram,
  whatsapp: MessageSquare,
};

const statusConfig: Record<string, { label: string; color: string }> = {
  new: { label: 'Neu', color: 'bg-red-100 text-red-700' },
  processing: { label: 'In Bearbeitung', color: 'bg-amber-100 text-amber-700' },
  offer_sent: { label: 'Angebot gesendet', color: 'bg-blue-100 text-blue-700' },
  converted: { label: 'Gebucht', color: 'bg-green-100 text-green-700' },
  lost: { label: 'Verloren', color: 'bg-slate-100 text-slate-700' },
};

export default function InquiriesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Anfragen</h1>
          <p className="mt-1 text-slate-600">
            {inquiriesData.filter(i => i.status === 'new').length} neue Anfragen
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {Object.entries(statusConfig).map(([key, config]) => {
          const count = inquiriesData.filter(i => i.status === key).length;
          return (
            <div key={key} className="bg-white rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">{config.label}</p>
              <p className="text-2xl font-bold text-slate-900">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Suche nach Name, Email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Inquiry List */}
      <div className="space-y-4">
        {inquiriesData.map((inquiry) => {
          const SourceIcon = sourceIcons[inquiry.source] || Mail;
          return (
            <div
              key={inquiry.id}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <SourceIcon className="h-6 w-6 text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-slate-900">{inquiry.name}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[inquiry.status].color}`}>
                        {statusConfig[inquiry.status].label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Clock className="h-4 w-4" />
                      {formatDateTime(inquiry.createdAt)}
                    </div>
                  </div>

                  <p className="text-slate-600 mb-3 line-clamp-2">{inquiry.message}</p>

                  {/* Extracted Data */}
                  {inquiry.extractedData && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {inquiry.extractedData.checkIn && (
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg">
                          Anreise: {formatDate(inquiry.extractedData.checkIn)}
                        </span>
                      )}
                      {inquiry.extractedData.checkOut && (
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg">
                          Abreise: {formatDate(inquiry.extractedData.checkOut)}
                        </span>
                      )}
                      {inquiry.extractedData.nights && (
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg">
                          {inquiry.extractedData.nights} Nächte
                        </span>
                      )}
                      {inquiry.extractedData.adults && (
                        <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-lg">
                          {inquiry.extractedData.adults} Erw.
                        </span>
                      )}
                      {inquiry.extractedData.children && (
                        <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-lg">
                          {inquiry.extractedData.children} Kinder
                        </span>
                      )}
                      {inquiry.extractedData.roomType && (
                        <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-lg">
                          {inquiry.extractedData.roomType}
                        </span>
                      )}
                      {inquiry.extractedData.mealPlan && (
                        <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-lg">
                          {inquiry.extractedData.mealPlan}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Contact Info & Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      {inquiry.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {inquiry.email}
                        </span>
                      )}
                      {inquiry.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {inquiry.phone}
                        </span>
                      )}
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                      Angebot erstellen
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
