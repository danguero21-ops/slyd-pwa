
import React, { useState, useEffect } from 'react';
import Logo from './Logo';
import { PWAInstallButton } from './PWAInstallButton';
import { auth } from '../src/lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';

interface AuthFlowProps {
  mode: 'landing' | 'verify';
  onAuthSuccess: () => void;
  onVerifySuccess: () => void;
}

const AuthFlow: React.FC<AuthFlowProps> = ({ mode, onAuthSuccess, onVerifySuccess }) => {
  const [formType, setFormType] = useState<'login' | 'signup' | 'forgot' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
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
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        onAuthSuccess();
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        if (auth.currentUser?.emailVerified) {
          onVerifySuccess();
        } else {
          onAuthSuccess(); // Redirect to verify screen
        }
      }
    } catch (err: any) {
      if (err.code === 'auth/network-request-failed') {
        setError("Network error: Connection to authentication servers failed. Please check your internet connection.");
      } else {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const checkVerification = async () => {
    if (!auth.currentUser) {
      setError("Session expired. Please log in again.");
      return;
    }
    setIsVerifying(true);
    setError(null);
    try {
      await auth.currentUser.reload();
      // Need to re-check emailVerified after reload
      if (auth.currentUser.emailVerified) {
        onVerifySuccess();
      } else {
        setError("Email not verified yet. Please check your inbox.");
      }
    } catch (err: any) {
      if (err.code === 'auth/network-request-failed') {
        setError("Network error: Could not verify status. Please try again.");
      } else {
        setError(err.message);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handleResendEmail = async () => {
    if (!auth.currentUser) {
      setError("Session expired. Please log in again.");
      return;
    }
    if (resendTimer > 0) return;

    setIsResending(true);
    setResendMessage(null);
    setError(null);
    try {
      await sendEmailVerification(auth.currentUser);
      setResendMessage("Verification email sent! Please check your inbox.");
      setResendTimer(60); // 60 seconds cooldown
    } catch (err: any) {
      if (err.code === 'auth/too-many-requests') {
        setError("Too many requests. Please wait a minute before trying again.");
        setResendTimer(60);
      } else {
        setError(err.message);
      }
    } finally {
      setIsResending(false);
    }
  };

  if (mode === 'verify') {
    return (
      <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto p-8 items-center justify-center text-center animate-in fade-in duration-500 overflow-y-auto overflow-x-hidden no-scrollbar">
        <div className="w-20 h-20 bg-sky-500/10 rounded-[2rem] flex items-center justify-center mb-8 border border-sky-500/20 shadow-[0_0_30px_rgba(14,165,233,0.1)]">
          <svg className="w-10 h-10 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-black italic tracking-tighter text-white mb-4 uppercase font-display">Verify Email</h2>
        <p className="text-slate-400 text-sm mb-4 px-4 leading-relaxed font-sans">
          We sent a verification link to:
        </p>
        <p className="text-sky-400 font-bold mb-8 px-4 break-all font-display">
          {auth.currentUser?.email}
        </p>
        <p className="text-slate-400 text-xs mb-12 px-4 leading-relaxed font-sans">
          Please click the link in your inbox to activate your account and start using Slyd.
        </p>
        
        <button 
          onClick={checkVerification}
          disabled={isVerifying}
          className="w-full py-4 bg-sky-500 text-white font-black rounded-2xl shadow-xl shadow-sky-900/40 uppercase tracking-[0.2em] text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-3"
        >
          {isVerifying ? (
             <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Verify & Start Slyding</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5-5 5M6 7l5 5-5 5" />
              </svg>
            </>
          )}
        </button>
        
        {error && <p className="mt-4 text-red-500 text-[10px] font-bold uppercase tracking-widest">{error}</p>}
        {resendMessage && <p className="mt-4 text-emerald-500 text-[10px] font-bold uppercase tracking-widest">{resendMessage}</p>}
        
        <button 
          onClick={handleResendEmail}
          disabled={isResending || resendTimer > 0}
          className="mt-6 text-slate-500 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
        >
          {isResending ? 'Sending...' : resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Email'}
        </button>

        <button 
          onClick={() => auth.signOut()}
          className="mt-4 text-slate-700 text-[9px] font-black uppercase tracking-widest"
        >
          Sign Out
        </button>
      </div>
    );
  }

  if (formType) {
    return (
      <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto p-8 animate-in slide-in-from-right duration-300 overflow-y-auto overflow-x-hidden no-scrollbar">
        <button onClick={() => setFormType(null)} className="mb-12 p-3 w-fit bg-slate-900/50 rounded-2xl text-sky-400 border border-slate-800">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h2 className="text-4xl font-black italic tracking-tighter text-white mb-2 uppercase font-display">
          {formType === 'forgot' ? 'Reset Password' : formType}
        </h2>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-10 font-sans">
          {formType === 'forgot' ? 'Enter your email to receive recovery instructions' : 'Welcome to the Slyd community'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
            <input 
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800/50 rounded-2xl px-5 py-4 text-slate-100 focus:ring-1 focus:ring-sky-500 outline-none"
              placeholder="name@example.com"
            />
          </div>

          {formType !== 'forgot' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
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
                className="w-full bg-slate-900/50 border border-slate-800/50 rounded-2xl px-5 py-4 text-slate-100 focus:ring-1 focus:ring-sky-500 outline-none"
                placeholder="••••••••"
              />
            </div>
          )}

          {error && <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest">{error}</p>}
          {successMessage && <p className="text-emerald-400 text-[11px] font-bold uppercase tracking-wider bg-emerald-950/40 border border-emerald-800/50 p-3 rounded-xl">{successMessage}</p>}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-5 bg-sky-500 text-white font-black rounded-2xl shadow-xl shadow-sky-900/40 uppercase tracking-[0.2em] text-sm active:scale-[0.98] transition-all mt-6 flex items-center justify-center gap-3"
          >
            {isLoading ? (
               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : formType === 'signup' ? 'Continue' : formType === 'forgot' ? 'Send Reset Link' : 'Log In'}
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

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-black relative overflow-hidden overflow-x-hidden select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.08)_0%,transparent_50%)]" />
      
      <div className="flex justify-end p-5 relative z-20">
        <PWAInstallButton variant="pill" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10 text-center">
        <div className="relative mb-4">
          {/* Layered glows for depth */}
          <div className="absolute inset-0 bg-sky-500/10 blur-[80px] rounded-full scale-150 animate-pulse"></div>
          <div className="absolute inset-0 bg-sky-400/20 blur-3xl rounded-full scale-110"></div>
          
          <img 
            src="/logo.png" 
            alt="SlyD Logo" 
            className="relative w-48 h-auto object-contain drop-shadow-[0_0_20px_rgba(14,165,233,0.3)]"
          />
        </div>
        <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px] max-w-[200px] leading-relaxed mt-4 animate-pulse font-display">
          Next Gen Connection
        </p>
      </div>

      <div className="p-8 space-y-4 relative z-10 bg-gradient-to-t from-black via-black to-transparent">
        <button 
          onClick={() => setFormType('signup')}
          className="w-full py-5 bg-sky-500 text-white font-black rounded-2xl shadow-2xl shadow-sky-900/40 uppercase tracking-[0.2em] text-sm active:scale-[0.95] transition-all"
        >
          Sign Up
        </button>
        <button 
          onClick={() => setFormType('login')}
          className="w-full py-5 bg-slate-900/50 text-slate-300 font-black rounded-2xl border border-slate-800 uppercase tracking-[0.2em] text-sm active:scale-[0.95] transition-all"
        >
          Log In
        </button>
        <p className="text-center text-[10px] text-slate-500 font-medium px-6 py-4">
          By continuing, you agree to our{' '}
          <a
            href="/terms.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:text-sky-300 underline underline-offset-2"
          >
            Terms of Service
          </a>{' '}
          and{' '}
          <a
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:text-sky-300 underline underline-offset-2"
          >
            Privacy Policy
          </a>.
        </p>
      </div>
    </div>
  );
};

export default AuthFlow;
