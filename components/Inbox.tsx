import React from 'react';
import { UserProfile, Message, hasActivePremiumSubscription } from '../types';
import { Crown, ShieldCheck, MessageSquare, CheckCheck, Check, Heart, Sparkles, Lock } from 'lucide-react';
import { getUserPresenceInfo } from '../src/lib/presence';

interface InboxProps {
  chats: Record<string, Message[]>;
  profiles: UserProfile[];
  myProfile?: UserProfile | null;
  isPremium?: boolean;
  onSelectChat: (profile: UserProfile) => void;
  onSelectProfile?: (profile: UserProfile) => void;
  onMarkInterest?: (profile: UserProfile, status: 'interested' | 'not_interested') => Promise<void> | void;
  onPremiumClick?: (featureName?: string) => void;
}

const Inbox: React.FC<InboxProps> = ({
  chats,
  profiles,
  myProfile,
  isPremium = false,
  onSelectChat,
  onSelectProfile,
  onMarkInterest,
}) => {
  const myLikedIds = new Set([...(myProfile?.likedUsers || []), ...(myProfile?.superLikedUsers || [])]);
  const likedMeIds = new Set([...(myProfile?.likedByUsers || []), ...(myProfile?.superLikedByUsers || [])]);

  // Mutual matches: both marked interested in each other
  const mutualMatches = profiles.filter(p => {
    const iLikedThem = myLikedIds.has(p.id) || Boolean(myProfile?.id && p.likedByUsers?.includes(myProfile.id));
    const theyLikedMe = likedMeIds.has(p.id) || Boolean(myProfile?.id && p.likedUsers?.includes(myProfile.id));
    return iLikedThem && theyLikedMe;
  });

  // Incoming interest notifications (they marked interested in me, I haven't matched yet)
  const incomingInterested = profiles.filter(p => {
    const iLikedThem = myLikedIds.has(p.id) || Boolean(myProfile?.id && p.likedByUsers?.includes(myProfile.id));
    const theyLikedMe = likedMeIds.has(p.id) || Boolean(myProfile?.id && p.likedUsers?.includes(myProfile.id));
    const notInterested = Boolean(myProfile?.notInterestedUsers?.includes(p.id));
    return theyLikedMe && !iLikedThem && !notInterested;
  });

  // Only include conversations that actually have incoming or outgoing messages
  const activeChatIds = Object.keys(chats).filter(id => Array.isArray(chats[id]) && chats[id].length > 0);
  const activeChats = profiles
    .filter(p => activeChatIds.includes(p.id))
    .sort((a, b) => {
      const msgsA = chats[a.id] || [];
      const msgsB = chats[b.id] || [];
      const lastA = msgsA[msgsA.length - 1]?.timestamp instanceof Date ? msgsA[msgsA.length - 1].timestamp.getTime() : 0;
      const lastB = msgsB[msgsB.length - 1]?.timestamp instanceof Date ? msgsB[msgsB.length - 1].timestamp.getTime() : 0;
      return lastB - lastA;
    });

  return (
    <div className="h-full bg-slate-950 flex flex-col overflow-x-hidden w-full">
      <div className="px-4 py-3.5 bg-slate-950 border-b border-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-sky-400" />
          <h2 className="text-xs font-black uppercase tracking-wider text-white font-display">
            Matches, Interest & Messages
          </h2>
        </div>
        <span className="text-[11px] font-bold text-slate-400 tabular-nums">
          {mutualMatches.length} {mutualMatches.length === 1 ? 'match' : 'matches'} · {activeChats.length} {activeChats.length === 1 ? 'chat' : 'chats'}
        </span>
      </div>

      <div className="divide-y divide-slate-900 flex-1 overflow-y-auto no-scrollbar">
        {/* MUTUAL MATCHES BAR (Unlocked Messaging for Free & Paid) */}
        {mutualMatches.length > 0 && (
          <div className="p-4 bg-slate-950 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5 font-display">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mutual Interest Matches · Messaging Unlocked ({mutualMatches.length})</span>
              </span>
            </div>
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
              {mutualMatches.map(match => (
                <div
                  key={match.id}
                  onClick={() => onSelectChat(match)}
                  className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
                >
                  <div className="relative w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-emerald-400 p-0.5 bg-slate-900">
                    <img src={match.imageUrl} alt={match.name} className="w-full h-full object-cover rounded-[14px]" />
                    <span className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 text-slate-950 rounded-full p-0.5 shadow">
                      <Heart className="w-2.5 h-2.5 fill-slate-950" />
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-200 group-hover:text-emerald-300 truncate max-w-[64px]">
                    {match.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INCOMING INTEREST NOTIFICATIONS */}
        {incomingInterested.length > 0 && (
          <div className="p-4 bg-slate-950/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-400 flex items-center gap-1.5 font-display">
                <Heart className="w-3.5 h-3.5 text-sky-400" />
                <span>Interested In You ({incomingInterested.length})</span>
              </span>
              <span className="text-[10px] text-slate-400">
                Match back to unlock free chat
              </span>
            </div>
            <div className="space-y-2">
              {incomingInterested.map(person => (
                <div
                  key={person.id}
                  className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div
                    onClick={() => onSelectProfile?.(person)}
                    className="flex items-center gap-3 min-w-0 cursor-pointer"
                  >
                    <img src={person.imageUrl} alt={person.name} className="w-11 h-11 rounded-xl object-cover shrink-0 border border-slate-700" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-white truncate">{person.name}, {person.age}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold">
                          Interested in you
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {person.role || 'Vers'} · {person.race || 'Mixed'} · {person.distance || '0.4 mi'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onMarkInterest?.(person, 'interested')}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] uppercase tracking-wider transition-all"
                    >
                      I'm Interested
                    </button>
                    <button
                      type="button"
                      onClick={() => onMarkInterest?.(person, 'not_interested')}
                      className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] uppercase tracking-wider transition-all"
                    >
                      Pass
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INCOMING & OUTGOING MESSAGE HISTORIES */}
        {activeChats.length === 0 ? (
          <div className="p-12 text-center text-slate-600">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 text-sky-500/20" />
            <p className="text-sm font-black uppercase tracking-widest text-slate-300 mb-1 font-display">
              No Messages Yet
            </p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              {isPremium
                ? 'Slyd+ Active: You can message any profile directly without waiting for a match.'
                : 'Mark "I\'m Interested" on profiles. When interest is mutual, free messaging unlocks automatically!'}
            </p>
          </div>
        ) : (
          activeChats.map(profile => {
            const messages = chats[profile.id] || [];
            const lastMessage = messages[messages.length - 1];
            const isOutgoing = Boolean(lastMessage && myProfile?.id && lastMessage.senderId === myProfile.id);
            const isUnread = Boolean(lastMessage && !isOutgoing && !lastMessage.isRead);
            const presence = getUserPresenceInfo(profile, myProfile?.id);

            return (
              <div
                key={profile.id}
                onClick={() => onSelectChat(profile)}
                className="p-4 flex items-center gap-3.5 bg-slate-950 hover:bg-slate-900/50 transition-all cursor-pointer group"
              >
                <div className="relative shrink-0">
                  <img
                    src={profile.imageUrl}
                    alt={profile.name}
                    className="w-14 h-14 rounded-2xl object-cover ring-1 ring-slate-800 group-hover:ring-sky-500 transition-all"
                  />
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 ${presence.dotColorClass}`}
                    title={presence.label}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5 gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h3 className="font-black text-sm text-slate-100 group-hover:text-sky-400 transition-colors truncate font-display">
                        {profile.name}
                      </h3>
                      {profile.isVerified && (
                        <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" title="Verified" />
                      )}
                      {hasActivePremiumSubscription(profile) && (
                        <Crown className="w-3.5 h-3.5 text-sky-400 shrink-0" title="Slyd+" />
                      )}
                    </div>
                    <span className={`text-[10px] font-bold tabular-nums shrink-0 ${presence.isOnline ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {presence.shortLastSeen}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs truncate">
                    <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                      isOutgoing ? 'text-slate-500' : 'text-sky-400'
                    }`}>
                      {isOutgoing ? 'You:' : 'Incoming:'}
                    </span>
                    <p className={`truncate font-medium ${isUnread ? 'text-white font-semibold' : 'text-slate-400'}`}>
                      {lastMessage?.imageUrl ? 'Sent a photo' : lastMessage?.text}
                    </p>
                  </div>
                </div>

                {isOutgoing ? (
                  <div className="shrink-0 text-sky-400/80" title={lastMessage?.isRead ? 'Read' : 'Sent'}>
                    {isPremium && lastMessage?.isRead ? (
                      <CheckCheck className="w-4 h-4 text-sky-400" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </div>
                ) : isUnread ? (
                  <div className="w-2.5 h-2.5 bg-sky-400 rounded-full shrink-0" />
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Inbox;
