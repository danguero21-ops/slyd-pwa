import React, { useState, useEffect } from 'react';
import { UserProfile, ProfilePhoto } from '../types';
import { 
  Crown, 
  ShieldCheck, 
  Globe, 
  Lock, 
  Unlock, 
  ChevronLeft, 
  ChevronRight, 
  Images, 
  Sparkles,
  KeyRound,
  ShieldAlert,
  Star,
  FileText,
  Clock,
  MapPin,
  Heart,
  XCircle,
  MessageSquare
} from 'lucide-react';
import ProfileBadges from './ProfileBadges';
import { getUserPresenceInfo } from '../src/lib/presence';

interface ProfilePanelProps {
  profile: UserProfile;
  currentUserId?: string;
  isPremium?: boolean;
  hasSuperLiked?: boolean;
  isFavorited?: boolean;
  interestState?: 'interested' | 'not_interested' | null;
  hasTheirInterest?: boolean;
  profileNote?: string;
  onClose: () => void;
  onChat: (profile: UserProfile) => void;
  onPremiumClick?: (featureName?: string) => void;
  onSuperLike?: (profile: UserProfile) => Promise<void> | void;
  onMarkInterest?: (profile: UserProfile, status: 'interested' | 'not_interested') => Promise<void> | void;
  onToggleFavorite?: (profile: UserProfile) => Promise<void> | void;
  onSaveNote?: (profileId: string, note: string) => Promise<void> | void;
  onBlock?: (profile: UserProfile) => void;
  onReport?: (profile: UserProfile, reason: string, details: string, alsoBlock: boolean) => Promise<void>;
  onSortByRace?: (race?: string) => void;
}

