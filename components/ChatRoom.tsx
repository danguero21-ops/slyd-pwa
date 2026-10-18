import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Message } from '../types';
import { getGeminiResponse, getIcebreakers } from '../services/geminiService';
import {
  Sparkles,
  Image as ImageIcon,
  X,
  Send,
  Timer,
  MessageSquarePlus,
  RotateCcw,
  CheckCheck,
  Check,
  Lock,
  Plus,
  Trash2,
  Eye,
  Flame,
  MapPin,
  Navigation
} from 'lucide-react';
import { compressImage } from '../src/lib/image-utils';
import ProfileBadges from './ProfileBadges';
import { getUserPresenceInfo } from '../src/lib/presence';

interface ChatRoomProps {
  profile: UserProfile;
  messages: Message[];
  onSendMessage: (text: string, imageUrl?: string, isExpiringPhoto?: boolean, location?: { lat: number; lng: number; address?: string; sharedAt: number }) => void;
  onUnsendMessage?: (messageId: string) => Promise<void> | void;
  onSavePhrases?: (phrases: string[]) => Promise<void> | void;
  myId: string;
  isPremium?: boolean;
  readReceiptsEnabled?: boolean;
  disableTypingIndicator?: boolean;
  savedPhrases?: string[];
  onPremiumClick?: (featureName?: string) => void;
  onBlock?: (profile: UserProfile) => void;
  onReport?: (profile: UserProfile, reason: string, details: string, alsoBlock: boolean) => Promise<void>;
  onViewProfile?: (profile: UserProfile) => void;
  messagingDisabled?: boolean;
  mediaDisabled?: boolean;
}

const DEFAULT_SAVED_PHRASES = [
  "Hey! What are you up to right now?",
  "Can host in my area — are you mobile?",
  "Great profile! Let's grab a drink sometime.",
  "Unlocked my private vault for you!"
];

