'use client';

import { HamburgerButton } from './NewSidebar';
import { SearchButton } from './SearchOverlay';
import { NewBookingButton } from '../booking/NewBookingWizard';

interface TopBarProps {
  title?: string;
}

export default function TopBar({ title }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="flex items-center px-4 py-3">
        {/* Links: Hamburger Menü - feste Breite für Zentrierung */}
        <div className="flex items-center gap-3 w-24">
          <HamburgerButton />
          {title && (
            <h1 className="text-lg font-semibold text-slate-900 truncate">
              {title}
            </h1>
          )}
        </div>

        {/* Mitte: Plus Button - flexibel zentriert */}
        <div className="flex-1 flex justify-center">
          <NewBookingButton />
        </div>

        {/* Rechts: Suche - feste Breite für Zentrierung */}
        <div className="flex items-center gap-2 w-24 justify-end">
          <SearchButton />
        </div>
      </div>
    </header>
  );
}
