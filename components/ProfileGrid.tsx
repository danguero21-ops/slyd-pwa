import React from 'react';
import { UserProfile, Filters, hasActivePremiumSubscription } from '../types';
import { RACES } from '../constants';
import { Crown, ShieldCheck, Sparkles, Compass, Lock } from 'lucide-react';
import { checkIsNewUser } from './ProfileBadges';
import { getUserPresenceInfo } from '../src/lib/presence';

interface ProfileGridProps {
  profiles: UserProfile[];
  onSelect: (profile: UserProfile) => void;
  gridDensity?: 'comfortable' | 'compact';
  isPremium?: boolean;
  onPremiumClick?: (featureName?: string) => void;
  teleportLocation?: { name: string; lat: number; lng: number } | null;
  onClearTeleport?: () => void;
  sortBy?: Filters['sortBy'];
  selectedRaces?: string[];
  onChangeSortBy?: (sortBy: Filters['sortBy']) => void;
  onToggleRaceFilter?: (race: string | null) => void;
}

const ProfileGrid: React.FC<ProfileGridProps> = ({
  profiles,
  onSelect,
  gridDensity = 'comfortable',
  isPremium = false,
  onPremiumClick,
  teleportLocation,
  onClearTeleport,
  sortBy = 'distance',
  selectedRaces = [],
  onChangeSortBy,
  onToggleRaceFilter
}) => {
  const gridColsClass = gridDensity === 'compact' ? 'grid-cols-4' : 'grid-cols-3';
  const maxFreeProfiles = 100;
  const maxPlusProfiles = 600;
  const visibleProfiles = profiles.slice(0, isPremium ? maxPlusProfiles : maxFreeProfiles);

  return (
    <div className="flex flex-col w-full">
      {/* Compact Quick Sort & Race Sort Bar */}
      {onChangeSortBy && (
        <div className="px-2 pt-2 pb-1 bg-slate-950 border-b border-slate-900 space-y-1.5">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 shrink-0 mr-0.5">
              Sort:
            </span>
            {[
              { label: 'Distance', value: 'distance' as const },
              { label: 'Last Seen', value: 'lastSeen' as const },
              { label: 'Race', value: 'race' as const },
              { label: 'Age', value: 'age' as const },
              { label: 'Newest', value: 'newest' as const },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChangeSortBy(opt.value)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 border transition-all ${
                  sortBy === opt.value
                    ? 'bg-sky-500 border-sky-400 text-white shadow-sm shadow-sky-900/40'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {(sortBy === 'race' || selectedRaces.length > 0) && onToggleRaceFilter && (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
              <button
                type="button"
                onClick={() => onToggleRaceFilter(null)}
                className={`px-2 py-0.5 rounded-md text-[9px] font-bold shrink-0 border transition-all ${
                  selectedRaces.length === 0
                    ? 'bg-sky-500/20 border-sky-400/50 text-sky-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                All Races
              </button>
              {RACES.map((r) => {
                const active = selectedRaces.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onToggleRaceFilter(r)}
                    className={`px-2 py-0.5 rounded-md text-[9px] font-bold shrink-0 border transition-all ${
                      active
                        ? 'bg-sky-500 border-sky-400 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      {/* Active Global Roam / Teleport Banner */}
      {teleportLocation && (
        <div className="mx-2 mt-2 mb-1 px-3.5 py-2.5 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Compass className="w-4 h-4 text-sky-400 shrink-0 animate-pulse" />
            <div className="min-w-0">
              <span className="text-xs font-bold text-white block truncate">
                Global Roam: Exploring {teleportLocation.name}
              </span>
              <span className="text-[10px] text-sky-300 block">
                Slyd+ Virtual Pin Active · Up to 600 Profiles
              </span>
            </div>
          </div>
          {onClearTeleport && (
            <button
              type="button"
              onClick={onClearTeleport}
              className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-[10px] font-bold text-slate-300 hover:text-white shrink-0"
            >
              Reset GPS
            </button>
          )}
        </div>
      )}

      {/* Sponsored Ad Banner for Free Tier (Removed automatically with Slyd+ Zero Third-Party Ads) */}
      {!isPremium && (
        <div className="mx-2 mt-2 mb-1.5 p-3 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-sky-950/60 border border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <Crown className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-white truncate">
                Remove Ads & Unlock 600 Profiles (6x Grid)
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                Plus Viewed Me, Incognito, Unsend & Global Roam
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onPremiumClick?.('Ad-Free & 600-Profile Grid')}
            className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-black text-[10px] shrink-0 transition-colors"
          >
            Get Slyd+
          </button>
        </div>
      )}

      <div className={`grid ${gridColsClass} gap-0.5 p-0.5 bg-slate-900`}>
        {visibleProfiles.map((profile) => (
          <div
            key={profile.id}
            onClick={() => onSelect(profile)}
            className="relative aspect-[3/4] cursor-pointer group overflow-hidden bg-slate-800"
          >
            <img
              src={profile.imageUrl}
              alt={profile.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

            <div className="absolute top-1.5 right-1.5 flex items-center gap-1 pointer-events-none">
              {profile.isVerified && (
                <div className="w-4 h-4 rounded-full bg-slate-950/80 border border-sky-400/50 flex items-center justify-center backdrop-blur-sm" title="Verified">
                  <ShieldCheck className="w-2.5 h-2.5 text-sky-400" />
                </div>
              )}
              {hasActivePremiumSubscription(profile) && (
                <div className="w-4 h-4 rounded-full bg-sky-500/90 border border-sky-300/60 flex items-center justify-center shadow-sm" title="Slyd+">
                  <Crown className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              {checkIsNewUser(profile) && (
                <div className="w-4 h-4 rounded-full bg-slate-950/80 border border-cyan-400/50 flex items-center justify-center backdrop-blur-sm" title="New Member">
                  <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                </div>
              )}
            </div>

            <div className="absolute bottom-2 left-2 right-2 text-white">
              {(() => {
                const presence = getUserPresenceInfo(profile);
                return (
                  <>
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 min-w-0">
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${presence.dotColorClass}`}
                          title={presence.label}
                        />
                        <span className="text-xs font-bold truncate font-display">{profile.name}, {profile.age}</span>
                      </div>
                      {profile.availabilityMode === 'right_now' && (
                        <span className="text-[7px] bg-emerald-500/30 text-emerald-300 border border-emerald-400/50 px-1 rounded font-black uppercase shrink-0">
                          Now
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 overflow-hidden">
                      <span className="text-[8px] bg-sky-500/20 text-sky-300 px-1 rounded font-black uppercase shrink-0">
                        {profile.role || 'Vers'}
                      </span>
                      <span className="text-[7px] bg-slate-950/80 text-slate-300 border border-slate-700/80 px-1 rounded font-bold truncate">
                        {profile.relationshipStatus || 'Single'}
                      </span>
                      {profile.race && (
                        <span className="text-[7px] bg-slate-950/80 text-sky-200 border border-slate-700/80 px-1 rounded font-bold truncate">
                          {profile.race}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-0.5 gap-1">
                      <p className="text-[9px] text-slate-300 font-bold font-display uppercase tracking-wider truncate">
                        {presence.shortLastSeen}
                        {profile.showDistance !== false ? ` · ${profile.distance || '0.4 mi'}` : ''}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        ))}
        {profiles.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <p className="text-slate-500 font-medium">No one matches those filters.</p>
            <p className="text-xs text-slate-600 mt-1">Try expanding your search.</p>
          </div>
        )}
      </div>

      {/* Bottom 600-Profile Grid Unlock CTA for Free Tier */}
      {!isPremium && profiles.length > 0 && (
        <div className="p-4 m-2 rounded-2xl bg-slate-900/70 border border-slate-800 text-center space-y-2">
          <div className="text-xs font-bold text-white flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-sky-400" />
            <span>Free Tier Limit: Up to 100 Profiles</span>
          </div>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
            Upgrade to Slyd+ to load up to 600 profiles on your cascade grid and browse completely ad-free.
          </p>
          <button
            type="button"
            onClick={() => onPremiumClick?.('600-Profile Extended Grid')}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-black text-xs transition-colors"
          >
            Get Slyd+ — Upgrade
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileGrid;
