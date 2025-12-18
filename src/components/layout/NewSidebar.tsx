'use client';

import { useState, createContext, useContext, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  Home,
  Calendar,
  Database,
  Settings,
  LogOut,
  MessageSquare,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

// Sidebar Context für globalen Toggle-State
interface SidebarContextType {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen(!isOpen);
  const close = () => setIsOpen(false);

  return (
    <SidebarContext.Provider value={{ isOpen, toggle, close }}>
      {children}
    </SidebarContext.Provider>
  );
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Kalender', href: '/calendar', icon: Calendar },
  { name: 'Database', href: '/database', icon: Database },
  { name: 'Offer Office', href: '/offer-office', icon: MessageSquare },
  { name: 'Statistiken', href: '/stats', icon: BarChart3 },
  { name: 'Einstellungen', href: '/settings', icon: Settings },
];

export function HamburgerButton() {
  const { toggle, isOpen } = useSidebar();

  return (
    <button
      onClick={toggle}
      className="p-3 hover:bg-slate-100 rounded-xl transition-colors"
      aria-label="Menü öffnen"
    >
      {isOpen ? (
        <X className="h-6 w-6 text-slate-700" />
      ) : (
        <Menu className="h-6 w-6 text-slate-700" />
      )}
    </button>
  );
}

export function SlideOutSidebar() {
  const { isOpen, close } = useSidebar();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    close();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-50
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Stadler Suite</h1>
            <p className="text-sm text-slate-500">Hotel Stadler</p>
          </div>
          <button
            onClick={close}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={close}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                  transition-all duration-200
                  ${isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }
                `}
              >
                <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Profil"
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.email?.charAt(0).toUpperCase() || 'S'}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {user?.displayName || 'Hotel Stadler'}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {user?.email || ''}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Abmelden"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
