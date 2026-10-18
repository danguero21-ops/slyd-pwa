
import React from 'react';
import { Filters } from '../types';
import { INTERESTS, RACES } from '../constants';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: Filters;
  onUpdateFilters: (filters: Filters) => void;
  onPremiumClick?: () => void;
}

const FilterDrawer: React.FC<FilterDrawerProps> = ({ isOpen, onClose, filters, onUpdateFilters, onPremiumClick }) => {
  if (!isOpen) return null;

  const roles = ['Top', 'Bottom', 'Vers', 'Side'];
  const relationshipStatuses = ['Single', 'Married', 'Open', 'Partnered'];
  const lookingForOptions = ['Friends', 'Dates', 'Right Now', 'Relationship', 'Chat'];
  const hostTravelOptions = ['Host', 'Travel', 'Both', 'Ask'];

  const toggleListFilter = (category: keyof Filters, value: string) => {
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
    return `${f}'${i}\"`;
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

        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Sort By</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Distance', value: 'distance' },
              { label: 'Age', value: 'age' },
              { label: 'Last Seen', value: 'lastSeen' },
              { label: 'Newest', value: 'newest' }
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => onUpdateFilters({ ...filters, sortBy: opt.value as any })}
                className={`px-4 py-3 rounded-2xl text-xs font-bold border transition-all ${
                  filters.sortBy === opt.value ? 'bg-sky-500 border-sky-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Age Range</h3>
            <span className="text-sky-400 font-bold text-sm">{filters.minAge} — {filters.maxAge}</span>
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

        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Height Range</h3>
            <span className="text-sky-400 font-bold text-sm">{formatHeight(filters.heightRange[0])} — {formatHeight(filters.heightRange[1])}</span>
          </div>
          <div className="flex flex-col gap-6">
             <div className="relative pt-2">
                <input 
                  type="range" min="48" max="96" value={filters.heightRange[0]} 
                  onChange={(e) => handleHeightChange(e, 'min')}
                  className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
             </div>
             <div className="relative pt-2">
                <input 
                  type="range" min="48" max="96" value={filters.heightRange[1]} 
                  onChange={(e) => handleHeightChange(e, 'max')}
                  className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
             </div>
          </div>
        </section>

        <section>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Role</h3>
          <div className="flex flex-wrap gap-2">
            {roles.map(role => (
              <button
                key={role}
                onClick={() => toggleListFilter('roles', role)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  filters.roles.includes(role) ? 'bg-sky-500 text-white shadow-lg' : 'bg-slate-900 text-slate-500 border border-slate-800'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Race</h3>
          <div className="flex flex-wrap gap-2">
            {RACES.map(race => (
              <button
                key={race}
                onClick={() => toggleListFilter('races', race)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  filters.races.includes(race) ? 'bg-sky-500 text-white shadow-lg' : 'bg-slate-900 text-slate-500 border border-slate-800'
                }`}
              >
                {race}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Host / Travel</h3>
          <div className="flex flex-wrap gap-2">
            {hostTravelOptions.map(opt => (
              <button
                key={opt}
                onClick={() => toggleListFilter('hostTravel', opt)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                  filters.hostTravel.includes(opt) ? 'bg-sky-500 text-white' : 'bg-slate-900 text-slate-500 border border-slate-800'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Interests</h3>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map(interest => (
              <button
                key={interest}
                onClick={() => toggleListFilter('interests', interest)}
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
