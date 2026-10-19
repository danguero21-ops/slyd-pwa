import React, { useState } from 'react';
import { UserProfile, Role, RelationshipStatus } from '../types';
import { ShieldCheck, Camera, Sparkles, User, ArrowRight } from 'lucide-react';
import { compressImage } from '../src/lib/image-utils';

interface MinimalProfileSetupProps {
  initialPhotoUrl?: string;
  onComplete: (profile: Partial<UserProfile>) => Promise<void> | void;
  isShieldVerified?: boolean;
}

const ROLES: Role[] = ['Vers', 'Top', 'Vers Top', 'Vers Bottom', 'Bottom', 'Side'];

export const MinimalProfileSetup: React.FC<MinimalProfileSetupProps> = ({
  initialPhotoUrl,
  onComplete,
  isShieldVerified = true
}) => {
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState<number>(24);
  const [heightFeet, setHeightFeet] = useState(5);
  const [heightInches, setHeightInches] = useState(10);
  const [weightLbs, setWeightLbs] = useState(165);
  const [role, setRole] = useState<Role>('Vers');
  const [bio, setBio] = useState('');
  const [primaryPhotoUrl, setPrimaryPhotoUrl] = useState<string>(initialPhotoUrl || '/logo.png');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImage(reader.result as string, 600, 0.75);
          setPrimaryPhotoUrl(compressed);
        } catch {
          setPrimaryPhotoUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please provide a display name.');
      return;
    }
    if (age < 18) {
      setError('You must be 18 or older to join SlyD.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const now = Date.now();
      await onComplete({
        name: displayName.trim(),
        age,
        imageUrl: primaryPhotoUrl,
        referenceSelfieUrl: initialPhotoUrl || primaryPhotoUrl,
        height: `${heightFeet}'${heightInches}"`,
        weight: `${weightLbs}lbs`,
        role,
        bio: bio.trim().slice(0, 150),
        status: 'online',
        isVerified: true,
        isShieldVerified: true,
        shieldVerifiedAt: now,
        lastVerifiedAt: now,
        isNewUser: true,
        createdAt: now,
        sessionState: {
          intent: 'NOW',
          isHosting: false,
          isTraveling: false,
          lastActiveTimestamp: now
        },
        subscription: {
          tier: 'FREE'
        }
      });
    } catch (err: any) {
      setError(err?.message || 'Error activating profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-black text-white p-6 overflow-y-auto no-scrollbar font-sans">
      {/* Top Header */}
      <div className="pt-2 pb-6 flex items-center justify-between border-b border-slate-900">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
            Phase 1 • Screen 3
          </span>
          <h2 className="text-xl font-black italic tracking-tighter uppercase font-display text-white">
            Set Up Your Profile
          </h2>
        </div>
        {isShieldVerified && (
          <div className="flex items-center gap-1 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-xl text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[9px] font-black uppercase tracking-wider">Shield Verified</span>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 font-medium py-4">
        Takes under 60 seconds. Your profile is automatically verified with the <strong className="text-emerald-400">SlyD Shield™</strong> badge.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5 flex-1">
        {/* Photo Selection */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="relative group cursor-pointer">
            <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.25)] bg-slate-900">
              <img 
                src={primaryPhotoUrl} 
                alt="Profile Preview" 
                className="w-full h-full object-cover" 
              />
            </div>
            <label className="absolute bottom-0 right-0 p-2 bg-emerald-500 hover:bg-emerald-400 rounded-xl cursor-pointer shadow-lg text-black active:scale-95 transition-all">
              <Camera className="w-3.5 h-3.5" />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2">
            Primary Photo (Shield Baseline)
          </span>
        </div>

        {/* Display Name */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
            Display Name / Nickname *
          </label>
          <input
            required
            type="text"
            placeholder="e.g. Alex"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={30}
            className="w-full bg-slate-900/70 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        </div>

        {/* Age & Role */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Age (18+) *
            </label>
            <input
              required
              type="number"
              min={18}
              max={99}
              value={age}
              onChange={(e) => setAge(parseInt(e.target.value) || 18)}
              className="w-full bg-slate-900/70 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Role / Position
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full bg-slate-900/70 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              {ROLES.map((r) => (
                <option key={r} value={r} className="bg-slate-950 text-white">
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Height & Weight */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Height
            </label>
            <div className="flex gap-2">
              <select
                value={heightFeet}
                onChange={(e) => setHeightFeet(parseInt(e.target.value))}
                className="w-1/2 bg-slate-900/70 border border-slate-800 rounded-2xl px-3 py-3 text-xs text-white focus:ring-1 focus:ring-emerald-500 outline-none"
              >
                {[4, 5, 6, 7].map((f) => (
                  <option key={f} value={f} className="bg-slate-950 text-white">
                    {f} ft
                  </option>
                ))}
              </select>
              <select
                value={heightInches}
                onChange={(e) => setHeightInches(parseInt(e.target.value))}
                className="w-1/2 bg-slate-900/70 border border-slate-800 rounded-2xl px-3 py-3 text-xs text-white focus:ring-1 focus:ring-emerald-500 outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => i).map((inch) => (
                  <option key={inch} value={inch} className="bg-slate-950 text-white">
                    {inch} in
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Weight (lbs)
            </label>
            <input
              type="number"
              min={100}
              max={400}
              value={weightLbs}
              onChange={(e) => setWeightLbs(parseInt(e.target.value) || 160)}
              className="w-full bg-slate-900/70 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Bio Tag */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center ml-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Brief Bio (Optional)
            </label>
            <span className="text-[9px] text-slate-500">{bio.length}/150</span>
          </div>
          <textarea
            placeholder="Looking for chill vibes, right now..."
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 150))}
            rows={2}
            className="w-full bg-slate-900/70 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
          />
        </div>

        {error && (
          <p className="text-red-400 text-xs font-bold uppercase tracking-wider bg-red-950/40 border border-red-800/50 p-3 rounded-xl text-center">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-black font-black rounded-2xl shadow-xl shadow-emerald-950/40 uppercase tracking-[0.2em] text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          ) : (
            <>
              <span>Activate Verified Profile</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default MinimalProfileSetup;
