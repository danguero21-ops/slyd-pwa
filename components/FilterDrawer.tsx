import React from 'react';
import { Filters } from '../types';
import { INTERESTS, RACES } from '../constants';
import { Crown, Lock } from 'lucide-react';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: Filters;
  onUpdateFilters: (filters: Filters) => void;
  isPremium?: boolean;
  onPremiumClick?: () => void;
}

const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  onUpdateFilters,
  isPremium = false,
  onPremiumClick
}) => {
  if (!isOpen) return null;

  const roles = ['Top', 'Bottom', 'Vers', 'Side'];
  const relationshipStatuses = ['Single', 'Married', 'Open', 'Partnered'];
  const lookingForOptions = ['Friends', 'Dates', 'Right Now', 'Relationship', 'Chat'];
  const hostTravelOptions = ['Host', 'Travel', 'Both', 'Ask'];

  const requirePremiumOrRun = (action: () => void) => {
    if (!isPremium && onPremiumClick) {
      onPremiumClick();
      return;
    }
    action();
  };

  const toggleListFilter = (category: keyof Filters, value: string, isProCategory = false) => {
    if (isProCategory && !isPremium && onPremiumClick) {
      onPremiumClick();
      return;
    }
    const current = filters[category] as string[];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    onUpdateFilters({ ...filters, [category]: updated });
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'min' | 'max') => {
    const val = parseInt(e.target.value);
    if (type === 'min') {
      const newMin = Math.min(val, filters.maxAge);
      onUpdateFilters({ ...filters, minAge: newMin });
    } else {
      const newMax = Math.max(val, filters.minAge);
      onUpdateFilters({ ...filters, maxAge: newMax });
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'min' | 'max') => {
    if (!isPremium && onPremiumClick) {
      onPremiumClick();
      return;
    }
    const val = parseInt(e.target.value);
    if (type === 'min') {
      const newMin = Math.min(val, filters.heightRange[1]);
      onUpdateFilters({ ...filters, heightRange: [newMin, filters.heightRange[1]] });
    } else {
      const newMax = Math.max(val, filters.heightRange[0]);
      onUpdateFilters({ ...filters, heightRange: [filters.heightRange[0], newMax] });
    }
  };

  const formatHeight = (inches: number) => {
    const f = Math.floor(inches / 12);
    const i = inches % 12;
    return `${f}'${i}"`;
  };

  const handleClearFilters = () => {
    onUpdateFilters({
      minAge: 18,
      maxAge: 99,
      roles: [],
      relationshipStatuses: [],
      lookingFor: [],
      hostTravel: [],
      races: [],
      interests: [],
      heightRange: [48, 96],
      sortBy: 'distance'
    });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-950 rounded-t-[2.5rem] border-t border-slate-800 p-8 space-y-8 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto overflow-x-hidden no-scrollbar">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black text-slate-100 italic tracking-tighter">FILTERS</h2>
            <button
              onClick={handleClearFilters}
              className="text-[10px] font-black text-sky-400 uppercase tracking-widest hover:text-sky-300 transition-colors pt-1"
            >
              Clear All
            </button>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-900 rounded-2xl text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Slyd+ Pro Filters Status Banner */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
          isPremium
            ? 'bg-sky-500/10 border-sky-500/30'
            : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isPremium ? 'bg-sky-500 text-white' : 'bg-slate-800 text-sky-400'
            }`}>
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                {isPremium ? 'Slyd+ Pro Filters Unlocked' : 'Unlock Pro Discovery Filters'}
              </p>
              <p className="text-[11px] text-slate-400">
                {isPremium
                  ? 'Height, Role, Ethnicity, Hosting & Status filters active'
                  : 'Upgrade to Slyd+ to filter by Role, Height, Ethnicity & Hosting'}
              </p>
            </div>
          </div>
          {!isPremium && onPremiumClick && (
            <button
              type="button"
              onClick={onPremiumClick}
              className="px-3 py-1.5 rounded-xl bg-sky-500 text-white text-xs font-black shrink-0"
            >
              Unlock
            </button>
          )}
        </div>

        <section className={`space-y-3 p-3.5 rounded-2xl border transition-all ${
          isPremium
            ? 'bg-cyan-950/25 border-cyan-400/50'
            : 'bg-slate-900/35 border-slate-800/80 opacity-60 grayscale'
        }`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-[10px] font-black uppercase tracking-widest ${isPremium ? 'text-cyan-300' : 'text-slate-500'}`}>Quick Pro Switches</h3>
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 ${
              isPremium ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              {isPremium ? <Crown className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
              <span>{isPremium ? 'Slyd+ Active' : 'Slyd+ · Locked'}</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'onlineOnly', label: 'Online Now' },
              { key: 'verifiedOnly', label: 'Verified Only' },
              { key: 'hasPhotosOnly', label: 'With Photos' }
            ].map(item => {
              const isActive = Boolean((filters as any)[item.key]);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => requirePremiumOrRun(() => {
                    onUpdateFilters({ ...filters, [item.key]: !isActive });
                  })}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    isActive && isPremium
                      ? 'bg-cyan-400 border-cyan-300 text-slate-950 shadow-lg shadow-cyan-900/40'
                      : isPremium
                      ? 'bg-slate-950/80 border-cyan-500/30 text-cyan-200 hover:border-cyan-400'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  <span>{item.label}</span>
                  {!isPremium && <Lock className="w-3 h-3 text-slate-500 shrink-0" />}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sort By</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Distance', value: 'distance' },
              { label: 'Age', value: 'age' },
              { label: 'Last Seen', value: 'lastSeen' },
              { label: 'Newest', value: 'newest' },
              { label: 'Race', value: 'race' }
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onUpdateFilters({ ...filters, sortBy: opt.value as any })}
                className={`px-3 py-2.5 rounded-2xl text-xs font-bold border transition-all ${
                  filters.sortBy === opt.value ? 'bg-sky-500 border-sky-500 text-white shadow-md shadow-sky-900/30' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Race / Ethnicity
            </h3>
            {filters.races.length > 0 && (
              <button
                type="button"
                onClick={() => onUpdateFilters({ ...filters, races: [] })}
                className="text-[10px] font-bold text-sky-400 hover:text-sky-300"
              >
                All Races
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {RACES.map(race => (
              <button
                key={race}
                type="button"
                onClick={() => toggleListFilter('races', race, false)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  filters.races.includes(race)
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-900/30 border border-sky-400'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {race}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Age Range</h3>
            <span className="text-sky-400 font-bold text-sm tabular-nums">{filters.minAge} — {filters.maxAge}</span>
          </div>
          <div className="flex flex-col gap-6">
            <div className="relative pt-2">
              <span className="absolute -top-4 left-0 text-[8px] font-bold text-slate-600 uppercase">Min Age: {filters.minAge}</span>
              <input
                type="range" min="18" max="99" value={filters.minAge}
                onChange={(e) => handleAgeChange(e, 'min')}
                className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="relative pt-2">
              <span className="absolute -top-4 right-0 text-[8px] font-bold text-slate-600 uppercase">Max Age: {filters.maxAge}</span>
              <input
                type="range" min="18" max="99" value={filters.maxAge}
                onChange={(e) => handleAgeChange(e, 'max')}
                className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Looking For</h3>
          <div className="flex flex-wrap gap-2">
            {lookingForOptions.map(opt => (
              <button
                key={opt}
                onClick={() => toggleListFilter('lookingFor', opt, false)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  filters.lookingFor.includes(opt) ? 'bg-sky-500 text-white' : 'bg-slate-900 text-slate-500 border border-slate-800'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </section>

        {/* SLYD+ PRO FILTERS (Highlighted in cyan when subscribed, Grayed out when not) */}
        <div className={`space-y-6 p-4 rounded-3xl border transition-all ${
          isPremium
            ? 'bg-cyan-950/20 border-cyan-400/50 shadow-lg shadow-cyan-950/30'
            : 'bg-slate-900/35 border-slate-800/80 opacity-60 grayscale'
        }`}>
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isPremium ? 'text-cyan-300' : 'text-slate-400'}`}>
              Slyd+ Pro Precision Filters
            </span>
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 ${
              isPremium ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              {isPremium ? <Crown className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
              <span>{isPremium ? 'Slyd+ Unlocked' : 'Locked · Tap Any to Subscribe'}</span>
            </span>
          </div>

          <section className="space-y-4">
            <div className="flex justify-between items-end">
              <h3 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isPremium ? 'text-cyan-200' : 'text-slate-500'}`}>
                <span>Height Range</span>
                {!isPremium && <Lock className="w-3 h-3 text-slate-500" />}
              </h3>
              <span className={`font-bold text-sm tabular-nums ${isPremium ? 'text-cyan-300' : 'text-slate-500'}`}>{formatHeight(filters.heightRange[0])} — {formatHeight(filters.heightRange[1])}</span>
            </div>
            <div className="flex flex-col gap-6">
              <div className="relative pt-2">
                <input
                  type="range" min="48" max="96" value={filters.heightRange[0]}
                  onChange={(e) => handleHeightChange(e, 'min')}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="relative pt-2">
                <input
                  type="range" min="48" max="96" value={filters.heightRange[1]}
                  onChange={(e) => handleHeightChange(e, 'max')}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className={`text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5 ${isPremium ? 'text-cyan-200' : 'text-slate-500'}`}>
              <span>Role</span>
              {!isPremium && <Lock className="w-3 h-3 text-slate-500" />}
            </h3>
            <div className="flex flex-wrap gap-2">
              {roles.map(role => (
                <button
                  key={role}
                  onClick={() => toggleListFilter('roles', role, true)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    filters.roles.includes(role) && isPremium
                      ? 'bg-cyan-400 text-slate-950 shadow-lg'
                      : isPremium
                      ? 'bg-slate-950/80 text-cyan-200 border border-cyan-500/30 hover:border-cyan-400'
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className={`text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5 ${isPremium ? 'text-cyan-200' : 'text-slate-500'}`}>
              <span>Relationship Status</span>
              {!isPremium && <Lock className="w-3 h-3 text-slate-500" />}
            </h3>
            <div className="flex flex-wrap gap-2">
              {relationshipStatuses.map(status => (
                <button
                  key={status}
                  onClick={() => toggleListFilter('relationshipStatuses', status, true)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    filters.relationshipStatuses.includes(status) && isPremium
                      ? 'bg-cyan-400 text-slate-950 shadow-lg'
                      : isPremium
                      ? 'bg-slate-950/80 text-cyan-200 border border-cyan-500/30 hover:border-cyan-400'
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className={`text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5 ${isPremium ? 'text-cyan-200' : 'text-slate-500'}`}>
              <span>Host / Travel</span>
              {!isPremium && <Lock className="w-3 h-3 text-slate-500" />}
            </h3>
            <div className="flex flex-wrap gap-2">
              {hostTravelOptions.map(opt => (
                <button
                  key={opt}
                  onClick={() => toggleListFilter('hostTravel', opt, true)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                    filters.hostTravel.includes(opt) && isPremium
                      ? 'bg-cyan-400 text-slate-950 shadow-lg'
                      : isPremium
                      ? 'bg-slate-950/80 text-cyan-200 border border-cyan-500/30 hover:border-cyan-400'
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </section>
        </div>

        <section>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Interests</h3>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map(interest => (
              <button
                key={interest}
                onClick={() => toggleListFilter('interests', interest, false)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  filters.interests.includes(interest) ? 'bg-sky-500 text-white' : 'bg-slate-900 text-slate-500 border border-slate-800'
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </section>

        <button
          onClick={onClose}
          className="w-full py-4 bg-sky-500 text-white font-black rounded-2xl shadow-xl shadow-sky-900/40 uppercase tracking-[0.2em] text-sm active:scale-[0.98] transition-all"
        >
          View Matches
        </button>
      </div>
    </div>
  );
};

export default FilterDrawer;
