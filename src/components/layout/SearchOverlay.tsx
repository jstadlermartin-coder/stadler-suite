'use client';

import { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { Search, X, User, FileText, Calendar } from 'lucide-react';

// Search Context
interface SearchContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within SearchProvider');
  }
  return context;
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  // ESC-Taste zum Schließen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <SearchContext.Provider value={{ isOpen, open, close }}>
      {children}
    </SearchContext.Provider>
  );
}

export function SearchButton() {
  const { open } = useSearch();

  return (
    <button
      onClick={open}
      className="p-3 hover:bg-slate-100 rounded-xl transition-colors"
      aria-label="Suche öffnen"
    >
      <Search className="h-6 w-6 text-slate-700" />
    </button>
  );
}

interface SearchResult {
  id: string;
  type: 'guest' | 'booking';
  title: string;
  subtitle: string;
  meta?: string;
}

export function SearchOverlay() {
  const { isOpen, close } = useSearch();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus Input wenn geöffnet
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset wenn geschlossen
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Suche durchführen
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setLoading(true);

      // TODO: Echte Suche über Bridge API
      // Simulierte Ergebnisse für Demo
      const mockResults: SearchResult[] = ([
        {
          id: '1',
          type: 'guest' as const,
          title: 'Max Mustermann',
          subtitle: 'max.mustermann@example.com',
          meta: '+43 664 1234567'
        },
        {
          id: '2',
          type: 'booking' as const,
          title: 'Buchung #12345',
          subtitle: 'Max Mustermann • Zimmer 101',
          meta: '15.01.2025 - 18.01.2025'
        },
        {
          id: '3',
          type: 'guest' as const,
          title: 'Maria Musterfrau',
          subtitle: 'maria@example.com',
          meta: '+43 660 9876543'
        }
      ] as SearchResult[]).filter(r =>
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.subtitle.toLowerCase().includes(query.toLowerCase())
      );

      setResults(mockResults);
      setLoading(false);
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header mit Suchleiste */}
      <div className="border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, E-Mail, Telefon, Buchungsnummer..."
                className="w-full pl-12 pr-4 py-3 bg-slate-100 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <button
              onClick={close}
              className="p-3 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="h-6 w-6 text-slate-700" />
            </button>
          </div>
        </div>
      </div>

      {/* Suchergebnisse */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          ) : query && results.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Keine Ergebnisse für "{query}"</p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => {
                    // TODO: Navigation zum Ergebnis
                    close();
                  }}
                  className="w-full flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left"
                >
                  <div className={`
                    h-12 w-12 rounded-xl flex items-center justify-center
                    ${result.type === 'guest' ? 'bg-blue-100' : 'bg-green-100'}
                  `}>
                    {result.type === 'guest' ? (
                      <User className="h-6 w-6 text-blue-600" />
                    ) : (
                      <FileText className="h-6 w-6 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{result.title}</p>
                    <p className="text-sm text-slate-500 truncate">{result.subtitle}</p>
                  </div>
                  {result.meta && (
                    <div className="text-sm text-slate-400 text-right">
                      {result.meta}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400">Suche nach Gästen und Buchungen</p>
              <p className="text-sm text-slate-300 mt-2">
                Name, E-Mail, Telefon oder Buchungsnummer eingeben
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
