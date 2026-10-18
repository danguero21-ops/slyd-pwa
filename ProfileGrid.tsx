
import React from 'react';
import { UserProfile } from '../types';
import { Crown, ShieldCheck, Sparkles } from 'lucide-react';
import { checkIsNewUser } from './ProfileBadges';

interface ProfileGridProps {
  profiles: UserProfile[];
  onSelect: (profile: UserProfile) => void;
}

const ProfileGrid: React.FC<ProfileGridProps> = ({ profiles, onSelect }) => {
  return (
    <div className="grid grid-cols-3 gap-0.5 p-0.5 bg-slate-900">
      {profiles.map((profile) => (
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
          
          <div className="absolute top-2 right-2 flex items-center gap-1">
            {profile.isVerified && (
              <div className="bg-sky-500/90 p-1 rounded-lg shadow-lg border border-white/20 backdrop-blur-sm" title="Verified Member">
                <ShieldCheck className="w-3 h-3 text-white" />
              </div>
            )}
            {profile.isPremium && (
              <div className="bg-gradient-to-tr from-sky-400 to-sky-600 p-1 rounded-lg shadow-lg border border-white/20" title="Slyd+ Member">
                <Crown className="w-3 h-3 text-white" />
              </div>
            )}
            {checkIsNewUser(profile) && (
              <div className="bg-emerald-500/90 p-1 rounded-lg shadow-lg border border-white/20 backdrop-blur-sm" title="New User">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          <div className="absolute bottom-2 left-2 right-2 text-white">
            <div className="flex items-center gap-1.5">
              {profile.status === 'online' && (
                <div className="w-1.5 h-1.5 bg-sky-400 rounded-full shadow-[0_0_8px_#38bdf8]" />
              )}
              <span className="text-xs font-bold truncate font-display">{profile.name}</span>
              {profile.isVerified && (
                <ShieldCheck className="w-3 h-3 text-sky-400 shrink-0" />
              )}
            </div>
            <div className="flex justify-between items-center mt-0.5">
              <p className="text-[9px] text-slate-400 font-bold font-display uppercase tracking-wider">{profile.distance}</p>
              {profile.role && (
                <span className="text-[8px] bg-sky-500/20 text-sky-300 px-1 rounded font-black uppercase">
                  {profile.role[0]}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
      {profiles.length === 0 && (
        <div className="col-span-3 py-20 text-center">
          <p className="text-slate-500 font-medium">No one matches those filters.</p>
          <p className="text-xs text-slate-600 mt-1">Try expanding your search.</p>
        </div>
      )}
    </div>
  );
};

export default ProfileGrid;
