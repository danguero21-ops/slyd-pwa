import React from 'react';
import { UserProfile } from '../types';
import { ShieldCheck, Crown, Sparkles } from 'lucide-react';

interface ProfileBadgesProps {
  profile: UserProfile;
  size?: 'sm' | 'md' | 'lg';
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
  className = '',
  showTooltips = true,
}) => {
  const isVerified = Boolean(profile.isVerified);
  const isSlydPlus = Boolean(profile.isPremium);
  const isNew = checkIsNewUser(profile);

  // If none of the social proof flags are present, return null
  if (!isVerified && !isSlydPlus && !isNew) {
    return null;
  }

  // Size configuration adhering to mathematical spacing and typography scales
  const sizeConfig = {
    sm: {
      container: 'gap-1.5',
      badge: 'px-2 py-0.5 text-[9px] rounded-lg',
      icon: 'w-3 h-3',
    },
    md: {
      container: 'gap-2',
      badge: 'px-2.5 py-1 text-[10px] rounded-xl',
      icon: 'w-3.5 h-3.5',
    },
    lg: {
      container: 'gap-2.5',
      badge: 'px-3 py-1.5 text-xs rounded-xl',
      icon: 'w-4 h-4',
    }
  }[size];

  return (
    <div className={`flex flex-wrap items-center ${sizeConfig.container} ${className}`}>
      {/* 1. Verified Member Badge */}
      {isVerified && (
        <span
          className={`inline-flex items-center gap-1.5 font-black uppercase tracking-wider whitespace-nowrap bg-sky-950/70 text-sky-300 border border-sky-500/40 backdrop-blur-md shadow-sm transition-all select-none ${sizeConfig.badge}`}
          title={showTooltips ? "Verified Member - Anti-Catfish Biometrically Authenticated" : undefined}
        >
          <ShieldCheck className={`${sizeConfig.icon} text-sky-400 shrink-0`} />
          <span>Verified Member</span>
        </span>
      )}

      {/* 2. Slyd+ Member Badge */}
      {isSlydPlus && (
        <span
          className={`inline-flex items-center gap-1.5 font-black uppercase tracking-wider whitespace-nowrap bg-gradient-to-r from-amber-950/70 to-amber-900/50 text-amber-300 border border-amber-500/50 backdrop-blur-md shadow-sm transition-all select-none ${sizeConfig.badge}`}
          title={showTooltips ? "Slyd+ Member - Premium Tier Subscriber with Unlimited Access" : undefined}
        >
          <Crown className={`${sizeConfig.icon} text-amber-400 shrink-0`} />
          <span>Slyd+ Member</span>
        </span>
      )}

      {/* 3. New User Badge */}
      {isNew && (
        <span
          className={`inline-flex items-center gap-1.5 font-black uppercase tracking-wider whitespace-nowrap bg-emerald-950/70 text-emerald-300 border border-emerald-500/50 backdrop-blur-md shadow-sm transition-all select-none ${sizeConfig.badge}`}
          title={showTooltips ? "New User - Recently joined the Slyd community" : undefined}
        >
          <Sparkles className={`${sizeConfig.icon} text-emerald-400 shrink-0`} />
          <span>New User</span>
        </span>
      )}
    </div>
  );
};

export default ProfileBadges;
