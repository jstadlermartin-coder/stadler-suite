'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  Users,
  Hotel,
  Mail,
  FileText,
  Settings,
  BarChart3,
  Package,
  Euro,
  Home,
  MessageSquare,
  RefreshCw
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Kalender', href: '/calendar', icon: Calendar },
  { name: 'Buchungen', href: '/bookings', icon: FileText },
  { name: 'Anfragen', href: '/inquiries', icon: MessageSquare },
  { name: 'Angebote', href: '/offers', icon: Mail },
  { name: 'Gäste', href: '/guests', icon: Users },
  { name: 'Zimmer', href: '/rooms', icon: Hotel },
  { name: 'Preise', href: '/pricing', icon: Euro },
  { name: 'Pauschalen', href: '/packages', icon: Package },
  { name: 'Statistiken', href: '/stats', icon: BarChart3 },
  { name: 'Sync', href: '/sync', icon: RefreshCw },
  { name: 'Einstellungen', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col bg-slate-900">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">
          Stadler Suite
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group flex items-center rounded-md px-3 py-2 text-sm font-medium
                transition-colors duration-150
                ${isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }
              `}
            >
              <item.icon
                className={`
                  mr-3 h-5 w-5 flex-shrink-0
                  ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'}
                `}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-700 p-4">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-sm font-medium text-white">HS</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">Hotel Stadler</p>
            <p className="text-xs text-slate-400">Attersee</p>
          </div>
        </div>
      </div>
    </div>
  );
}
