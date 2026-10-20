import React, { useState } from 'react';
import { AppView } from '../types';
import Logo from './Logo';
import { Crown, Shield, ShieldCheck, X, CheckCircle2 } from 'lucide-react';

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
  const [showShieldModal, setShowShieldModal] = useState(false);

  return (
    <>
      <header className="h-20 bg-black/95 backdrop-blur-md border-b border-slate-900/80 grid grid-cols-3 items-center px-4 sticky top-0 z-40 shrink-0">
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

          {/* SlyD Shield Network Status Indicator */}
          <button
            onClick={() => setShowShieldModal(true)}
            className="flex items-center gap-1.5 bg-sky-950/70 hover:bg-sky-900/70 border border-sky-500/40 px-2.5 py-1.5 rounded-xl text-sky-300 shadow-[0_0_12px_rgba(14,165,233,0.2)] transition-all active:scale-95"
            title="SlyD Shield™ 100% Real Guys - Tap for Info"
          >
            <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">
              Shield Verified
            </span>
          </button>

          {isAdmin && (
            <button
              onClick={onOpenAdmin}
              className="p-2 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-800/60 rounded-2xl text-purple-300 transition-all flex items-center gap-1.5 shadow-lg shadow-purple-950/30 active:scale-95"
              title="Administrator Control Center"
            >
              <Shield className="w-4 h-4 text-purple-400" />
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-wider">Admin</span>
            </button>
          )}
        </div>
        
        <div className="flex justify-center items-center py-1 h-full relative">
          <Logo size="md" variant="wordmark" className="[&_img]:h-16" />
          {isPremium && (
            <div className="absolute -top-1 -right-3 animate-bounce">
              <Crown className="w-3.5 h-3.5 text-sky-400 fill-sky-400 shadow-sky-500/50" />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
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

      {/* SlyD Shield Information Modal */}
      {showShieldModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-950 border border-sky-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-[0_0_40px_rgba(14,165,233,0.25)] relative text-white">
            <button
              onClick={() => setShowShieldModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900/60"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-400/50 flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.3)]">
                <ShieldCheck className="w-6 h-6 text-sky-400" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase tracking-tight font-display">
                  SlyD Shield™ 🛡️
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-400">
                  100% Real Guys • Zero Bots
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-900/70 border border-sky-500/30 rounded-2xl">
              <p className="text-xs text-sky-300 font-semibold leading-relaxed">
                "To keep SlyD free of catfishes and spam, every member completes a 10-second SlyD Shield check."
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span><strong>Mandatory Enforcement:</strong> Zero unverified users can access the grid.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span><strong>Live Pose Verification:</strong> Randomized real-time gestures prevent bots, 3D masks, and static images.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span><strong>Private & Encrypted:</strong> Verification checks are never posted publicly.</span>
              </div>
            </div>

            <button
              onClick={() => setShowShieldModal(false)}
              className="w-full py-3.5 bg-sky-500 text-white font-black uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-sky-950/40 active:scale-95 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
