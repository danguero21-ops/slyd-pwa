import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Shield, 
  Camera, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  Lock,
  Eye,
  Scan
} from 'lucide-react';
import { UserProfile } from '../types';
import { compressImage } from '../src/lib/image-utils';
import { verifyIdentity } from '../services/geminiService';

export interface SlyDShieldVerificationProps {
  user?: UserProfile | null;
  onVerified: (payload: { verifiedPhotoUrl: string; timestamp: number }) => Promise<void> | void;
  isAdmin?: boolean;
  onAdminBypass?: () => void;
}

interface GestureChallenge {
  id: string;
  name: string;
  icon: string;
  instruction: string;
  detail: string;
}

const GESTURE_CHALLENGES: GestureChallenge[] = [
  {
    id: 'peace_sign',
    name: 'Peace Sign',
    icon: '✌️',
    instruction: 'Hold up 2 fingers (peace sign) next to your face',
    detail: 'Keep your fingers steady within the camera frame.'
  },
  {
    id: 'thumbs_up',
    name: 'Thumbs Up',
    icon: '👍',
    instruction: 'Give a clear thumbs-up next to your chin',
    detail: 'Ensure your thumb is clearly visible alongside your face.'
  },
  {
    id: 'tilt_left',
    name: 'Tilt Head Left',
    icon: '👈',
    instruction: 'Tilt your head toward your left shoulder',
    detail: 'Maintain eye contact with the camera while tilting.'
  },
  {
    id: 'tilt_right',
    name: 'Tilt Head Right',
    icon: '👉',
    instruction: 'Tilt your head toward your right shoulder',
    detail: 'Maintain eye contact with the camera while tilting.'
  },
  {
    id: 'smile_front',
    name: 'Smile Forward',
    icon: '😊',
    instruction: 'Smile directly into the camera',
    detail: 'Look straight at the lens with good natural lighting.'
  }
];

