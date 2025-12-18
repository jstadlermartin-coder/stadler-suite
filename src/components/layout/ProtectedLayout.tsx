'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { SidebarProvider, SlideOutSidebar } from './NewSidebar';
import { SearchProvider, SearchOverlay } from './SearchOverlay';
import { GuestDrawerProvider, GuestDrawer } from '../drawers/GuestDrawer';
import TopBar from './TopBar';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthorized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || pathname === '/login') return;
    if (!user || !isAuthorized) {
      router.push('/login');
    }
  }, [user, loading, isAuthorized, router, pathname]);

  // Login-Seite braucht keinen Schutz
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Ladebildschirm
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-500 text-sm">Lade...</p>
        </div>
      </div>
    );
  }

  // Nicht autorisiert
  if (!user || !isAuthorized) {
    return null;
  }

  // Autorisiert - zeige die App mit neuem Layout
  return (
    <SidebarProvider>
      <SearchProvider>
        <GuestDrawerProvider>
          <div className="min-h-screen bg-white">
            {/* Slide-Out Sidebar */}
            <SlideOutSidebar />

            {/* Search Overlay */}
            <SearchOverlay />

            {/* Guest Drawer */}
            <GuestDrawer />

            {/* Main Content */}
            <div className="flex flex-col min-h-screen">
              <TopBar />
              <main className="flex-1">
                {children}
              </main>
            </div>
          </div>
        </GuestDrawerProvider>
      </SearchProvider>
    </SidebarProvider>
  );
}
