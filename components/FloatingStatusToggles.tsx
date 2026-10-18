import React from 'react';
import { Home, Car, Sparkles } from 'lucide-react';

interface FloatingStatusTogglesProps {
  isHosting: boolean;
  isTraveling: boolean;
  onToggleHosting: () => void;
  onToggleTraveling: () => void;
  className?: string;
}

export const FloatingStatusToggles: React.FC<FloatingStatusTogglesProps> = ({
  isHosting,
  isTraveling,
  onToggleHosting,
  onToggleTraveling,
  className = ''
}) => {
  const isBoth = isHosting && isTraveling;

  return (
    <div className={`flex items-center justify-center gap-2 select-none z-30 ${className}`}>
      {/* Container pill with glassmorphism */}
      <div className="flex items-center p-1.5 rounded-full bg-slate-950/85 backdrop-blur-xl border border-slate-800 shadow-[0_8px_32px_rgba(0,0,0,0.6)] gap-1.5">
        
        {/* Toggle 1: Host */}
        <button
          type="button"
          onClick={onToggleHosting}
          className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 ${
            isHosting
              ? 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.55)] border border-emerald-300'
              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-850 border border-transparent'
          }`}
          aria-pressed={isHosting}
          title="Toggle Host Status (You have a place to host right now)"
        >
          <Home className={`w-3.5 h-3.5 ${isHosting ? 'stroke-[2.5]' : ''}`} />
          <span>Host</span>
          {isHosting && (
            <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse ml-0.5" />
          )}
        </button>

        {/* Toggle 2: Travel */}
        <button
          type="button"
          onClick={onToggleTraveling}
          className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 ${
            isTraveling
              ? 'bg-sky-400 text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.55)] border border-sky-200'
              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-850 border border-transparent'
          }`}
          aria-pressed={isTraveling}
          title="Toggle Travel Status (You are mobile and ready to travel right now)"
        >
          <Car className={`w-3.5 h-3.5 ${isTraveling ? 'stroke-[2.5]' : ''}`} />
          <span>Travel</span>
          {isTraveling && (
            <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse ml-0.5" />
          )}
        </button>

        {/* Dual Combination Indicator */}
        {isBoth && (
          <span className="px-2 py-0.5 mr-1 rounded-full bg-gradient-to-r from-emerald-400/20 to-sky-400/20 border border-emerald-400/40 text-[9px] font-black uppercase tracking-widest text-emerald-300 flex items-center gap-1 animate-pulse">
            <Sparkles className="w-2.5 h-2.5 text-sky-400" />
            <span>Both Active</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default FloatingStatusToggles;
