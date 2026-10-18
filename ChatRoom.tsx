import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Message } from '../types';
import { getGeminiResponse, getIcebreakers } from '../services/geminiService';
import { Sparkles, Image as ImageIcon, X, Send } from 'lucide-react';
import { compressImage } from '../src/lib/image-utils';
import ProfileBadges from './ProfileBadges';

interface ChatRoomProps {
  profile: UserProfile;
  messages: Message[];
  onSendMessage: (text: string, imageUrl?: string) => void;
  myId: string;
  onPremiumClick?: () => void;
  onBlock?: (profile: UserProfile) => void;
  onReport?: (profile: UserProfile, reason: string, details: string, alsoBlock: boolean) => Promise<void>;
  onViewProfile?: (profile: UserProfile) => void;
  messagingDisabled?: boolean;
  mediaDisabled?: boolean;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ 
  profile, 
  messages, 
  onSendMessage, 
  myId, 
  onPremiumClick,
  onBlock,
  onReport,
  onViewProfile,
  messagingDisabled = false,
  mediaDisabled = false
}) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [isLoadingIcebreakers, setIsLoadingIcebreakers] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    setIcebreakers([]);
    if (messages.length === 0 && !isLoadingIcebreakers) {
      loadIcebreakers();
    }
  }, [profile.id, messages.length === 0]);

  const loadIcebreakers = async () => {
    if (messages.length > 0) return;
    setIsLoadingIcebreakers(true);
    try {
      const results = await getIcebreakers(profile.name, profile.bio || '', profile.interests || []);
      setIcebreakers(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingIcebreakers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !pendingImage) return;

    const currentText = inputText;
    const currentImage = pendingImage;
    
    onSendMessage(currentText, currentImage || undefined);
    setInputText('');
    setPendingImage(null);
    
    // Server-proxied reply simulation for demo/mock bots
    if (profile.id.startsWith('mock_')) {
      setIsTyping(true);
      try {
        await getGeminiResponse(
          currentText, 
          profile.name, 
          profile.bio
        );
      } catch (err) {
        console.error("AI Error", err);
      } finally {
        setIsTyping(false);
      }
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const compressed = await compressImage(base64, 800, 0.6);
        setPendingImage(compressed);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Image error", err);
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Active Chat Top Bar with User Info & Safety Controls */}
      <div className="px-4 py-2.5 bg-slate-950/90 backdrop-blur-md border-b border-slate-900 flex items-center justify-between z-20 shrink-0">
        <button 
          onClick={() => onViewProfile?.(profile)}
          className="flex items-center gap-3 text-left group focus:outline-none"
        >
          <div className="relative">
            <img 
              src={profile.imageUrl} 
              alt={profile.name} 
              className="w-10 h-10 rounded-2xl object-cover ring-1 ring-slate-800 group-hover:ring-sky-500 transition-all"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-sky-400 transition-colors">
                {profile.name}
              </h3>
              <span className="text-xs text-slate-400 font-medium">{profile.age}</span>
            </div>
            <ProfileBadges profile={profile} size="sm" className="my-0.5" />
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              {profile.distance || 'Nearby'} · {profile.lastSeen || 'Active'}
            </p>
          </div>
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
        {messages.length === 0 && (
          <div className="text-center py-10 flex flex-col items-center">
            <img 
              src={profile.imageUrl} 
              className="w-20 h-20 rounded-3xl object-cover mb-4 ring-2 ring-slate-800 p-1 bg-slate-900" 
            />
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">
              Connected with {profile.name}
            </p>
            <p className="text-slate-500 text-xs mb-6">
              Start the conversation or tap an icebreaker below
            </p>
            
            <div className="w-full max-w-xs space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="flex items-center gap-2 mb-2 justify-center">
                <Sparkles className="w-3 h-3 text-sky-400" />
                <span className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em]">
                  AI Icebreakers
                </span>
              </div>
              
              {isLoadingIcebreakers ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-10 bg-slate-900/50 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                icebreakers.map((text, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onSendMessage(text);
                      setIcebreakers([]);
                    }}
                    className="w-full p-3 text-xs font-bold text-slate-300 bg-slate-900/40 rounded-xl border border-slate-800 hover:border-sky-500/50 hover:bg-sky-500/5 transition-all text-left active:scale-[0.98]"
                  >
                    "{text}"
                  </button>
                ))
              )}
            </div>
          </div>
        )}
        
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.senderId === myId ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] rounded-2xl font-medium text-sm shadow-xl overflow-hidden ${
              msg.senderId === myId 
                ? 'bg-sky-500 text-white rounded-tr-none' 
                : 'bg-slate-900 text-slate-200 rounded-tl-none border border-slate-800'
            }`}>
              {msg.imageUrl && (
                <div className="w-full mb-2 bg-black/20">
                  <img 
                    src={msg.imageUrl} 
                    alt="attachment" 
                    className="w-full h-auto max-h-[300px] object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="px-4 py-2.5">
                {msg.text}
                
                <div className={`text-[9px] mt-1.5 opacity-60 font-black ${msg.senderId === myId ? 'text-right' : 'text-left'}`}>
                  {msg.timestamp instanceof Date ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
             <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl rounded-tl-none flex gap-1.5">
              <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {pendingImage && (
        <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center gap-3 animate-in slide-in-from-bottom-2">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-sky-500/50">
            <img src={pendingImage} className="w-full h-full object-cover" />
            <button 
              onClick={() => setPendingImage(null)}
              className="absolute top-1 right-1 bg-black/60 rounded-full p-1 text-white hover:bg-red-500 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Image Selected</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Ready to send</p>
          </div>
        </div>
      )}

      {messagingDisabled ? (
        <div className="p-4 bg-red-950/40 border-t border-red-900/60 text-center">
          <p className="text-xs font-bold text-red-300 uppercase tracking-wider">
            Your messaging privileges have been temporarily suspended by an administrator.
          </p>
        </div>
      ) : (
        <div className="p-4 bg-slate-950 border-t border-slate-900 flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleImageSelect}
          />
          <button 
            type="button"
            onClick={() => {
              if (mediaDisabled) {
                alert("Media uploads have been restricted on your account by an administrator.");
                return;
              }
              fileInputRef.current?.click();
            }}
            disabled={isUploading || mediaDisabled}
            className="text-slate-500 hover:text-sky-400 transition-colors disabled:opacity-30"
            title={mediaDisabled ? "Photo uploads disabled by administrator" : "Attach Image"}
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
            ) : (
              <ImageIcon className="w-6 h-6" />
            )}
          </button>
          <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Slyd a message..."
              className="flex-1 bg-slate-900 border-none rounded-2xl px-5 py-3 text-sm focus:ring-1 focus:ring-sky-500 outline-none text-slate-200"
            />
            <button 
              type="submit"
              disabled={(!inputText.trim() && !pendingImage) || isUploading}
              className="bg-sky-500 text-white p-3 rounded-2xl disabled:opacity-30 shadow-lg shadow-sky-900/40 active:scale-90 transition-transform"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatRoom;