const ProfilePanel: React.FC<ProfilePanelProps> = ({ 
  profile, 
  currentUserId,
  isPremium = false,
  hasSuperLiked = false,
  isFavorited = false,
  interestState = null,
  hasTheirInterest = false,
  profileNote = '',
  onClose, 
  onChat, 
  onPremiumClick,
  onSuperLike,
  onMarkInterest,
  onToggleFavorite,
  onSaveNote,
  onBlock,
  onReport,
  onSortByRace
}) => {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [unlockedPrivate, setUnlockedPrivate] = useState(false);
  const [accessRequested, setAccessRequested] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'public' | 'private'>('all');
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [reportReason, setReportReason] = useState('Inappropriate content');
  const [reportDetails, setReportDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [superLikedLocal, setSuperLikedLocal] = useState(hasSuperLiked);
  const [favoritedLocal, setFavoritedLocal] = useState(isFavorited);
  const [localInterest, setLocalInterest] = useState<'interested' | 'not_interested' | null>(interestState);
  const [noteInput, setNoteInput] = useState(profileNote || '');
  const [noteSavedToast, setNoteSavedToast] = useState(false);
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());

  useEffect(() => {
    setLocalInterest(interestState);
  }, [interestState, profile.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Support phone hardware / browser Back button to navigate back instead of acting like a secondary popup window
  useEffect(() => {
    const historyState = { slydProfilePanel: profile.id };
    window.history.pushState(historyState, '');

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [profile.id, onClose]);

  const handleBackNavigation = () => {
    if (window.history.state?.slydProfilePanel === profile.id) {
      window.history.back();
    } else {
      onClose();
    }
  };

  // Gather all photos
  const photos: ProfilePhoto[] = (profile.photos && profile.photos.length > 0)
    ? profile.photos
    : [
        { 
          id: 'photo_primary', 
          url: profile.imageUrl, 
          isPrivate: false, 
          createdAt: Date.now(),
          caption: 'Main Profile Photo' 
        }
      ];

  const isOwnProfile = Boolean(currentUserId && currentUserId === profile.id);
  const presence = getUserPresenceInfo(profile, currentUserId, nowTimestamp);
  const isAlreadyAuthorized = Boolean(
    isOwnProfile || 
    unlockedPrivate || 
    (currentUserId && profile.unlockedPrivateUsers?.includes(currentUserId))
  );

  const currentPhoto = photos[activePhotoIndex] || photos[0];
  const isCurrentPhotoPrivate = Boolean(currentPhoto?.isPrivate);
  const isLocked = isCurrentPhotoPrivate && !isAlreadyAuthorized;

  const publicPhotos = photos.filter(p => !p.isPrivate);
  const privatePhotos = photos.filter(p => p.isPrivate);

  const handleNextPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActivePhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const handlePrevPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActivePhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleRequestAccess = () => {
    setAccessRequested(true);
    // Instant friendly access unlock for rich interactive demo experience
    setTimeout(() => {
      setUnlockedPrivate(true);
    }, 600);
  };

  const filteredGalleryPhotos = photos.filter(p => {
    if (galleryFilter === 'public') return !p.isPrivate;
    if (galleryFilter === 'private') return p.isPrivate;
    return true;
  });

  return (
    <div className="fixed inset-0 z-[100] flex justify-center bg-black">
      <div className="relative w-full max-w-md h-full bg-slate-950 flex flex-col overflow-hidden">
        {/* Compact in-page top navigation bar (Back button on left, minimized action icons on right) */}
        <header className="h-12 px-3 flex justify-between items-center bg-slate-950/95 backdrop-blur-xl border-b border-slate-900 shrink-0 z-20 gap-2">
          <div className="flex items-center min-w-0">
            <button
              type="button"
              onClick={handleBackNavigation}
              aria-label="Go back"
              className="px-2.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-200 hover:text-white transition-colors active:scale-95 flex items-center gap-1 shrink-0"
            >
              <ChevronLeft className="w-4 h-4 text-sky-400 -ml-0.5" />
              <span className="text-xs font-bold tracking-tight">Back</span>
            </button>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Safety: Report / Block Action */}
            <button 
              type="button"
              onClick={() => setShowSafetyModal(true)}
              title="Report or Block"
              className="p-1.5 bg-slate-900 rounded-xl text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 border border-slate-800 transition-colors active:scale-95"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
            </button>

            {/* Favorite Star Button */}
            <button
              type="button"
              onClick={async () => {
                setFavoritedLocal(!favoritedLocal);
                await onToggleFavorite?.(profile);
              }}
              className={`p-1.5 rounded-xl border transition-colors active:scale-95 ${
                favoritedLocal
                  ? 'bg-sky-500/20 border-sky-400/50 text-sky-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-sky-400'
              }`}
              title={favoritedLocal ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              <Star className={`w-3.5 h-3.5 ${favoritedLocal ? 'fill-sky-400 text-sky-400' : ''}`} />
            </button>

            {/* Super Like (Slyd+ Premium Feature): Highlighted in cyan when subscribed, grayed out when not */}
            <button 
              type="button"
              onClick={async () => {
                if (!isPremium && onPremiumClick) {
                  onPremiumClick('Super Likes');
                  return;
                }
                setSuperLikedLocal(true);
                await onSuperLike?.(profile);
              }}
              className={`relative p-1.5 rounded-xl border transition-all active:scale-95 ${
                !isPremium
                  ? 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-55 grayscale hover:opacity-80'
                  : superLikedLocal || hasSuperLiked
                  ? 'bg-cyan-400 border-cyan-300 text-slate-950 shadow-sm shadow-cyan-400/30'
                  : 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300 hover:bg-cyan-500/30 shadow-sm shadow-cyan-500/15'
              }`}
              title={isPremium ? 'Send Super Like (Slyd+ Active)' : 'Super Like (Slyd+ Locked — Tap to Upgrade)'}
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
              </svg>
              {!isPremium && (
                <Lock className="w-2 h-2 text-slate-400 absolute -top-0.5 -right-0.5 bg-slate-950 rounded-full p-[1px]" />
              )}
            </button>
            
            {!isOwnProfile && (
              <button 
                type="button"
                onClick={() => onChat(profile)}
                className={`px-3 py-1.5 rounded-xl font-black text-[11px] uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center gap-1 ${
                  isPremium || (localInterest === 'interested' && hasTheirInterest)
                    ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-sky-900/30'
                    : 'bg-slate-900 border border-slate-700 text-slate-300 hover:border-sky-500/40'
                }`}
              >
                {!(isPremium || (localInterest === 'interested' && hasTheirInterest)) && (
                  <Lock className="w-3 h-3 text-sky-400" />
                )}
                <span>Message</span>
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-5 pb-24 pt-3">
          {/* PHOTO HERO CAROUSEL */}
          <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl mb-4 group bg-slate-900 select-none">
            {/* Background image / blurred preview */}
            <img 
              src={currentPhoto?.url} 
              alt={`${profile.name}'s photo ${activePhotoIndex + 1}`}
              className={`w-full h-full object-cover transition-all duration-500 ${
                isLocked ? 'blur-2xl scale-110 brightness-50 opacity-60' : 'group-hover:scale-105'
              }`} 
            />

            {/* Locked Private Photo Overlay */}
            {isLocked && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-10">
                <div className="w-16 h-16 rounded-3xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center mb-4 shadow-xl shadow-sky-950/50">
                  <Lock className="w-8 h-8 text-sky-400" />
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-wider mb-1 font-display">
                  Private Photo
                </h3>
                <p className="text-xs text-slate-300 max-w-xs mb-6 leading-relaxed">
                  Set to <strong className="text-sky-400">Private</strong> by {profile.name}.
                </p>

                {accessRequested && !unlockedPrivate ? (
                  <div className="px-5 py-2.5 rounded-xl bg-sky-500/20 text-sky-300 text-xs font-bold flex items-center gap-2 border border-sky-500/30 animate-pulse">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <span>Unlocking private access...</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestAccess}
                    className="px-6 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-sky-950/60 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Request Access</span>
                  </button>
                )}
              </div>
            )}

            {/* Gradient shadow overlay for text legibility */}
            {!isLocked && (
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-black/30 pointer-events-none" />
            )}

            {/* Top Navigation & Status Badges */}
            <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-10 pointer-events-none">
              {/* Photo Index Counter */}
              <div className="bg-slate-950/75 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[11px] font-black tracking-wider flex items-center gap-1.5 shadow-md border border-slate-800">
                <Images className="w-3 h-3 text-sky-400" />
                <span>{activePhotoIndex + 1} / {photos.length}</span>
              </div>

              {/* Photo Privacy Badge */}
              <div className="flex items-center gap-1.5">
                {isCurrentPhotoPrivate ? (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg backdrop-blur-md bg-slate-950/85 text-sky-300 border border-sky-500/40">
                    {isAlreadyAuthorized ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                    <span>{isOwnProfile ? 'Private (You)' : isAlreadyAuthorized ? 'Unlocked' : 'Private'}</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg bg-sky-500/90 text-white backdrop-blur-md border border-sky-400/40">
                    <Globe className="w-2.5 h-2.5" />
                    <span>Public</span>
                  </span>
                )}
              </div>
            </div>

            {/* Carousel navigation chevrons (if multiple photos) */}
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevPhoto}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md flex items-center justify-center transition-all opacity-80 hover:opacity-100 active:scale-90 z-10 border border-white/10"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={handleNextPhoto}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md flex items-center justify-center transition-all opacity-80 hover:opacity-100 active:scale-90 z-10 border border-white/10"
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Bottom Profile Details overlay: Username + Age + Role + Status + Race + Time Ago + Distance */}
            <div className="absolute bottom-4 left-4 right-4 text-white z-10">
              <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap pointer-events-none">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-3xl font-black font-display tracking-tight drop-shadow-md">{profile.name}</h2>
                  <span className="text-xl font-medium text-slate-300">{profile.age}</span>
                </div>
                <ProfileBadges profile={profile} size="sm" compact />
              </div>

              {/* Role · Status · Race on the picture */}
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-950/85 backdrop-blur-md border border-slate-700/80 text-[10px] font-black uppercase tracking-wider text-sky-300 shadow-sm pointer-events-none">
                  {profile.role || 'Vers'}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-950/85 backdrop-blur-md border border-slate-700/80 text-[10px] font-black uppercase tracking-wider text-slate-200 shadow-sm pointer-events-none">
                  {profile.relationshipStatus || 'Single'}
                </span>
                <button
                  type="button"
                  onClick={() => onSortByRace?.(profile.race)}
                  title="Tap to sort by Race"
                  className="px-2.5 py-0.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/35 backdrop-blur-md border border-sky-400/50 text-[10px] font-black uppercase tracking-wider text-sky-200 shadow-sm transition-colors cursor-pointer"
                >
                  {profile.race || 'Mixed'}
                </button>
                {profile.availabilityMode === 'right_now' && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/25 backdrop-blur-md border border-emerald-400/50 text-[10px] font-black uppercase tracking-wider text-emerald-300 shadow-sm pointer-events-none">
                    Right Now
                  </span>
                )}
              </div>

              {/* Specific Time Ago & Distance on the picture */}
              <div className="flex flex-wrap items-center gap-1.5 pointer-events-none">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl backdrop-blur-md border shadow-md ${presence.badgeBgClass}`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${presence.dotColorClass} ${presence.isOnline ? 'animate-pulse' : ''}`} />
                  <Clock className={`w-3 h-3 shrink-0 ${presence.textColorClass}`} />
                  <span className={`font-black text-[11px] uppercase tracking-wider ${presence.textColorClass}`}>
                    {presence.shortLastSeen}
                  </span>
                </div>

                {profile.showDistance !== false && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800 text-slate-200 text-[11px] font-bold shadow-md">
                    <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                    <span>{profile.distance || '0.4 mi'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* THUMBNAIL QUICK-SWITCH BAR */}
          {photos.length > 1 && (
            <div className="flex items-center gap-2 mb-5 overflow-x-auto no-scrollbar py-1">
              {photos.map((photo, idx) => {
                const isActive = idx === activePhotoIndex;
                const isItemLocked = photo.isPrivate && !isAlreadyAuthorized;
                return (
                  <button
                    type="button"
                    key={photo.id || idx}
                    onClick={() => setActivePhotoIndex(idx)}
                    className={`relative w-14 h-18 rounded-xl overflow-hidden shrink-0 transition-all border-2 ${
                      isActive 
                        ? 'border-sky-400 scale-105 shadow-md shadow-sky-950/60' 
                        : 'border-slate-800 opacity-60 hover:opacity-90'
                    }`}
                  >
                    <img 
                      src={photo.url} 
                      alt="" 
                      className={`w-full h-full object-cover ${isItemLocked ? 'blur-sm brightness-50' : ''}`} 
                    />
                    <div className="absolute top-1 right-1">
                      {photo.isPrivate ? (
                        <div className="p-0.5 bg-slate-900/90 border border-sky-400/40 rounded text-sky-300 text-[8px]">
                          <Lock className="w-2.5 h-2.5" />
                        </div>
                      ) : (
                        <div className="p-0.5 bg-sky-500 rounded text-white text-[8px]">
                          <Globe className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="space-y-6">
            {/* TOP AREA: BIO & LOOKING FOR UNDER THE PICTURE */}
            <section className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 space-y-3">
              <div>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 font-display">Bio</h3>
                <p className="text-slate-200 leading-relaxed text-sm font-medium">{profile.bio || 'Exploring Slyd.'}</p>
              </div>

              {profile.lookingFor && profile.lookingFor.length > 0 && (
                <div className="pt-2 border-t border-slate-800/70">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 font-display">Looking For</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.lookingFor.map(item => (
                      <span key={item} className="px-3 py-1 bg-sky-500/15 text-sky-300 rounded-lg font-bold text-xs border border-sky-500/25">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* MUTUAL INTEREST & MESSAGING UNLOCK SECTION */}
            {!isOwnProfile && (
              <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 font-display">
                      Interest & Messaging
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {isPremium
                        ? 'Slyd+ Active: You can message anyone directly anytime.'
                        : (localInterest === 'interested' && hasTheirInterest)
                        ? `It's a Mutual Match! Both you and ${profile.name} are interested.`
                        : hasTheirInterest
                        ? `${profile.name} is interested in you! Tap "I'm Interested" to match & unlock chat.`
                        : 'Free accounts require mutual interest before messaging unlocks.'}
                    </p>
                  </div>
                  {(localInterest === 'interested' && hasTheirInterest) && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider shrink-0">
                      Matched!
                    </span>
                  )}
                </div>

                {/* Incoming interest notification banner */}
                {hasTheirInterest && localInterest !== 'interested' && (
                  <div className="p-2.5 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center gap-2 text-xs text-sky-200 font-bold">
                    <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>{profile.name} marked that they are interested in you!</span>
                  </div>
                )}

                {/* Two Interest Options: I'm Interested / I'm Not Interested */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={async () => {
                      setLocalInterest('interested');
                      await onMarkInterest?.(profile, 'interested');
                    }}
                    className={`py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider border flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                      localInterest === 'interested'
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-lg shadow-emerald-950/50'
                        : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-emerald-500/50 hover:text-emerald-300'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${localInterest === 'interested' ? 'fill-slate-950' : 'text-emerald-400'}`} />
                    <span>I'm Interested</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      setLocalInterest('not_interested');
                      await onMarkInterest?.(profile, 'not_interested');
                    }}
                    className={`py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider border flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                      localInterest === 'not_interested'
                        ? 'bg-rose-500/25 border-rose-500/50 text-rose-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-rose-500/40 hover:text-rose-300'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>I'm Not Interested</span>
                  </button>
                </div>

                {/* Message Action Button (Unlocked if Mutual Match or Slyd+ Paid Version) */}
                {isPremium || (localInterest === 'interested' && hasTheirInterest) ? (
                  <button
                    type="button"
                    onClick={() => onChat(profile)}
                    className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-sky-950/50 transition-all active:scale-[0.99]"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>
                      {(localInterest === 'interested' && hasTheirInterest)
                        ? `Message ${profile.name} (Mutual Interest Unlocked)`
                        : `Message ${profile.name} (Slyd+ Direct Chat)`}
                    </span>
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/90 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-[11px] text-slate-400 leading-snug">
                        {localInterest === 'interested'
                          ? `Waiting for ${profile.name} to mark "I'm Interested" to unlock free messaging.`
                          : `Mark "I'm Interested" and match with ${profile.name} to message for free.`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onPremiumClick?.('Direct Messaging Without Matching')}
                      className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 hover:bg-sky-500/30 text-[10px] font-black uppercase tracking-wider shrink-0"
                    >
                      Get Slyd+
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* Compact Personal Details Tiles (Role, Height, Weight, Race + Status & Hosting) */}
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-slate-900/70 px-2 py-2.5 rounded-xl border border-slate-800/80 text-center">
                  <span className="block text-[8px] text-slate-500 uppercase font-black tracking-wider mb-0.5">Role</span>
                  <span className="text-slate-200 font-bold text-xs block truncate">{profile.role || 'Vers'}</span>
                </div>
                <div className="bg-slate-900/70 px-2 py-2.5 rounded-xl border border-slate-800/80 text-center">
                  <span className="block text-[8px] text-slate-500 uppercase font-black tracking-wider mb-0.5">Height</span>
                  <span className="text-slate-200 font-bold text-xs block truncate">{profile.height || '5\'10"'}</span>
                </div>
                <div className="bg-slate-900/70 px-2 py-2.5 rounded-xl border border-slate-800/80 text-center">
                  <span className="block text-[8px] text-slate-500 uppercase font-black tracking-wider mb-0.5">Weight</span>
                  <span className="text-slate-200 font-bold text-xs block truncate">{profile.weight || '170lbs'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onSortByRace?.(profile.race)}
                  title="Tap to sort & filter by Race"
                  className="bg-slate-900/70 hover:bg-sky-500/15 px-2 py-2.5 rounded-xl border border-slate-800/80 hover:border-sky-500/40 text-center transition-colors"
                >
                  <span className="block text-[8px] text-slate-500 uppercase font-black tracking-wider mb-0.5">Race</span>
                  <span className="text-sky-400 font-bold text-xs block truncate">{profile.race || 'Mixed'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-900/50 px-3 py-2 rounded-xl border border-slate-800/60 flex items-center justify-between">
                  <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Status</span>
                  <span className="text-slate-300 font-bold text-xs">{profile.relationshipStatus || 'Single'}</span>
                </div>
                <div className="bg-slate-900/50 px-3 py-2 rounded-xl border border-slate-800/60 flex items-center justify-between">
                  <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Hosting</span>
                  <span className="text-slate-300 font-bold text-xs">{profile.hostTravel || 'Both'}</span>
                </div>
              </div>
            </div>

            {/* STREAMLINED PHOTOS SECTION (Smaller Public / Private / All options positioned at the bottom) */}
            <section className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {filteredGalleryPhotos.map((photo) => {
                  const originalIndex = photos.findIndex(p => p.id === photo.id);
                  const isItemLocked = photo.isPrivate && !isAlreadyAuthorized;
                  const isCurrent = originalIndex === activePhotoIndex;
                  return (
                    <div
                      key={photo.id}
                      onClick={() => {
                        setActivePhotoIndex(originalIndex);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer group bg-slate-950 border transition-all ${
                        isCurrent 
                          ? 'ring-2 ring-sky-400 border-sky-400' 
                          : photo.isPrivate 
                            ? 'border-sky-500/30' 
                            : 'border-slate-800'
                      }`}
                    >
                      <img 
                        src={photo.url} 
                        alt="" 
                        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                          isItemLocked ? 'blur-md brightness-50' : ''
                        }`} 
                      />

                      {isItemLocked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Lock className="w-4 h-4 text-sky-400" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Smaller Public / Private / All options positioned at the bottom */}
              <div className="flex items-center justify-between pt-1">
                <div className="inline-flex items-center gap-1 bg-slate-950/90 p-0.5 rounded-lg border border-slate-800/80 text-[9px] font-bold">
                  <button
                    type="button"
                    onClick={() => setGalleryFilter('all')}
                    className={`px-2 py-0.5 rounded-md transition-colors ${
                      galleryFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    All ({photos.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setGalleryFilter('public')}
                    className={`px-2 py-0.5 rounded-md transition-colors ${
                      galleryFilter === 'public' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Public ({publicPhotos.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setGalleryFilter('private')}
                    className={`px-2 py-0.5 rounded-md transition-colors ${
                      galleryFilter === 'private' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Private ({privatePhotos.length})
                  </button>
                </div>

                {isLocked && (
                  <button
                    type="button"
                    onClick={handleRequestAccess}
                    className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-black text-[9px] uppercase tracking-wider transition-all"
                  >
                    Unlock Private
                  </button>
                )}
              </div>
            </section>

            {/* Super Like Button (Slyd+ Premium Feature) */}
            <button 
              type="button"
              onClick={async () => {
                if (!isPremium && onPremiumClick) {
                  onPremiumClick('Super Likes');
                  return;
                }
                setSuperLikedLocal(true);
                await onSuperLike?.(profile);
              }}
              className={`w-full flex items-center justify-between gap-3 p-3.5 rounded-2xl border group transition-all ${
                !isPremium
                  ? 'bg-slate-900/40 border-slate-800/80 text-slate-500 opacity-60 grayscale hover:opacity-80'
                  : superLikedLocal || hasSuperLiked
                  ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-lg shadow-cyan-950/50'
                  : 'bg-gradient-to-r from-cyan-500/20 via-sky-500/15 to-cyan-400/20 border-cyan-400/60 hover:from-cyan-500/30 hover:to-cyan-400/30 shadow-lg shadow-cyan-950/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {!isPremium ? (
                  <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                ) : (
                  <svg className="w-4 h-4 text-cyan-300 group-hover:scale-110 transition-transform shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                  </svg>
                )}
                <span className={`font-black uppercase tracking-wider text-xs ${isPremium ? 'text-cyan-200' : 'text-slate-400'}`}>
                  {superLikedLocal || hasSuperLiked ? `Super Liked ${profile.name}!` : 'Send Super Like'}
                </span>
              </div>
              {isPremium ? (
                <span className="bg-cyan-400 text-slate-950 text-[9px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider flex items-center gap-1">
                  <Crown className="w-2.5 h-2.5" />
                  <span>Slyd+ Active</span>
                </span>
              ) : (
                <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[9px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Slyd+ · Tap to Unlock</span>
                </span>
              )}
            </button>

            {profile.tribes && profile.tribes.length > 0 && (
              <section>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2.5 font-display">Vibe Checks</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.tribes.map(tribe => (
                    <span key={tribe} className="px-4 py-1.5 bg-slate-900 text-slate-400 rounded-xl font-bold text-xs border border-slate-800">
                      {tribe}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Personal Private Profile Note (Slyd+ Feature: Highlighted in cyan when subscribed, Grayed out when not) */}
            {!isOwnProfile && (
              <section
                onClick={!isPremium ? () => onPremiumClick?.('Private Profile Notes') : undefined}
                className={`rounded-2xl p-4 space-y-2.5 border transition-all ${
                  isPremium
                    ? 'bg-cyan-950/25 border-cyan-400/50 shadow-lg shadow-cyan-950/30'
                    : 'bg-slate-900/35 border-slate-800/80 opacity-60 grayscale hover:opacity-80 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold flex items-center gap-1.5 ${isPremium ? 'text-cyan-200' : 'text-slate-400'}`}>
                    {isPremium ? (
                      <FileText className="w-4 h-4 text-cyan-300" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-500" />
                    )}
                    <span>Private Personal Note</span>
                  </span>
                  {isPremium ? (
                    <span className="bg-cyan-400 text-slate-950 text-[9px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider flex items-center gap-1">
                      <Crown className="w-2.5 h-2.5" />
                      <span>Slyd+ Active</span>
                    </span>
                  ) : (
                    <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[9px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Slyd+ · Locked</span>
                    </span>
                  )}
                </div>
                <p className={`text-[11px] ${isPremium ? 'text-cyan-100/75' : 'text-slate-500'}`}>
                  Only visible to you. Keep private notes on {profile.name} (e.g., where you met, preferences, or schedule).
                </p>
                {isPremium ? (
                  <div className="space-y-2">
                    <textarea
                      rows={2}
                      value={noteInput}
                      onChange={e => setNoteInput(e.target.value)}
                      placeholder={`Add a private note about ${profile.name}...`}
                      className="w-full rounded-xl bg-slate-950/90 border border-cyan-500/40 p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-300 resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-emerald-400 font-bold">
                        {noteSavedToast ? '✓ Private note saved' : ''}
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          await onSaveNote?.(profile.id, noteInput.trim());
                          setNoteSavedToast(true);
                          setTimeout(() => setNoteSavedToast(false), 1800);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs transition-colors"
                      >
                        Save Note
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-full rounded-xl bg-slate-950/70 border border-slate-800 p-2.5 text-[11px] text-slate-600 select-none">
                      Add a private note about {profile.name}... (Slyd+ subscribers only)
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPremiumClick?.('Private Profile Notes');
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-400 hover:text-white flex items-center justify-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Unlock Private Profile Notes with Slyd+</span>
                    </button>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
      {showSafetyModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-5" role="dialog" aria-modal="true" aria-labelledby="safety-title">
          <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-950 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="safety-title" className="text-lg font-black text-white">Report or block {profile.name}</h2>
                <p className="mt-1 text-xs text-slate-400">Tell us what happened or block this profile.</p>
              </div>
              <button type="button" onClick={() => setShowSafetyModal(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-800" aria-label="Close safety options">×</button>
            </div>
            <form className="mt-5 space-y-3" onSubmit={async (event) => {
              event.preventDefault();
              if (!onReport) return;
              await onReport(profile, reportReason, reportDetails, alsoBlock);
              setShowSafetyModal(false);
            }}>
              <label className="block text-xs font-bold text-slate-300" htmlFor="report-reason">Reason</label>
              <select id="report-reason" value={reportReason} onChange={event => setReportReason(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white">
                <option>Inappropriate content</option>
                <option>Fake or misleading profile</option>
                <option>Harassment or spam</option>
                <option>Other</option>
              </select>
              <textarea value={reportDetails} onChange={event => setReportDetails(event.target.value)} maxLength={1000} rows={3} placeholder="Additional details (optional)" className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white placeholder:text-slate-500" />
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" checked={alsoBlock} onChange={event => setAlsoBlock(event.target.checked)} />
                Block this profile too
              </label>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={!onReport} className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-xs font-black text-white disabled:opacity-50">Submit report</button>
                <button type="button" onClick={async () => { await onBlock?.(profile); setShowSafetyModal(false); }} disabled={!onBlock} className="flex-1 rounded-xl border border-slate-700 px-4 py-3 text-xs font-bold text-slate-200 disabled:opacity-50">Block</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePanel;
