'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { SidebarProvider, SlideOutSidebar } from './NewSidebar';
import { SearchProvider, SearchOverlay } from './SearchOverlay';
import { GuestDrawerProvider, GuestDrawer } from '../drawers/GuestDrawer';
import { BookingWizardProvider, NewBookingWizard } from '../booking/NewBookingWizard';
import { BridgeSyncProvider } from '@/lib/bridge-sync-context';
import TopBar from './TopBar';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthorized } = useAuth();
  const pathname = usePathname();

  // Flexiblere Prüfung für Login-Seite
  const isLoginPage = pathname === '/login' || pathname === '/login/' || pathname?.startsWith('/login');

  // Auch Browser-URL prüfen als Fallback
  const browserPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const isOnLoginPage = isLoginPage || browserPath === '/login' || browserPath === '/login/';

  // Redirect nur wenn NICHT auf Login-Seite und NICHT eingeloggt
  useEffect(() => {
    if (!loading && !user && !isOnLoginPage) {
      window.location.href = '/login';
    }
  }, [loading, user, isOnLoginPage]);

  // Login-Seite braucht keinen Schutz
  if (isOnLoginPage) {
    return <>{children}</>;
  }

  // Ladebildschirm während Auth-Check oder Redirect
  if (loading || !user || !isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-700 border-t-white mx-auto mb-4"></div>
          <p className="text-slate-400 text-sm">Lade...</p>
        </div>
      </div>
    );
  }

  // Autorisiert - zeige die App mit neuem Layout
  return (
    <SidebarProvider>
      <BridgeSyncProvider>
        <SearchProvider>
          <GuestDrawerProvider>
            <BookingWizardProvider>
            <div className="min-h-screen bg-white">
              <SlideOutSidebar />
              <SearchOverlay />
              <GuestDrawer />
              <NewBookingWizard />
              <div className="flex flex-col min-h-screen">
                <TopBar />
                <main className="flex-1">
                  {children}
                </main>
              </div>
            </div>
            </BookingWizardProvider>
          </GuestDrawerProvider>
        </SearchProvider>
      </BridgeSyncProvider>
    </SidebarProvider>
  );
}
