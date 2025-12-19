'use client';

import { useState } from 'react';
import { Users, Hotel, ArrowUpRight, ArrowDownRight, X, ChevronRight } from 'lucide-react';
import { CustomerDetailSheet } from '@/components/drawers/CustomerDetailSheet';

// Types
interface Arrival {
  id: string;
  guestId: string;
  name: string;
  email?: string;
  phone?: string;
  room: string;
  checkIn: string;
  guests: number;
}

interface Departure {
  id: string;
  guestId: string;
  name: string;
  email?: string;
  phone?: string;
  room: string;
  checkOut: string;
}

interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  country?: string;
}

// Arrivals/Departures Fullscreen Drawer
function ListDrawer({
  isOpen,
  onClose,
  type,
  items,
  onItemClick
}: {
  isOpen: boolean;
  onClose: () => void;
  type: 'arrivals' | 'departures';
  items: (Arrival | Departure)[];
  onItemClick: (item: Arrival | Departure) => void;
}) {
  const isArrivals = type === 'arrivals';

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-full bg-white shadow-2xl z-40 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl ${isArrivals ? 'bg-green-100' : 'bg-orange-100'} flex items-center justify-center`}>
              {isArrivals ? <ArrowDownRight className="h-5 w-5 text-green-600" /> : <ArrowUpRight className="h-5 w-5 text-orange-600" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{isArrivals ? 'Ankünfte' : 'Abreisen'} heute</h2>
              <p className="text-sm text-slate-500">{items.length} Gäste</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Fullscreen List - Full Width Cards */}
        <div className="p-4 overflow-auto h-[calc(100%-88px)]">
          <div className="space-y-3">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => onItemClick(item)}
                className="w-full flex items-center gap-4 p-5 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors text-left"
              >
                <div className={`h-14 w-14 rounded-full ${isArrivals ? 'bg-green-100' : 'bg-orange-100'} flex items-center justify-center flex-shrink-0`}>
                  {isArrivals ? <ArrowDownRight className="h-7 w-7 text-green-600" /> : <ArrowUpRight className="h-7 w-7 text-orange-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-xl">{item.name}</p>
                  <p className="text-base text-slate-500">
                    Zimmer {item.room}
                    {'guests' in item && ` • ${item.guests} ${item.guests === 1 ? 'Gast' : 'Gäste'}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">
                    {'checkIn' in item ? item.checkIn : item.checkOut}
                  </p>
                </div>
                <ChevronRight className="h-6 w-6 text-slate-300" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  // Drawer states
  const [listDrawerOpen, setListDrawerOpen] = useState(false);
  const [listDrawerType, setListDrawerType] = useState<'arrivals' | 'departures'>('arrivals');
  const [cdsOpen, setCdsOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<{ id: string; name: string; email?: string; phone?: string } | null>(null);

  // Demo-Daten
  const todayStats = {
    arrivals: 3,
    departures: 2,
    inHouse: 12,
    available: 4
  };

  const upcomingArrivals: Arrival[] = [
    { id: '1', guestId: 'g1', name: 'Max Mustermann', email: 'max@example.com', phone: '+43 664 1234567', room: '101', checkIn: 'Heute, 14:00', guests: 2 },
    { id: '2', guestId: 'g2', name: 'Maria Musterfrau', email: 'maria@example.com', room: '203', checkIn: 'Heute, 15:00', guests: 1 },
    { id: '3', guestId: 'g3', name: 'Hans Huber', email: 'hans@example.com', phone: '+43 664 5555555', room: '102', checkIn: 'Heute, 16:30', guests: 2 },
  ];

  const upcomingDepartures: Departure[] = [
    { id: '1', guestId: 'g4', name: 'Anna Schmidt', email: 'anna@example.com', room: '301', checkOut: 'Heute, 10:00' },
    { id: '2', guestId: 'g5', name: 'Peter Weber', email: 'peter@example.com', phone: '+49 170 1234567', room: '201', checkOut: 'Heute, 11:00' },
  ];

  const openListDrawer = (type: 'arrivals' | 'departures') => {
    setListDrawerType(type);
    setListDrawerOpen(true);
  };

  const handleItemClick = (item: Arrival | Departure) => {
    setSelectedGuest({
      id: item.guestId,
      name: item.name,
      email: item.email,
      phone: item.phone
    });
    setListDrawerOpen(false);
    setCdsOpen(true);
  };

  const handleGuestClick = (item: Arrival | Departure) => {
    setSelectedGuest({
      id: item.guestId,
      name: item.name,
      email: item.email,
      phone: item.phone
    });
    setCdsOpen(true);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Dashboard</h1>
        <p className="text-slate-500">Hotel Stadler am Attersee</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
              <ArrowDownRight className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
              Heute
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-1">{todayStats.arrivals}</p>
          <p className="text-sm text-slate-500">Ankünfte</p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5 text-orange-600" />
            </div>
            <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
              Heute
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-1">{todayStats.departures}</p>
          <p className="text-sm text-slate-500">Abreisen</p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-1">{todayStats.inHouse}</p>
          <p className="text-sm text-slate-500">Im Haus</p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-xl bg-slate-200 flex items-center justify-center">
              <Hotel className="h-5 w-5 text-slate-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-1">{todayStats.available}</p>
          <p className="text-sm text-slate-500">Zimmer frei</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ankünfte */}
        <div>
          <button
            onClick={() => openListDrawer('arrivals')}
            className="w-full flex items-center justify-between mb-4 hover:bg-slate-50 -mx-2 px-2 py-1 rounded-lg transition-colors"
          >
            <h2 className="text-lg font-semibold text-slate-900">Ankünfte heute</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">{upcomingArrivals.length} Gäste</span>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </div>
          </button>
          <div className="space-y-2">
            {upcomingArrivals.map((arrival) => (
              <div
                key={arrival.id}
                onClick={() => handleGuestClick(arrival)}
                className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <ArrowDownRight className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">{arrival.name}</p>
                  <p className="text-sm text-slate-500">
                    Zimmer {arrival.room} • {arrival.guests} {arrival.guests === 1 ? 'Gast' : 'Gäste'}
                  </p>
                </div>
                <div className="text-sm text-slate-400">
                  {arrival.checkIn}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Abreisen */}
        <div>
          <button
            onClick={() => openListDrawer('departures')}
            className="w-full flex items-center justify-between mb-4 hover:bg-slate-50 -mx-2 px-2 py-1 rounded-lg transition-colors"
          >
            <h2 className="text-lg font-semibold text-slate-900">Abreisen heute</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">{upcomingDepartures.length} Gäste</span>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </div>
          </button>
          <div className="space-y-2">
            {upcomingDepartures.map((departure) => (
              <div
                key={departure.id}
                onClick={() => handleGuestClick(departure)}
                className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <ArrowUpRight className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">{departure.name}</p>
                  <p className="text-sm text-slate-500">
                    Zimmer {departure.room}
                  </p>
                </div>
                <div className="text-sm text-slate-400">
                  {departure.checkOut}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* List Drawer */}
      <ListDrawer
        isOpen={listDrawerOpen}
        onClose={() => setListDrawerOpen(false)}
        type={listDrawerType}
        items={listDrawerType === 'arrivals' ? upcomingArrivals : upcomingDepartures}
        onItemClick={handleItemClick}
      />

      {/* CDS */}
      <CustomerDetailSheet
        isOpen={cdsOpen}
        onClose={() => { setCdsOpen(false); setSelectedGuest(null); }}
        customer={selectedGuest ? {
          id: selectedGuest.id,
          name: selectedGuest.name,
          email: selectedGuest.email,
          phone: selectedGuest.phone,
        } : null}
      />
    </div>
  );
}
