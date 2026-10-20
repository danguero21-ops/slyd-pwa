import React from 'react';
import { UserProfile, hasActivePremiumSubscription } from '../types';
import { ShieldCheck, Crown, Sparkles } from 'lucide-react';

interface ProfileBadgesProps {
  profile: UserProfile;
  size?: 'sm' | 'md' | 'lg';
  compact?: boolean;
  className?: string;
  showTooltips?: boolean;
}

/**
 * Checks whether a profile qualifies as a 'New User'.
 * Either flagged explicitly via isNewUser or registered within the last 14 days.
 */
export const checkIsNewUser = (profile?: Partial<UserProfile> | null): boolean => {
  if (!profile) return false;
  if (profile.isNewUser) return true;
  if (profile.createdAt) {
    const createdTime = typeof profile.createdAt === 'number' 
      ? profile.createdAt 
      : new Date(profile.createdAt).getTime();
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
    if (!isNaN(createdTime) && (Date.now() - createdTime) < fourteenDaysMs) {
      return true;
    }
  }
  return false;
};

export const ProfileBadges: React.FC<ProfileBadgesProps> = ({
  profile,
  size = 'md',
  compact = false,
  className = '',
  showTooltips = true,
}) => {
  const isVerified = Boolean(profile.isShieldVerified || profile.isVerified);
  const isSlydPlus = hasActivePremiumSubscription(profile);
  const isNew = checkIsNewUser(profile);

  // If none of the social proof flags are present, return null
  if (!isVerified && !isSlydPlus && !isNew) {
    return null;
  }

  // Size configuration adhering to compact mathematical spacing and typography scales
  const sizeConfig = {
    sm: {
      container: 'gap-1',
      badge: 'px-1.5 py-0.5 text-[9px] rounded-md',
      icon: 'w-2.5 h-2.5',
    },
    md: {
      container: 'gap-1.5',
      badge: 'px-2 py-0.5 text-[10px] rounded-lg',
      icon: 'w-3 h-3',
    },
    lg: {
      container: 'gap-2',
      badge: 'px-2.5 py-1 text-[11px] rounded-lg',
      icon: 'w-3.5 h-3.5',
    }
  }[size];

  const isHosting = Boolean(profile.sessionState?.isHosting || profile.hostTravel === 'Host' || profile.hostTravel === 'Both');
  const isTraveling = Boolean(profile.sessionState?.isTraveling || profile.hostTravel === 'Travel' || profile.hostTravel === 'Both');
  const isBoth = isHosting && isTraveling;

  return (
    <div className={`flex flex-wrap items-center ${sizeConfig.container} ${className}`}>
      {/* 1. SlyD Shield Verified Badge */}
      {isVerified && (
        <span
          className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider whitespace-nowrap bg-sky-950/60 text-sky-300 border border-sky-500/40 backdrop-blur-md shadow-[0_0_12px_rgba(14,165,233,0.25)] select-none ${sizeConfig.badge}`}
          title={showTooltips ? "SlyD Shield Verified - 100% Real Guy via Biometric Liveness Verification" : undefined}
        >
          <ShieldCheck className={`${sizeConfig.icon} text-sky-400 shrink-0`} />
          <span>{compact || size === 'sm' ? 'Shield' : 'SlyD Shield Verified'}</span>
        </span>
      )}

      {/* 2. Host / Travel Floating Badges */}
      {isBoth ? (
        <span
          className={`inline-flex items-center gap-1 font-black uppercase tracking-wider whitespace-nowrap bg-gradient-to-r from-sky-500/25 to-indigo-500/25 text-sky-200 border border-sky-400/50 shadow-[0_0_12px_rgba(14,165,233,0.3)] select-none ${sizeConfig.badge}`}
          title="Host & Travel Active - Can host immediately or travel"
        >
          <span>Host + Travel</span>
        </span>
      ) : (
        <>
          {isHosting && (
            <span
              className={`inline-flex items-center gap-1 font-black uppercase tracking-wider whitespace-nowrap bg-sky-500/20 text-sky-300 border border-sky-500/40 select-none ${sizeConfig.badge}`}
              title="Can host immediately"
            >
              <span>Host</span>
            </span>
          )}
          {isTraveling && (
            <span
              className={`inline-flex items-center gap-1 font-black uppercase tracking-wider whitespace-nowrap bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 select-none ${sizeConfig.badge}`}
              title="Mobile & ready to travel"
            >
              <span>Travel</span>
            </span>
          )}
        </>
      )}

      {/* 3. SlyD+ Badge */}
      {isSlydPlus && (
        <span
          className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider whitespace-nowrap bg-sky-500/20 text-sky-200 border border-sky-400/50 backdrop-blur-md transition-all select-none ${sizeConfig.badge}`}
          title={showTooltips ? "SlyD+ Member - Direct Instant Messaging Unlocked" : undefined}
        >
          <Crown className={`${sizeConfig.icon} text-sky-400 shrink-0`} />
          <span>{compact || size === 'sm' ? 'SlyD+' : 'SlyD+ Member'}</span>
        </span>
      )}

      {/* 4. New User Badge */}
      {isNew && (
        <span
          className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider whitespace-nowrap bg-slate-900/90 text-cyan-300 border border-cyan-500/35 backdrop-blur-md transition-all select-none ${sizeConfig.badge}`}
          title={showTooltips ? "New User - Recently joined SlyD" : undefined}
        >
          <Sparkles className={`${sizeConfig.icon} text-cyan-400 shrink-0`} />
          <span>{compact || size === 'sm' ? 'New' : 'New Member'}</span>
        </span>
      )}
    </div>
  );
};

export default ProfileBadges;
