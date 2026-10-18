
import React from 'react';
import { AppView } from '../types';
import Logo from './Logo';
import { Crown, Shield } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  view: AppView;
  onBack: () => void;
  onOpenFilters?: () => void;
  isPremium?: boolean;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  view, 
  onBack, 
  onOpenFilters, 
  isPremium, 
  isAdmin, 
  onOpenAdmin 
}) => {
  return (
    <header className="h-[120px] bg-black/95 backdrop-blur-md border-b border-slate-900/80 grid grid-cols-3 items-center px-4 sticky top-0 z-40 shrink-0">
      <div className="flex justify-start items-center gap-2">
        {(view === 'chat' || view === 'profile') && (
          <button 
            onClick={onBack} 
            className="p-2.5 bg-slate-900/50 hover:bg-slate-900 rounded-2xl transition-all text-sky-400 border border-slate-800 active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            onClick={onOpenAdmin}
            className="p-2 bg-sky-950/50 hover:bg-sky-900/50 border border-sky-500/40 rounded-2xl text-sky-300 transition-all flex items-center gap-1.5 shadow-lg shadow-sky-950/30 active:scale-95"
            title="Administrator Control Center"
          >
            <Shield className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline text-[10px] font-black uppercase tracking-wider">Admin</span>
          </button>
        )}
      </div>
      
      <div className="flex justify-center items-center py-1 h-full relative">
        <Logo size="md" variant="wordmark" imgClassName="h-[114px]" className="[&_img]:h-[114px]" />
        {isPremium && (
          <div className="absolute top-2 -right-3 animate-bounce">
            <Crown className="w-3.5 h-3.5 text-sky-500 fill-sky-500 shadow-sky-500/50" />
          </div>
        )}
      </div>

      <div className="flex justify-end items-center gap-2">
        <PWAInstallButton variant="compact" />
        {(view === 'grid' || view === 'map') && (
          <button 
            onClick={onOpenFilters}
            className="p-2.5 bg-slate-900/50 rounded-2xl text-sky-400 border border-slate-800 hover:bg-slate-900 transition-all shadow-lg shadow-sky-900/10 active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
