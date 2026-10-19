import React, { useState, useEffect } from 'react';
import Logo from './Logo';
import { PWAInstallButton } from './PWAInstallButton';
import { auth } from '../src/lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  ShieldCheck, 
  Zap, 
  Navigation, 
  Lock, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  Shield,
  EyeOff
} from 'lucide-react';

interface AuthFlowProps {
  mode: 'landing' | 'verify';
  onAuthSuccess: () => void;
  onVerifySuccess: () => void;
}

export const AuthFlow: React.FC<AuthFlowProps> = ({ mode, onAuthSuccess, onVerifySuccess }) => {
  const [formType, setFormType] = useState<'login' | 'signup' | 'forgot' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage("Password reset email sent! Check your inbox for reset instructions.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formType === 'forgot') {
      return handleForgotPassword(e);
    }
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      if (formType === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
        onAuthSuccess();
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        onVerifySuccess();
      }
    } catch (err: any) {
      if (err.code === 'auth/network-request-failed') {
        setError("Network error: Connection to authentication servers failed. Please check your internet connection.");
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Invalid email or password. Please try again or reset your password.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("This email is already registered. Please log in instead.");
      } else {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Form View (Login / Signup / Forgot)
  if (formType) {
    return (
      <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto p-6 bg-black text-white animate-in slide-in-from-right duration-300 overflow-y-auto no-scrollbar font-sans">
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => setFormType(null)} 
            className="p-3 bg-slate-900/80 rounded-2xl text-emerald-400 border border-slate-800 hover:bg-slate-900 transition-all active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-emerald-300 text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.25)]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-wider">SlyD Shield™ Protected</span>
          </div>
        </div>
        
        <h2 className="text-3xl font-black italic tracking-tighter text-white mb-2 uppercase font-display">
          {formType === 'forgot' ? 'Reset Password' : formType === 'signup' ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-8">
          {formType === 'forgot' 
            ? 'Enter your email to receive recovery instructions' 
            : formType === 'signup'
            ? 'Join the 100% verified human hookup & social network'
            : 'Enter your credentials to access the live grid'}
        </p>

        {/* Security Shield Callout on Signup */}
        {formType === 'signup' && (
          <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider">
              <Shield className="w-4 h-4 shrink-0" />
              <span>Mandatory SlyD Shield™ Onboarding</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Every member must complete a 10-second biometric liveness check to enter. <strong>Zero bots. Zero catfishes.</strong>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 flex-1">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
            <input 
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl px-5 py-4 text-slate-100 focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
              placeholder="name@example.com"
            />
          </div>

          {formType !== 'forgot' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                {formType === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormType('forgot');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-wider"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <input 
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl px-5 py-4 text-slate-100 focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                placeholder="••••••••"
              />
            </div>
          )}

          {error && (
            <p className="text-red-400 text-xs font-semibold bg-red-950/40 border border-red-800/50 p-3 rounded-xl text-center">
              {error}
            </p>
          )}
          {successMessage && (
            <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider bg-emerald-950/40 border border-emerald-800/50 p-3 rounded-xl text-center">
              {successMessage}
            </p>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-5 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black font-black rounded-2xl shadow-xl shadow-emerald-950/50 uppercase tracking-[0.2em] text-xs active:scale-[0.98] transition-all mt-4 flex items-center justify-center gap-2"
          >
            {isLoading ? (
               <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : formType === 'signup' ? (
              <>
                <span>Continue to SlyD Shield Check</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : formType === 'forgot' ? (
              'Send Reset Link'
            ) : (
              'Log In'
            )}
          </button>

          {formType === 'forgot' && (
            <button
              type="button"
              onClick={() => {
                setFormType('login');
                setError(null);
                setSuccessMessage(null);
              }}
              className="w-full text-center text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider pt-2"
            >
              Back to Log In
            </button>
          )}
        </form>
      </div>
    );
  }

  // Showcase Landing Page
  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-black text-white relative overflow-y-auto no-scrollbar select-none font-sans">
      {/* Background Radiance */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.15)_0%,transparent_60%)] pointer-events-none" />

      {/* Top Header / PWA Install */}
      <div className="flex items-center justify-between p-5 relative z-20">
        <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-xl text-emerald-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[9px] font-black uppercase tracking-wider">100% Real Guys</span>
        </div>
        <PWAInstallButton variant="pill" />
      </div>

      {/* Hero Branding Section */}
      <div className="flex flex-col items-center justify-center px-6 pt-2 pb-6 relative z-10 text-center space-y-4">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500/20 blur-[60px] rounded-full scale-125 animate-pulse" />
          <img 
            src="/logo.png" 
            alt="SlyD Logo" 
            className="relative w-44 h-auto object-contain drop-shadow-[0_0_30px_rgba(16,185,129,0.4)]"
          />
        </div>
        
        <div>
          <h1 className="text-xl font-black italic tracking-tighter uppercase font-display text-white">
            Zero Fluff. Immediate Connections.
          </h1>
          <p className="text-emerald-400 text-xs font-black uppercase tracking-widest mt-1">
            Real-Time Social & Hookup App for Gay, Bi & Queer Men
          </p>
        </div>
      </div>

      {/* Mandatory SlyD Shield Hero Feature Card */}
      <div className="px-6 relative z-10 space-y-4">
        <div className="p-5 bg-gradient-to-b from-emerald-950/50 to-slate-950 border border-emerald-500/40 rounded-3xl shadow-[0_0_30px_rgba(16,185,129,0.15)] relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-start gap-3.5 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black uppercase tracking-tight text-white font-display">
                  SlyD Shield™
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-black px-1.5 py-0.5 rounded font-sans">
                  Mandatory
                </span>
              </div>
              <p className="text-xs font-bold text-emerald-300 mt-0.5">
                100% Real Guys. Zero Bots.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-medium mb-3">
            To keep SlyD free of catfishes and spam, every member completes a 10-second biometric liveness check. Zero unverified users.
          </p>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-300">
            <div className="flex items-center gap-1.5 bg-black/40 p-2 rounded-xl border border-slate-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Live Pose Check</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/40 p-2 rounded-xl border border-slate-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Biometric Liveness</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/40 p-2 rounded-xl border border-slate-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Anti-Spoof Defense</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/40 p-2 rounded-xl border border-slate-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Encrypted Baseline</span>
            </div>
          </div>
        </div>

        {/* Feature Grid Highlights */}
        <div className="grid grid-cols-2 gap-3">
          {/* NOW vs LATER */}
          <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-2xl">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400 mb-2">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-black uppercase tracking-tight text-white font-display">Now vs Later</h4>
            <p className="text-[10px] text-slate-400 leading-tight mt-1">
              Active "Now" users appear live. "Later" locks map to avoid dead profiles.
            </p>
          </div>

          {/* Host & Travel */}
          <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-2xl">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2">
              <Navigation className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-black uppercase tracking-tight text-white font-display">Host & Travel</h4>
            <p className="text-[10px] text-slate-400 leading-tight mt-1">
              Floating pills signal if you can host immediately or want to travel.
            </p>
          </div>

          {/* Mutual Interest */}
          <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-2xl">
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 mb-2">
              <Users className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-black uppercase tracking-tight text-white font-display">Mutual Interest</h4>
            <p className="text-[10px] text-slate-400 leading-tight mt-1">
              Chat unlocks upon mutual like, or instantly with SlyD+ VIP.
            </p>
          </div>

          {/* Discreet Privacy */}
          <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-2xl">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 mb-2">
              <EyeOff className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-black uppercase tracking-tight text-white font-display">Discreet Privacy</h4>
            <p className="text-[10px] text-slate-400 leading-tight mt-1">
              Exact coordinates shared only upon on-demand consent in chat.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons Section */}
      <div className="p-6 space-y-3 relative z-10 mt-4 bg-gradient-to-t from-black via-black to-transparent">
        <button 
          onClick={() => setFormType('signup')}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black font-black rounded-2xl shadow-2xl shadow-emerald-950/60 uppercase tracking-[0.2em] text-xs active:scale-[0.97] transition-all flex items-center justify-center gap-2"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Get Verified & Enter SlyD</span>
        </button>

        <button 
          onClick={() => setFormType('login')}
          className="w-full py-4 bg-slate-900/80 hover:bg-slate-900 text-slate-200 font-black rounded-2xl border border-slate-800 uppercase tracking-[0.2em] text-xs active:scale-[0.97] transition-all"
        >
          Log In
        </button>

        <p className="text-center text-[10px] text-slate-500 font-medium px-4 pt-2">
          18+ Only. By continuing, you agree to our{' '}
          <a
            href="/terms.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:underline"
          >
            Terms
          </a>{' '}
          and{' '}
          <a
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:underline"
          >
            Privacy Policy
          </a>.
        </p>
      </div>
    </div>
  );
};

export default AuthFlow;
