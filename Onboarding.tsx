
import React, { useState, useRef } from 'react';
import { MapPin, Camera, X } from 'lucide-react';
import { UserProfile, ProfilePhoto, isAdminUser } from '../types';
import { compressImage } from '../src/lib/image-utils';
import { auth } from '../src/lib/firebase';

const LOOKING_FOR_OPTIONS = ['Chat', 'Dates', 'Friends', 'Networking', 'Right Now'];
const PROFILE_TAG_OPTIONS = ['Travel', 'Music', 'Fitness', 'Gaming', 'Art', 'Food', 'Outdoors', 'Movies', 'Tech', 'Reading', 'Sports', 'Photography'];
const BODY_TYPES = ['Slim', 'Average', 'Athletic', 'Muscular', 'Stocky', 'Large'];

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
    age: 25,
    distance: '150 ft',
    status: 'online',
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=FreshUser',
    bio: '',
    tribes: [],
    lookingFor: [],
    lastSeen: 'Now',
    role: 'Vers',
    height: "5'10\"",
    weight: '170 lbs',
    bodyType: '',
    interests: [],
    relationshipStatus: 'Single',
    hostTravel: 'Both',
    coordinates: { lat: 37.7749, lng: -122.4194 } // Default to San Francisco until location is shared
  });

  const [locationError, setLocationError] = useState<string | null>(null);
  
  const totalSteps = 4;
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const allowLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Location is not available in this browser. You can skip this step.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => {
        setProfile(prev => ({
          ...prev,
          coordinates: { lat: position.coords.latitude, lng: position.coords.longitude }
        }));
        nextStep();
      },
      () => setLocationError('Location access was not granted. You can skip this step.'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const handleFinish = async () => {
    if (!profile.name || !profile.name.trim()) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const now = Date.now();
      const weightValue = (profile.weight || '').trim().replace(/\s*lbs?$/i, '');
      await onComplete({
        ...profile,
        name: profile.name.trim(),
        photos: profile.photos?.length ? profile.photos : [
          {
            id: 'photo_initial',
            url: profile.imageUrl,
            isPrivate: false,
            createdAt: now,
            caption: 'Profile Picture'
          }
        ],
        height: profile.height || `5'10\"`,
        weight: weightValue ? `${weightValue}lbs` : '',
        bodyType: profile.bodyType || '',
        referenceSelfieUrl: '',
        isVerified: false,
        isAdmin: isUserAdmin ? true : Boolean(profile.isAdmin),
        isSelfieExempt: isUserAdmin,
        isNewUser: true,
        createdAt: now,
      });
    } catch (err: any) {
      console.warn("Onboarding handleFinish error:", err);
      // Fallback message if needed
      setSubmitError(err?.message || "Error completing profile setup.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 6 - (profile.photos?.length || 0));
    e.target.value = '';
    if (!files.length) return;
    const readPhoto = (file: File) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          resolve(await compressImage(reader.result as string, 600, 0.7));
        } catch {
          resolve(reader.result as string);
        }
      };
      reader.onerror = () => reject(new Error('Could not read this photo.'));
      reader.readAsDataURL(file);
    });
    try {
      const urls = await Promise.all(files.map(readPhoto));
      const now = Date.now();
      const additions: ProfilePhoto[] = urls.map((url, index) => ({
        id: `photo_${now}_${index}`,
        url,
        isPrivate: false,
        createdAt: now,
        caption: 'Profile Photo'
      }));
      const photos = [...(profile.photos || []), ...additions].slice(0, 6);
      setProfile(prev => ({ ...prev, photos, imageUrl: photos[0]?.url || prev.imageUrl }));
    } catch (err) {
      console.error('Photo upload failed:', err);
    }
  };

  const removePhoto = (photoId: string) => {
    setProfile(prev => {
      const photos = (prev.photos || []).filter(photo => photo.id !== photoId);
      return { ...prev, photos, imageUrl: photos[0]?.url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=FreshUser' };
    });
  };

  const toggleInterest = (interest: string) => {
    setProfile(prev => {
      const current = prev.interests || [];
      const interests = current.includes(interest)
        ? current.filter(i => i !== interest)
        : [...current, interest];
      return { ...prev, interests };
    });
  };

  const toggleLookingFor = (intent: string) => {
    setProfile(prev => {
      const current = prev.lookingFor || [];
      const lookingFor = current.includes(intent)
        ? current.filter(item => item !== intent)
        : [...current, intent];
      return { ...prev, lookingFor };
    });
  };

  return (
    <div className="flex h-[100dvh] w-full max-w-lg flex-col mx-auto overflow-y-auto overflow-x-hidden bg-[#090a0d] px-6 pt-8 pb-6 text-white no-scrollbar">
      <div className="mb-4 text-xs font-semibold tracking-wide text-sky-400">{step} / {totalSteps}</div>

      {step === 1 && (
        <section className="flex-1 animate-in slide-in-from-right duration-300">
          <h2 className="mb-7 text-2xl font-bold tracking-tight text-white">Basic Info</h2>
          <div className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="display-name" className="text-xs font-medium text-slate-400">Display Name</label>
              <input id="display-name" type="text" placeholder="Your name" value={profile.name} onChange={e => setProfile(prev => ({ ...prev, name: e.target.value }))} className="w-full rounded-xl border border-[#303036] bg-[#1b1b20] px-4 py-3 text-sm text-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <label htmlFor="profile-age" className="text-xs font-medium text-slate-400">Age</label>
                <input id="profile-age" type="number" min="18" max="99" value={profile.age} onChange={e => setProfile(prev => ({ ...prev, age: parseInt(e.target.value, 10) || 18 }))} className="w-full rounded-xl border border-[#303036] bg-[#1b1b20] px-3 py-3 text-sm text-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
              </div>
              <div className="space-y-2">
                <label htmlFor="profile-height" className="text-xs font-medium text-slate-400">Height</label>
                <input id="profile-height" type="text" placeholder={'5\'10"'} value={profile.height || ''} onChange={e => setProfile(prev => ({ ...prev, height: e.target.value }))} className="w-full rounded-xl border border-[#303036] bg-[#1b1b20] px-3 py-3 text-sm text-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
              </div>
              <div className="space-y-2">
                <label htmlFor="profile-weight" className="text-xs font-medium text-slate-400">Weight</label>
                <input id="profile-weight" type="text" placeholder="170 lbs" value={profile.weight || ''} onChange={e => setProfile(prev => ({ ...prev, weight: e.target.value }))} className="w-full rounded-xl border border-[#303036] bg-[#1b1b20] px-3 py-3 text-sm text-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="body-type" className="text-xs font-medium text-slate-400">Body Type</label>
              <select id="body-type" value={profile.bodyType || ''} onChange={e => setProfile(prev => ({ ...prev, bodyType: e.target.value }))} className="w-full appearance-none rounded-xl border border-[#303036] bg-[#1b1b20] px-4 py-3 text-sm text-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500">
                <option value="">Select</option>
                {BODY_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="profile-bio" className="text-xs font-medium text-slate-400">About you</label>
              <textarea id="profile-bio" rows={4} placeholder="Write something about yourself..." value={profile.bio} onChange={e => setProfile(prev => ({ ...prev, bio: e.target.value }))} className="w-full resize-none rounded-xl border border-[#303036] bg-[#1b1b20] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
            </div>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="flex-1 animate-in slide-in-from-right duration-300">
          <h2 className="mb-7 text-2xl font-bold tracking-tight text-white">Photos</h2>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }, (_, index) => {
              const photo = profile.photos?.[index];
              return (
                <div key={photo?.id || index} className="relative aspect-square overflow-hidden rounded-xl border border-[#303036] bg-[#1b1b20]">
                  {photo ? (
                    <>
                      <img src={photo.url} alt={`Profile photo ${index + 1}`} className="h-full w-full object-cover" />
                      <button type="button" onClick={() => removePhoto(photo.id)} aria-label={`Remove photo ${index + 1}`} className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white hover:bg-black">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-full w-full flex-col items-center justify-center gap-2 text-xs text-slate-400 hover:text-white">
                      <Camera className="h-5 w-5" />
                      Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">Add up to 6 photos. You can skip this step.</p>
        </section>
      )}

      {step === 3 && (
        <section className="flex flex-1 flex-col items-center justify-center animate-in slide-in-from-right duration-300 text-center">
          <div className="mb-7 flex h-20 w-20 items-center justify-center rounded-full bg-[#1b1b20] text-sky-400">
            <MapPin className="h-8 w-8" />
          </div>
          <h2 className="mb-8 text-2xl font-bold tracking-tight text-white">Location</h2>
          <button type="button" onClick={allowLocation} className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-400">
            <MapPin className="h-4 w-4" />
            Allow Location
          </button>
          {locationError && <p role="status" className="mt-3 text-xs text-amber-300">{locationError}</p>}
          <button type="button" onClick={nextStep} className="mt-4 text-sm text-slate-400 hover:text-white">Skip for now</button>
        </section>
      )}

      {step === 4 && (
        <section className="flex-1 animate-in slide-in-from-right duration-300">
          <h2 className="mb-7 text-2xl font-bold tracking-tight text-white">Interests</h2>
          <div className="mb-8 flex flex-wrap gap-2">
            {LOOKING_FOR_OPTIONS.map(intent => (
              <button key={intent} type="button" onClick={() => toggleLookingFor(intent)} aria-pressed={profile.lookingFor.includes(intent)} className={`rounded-full border px-4 py-2 text-sm transition-colors ${profile.lookingFor.includes(intent) ? 'border-sky-500 bg-sky-500 text-white' : 'border-[#303036] bg-[#1b1b20] text-slate-300 hover:border-slate-500'}`}>
                {intent}
              </button>
            ))}
          </div>
          <h3 className="mb-4 text-base font-semibold text-white">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {PROFILE_TAG_OPTIONS.map(interest => (
              <button key={interest} type="button" onClick={() => toggleInterest(interest)} aria-pressed={Boolean(profile.interests?.includes(interest))} className={`rounded-full border px-4 py-2 text-sm transition-colors ${profile.interests?.includes(interest) ? 'border-sky-500 bg-sky-500 text-white' : 'border-[#303036] bg-[#1b1b20] text-slate-300 hover:border-slate-500'}`}>
                {interest}
              </button>
            ))}
          </div>
        </section>
      )}

      {step !== 3 && (
        <div className="flex gap-3 pt-8">
          {step > 1 && (
            <button type="button" onClick={prevStep} className="flex-1 rounded-xl border border-[#303036] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1b1b20]">Back</button>
          )}
          <button type="button" onClick={step === totalSteps ? handleFinish : nextStep} disabled={(step === 1 && (!profile.name.trim() || profile.age < 18 || profile.age > 99)) || isSubmitting} className="flex-1 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40">
            {isSubmitting ? 'Creating profile...' : step === totalSteps ? "Let's Go" : 'Next'}
          </button>
        </div>
      )}
      {submitError && <div role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{submitError}</div>}
    </div>
  );
};

export default Onboarding;
