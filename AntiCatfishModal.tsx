import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Shield,
  Camera, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  X,
  Upload,
  RefreshCw
} from 'lucide-react';
import { UserProfile, isAdminUser, isSelfieExemptUser } from '../types';
import { compressImage } from '../src/lib/image-utils';
import { verifyIdentity } from '../services/geminiService';
import { getAntiCatfishCooldown, AntiCatfishCooldownInfo } from '../src/lib/anti-catfish';

interface AntiCatfishModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onVerificationSuccess: (updatedUser: UserProfile) => Promise<void> | void;
  onAttemptLogged?: (lastAttemptAt: number) => Promise<void> | void;
}

const AntiCatfishModal: React.FC<AntiCatfishModalProps> = ({
  isOpen,
  onClose,
  user,
  onVerificationSuccess,
  onAttemptLogged
}) => {
  const [cooldown, setCooldown] = useState<AntiCatfishCooldownInfo>(() => 
    getAntiCatfishCooldown(user.lastSelfieAttemptAt)
  );

  const [isCapturing, setIsCapturing] = useState(false);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update cooldown countdown timer
  useEffect(() => {
    setCooldown(getAntiCatfishCooldown(user.lastSelfieAttemptAt));
    const interval = setInterval(() => {
      setCooldown(getAntiCatfishCooldown(user.lastSelfieAttemptAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [user.lastSelfieAttemptAt]);

  // Clean up media stream on unmount or close
  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  if (!isOpen) return null;

  const startCamera = async () => {
    setIsCapturing(true);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("Camera access denied or unavailable. You may upload a real-time live selfie photo below.");
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  };

  const captureSelfie = async () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth || 480;
        canvasRef.current.height = videoRef.current.videoHeight || 480;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.85);

        try {
          const compressed = await compressImage(dataUrl, 600, 0.7);
          setSelfieUrl(compressed);
        } catch {
          setSelfieUrl(dataUrl);
        }

        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImage(reader.result as string, 600, 0.7);
          setSelfieUrl(compressed);
        } catch {
          setSelfieUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const referencePhoto = user.referenceSelfieUrl || user.imageUrl;

  const handleVerify = async () => {
    if (!selfieUrl || !referencePhoto) return;

    const attemptTimestamp = Date.now();
    onAttemptLogged?.(attemptTimestamp);

    setStatus('analyzing');
    setErrorMessage(null);

    try {
      const result = await verifyIdentity(referencePhoto, selfieUrl);

      if (result.verified) {
        setStatus('success');
        const updated: UserProfile = {
          ...user,
          isVerified: true,
          lastVerifiedAt: attemptTimestamp,
          lastSelfieAttemptAt: attemptTimestamp,
          referenceSelfieUrl: user.referenceSelfieUrl || selfieUrl
        };
        await onVerificationSuccess(updated);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setStatus('failed');
        setErrorMessage(
          result.reason || 
          "Selfie did not match your sign-up verification photo. In accordance with anti-catfish policy, your 1 daily attempt has been recorded."
        );
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      setStatus('failed');
      setErrorMessage("Verification system error. Please try again tomorrow.");
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-sm sm:max-w-md max-h-[88vh] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="py-2.5 px-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-tight text-white font-display">24-Hour Verification</h3>
              <p className="text-[9px] text-slate-400 font-medium">Daily biometric check against sign-up photo</p>
            </div>
          </div>

          <button 
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3 overflow-y-auto overflow-x-hidden space-y-2.5 no-scrollbar scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Admin Account Exemption */}
          {(isAdminUser(user) || isSelfieExemptUser(user)) && (
            <div className="p-2.5 bg-purple-950/40 border border-purple-500/30 rounded-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-purple-200">Admin Account Exemption</p>
                  <p className="text-[8px] text-purple-300/80">Selfie verification is optional.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const updated: UserProfile = {
                    ...user,
                    isVerified: !user.isVerified,
                    isSelfieExempt: true,
                    lastVerifiedAt: Date.now()
                  };
                  await onVerificationSuccess(updated);
                  onClose();
                }}
                className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap shadow active:scale-95 shrink-0"
              >
                {user.isVerified ? 'Set Unverified' : 'Set Verified'}
              </button>
            </div>
          )}

          {/* Anti-Catfish Security Rule Banner */}
          <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div className="text-[10px] text-slate-300 leading-snug">
              <span className="font-bold text-sky-400 uppercase tracking-wider block text-[9px] mb-0.5">
                Private Verification Policy
              </span>
              This daily selfie is matched directly against your private sign-up verification photo in your vault.
              <span className="text-slate-400 block mt-0.5">It is never posted publicly or shared with other members.</span>
            </div>
          </div>

          {/* If Cooldown is Active */}
          {cooldown.isLocked ? (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-2.5">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 mx-auto flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
              </div>

              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-tight font-display">
                  Daily Selfie Limit Reached
                </h4>
                <p className="text-[11px] text-amber-200/90 mt-0.5 leading-relaxed">
                  You have already verified your selfie for today.
                  Your next 24-hour check unlocks in:
                </p>
              </div>

              <div className="py-2 px-4 rounded-xl bg-slate-950 border border-amber-500/30 inline-block font-mono text-base font-black text-amber-400 shadow-inner">
                {cooldown.formattedRemaining}
              </div>

              <p className="text-[9px] text-slate-400">
                Please return once the timer expires to re-verify.
              </p>
            </div>
          ) : (
            <>
              {/* Photo Comparison Display */}
              <div className="grid grid-cols-2 gap-2">
                {/* Reference Photo */}
                <div className="space-y-1 text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                    {user.referenceSelfieUrl ? 'Sign-Up Photo (Private)' : 'Profile Reference'}
                  </span>
                  <div className="relative aspect-square rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow">
                    <img 
                      src={referencePhoto} 
                      alt={user.name} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 inset-x-1 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[8px] font-bold uppercase tracking-wider text-slate-300 flex items-center justify-center">
                      <span>Vault Only</span>
                    </div>
                  </div>
                </div>

                {/* Live Selfie Slot */}
                <div className="space-y-1 text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Daily Live Selfie
                  </span>
                  <div className="relative aspect-square rounded-xl overflow-hidden border border-sky-500/40 bg-slate-900 shadow flex items-center justify-center">
                    {selfieUrl ? (
                      <img 
                        src={selfieUrl} 
                        alt="Captured selfie" 
                        className="w-full h-full object-cover"
                      />
                    ) : isCapturing ? (
                      <div className="relative w-full h-full bg-black">
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          muted
                          className="w-full h-full object-cover" 
                        />
                        {/* Alignment guide */}
                        <div className="absolute inset-1.5 border-2 border-sky-400/40 border-dashed rounded-full pointer-events-none" />
                      </div>
                    ) : (
                      <div className="p-2 text-center flex flex-col items-center justify-center">
                        <Camera className="w-6 h-6 text-sky-400 mb-0.5 opacity-70" />
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                          Ready To Scan
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status or Error Displays */}
              {status === 'analyzing' && (
                <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center gap-2 animate-pulse">
                  <RefreshCw className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
                  <div className="text-[11px] text-sky-200">
                    <span className="font-bold block text-white uppercase text-[9px]">Analyzing Facial Geometry</span>
                    Matching live biometric features against your photo...
                  </div>
                </div>
              )}

              {status === 'success' && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="text-[11px] text-emerald-200">
                    <span className="font-bold block text-white uppercase text-[9px]">Match Confirmed!</span>
                    Your profile is now verified.
                  </div>
                </div>
              )}

              {status === 'failed' && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 space-y-1">
                  <div className="flex items-center gap-1.5 text-red-400">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span className="font-bold uppercase text-[10px] tracking-wider">Verification Unsuccessful</span>
                  </div>
                  <p className="text-[11px] text-red-200 leading-snug">
                    {errorMessage}
                  </p>
                  <p className="text-[9px] text-slate-400 border-t border-red-500/20 pt-1">
                    1 selfie verification attempt per day.
                  </p>
                </div>
              )}

              {cameraError && (
                <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[10px]">
                  {cameraError}
                </div>
              )}

              {/* Action Controls */}
              {status !== 'success' && (
                <div className="space-y-2 pt-1">
                  {!selfieUrl && !isCapturing && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={startCamera}
                        className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-400 active:scale-[0.98] text-white font-black text-[11px] uppercase tracking-wider rounded-xl shadow shadow-sky-900/40 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Start Camera</span>
                      </button>

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs uppercase rounded-xl border border-slate-800 flex items-center gap-1 transition-colors"
                        title="Upload Live Selfie"
                      >
                        <Upload className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {isCapturing && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={captureSelfie}
                        className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-400 active:scale-[0.98] text-white font-black text-[11px] uppercase tracking-wider rounded-xl shadow shadow-sky-900/40 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Take Selfie</span>
                      </button>
                      <button
                        onClick={stopCamera}
                        className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold text-xs uppercase rounded-xl border border-slate-800"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {selfieUrl && status !== 'analyzing' && status !== 'failed' && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          setSelfieUrl(null);
                          startCamera();
                        }}
                        className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-800"
                      >
                        Retake
                      </button>
                      <button
                        onClick={handleVerify}
                        className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-400 active:scale-[0.98] text-white font-black text-[11px] uppercase tracking-wider rounded-xl shadow shadow-sky-900/40 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Verify Against Photo</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            capture="user"
            className="hidden" 
            onChange={handleFileUpload} 
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    </div>
  );
};

export default AntiCatfishModal;
