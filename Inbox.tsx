
import React from 'react';
import { UserProfile, Message } from '../types';
import { Crown } from 'lucide-react';

interface InboxProps {
  chats: Record<string, Message[]>;
  profiles: UserProfile[];
  onSelectChat: (profile: UserProfile) => void;
  onPremiumClick?: () => void;
}

const Inbox: React.FC<InboxProps> = ({ chats, profiles, onSelectChat, onPremiumClick }) => {
  const activeChatIds = Object.keys(chats);
  const activeChats = profiles.filter(p => activeChatIds.includes(p.id));

  return (
    <div className="h-full bg-slate-950 flex flex-col overflow-x-hidden w-full">
      <div className="px-4 py-4 bg-slate-950 border-b border-slate-900">
        {onPremiumClick && (
          <button 
            onClick={onPremiumClick}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-sky-500/10 to-indigo-500/10 border border-sky-500/20 mb-4 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-white">See who liked you</p>
                <p className="text-xs font-medium text-sky-400">Upgrade to Slyd+</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-slate-500 group-hover:text-sky-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        <div className="flex gap-4 overflow-x-auto no-scrollbar py-1">
          {profiles.filter(p => p.status === 'online').map(p => (
            <div key={p.id} className="flex flex-col items-center gap-2 min-w-[70px] cursor-pointer group" onClick={() => onSelectChat(p)}>
              <div className="relative">
                <img src={p.imageUrl} className="w-16 h-16 rounded-[1.5rem] object-cover border-2 border-sky-500/30 group-hover:border-sky-500 p-0.5 transition-colors" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-sky-400 rounded-full border-2 border-slate-950 shadow-sm" />
                {p.isPremium && (
                  <div className="absolute -top-1 -right-1 bg-gradient-to-tr from-sky-400 to-sky-600 p-0.5 rounded-full border border-slate-950">
                    <Crown className="w-2 h-2 text-white" />
                  </div>
                )}
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="divide-y divide-slate-900">
        {activeChats.length === 0 ? (
          <div className="p-16 text-center text-slate-700">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm font-black uppercase tracking-[0.2em] mb-1">Silence</p>
            <p className="text-xs font-medium text-slate-700">Go ahead, make the first move.</p>
          </div>
        ) : (
          activeChats.map(profile => {
            const messages = chats[profile.id];
            const lastMessage = messages[messages.length - 1];
            return (
              <div 
                key={profile.id}
                onClick={() => onSelectChat(profile)}
                className="p-5 flex items-center gap-4 bg-slate-950 hover:bg-slate-900/50 transition-all cursor-pointer group"
              >
                <div className="relative">
                  <img src={profile.imageUrl} className="w-16 h-16 rounded-2xl object-cover ring-1 ring-white/5 group-hover:ring-sky-500 transition-all" />
                  {profile.status === 'online' && (
                    <div className="absolute top-0 right-0 w-3 h-3 bg-sky-400 rounded-full border-2 border-slate-950" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="font-black text-slate-100 group-hover:text-sky-400 transition-colors">{profile.name}</h3>
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
                      {lastMessage?.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 truncate font-medium">
                    {lastMessage?.senderId === 'me' ? 'You: ' : ''}{lastMessage?.text}
                  </p>
                </div>
                {!lastMessage?.isRead && lastMessage?.senderId !== 'me' && (
                  <div className="w-2.5 h-2.5 bg-sky-400 rounded-full shadow-[0_0_8px_#38bdf8]" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Inbox;
