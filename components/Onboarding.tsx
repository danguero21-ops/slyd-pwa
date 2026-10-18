
import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Shield } from 'lucide-react';
import { UserProfile, isAdminUser } from '../types';
import { INTERESTS, RACES, DISABLE_PHOTO_VERIFICATION } from '../constants';
import { compressImage } from '../src/lib/image-utils';
import { verifyIdentity } from '../services/geminiService';
import { auth } from '../src/lib/firebase';
import { CheckCircle2, XCircle, ShieldCheck, Camera, Sparkles } from 'lucide-react';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => Promise<void>;
  isAdmin?: boolean;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, isAdmin: propIsAdmin }) => {
  const isUserAdmin = Boolean(
    propIsAdmin || 
    isAdminUser(null, auth.currentUser?.email)
  );

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>({
    id: 'me',
    name: '',
    age: 18,
    distance: '0m',
    status: 'online',
    imageUrl: `/logo.png`,
    bio: '',
    tribes: [],
    lookingFor: [],
    lastSeen: 'Now',
    role: 'Vers',
    height: "5'9\"",
    weight: '160',
    race: 'White',
    interests: [],
    relationshipStatus: 'Single',
    hostTravel: 'Both',
    coordinates: { lat: 34.0522, lng: -118.2437 } // Default to LA
  });

  const [heightFeet, setHeightFeet] = useState(5);
  const [heightInches, setHeightInches] = useState(9);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'failed' | 'success'>('idle');
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  
  const totalSteps = 5;
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        setProfile(prev => ({
          ...prev,
          coordinates: { lat: latitude, lng: longitude }
        }));

        // Reverse Geocode using Nominatim (Free/Open OSM)
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          if (data.address) {
            const city = data.address.city || data.address.town || data.address.village || data.address.suburb;
            const state = data.address.state || data.address.country;
            setLocationName(city ? `${city}, ${state}` : data.display_name);
          }
        } catch (err) {
          console.error("Reverse geocoding failed:", err);
        }
      });
    }
  }, []);

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const searchLocation = async () => {
    if (!locationName.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`);
      const data = await response.json();
      if (data && data[0]) {
        setProfile({
          ...profile,
          coordinates: { 
            lat: parseFloat(data[0].lat), 
            lng: parseFloat(data[0].lon) 
          }
        });
        setLocationName(data[0].display_name);
      }
    } catch (err) {
      console.error("Location search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFinish = async () => {
    if (!profile.name || !profile.name.trim()) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const now = Date.now();
      await onComplete({
        ...profile,
        name: profile.name.trim(),
        photos: [
          {
            id: 'photo_initial',
            url: profile.imageUrl,
            isPrivate: false,
            createdAt: now,
            caption: 'Profile Picture'
          }
        ],
        height: `${heightFeet}'${heightInches}\"`,
        weight: `${profile.weight}lbs`,
        referenceSelfieUrl: '',
        isVerified: isUserAdmin && Boolean(selfieUrl),
        isAdmin: isUserAdmin ? true : Boolean(profile.isAdmin),
        isSelfieExempt: isUserAdmin,
        isNewUser: true,
        createdAt: now,
        ...(selfieUrl ? { lastVerifiedAt: now, lastSelfieAttemptAt: now } : {})
      });
    } catch (err: any) {
      console.warn("Onboarding handleFinish error:", err);
      // Fallback message if needed
      setSubmitError(err?.message || "Error completing profile setup.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImage(reader.result as string, 600, 0.7);
          setProfile({ ...profile, imageUrl: compressed });
        } catch (err) {
          console.error("Image compression failed:", err);
          setProfile({ ...profile, imageUrl: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setIsCapturing(false);
    }
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
          const compressed = await compressImage(dataUrl, 600, 0.6); // Slightly lower quality for verification
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

  const toggleInterest = (interest: string) => {
    const current = profile.interests || [];
    const updated = current.includes(interest)
      ? current.filter(i => i !== interest)
      : [...current, interest];
    setProfile({ ...profile, interests: updated });
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-slate-950 p-8 overflow-y-auto overflow-x-hidden no-scrollbar">
      <div className="w-full h-1 bg-slate-900 rounded-full mb-12 overflow-hidden">
        <div 
          className="h-full bg-sky-500 transition-all duration-500" 
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      {step === 1 && (
        <div className="flex-1 animate-in slide-in-from-right duration-300">
          <h2 className="text-3xl font-black italic tracking-tighter text-white mb-2 uppercase font-display">Who are you?</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-10 font-sans">Let's start with the basics</p>
          
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Display Name</label>
              <input 
                type="text"
                placeholder="James"
                value={profile.name}
                onChange={e => setProfile({...profile, name: e.target.value})}
                className="w-full bg-slate-900 border-none rounded-2xl px-5 py-4 text-slate-100 focus:ring-1 focus:ring-sky-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Age</label>
                <input 
                  type="number"
                  min="18"
                  max="99"
                  value={profile.age}
                  onChange={e => setProfile({...profile, age: parseInt(e.target.value) || 18})}
                  className="w-full bg-slate-900 border-none rounded-2xl px-5 py-4 text-slate-100 focus:ring-1 focus:ring-sky-500 outline-none"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Race</label>
                <select 
                  value={profile.race}
                  onChange={e => setProfile({...profile, race: e.target.value})}
                  className="w-full bg-slate-900 border-none rounded-2xl px-5 py-4 text-slate-100 focus:ring-1 focus:ring-sky-500 outline-none appearance-none"
                >
                  {RACES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Height</label>
                <div className="flex gap-2">
                  <select 
                    value={heightFeet}
                    onChange={e => setHeightFeet(parseInt(e.target.value))}
                    className="flex-1 bg-slate-900 border-none rounded-2xl px-4 py-4 text-slate-100 focus:ring-1 focus:ring-sky-500 outline-none appearance-none"
                  >
                    {[4,5,6,7].map(f => <option key={f} value={f}>{f} ft</option>)}
                  </select>
                  <select 
                    value={heightInches}
                    onChange={e => setHeightInches(parseInt(e.target.value))}
                    className="flex-1 bg-slate-900 border-none rounded-2xl px-4 py-4 text-slate-100 focus:ring-1 focus:ring-sky-500 outline-none appearance-none"
                  >
                    {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => <option key={i} value={i}>{i} in</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Weight (lbs)</label>
                <input 
                  type="number"
                  value={profile.weight?.replace('lbs', '')}
                  onChange={e => setProfile({...profile, weight: e.target.value})}
                  className="w-full bg-slate-900 border-none rounded-2xl px-5 py-4 text-slate-100 focus:ring-1 focus:ring-sky-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex-1 animate-in slide-in-from-right duration-300">
          <h2 className="text-3xl font-black italic tracking-tighter text-white mb-2 uppercase font-display">Your Vibe</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-10 font-sans">What are you looking for?</p>
          
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Role</label>
              <div className="grid grid-cols-2 gap-3">
                {['Top', 'Bottom', 'Vers', 'Side'].map(r => (
                  <button
                    key={r}
                    onClick={() => setProfile({...profile, role: r as any})}
                    className={`py-4 rounded-2xl font-black uppercase text-xs border-2 transition-all ${
                      profile.role === r ? 'bg-sky-500 border-sky-500 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Relationship Status</label>
              <select 
                value={profile.relationshipStatus}
                onChange={e => setProfile({...profile, relationshipStatus: e.target.value as any})}
                className="w-full bg-slate-900 border-none rounded-2xl px-5 py-4 text-slate-100 focus:ring-1 focus:ring-sky-500 outline-none appearance-none"
              >
                <option value="Single">Single</option>
                <option value="Taken">Taken</option>
                <option value="Open">Open</option>
                <option value="Complicated">Complicated</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Host / Travel</label>
              <select 
                value={profile.hostTravel}
                onChange={e => setProfile({...profile, hostTravel: e.target.value as any})}
                className="w-full bg-slate-900 border-none rounded-2xl px-5 py-4 text-slate-100 focus:ring-1 focus:ring-sky-500 outline-none appearance-none"
              >
                <option value="Host">Host</option>
                <option value="Travel">Travel</option>
                <option value="Both">Both</option>
                <option value="Neither">Neither</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex-1 animate-in slide-in-from-right duration-300">
          <h2 className="text-3xl font-black italic tracking-tighter text-white mb-2 uppercase font-display">Interests</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-10 font-sans">Select what you love</p>
          
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map(interest => (
              <button
                key={interest}
                onClick={() => toggleInterest(interest)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  profile.interests?.includes(interest) 
                    ? 'bg-sky-500 border-sky-500 text-white' 
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="flex-1 animate-in slide-in-from-right duration-300">
          <h2 className="text-3xl font-black italic tracking-tighter text-white mb-2 uppercase font-display">Pin Point</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-10 font-sans">Where do you want to Slyd?</p>
          
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Your Location</label>
              <div className="relative group">
                <input 
                  type="text"
                  placeholder="Search for your city..."
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchLocation()}
                  className="w-full bg-slate-900 border-none rounded-2xl px-5 py-4 text-slate-100 focus:ring-1 focus:ring-sky-500 outline-none pr-14 transition-all"
                />
                <button 
                  onClick={searchLocation}
                  disabled={isSearching}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-sky-500 hover:bg-sky-400 text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  {isSearching ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest px-1 flex items-center gap-1.5">
                <MapPin className="w-2.5 h-2.5" /> Powered by OpenStreetMap
              </p>
            </div>

            <div className="p-5 bg-sky-500/5 rounded-3xl border border-sky-500/10 flex items-center gap-4">
              <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center text-white shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-white mb-0.5">Current Discovery Area</p>
                <p className="text-[10px] text-slate-400">We'll show you guys in this area automatically.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="flex-1 animate-in slide-in-from-right duration-300">
          <h2 className="text-3xl font-black italic tracking-tighter text-white mb-2 uppercase font-display">Finish Profile</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-10 font-sans">Add your vibe and photo</p>
          
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Bio</label>
              <textarea 
                placeholder="Tell the community something about you..."
                rows={4}
                value={profile.bio}
                onChange={e => setProfile({...profile, bio: e.target.value})}
                className="w-full bg-slate-900 border-none rounded-2xl px-5 py-4 text-slate-100 focus:ring-1 focus:ring-sky-500 outline-none resize-none"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Profile Photo</label>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handlePhotoUpload} 
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-4 p-4 bg-slate-900 hover:bg-slate-800 rounded-2xl border border-slate-800 cursor-pointer transition-colors"
              >
                <div className="w-16 h-16 bg-sky-500/10 rounded-2xl flex items-center justify-center text-sky-400 overflow-hidden shrink-0">
                  {profile.imageUrl && !profile.imageUrl.includes('dicebear') ? (
                    <img src={profile.imageUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-200">Upload Photo</p>
                  <p className="text-xs text-slate-500">Tap to select an image</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="pt-10 flex gap-3">
        {step > 1 && (
          <button 
            onClick={prevStep}
            className="flex-1 py-5 bg-slate-900 text-slate-500 font-black rounded-2xl uppercase tracking-[0.2em] text-sm active:scale-[0.98] transition-all"
          >
            Back
          </button>
        )}
        <button 
          onClick={step === totalSteps ? handleFinish : nextStep}
          disabled={(step === 1 && !profile.name.trim()) || isSubmitting}
          className="flex-[2] py-5 bg-sky-500 text-white font-black rounded-2xl shadow-xl shadow-sky-900/40 uppercase tracking-[0.2em] text-sm active:scale-[0.98] transition-all disabled:opacity-30 flex items-center justify-center gap-3"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : step === totalSteps ? 'Start Slyding' : 'Next Step'}
        </button>
      </div>
      {submitError && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[10px] font-bold uppercase tracking-widest text-center">
          {submitError}
        </div>
      )}
    </div>
  );
};

export default Onboarding;
