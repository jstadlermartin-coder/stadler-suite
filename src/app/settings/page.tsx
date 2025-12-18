'use client';

import { useState } from 'react';
import {
  Settings,
  Hotel,
  Layers,
  Plus,
  X,
  Upload,
  Trash2,
  Users,
  BedDouble,
  Euro,
  Calendar,
  Coffee,
  RefreshCw,
  ChevronDown
} from 'lucide-react';

// Types
interface RoomCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  maxOccupancy: number;
}

interface Room {
  id: string;
  categoryId: string;
  name: string;
  number: string;
  description?: string;
  photos: string[];
  minOccupancy: number;
  standardOccupancy: number;
  maxOccupancy: number;
  extraBeds: number;
}

interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  color: string;
}

interface MealPlan {
  id: string;
  name: string;
  code: string;
  pricePerPerson: number;
}

interface Rate {
  id: string;
  name: string;
  categoryId: string;
  seasonId: string;
  mealPlanId: string;
  price1to3: number;
  price4to6: number;
  price7plus: number;
}

// ============ DRAWER COMPONENTS ============

function CategoryDrawer({
  isOpen,
  onClose,
  category,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  category?: RoomCategory | null;
  onSave: (category: Omit<RoomCategory, 'id'>) => void;
}) {
  const [name, setName] = useState(category?.name || '');
  const [description, setDescription] = useState(category?.description || '');
  const [color, setColor] = useState(category?.color || '#3B82F6');
  const [maxOccupancy, setMaxOccupancy] = useState(category?.maxOccupancy || 2);

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave({ name, description, color, maxOccupancy });
    onClose();
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">{category ? 'Kategorie bearbeiten' : 'Neue Kategorie'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="h-5 w-5 text-slate-500" /></button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Doppelzimmer" className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Max. Personen</label>
            <input type="number" value={maxOccupancy} onChange={(e) => setMaxOccupancy(parseInt(e.target.value) || 2)} min={1} className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Beschreibung</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-4 py-3 bg-slate-100 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Farbe</label>
            <div className="flex gap-2 flex-wrap">
              {colors.map((c) => (
                <button key={c} onClick={() => setColor(c)} className={`w-10 h-10 rounded-xl transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-100 bg-white">
          <button onClick={handleSubmit} disabled={!name.trim()} className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50">{category ? 'Speichern' : 'Kategorie anlegen'}</button>
        </div>
      </div>
    </>
  );
}

function RoomDrawer({
  isOpen,
  onClose,
  room,
  categories,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  room?: Room | null;
  categories: RoomCategory[];
  onSave: (room: Omit<Room, 'id'>) => void;
}) {
  const [categoryId, setCategoryId] = useState(room?.categoryId || categories[0]?.id || '');
  const [name, setName] = useState(room?.name || '');
  const [number, setNumber] = useState(room?.number || '');
  const [description, setDescription] = useState(room?.description || '');
  const [minOccupancy, setMinOccupancy] = useState(room?.minOccupancy || 1);
  const [standardOccupancy, setStandardOccupancy] = useState(room?.standardOccupancy || 2);
  const [maxOccupancy, setMaxOccupancy] = useState(room?.maxOccupancy || 2);
  const [extraBeds, setExtraBeds] = useState(room?.extraBeds || 0);

  const handleSubmit = () => {
    if (!name.trim() || !number.trim() || !categoryId) return;
    onSave({ categoryId, name, number, description, photos: [], minOccupancy, standardOccupancy, maxOccupancy, extraBeds });
    onClose();
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 overflow-auto ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-slate-900">{room ? 'Zimmer bearbeiten' : 'Neues Zimmer'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="h-5 w-5 text-slate-500" /></button>
        </div>
        <div className="p-6 space-y-6 pb-32">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Kategorie *</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900">
              {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
            </select>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 mb-2">Zimmername *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-2">Zimmernummer *</label><input type="text" value={number} onChange={(e) => setNumber(e.target.value)} className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-2">Beschreibung</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-4 py-3 bg-slate-100 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-slate-900" /></div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Belegung</label>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs text-slate-500 mb-1">Minimal</label><input type="number" value={minOccupancy} onChange={(e) => setMinOccupancy(parseInt(e.target.value) || 1)} min={1} className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900" /></div>
              <div><label className="block text-xs text-slate-500 mb-1">Standard</label><input type="number" value={standardOccupancy} onChange={(e) => setStandardOccupancy(parseInt(e.target.value) || 2)} min={1} className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900" /></div>
              <div><label className="block text-xs text-slate-500 mb-1">Maximal</label><input type="number" value={maxOccupancy} onChange={(e) => setMaxOccupancy(parseInt(e.target.value) || 2)} min={1} className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900" /></div>
              <div><label className="block text-xs text-slate-500 mb-1">Zusatzbetten</label><input type="number" value={extraBeds} onChange={(e) => setExtraBeds(parseInt(e.target.value) || 0)} min={0} className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900" /></div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Zimmerfotos</label>
            <button className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:border-slate-300 flex items-center justify-center gap-2"><Upload className="h-5 w-5" />Foto hochladen</button>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-100 bg-white">
          <button onClick={handleSubmit} disabled={!name.trim() || !number.trim()} className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50">{room ? 'Speichern' : 'Zimmer anlegen'}</button>
        </div>
      </div>
    </>
  );
}

function SeasonDrawer({
  isOpen,
  onClose,
  season,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  season?: Season | null;
  onSave: (season: Omit<Season, 'id'>) => void;
}) {
  const [name, setName] = useState(season?.name || '');
  const [startDate, setStartDate] = useState(season?.startDate || '');
  const [endDate, setEndDate] = useState(season?.endDate || '');
  const [color, setColor] = useState(season?.color || '#3B82F6');

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const handleSubmit = () => {
    if (!name.trim() || !startDate || !endDate) return;
    onSave({ name, startDate, endDate, color });
    onClose();
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">{season ? 'Saison bearbeiten' : 'Neue Saison'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="h-5 w-5 text-slate-500" /></button>
        </div>
        <div className="p-6 space-y-6">
          <div><label className="block text-sm font-medium text-slate-700 mb-2">Name *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Hauptsaison" className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Von *</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Bis *</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900" /></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Farbe</label>
            <div className="flex gap-2">
              {colors.map((c) => (<button key={c} onClick={() => setColor(c)} className={`w-10 h-10 rounded-xl ${color === c ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : ''}`} style={{ backgroundColor: c }} />))}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-100 bg-white">
          <button onClick={handleSubmit} disabled={!name.trim() || !startDate || !endDate} className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50">{season ? 'Speichern' : 'Saison anlegen'}</button>
        </div>
      </div>
    </>
  );
}

function MealPlanDrawer({
  isOpen,
  onClose,
  mealPlan,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  mealPlan?: MealPlan | null;
  onSave: (mp: Omit<MealPlan, 'id'>) => void;
}) {
  const [name, setName] = useState(mealPlan?.name || '');
  const [code, setCode] = useState(mealPlan?.code || '');
  const [pricePerPerson, setPricePerPerson] = useState(mealPlan?.pricePerPerson || 0);

  const handleSubmit = () => {
    if (!name.trim() || !code.trim()) return;
    onSave({ name, code, pricePerPerson });
    onClose();
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">{mealPlan ? 'Verpflegung bearbeiten' : 'Neue Verpflegungsart'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="h-5 w-5 text-slate-500" /></button>
        </div>
        <div className="p-6 space-y-6">
          <div><label className="block text-sm font-medium text-slate-700 mb-2">Name *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Halbpension" className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-2">Kürzel *</label><input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="z.B. HP" maxLength={4} className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-2">Aufpreis pro Person/Nacht</label><div className="relative"><Euro className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input type="number" value={pricePerPerson} onChange={(e) => setPricePerPerson(parseFloat(e.target.value) || 0)} min={0} step={0.5} className="w-full pl-10 pr-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900" /></div></div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-100 bg-white">
          <button onClick={handleSubmit} disabled={!name.trim() || !code.trim()} className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50">{mealPlan ? 'Speichern' : 'Verpflegung anlegen'}</button>
        </div>
      </div>
    </>
  );
}

function RateDrawer({
  isOpen,
  onClose,
  rate,
  categories,
  seasons,
  mealPlans,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  rate?: Rate | null;
  categories: RoomCategory[];
  seasons: Season[];
  mealPlans: MealPlan[];
  onSave: (rate: Omit<Rate, 'id'>) => void;
}) {
  const [name, setName] = useState(rate?.name || '');
  const [categoryId, setCategoryId] = useState(rate?.categoryId || categories[0]?.id || '');
  const [seasonId, setSeasonId] = useState(rate?.seasonId || seasons[0]?.id || '');
  const [mealPlanId, setMealPlanId] = useState(rate?.mealPlanId || mealPlans[0]?.id || '');
  const [price1to3, setPrice1to3] = useState(rate?.price1to3 || 0);
  const [price4to6, setPrice4to6] = useState(rate?.price4to6 || 0);
  const [price7plus, setPrice7plus] = useState(rate?.price7plus || 0);

  const handleSubmit = () => {
    if (!name.trim() || !categoryId || !seasonId || !mealPlanId) return;
    onSave({ name, categoryId, seasonId, mealPlanId, price1to3, price4to6, price7plus });
    onClose();
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 overflow-auto ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-slate-900">{rate ? 'Rate bearbeiten' : 'Neue Rate'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="h-5 w-5 text-slate-500" /></button>
        </div>
        <div className="p-6 space-y-6 pb-32">
          <div><label className="block text-sm font-medium text-slate-700 mb-2">Name *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Standard Rate" className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-2">Kategorie</label><select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900">{categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-2">Saison</label><select value={seasonId} onChange={(e) => setSeasonId(e.target.value)} className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900">{seasons.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}</select></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-2">Verpflegung</label><select value={mealPlanId} onChange={(e) => setMealPlanId(e.target.value)} className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900">{mealPlans.map((m) => (<option key={m.id} value={m.id}>{m.name} ({m.code})</option>))}</select></div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Preise pro Nacht</label>
            <div className="space-y-3">
              <div className="flex items-center gap-4"><span className="text-sm text-slate-500 w-24">1-3 Nächte</span><div className="relative flex-1"><Euro className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input type="number" value={price1to3} onChange={(e) => setPrice1to3(parseFloat(e.target.value) || 0)} min={0} className="w-full pl-10 pr-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900" /></div></div>
              <div className="flex items-center gap-4"><span className="text-sm text-slate-500 w-24">4-6 Nächte</span><div className="relative flex-1"><Euro className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input type="number" value={price4to6} onChange={(e) => setPrice4to6(parseFloat(e.target.value) || 0)} min={0} className="w-full pl-10 pr-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900" /></div></div>
              <div className="flex items-center gap-4"><span className="text-sm text-slate-500 w-24">Ab 7 Nächte</span><div className="relative flex-1"><Euro className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input type="number" value={price7plus} onChange={(e) => setPrice7plus(parseFloat(e.target.value) || 0)} min={0} className="w-full pl-10 pr-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900" /></div></div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-100 bg-white">
          <button onClick={handleSubmit} disabled={!name.trim()} className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50">{rate ? 'Speichern' : 'Rate anlegen'}</button>
        </div>
      </div>
    </>
  );
}

// ============ MAIN PAGE ============

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<'rooms' | 'categories' | 'pricing' | 'sync'>('rooms');
  const [pricingTab, setPricingTab] = useState<'seasons' | 'mealplans' | 'rates'>('seasons');

  // Categories State
  const [categories, setCategories] = useState<RoomCategory[]>([
    { id: '1', name: 'Doppelzimmer', description: 'Komfortable Doppelzimmer', color: '#3B82F6', maxOccupancy: 3 },
    { id: '2', name: 'Suite', description: 'Luxuriöse Suiten mit Seeblick', color: '#8B5CF6', maxOccupancy: 4 },
    { id: '3', name: 'Einzelzimmer', description: 'Gemütliche Einzelzimmer', color: '#10B981', maxOccupancy: 1 },
  ]);
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<RoomCategory | null>(null);

  // Rooms State
  const [rooms, setRooms] = useState<Room[]>([
    { id: '1', categoryId: '1', name: 'Doppelzimmer Seeblick', number: '101', description: 'Mit Balkon und Seeblick', photos: [], minOccupancy: 1, standardOccupancy: 2, maxOccupancy: 3, extraBeds: 1 },
    { id: '2', categoryId: '1', name: 'Doppelzimmer Bergblick', number: '102', description: 'Mit Blick auf die Berge', photos: [], minOccupancy: 1, standardOccupancy: 2, maxOccupancy: 2, extraBeds: 0 },
    { id: '3', categoryId: '2', name: 'Suite Panorama', number: '201', description: 'Große Suite mit 180° Seeblick', photos: [], minOccupancy: 2, standardOccupancy: 2, maxOccupancy: 4, extraBeds: 2 },
    { id: '4', categoryId: '3', name: 'Einzelzimmer Standard', number: '301', description: '', photos: [], minOccupancy: 1, standardOccupancy: 1, maxOccupancy: 1, extraBeds: 0 },
  ]);
  const [roomDrawerOpen, setRoomDrawerOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Seasons State
  const [seasons, setSeasons] = useState<Season[]>([
    { id: '1', name: 'Nebensaison', startDate: '2025-01-01', endDate: '2025-05-31', color: '#10B981' },
    { id: '2', name: 'Hauptsaison', startDate: '2025-06-01', endDate: '2025-09-15', color: '#EF4444' },
    { id: '3', name: 'Zwischensaison', startDate: '2025-09-16', endDate: '2025-12-31', color: '#F59E0B' },
  ]);
  const [seasonDrawerOpen, setSeasonDrawerOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);

  // Meal Plans State
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([
    { id: '1', name: 'Nur Übernachtung', code: 'RO', pricePerPerson: 0 },
    { id: '2', name: 'Frühstück', code: 'BB', pricePerPerson: 15 },
    { id: '3', name: 'Halbpension', code: 'HP', pricePerPerson: 35 },
  ]);
  const [mealPlanDrawerOpen, setMealPlanDrawerOpen] = useState(false);
  const [editingMealPlan, setEditingMealPlan] = useState<MealPlan | null>(null);

  // Rates State
  const [rates, setRates] = useState<Rate[]>([
    { id: '1', name: 'DZ Standard Hauptsaison', categoryId: '1', seasonId: '2', mealPlanId: '2', price1to3: 150, price4to6: 140, price7plus: 130 },
    { id: '2', name: 'DZ Standard Nebensaison', categoryId: '1', seasonId: '1', mealPlanId: '2', price1to3: 120, price4to6: 110, price7plus: 100 },
  ]);
  const [rateDrawerOpen, setRateDrawerOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<Rate | null>(null);

  // Handlers
  const handleSaveCategory = (data: Omit<RoomCategory, 'id'>) => {
    if (editingCategory) {
      setCategories(categories.map(c => c.id === editingCategory.id ? { ...c, ...data } : c));
    } else {
      setCategories([...categories, { ...data, id: Date.now().toString() }]);
    }
    setEditingCategory(null);
  };

  const handleSaveRoom = (data: Omit<Room, 'id'>) => {
    if (editingRoom) {
      setRooms(rooms.map(r => r.id === editingRoom.id ? { ...r, ...data } : r));
    } else {
      setRooms([...rooms, { ...data, id: Date.now().toString() }]);
    }
    setEditingRoom(null);
  };

  const handleSaveSeason = (data: Omit<Season, 'id'>) => {
    if (editingSeason) {
      setSeasons(seasons.map(s => s.id === editingSeason.id ? { ...s, ...data } : s));
    } else {
      setSeasons([...seasons, { ...data, id: Date.now().toString() }]);
    }
    setEditingSeason(null);
  };

  const handleSaveMealPlan = (data: Omit<MealPlan, 'id'>) => {
    if (editingMealPlan) {
      setMealPlans(mealPlans.map(m => m.id === editingMealPlan.id ? { ...m, ...data } : m));
    } else {
      setMealPlans([...mealPlans, { ...data, id: Date.now().toString() }]);
    }
    setEditingMealPlan(null);
  };

  const handleSaveRate = (data: Omit<Rate, 'id'>) => {
    if (editingRate) {
      setRates(rates.map(r => r.id === editingRate.id ? { ...r, ...data } : r));
    } else {
      setRates([...rates, { ...data, id: Date.now().toString() }]);
    }
    setEditingRate(null);
  };

  const roomsByCategory = categories.map(cat => ({ category: cat, rooms: rooms.filter(r => r.categoryId === cat.id) }));

  const sections = [
    { id: 'rooms' as const, name: 'Zimmer', icon: Hotel },
    { id: 'categories' as const, name: 'Kategorien', icon: Layers },
    { id: 'pricing' as const, name: 'Preise', icon: Euro },
    { id: 'sync' as const, name: 'Sync', icon: RefreshCw },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Einstellungen</h1>
        <p className="text-slate-500">Zimmer, Kategorien und Preise verwalten</p>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {sections.map((section) => (
          <button key={section.id} onClick={() => setActiveSection(section.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeSection === section.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            <section.icon className="h-4 w-4" />{section.name}
          </button>
        ))}
      </div>

      {/* ROOMS */}
      {activeSection === 'rooms' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Zimmer</h2>
            <button onClick={() => { setEditingRoom(null); setRoomDrawerOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800"><Plus className="h-4 w-4" />Zimmer anlegen</button>
          </div>
          <div className="space-y-8">
            {roomsByCategory.map(({ category, rooms: catRooms }) => (
              <div key={category.id}>
                <div className="flex items-center gap-3 mb-3"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} /><h3 className="font-medium text-slate-700">{category.name}</h3><span className="text-sm text-slate-400">{catRooms.length} Zimmer</span></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catRooms.map((room) => (
                    <div key={room.id} className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div><p className="font-medium text-slate-900">{room.name}</p><p className="text-sm text-slate-500">Nr. {room.number}</p></div>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingRoom(room); setRoomDrawerOpen(true); }} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg"><Settings className="h-4 w-4" /></button>
                          <button onClick={() => setRooms(rooms.filter(r => r.id !== room.id))} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1"><Users className="h-4 w-4" /><span>{room.minOccupancy}-{room.maxOccupancy}</span></div>
                        {room.extraBeds > 0 && <div className="flex items-center gap-1"><BedDouble className="h-4 w-4" /><span>+{room.extraBeds}</span></div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CATEGORIES */}
      {activeSection === 'categories' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Zimmerkategorien</h2>
            <button onClick={() => { setEditingCategory(null); setCategoryDrawerOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800"><Plus className="h-4 w-4" />Kategorie anlegen</button>
          </div>
          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: category.color }} />
                <div className="flex-1 min-w-0"><p className="font-medium text-slate-900">{category.name}</p>{category.description && <p className="text-sm text-slate-500">{category.description}</p>}<p className="text-xs text-slate-400">Max. {category.maxOccupancy} Personen</p></div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditingCategory(category); setCategoryDrawerOpen(true); }} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded-lg">Bearbeiten</button>
                  <button onClick={() => setCategories(categories.filter(c => c.id !== category.id))} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PRICING */}
      {activeSection === 'pricing' && (
        <div>
          {/* Pricing Sub-Tabs */}
          <div className="flex gap-2 mb-6">
            <button onClick={() => setPricingTab('seasons')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${pricingTab === 'seasons' ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}><Calendar className="h-4 w-4" />Saisonzeiten</button>
            <button onClick={() => setPricingTab('mealplans')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${pricingTab === 'mealplans' ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}><Coffee className="h-4 w-4" />Verpflegung</button>
            <button onClick={() => setPricingTab('rates')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${pricingTab === 'rates' ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}><Euro className="h-4 w-4" />Raten</button>
          </div>

          {/* Seasons */}
          {pricingTab === 'seasons' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900">Saisonzeiten</h2>
                <button onClick={() => { setEditingSeason(null); setSeasonDrawerOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800"><Plus className="h-4 w-4" />Saison anlegen</button>
              </div>
              <div className="space-y-2">
                {seasons.map((season) => (
                  <div key={season.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: season.color }} />
                    <div className="flex-1"><p className="font-medium text-slate-900">{season.name}</p><p className="text-sm text-slate-500">{new Date(season.startDate).toLocaleDateString('de-DE')} - {new Date(season.endDate).toLocaleDateString('de-DE')}</p></div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditingSeason(season); setSeasonDrawerOpen(true); }} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded-lg">Bearbeiten</button>
                      <button onClick={() => setSeasons(seasons.filter(s => s.id !== season.id))} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meal Plans */}
          {pricingTab === 'mealplans' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900">Verpflegungsarten</h2>
                <button onClick={() => { setEditingMealPlan(null); setMealPlanDrawerOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800"><Plus className="h-4 w-4" />Verpflegung anlegen</button>
              </div>
              <div className="space-y-2">
                {mealPlans.map((mp) => (
                  <div key={mp.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <div className="h-10 w-10 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0"><span className="text-xs font-bold text-slate-600">{mp.code}</span></div>
                    <div className="flex-1"><p className="font-medium text-slate-900">{mp.name}</p><p className="text-sm text-slate-500">{mp.pricePerPerson > 0 ? `+€${mp.pricePerPerson.toFixed(2)} pro Person/Nacht` : 'Inkludiert'}</p></div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditingMealPlan(mp); setMealPlanDrawerOpen(true); }} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded-lg">Bearbeiten</button>
                      <button onClick={() => setMealPlans(mealPlans.filter(m => m.id !== mp.id))} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rates */}
          {pricingTab === 'rates' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900">Raten</h2>
                <button onClick={() => { setEditingRate(null); setRateDrawerOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800"><Plus className="h-4 w-4" />Rate anlegen</button>
              </div>

              {/* Rates grouped by Category */}
              <div className="space-y-6">
                {categories.map((category) => {
                  const categoryRates = rates.filter(r => r.categoryId === category.id);
                  if (categoryRates.length === 0) return null;

                  return (
                    <div key={category.id}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                        <h3 className="font-medium text-slate-700">{category.name}</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="text-left text-xs text-slate-500">
                              <th className="pb-2 font-medium">Rate</th>
                              <th className="pb-2 font-medium">Saison</th>
                              <th className="pb-2 font-medium">Verpflegung</th>
                              <th className="pb-2 font-medium text-right">1-3 Nächte</th>
                              <th className="pb-2 font-medium text-right">4-6 Nächte</th>
                              <th className="pb-2 font-medium text-right">Ab 7 Nächte</th>
                              <th className="pb-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {categoryRates.map((rate) => {
                              const season = seasons.find(s => s.id === rate.seasonId);
                              const mealPlan = mealPlans.find(m => m.id === rate.mealPlanId);
                              return (
                                <tr key={rate.id} className="border-t border-slate-100">
                                  <td className="py-3 font-medium text-slate-900">{rate.name}</td>
                                  <td className="py-3"><span className="inline-flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: season?.color }} />{season?.name}</span></td>
                                  <td className="py-3"><span className="text-xs bg-slate-100 px-2 py-1 rounded">{mealPlan?.code}</span></td>
                                  <td className="py-3 text-right font-medium">€{rate.price1to3.toFixed(0)}</td>
                                  <td className="py-3 text-right font-medium">€{rate.price4to6.toFixed(0)}</td>
                                  <td className="py-3 text-right font-medium">€{rate.price7plus.toFixed(0)}</td>
                                  <td className="py-3 text-right">
                                    <button onClick={() => { setEditingRate(rate); setRateDrawerOpen(true); }} className="text-slate-400 hover:text-slate-600"><Settings className="h-4 w-4" /></button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SYNC */}
      {activeSection === 'sync' && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-6">CapCorn Bridge Sync</h2>
          <div className="bg-slate-50 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Nicht verbunden</p>
                <p className="text-sm text-slate-500">Starte die CapCorn Bridge auf deinem Hotel-PC</p>
              </div>
            </div>
            <div className="space-y-3">
              <button className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800">Verbindung testen</button>
              <button className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200">Daten synchronisieren</button>
            </div>
          </div>
        </div>
      )}

      {/* Drawers */}
      <CategoryDrawer isOpen={categoryDrawerOpen} onClose={() => { setCategoryDrawerOpen(false); setEditingCategory(null); }} category={editingCategory} onSave={handleSaveCategory} />
      <RoomDrawer isOpen={roomDrawerOpen} onClose={() => { setRoomDrawerOpen(false); setEditingRoom(null); }} room={editingRoom} categories={categories} onSave={handleSaveRoom} />
      <SeasonDrawer isOpen={seasonDrawerOpen} onClose={() => { setSeasonDrawerOpen(false); setEditingSeason(null); }} season={editingSeason} onSave={handleSaveSeason} />
      <MealPlanDrawer isOpen={mealPlanDrawerOpen} onClose={() => { setMealPlanDrawerOpen(false); setEditingMealPlan(null); }} mealPlan={editingMealPlan} onSave={handleSaveMealPlan} />
      <RateDrawer isOpen={rateDrawerOpen} onClose={() => { setRateDrawerOpen(false); setEditingRate(null); }} rate={editingRate} categories={categories} seasons={seasons} mealPlans={mealPlans} onSave={handleSaveRate} />
    </div>
  );
}
