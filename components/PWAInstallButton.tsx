import React, { useState } from 'react';
import { Download, Share, PlusSquare, X, Smartphone, CheckCircle2 } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../src/hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'card' | 'pill';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {variant === 'compact' && (
        <button
          onClick={handleClick}
          title="Install Slyd App"
          className="p-2.5 bg-sky-500/15 hover:bg-sky-500/25 rounded-2xl text-sky-400 border border-sky-500/30 transition-all shadow-lg shadow-sky-900/10 active:scale-95 flex items-center gap-1.5"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline text-[10px] font-black uppercase tracking-wider">Install</span>
        </button>
      )}

      {variant === 'pill' && (
        <button
          onClick={handleClick}
          className="px-4 py-2 bg-sky-500/15 hover:bg-sky-500/25 rounded-2xl text-sky-400 border border-sky-500/30 transition-all active:scale-95 flex items-center gap-2 text-xs font-black uppercase tracking-wider"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isIOS ? 'Install on iOS' : 'Install App'}</span>
        </button>
      )}

      {variant === 'card' && (
        <button
          onClick={handleClick}
          className="w-full py-4 bg-gradient-to-r from-sky-500/15 to-cyan-500/10 rounded-2xl border border-sky-500/30 text-left px-5 flex justify-between items-center group active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/20 rounded-xl border border-sky-500/30 text-sky-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm font-display">
                  {isIOS ? 'Install Slyd on iPhone / iPad' : 'Install Slyd App'}
                </span>
                <span className="bg-sky-500 text-black text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full">
                  PWA
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Add to your home screen for full-screen access & faster loading
              </p>
            </div>
          </div>
          <Download className="w-5 h-5 text-sky-400 group-hover:translate-y-0.5 transition-transform" />
        </button>
      )}

      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-slate-950 border border-slate-800 p-6 shadow-2xl relative">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <img
                src="/pwa-192x192.png"
                alt="Slyd App Icon"
                className="w-12 h-12 rounded-2xl border border-sky-500/30 shadow-lg shadow-sky-500/10"
              />
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight font-display">
                  Install Slyd
                </h3>
                <p className="text-xs text-sky-400 font-semibold">
                  Home Screen App Experience
                </p>
              </div>
            </div>

            {isIOS ? (
              <div className="space-y-3 mt-4 text-left">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Install Slyd on your iPhone or iPad in two quick steps:
                </p>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 shrink-0">
                    <Share className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-slate-200">
                    1. Tap the <strong>Share</strong> button in your Safari toolbar.
                  </p>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 shrink-0">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-slate-200">
                    2. Scroll down and tap <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 mt-4 text-left">
                <p className="text-xs text-slate-300 leading-relaxed">
                  To install Slyd directly onto your device:
                </p>
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 shrink-0 mt-0.5">
                    <Download className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-slate-200">
                    <strong>Desktop Chrome / Edge:</strong> Click the <strong>Install Slyd</strong> icon on the right side of your browser&apos;s address bar (make sure the app is opened in its own tab).
                  </p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-slate-200">
                    <strong>Android / Mobile:</strong> Open the browser menu (<strong>⋮</strong>) and tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowGuideModal(false)}
              className="mt-6 w-full py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-black font-black uppercase tracking-widest text-xs transition-all active:scale-95"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl bg-amber-500/95 backdrop-blur-md px-4 py-2 text-xs font-bold text-black shadow-xl">
      <span className="h-2 w-2 rounded-full bg-black animate-pulse" />
      <span>Offline Mode — Cached data is being used.</span>
    </div>
  );
};
