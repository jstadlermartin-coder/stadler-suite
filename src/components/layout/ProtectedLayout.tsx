'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from './Sidebar';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthorized, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Nicht prüfen wenn noch am laden oder auf login-seite
    if (loading || pathname === '/login') return;

    // Wenn nicht eingeloggt oder nicht autorisiert -> Login
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
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Lade...</p>
        </div>
      </div>
    );
  }

  // Nicht autorisiert
  if (!user || !isAuthorized) {
    return null; // Redirect passiert im useEffect
  }

  // Autorisiert - zeige die App
  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
