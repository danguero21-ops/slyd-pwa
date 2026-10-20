import React, { useState } from 'react';
import { PWAInstallButton } from './PWAInstallButton';
import { auth } from '../src/lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  ShieldCheck, 
  ArrowRight,
  Shield
} from 'lucide-react';

interface AuthFlowProps {
  mode: 'landing' | 'verify';
  onAuthSuccess: () => void;
  onVerifySuccess: () => void;
}

export const AuthFlow: React.FC<AuthFlowProps> = ({ onAuthSuccess, onVerifySuccess }) => {
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
            className="p-3 bg-slate-900/80 rounded-2xl text-sky-400 border border-slate-800 hover:bg-slate-900 transition-all active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-1.5 bg-sky-950/60 border border-sky-500/40 px-3 py-1.5 rounded-xl text-sky-300 text-xs font-bold shadow-[0_0_15px_rgba(14,165,233,0.2)]">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span className="text-[10px] font-black uppercase tracking-wider">SlyD Shield™</span>
          </div>
        </div>
        
        <h2 className="text-3xl font-black italic tracking-tighter text-white mb-2 uppercase font-display">
          {formType === 'forgot' ? 'Reset Password' : formType === 'signup' ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-8">
          {formType === 'forgot' 
            ? 'Enter your email to receive recovery instructions' 
            : formType === 'signup'
            ? '100% Verified Guys • Zero Bots'
            : 'Enter your credentials to access the live grid'}
        </p>

        {/* Minimal Shield Callout on Signup */}
        {formType === 'signup' && (
          <div className="mb-6 p-4 bg-slate-900/60 border border-sky-500/30 rounded-2xl flex items-center gap-3">
            <Shield className="w-5 h-5 text-sky-400 shrink-0" />
            <p className="text-xs text-slate-300 leading-snug">
              Every member completes a 10-second biometric check after signup. <strong>Zero bots. Zero catfishes.</strong>
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
              className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl px-5 py-4 text-slate-100 focus:ring-1 focus:ring-sky-500 outline-none text-sm"
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
                    className="text-[10px] font-bold text-sky-400 hover:text-sky-300 uppercase tracking-wider"
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
                className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl px-5 py-4 text-slate-100 focus:ring-1 focus:ring-sky-500 outline-none text-sm"
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
            <p className="text-sky-400 text-xs font-bold uppercase tracking-wider bg-sky-950/40 border border-sky-800/50 p-3 rounded-xl text-center">
              {successMessage}
            </p>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-5 bg-sky-500 hover:bg-sky-400 text-white font-black rounded-2xl shadow-xl shadow-sky-950/50 uppercase tracking-[0.2em] text-xs active:scale-[0.98] transition-all mt-4 flex items-center justify-center gap-2"
          >
            {isLoading ? (
               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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

  // Simple, Minimalist, Elegant Landing Page
  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-black text-white relative select-none font-sans overflow-hidden">
      {/* Background Ambient Glow (App colors: subtle electric sky blue) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(14,165,233,0.08)_0%,transparent_70%)] pointer-events-none" />

      {/* Top Bar with PWA Install */}
      <div className="flex items-center justify-end p-5 relative z-20">
        <PWAInstallButton variant="pill" />
      </div>

      {/* Center Hero Section - Clean, Focused, Uncluttered */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 text-center space-y-6">
        <div className="relative">
          <div className="absolute inset-0 bg-sky-500/15 blur-[60px] rounded-full scale-125 animate-pulse" />
          <img 
            src="/logo.png" 
            alt="SlyD Logo" 
            className="relative w-48 h-auto object-contain drop-shadow-[0_0_30px_rgba(14,165,233,0.4)]"
          />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-lg font-black italic tracking-tighter uppercase font-display text-white">
            Instant, Zero-Friction Connections
          </h1>

          {/* Simple, refined SlyD Shield indicator */}
          <div className="inline-flex items-center gap-2 bg-slate-900/80 border border-sky-500/30 px-3.5 py-1.5 rounded-full text-slate-300 text-xs font-semibold shadow-lg shadow-sky-950/20">
            <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
            <span>SlyD Shield™ • 100% Real Guys</span>
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons - Minimalist */}
      <div className="p-6 space-y-3 relative z-10 bg-gradient-to-t from-black via-black to-transparent">
        <button 
          onClick={() => setFormType('signup')}
          className="w-full py-4.5 bg-sky-500 hover:bg-sky-400 text-white font-black rounded-2xl shadow-xl shadow-sky-950/50 uppercase tracking-[0.2em] text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <span>Get Started</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button 
          onClick={() => setFormType('login')}
          className="w-full py-4.5 bg-slate-900/70 hover:bg-slate-900 text-slate-200 font-black rounded-2xl border border-slate-800 uppercase tracking-[0.2em] text-xs active:scale-[0.98] transition-all"
        >
          Log In
        </button>

        <p className="text-center text-[10px] text-slate-500 font-medium px-4 pt-1">
          18+ Only. By continuing, you agree to our{' '}
          <a
            href="/terms.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:underline"
          >
            Terms
          </a>{' '}
          and{' '}
          <a
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:underline"
          >
            Privacy Policy
          </a>.
        </p>
      </div>
    </div>
  );
};

export default AuthFlow;
