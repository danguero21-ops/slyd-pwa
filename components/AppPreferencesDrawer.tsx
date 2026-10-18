import React, { useState, useEffect } from 'react';
import { UserProfile, UserPreferences } from '../types';
import {
  SlidersHorizontal,
  EyeOff,
  Eye,
  MapPin,
  CheckCheck,
  Shield,
  Bell,
  Volume2,
  LayoutGrid,
  Ruler,
  Crown,
  Check,
  Lock
} from 'lucide-react';

interface AppPreferencesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  isPremium: boolean;
  onSavePreferences: (updates: Partial<UserProfile>) => Promise<void>;
  onOpenPaywall: (featureName: string) => void;
}

const DEFAULT_PREFS: UserPreferences = {
  units: 'imperial',
  gridDensity: 'comfortable',
  defaultTab: 'grid',
  showOffline: true,
  soundEffects: true,
  pushNotifications: true,
  woofAlerts: true,
  nearbyAlerts: true,
  disableTypingIndicator: false,
  adFreeExperience: true
};

const AppPreferencesDrawer: React.FC<AppPreferencesDrawerProps> = ({
  isOpen,
  onClose,
  profile,
  isPremium,
  onSavePreferences,
  onOpenPaywall
}) => {
  const [isIncognito, setIsIncognito] = useState(Boolean(profile.isIncognito));
  const [showOnlineStatus, setShowOnlineStatus] = useState(profile.showOnlineStatus !== false);
  const [showDistance, setShowDistance] = useState(profile.showDistance !== false);
  const [readReceipts, setReadReceipts] = useState(profile.readReceipts !== false);
  const [screenshotProtection, setScreenshotProtection] = useState(Boolean(profile.screenshotProtection));
  const [prefs, setPrefs] = useState<UserPreferences>({
    ...DEFAULT_PREFS,
    ...(profile.preferences || {})
  });
  const [isSaving, setIsSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setIsIncognito(Boolean(profile.isIncognito));
    setShowOnlineStatus(profile.showOnlineStatus !== false);
    setShowDistance(profile.showDistance !== false);
    setReadReceipts(profile.readReceipts !== false);
    setScreenshotProtection(Boolean(profile.screenshotProtection));
    setPrefs({
      ...DEFAULT_PREFS,
      ...(profile.preferences || {})
    });
  }, [
    isOpen,
    profile.isIncognito,
    profile.showOnlineStatus,
    profile.showDistance,
    profile.readReceipts,
    profile.screenshotProtection,
    profile.preferences,
    isPremium
  ]);

  if (!isOpen) return null;

  const handleImmediateUpdate = (updates: Partial<UserProfile>) => {
    onSavePreferences(updates).catch(() => {});
  };

  const handleTogglePremiumSetting = (setter: () => void, featureLabel: string) => {
    if (!isPremium) {
      onOpenPaywall(featureLabel);
      return;
    }
    setter();
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSavePreferences({
        isIncognito: isPremium ? isIncognito : false,
        hiddenFromGrid: isPremium ? isIncognito : Boolean(profile.hiddenFromGrid),
        showOnlineStatus,
        showDistance,
        readReceipts: isPremium ? readReceipts : true,
        screenshotProtection: isPremium ? screenshotProtection : false,
        preferences: prefs
      });
      setSavedNotice(true);
      setTimeout(() => {
        setSavedNotice(false);
        onClose();
      }, 600);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md max-h-[88dvh] bg-slate-950 rounded-t-[2.25rem] border-t border-slate-800 flex flex-col overflow-hidden z-10 shadow-2xl">
        {/* Grab Handle */}
        <div className="w-10 h-1.5 bg-slate-800 rounded-full mx-auto mt-3 mb-1 shrink-0" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-white font-display tracking-tight">
                App Preferences & Privacy
              </h2>
              <p className="text-[11px] text-slate-400">
                {isPremium ? 'Slyd+ Pro Controls Active' : 'Customize your discovery & privacy experience'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            aria-label="Close app preferences"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
          {/* Membership Status Card */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
            isPremium
              ? 'bg-sky-500/10 border-sky-500/30'
              : 'bg-slate-900/70 border-slate-800'
          }`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isPremium ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                <Crown className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{isPremium ? 'Slyd+ Membership Active' : 'Free Member Tier'}</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {isPremium
                    ? `Plan: ${(profile.premiumPlan || 'monthly').toUpperCase()} · Card Billing`
                    : 'Upgrade to unlock Incognito, Read Receipts & Vault Shield'}
                </div>
              </div>
            </div>

            {!isPremium && (
              <button
                type="button"
                onClick={() => onOpenPaywall('App Preferences & Privacy Controls')}
                className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-black text-xs shrink-0 transition-colors whitespace-nowrap"
              >
                Upgrade
              </button>
            )}
          </div>

          {/* Section 1: Slyd+ Stealth & Privacy Controls */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-400">
                Stealth & Privacy Controls
              </div>
              {isPremium ? (
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-cyan-400 text-slate-950 flex items-center gap-1">
                  <Crown className="w-2.5 h-2.5" />
                  <span>Slyd+ Highlighted</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>Slyd+ features grayed out</span>
                </span>
              )}
            </div>

            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl divide-y divide-slate-800/70 overflow-hidden">
              {/* Incognito Mode (Slyd+ Feature) */}
              <div
                onClick={!isPremium ? () => onOpenPaywall('Incognito Mode') : undefined}
                className={`p-4 flex items-center justify-between gap-3 transition-all ${
                  isPremium
                    ? 'bg-cyan-950/25 border-l-2 border-l-cyan-400'
                    : 'bg-slate-950/50 opacity-55 grayscale hover:opacity-80 cursor-pointer'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  {isPremium ? (
                    <EyeOff className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className={`text-xs font-bold flex items-center gap-1.5 ${isPremium ? 'text-cyan-200' : 'text-slate-400'}`}>
                      <span>Incognito Browsing Mode</span>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                        isPremium ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {isPremium ? 'Slyd+' : 'Locked'}
                      </span>
                    </div>
                    <p className={`text-[11px] ${isPremium ? 'text-cyan-100/75' : 'text-slate-500'}`}>
                      Hide your profile from the discovery grid and radar map while browsing.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isIncognito && isPremium}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePremiumSetting(() => {
                      const next = !isIncognito;
                      setIsIncognito(next);
                      handleImmediateUpdate({ isIncognito: next, hiddenFromGrid: next });
                    }, 'Incognito Mode');
                  }}
                  className={`w-12 h-7 rounded-full p-1 transition-all duration-200 shrink-0 cursor-pointer flex items-center ${
                    isIncognito && isPremium ? 'bg-cyan-400 shadow-md shadow-cyan-500/30' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 transform ${
                    isIncognito && isPremium ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Show Online Status (Free Feature) */}
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <Eye className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">Show Active Online Status</div>
                    <p className="text-[11px] text-slate-400">
                      Display your live session dot when you are signed in.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showOnlineStatus}
                  onClick={() => {
                    const next = !showOnlineStatus;
                    setShowOnlineStatus(next);
                    handleImmediateUpdate({ showOnlineStatus: next });
                  }}
                  className={`w-12 h-7 rounded-full p-1 transition-all duration-200 shrink-0 cursor-pointer flex items-center ${
                    showOnlineStatus ? 'bg-sky-500 shadow-md shadow-sky-500/30' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 transform ${
                    showOnlineStatus ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Show Distance (Free Feature) */}
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">Show Proximity Distance</div>
                    <p className="text-[11px] text-slate-400">
                      Let other members see approximate distance on your profile card.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showDistance}
                  onClick={() => {
                    const next = !showDistance;
                    setShowDistance(next);
                    handleImmediateUpdate({ showDistance: next });
                  }}
                  className={`w-12 h-7 rounded-full p-1 transition-all duration-200 shrink-0 cursor-pointer flex items-center ${
                    showDistance ? 'bg-sky-500 shadow-md shadow-sky-500/30' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 transform ${
                    showDistance ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Stealth Read Receipts (Slyd+ Feature) */}
              <div
                onClick={!isPremium ? () => onOpenPaywall('Stealth Read Receipts') : undefined}
                className={`p-4 flex items-center justify-between gap-3 transition-all ${
                  isPremium
                    ? 'bg-cyan-950/25 border-l-2 border-l-cyan-400'
                    : 'bg-slate-950/50 opacity-55 grayscale hover:opacity-80 cursor-pointer'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  {isPremium ? (
                    <CheckCheck className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className={`text-xs font-bold flex items-center gap-1.5 ${isPremium ? 'text-cyan-200' : 'text-slate-400'}`}>
                      <span>Send Read Receipts in Chat</span>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                        isPremium ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {isPremium ? 'Slyd+' : 'Locked'}
                      </span>
                    </div>
                    <p className={`text-[11px] ${isPremium ? 'text-cyan-100/75' : 'text-slate-500'}`}>
                      Turn off to read messages privately without notifying senders.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={readReceipts && isPremium}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePremiumSetting(() => {
                      const next = !readReceipts;
                      setReadReceipts(next);
                      handleImmediateUpdate({ readReceipts: next });
                    }, 'Stealth Read Receipts');
                  }}
                  className={`w-12 h-7 rounded-full p-1 transition-all duration-200 shrink-0 cursor-pointer flex items-center ${
                    readReceipts && isPremium ? 'bg-cyan-400 shadow-md shadow-cyan-500/30' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 transform ${
                    readReceipts && isPremium ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Private Vault Screenshot Watermark Protection (Slyd+ Feature) */}
              <div
                onClick={!isPremium ? () => onOpenPaywall('Private Vault Shield') : undefined}
                className={`p-4 flex items-center justify-between gap-3 transition-all ${
                  isPremium
                    ? 'bg-cyan-950/25 border-l-2 border-l-cyan-400'
                    : 'bg-slate-950/50 opacity-55 grayscale hover:opacity-80 cursor-pointer'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  {isPremium ? (
                    <Shield className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className={`text-xs font-bold flex items-center gap-1.5 ${isPremium ? 'text-cyan-200' : 'text-slate-400'}`}>
                      <span>Private Vault Privacy Shield</span>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                        isPremium ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {isPremium ? 'Slyd+' : 'Locked'}
                      </span>
                    </div>
                    <p className={`text-[11px] ${isPremium ? 'text-cyan-100/75' : 'text-slate-500'}`}>
                      Protect your unlocked private vault photos with anti-capture blur guard.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={screenshotProtection && isPremium}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePremiumSetting(() => {
                      const next = !screenshotProtection;
                      setScreenshotProtection(next);
                      handleImmediateUpdate({ screenshotProtection: next });
                    }, 'Private Vault Shield');
                  }}
                  className={`w-12 h-7 rounded-full p-1 transition-all duration-200 shrink-0 cursor-pointer flex items-center ${
                    screenshotProtection && isPremium ? 'bg-cyan-400 shadow-md shadow-cyan-500/30' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 transform ${
                    screenshotProtection && isPremium ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Stealth Typing Indicator (Slyd+ Feature) */}
              <div
                onClick={!isPremium ? () => onOpenPaywall('Typing Stealth Indicator') : undefined}
                className={`p-4 flex items-center justify-between gap-3 transition-all ${
                  isPremium
                    ? 'bg-cyan-950/25 border-l-2 border-l-cyan-400'
                    : 'bg-slate-950/50 opacity-55 grayscale hover:opacity-80 cursor-pointer'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  {isPremium ? (
                    <EyeOff className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className={`text-xs font-bold flex items-center gap-1.5 ${isPremium ? 'text-cyan-200' : 'text-slate-400'}`}>
                      <span>Hide Typing Status Indicator</span>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                        isPremium ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {isPremium ? 'Slyd+' : 'Locked'}
                      </span>
                    </div>
                    <p className={`text-[11px] ${isPremium ? 'text-cyan-100/75' : 'text-slate-500'}`}>
                      Compose messages in chat without showing a live typing indicator.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(prefs.disableTypingIndicator && isPremium)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePremiumSetting(
                      () => {
                        const nextPrefs = { ...prefs, disableTypingIndicator: !prefs.disableTypingIndicator };
                        setPrefs(nextPrefs);
                        handleImmediateUpdate({ preferences: nextPrefs });
                      },
                      'Typing Stealth Indicator'
                    );
                  }}
                  className={`w-12 h-7 rounded-full p-1 transition-all duration-200 shrink-0 cursor-pointer flex items-center ${
                    prefs.disableTypingIndicator && isPremium ? 'bg-cyan-400 shadow-md shadow-cyan-500/30' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 transform ${
                    prefs.disableTypingIndicator && isPremium ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          </section>

          {/* Section 2: Display & Discovery Layout */}
          <section className="space-y-3">
            <div className="text-xs font-bold text-slate-400">
              Display & Discovery Preferences
            </div>

            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 space-y-4">
              {/* Measurement Units */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Ruler className="w-4 h-4 text-sky-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Measurement Units</div>
                    <div className="text-[11px] text-slate-400">Height, weight & distance</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                  {(['imperial', 'metric'] as const).map(unit => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => {
                        const nextPrefs = { ...prefs, units: unit };
                        setPrefs(nextPrefs);
                        handleImmediateUpdate({ preferences: nextPrefs });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                        prefs.units === unit
                          ? 'bg-sky-500 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid Density */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <LayoutGrid className="w-4 h-4 text-sky-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Discovery Grid Layout</div>
                    <div className="text-[11px] text-slate-400">Columns per row on grid</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                  {[
                    { id: 'comfortable', label: '3 Cols' },
                    { id: 'compact', label: '4 Cols' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        const nextPrefs = { ...prefs, gridDensity: opt.id as 'comfortable' | 'compact' };
                        setPrefs(nextPrefs);
                        handleImmediateUpdate({ preferences: nextPrefs });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        prefs.gridDensity === opt.id
                          ? 'bg-sky-500 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Show Offline Profiles */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div>
                  <div className="text-xs font-bold text-white">Include Offline Profiles in Grid</div>
                  <div className="text-[11px] text-slate-400">Turn off to only see members currently signed in</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs.showOffline}
                  onClick={() => {
                    const nextPrefs = { ...prefs, showOffline: !prefs.showOffline };
                    setPrefs(nextPrefs);
                    handleImmediateUpdate({ preferences: nextPrefs });
                  }}
                  className={`w-12 h-7 rounded-full p-1 transition-all duration-200 shrink-0 cursor-pointer flex items-center ${
                    prefs.showOffline ? 'bg-sky-500 shadow-md shadow-sky-500/30' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 transform ${
                    prefs.showOffline ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          </section>

          {/* Section 3: Notifications & Sound */}
          <section className="space-y-3">
            <div className="text-xs font-bold text-slate-400">
              Notifications & Alerts
            </div>

            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl divide-y divide-slate-800/70">
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-sky-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Message & Super Like Alerts</div>
                    <div className="text-[11px] text-slate-400">Real-time pulse when someone messages or likes you</div>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs.pushNotifications}
                  onClick={() => {
                    const nextPrefs = { ...prefs, pushNotifications: !prefs.pushNotifications };
                    setPrefs(nextPrefs);
                    handleImmediateUpdate({ preferences: nextPrefs });
                  }}
                  className={`w-12 h-7 rounded-full p-1 transition-all duration-200 shrink-0 cursor-pointer flex items-center ${
                    prefs.pushNotifications ? 'bg-sky-500 shadow-md shadow-sky-500/30' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 transform ${
                    prefs.pushNotifications ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-4 h-4 text-sky-400" />
                  <div>
                    <div className="text-xs font-bold text-white">In-App Haptic & Sound Effects</div>
                    <div className="text-[11px] text-slate-400">Subtle audio feedback on chat & Super Likes</div>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs.soundEffects}
                  onClick={() => {
                    const nextPrefs = { ...prefs, soundEffects: !prefs.soundEffects };
                    setPrefs(nextPrefs);
                    handleImmediateUpdate({ preferences: nextPrefs });
                  }}
                  className={`w-12 h-7 rounded-full p-1 transition-all duration-200 shrink-0 cursor-pointer flex items-center ${
                    prefs.soundEffects ? 'bg-sky-500 shadow-md shadow-sky-500/30' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 transform ${
                    prefs.soundEffects ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="p-4 flex items-center justify-between border-t border-slate-900/60 text-xs text-slate-400">
                <span className="font-bold text-slate-300">Legal & Policies</span>
                <div className="flex items-center gap-3">
                  <a
                    href="/terms.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:text-sky-300 underline font-bold"
                  >
                    Terms
                  </a>
                  <span>•</span>
                  <a
                    href="/privacy.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:text-sky-300 underline font-bold"
                  >
                    Privacy
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Sticky Footer CTA */}
        <div className="p-4 bg-slate-950 border-t border-slate-900 shrink-0">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="w-full py-4 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-black text-xs rounded-2xl shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition-all"
          >
            {savedNotice ? (
              <>
                <Check className="w-4 h-4" />
                <span>Preferences Saved!</span>
              </>
            ) : (
              <span>{isSaving ? 'Saving Preferences...' : 'Save App Preferences'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppPreferencesDrawer;