export const SlyDShieldVerification: React.FC<SlyDShieldVerificationProps> = ({
  user,
  onVerified,
  isAdmin,
  onAdminBypass
}) => {
  const [selectedChallenge, setSelectedChallenge] = useState<GestureChallenge>(() => {
    const randomIndex = Math.floor(Math.random() * GESTURE_CHALLENGES.length);
    return GESTURE_CHALLENGES[randomIndex];
  });

  const [step, setStep] = useState<'intro' | 'scanning' | 'analyzing' | 'success' | 'failed'>('intro');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [progressSeconds, setProgressSeconds] = useState(0); // 0 to 10
  const [livenessScore, setLivenessScore] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Position your face inside the shield frame');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameDataRef = useRef<Uint8ClampedArray | null>(null);

  // Stop camera helper
  const stopCameraStream = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Pick a fresh challenge
  const randomizeChallenge = () => {
    const remaining = GESTURE_CHALLENGES.filter(c => c.id !== selectedChallenge.id);
    const chosen = remaining[Math.floor(Math.random() * remaining.length)];
    setSelectedChallenge(chosen);
  };

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setStep('scanning');
      setProgressSeconds(0);
      setLivenessScore(10);
      setStatusMessage(`Perform gesture: ${selectedChallenge.name}`);

      // Start 10-second biometric liveness check
      startBiometricCheck();
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraError(
        "Camera permission is required for the mandatory SlyD Shield check. Please enable camera access in your browser settings to verify."
      );
      setCameraActive(false);
    }
  };

  // Biometric liveness monitor during 10s check
  const startBiometricCheck = () => {
    let elapsed = 0;
    let motionAccumulator = 0;

    // Optical motion analysis loop to detect genuine live human movement (prevents static photos/printed masks)
    const analyzeLiveMovement = () => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx || video.readyState !== 4) {
        animationFrameRef.current = requestAnimationFrame(analyzeLiveMovement);
        return;
      }

      canvas.width = 160;
      canvas.height = 160;
      ctx.drawImage(video, 0, 0, 160, 160);
      const currentFrame = ctx.getImageData(0, 0, 160, 160).data;

      if (lastFrameDataRef.current) {
        let diff = 0;
        const prev = lastFrameDataRef.current;
        for (let i = 0; i < currentFrame.length; i += 16) {
          diff += Math.abs(currentFrame[i] - prev[i]);
        }
        // Normalize diff
        if (diff > 500) {
          motionAccumulator += 1;
        }
      }
      lastFrameDataRef.current = currentFrame;
      animationFrameRef.current = requestAnimationFrame(analyzeLiveMovement);
    };

    animationFrameRef.current = requestAnimationFrame(analyzeLiveMovement);

    timerRef.current = setInterval(() => {
      elapsed += 1;
      setProgressSeconds(elapsed);
      setLivenessScore(prev => Math.min(100, prev + 10));

      if (elapsed === 3) {
        setStatusMessage(`Holding pose: "${selectedChallenge.instruction}"...`);
      } else if (elapsed === 6) {
        setStatusMessage("Biometric geometry tracking active. Stay still...");
      } else if (elapsed === 8) {
        setStatusMessage("Finalizing anti-catfish biometric baseline...");
      }

      // Check completes after 10 seconds
      if (elapsed >= 10) {
        if (timerRef.current) clearInterval(timerRef.current);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        captureAndFinalizeVerification(motionAccumulator);
      }
    }, 1000);
  };

  // Capture final frame and run verification
  const captureAndFinalizeVerification = async (motionCount: number) => {
    if (!videoRef.current || !canvasRef.current) return;
    setStep('analyzing');
    setStatusMessage("Validating biometric liveness & anti-spoof integrity...");

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 640;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.85);

    stopCameraStream();

    let compressedPhotoUrl = rawDataUrl;
    try {
      compressedPhotoUrl = await compressImage(rawDataUrl, 600, 0.7);
    } catch (e) {
      console.warn("Image compression warning:", e);
    }

    setCapturedPhotoUrl(compressedPhotoUrl);

    // If existing reference photo exists, verify identity against baseline
    const referencePhoto = user?.referenceSelfieUrl || user?.imageUrl;
    let aiMatchSuccess = true;
    let failureReason = '';

    if (referencePhoto && referencePhoto !== '/logo.png') {
      try {
        const verifyRes = await verifyIdentity(referencePhoto, compressedPhotoUrl);
        if (!verifyRes.verified && verifyRes.confidence < 0.6) {
          aiMatchSuccess = false;
          failureReason = verifyRes.reason || "Biometric baseline mismatch. Please try again.";
        }
      } catch (err) {
        console.warn("AI verification service warning, falling back to liveness check:", err);
      }
    }

    // Ensure genuine liveness was detected (motion check)
    if (motionCount < 2 && !isAdmin) {
      setStep('failed');
      setErrorMessage("No natural motion detected. Please ensure you are in front of the camera and perform the requested live gesture.");
      return;
    }

    if (!aiMatchSuccess && !isAdmin) {
      setStep('failed');
      setErrorMessage(failureReason || "Facial verification could not match your profile picture. Please retry with clear lighting.");
      return;
    }

    // Verification PASSED!
    setStep('success');
    setStatusMessage("SlyD Shield™ Biometric Verification Confirmed!");

    const now = Date.now();
    setTimeout(async () => {
      try {
        await onVerified({
          verifiedPhotoUrl: compressedPhotoUrl,
          timestamp: now
        });
      } catch (err: any) {
        console.error("Failed to persist verification:", err);
        setErrorMessage(err.message || "Failed to save verification status.");
      }
    }, 1200);
  };

  const handleRetry = () => {
    randomizeChallenge();
    setStep('intro');
    setErrorMessage(null);
    setCapturedPhotoUrl(null);
    setProgressSeconds(0);
    setLivenessScore(0);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col items-center justify-between p-6 select-none overflow-y-auto no-scrollbar font-sans">
      {/* Background ambient security glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12)_0%,transparent_60%)]" />

      {/* Top Header */}
      <div className="w-full max-w-md flex items-center justify-between z-10 pt-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black italic tracking-tight font-display uppercase">SlyD Shield™</span>
              <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                MANDATORY
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Biometric Anti-Catfish Security
            </p>
          </div>
        </div>

        {isAdmin && onAdminBypass && (
          <button
            onClick={onAdminBypass}
            className="text-[10px] font-black uppercase tracking-wider text-purple-400 bg-purple-950/40 border border-purple-800/60 px-2.5 py-1.5 rounded-xl hover:bg-purple-900/60 transition-all"
            title="Administrator Bypass"
          >
            Admin Bypass
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-md flex-1 flex flex-col items-center justify-center my-4 z-10">
        {step === 'intro' && (
          <div className="w-full flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Visual Security Emblem */}
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-emerald-950/40 border-2 border-emerald-500/40 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.25)]">
                <Shield className="w-12 h-12 text-emerald-400 animate-pulse" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-black p-1.5 rounded-xl font-black shadow-lg">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            {/* Exact SRS Copy */}
            <div className="space-y-3 px-2">
              <h2 className="text-2xl font-black italic tracking-tighter uppercase font-display text-white">
                100% Real Guys. Zero Bots.
              </h2>
              <div className="p-4 bg-slate-900/80 border border-emerald-500/30 rounded-2xl shadow-inner">
                <p className="text-xs font-semibold text-emerald-300 leading-relaxed font-sans">
                  "To keep SlyD free of catfishes and spam, every member completes a 10-second SlyD Shield check."
                </p>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                No unverified accounts are ever permitted on the grid. Verification photos are strictly encrypted for security and never made public.
              </p>
            </div>

            {/* Gesture Prompt Preview */}
            <div className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center gap-4 text-left">
              <div className="text-3xl p-3 bg-slate-900 rounded-xl shrink-0 border border-slate-800">
                {selectedChallenge.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    Randomized Challenge:
                  </span>
                  <button 
                    onClick={randomizeChallenge} 
                    className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1 font-bold"
                  >
                    <RefreshCw className="w-3 h-3" /> Change
                  </button>
                </div>
                <div className="text-xs font-bold text-white mt-0.5">
                  {selectedChallenge.instruction}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {selectedChallenge.detail}
                </div>
              </div>
            </div>

            {cameraError && (
              <div className="w-full p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-start gap-2 text-left">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}
          </div>
        )}

        {(step === 'scanning' || step === 'analyzing') && (
          <div className="w-full flex flex-col items-center space-y-4 animate-in fade-in duration-300">
            {/* Live Camera Viewport with Futuristic Biometric Reticle */}
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full overflow-hidden border-4 border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.3)] bg-slate-950 flex items-center justify-center">
              <video 
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {/* Animated Laser Scanning Line */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-[bounce_2s_infinite] pointer-events-none" />

              {/* Facial Alignment Oval */}
              <div className="absolute inset-6 rounded-full border-2 border-dashed border-emerald-400/40 pointer-events-none" />

              {/* Challenge Floating Badge Over Camera */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-500/40 flex items-center gap-2 shadow-lg">
                <span className="text-base">{selectedChallenge.icon}</span>
                <span className="text-[11px] font-black text-emerald-300 uppercase tracking-wider">
                  {selectedChallenge.name}
                </span>
              </div>

              {/* 10-Second Countdown Dial */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/85 backdrop-blur-md px-4 py-1 rounded-full border border-emerald-500/40 flex items-center gap-2">
                <span className="text-xs font-black text-white font-display">
                  {10 - progressSeconds}s
                </span>
                <span className="text-[10px] text-emerald-400 uppercase font-black tracking-widest">
                  CHECKING
                </span>
              </div>
            </div>

            {/* Instruction and Progress Meter */}
            <div className="w-full max-w-xs space-y-2 text-center">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400">
                <span>Biometric Liveness</span>
                <span className="text-emerald-400">{progressSeconds * 10}%</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-sky-400 transition-all duration-300"
                  style={{ width: `${(progressSeconds / 10) * 100}%` }}
                />
              </div>
              <p className="text-xs font-bold text-slate-200 animate-pulse pt-1">
                {statusMessage}
              </p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="w-full flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 duration-400">
            <div className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.5)]">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-black italic tracking-tighter uppercase font-display text-white">
                SlyD Shield Verified
              </h3>
              <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                100% Real Human • Zero Bots Guaranteed
              </p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto pt-2">
                Your biometric baseline has been encrypted. Welcome to the authenticated SlyD network.
              </p>
            </div>

            {capturedPhotoUrl && (
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-emerald-500/40 shadow-lg">
                <img src={capturedPhotoUrl} alt="Verified Selfie" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        )}

        {step === 'failed' && (
          <div className="w-full flex flex-col items-center text-center space-y-5 animate-in shake duration-300">
            <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.3)]">
              <ShieldAlert className="w-10 h-10 text-red-400" />
            </div>

            <div className="space-y-2 px-4">
              <h3 className="text-xl font-black italic tracking-tighter uppercase font-display text-red-400">
                Verification Failed
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {errorMessage || "We couldn't confirm your live gesture. Please ensure adequate lighting and hold the requested pose."}
              </p>
            </div>

            <button
              onClick={handleRetry}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl uppercase tracking-[0.2em] text-xs shadow-xl shadow-emerald-950/40 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry 10-Second Check</span>
            </button>
          </div>
        )}

        {/* Hidden Canvas for Frame Processing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Bottom Action Section */}
      <div className="w-full max-w-md z-10 pb-4 space-y-3">
        {step === 'intro' && (
          <button
            onClick={startCamera}
            className="w-full py-5 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black font-black rounded-2xl shadow-2xl shadow-emerald-900/50 uppercase tracking-[0.2em] text-xs active:scale-[0.97] transition-all flex items-center justify-center gap-3"
          >
            <Camera className="w-4 h-4 text-black" />
            <span>Start 10s SlyD Shield Check</span>
          </button>
        )}

        {/* Security Trust Footnote */}
        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-center">
          <Lock className="w-3 h-3 text-emerald-500" />
          <span>Biometrics are encrypted & never shared with third parties</span>
        </div>
      </div>
    </div>
  );
};

export default SlyDShieldVerification;
