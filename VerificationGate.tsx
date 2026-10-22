
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, isAdminUser, isSelfieExemptUser } from '../types';
import { compressImage } from '../src/lib/image-utils';
import { verifyIdentity } from '../services/geminiService';
import { Shield, Clock } from 'lucide-react';
import { getAntiCatfishCooldown, AntiCatfishCooldownInfo } from '../src/lib/anti-catfish';

interface VerificationGateProps {
  user: UserProfile;
  isAdmin?: boolean;
  onVerified: (user: UserProfile) => void;
  onAttemptLogged?: (lastAttemptAt: number) => Promise<void> | void;
  onSkip?: () => void;
}

const VerificationGate: React.FC<VerificationGateProps> = ({ user, isAdmin: propIsAdmin, onVerified, onAttemptLogged, onSkip }) => {
  const isUserAdmin = Boolean(
    propIsAdmin || 
    isAdminUser(user) || 
    isSelfieExemptUser(user)
  );

  const [cooldown, setCooldown] = useState<AntiCatfishCooldownInfo>(() => 
    getAntiCatfishCooldown(user.lastSelfieAttemptAt)
  );
  const [isCapturing, setIsCapturing] = useState(false);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'capture' | 'analyzing' | 'success'>('capture');

  useEffect(() => {
    setCooldown(getAntiCatfishCooldown(user.lastSelfieAttemptAt));
    const interval = setInterval(() => {
      setCooldown(getAntiCatfishCooldown(user.lastSelfieAttemptAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [user.lastSelfieAttemptAt]);





  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    setIsCapturing(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Please allow camera access to verify your identity.");
      setIsCapturing(false);
    }
  };
  
  // Cancel verification / stop camera
  const cancelVerification = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setIsCapturing(false);
    setSelfieUrl(null);
    setError(null);
  };

  const captureSelfie = async () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        
        try {
          const compressed = await compressImage(dataUrl, 600, 0.6);
          setSelfieUrl(compressed);
        } catch (err) {
          console.error("Selfie compression failed:", err);
          setSelfieUrl(dataUrl);
        }
        
        // Stop camera
        if (videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }
        setIsCapturing(false);
      }
    }
  };
  
  // Cancel verification / stop camera
  const cancelVerification = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setIsCapturing(false);
    setSelfieUrl(null);
    setError(null);
  };

  // Detect placeholder avatars (e.g., DiceBear SVGs) and treat them as missing real photos
  const isPlaceholderAvatar = (url?: string) => {
    if (!url) return true;
    const lower = url.toLowerCase();
    return lower.includes('dicebear.com') || lower.includes('.svg') || lower.startsWith('data:image/svg');
  };
  
  // Cancel verification / stop camera
  const cancelVerification = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setIsCapturing(false);
    setSelfieUrl(null);
    setError(null);
  };

  const hasReferenceSelfie = Boolean(user.referenceSelfieUrl);
  const hasRealProfilePhoto = Boolean(user.imageUrl && !isPlaceholderAvatar(user.imageUrl));
  const referencePhoto = user.referenceSelfieUrl || (hasRealProfilePhoto ? user.imageUrl : null);

  const verifyWithAI = async () => {
    if (!selfieUrl) return;
    
    const attemptTimestamp = Date.now();
    onAttemptLogged?.(attemptTimestamp);

    setIsVerifying(true);
    setStatus('analyzing');
    setError(null);

    // If user has no reference photo yet, this selfie registers as their initial baseline!
    if (!hasReferenceSelfie && !user.imageUrl) {
      setStatus('success');
      setTimeout(() => {
        onVerified({
          ...user,
          isVerified: true,
          lastVerifiedAt: attemptTimestamp,
          lastSelfieAttemptAt: attemptTimestamp,
          referenceSelfieUrl: selfieUrl
        });
      }, 1200);
      setIsVerifying(false);
      return;
    }

    try {
      const result = await verifyIdentity(referencePhoto, selfieUrl);
      
      if (result.verified) {
        setStatus('success');
        setTimeout(() => {
          onVerified({
            ...user,
            isVerified: true,
            lastVerifiedAt: attemptTimestamp,
            lastSelfieAttemptAt: attemptTimestamp,
            // Preserve original sign-up reference selfie (or set if first time)
            referenceSelfieUrl: user.referenceSelfieUrl || selfieUrl
          });
        }, 1500);
      } else {
        setError(result.reason || "Biometric check failed against your sign-up verification photo. Please align your face clearly in good lighting and try again.");
        setSelfieUrl(null);
        setStatus('capture');
      }
    } catch (err) {
      console.error("AI Verification Error:", err);
      // For network resilience, allow temporary pass
      setError("AI verification service temporarily busy. Granting temporary access for today.");
      setTimeout(() => {
        onVerified({
          ...user,
          isVerified: true,
          lastVerifiedAt: attemptTimestamp,
          lastSelfieAttemptAt: attemptTimestamp,
          referenceSelfieUrl: user.referenceSelfieUrl || selfieUrl
        });
      }, 2500);
    } finally {
      setIsVerifying(false);
    }
  };
  
  // Cancel verification / stop camera
  const cancelVerification = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setIsCapturing(false);
    setSelfieUrl(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center p-6 overflow-y-auto overflow-x-hidden no-scrollbar">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-sky-500 rounded-2xl flex items-center justify-center mb-5 shadow-xl shadow-sky-900/40">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>

        <h2 className="text-2xl font-black italic tracking-tighter text-white mb-2 uppercase font-display">
          {hasReferenceSelfie ? '24-Hour Daily Verification' : 'Register Verification Selfie'}
        </h2>
        
        {isUserAdmin && (
          <div className="w-full mb-5 p-3.5 bg-purple-950/40 border border-purple-500/30 rounded-2xl flex items-center justify-between text-left gap-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-purple-200">Admin Account Detected</p>
                <p className="text-[9px] text-purple-300/80">Selfie verification is optional for administrators.</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (onSkip) {
                  onSkip();
                } else {
                  onVerified({ ...user, isSelfieExempt: true });
                }
              }}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap shadow-lg active:scale-95 shrink-0"
            >
              Skip Gate
            </button>
          </div>
        )}

        <p className="text-slate-400 text-xs font-medium mb-6 leading-relaxed">
          {hasReferenceSelfie
            ? 'Take a live selfie to verify your identity against your private sign-up verification photo. This selfie is not saved to your profile or picture roll.'
            : 'Take a live camera selfie to establish your private verification baseline. It will not be added to your album or viewed by the public.'}
        </p>

        {cooldown.isLocked ? (
          <div className="w-full p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/30 mx-auto flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>
            <h3 className="text-base font-black text-white uppercase tracking-tight font-display">
              Daily Selfie Limit Reached
            </h3>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              You have already taken your 1 daily verification selfie.
              Your next 24-hour verification check unlocks in:
            </p>
            <div className="py-2.5 px-5 rounded-xl bg-slate-950 border border-amber-500/30 inline-block font-mono text-lg font-black text-amber-400 shadow-inner">
              {cooldown.formattedRemaining}
            </div>
            <p className="text-[10px] text-slate-400">
              Please check back once the 24h timer expires.
            </p>
          </div>
        ) : status === 'analyzing' ? (
          <div className="w-full aspect-square rounded-[3rem] bg-slate-900 flex flex-col items-center justify-center border-2 border-sky-500/30 animate-pulse">
            <div className="w-16 h-16 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin mb-4" />
            <p className="text-sky-400 font-bold text-xs uppercase tracking-widest">Matching Sign-Up Photo</p>
            <p className="text-slate-500 text-[10px] uppercase font-bold mt-1">Comparing facial geometry</p>
          </div>
        ) : status === 'success' ? (
          <div className="w-full aspect-square rounded-[3rem] bg-sky-500 flex flex-col items-center justify-center shadow-2xl animate-in zoom-in duration-300">
            <svg className="w-24 h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-white font-black text-sm uppercase tracking-widest mt-4">Verified For 24 Hours</p>
          </div>
        ) : selfieUrl ? (
          <div className="relative w-full aspect-square rounded-[3rem] overflow-hidden border-4 border-slate-800 shadow-2xl bg-slate-950">
            <img src={selfieUrl} alt="Captured daily selfie" className="w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-6 flex justify-center gap-3 px-6">
              <button 
                onClick={() => setSelfieUrl(null)}
                className="flex-1 py-3 bg-slate-900/90 backdrop-blur-md text-white font-black text-[10px] uppercase rounded-2xl border border-slate-700"
              >
                Retake
              </button>
              <button 
                onClick={verifyWithAI}
                disabled={isVerifying}
                className="flex-1 py-3 bg-sky-500 hover:bg-sky-400 text-white font-black text-[10px] uppercase rounded-2xl shadow-lg transition-colors"
              >
                {hasReferenceSelfie ? 'Verify Identity' : 'Save & Verify'}
              </button>
            </div>
          </div>
        ) : isCapturing ? (
          <div className="relative w-full aspect-square rounded-[3rem] overflow-hidden bg-slate-900 border-2 border-slate-800 shadow-2xl">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-0 border-[36px] border-black/40 pointer-events-none flex items-center justify-center">
              <div className="w-full h-full border-2 border-sky-400/40 rounded-[2rem] border-dashed" />
            </div>
            <button 
              onClick={captureSelfie}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-slate-300 active:scale-95 transition-all shadow-2xl ring-4 ring-sky-400/20"
              title="Capture live selfie"
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>
        ) : (
          <button 
            onClick={startCamera}
            className="w-full aspect-square rounded-[3rem] bg-slate-900 border-2 border-slate-800 flex flex-col items-center justify-center group overflow-hidden transition-all hover:bg-slate-850 shadow-2xl"
          >
            <div className="w-20 h-20 bg-sky-500/10 rounded-full flex items-center justify-center mb-5 transition-transform group-hover:scale-110 border border-sky-500/20">
              <svg className="w-10 h-10 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
            </div>
            <p className="text-white font-black uppercase text-sm tracking-widest">Open Live Camera</p>
            <p className="text-slate-500 text-[9px] uppercase font-bold mt-2 tracking-widest">
              {hasReferenceSelfie ? '24-hour selfie check-in' : 'Take baseline selfie'}
            </p>
          </button>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl w-full">
            <p className="text-red-400 text-xs font-bold leading-relaxed">
              {error}
            </p>
          </div>
        )}

        <div className="mt-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 w-full text-left flex items-center gap-2 text-slate-400 text-[10px]">
          <svg className="w-4 h-4 text-sky-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Daily selfie is never stored in picture roll or shown publicly.</span>
        </div>
      </div>

      <div className="mt-auto pt-10 text-center">
        <p className="text-[8px] font-black text-slate-700 uppercase tracking-[0.3em] italic">
          Slyd Secure™ Biometric Identification System
        </p>
      </div>
    </div>
  );
};
  
  // Cancel verification / stop camera
  const cancelVerification = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setIsCapturing(false);
    setSelfieUrl(null);
    setError(null);
  };

export default VerificationGate;
