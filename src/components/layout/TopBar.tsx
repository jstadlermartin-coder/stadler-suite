'use client';

import { HamburgerButton } from './NewSidebar';
import { SearchButton } from './SearchOverlay';

interface TopBarProps {
  title?: string;
}

export default function TopBar({ title }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-100">
      <div className="flex items-center justify-between px-4 py-2">
        {/* Links: Hamburger Menü */}
        <div className="flex items-center gap-2">
          <HamburgerButton />
          {title && (
            <h1 className="text-lg font-semibold text-slate-900 ml-2">
              {title}
            </h1>
          )}
        </div>

        {/* Rechts: Suche */}
        <div className="flex items-center gap-2">
          <SearchButton />
        </div>
      </div>
    </header>
  );
}
