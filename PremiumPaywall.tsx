import React from 'react';
import { Crown } from 'lucide-react';

interface PremiumPaywallProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  featureName?: string;
}

const PremiumPaywall: React.FC<PremiumPaywallProps> = ({ isOpen, onClose, onUpgrade, featureName = "This feature" }) => {
  if (!isOpen) return null;

  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleUpgrade = () => {
    setIsProcessing(true);
    // Simulate a payment delay
    setTimeout(() => {
      setIsProcessing(false);
      onUpgrade();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-sm max-h-[90vh] bg-slate-950 border border-slate-800 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl overflow-y-auto overflow-x-hidden no-scrollbar animate-in zoom-in-95 duration-300">
        {/* Decorative background */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-sky-500/20 blur-[50px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/20 blur-[50px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center">
          {isProcessing ? (
            <div className="py-20 flex flex-col items-center">
              <div className="w-20 h-20 relative mb-8">
                <div className="absolute inset-0 border-4 border-sky-500/10 rounded-full" />
                <div className="absolute inset-0 border-4 border-transparent border-t-sky-500 rounded-full animate-spin shadow-[0_0_15px_rgba(14,165,233,0.5)]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Crown className="w-8 h-8 text-sky-400 animate-pulse" />
                </div>
              </div>
              <p className="text-white font-black italic tracking-[0.3em] uppercase text-xs animate-pulse">Initializing Slyd+</p>
              <p className="text-slate-500 text-[10px] uppercase font-bold mt-2">Securing your premium status...</p>
            </div>
          ) : (
            <>
              <div className="w-20 h-20 bg-gradient-to-br from-sky-400 via-sky-500 to-indigo-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(14,165,233,0.3)] border-2 border-white/20 animate-in zoom-in duration-500">
                <Crown className="w-10 h-10 text-white drop-shadow-lg" />
              </div>

              <h2 className="text-3xl font-black italic tracking-tighter text-white mb-2 uppercase font-display">
                Slyd<span className="text-sky-500">+</span>
              </h2>
              <div className="px-2 py-1 bg-sky-500/10 border border-sky-500/20 rounded-lg inline-flex items-center gap-1.5 mb-6">
                <span className="text-[10px] font-black text-sky-500 uppercase tracking-widest">Premium Access</span>
              </div>

              <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                Unlock <strong className="text-white italic">{featureName}</strong> and elevate your experience with our most powerful tools.
              </p>

              <div className="w-full space-y-4 mb-10 text-left bg-slate-900/40 p-6 rounded-3xl border border-slate-800">
                {[
                  { name: 'See Who Liked You', desc: 'No more guessing. See lists immediately.' },
                  { name: 'Advanced Filters', desc: 'Filter by height, weight, race, and roles.' },
                  { name: 'Incognito Mode', desc: 'Browse profiles without being seen.' },
                  { name: 'Unlimited Icebreakers', desc: 'Let Gemini write the perfect first line.' },
                  { name: 'Priority Verification', desc: 'Get the verified badge faster.' }
                ].map((feature, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-5 h-5 rounded-full bg-sky-500/10 flex items-center justify-center shrink-0 mt-0.5 border border-sky-500/20">
                      <svg className="w-3 h-3 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-black text-white uppercase tracking-tighter">{feature.name}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="w-full bg-gradient-to-r from-sky-500/10 to-indigo-500/10 p-5 rounded-2xl border border-sky-500/20 mb-8 relative group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-sky-500/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <div className="flex justify-between items-center relative z-10">
                  <div className="text-left">
                    <span className="block text-[10px] font-black text-sky-500 uppercase tracking-widest">Pro Membership</span>
                    <span className="text-white font-black text-lg">$9.99<span className="text-xs text-slate-500 font-medium">/mo</span></span>
                  </div>
                  <div className="bg-sky-500 text-slate-950 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">Best Value</div>
                </div>
              </div>

              <button 
                onClick={handleUpgrade}
                className="w-full py-5 bg-gradient-to-r from-sky-400 to-indigo-600 text-white font-black rounded-2xl shadow-[0_10px_30px_rgba(14,165,233,0.3)] uppercase tracking-[0.25em] text-xs active:scale-[0.98] transition-all mb-6 hover:shadow-sky-500/40"
              >
                Upgrade Now
              </button>
              
              <button 
                onClick={onClose}
                className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-slate-300 transition-colors"
              >
                Continue for free
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PremiumPaywall;
