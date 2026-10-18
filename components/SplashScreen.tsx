
import React from 'react';
import Logo from './Logo';

const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = React.useState(true);
  const [isFading, setIsFading] = React.useState(false);

  React.useEffect(() => {
    let fadeTimer: ReturnType<typeof setTimeout>;
    const timer = setTimeout(() => {
      setIsFading(true);
      fadeTimer = setTimeout(() => {
        setIsVisible(false);
        onComplete();
      }, 700);
    }, 2800);

    return () => { clearTimeout(timer); clearTimeout(fadeTimer); };
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black transition-opacity duration-700 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.05)_0%,transparent_70%)]" />
      
      <div className="relative flex flex-col items-center animate-in zoom-in-95 duration-1000">
        <div className="relative mb-4">
          {/* Layered glows for depth */}
          <div className="absolute inset-0 bg-sky-500/10 blur-[80px] rounded-full scale-150 animate-pulse"></div>
          <div className="absolute inset-0 bg-sky-400/20 blur-3xl rounded-full scale-110"></div>
          
          <img 
            src="/logo.png" 
            alt="SlyD Logo" 
            className="relative w-48 h-auto object-contain drop-shadow-[0_0_30px_rgba(14,165,233,0.4)]"
          />
        </div>
        <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px] max-w-[200px] leading-relaxed mt-4 animate-pulse font-display text-center">
          Next Gen Connection
        </p>
      </div>

      <div className="absolute bottom-20 w-32 h-0.5 bg-slate-900/50 rounded-full overflow-hidden shadow-[0_0_10px_rgba(56,189,248,0.1)]">
        <div className="h-full bg-sky-500 w-full animate-[progress_2.5s_ease-in-out_infinite]" />
      </div>

      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
