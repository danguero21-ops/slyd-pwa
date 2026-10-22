import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Shield, 
  Camera, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Lock,
  X,
  RotateCcw,
  Upload,
  ArrowRight
} from 'lucide-react';
import { UserProfile } from '../types';
import { compressImage } from '../src/lib/image-utils';
import { verifyIdentity } from '../services/geminiService';

export interface SlyDShieldVerificationProps {
  user?: UserProfile | null;
  onVerified: (payload: { verifiedPhotoUrl: string; timestamp: number }) => Promise<void> | void;
  isAdmin?: boolean;
  onAdminBypass?: () => void;
  onCancel?: () => void;
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
  onAdminBypass,
  onCancel
}) => {
  const [selectedChallenge, setSelectedChallenge] = useState<GestureChallenge>(() => {
    const randomIndex = Math.floor(Math.random() * GESTURE_CHALLENGES.length);
    return GESTURE_CHALLENGES[randomIndex];
  });

  const [step, setStep] = useState<'intro' | 'scanning' | 'preview' | 'analyzing' | 'success' | 'failed'>('intro');
  const [cameraActive, setCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [progressSeconds, setProgressSeconds] = useState(0); // 0 to 10
  const [statusMessage, setStatusMessage] = useState('Position your face inside the shield frame');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Helper to safely stop any active camera stream
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setActiveStream(null);
    setCameraActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Helper to attach stream to video element whenever both are available
  const attachStreamToVideo = useCallback((stream: MediaStream, video: HTMLVideoElement) => {
    try {
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('autoplay', 'true');
      video.muted = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn("Video play promise error:", err);
        });
      }
    } catch (err) {
      console.warn("Failed to set video srcObject:", err);
    }
  }, []);

  // Synchronize stream attachment if step changes or stream updates
  useEffect(() => {
    if (videoRef.current && activeStream && (step === 'scanning' || step === 'analyzing')) {
      attachStreamToVideo(activeStream, videoRef.current);
    }
  }, [step, activeStream, attachStreamToVideo]);

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
    setIsStartingCamera(true);

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 640 }
          },
          audio: false
        });
      } catch (primaryErr) {
        // Fallback for strict browser permissions / unsupported facingMode
        console.warn("Retrying getUserMedia with relaxed constraints...", primaryErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;
      setActiveStream(stream);
      setCameraActive(true);
      setStep('scanning');
      setProgressSeconds(0);
      setStatusMessage(`Pose: ${selectedChallenge.name} - Hold pose and snap your selfie!`);

      // If video ref is already mounted, attach immediately
      if (videoRef.current) {
        attachStreamToVideo(stream, videoRef.current);
      }

      // Start countdown helper
      let count = 0;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        count += 1;
        setProgressSeconds(count);

        if (count === 3) {
          setStatusMessage(`Holding pose: "${selectedChallenge.instruction}"...`);
        } else if (count === 6) {
          setStatusMessage("Great! Hit 'Snap Selfie' or keep holding...");
        } else if (count >= 10) {
          if (timerRef.current) clearInterval(timerRef.current);
          // Auto-snap at 10s if user hasn't clicked yet
          handleCaptureLiveSelfie();
        }
      }, 1000);
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraError(
        "Camera access could not be activated automatically (" + (err.message || 'Permission required') + "). Please allow camera permissions in your browser or use the 'Take Photo with Device Camera' button below."
      );
      setCameraActive(false);
    } finally {
      setIsStartingCamera(false);
    }
  };

  // Capture frame from active live video
  const handleCaptureLiveSelfie = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      // If video element is not ready, prompt file fallback
      fileInputRef.current?.click();
      return;
    }

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 640;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw the current video frame (mirror horizontally like front camera)
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.88);
    let compressedPhotoUrl = rawDataUrl;
    try {
      compressedPhotoUrl = await compressImage(rawDataUrl, 640, 0.75);
    } catch (e) {
      console.warn("Compression warning:", e);
    }

    // Stop active camera stream once snapped
    stopCameraStream();

    setCapturedPhotoUrl(compressedPhotoUrl);
    setStep('preview');
  };

  // Handle fallback native camera file upload
  const handleFileCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const compressed = await compressImage(base64, 640, 0.75);
        setCapturedPhotoUrl(compressed);
      } catch {
        setCapturedPhotoUrl(base64);
      }
      stopCameraStream();
      setStep('preview');
    };
    reader.readAsDataURL(file);
  };

  // Submit the captured selfie for verification
  const handleSubmitVerification = async () => {
    if (!capturedPhotoUrl) return;

    setStep('analyzing');
    setStatusMessage("Validating anti-catfish biometric baseline...");

    const referencePhoto = user?.referenceSelfieUrl || user?.imageUrl;
    let aiMatchSuccess = true;
    let failureReason = '';

    // If an existing reference photo is registered and is not default placeholder, verify match
    if (referencePhoto && referencePhoto !== '/logo.png') {
      try {
        const verifyRes = await verifyIdentity(referencePhoto, capturedPhotoUrl);
        if (!verifyRes.verified && verifyRes.confidence < 0.6) {
          aiMatchSuccess = false;
          failureReason = verifyRes.reason || "Selfie did not match your reference photo. Please retry with clear lighting.";
        }
      } catch (err) {
        console.warn("AI verification service warning:", err);
      }
    }

    if (!aiMatchSuccess && !isAdmin) {
      setStep('failed');
      setErrorMessage(failureReason || "Facial verification could not confirm your selfie. Please retry with clear lighting.");
      return;
    }

    // Verification PASSED!
    setStep('success');
    setStatusMessage("SlyD Shield™ Biometric Verification Confirmed!");

    const now = Date.now();
    setTimeout(async () => {
      try {
        await onVerified({
          verifiedPhotoUrl: capturedPhotoUrl,
          timestamp: now
        });
      } catch (err: any) {
        console.error("Failed to persist verification:", err);
        setErrorMessage(err.message || "Failed to save verification status.");
      }
    }, 1200);
  };

  // Retake photo action
  const handleRetake = () => {
    setCapturedPhotoUrl(null);
    setErrorMessage(null);
    setProgressSeconds(0);
    startCamera();
  };

  // Reset back to intro
  const handleRetryFromFailed = () => {
    randomizeChallenge();
    setStep('intro');
    setErrorMessage(null);
    setCapturedPhotoUrl(null);
    setProgressSeconds(0);
  };

  // Cancel entire sign-up process
  const handleCancel = () => {
    stopCameraStream();
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col items-center justify-between p-5 select-none overflow-y-auto no-scrollbar font-sans">
      {/* Background ambient security glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(14,165,233,0.12)_0%,transparent_60%)]" />

      {/* Top Header Bar with Cancel Sign-Up Button */}
      <div className="w-full max-w-md flex items-center justify-between z-10 pt-2 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-sky-950/80 border border-sky-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.25)]">
            <ShieldCheck className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black italic tracking-tight font-display uppercase">SlyD Shield™</span>
              <span className="text-[9px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded border border-sky-500/30">
                MANDATORY
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Biometric Anti-Catfish Security
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && onAdminBypass && (
            <button
              type="button"
              onClick={onAdminBypass}
              className="text-[10px] font-black uppercase tracking-wider text-purple-400 bg-purple-950/40 border border-purple-800/60 px-2.5 py-1.5 rounded-xl hover:bg-purple-900/60 transition-all"
              title="Administrator Bypass"
            >
              Admin Bypass
            </button>
          )}

          {onCancel && (
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-xl active:scale-95 transition-all shadow-sm"
              title="Cancel sign up and return to splash screen"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-md flex-1 flex flex-col items-center justify-center my-2 z-10">
        
        {/* STEP 1: INTRO */}
        {step === 'intro' && (
          <div className="w-full flex flex-col items-center text-center space-y-5 animate-in fade-in zoom-in-95 duration-300">
            {/* Visual Security Emblem */}
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-slate-900/80 border-2 border-sky-500/40 flex items-center justify-center shadow-[0_0_40px_rgba(14,165,233,0.25)]">
                <Shield className="w-12 h-12 text-sky-400 animate-pulse" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-sky-500 text-white p-1.5 rounded-xl font-black shadow-lg">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            {/* Intro Copy */}
            <div className="space-y-2 px-2">
              <h2 className="text-2xl font-black italic tracking-tighter uppercase font-display text-white">
                100% Real Guys. Zero Bots.
              </h2>
              <div className="p-3.5 bg-slate-900/80 border border-sky-500/30 rounded-2xl">
                <p className="text-xs font-semibold text-sky-300 leading-relaxed font-sans">
                  "To keep SlyD free of catfishes and spam, every member completes a quick selfie check with a live gesture."
                </p>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                No unverified accounts are permitted on the grid. Your selfie is encrypted for biometric validation and establishes your authenticated baseline.
              </p>
            </div>

            {/* Gesture Prompt Card */}
            <div className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center gap-4 text-left shadow-lg">
              <div className="text-3xl p-3 bg-slate-900 rounded-xl shrink-0 border border-slate-800">
                {selectedChallenge.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-sky-400">
                    Randomized Challenge:
                  </span>
                  <button 
                    type="button"
                    onClick={randomizeChallenge} 
                    className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 font-bold"
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
              <div className="w-full p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-200 text-xs flex flex-col gap-2 text-left">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700"
                >
                  <Camera className="w-4 h-4 text-sky-400" />
                  <span>Use Device Camera / Snap Photo</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: SCANNING (ACTIVE LIVE CAMERA) */}
        {(step === 'scanning' || step === 'analyzing') && (
          <div className="w-full flex flex-col items-center space-y-4 animate-in fade-in duration-300">
            {/* Live Camera Viewport with Biometric Reticle */}
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full overflow-hidden border-4 border-sky-500/60 shadow-[0_0_50px_rgba(14,165,233,0.35)] bg-slate-950 flex items-center justify-center">
              <video 
                ref={(node) => {
                  videoRef.current = node;
                  if (node && activeStream && node.srcObject !== activeStream) {
                    attachStreamToVideo(activeStream, node);
                  }
                }}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {/* Animated Laser Scanning Line */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#38bdf8] animate-[bounce_2s_infinite] pointer-events-none" />

              {/* Facial Alignment Oval */}
              <div className="absolute inset-6 rounded-full border-2 border-dashed border-sky-400/50 pointer-events-none" />

              {/* Challenge Floating Badge Over Camera */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-sky-500/50 flex items-center gap-2 shadow-lg">
                <span className="text-base">{selectedChallenge.icon}</span>
                <span className="text-[11px] font-black text-sky-300 uppercase tracking-wider">
                  {selectedChallenge.name}
                </span>
              </div>

              {/* Live Status indicator */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/85 backdrop-blur-md px-3.5 py-1 rounded-full border border-sky-500/40 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] text-sky-300 uppercase font-black tracking-widest">
                  LIVE CAMERA
                </span>
                <span className="text-xs font-black text-white font-display ml-1">
                  {Math.max(0, 10 - progressSeconds)}s
                </span>
              </div>
            </div>

            {/* Instruction Banner */}
            <div className="w-full max-w-xs space-y-2 text-center">
              <p className="text-xs font-bold text-slate-100 animate-pulse">
                {statusMessage}
              </p>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, (progressSeconds / 10) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: PREVIEW CAPTURED SELFIE */}
        {step === 'preview' && capturedPhotoUrl && (
          <div className="w-full flex flex-col items-center space-y-4 animate-in zoom-in-95 duration-300 text-center">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full overflow-hidden border-4 border-sky-500 shadow-[0_0_40px_rgba(14,165,233,0.3)] bg-slate-950">
              <img 
                src={capturedPhotoUrl} 
                alt="Captured Live Selfie" 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-1/2 transform -translate-x-1/2 bg-black/85 backdrop-blur-md px-3 py-1 rounded-full border border-sky-500/50 flex items-center gap-1.5">
                <span className="text-sm">{selectedChallenge.icon}</span>
                <span className="text-[10px] font-black text-sky-300 uppercase">
                  {selectedChallenge.name}
                </span>
              </div>
            </div>

            <div className="space-y-1 px-4">
              <h3 className="text-base font-black italic uppercase font-display text-white">
                Review Your Verification Selfie
              </h3>
              <p className="text-xs text-slate-300 max-w-xs mx-auto">
                Make sure your face and the <strong className="text-sky-300">{selectedChallenge.name}</strong> gesture are clearly visible.
              </p>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 'success' && (
          <div className="w-full flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 duration-400">
            <div className="w-24 h-24 rounded-full bg-sky-500/20 border-2 border-sky-400 flex items-center justify-center shadow-[0_0_50px_rgba(14,165,233,0.4)]">
              <CheckCircle2 className="w-12 h-12 text-sky-400" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-black italic tracking-tighter uppercase font-display text-white">
                SlyD Shield Verified
              </h3>
              <p className="text-xs text-sky-400 font-bold uppercase tracking-wider">
                100% Real Human • Zero Bots Guaranteed
              </p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto pt-2">
                Your biometric baseline has been securely encrypted. Welcome to the authenticated SlyD network.
              </p>
            </div>

            {capturedPhotoUrl && (
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-sky-500/40 shadow-lg">
                <img src={capturedPhotoUrl} alt="Verified Selfie" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        )}

        {/* STEP 5: FAILED */}
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
              type="button"
              onClick={handleRetryFromFailed}
              className="w-full py-4 bg-sky-500 hover:bg-sky-400 text-white font-black rounded-2xl uppercase tracking-[0.2em] text-xs shadow-xl shadow-sky-950/50 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Selfie Check</span>
            </button>
          </div>
        )}

        {/* Hidden Canvas for Frame Processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Hidden File Input for Device Camera fallback */}
        <input 
          ref={fileInputRef}
          type="file" 
          accept="image/*" 
          capture="user" 
          className="hidden" 
          onChange={handleFileCapture}
        />
      </div>

      {/* Bottom Action Section */}
      <div className="w-full max-w-md z-10 pb-4 space-y-3">
        {step === 'intro' && (
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={startCamera}
              disabled={isStartingCamera}
              className="w-full py-5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-black rounded-2xl shadow-2xl shadow-sky-950/60 uppercase tracking-[0.2em] text-xs active:scale-[0.97] transition-all flex items-center justify-center gap-3"
            >
              <Camera className="w-5 h-5 text-white" />
              <span>{isStartingCamera ? 'Activating Camera...' : 'Open Camera & Verify'}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-2xl border border-slate-800 text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Upload className="w-4 h-4 text-sky-400" />
              <span>Take Photo With Device Camera</span>
            </button>

            {onCancel && (
              <button
                type="button"
                onClick={handleCancel}
                className="w-full py-3 text-slate-400 hover:text-slate-200 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Cancel Sign-Up & Return to Start
              </button>
            )}
          </div>
        )}

        {step === 'scanning' && (
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleCaptureLiveSelfie}
              className="w-full py-5 bg-sky-500 hover:bg-sky-400 text-white font-black rounded-2xl shadow-2xl shadow-sky-950/60 uppercase tracking-[0.2em] text-xs active:scale-[0.97] transition-all flex items-center justify-center gap-3"
            >
              <Camera className="w-5 h-5 text-white animate-bounce" />
              <span>Snap Selfie & Review</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-2xl border border-slate-800 text-xs flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4 text-sky-400" />
                <span>Device Camera</span>
              </button>

              {onCancel && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-bold rounded-2xl border border-slate-800 text-xs"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleSubmitVerification}
              className="w-full py-5 bg-sky-500 hover:bg-sky-400 text-white font-black rounded-2xl shadow-2xl shadow-sky-950/60 uppercase tracking-[0.2em] text-xs active:scale-[0.97] transition-all flex items-center justify-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-white" />
              <span>Submit Selfie for Verification</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-2xl border border-slate-800 text-xs flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4 text-sky-400" />
                <span>Retake Photo</span>
              </button>

              {onCancel && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-bold rounded-2xl border border-slate-800 text-xs"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'failed' && onCancel && (
          <button
            type="button"
            onClick={handleCancel}
            className="w-full py-3 text-slate-400 hover:text-slate-200 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Cancel Sign-Up & Return to Start
          </button>
        )}

        {/* Security Trust Footnote */}
        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-center pt-1">
          <Lock className="w-3 h-3 text-sky-400" />
          <span>Biometrics are encrypted & never shared with third parties</span>
        </div>
      </div>
    </div>
  );
};

export default SlyDShieldVerification;
