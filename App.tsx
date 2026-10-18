
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppView, UserProfile, Message, Filters, SystemSetting, isAdminUser, isSelfieExemptUser, hasActivePremiumSubscription } from './types';
import { DISABLE_PHOTO_VERIFICATION } from './constants';
import { MapPin, Search, MessageSquare, User, Filter, Edit3, X, ChevronLeft, Send, Sparkles, Crown, ShieldCheck, ShieldAlert, Clock, Shield, Ban, Lock, Globe, Images, Plus, Eye, EyeOff, SlidersHorizontal, CreditCard } from 'lucide-react';
import BottomNav from './components/BottomNav';
import ProfileGrid from './components/ProfileGrid';
import MapView from './components/MapView';
import Inbox from './components/Inbox';
import ProfilePanel from './components/ProfilePanel';
import ChatRoom from './components/ChatRoom';
import Header from './components/Header';
import FilterDrawer from './components/FilterDrawer';
import ProfileEdit from './components/ProfileEdit';
import SplashScreen from './components/SplashScreen';
import AuthFlow from './components/AuthFlow';
import Onboarding from './components/Onboarding';
import PremiumPaywall, { UpgradePaymentResult } from './components/PremiumPaywall';
import AppPreferencesDrawer from './components/AppPreferencesDrawer';
import VerificationGate from './components/VerificationGate';
import AntiCatfishModal from './components/AntiCatfishModal';
import AdminDashboard from './components/AdminDashboard';
import ProfileBadges from './components/ProfileBadges';
import FloatingStatusToggles from './components/FloatingStatusToggles';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallButton';
import { getSlydShieldCooldown, getDailyVerificationStatus } from './src/lib/anti-catfish';
import {
  SESSION_HEARTBEAT_INTERVAL_MS,
  hasActiveSession,
  getUserPresenceInfo,
  withComputedPresence,
  buildActiveSessionPayload,
  buildOfflineSessionPayload,
  formatRelativeLastSeen
} from './src/lib/presence';
import { getNumericDistanceMiles } from './src/lib/distance';
import { auth, db, isQuotaExhausted, isFirestoreQuotaError, markQuotaExhausted } from './src/lib/firebase';
import { 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  where,
  orderBy,
  limit,
  setDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  getDoc,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './src/lib/firestore-helpers';

type AppState = 'splash' | 'landing' | 'verification' | 'onboarding' | 'profile-error' | 'main';

function saveCachedProfile(profile: UserProfile) {
  try {
    const serialized = JSON.stringify(profile);
    localStorage.setItem(`slyd_profile_${profile.id}`, serialized);
    localStorage.setItem('slyd_cached_profile', serialized);
  } catch {}
}

function getCachedOrFallbackProfile(uid: string, email?: string | null, displayName?: string | null): UserProfile | null {
  try {
    const rawSpecific = localStorage.getItem(`slyd_profile_${uid}`);
    if (rawSpecific) {
      const parsed = JSON.parse(rawSpecific) as UserProfile;
      if (parsed && parsed.name) {
        return { ...parsed, id: uid };
      }
    }
    const rawGeneral = localStorage.getItem('slyd_cached_profile');
    if (rawGeneral) {
      const parsed = JSON.parse(rawGeneral) as UserProfile;
      if (parsed && parsed.name && (!parsed.id || parsed.id === uid || parsed.email === email)) {
        return { ...parsed, id: uid };
      }
    }
  } catch {}

  const adminFlag = isAdminUser(null, email);
  const now = Date.now();
  const defaultName = displayName || (email ? email.split('@')[0] : 'Member');
  return {
    id: uid,
    name: defaultName.charAt(0).toUpperCase() + defaultName.slice(1),
    email: email || '',
    age: 26,
    distance: '150 ft',
    status: 'online',
    isSignedIn: true,
    lastActiveAt: now,
    sessionExpiresAt: now + 5 * 60 * 1000,
    imageUrl: `/logo.png`,
    isVerified: adminFlag,
    isPremium: false,
    isAdmin: adminFlag,
    isSelfieExempt: adminFlag,
    bio: 'Exploring Slyd.',
    height: "5'10\"",
    weight: '170lbs',
    role: 'Vers',
    race: 'Mixed',
    interests: ['Fitness', 'Travel', 'Music'],
    relationshipStatus: 'Single',
    lookingFor: ['Friends', 'Dates', 'Chat'],
    hostTravel: 'Both',
    tribes: ['Clean-Cut'],
    lastSeen: 'Online now',
    coordinates: { lat: 34.0522, lng: -118.2437 }
  };
}

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('splash');
  const [activeView, setActiveView] = useState<AppView>('grid');
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [currentChat, setCurrentChat] = useState<UserProfile | null>(null);
  const [chats, setChats] = useState<Record<string, Message[]>>({});
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showAntiCatfishModal, setShowAntiCatfishModal] = useState(false);
  const [showNotificationPulse, setShowNotificationPulse] = useState(false);
  const [hasSelectedSessionAvailability, setHasSelectedSessionAvailability] = useState(false);
  const [sessionAvailabilityMode, setSessionAvailabilityMode] = useState<'right_now' | 'later' | null>(null);
  const [matchNotification, setMatchNotification] = useState<UserProfile | null>(null);
  const [interestToastMessage, setInterestToastMessage] = useState<string | null>(null);
  
  const [premiumFeature, setPremiumFeature] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profileLoadError, setProfileLoadError] = useState('');

  const [filters, setFilters] = useState<Filters>({
    minAge: 18,
    maxAge: 99,
    roles: [],
    relationshipStatuses: [],
    lookingFor: [],
    hostTravel: [],
    races: [],
    interests: [],
    heightRange: [48, 96],
    sortBy: 'distance'
  });

  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [requireSubscriptionForPlus, setRequireSubscriptionForPlus] = useState<boolean>(true);

  // Sync global system settings (including whether Slyd+ requires subscription)
  useEffect(() => {
    if (!currentUser || isQuotaExhausted()) return;
    const unsub = onSnapshot(doc(db, 'system', 'settings'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as SystemSetting;
        setRequireSubscriptionForPlus(data.requireSubscriptionForPlus !== false);
      }
    }, () => {});
    return () => unsub();
  }, [currentUser]);

  // Keep isPremium and Pro-only filters/entitlements strictly synchronized in real time with myProfile
  useEffect(() => {
    if (!myProfile) {
      setIsPremium(false);
      return;
    }
    const activePremium = hasActivePremiumSubscription(myProfile, requireSubscriptionForPlus);
    setIsPremium(activePremium);

    // If premium subscription is turned OFF (e.g., from Admin Panel), reset active Pro-only filters immediately
    if (!activePremium) {
      setFilters(prev => {
        const hasProFilters =
          Boolean(prev.onlineOnly) ||
          Boolean(prev.verifiedOnly) ||
          Boolean(prev.hasPhotosOnly) ||
          prev.roles.length > 0 ||
          prev.relationshipStatuses.length > 0 ||
          prev.hostTravel.length > 0 ||
          prev.heightRange[0] !== 48 ||
          prev.heightRange[1] !== 96;
        if (!hasProFilters) return prev;
        return {
          ...prev,
          onlineOnly: false,
          verifiedOnly: false,
          hasPhotosOnly: false,
          roles: [],
          relationshipStatuses: [],
          hostTravel: [],
          heightRange: [48, 96]
        };
      });
    }
  }, [
    myProfile?.isPremium,
    myProfile?.premiumPlan,
    myProfile?.paymentMethod,
    myProfile?.premiumSince,
    myProfile?.premiumExpiresAt,
    requireSubscriptionForPlus
  ]);

  const handleAdminUserUpdated = useCallback((userId: string, updates: Partial<UserProfile>) => {
    setAllProfiles(prev => prev.map(p => p.id === userId ? { ...p, ...updates } : p));
    setSelectedProfile(prev => (prev && prev.id === userId) ? { ...prev, ...updates } : prev);
    setCurrentChat(prev => (prev && prev.id === userId) ? { ...prev, ...updates } : prev);
    if (currentUser?.uid === userId || myProfile?.id === userId) {
      setMyProfile(prev => {
        if (!prev) return prev;
        const next = { ...prev, ...updates };
        saveCachedProfile(next);
        setIsPremium(hasActivePremiumSubscription(next, requireSubscriptionForPlus));
        return next;
      });
    }
  }, [currentUser?.uid, myProfile?.id, requireSubscriptionForPlus]);

  // Verify returning Stripe Hosted Checkout redirect (?stripe_success=1&session_id=...)
  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe_success') === '1') {
      const sessionId = params.get('session_id') || '';
      const plan = params.get('plan') || 'monthly';
      // Clean URL query params
      window.history.replaceState({}, '', window.location.pathname);
      fetch(`/api/billing/verify-session?session_id=${encodeURIComponent(sessionId)}&plan=${encodeURIComponent(plan)}`)
        .then(r => r.json())
        .then(async (data) => {
          if (data?.verified) {
            const upgradeFields: Partial<UserProfile> = {
              isPremium: true,
              premiumPlan: data.planId || 'monthly',
              premiumSince: data.premiumSince || Date.now(),
              premiumExpiresAt: data.premiumExpiresAt || (Date.now() + 30 * 86400000),
              paymentMethod: 'stripe_link',
              lastPaymentId: data.transactionId
            };
            setIsPremium(true);
            setMyProfile(prev => {
              if (!prev) return null;
              const next = { ...prev, ...upgradeFields };
              saveCachedProfile(next);
              return next;
            });
            if (!isQuotaExhausted()) {
              updateDoc(doc(db, 'users', currentUser.uid), upgradeFields).catch(() => {});
            }
          }
        })
        .catch(() => {});
    }
  }, [currentUser]);
  const [presenceNow, setPresenceNow] = useState<number>(() => Date.now());
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('slyd_blocked_users');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  // Periodic tick to re-evaluate session expiration across all profiles
  useEffect(() => {
    const timer = setInterval(() => {
      setPresenceNow(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Firebase Auth Listener
  useEffect(() => {
    let active = true;
    let authRequest = 0;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const requestId = ++authRequest;
      const isCurrentRequest = () => active && requestId === authRequest;
      setCurrentUser(user);
      if (user) {
        if (!user.emailVerified) {
          setAppState('verification');
        } else {
          setProfileLoadError('');
          const activePayload = buildActiveSessionPayload(
            typeof document !== 'undefined' && document.visibilityState === 'hidden' ? 'away' : 'online'
          );

          if (isQuotaExhausted()) {
            const fallback = getCachedOrFallbackProfile(user.uid, user.email, user.displayName);
            if (fallback) {
              const merged = { ...fallback, ...activePayload };
              setMyProfile(merged);
              setIsPremium(hasActivePremiumSubscription(merged, requireSubscriptionForPlus));
              saveCachedProfile(merged);
              setAppState('main');
              return;
            }
          }

          try {
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);
            if (!isCurrentRequest()) return;
            if (docSnap.exists()) {
              const data = {
                ...(docSnap.data() as UserProfile),
                id: docSnap.id,
                ...activePayload
              };
              setMyProfile(data);
              setIsPremium(hasActivePremiumSubscription(data, requireSubscriptionForPlus));
              saveCachedProfile(data);
              if (!isQuotaExhausted()) {
                updateDoc(docRef, activePayload).catch(err => markQuotaExhausted(err));
              }
              setAppState('main');
            } else {
              setMyProfile(null);
              setAppState('onboarding');
            }
          } catch (err: any) {
            markQuotaExhausted(err);
            if (!isCurrentRequest()) return;
            const fallback = getCachedOrFallbackProfile(user.uid, user.email, user.displayName);
            if (fallback) {
              const merged = { ...fallback, ...activePayload };
              setMyProfile(merged);
              setIsPremium(hasActivePremiumSubscription(merged, requireSubscriptionForPlus));
              saveCachedProfile(merged);
              setAppState('main');
            } else {
              setProfileLoadError('Your account is signed in, but Slyd could not load its profile from Firebase.');
              setAppState('profile-error');
            }
          }
        }
      } else {
        setMyProfile(null);
        setHasSelectedSessionAvailability(false);
        setSessionAvailabilityMode(null);
        setAppState(previous => previous === 'splash' ? 'splash' : 'landing');
      }
    });
    return () => { active = false; authRequest++; unsubscribe(); };
  }, []);

  // Admin status check
  const isAdmin = useMemo(() => {
    return isAdminUser(myProfile, currentUser?.email);
  }, [currentUser, myProfile]);

  const isAccountDisabled = Boolean(myProfile?.isDisabled);

  const lastHeartbeatWriteRef = useRef<number>(0);

  // Active Session Heartbeat & Tab/Network Lifecycle Tracking
  useEffect(() => {
    if (!currentUser || appState !== 'main' || isAccountDisabled) return;

    const userDocRef = doc(db, 'users', currentUser.uid);

    const syncActivePresence = (statusOverride?: 'online' | 'away', force = false) => {
      const nextStatus = statusOverride || (typeof document !== 'undefined' && document.visibilityState === 'hidden' ? 'away' : 'online');
      const payload = buildActiveSessionPayload(nextStatus);
      setMyProfile(prev => {
        if (!prev) return prev;
        const updated = { ...prev, ...payload };
        saveCachedProfile(updated);
        return updated;
      });

      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      if (isQuotaExhausted()) return;

      const now = Date.now();
      if (!force && now - lastHeartbeatWriteRef.current < 60000) return;
      lastHeartbeatWriteRef.current = now;

      updateDoc(userDocRef, payload).catch(err => markQuotaExhausted(err));
    };

    const syncOfflinePresence = () => {
      const payload = buildOfflineSessionPayload();
      if (isQuotaExhausted()) return;
      updateDoc(userDocRef, payload).catch(err => markQuotaExhausted(err));
    };

    // Periodic heartbeat while session is active
    const heartbeatInterval = setInterval(() => {
      syncActivePresence();
    }, SESSION_HEARTBEAT_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncActivePresence('online', true);
      } else {
        syncActivePresence('away', true);
      }
    };

    const handleOnline = () => syncActivePresence('online', true);
    const handleOffline = () => syncOfflinePresence();
    const handlePageHide = () => syncOfflinePresence();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
    };
  }, [currentUser, appState, isAccountDisabled]);

  // Sync My Profile & Admin Auto-promotion
  useEffect(() => {
    if (!currentUser || isQuotaExhausted()) return;
    const unsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), async (docSnap) => {
      if (docSnap.exists()) {
        const rawData = { ...docSnap.data() as UserProfile, id: docSnap.id };
        const data = withComputedPresence(rawData, currentUser.uid, Date.now());
        setMyProfile(data);
        setIsPremium(hasActivePremiumSubscription(data, requireSubscriptionForPlus));
        saveCachedProfile(data);
        if (data.blockedUsers && Array.isArray(data.blockedUsers)) {
          setBlockedUserIds(prev => Array.from(new Set([...prev, ...data.blockedUsers!])));
        }

        // Auto-promote hardcoded admin in database if not yet flagged
        if (!isQuotaExhausted() && currentUser.email === 'danguero21@gmail.com' && (!data.isAdmin || !data.isSelfieExempt)) {
          try {
            await updateDoc(doc(db, 'users', currentUser.uid), {
              isAdmin: true,
              isSelfieExempt: true,
              email: 'danguero21@gmail.com'
            });
          } catch (err) {
            markQuotaExhausted(err);
          }
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Sync All Profiles (filter out disabled or hidden accounts, and compute presence client-side)
  useEffect(() => {
    if (appState !== 'main' || !currentUser || isQuotaExhausted()) return;
    
    const profilesQuery = query(
      collection(db, 'users'),
      limit(600)
    );

    const unsubscribe = onSnapshot(profilesQuery, (snapshot) => {
      const now = Date.now();
      const allDocs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as UserProfile));
      const FAKE_IDS = new Set(['1', '2', '3', '4', '5']);

      const docs = allDocs
        .filter(p => 
          !FAKE_IDS.has(p.id) && 
          !(p.imageUrl && p.imageUrl.includes('picsum.photos')) &&
          p.id !== currentUser.uid && 
          !p.isDisabled && 
          !p.hiddenFromGrid
        )
        .map(p => withComputedPresence(p, currentUser.uid, now, location || myProfile?.coordinates));
      setAllProfiles(docs);
    }, (error) => {
      markQuotaExhausted(error);
    });

    return () => unsubscribe();
  }, [appState, currentUser]);

  // Sync Chats
  useEffect(() => {
    if (!currentUser || appState !== 'main') return;

    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      snapshot.docs.forEach(chatDoc => {
        const chatId = chatDoc.id;
        const otherUserId = chatDoc.data().participants.find((p: string) => p !== currentUser.uid);
        
        onSnapshot(query(
          collection(db, `chats/${chatId}/messages`),
          orderBy('timestamp', 'asc')
        ), (msgSnapshot) => {
          const messages = msgSnapshot.docs.map(m => {
            const data = m.data();
            return {
              ...data,
              id: m.id,
              timestamp: data.timestamp?.toDate() || new Date()
            } as Message;
          });
          
          setChats(prev => ({
            ...prev,
            [otherUserId]: messages
          }));

          // Notify for new unread messages
          const lastMsg = messages[messages.length - 1];
          if (lastMsg && !lastMsg.isRead && lastMsg.senderId !== currentUser.uid) {
            setShowNotificationPulse(true);
            setTimeout(() => setShowNotificationPulse(false), 2000);
          }
        });
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });

    return () => unsubscribe();
  }, [currentUser, appState]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      });
    }
  }, []);

  const liveProfiles = useMemo(() => {
    const userCoords = location || myProfile?.coordinates;
    return allProfiles.map(p => withComputedPresence(p, currentUser?.uid, presenceNow, userCoords));
  }, [allProfiles, currentUser?.uid, presenceNow, location, myProfile?.coordinates]);

  const filteredProfiles = useMemo(() => {
    const showOfflinePref = myProfile?.preferences?.showOffline !== false;

    let result = liveProfiles.filter(profile => {
      if (blockedUserIds.includes(profile.id)) return false;
      if (profile.isIncognito) return false;
      if (!showOfflinePref && profile.status === 'offline') return false;
      if (filters.onlineOnly && profile.status !== 'online') return false;
      if (filters.verifiedOnly && !profile.isVerified) return false;
      if (filters.hasPhotosOnly && !profile.imageUrl) return false;
      const ageMatch = profile.age >= filters.minAge && profile.age <= filters.maxAge;
      const roleMatch = filters.roles.length === 0 || (profile.role && filters.roles.includes(profile.role));
      const statusMatch = filters.relationshipStatuses.length === 0 || (profile.relationshipStatus && filters.relationshipStatuses.includes(profile.relationshipStatus));
      const lookMatch = filters.lookingFor.length === 0 || profile.lookingFor.some(l => filters.lookingFor.includes(l));
      const hostMatch = filters.hostTravel.length === 0 || (profile.hostTravel && filters.hostTravel.includes(profile.hostTravel));
      const raceMatch = filters.races.length === 0 || (profile.race && filters.races.includes(profile.race));
      const interestMatch = filters.interests.length === 0 || (profile.interests && profile.interests.some(i => filters.interests.includes(i)));
      
      const parseHeight = (h?: string) => {
        if (!h) return 0;
        const match = h.match(/(\d+)'(\d+)/);
        if (!match) return 0;
        return parseInt(match[1]) * 12 + parseInt(match[2]);
      };
      
      const hInches = parseHeight(profile.height);
      const heightMatch = hInches >= filters.heightRange[0] && hInches <= filters.heightRange[1];

      return ageMatch && roleMatch && statusMatch && lookMatch && hostMatch && raceMatch && interestMatch && heightMatch;
    });

    if (filters.sortBy === 'distance') {
      const userCoords = location || myProfile?.coordinates;
      result.sort((a, b) => {
        const distA = getNumericDistanceMiles(a, userCoords);
        const distB = getNumericDistanceMiles(b, userCoords);
        return distA - distB;
      });
    } else if (filters.sortBy === 'age') {
      result.sort((a, b) => a.age - b.age);
    } else if (filters.sortBy === 'newest') {
      result.sort((a, b) => b.id.localeCompare(a.id));
    } else if (filters.sortBy === 'lastSeen') {
      result.sort((a, b) => {
        const aOnline = a.status === 'online' ? 0 : a.status === 'away' ? 1 : 2;
        const bOnline = b.status === 'online' ? 0 : b.status === 'away' ? 1 : 2;
        if (aOnline !== bOnline) return aOnline - bOnline;
        return (b.lastActiveAt || 0) - (a.lastActiveAt || 0);
      });
    } else if (filters.sortBy === 'race') {
      result.sort((a, b) => {
        const raceA = (a.race || 'Other').toLowerCase();
        const raceB = (b.race || 'Other').toLowerCase();
        if (raceA !== raceB) return raceA.localeCompare(raceB);
        return a.name.localeCompare(b.name);
      });
    }

    return result;
  }, [liveProfiles, filters, blockedUserIds, myProfile?.preferences?.showOffline, location, myProfile?.coordinates]);

  const handleToggleIncognito = async () => {
    if (!isPremium) {
      setPremiumFeature('Incognito Mode');
      return;
    }
    if (!myProfile || !currentUser) return;
    const nextIncognito = !Boolean(myProfile.isIncognito);
    const updated: UserProfile = {
      ...myProfile,
      isIncognito: nextIncognito,
      hiddenFromGrid: nextIncognito
    };
    setMyProfile(updated);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        isIncognito: nextIncognito,
        hiddenFromGrid: nextIncognito
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const handleSaveAppPreferences = async (updates: Partial<UserProfile>) => {
    if (!myProfile || !currentUser) return;
    const nextProfile: UserProfile = {
      ...myProfile,
      ...updates,
      preferences: {
        ...(myProfile.preferences || {}),
        ...(updates.preferences || {})
      }
    };
    setMyProfile(nextProfile);
    try {
      localStorage.setItem(`slyd_profile_${currentUser.uid}`, JSON.stringify(nextProfile));
    } catch {}
    try {
      const cleanUpdates = JSON.parse(JSON.stringify(updates));
      await updateDoc(doc(db, 'users', currentUser.uid), cleanUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const isMutualMatchWith = useCallback((targetProfile?: UserProfile | null): boolean => {
    if (!targetProfile || !myProfile) return false;
    const myLikedIds = new Set([...(myProfile.likedUsers || []), ...(myProfile.superLikedUsers || [])]);
    const likedMeIds = new Set([...(myProfile.likedByUsers || []), ...(myProfile.superLikedByUsers || [])]);
    const iLikedThem = myLikedIds.has(targetProfile.id) || Boolean(targetProfile.likedByUsers?.includes(myProfile.id));
    const theyLikedMe = likedMeIds.has(targetProfile.id) || Boolean(targetProfile.likedUsers?.includes(myProfile.id));
    return iLikedThem && theyLikedMe;
  }, [myProfile]);

  const hasTheirInterestInMe = useCallback((targetProfile?: UserProfile | null): boolean => {
    if (!targetProfile || !myProfile) return false;
    const likedMeIds = new Set([...(myProfile.likedByUsers || []), ...(myProfile.superLikedByUsers || [])]);
    return likedMeIds.has(targetProfile.id) || Boolean(targetProfile.likedUsers?.includes(myProfile.id));
  }, [myProfile]);

  const getMyInterestState = useCallback((targetProfile?: UserProfile | null): 'interested' | 'not_interested' | null => {
    if (!targetProfile || !myProfile) return null;
    if (myProfile.likedUsers?.includes(targetProfile.id) || myProfile.superLikedUsers?.includes(targetProfile.id)) {
      return 'interested';
    }
    if (myProfile.notInterestedUsers?.includes(targetProfile.id)) {
      return 'not_interested';
    }
    return null;
  }, [myProfile]);

  const handleMarkInterest = async (targetProfile: UserProfile, status: 'interested' | 'not_interested') => {
    if (!currentUser || !myProfile) return;

    if (status === 'not_interested') {
      const nextLiked = (myProfile.likedUsers || []).filter(id => id !== targetProfile.id);
      const nextNotInterested = Array.from(new Set([...(myProfile.notInterestedUsers || []), targetProfile.id]));
      const updatedMyProfile: UserProfile = {
        ...myProfile,
        likedUsers: nextLiked,
        notInterestedUsers: nextNotInterested
      };
      setMyProfile(updatedMyProfile);
      saveCachedProfile(updatedMyProfile);
      setInterestToastMessage(`Marked Not Interested in ${targetProfile.name}.`);
      setTimeout(() => setInterestToastMessage(null), 3000);

      if (!isQuotaExhausted()) {
        updateDoc(doc(db, 'users', currentUser.uid), {
          likedUsers: nextLiked,
          notInterestedUsers: nextNotInterested
        }).catch(err => markQuotaExhausted(err));
      }
      return;
    }

    // status === 'interested'
    const nextLiked = Array.from(new Set([...(myProfile.likedUsers || []), targetProfile.id]));
    const nextNotInterested = (myProfile.notInterestedUsers || []).filter(id => id !== targetProfile.id);
    const alreadyInterestedInMe = hasTheirInterestInMe(targetProfile);

    const updatedMyProfile: UserProfile = {
      ...myProfile,
      likedUsers: nextLiked,
      notInterestedUsers: nextNotInterested
    };
    setMyProfile(updatedMyProfile);
    saveCachedProfile(updatedMyProfile);

    setAllProfiles(prev =>
      prev.map(p =>
        p.id === targetProfile.id
          ? { ...p, likedByUsers: Array.from(new Set([...(p.likedByUsers || []), currentUser.uid])) }
          : p
      )
    );

    if (alreadyInterestedInMe) {
      setMatchNotification(targetProfile);
    } else {
      setInterestToastMessage(`Sent interest notification to ${targetProfile.name}!`);
      setTimeout(() => setInterestToastMessage(null), 3000);
    }

    if (!isQuotaExhausted()) {
      updateDoc(doc(db, 'users', currentUser.uid), {
        likedUsers: arrayUnion(targetProfile.id),
        notInterestedUsers: nextNotInterested
      }).catch(err => markQuotaExhausted(err));

      updateDoc(doc(db, 'users', targetProfile.id), {
        likedByUsers: arrayUnion(currentUser.uid)
      }).catch(() => {});
    }
  };

  const handleSelectAvailabilityMode = async (mode: 'right_now' | 'later') => {
    setSessionAvailabilityMode(mode);
    setHasSelectedSessionAvailability(true);
    const now = Date.now();

    if (myProfile) {
      const nextLookingFor = mode === 'right_now'
        ? Array.from(new Set(['Right Now', ...(myProfile.lookingFor || [])]))
        : (myProfile.lookingFor || []);
      const updated: UserProfile = {
        ...myProfile,
        availabilityMode: mode,
        availabilityUpdatedAt: now,
        lookingFor: nextLookingFor
      };
      setMyProfile(updated);
      saveCachedProfile(updated);

      if (currentUser && !isQuotaExhausted()) {
        updateDoc(doc(db, 'users', currentUser.uid), {
          availabilityMode: mode,
          availabilityUpdatedAt: now,
          lookingFor: nextLookingFor
        }).catch(err => markQuotaExhausted(err));
      }
    }

    if (mode === 'right_now') {
      setActiveView('map');
    } else {
      setActiveView('grid');
    }
  };

  const handleToggleHosting = async () => {
    if (!myProfile) return;
    const currentHosting = Boolean(myProfile.sessionState?.isHosting || myProfile.hostTravel === 'Host' || myProfile.hostTravel === 'Both');
    const currentTraveling = Boolean(myProfile.sessionState?.isTraveling || myProfile.hostTravel === 'Travel' || myProfile.hostTravel === 'Both');
    const nextHosting = !currentHosting;
    const nextHostTravel = nextHosting && currentTraveling ? 'Both' : nextHosting ? 'Host' : currentTraveling ? 'Travel' : 'Ask';
    
    const updated: UserProfile = {
      ...myProfile,
      hostTravel: nextHostTravel,
      sessionState: {
        intent: sessionAvailabilityMode === 'later' ? 'LATER' : 'NOW',
        isHosting: nextHosting,
        isTraveling: currentTraveling,
        lastActiveTimestamp: Date.now()
      }
    };
    setMyProfile(updated);
    saveCachedProfile(updated);

    if (currentUser && !isQuotaExhausted()) {
      updateDoc(doc(db, 'users', currentUser.uid), {
        hostTravel: nextHostTravel,
        'sessionState.isHosting': nextHosting,
        'sessionState.isTraveling': currentTraveling,
        'sessionState.lastActiveTimestamp': Date.now()
      }).catch(err => markQuotaExhausted(err));
    }
  };

  const handleToggleTraveling = async () => {
    if (!myProfile) return;
    const currentHosting = Boolean(myProfile.sessionState?.isHosting || myProfile.hostTravel === 'Host' || myProfile.hostTravel === 'Both');
    const currentTraveling = Boolean(myProfile.sessionState?.isTraveling || myProfile.hostTravel === 'Travel' || myProfile.hostTravel === 'Both');
    const nextTraveling = !currentTraveling;
    const nextHostTravel = currentHosting && nextTraveling ? 'Both' : currentHosting ? 'Host' : nextTraveling ? 'Travel' : 'Ask';
    
    const updated: UserProfile = {
      ...myProfile,
      hostTravel: nextHostTravel,
      sessionState: {
        intent: sessionAvailabilityMode === 'later' ? 'LATER' : 'NOW',
        isHosting: currentHosting,
        isTraveling: nextTraveling,
        lastActiveTimestamp: Date.now()
      }
    };
    setMyProfile(updated);
    saveCachedProfile(updated);

    if (currentUser && !isQuotaExhausted()) {
      updateDoc(doc(db, 'users', currentUser.uid), {
        hostTravel: nextHostTravel,
        'sessionState.isHosting': currentHosting,
        'sessionState.isTraveling': nextTraveling,
        'sessionState.lastActiveTimestamp': Date.now()
      }).catch(err => markQuotaExhausted(err));
    }
  };

  const handleSuperLike = async (targetProfile: UserProfile) => {
    if (!isPremium) {
      setPremiumFeature('Super Likes');
      return;
    }
    if (!currentUser || !myProfile) return;
    const nextSuperLiked = Array.from(new Set([...(myProfile.superLikedUsers || []), targetProfile.id]));
    const nextLiked = Array.from(new Set([...(myProfile.likedUsers || []), targetProfile.id]));
    setMyProfile(prev => prev ? { ...prev, superLikedUsers: nextSuperLiked, likedUsers: nextLiked } : null);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        superLikedUsers: arrayUnion(targetProfile.id),
        likedUsers: arrayUnion(targetProfile.id)
      });
      await updateDoc(doc(db, 'users', targetProfile.id), {
        superLikedByUsers: arrayUnion(currentUser.uid),
        likedByUsers: arrayUnion(currentUser.uid)
      }).catch(() => {});
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const unblockedProfiles = useMemo(() => {
    return liveProfiles.filter(p => !blockedUserIds.includes(p.id));
  }, [liveProfiles, blockedUserIds]);

  const activeSelectedProfile = useMemo(() => {
    if (!selectedProfile) return null;
    if (myProfile && selectedProfile.id === myProfile.id) {
      return withComputedPresence(myProfile, currentUser?.uid, presenceNow);
    }
    const found = liveProfiles.find(p => p.id === selectedProfile.id);
    return found || withComputedPresence(selectedProfile, currentUser?.uid, presenceNow);
  }, [selectedProfile, myProfile, liveProfiles, currentUser?.uid, presenceNow]);

  const activeChatProfile = useMemo(() => {
    if (!currentChat) return null;
    const found = liveProfiles.find(p => p.id === currentChat.id);
    return found || withComputedPresence(currentChat, currentUser?.uid, presenceNow);
  }, [currentChat, liveProfiles, currentUser?.uid, presenceNow]);

  const handleBlockUser = async (targetUser: UserProfile) => {
    setBlockedUserIds(prev => {
      const next = Array.from(new Set([...prev, targetUser.id]));
      try {
        localStorage.setItem('slyd_blocked_users', JSON.stringify(next));
      } catch {}
      return next;
    });

    if (currentUser) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          blockedUsers: arrayUnion(targetUser.id)
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
      }
    }

    if (selectedProfile?.id === targetUser.id) {
      setSelectedProfile(null);
    }
    if (currentChat?.id === targetUser.id) {
      setCurrentChat(null);
      setActiveView('inbox');
    }
  };

  const handleReportUser = async (
    targetUser: UserProfile, 
    reason: string, 
    details: string, 
    alsoBlock: boolean
  ) => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: currentUser.uid,
        reportedUserId: targetUser.id,
        reportedUserName: targetUser.name,
        reason,
        details: details || '',
        alsoBlocked: Boolean(alsoBlock),
        createdAt: Date.now(),
        status: 'pending'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reports');
    }

    if (alsoBlock) {
      await handleBlockUser(targetUser);
    }
  };

  const unreadCount = useMemo(() => {
    if (!currentUser) return 0;
    return Object.values(chats).reduce((count, messages) => {
      return count + messages.filter(m => !m.isRead && m.senderId !== currentUser.uid).length;
    }, 0);
  }, [chats, currentUser]);

  const handleProfileSelect = (profile: UserProfile) => {
    setSelectedProfile(profile);
    if (currentUser && profile.id !== currentUser.uid && !myProfile?.isIncognito) {
      updateDoc(doc(db, 'users', profile.id), {
        viewedByUsers: arrayUnion(currentUser.uid)
      }).catch(() => {});
      updateDoc(doc(db, 'users', currentUser.uid), {
        viewedUsers: arrayUnion(profile.id)
      }).catch(() => {});
    }
  };

  const handleToggleFavorite = async (targetProfile: UserProfile) => {
    if (!currentUser || !myProfile) return;
    const currentFavs = myProfile.favoriteUsers || [];
    const exists = currentFavs.includes(targetProfile.id);
    if (!exists && !isPremium && currentFavs.length >= 5) {
      setPremiumFeature('Unlimited Favorites');
      return;
    }
    const nextFavs = exists
      ? currentFavs.filter(id => id !== targetProfile.id)
      : [...currentFavs, targetProfile.id];
    setMyProfile(prev => prev ? { ...prev, favoriteUsers: nextFavs } : null);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        favoriteUsers: nextFavs
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const handleSaveProfileNote = async (targetProfileId: string, note: string) => {
    if (!isPremium) {
      setPremiumFeature('Private Profile Notes');
      return;
    }
    if (!currentUser || !myProfile) return;
    const nextNotes = { ...(myProfile.profileNotes || {}) };
    if (note) {
      nextNotes[targetProfileId] = note;
    } else {
      delete nextNotes[targetProfileId];
    }
    setMyProfile(prev => prev ? { ...prev, profileNotes: nextNotes } : null);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        profileNotes: nextNotes
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const handleSavePhrases = async (phrases: string[]) => {
    if (!isPremium) {
      setPremiumFeature('Saved Quick Phrases');
      return;
    }
    if (!currentUser || !myProfile) return;
    setMyProfile(prev => prev ? { ...prev, savedPhrases: phrases } : null);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        savedPhrases: phrases
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const handleSetTeleportLocation = async (loc: { name: string; lat: number; lng: number } | null) => {
    if (loc && !isPremium) {
      setPremiumFeature('Global Roam / Teleport');
      return;
    }
    if (!currentUser || !myProfile) return;
    setMyProfile(prev => prev ? { ...prev, teleportLocation: loc } : null);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        teleportLocation: loc
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const handleStartChat = async (profile: UserProfile) => {
    if (!currentUser) return;

    // Free version requires mutual interest before messaging unlocks; paid version can message anyone directly
    if (!isPremium && !isMutualMatchWith(profile)) {
      setSelectedProfile(profile);
      setInterestToastMessage(`Free accounts require mutual interest with ${profile.name} to message, or upgrade to Slyd+ to message anyone directly.`);
      setTimeout(() => setInterestToastMessage(null), 4000);
      return;
    }
    
    try {
      const chatId = [currentUser.uid, profile.id].sort().join('_');
      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);
      
      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          participants: [currentUser.uid, profile.id],
          lastMessageAt: Date.now()
        });
      }

      setCurrentChat(profile);
      setSelectedProfile(null);
      setActiveView('chat');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats`);
    }
  };

  const handleSendMessage = async (
    text: string, 
    imageUrl?: string, 
    isExpiringPhoto?: boolean,
    location?: { lat: number; lng: number; address?: string; sharedAt: number }
  ) => {
    if (!currentChat || !currentUser) return;
    
    const chatId = [currentUser.uid, currentChat.id].sort().join('_');
    const messagesRef = collection(db, `chats/${chatId}/messages`);
    
    try {
      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        receiverId: currentChat.id,
        text: text || (location ? '📍 Shared meetup location' : (isExpiringPhoto ? 'Sent an expiring photo' : '')),
        imageUrl: imageUrl || null,
        isExpiringPhoto: Boolean(isExpiringPhoto),
        location: location || null,
        viewedByReceiver: false,
        timestamp: serverTimestamp(),
        isRead: false
      });
      
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: location ? '📍 Meetup Location' : (isExpiringPhoto ? '⏱️ Expiring photo' : (imageUrl ? 'Sent a photo' : text)),
        lastMessageAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}/messages`);
    }
  };

  const handleUnsendMessage = async (messageId: string) => {
    if (!isPremium) {
      setPremiumFeature('Message Unsend');
      return;
    }
    if (!currentChat || !currentUser) return;
    const chatId = [currentUser.uid, currentChat.id].sort().join('_');
    try {
      await deleteDoc(doc(db, `chats/${chatId}/messages`, messageId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `chats/${chatId}/messages/${messageId}`);
    }
  };

  const handleAuthComplete = () => setAppState('verification');
  const handleVerificationComplete = async () => {
    const user = auth.currentUser;
    if (user?.emailVerified) {
      const activePayload = buildActiveSessionPayload('online');
      if (isQuotaExhausted()) {
        const fallback = getCachedOrFallbackProfile(user.uid, user.email, user.displayName);
        if (fallback) {
          const merged = { ...fallback, ...activePayload };
          setMyProfile(merged);
          setIsPremium(hasActivePremiumSubscription(merged, requireSubscriptionForPlus));
          saveCachedProfile(merged);
          setAppState('main');
          return;
        }
      }
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { ...docSnap.data() as UserProfile, id: docSnap.id, ...activePayload };
          setMyProfile(data);
          setIsPremium(hasActivePremiumSubscription(data, requireSubscriptionForPlus));
          saveCachedProfile(data);
          if (!isQuotaExhausted()) {
            updateDoc(docRef, activePayload).catch(err => markQuotaExhausted(err));
          }
          setAppState('main');
          return;
        }
      } catch (err) {
        markQuotaExhausted(err);
        const fallback = getCachedOrFallbackProfile(user.uid, user.email, user.displayName);
        if (fallback) {
          const merged = { ...fallback, ...activePayload };
          setMyProfile(merged);
          setIsPremium(hasActivePremiumSubscription(merged, requireSubscriptionForPlus));
          saveCachedProfile(merged);
          setAppState('main');
          return;
        }
      }
      setMyProfile(null);
      setAppState('onboarding');
      return;
    }
    setAppState(user ? 'verification' : 'landing');
  };
  
  const handleOnboardingComplete = async (profileData: UserProfile) => {
    if (!currentUser) return;
    const userIsAdmin = isAdminUser(profileData, currentUser.email);
    const activePayload = buildActiveSessionPayload('online');
    const finalProfile: UserProfile = {
      ...profileData, 
      id: currentUser.uid,
      email: currentUser.email || profileData.email || '',
      isPremium: false,
      isAdmin: userIsAdmin ? true : Boolean(profileData.isAdmin),
      isSelfieExempt: userIsAdmin ? true : false,
      isVerified: userIsAdmin ? Boolean(profileData.isVerified) : false,
      ...activePayload
    };
    setMyProfile(finalProfile);
    setIsPremium(hasActivePremiumSubscription(finalProfile, requireSubscriptionForPlus));
    saveCachedProfile(finalProfile);
    setAppState('main');

    if (!isQuotaExhausted()) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), finalProfile);
      } catch (error) {
        markQuotaExhausted(error);
      }
    }
  };

  const handleLogout = async () => {
    const uid = currentUser?.uid || auth.currentUser?.uid;

    // Clear local cached session state immediately so the user is logged out right away
    try {
      localStorage.removeItem('slyd_cached_profile');
      if (uid) {
        localStorage.removeItem(`slyd_profile_${uid}`);
      }
    } catch {}

    setCurrentUser(null);
    setMyProfile(null);
    setHasSelectedSessionAvailability(false);
    setSessionAvailabilityMode(null);
    setSelectedProfile(null);
    setCurrentChat(null);
    setIsEditingProfile(false);
    setIsPreferencesOpen(false);
    setIsFilterOpen(false);
    setPremiumFeature(null);
    setActiveView('grid');
    setAppState('landing');

    // Fire-and-forget offline presence update with a short timeout so it never blocks logout
    if (uid && !isQuotaExhausted()) {
      Promise.race([
        updateDoc(doc(db, 'users', uid), buildOfflineSessionPayload()),
        new Promise((resolve) => setTimeout(resolve, 1200))
      ]).catch(err => markQuotaExhausted(err));
    }

    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  const handleSaveProfile = async (updated: UserProfile) => {
    try {
      // Anti-catfish safety rule: Changing profile photo resets verified status (exempt for admin)
      const userIsAdmin = isAdminUser(myProfile, currentUser?.email);
      const photoChanged = myProfile && updated.imageUrl !== myProfile.imageUrl;
      
      const rawPhotos = updated.photos && updated.photos.length > 0
        ? updated.photos
        : [{
            id: 'photo_primary',
            url: updated.imageUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=FreshUser',
            isPrivate: false,
            createdAt: Date.now(),
            caption: 'Main Profile Photo'
          }];

      const sanitizedPhotos = rawPhotos.map((p, idx) => ({
        id: p.id || `photo_${Date.now()}_${idx}`,
        url: p.url,
        isPrivate: Boolean(p.isPrivate),
        createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
        caption: p.caption || (p.isPrivate ? 'Private Photo' : 'Public Photo')
      }));

      const finalMainUrl = updated.imageUrl || 
        (sanitizedPhotos.find(p => !p.isPrivate)?.url || sanitizedPhotos[0]?.url || '');

      const activePayload = currentUser ? buildActiveSessionPayload('online') : buildOfflineSessionPayload();

      const finalProfile: UserProfile = {
        ...updated,
        id: currentUser ? currentUser.uid : (updated.id || 'me'),
        name: updated.name || 'Member',
        age: typeof updated.age === 'number' ? updated.age : (parseInt(String(updated.age), 10) || 18),
        photos: sanitizedPhotos,
        imageUrl: finalMainUrl,
        referenceSelfieUrl: updated.referenceSelfieUrl || myProfile?.referenceSelfieUrl || '',
        isAdmin: userIsAdmin ? true : Boolean(updated.isAdmin ?? myProfile?.isAdmin),
        isSelfieExempt: userIsAdmin ? true : Boolean(updated.isSelfieExempt ?? myProfile?.isSelfieExempt),
        isVerified: photoChanged 
          ? (userIsAdmin ? Boolean(updated.isVerified ?? myProfile?.isVerified) : false) 
          : Boolean(updated.isVerified ?? myProfile?.isVerified),
        ...activePayload
      };

      const sanitizedData = JSON.parse(JSON.stringify(finalProfile));

      setMyProfile(finalProfile);
      saveCachedProfile(finalProfile);

      if (currentUser && !isQuotaExhausted()) {
        try {
          await setDoc(doc(db, 'users', currentUser.uid), sanitizedData, { merge: true });
        } catch (err) {
          markQuotaExhausted(err);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, currentUser ? `users/${currentUser.uid}` : 'users');
    }
  };

  const handleAntiCatfishSuccess = async (updated: UserProfile) => {
    setMyProfile(updated);
    try {
      localStorage.setItem('slyd_cached_profile', JSON.stringify(updated));
    } catch {}
    if (currentUser) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          isVerified: true,
          lastVerifiedAt: updated.lastVerifiedAt || Date.now(),
          lastSelfieAttemptAt: updated.lastSelfieAttemptAt || Date.now(),
          referenceSelfieUrl: updated.referenceSelfieUrl || myProfile?.referenceSelfieUrl || ''
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
      }
    }
  };

  const handleAntiCatfishAttemptLogged = async (attemptTimestamp: number) => {
    setMyProfile(prev => prev ? { ...prev, lastSelfieAttemptAt: attemptTimestamp } : null);
    if (currentUser) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          lastSelfieAttemptAt: attemptTimestamp
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
      }
    }
  };

  const needsDailyVerification = false;

  if (appState === 'splash') {
    return <SplashScreen onComplete={() => setAppState('landing')} />;
  }

  const renderAppContent = () => {
    if (appState === 'main' && isAccountDisabled) {
      return (
        <div className="flex flex-col h-screen max-w-md mx-auto bg-black text-white p-6 items-center justify-center text-center">
          <div className="w-20 h-20 bg-red-500/10 border-2 border-red-500/30 rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            <Ban className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-black italic tracking-tighter uppercase font-display text-red-400 mb-2">
            Account Suspended
          </h2>
          <p className="text-slate-400 text-xs font-medium max-w-xs mb-6 leading-relaxed">
            Your account has been disabled by Slyd Administration.
          </p>
          <div className="p-4 bg-slate-950 border border-slate-900 rounded-2xl w-full text-left mb-6 space-y-2">
            <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Reason Provided:</div>
            <div className="text-xs font-semibold text-slate-200">
              {myProfile?.disabledReason || 'Violation of community guidelines and terms of service.'}
            </div>
            {myProfile?.disabledAt && (
              <div className="text-[10px] text-slate-500">
                Suspension Date: {new Date(myProfile.disabledAt).toLocaleString()}
              </div>
            )}
          </div>
          <div className="space-y-3 w-full">
            <a
              href="mailto:support@slyd.app"
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-xs font-bold uppercase tracking-wider text-slate-300 block transition-all text-center"
            >
              Appeal Suspension (Contact Support)
            </a>
            <button
              onClick={handleLogout}
              className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-red-950/40 active:scale-95 transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      );
    }

    if (needsDailyVerification) {
      return (
        <VerificationGate 
          user={myProfile} 
          isAdmin={isAdmin}
          onSkip={async () => {
            if (currentUser) {
              try {
                await updateDoc(doc(db, 'users', currentUser.uid), {
                  isSelfieExempt: true
                });
              } catch (error) {
                handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
              }
            }
            setMyProfile(prev => prev ? { ...prev, isSelfieExempt: true } : prev);
          }}
          onVerified={async (updatedUser) => {
            setMyProfile(updatedUser);
            try {
              localStorage.setItem('slyd_cached_profile', JSON.stringify(updatedUser));
            } catch {}
            if (currentUser) {
              try {
                const updatePayload: Record<string, any> = {
                  isVerified: true,
                  lastVerifiedAt: updatedUser.lastVerifiedAt || Date.now(),
                  lastSelfieAttemptAt: updatedUser.lastSelfieAttemptAt || Date.now(),
                };
                // Only write referenceSelfieUrl if the account established its first-time registration baseline
                if (!myProfile?.referenceSelfieUrl && updatedUser.referenceSelfieUrl) {
                  updatePayload.referenceSelfieUrl = updatedUser.referenceSelfieUrl;
                }
                await updateDoc(doc(db, 'users', currentUser.uid), updatePayload);
              } catch (error) {
                handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
              }
            }
          }} 
        />
      );
    }

    if (appState === 'landing' || appState === 'verification') {
      return (
        <AuthFlow 
          mode={appState === 'landing' ? 'landing' : 'verify'} 
          onAuthSuccess={handleAuthComplete}
          onVerifySuccess={handleVerificationComplete}
        />
      );
    }

    if (appState === 'profile-error') {
      return (
        <div className="flex min-h-[100dvh] max-w-md mx-auto bg-black text-white p-6 items-center justify-center text-center">
          <div className="w-full">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-300"><ShieldAlert className="w-8 h-8" /></div>
            <h1 className="text-xl font-black text-white mb-3">Couldn’t load your account</h1>
            <p className="text-sm leading-relaxed text-slate-400 mb-6">{profileLoadError}</p>
            <button
              type="button"
              className="w-full rounded-xl bg-sky-500 py-3 font-bold text-white"
              onClick={async () => {
                const signedInUser = auth.currentUser;
                if (!signedInUser?.emailVerified) { setAppState(signedInUser ? 'verification' : 'landing'); return; }
                const fallback = getCachedOrFallbackProfile(signedInUser.uid, signedInUser.email, signedInUser.displayName);
                if (fallback) {
                  setMyProfile(fallback);
                  setIsPremium(hasActivePremiumSubscription(fallback, requireSubscriptionForPlus));
                  saveCachedProfile(fallback);
                  setAppState('main');
                }
              }}
            >Continue to App</button>
            <button type="button" onClick={handleLogout} className="mt-3 w-full rounded-xl border border-slate-700 py-3 font-bold text-slate-300">Sign out</button>
          </div>
        </div>
      );
    }

    if (appState === 'onboarding') {
      return <Onboarding onComplete={handleOnboardingComplete} isAdmin={isAdmin} />;
    }

    // Non-bypassable screen pop right after login on every login session (SRS Phase 2)
    if (appState === 'main' && !hasSelectedSessionAvailability) {
      const readyNowCount = liveProfiles.filter(
        p => p.availabilityMode === 'right_now' || p.sessionState?.intent === 'NOW' || (Array.isArray(p.lookingFor) && p.lookingFor.includes('Right Now'))
      ).length;

      return (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-6 select-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="intent-gate-title"
        >
          <div className="w-full max-w-sm rounded-[2.5rem] bg-slate-950 border border-slate-800 p-7 shadow-[0_25px_70px_rgba(0,0,0,0.95)] space-y-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-sky-500/15 border border-sky-500/40 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-950/50">
              <Clock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">
                Mandatory Check-In
              </span>
              <h1 id="intent-gate-title" className="text-2xl font-black text-white font-display tracking-tight">
                What's your plan right now?
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                SlyD is designed for zero-friction real-time connections. Select your intent to proceed.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={() => handleSelectAvailabilityMode('right_now')}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-sky-500/20 to-emerald-500/20 hover:from-emerald-500/30 hover:to-sky-500/30 border-2 border-emerald-400/60 text-left transition-all active:scale-[0.98] group shadow-lg shadow-emerald-950/30"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-black uppercase tracking-wider text-emerald-300 font-display flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Looking for NOW</span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950">
                    Full Map & Grid
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-snug">
                  GPS active. Grants full access to the live Map & Grid. Makes your profile visible to active guys nearby ({readyNowCount || liveProfiles.length} active now).
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectAvailabilityMode('later')}
                className="w-full p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-left transition-all active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-black uppercase tracking-wider text-slate-200 font-display flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Looking for LATER</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Grid Locked
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-snug">
                  Locks out Map & Grid access. Completely hidden from the grid to preserve real-time accuracy until you're ready to meet.
                </p>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto shadow-2xl overflow-hidden overflow-x-hidden relative z-10">
        <div className={`absolute top-0 left-0 right-0 h-1 bg-sky-500/40 blur-md z-50 transition-opacity duration-1000 ${showNotificationPulse ? 'opacity-100' : 'opacity-0'}`} />
        
        <Header 
          view={activeView} 
          onBack={() => {
            if (activeView === 'admin') setActiveView('profile');
            else if (activeView === 'chat') setActiveView('inbox');
            else if (selectedProfile) setSelectedProfile(null);
          }} 
          onOpenFilters={() => setIsFilterOpen(true)}
          isPremium={isPremium}
          isAdmin={isAdmin}
          onOpenAdmin={() => setActiveView(activeView === 'admin' ? 'profile' : 'admin')}
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-16 bg-transparent relative z-10 w-full">
          {activeView === 'admin' && (
            <AdminDashboard 
              onClose={() => setActiveView('profile')}
              currentUserProfile={myProfile}
              initialUsers={allProfiles}
              onUserUpdated={handleAdminUserUpdated}
              onSystemSettingsUpdated={(settings) => {
                setRequireSubscriptionForPlus(settings.requireSubscriptionForPlus !== false);
              }}
            />
          )}

          {(activeView === 'grid' || activeView === 'map') && sessionAvailabilityMode === 'later' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 animate-in fade-in">
              <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 shadow-2xl">
                <Lock className="w-10 h-10" />
              </div>
              <div className="space-y-3 max-w-sm">
                <span className="inline-block px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-black uppercase tracking-widest text-amber-300">
                  Mode: Looking for Later
                </span>
                <h2 className="text-2xl font-black text-white font-display">Live Map & Grid Locked</h2>
                <p className="text-sm text-slate-300 leading-relaxed font-medium bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
                  "You selected 'Later'. The live grid is disabled to protect real-time accuracy. Log out and back in when you're ready to meet."
                </p>
              </div>
              <div className="w-full max-w-xs space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleSelectAvailabilityMode('right_now')}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-xl shadow-emerald-950/50 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  <span>Switch to "Looking for Now"</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-3.5 px-6 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold text-xs active:scale-95 transition-all"
                >
                  Log Out
                </button>
              </div>
            </div>
          ) : (
            <>
              {(activeView === 'grid' || activeView === 'map') && myProfile && (
                <div className="px-4 pt-2 pb-1 flex justify-center z-20">
                  <FloatingStatusToggles
                    isHosting={Boolean(myProfile.sessionState?.isHosting || myProfile.hostTravel === 'Host' || myProfile.hostTravel === 'Both')}
                    isTraveling={Boolean(myProfile.sessionState?.isTraveling || myProfile.hostTravel === 'Travel' || myProfile.hostTravel === 'Both')}
                    onToggleHosting={handleToggleHosting}
                    onToggleTraveling={handleToggleTraveling}
                  />
                </div>
              )}

              {activeView === 'grid' && (
                <ProfileGrid 
                  profiles={filteredProfiles} 
                  onSelect={handleProfileSelect} 
                  gridDensity={myProfile?.preferences?.gridDensity || 'comfortable'}
                  isPremium={isPremium}
                  onPremiumClick={(feature) => setPremiumFeature(feature || 'Slyd+ Membership')}
                  teleportLocation={myProfile?.teleportLocation}
                  onClearTeleport={() => handleSetTeleportLocation(null)}
                  sortBy={filters.sortBy}
                  selectedRaces={filters.races}
                  onChangeSortBy={(nextSort) => setFilters(prev => ({ ...prev, sortBy: nextSort }))}
                  onToggleRaceFilter={(race) => {
                    if (!race) {
                      setFilters(prev => ({ ...prev, races: [] }));
                      return;
                    }
                    setFilters(prev => {
                      const exists = prev.races.includes(race);
                      return {
                        ...prev,
                        sortBy: 'race',
                        races: exists ? prev.races.filter(r => r !== race) : [...prev.races, race]
                      };
                    });
                  }}
                />
              )}
              
              {activeView === 'map' && (
                <MapView 
                  profiles={filteredProfiles} 
                  userLocation={location}
                  onSelect={handleProfileSelect}
                  onChat={handleStartChat}
                  isPremium={isPremium}
                  onPremiumClick={(feature) => setPremiumFeature(feature || 'Global Roam / Teleport')}
                  teleportLocation={myProfile?.teleportLocation}
                  onSetTeleportLocation={handleSetTeleportLocation}
                  myAvailabilityMode={sessionAvailabilityMode || myProfile?.availabilityMode || 'right_now'}
                />
              )}
            </>
          )}

          {activeView === 'inbox' && (
            <Inbox 
              chats={chats} 
              profiles={unblockedProfiles}
              myProfile={myProfile}
              isPremium={isPremium}
              onSelectChat={handleStartChat} 
              onSelectProfile={handleProfileSelect}
              onMarkInterest={handleMarkInterest}
              onPremiumClick={(feature) => setPremiumFeature(feature || 'See Who Viewed & Liked You')}
            />
          )}

          {activeView === 'profile' && myProfile && (
            <div className="p-6 flex flex-col items-center animate-in fade-in duration-500 w-full overflow-x-hidden">
              {(() => {
                const myPresence = getUserPresenceInfo(myProfile, currentUser?.uid, presenceNow);
                return (
                  <>
                    <div className="relative mb-5">
                      <div className="w-28 h-28 rounded-3xl overflow-hidden ring-2 ring-sky-500/80 ring-offset-2 ring-offset-black shadow-2xl bg-slate-900">
                        <img src={myProfile.imageUrl} alt={myProfile.name} className="w-full h-full object-cover" />
                      </div>
                      {/* Live Session Online Status Dot on Avatar */}
                      <div
                        className="absolute -bottom-1 -left-1 p-1 rounded-full bg-slate-950 border border-slate-800 shadow-md flex items-center justify-center"
                        title={myPresence.isSignedIn ? 'Active Signed-In Session' : 'Not Signed In / Offline'}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${myPresence.dotColorClass} ${myPresence.isOnline ? 'animate-pulse' : ''}`} />
                      </div>
                      {/* Compact Top-Right Corner Badges */}
                      {(isPremium || myProfile.isVerified) && (
                        <div className="absolute -top-1 -right-1 flex items-center gap-1 bg-slate-950/90 border border-sky-500/40 px-1.5 py-1 rounded-full shadow-lg">
                          {myProfile.isVerified && (
                            <span title="Anti-Catfish Verified" className="text-sky-400">
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {isPremium && (
                            <span title="Slyd+ Member" className="text-sky-300">
                              <Crown className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      )}
                      <button 
                        type="button"
                        onClick={() => setIsEditingProfile(true)}
                        className="absolute -bottom-1.5 -right-1.5 bg-sky-500 hover:bg-sky-400 p-2 rounded-xl shadow-lg border-2 border-black text-white transition-colors active:scale-95"
                        title="Edit Profile"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-black text-slate-100 font-display">{myProfile.name}, {myProfile.age}</h2>
                    </div>

                    {/* Live Online / Last Seen Status Indicator Pill */}
                    <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-black uppercase tracking-wider ${
                      myPresence.status === 'online'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : myPresence.isToday
                        ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${myPresence.dotColorClass} ${myPresence.isOnline ? 'animate-pulse' : ''}`} />
                      <span>
                        {myPresence.lastSeenText}
                      </span>
                    </div>
                  </>
                );
              })()}
              
              {/* Compact Social Proof Badges in Logo Theme */}
              <ProfileBadges profile={myProfile} size="sm" compact className="mt-2 justify-center" />

              <p className="text-slate-500 font-medium font-sans text-xs mt-1.5">{myProfile.relationshipStatus} · {myProfile.hostTravel}</p>

              {/* Profile Pictures & Vault Summary Card */}
              {(() => {
                const myPhotos = (myProfile.photos && myProfile.photos.length > 0)
                  ? myProfile.photos
                  : [{ id: 'p_main', url: myProfile.imageUrl, isPrivate: false, createdAt: Date.now() }];
                const pubCount = myPhotos.filter(p => !p.isPrivate).length;
                const privCount = myPhotos.filter(p => p.isPrivate).length;

                return (
                  <div className="w-full mt-6 p-4 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
                          <Images className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-white font-display">
                            My Pictures & Vault
                          </h3>
                          <p className="text-[10px] text-slate-400">
                            {pubCount} Public · {privCount} Private {privCount > 0 ? '🔒' : ''}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(true)}
                        className="text-[10px] font-bold text-sky-400 hover:text-sky-300 bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 rounded-xl transition-colors active:scale-95 flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Manage Photos</span>
                      </button>
                    </div>

                    {/* Mini Photo Strip */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                      {myPhotos.map((photo, idx) => (
                        <div 
                          key={photo.id || idx}
                          onClick={() => setSelectedProfile(myProfile)}
                          className="relative w-16 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-800 cursor-pointer group hover:border-sky-500 transition-all bg-slate-950"
                        >
                          <img src={photo.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute top-1 right-1">
                            {photo.isPrivate ? (
                              <div className="p-0.5 bg-slate-900/90 border border-sky-400/40 rounded text-sky-300 text-[8px]" title="Private Photo">
                                <Lock className="w-2.5 h-2.5" />
                              </div>
                            ) : (
                              <div className="p-0.5 bg-sky-500 rounded text-white text-[8px]" title="Public Photo">
                                <Globe className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(true)}
                        className="w-16 h-20 rounded-xl border border-dashed border-slate-700 hover:border-sky-500 text-slate-500 hover:text-sky-400 shrink-0 flex flex-col items-center justify-center gap-1 transition-colors bg-slate-950/40"
                        title="Add Picture"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-[8px] font-bold uppercase tracking-wider">Add</span>
                      </button>
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedProfile(myProfile)}
                        className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-700/50"
                      >
                        <Eye className="w-3.5 h-3.5 text-sky-400" />
                        <span>Preview Profile View & Gallery</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
              
              <div className="mt-6 w-full space-y-4">
                 <div className="grid grid-cols-4 gap-2">
                   <div className="bg-slate-900/50 px-2 py-2.5 rounded-xl border border-slate-800 text-center">
                      <span className="block text-[8px] text-slate-500 uppercase font-black tracking-wider mb-0.5 font-sans">Role</span>
                      <span className="text-sky-400 font-bold text-xs font-display block truncate">{myProfile.role || 'Vers'}</span>
                   </div>
                   <div className="bg-slate-900/50 px-2 py-2.5 rounded-xl border border-slate-800 text-center">
                      <span className="block text-[8px] text-slate-500 uppercase font-black tracking-wider mb-0.5 font-sans">Height</span>
                      <span className="text-sky-400 font-bold text-xs font-display block truncate">{myProfile.height || '5\'10"'}</span>
                   </div>
                   <div className="bg-slate-900/50 px-2 py-2.5 rounded-xl border border-slate-800 text-center">
                      <span className="block text-[8px] text-slate-500 uppercase font-black tracking-wider mb-0.5 font-sans">Weight</span>
                      <span className="text-sky-400 font-bold text-xs font-display block truncate">{myProfile.weight || '170lbs'}</span>
                   </div>
                   <button
                      type="button"
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          sortBy: 'race',
                          races: myProfile.race ? [myProfile.race] : []
                        }));
                        setActiveView('grid');
                      }}
                      title="Tap to sort discovery grid by Race"
                      className="bg-slate-900/50 hover:bg-sky-500/15 px-2 py-2.5 rounded-xl border border-slate-800 hover:border-sky-500/40 text-center transition-colors"
                   >
                      <span className="block text-[8px] text-slate-500 uppercase font-black tracking-wider mb-0.5 font-sans">Race</span>
                      <span className="text-sky-400 font-bold text-xs font-display block truncate">{myProfile.race || 'Mixed'}</span>
                   </button>
                 </div>

                {/* Dedicated Slyd+ Upgrade / Membership Status Card */}
                {!isPremium ? (
                  <div className="p-5 rounded-3xl bg-gradient-to-br from-sky-500/15 via-slate-900 to-blue-600/15 border border-sky-500/30 shadow-xl space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25 shrink-0">
                          <Crown className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-white font-display">
                            Upgrade to Slyd<span className="text-sky-400">+</span> Plus
                          </h3>
                          <p className="text-[11px] text-slate-300">
                            Unlock Incognito Mode, Who Liked You, Pro Filters & Privacy Controls
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                      <CreditCard className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span>Instant <strong className="text-slate-200">Credit / Debit Card</strong> checkout · Cancel anytime</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPremiumFeature('Slyd+ Plus & Unlimited')}
                      className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs rounded-2xl shadow-lg shadow-sky-500/25 transition-all active:scale-[0.99]"
                    >
                      Get Slyd+ — Upgrade Now
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-sky-500/20">
                        <Crown className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-white font-display">
                          Slyd+ Plus Membership Active
                        </div>
                        <div className="text-[11px] text-sky-300 truncate">
                          Card Subscription · All Pro Features Unlocked
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPreferencesOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white shrink-0"
                    >
                      Manage
                    </button>
                  </div>
                )}

                {/* Live Incognito Mode Switch (Slyd+ Premium Feature: Highlighted in cyan when subscribed, Grayed out when not) */}
                <button 
                  type="button"
                  onClick={handleToggleIncognito}
                  className={`w-full py-4 rounded-2xl border text-left px-5 flex justify-between items-center group active:scale-[0.98] transition-all ${
                    !isPremium
                      ? 'bg-slate-900/40 border-slate-800/80 text-slate-500 opacity-60 grayscale hover:opacity-80'
                      : myProfile.isIncognito
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-lg shadow-cyan-950/40'
                      : 'bg-gradient-to-r from-cyan-500/15 via-sky-500/10 to-cyan-400/15 border-cyan-400/50 shadow-md shadow-cyan-950/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {!isPremium ? (
                      <Lock className="w-5 h-5 text-slate-500 shrink-0" />
                    ) : (
                      <EyeOff className={`w-5 h-5 shrink-0 ${myProfile.isIncognito ? 'text-cyan-300' : 'text-cyan-400'}`} />
                    )}
                    <div>
                      <span className={`block font-bold text-sm font-display ${isPremium ? 'text-cyan-200' : 'text-slate-400'}`}>
                        {isPremium
                          ? (myProfile.isIncognito ? 'Incognito Mode: ON (Hidden from Grid)' : 'Incognito Mode: OFF (Visible on Grid)')
                          : 'Go Incognito (Slyd+ Locked)'}
                      </span>
                      <span className={`block text-[11px] ${isPremium ? 'text-cyan-100/75' : 'text-slate-500'}`}>
                        {isPremium
                          ? 'Tap to toggle your visibility on the discovery grid & radar'
                          : 'Browse profiles privately without appearing on the grid — tap to subscribe'}
                      </span>
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase shrink-0 flex items-center gap-1 ${
                    isPremium
                      ? (myProfile.isIncognito ? 'bg-cyan-400 text-slate-950' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40')
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {!isPremium && <Lock className="w-2.5 h-2.5" />}
                    <span>{isPremium ? (myProfile.isIncognito ? 'Active' : 'Slyd+ Off') : 'Slyd+'}</span>
                  </div>
                </button>

                <PWAInstallButton variant="card" />

                {/* Active App Preferences Bar */}
                <button 
                  type="button"
                  onClick={() => setIsPreferencesOpen(true)}
                  className="w-full py-4 bg-slate-900/60 hover:bg-slate-900 rounded-2xl border border-slate-800 hover:border-sky-500/40 text-left px-5 flex justify-between items-center group active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <SlidersHorizontal className="w-5 h-5 text-sky-400" />
                    <div>
                      <span className="block font-bold text-sm text-slate-100 group-hover:text-sky-400 transition-colors font-display">
                        App Preferences & Privacy
                      </span>
                      <span className="block text-[11px] text-slate-400">
                        Units ({myProfile.preferences?.units || 'imperial'}) · Grid ({myProfile.preferences?.gridDensity === 'compact' ? '4 cols' : '3 cols'}) · Read Receipts & Alerts
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isPremium ? (
                      <span className="text-[10px] font-bold text-sky-400">Unlocked</span>
                    ) : (
                      <span className="text-[9px] font-black bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded uppercase">Configure</span>
                    )}
                    <svg className="w-5 h-5 text-slate-500 group-hover:text-sky-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth={2} /></svg>
                  </div>
                </button>

                {isAdmin && (
                  <button 
                    type="button"
                    onClick={() => setActiveView('admin')}
                    className="w-full py-4 bg-gradient-to-r from-sky-950/70 to-slate-900 rounded-2xl border border-sky-500/50 text-left px-5 flex justify-between items-center group shadow-xl shadow-sky-950/40 active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-sky-500/20 rounded-xl border border-sky-500/30 text-sky-300">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm font-display">Admin Control Center</span>
                          <span className="bg-sky-500 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full">Root</span>
                        </div>
                        <p className="text-[10px] text-slate-400">User accounts, feature toggles, messaging & reports</p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-sky-400 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth={2} /></svg>
                  </button>
                )}

                <button 
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 rounded-2xl border border-sky-500/30 hover:border-sky-400/60 text-center font-black uppercase tracking-wider text-xs text-sky-400 hover:text-white mt-4 active:scale-[0.98] transition-all shadow-lg cursor-pointer"
                >
                  Log Out of Account
                </button>
              </div>
            </div>
          )}

          {activeView === 'chat' && activeChatProfile && currentUser && (
            <ChatRoom 
              profile={activeChatProfile} 
              messages={chats[activeChatProfile.id] || []} 
              onSendMessage={handleSendMessage}
              onUnsendMessage={handleUnsendMessage}
              onSavePhrases={handleSavePhrases}
              myId={currentUser.uid}
              isPremium={isPremium}
              readReceiptsEnabled={myProfile?.readReceipts !== false}
              disableTypingIndicator={Boolean(myProfile?.preferences?.disableTypingIndicator)}
              savedPhrases={myProfile?.savedPhrases}
              onPremiumClick={(feature) => setPremiumFeature(feature || 'Slyd+ Chat Features')}
              onBlock={handleBlockUser}
              onReport={handleReportUser}
              onViewProfile={handleProfileSelect}
              messagingDisabled={Boolean(myProfile?.messagingDisabled)}
              mediaDisabled={Boolean(myProfile?.mediaDisabled)}
            />
          )}
        </main>

        {activeSelectedProfile && (
          <ProfilePanel 
            profile={activeSelectedProfile} 
            currentUserId={myProfile?.id}
            isPremium={isPremium}
            hasSuperLiked={Boolean(myProfile?.superLikedUsers?.includes(activeSelectedProfile.id))}
            isFavorited={Boolean(myProfile?.favoriteUsers?.includes(activeSelectedProfile.id))}
            interestState={getMyInterestState(activeSelectedProfile)}
            hasTheirInterest={hasTheirInterestInMe(activeSelectedProfile)}
            profileNote={myProfile?.profileNotes?.[activeSelectedProfile.id] || ''}
            onClose={() => setSelectedProfile(null)} 
            onChat={handleStartChat}
            onPremiumClick={(feature) => setPremiumFeature(feature || 'Slyd+ Membership')}
            onSuperLike={handleSuperLike}
            onMarkInterest={handleMarkInterest}
            onToggleFavorite={handleToggleFavorite}
            onSaveNote={handleSaveProfileNote}
            onBlock={handleBlockUser}
            onReport={handleReportUser}
            onSortByRace={(race) => {
              setFilters(prev => ({
                ...prev,
                sortBy: 'race',
                races: race ? [race] : []
              }));
              setSelectedProfile(null);
              setActiveView('grid');
            }}
          />
        )}

        {/* Toast Notification for Interest / Messaging Status */}
        {interestToastMessage && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[150] max-w-xs w-[90%] bg-slate-900/95 border border-sky-500/40 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-3">
            <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
            <span>{interestToastMessage}</span>
          </div>
        )}

        {/* Mutual Interest Match Modal */}
        {matchNotification && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/85 backdrop-blur-md p-6">
            <div className="w-full max-w-xs rounded-3xl bg-slate-950 border border-emerald-500/40 p-6 text-center space-y-4 shadow-2xl">
              <div className="flex items-center justify-center -space-x-3">
                {myProfile && (
                  <img
                    src={myProfile.imageUrl}
                    alt={myProfile.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-950 ring-2 ring-sky-400"
                  />
                )}
                <img
                  src={matchNotification.imageUrl}
                  alt={matchNotification.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-950 ring-2 ring-emerald-400"
                />
              </div>
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-widest mb-1">
                  Mutual Interest!
                </span>
                <h3 className="text-xl font-black text-white font-display">
                  It's a Match with {matchNotification.name}!
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {matchNotification.name} was interested in you too. Direct messaging is now unlocked for this profile!
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const matched = matchNotification;
                    setMatchNotification(null);
                    handleStartChat(matched);
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all"
                >
                  Message {matchNotification.name} Now
                </button>
                <button
                  type="button"
                  onClick={() => setMatchNotification(null)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Keep Browsing
                </button>
              </div>
            </div>
          </div>
        )}

        {isFilterOpen && (
          <FilterDrawer 
            isOpen={isFilterOpen} 
            onClose={() => setIsFilterOpen(false)} 
            filters={filters} 
            onUpdateFilters={setFilters} 
            isPremium={isPremium}
            onPremiumClick={isPremium ? undefined : () => setPremiumFeature('Advanced Pro Filters')}
          />
        )}

        {isPreferencesOpen && myProfile && (
          <AppPreferencesDrawer
            isOpen={isPreferencesOpen}
            onClose={() => setIsPreferencesOpen(false)}
            profile={myProfile}
            isPremium={isPremium}
            onSavePreferences={handleSaveAppPreferences}
            onOpenPaywall={(feature) => {
              setIsPreferencesOpen(false);
              setPremiumFeature(feature);
            }}
          />
        )}

        {isEditingProfile && myProfile && (
          <ProfileEdit 
            profile={myProfile} 
            onUpdate={handleSaveProfile} 
            onClose={() => setIsEditingProfile(false)} 
          />
        )}

        {showAntiCatfishModal && myProfile && (
          <AntiCatfishModal
            isOpen={showAntiCatfishModal}
            onClose={() => setShowAntiCatfishModal(false)}
            user={myProfile}
            onVerificationSuccess={handleAntiCatfishSuccess}
            onAttemptLogged={handleAntiCatfishAttemptLogged}
          />
        )}

        <BottomNav 
          activeView={activeView} 
          setActiveView={setActiveView} 
          unreadCount={unreadCount}
          showMapTab={(sessionAvailabilityMode || myProfile?.availabilityMode) !== 'later'}
        />
      </div>
    );
  };

  return (
    <div className="relative min-h-[100dvh] h-[100dvh] w-full bg-black overflow-hidden overflow-x-hidden flex justify-center">
      <div className="relative z-10 w-full max-w-md h-full bg-black flex flex-col overflow-hidden overflow-x-hidden">
        {/* Global Watermark Background */}
        <div 
          className="absolute inset-0 pointer-events-none z-0 opacity-[0.03] select-none"
          style={{ 
            backgroundImage: "url('/logo.png')",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundSize: '120% auto',
            filter: 'grayscale(1) brightness(2)'
          }}
        />
        {renderAppContent()}
        <OfflineIndicator />
      </div>

      <PremiumPaywall 
        isOpen={!!premiumFeature} 
        onClose={() => setPremiumFeature(null)} 
        userId={currentUser?.uid}
        userEmail={currentUser?.email || myProfile?.email || ''}
        userName={myProfile?.name || ''}
        onUpgrade={async (paymentResult: UpgradePaymentResult) => {
          const upgradeFields: Partial<UserProfile> = {
            isPremium: true,
            premiumPlan: paymentResult.planId,
            premiumSince: paymentResult.premiumSince,
            premiumExpiresAt: paymentResult.premiumExpiresAt,
            paymentMethod: paymentResult.paymentMethod,
            lastPaymentId: paymentResult.transactionId
          };

          setIsPremium(true);
          setMyProfile(prev => {
            if (!prev) return null;
            const next = { ...prev, ...upgradeFields };
            saveCachedProfile(next);
            return next;
          });

          if (currentUser && !isQuotaExhausted()) {
            try {
              await updateDoc(doc(db, 'users', currentUser.uid), upgradeFields);
              await addDoc(collection(db, 'payments'), {
                userId: currentUser.uid,
                userName: myProfile?.name || 'Member',
                userEmail: currentUser.email || myProfile?.email || '',
                planId: paymentResult.planId,
                amount: paymentResult.amount,
                currency: 'USD',
                paymentMethod: paymentResult.paymentMethod,
                transactionId: paymentResult.transactionId,
                status: 'completed',
                createdAt: Date.now()
              }).catch(err => markQuotaExhausted(err));
            } catch (error) {
              handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
            }
          }
        }}
        featureName={premiumFeature || 'Slyd+ Membership'} 
      />
    </div>
  );
};

export default App;