const ChatRoom: React.FC<ChatRoomProps> = ({
  profile,
  messages,
  onSendMessage,
  onUnsendMessage,
  onSavePhrases,
  myId,
  isPremium = false,
  readReceiptsEnabled = true,
  disableTypingIndicator = false,
  savedPhrases,
  onPremiumClick,
  onViewProfile,
  messagingDisabled = false,
  mediaDisabled = false
}) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [isLoadingIcebreakers, setIsLoadingIcebreakers] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isExpiringMode, setIsExpiringMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Saved Phrases Tray State (Slyd+ feature)
  const [showPhrasesTray, setShowPhrasesTray] = useState(false);
  const [newPhraseInput, setNewPhraseInput] = useState('');
  const activePhrases = savedPhrases && savedPhrases.length > 0 ? savedPhrases : DEFAULT_SAVED_PHRASES;

  // Expiring photo viewer state (10-second countdown)
  const [revealedExpiringIds, setRevealedExpiringIds] = useState<Record<string, number>>({});
  const [expiredMessageIds, setExpiredMessageIds] = useState<Set<string>>(new Set());

  // On-demand location sharing state
  const [showLocationConfirm, setShowLocationConfirm] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const handleConfirmShareLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          setShowLocationConfirm(false);
          onSendMessage(
            '📍 Shared meetup location',
            undefined,
            false,
            {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              address: 'Live GPS Meetup Coordinates',
              sharedAt: Date.now()
            }
          );
        },
        (err) => {
          console.warn("Geolocation fallback to profile coords:", err);
          setIsLocating(false);
          setShowLocationConfirm(false);
          // Fallback to default/current profile coordinates if GPS permission prompt is dismissed
          const fallbackLat = profile.coordinates?.lat || 34.0522;
          const fallbackLng = profile.coordinates?.lng || -118.2437;
          onSendMessage(
            '📍 Shared meetup location',
            undefined,
            false,
            {
              lat: fallbackLat,
              lng: fallbackLng,
              address: 'Shared Meetup Point',
              sharedAt: Date.now()
            }
          );
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setIsLocating(false);
      setShowLocationConfirm(false);
      const fallbackLat = profile.coordinates?.lat || 34.0522;
      const fallbackLng = profile.coordinates?.lng || -118.2437;
      onSendMessage(
        '📍 Shared meetup location',
        undefined,
        false,
        {
          lat: fallbackLat,
          lng: fallbackLng,
          address: 'Shared Meetup Point',
          sharedAt: Date.now()
        }
      );
    }
  };

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

  // Countdown tick for revealed expiring photos
  useEffect(() => {
    const activeIds = Object.keys(revealedExpiringIds);
    if (activeIds.length === 0) return;

    const timer = setInterval(() => {
      setRevealedExpiringIds(prev => {
        const next = { ...prev };
        let changed = false;
        for (const id of Object.keys(next)) {
          if (next[id] <= 1) {
            delete next[id];
            setExpiredMessageIds(old => new Set([...old, id]));
            changed = true;
          } else {
            next[id] -= 1;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [revealedExpiringIds]);

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
    const currentExpiring = Boolean(pendingImage && isExpiringMode && isPremium);

    onSendMessage(currentText, currentImage || undefined, currentExpiring);
    setInputText('');
    setPendingImage(null);
    setIsExpiringMode(false);
    setShowPhrasesTray(false);

    // Server-proxied reply simulation for demo/mock bots
    if (profile.id.startsWith('mock_')) {
      setIsTyping(true);
      try {
        await getGeminiResponse(currentText, profile.name, profile.bio);
      } catch (err) {
        console.error('AI Error', err);
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
      console.error('Image error', err);
      setIsUploading(false);
    }
  };

  const handleAddPhrase = async () => {
    if (!newPhraseInput.trim()) return;
    const updated = [newPhraseInput.trim(), ...activePhrases].slice(0, 12);
    setNewPhraseInput('');
    await onSavePhrases?.(updated);
  };

  const handleDeletePhrase = async (phraseToRemove: string) => {
    const updated = activePhrases.filter(p => p !== phraseToRemove);
    await onSavePhrases?.(updated);
  };

  const handleUnsendClick = async (msgId: string) => {
    if (!isPremium) {
      onPremiumClick?.('Unsend Messages & Photos');
      return;
    }
    await onUnsendMessage?.(msgId);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Active Chat Top Bar with User Info & Slyd+ Status */}
      <div className="px-4 py-2.5 bg-slate-950/90 backdrop-blur-md border-b border-slate-900 flex items-center justify-between z-20 shrink-0">
        <button
          onClick={() => onViewProfile?.(profile)}
          className="flex items-center gap-3 text-left group focus:outline-none"
        >
          {(() => {
            const presence = getUserPresenceInfo(profile, myId);
            return (
              <>
                <div className="relative">
                  <img
                    src={profile.imageUrl}
                    alt={profile.name}
                    className="w-10 h-10 rounded-2xl object-cover ring-1 ring-slate-800 group-hover:ring-sky-500 transition-all"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-slate-950 rounded-full ${presence.dotColorClass}`}
                    title={presence.label}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm text-slate-100 group-hover:text-sky-400 transition-colors">
                      {profile.name}
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">{profile.age}</span>
                  </div>
                  <ProfileBadges profile={profile} size="sm" compact className="my-0.5" />
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    {profile.distance || 'Nearby'} · <span className={presence.textColorClass}>{presence.label}</span>
                  </p>
                </div>
              </>
            );
          })()}
        </button>

        <div className="flex items-center gap-2">
          {isPremium && disableTypingIndicator && (
            <span className="text-[10px] font-bold text-emerald-400">
              Stealth Typing ON
            </span>
          )}
        </div>
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
              Start the conversation, use Saved Phrases, or tap an icebreaker below
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

        {messages.map((msg) => {
          const isMine = msg.senderId === myId;
          const isExpiring = Boolean(msg.isExpiringPhoto && msg.imageUrl);
          const hasExpired = expiredMessageIds.has(msg.id) || (isExpiring && msg.viewedByReceiver && !isMine);
          const remainingSecs = revealedExpiringIds[msg.id];

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} group`}
            >
              <div
                className={`max-w-[85%] rounded-2xl font-medium text-sm shadow-xl overflow-hidden ${
                  isMine
                    ? 'bg-sky-500 text-white rounded-tr-none'
                    : 'bg-slate-900 text-slate-200 rounded-tl-none border border-slate-800'
                }`}
              >
                {msg.imageUrl && (
                  <div className="w-full bg-black/30 relative">
                    {isExpiring ? (
                      hasExpired ? (
                        <div className="p-5 flex items-center gap-2.5 text-xs font-bold text-slate-300 bg-slate-950/90">
                          <Flame className="w-4 h-4 text-sky-400 shrink-0" />
                          <span>Expiring Photo Expired</span>
                        </div>
                      ) : remainingSecs !== undefined ? (
                        <div className="relative">
                          <img
                            src={msg.imageUrl}
                            alt="Expiring photo"
                            className="w-full h-auto max-h-[300px] object-cover select-none"
                          />
                          <div className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/80 text-sky-400 text-xs font-black tabular-nums flex items-center gap-1">
                            <Timer className="w-3.5 h-3.5 animate-spin" />
                            <span>{remainingSecs}s</span>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setRevealedExpiringIds(prev => ({ ...prev, [msg.id]: 10 }));
                          }}
                          className="w-full p-5 bg-slate-950/85 hover:bg-slate-900/90 transition-colors flex flex-col items-center justify-center gap-2 text-center"
                        >
                          <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                            <Timer className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-black text-white">
                            {isMine ? 'Expiring Photo Sent (10s Timer)' : 'Tap to View Expiring Photo (10s)'}
                          </span>
                          <span className="text-[10px] text-sky-300">
                            Self-destructs 10 seconds after opening
                          </span>
                        </button>
                      )
                    ) : (
                      <img
                        src={msg.imageUrl}
                        alt="attachment"
                        className="w-full h-auto max-h-[300px] object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                )}

                {msg.location && (
                  <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0 animate-bounce" />
                      <span>Meetup Coordinate Shared</span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-mono bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800">
                      {msg.location.address || `${msg.location.lat.toFixed(4)}, ${msg.location.lng.toFixed(4)}`}
                    </p>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${msg.location.lat},${msg.location.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] uppercase tracking-wider transition-all shadow-md shadow-emerald-950/40"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Open Directions</span>
                    </a>
                  </div>
                )}

                {msg.text && (
                  <div className="px-4 py-2.5">
                    {msg.text}
                  </div>
                )}

                <div
                  className={`px-4 pb-2 pt-0.5 text-[10px] flex items-center gap-2 ${
                    isMine ? 'justify-end text-sky-100/80' : 'justify-start text-slate-400'
                  }`}
                >
                  <span className="tabular-nums font-bold">
                    {msg.timestamp instanceof Date
                      ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '...'}
                  </span>

                  {/* Read Receipts & Unsend Action for Sender */}
                  {isMine && (
                    <>
                      <span aria-hidden="true">·</span>
                      {isPremium && readReceiptsEnabled ? (
                        <span className="inline-flex items-center gap-0.5 font-bold text-white" title="Read Receipt">
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />
                          <span>{msg.isRead ? 'Read' : 'Delivered'}</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onPremiumClick?.('Read Receipts')}
                          className="inline-flex items-center gap-0.5 text-[9px] text-sky-100/80 hover:text-white underline"
                          title="Unlock Read Receipts with Slyd+"
                        >
                          <Check className="w-3 h-3" />
                          <span>Sent</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Unsend Message / Photo Control (Slyd+ Feature) */}
              {isMine && (
                <button
                  type="button"
                  onClick={() => handleUnsendClick(msg.id)}
                  className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-red-400 transition-colors px-1"
                  title={isPremium ? 'Unsend message for everyone' : 'Unsend Messages (Slyd+)'}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Unsend</span>
                  {!isPremium && <span className="text-sky-400">· Slyd+</span>}
                </button>
              )}
            </div>
          );
        })}

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

      {/* Saved Phrases Drawer (Slyd+ Feature) */}
      {showPhrasesTray && (
        <div className="px-4 py-3 bg-slate-900/95 border-t border-slate-800 space-y-2.5 animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <MessageSquarePlus className="w-4 h-4 text-sky-400" />
              <span>Saved Quick Phrases</span>
              {!isPremium && <span className="text-[10px] text-sky-400 font-semibold">· Slyd+</span>}
            </span>
            <button
              type="button"
              onClick={() => setShowPhrasesTray(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>

          {!isPremium ? (
            <div className="p-3 rounded-xl bg-slate-950 border border-sky-500/30 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-300">
                Save your favorite icebreakers and host/location replies for 1-tap sending with Slyd+.
              </div>
              <button
                type="button"
                onClick={() => onPremiumClick?.('Saved Chat Phrases')}
                className="px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-black text-xs shrink-0"
              >
                Unlock
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPhraseInput}
                  onChange={e => setNewPhraseInput(e.target.value)}
                  placeholder="Save a new phrase..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={handleAddPhrase}
                  className="px-3 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto no-scrollbar">
                {activePhrases.map((phrase, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-1.5 bg-slate-950 border border-slate-800 hover:border-sky-500/40 rounded-xl px-2.5 py-1.5 text-xs text-slate-200"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSendMessage(phrase);
                        setShowPhrasesTray(false);
                      }}
                      className="text-left hover:text-sky-400 transition-colors"
                    >
                      "{phrase}"
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePhrase(phrase)}
                      className="text-slate-500 hover:text-red-400 ml-1"
                      title="Remove phrase"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Pending Image Preview + Expiring Photo Toggle */}
      {pendingImage && (
        <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-sky-500/50">
              <img src={pendingImage} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => { setPendingImage(null); setIsExpiringMode(false); }}
                className="absolute top-1 right-1 bg-black/60 rounded-full p-1 text-white hover:bg-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                {isExpiringMode && isPremium ? 'Expiring Photo (10s View-Once)' : 'Standard Photo Attachment'}
              </p>
              <p className="text-[10px] text-slate-400">
                {isExpiringMode && isPremium
                  ? 'Photo will self-destruct 10s after recipient opens it'
                  : 'Ready to send in chat'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!isPremium) {
                onPremiumClick?.('Expiring Self-Destruct Photos');
                return;
              }
              setIsExpiringMode(!isExpiringMode);
            }}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
              isExpiringMode && isPremium
                ? 'bg-sky-500 text-white border-sky-400'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-sky-500/40'
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            <span>{isExpiringMode && isPremium ? '10s Timer ON' : 'Expiring (10s)'}</span>
            {!isPremium && <Lock className="w-3 h-3 text-sky-400" />}
          </button>
        </div>
      )}

      {messagingDisabled ? (
        <div className="p-4 bg-red-950/40 border-t border-red-900/60 text-center">
          <p className="text-xs font-bold text-red-300 uppercase tracking-wider">
            Your messaging privileges have been temporarily suspended by an administrator.
          </p>
        </div>
      ) : (
        <div className="p-3.5 bg-slate-950 border-t border-slate-900 flex items-center gap-2">
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
              if (mediaDisabled) return;
              fileInputRef.current?.click();
            }}
            disabled={isUploading || mediaDisabled}
            className="p-2.5 rounded-xl bg-slate-900 text-slate-400 hover:text-sky-400 transition-colors disabled:opacity-30"
            title={mediaDisabled ? 'Photo uploads disabled by administrator' : 'Attach Photo or Expiring Image'}
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
            ) : (
              <ImageIcon className="w-5 h-5" />
            )}
          </button>

          {/* On-Demand Meetup Location Sharing Button */}
          <button
            type="button"
            onClick={() => setShowLocationConfirm(true)}
            disabled={isLocating}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-colors disabled:opacity-30"
            title="Share Meetup Location"
          >
            {isLocating ? (
              <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
            ) : (
              <MapPin className="w-5 h-5" />
            )}
          </button>

          {/* Saved Phrases Trigger Button */}
          <button
            type="button"
            onClick={() => setShowPhrasesTray(!showPhrasesTray)}
            className={`p-2.5 rounded-xl border transition-colors ${
              showPhrasesTray
                ? 'bg-sky-500/20 border-sky-500/40 text-sky-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-sky-400'
            }`}
            title="Saved Phrases (Slyd+)"
          >
            <MessageSquarePlus className="w-5 h-5" />
          </button>

          <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Slyd a message..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-sm focus:border-sky-500 outline-none text-slate-200"
            />
            <button
              type="submit"
              disabled={(!inputText.trim() && !pendingImage) || isUploading}
              className="bg-sky-500 text-white p-3 rounded-2xl disabled:opacity-30 shadow-lg shadow-sky-900/40 active:scale-90 transition-transform"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Explicit Location Sharing Confirmation Modal (SRS Phase 3 Requirement 3) */}
      {showLocationConfirm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6 select-none animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-3xl bg-slate-950 border border-slate-800 p-6 space-y-4 text-center shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/40">
              <MapPin className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white font-display tracking-tight">
                Share Meetup Location?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Share your live/exact meetup location with <span className="text-emerald-400 font-bold">{profile.name}</span>?
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                To protect privacy, exact coordinates are never shown on the public grid. Tapping confirm sends an approved meetup coordinate pin inside this secure chat.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLocationConfirm(false)}
                className="py-3 px-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-800 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmShareLocation}
                disabled={isLocating}
                className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-950/50 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                {isLocating ? (
                  <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                ) : (
                  <>
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Confirm</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatRoom;
