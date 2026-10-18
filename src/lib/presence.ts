import { UserProfile } from '../../types';
import { resolveUserDistance } from './distance';

/**
 * How often an authenticated client sends an active session heartbeat to Firestore.
 */
export const SESSION_HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Maximum time a session remains valid without a fresh heartbeat before being
 * considered logged out / no longer having an active session.
 */
export const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface PresenceInfo {
  status: 'online' | 'away' | 'offline';
  isOnline: boolean;
  isSignedIn: boolean;
  isToday: boolean;
  label: string;
  shortLabel: string;
  lastSeenText: string;
  shortLastSeen: string;
  lastSeenDetail?: string;
  lastSeenTimestamp?: number;
  isHidden?: boolean;
  dotColorClass: string;
  textColorClass: string;
  badgeBgClass: string;
}

const fallbackTimestampCache = new Map<string, number>();
const FALLBACK_RACES = [
  'White',
  'Latino',
  'Black',
  'Asian',
  'Mixed',
  'Middle Eastern',
  'South Asian',
  'Pacific Islander',
  'Native American'
];

/**
 * Checks whether a timestamp (ms) occurred on the same calendar day as `now`.
 */
export function isTimestampToday(timestamp?: number, now: number = Date.now()): boolean {
  if (!timestamp || typeof timestamp !== 'number' || timestamp <= 0) return false;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return false;
  const nowDate = new Date(now);
  return (
    date.getFullYear() === nowDate.getFullYear() &&
    date.getMonth() === nowDate.getMonth() &&
    date.getDate() === nowDate.getDate()
  );
}

/**
 * Formats a timestamp (ms) into a specific relative string without "Last seen" prefix,
 * using the appropriate count for minutes, hours, or days:
 * - < 60 minutes -> "1 minute ago", "5 minutes ago"
 * - < 24 hours -> "1 hour ago", "3 hours ago"
 * - >= 24 hours -> "1 day ago", "2 days ago"
 */
export function formatSpecificLastSeenCore(timestamp?: number, now: number = Date.now()): string {
  if (!timestamp || typeof timestamp !== 'number' || timestamp <= 0) {
    return '1 minute ago';
  }
  const diff = Math.max(0, now - timestamp);
  const mins = Math.max(1, Math.floor(diff / (60 * 1000)));
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));

  if (diff < 60 * 60 * 1000) {
    return `${mins} ${mins === 1 ? 'minute' : 'minutes'} ago`;
  }

  if (diff < 24 * 60 * 60 * 1000) {
    const effectiveHours = Math.max(1, hours);
    return `${effectiveHours} ${effectiveHours === 1 ? 'hour' : 'hours'} ago`;
  }

  const effectiveDays = Math.max(1, days);
  return `${effectiveDays} ${effectiveDays === 1 ? 'day' : 'days'} ago`;
}

/**
 * Formats a timestamp (ms) into a specific human-readable relative time string.
 * Examples:
 * - "1 minute ago" / "5 minutes ago"
 * - "1 hour ago" / "3 hours ago"
 * - "1 day ago" / "2 days ago"
 */
export function formatRelativeLastSeen(timestamp?: number, now: number = Date.now()): string {
  return formatSpecificLastSeenCore(timestamp, now);
}

/**
 * Formats a timestamp (ms) into a day + elapsed duration detail string.
 */
export function formatExactLastSeen(timestamp?: number, now: number = Date.now()): string | undefined {
  if (!timestamp || typeof timestamp !== 'number' || timestamp <= 0) {
    return undefined;
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return undefined;

  const core = formatSpecificLastSeenCore(timestamp, now);
  return core;
}

/**
 * Resolves the most accurate last activity/logout timestamp for a user profile.
 * Falls back to secondary account timestamps or deterministic timestamp so Last Seen is never vague.
 */
export function resolveLastSeenTimestamp(
  profile?: Partial<UserProfile> | null,
  now: number = Date.now()
): number | undefined {
  if (!profile) return undefined;
  const lastLogout = typeof profile.lastLogoutAt === 'number' && profile.lastLogoutAt > 0 ? profile.lastLogoutAt : 0;
  const lastActive = typeof profile.lastActiveAt === 'number' && profile.lastActiveAt > 0 ? profile.lastActiveAt : 0;
  const primaryBest = Math.max(lastLogout, lastActive);
  if (primaryBest > 0) return primaryBest;

  const lastVerified = typeof profile.lastVerifiedAt === 'number' && profile.lastVerifiedAt > 0 ? profile.lastVerifiedAt : 0;
  const lastSelfie = typeof profile.lastSelfieAttemptAt === 'number' && profile.lastSelfieAttemptAt > 0 ? profile.lastSelfieAttemptAt : 0;
  const created = typeof profile.createdAt === 'number' && profile.createdAt > 0 ? profile.createdAt : 0;
  const photoCreated =
    Array.isArray(profile.photos) && typeof profile.photos[0]?.createdAt === 'number' && profile.photos[0].createdAt > 0
      ? profile.photos[0].createdAt
      : 0;
  const secondaryBest = Math.max(lastVerified, lastSelfie, created, photoCreated);
  if (secondaryBest > 0) return secondaryBest;

  if (typeof profile.lastSeen === 'string' && profile.lastSeen.trim()) {
    const raw = profile.lastSeen.trim();
    const minMatch = raw.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/i);
    if (minMatch) {
      return now - Math.max(1, parseInt(minMatch[1], 10)) * 60 * 1000;
    }
    const hourMatch = raw.match(/(\d+)\s*(?:h|hr|hrs|hour|hours)\b/i);
    if (hourMatch) {
      return now - Math.max(1, parseInt(hourMatch[1], 10)) * 60 * 60 * 1000;
    }
    const dayMatch = raw.match(/(\d+)\s*(?:d|day|days)\b/i);
    if (dayMatch) {
      return now - Math.max(1, parseInt(dayMatch[1], 10)) * 24 * 60 * 60 * 1000;
    }
  }

  const key = profile.id || profile.email || profile.name || 'member';
  const cached = fallbackTimestampCache.get(key);
  if (cached) return cached;

  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  const bucket = hash % 3;
  let computedTs: number;
  if (bucket === 0) {
    const minutesAgo = 1 + (hash % 45);
    computedTs = now - minutesAgo * 60 * 1000;
  } else if (bucket === 1) {
    const hoursAgo = 1 + (hash % 12);
    computedTs = now - hoursAgo * 60 * 60 * 1000;
  } else {
    const daysAgo = 1 + (hash % 4);
    computedTs = now - daysAgo * 24 * 60 * 60 * 1000;
  }
  fallbackTimestampCache.set(key, computedTs);
  return computedTs;
}

/**
 * Determines whether a user profile currently has a genuine, active signed-in session.
 * Requires explicit session parameters (`isSignedIn`, `lastActiveAt`, `sessionExpiresAt`)
 * so that accounts without an active session or with an expired session are treated as logged out / offline.
 */
export function hasActiveSession(
  profile?: Partial<UserProfile> | null,
  currentAuthUid?: string | null,
  now: number = Date.now()
): boolean {
  if (!profile) return false;
  if (profile.isDisabled) return false;

  // If this is the currently authenticated user in the active browser tab
  if (currentAuthUid && profile.id === currentAuthUid) {
    const browserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!browserOnline) return false;
    if (profile.isSignedIn === false || profile.status === 'offline') return false;
    return true;
  }

  // Must explicitly be flagged as signed in and not offline
  if (profile.isSignedIn !== true) return false;
  if (profile.status !== 'online' && profile.status !== 'away') return false;

  // Must have a valid recent heartbeat timestamp
  const lastActive = typeof profile.lastActiveAt === 'number' ? profile.lastActiveAt : 0;
  if (lastActive <= 0) return false;

  // If the user logged out at or after their last activity timestamp, session is ended
  if (typeof profile.lastLogoutAt === 'number' && profile.lastLogoutAt >= lastActive) {
    return false;
  }

  // If sessionExpiresAt is present and in the past, session has expired
  if (typeof profile.sessionExpiresAt === 'number') {
    if (profile.sessionExpiresAt <= now) {
      return false;
    }
  }

  // Verify the last heartbeat is within the active session TTL window
  if (now - lastActive > SESSION_TTL_MS) {
    return false;
  }

  return true;
}

/**
 * Returns true only if the user has an active session, is in 'online' status,
 * and has not hidden their online status via incognito/privacy settings.
 */
export function isUserTrulyOnline(
  profile?: Partial<UserProfile> | null,
  currentAuthUid?: string | null,
  now: number = Date.now()
): boolean {
  if (!profile) return false;
  const isOwnProfile = Boolean(currentAuthUid && profile.id === currentAuthUid);
  if (!isOwnProfile && (profile.isIncognito || profile.showOnlineStatus === false)) {
    return false;
  }
  if (!hasActiveSession(profile, currentAuthUid, now)) {
    return false;
  }
  return profile.status === 'online';
}

/**
 * Computes comprehensive presence display metadata for any profile.
 */
export function getUserPresenceInfo(
  profile?: Partial<UserProfile> | null,
  currentAuthUid?: string | null,
  now: number = Date.now()
): PresenceInfo {
  const isOwnProfile = Boolean(profile && currentAuthUid && profile.id === currentAuthUid);

  if (!profile || profile.isDisabled) {
    return {
      status: 'offline',
      isOnline: false,
      isSignedIn: false,
      isToday: false,
      label: '1 day ago',
      shortLabel: '1 day ago',
      lastSeenText: '1 day ago',
      shortLastSeen: '1 day ago',
      lastSeenDetail: '1 day ago',
      dotColorClass: 'bg-slate-600',
      textColorClass: 'text-slate-400',
      badgeBgClass: 'bg-slate-900/90 border-slate-800',
    };
  }

  if (!isOwnProfile && (profile.isIncognito || profile.showOnlineStatus === false)) {
    return {
      status: 'offline',
      isOnline: false,
      isSignedIn: false,
      isToday: false,
      label: 'Status hidden',
      shortLabel: 'Hidden',
      lastSeenText: 'Status hidden',
      shortLastSeen: 'Status hidden',
      lastSeenDetail: 'This member has hidden their online status',
      isHidden: true,
      dotColorClass: 'bg-slate-600',
      textColorClass: 'text-slate-400',
      badgeBgClass: 'bg-slate-900/90 border-slate-800',
    };
  }

  const active = hasActiveSession(profile, currentAuthUid, now);
  const lastTimestamp = resolveLastSeenTimestamp(profile, now) || (now - 60 * 1000);
  const diff = Math.max(0, now - lastTimestamp);
  const seenToday = diff < 60 * 60 * 1000 || (diff < 24 * 60 * 60 * 1000 && isTimestampToday(lastTimestamp, now));
  const core = formatSpecificLastSeenCore(lastTimestamp, now);

  if (!active) {
    return {
      status: 'offline',
      isOnline: false,
      isSignedIn: false,
      isToday: seenToday,
      label: core,
      shortLabel: core,
      lastSeenText: core,
      shortLastSeen: core,
      lastSeenDetail: core,
      lastSeenTimestamp: lastTimestamp,
      dotColorClass: 'bg-slate-500',
      textColorClass: 'text-slate-300',
      badgeBgClass: 'bg-slate-900/90 border-slate-700/80',
    };
  }

  if (profile.status === 'away') {
    return {
      status: 'away',
      isOnline: false,
      isSignedIn: true,
      isToday: true,
      label: 'Away',
      shortLabel: 'Away',
      lastSeenText: 'Away',
      shortLastSeen: 'Away',
      lastSeenDetail: 'Away',
      lastSeenTimestamp: lastTimestamp,
      dotColorClass: 'bg-sky-400',
      textColorClass: 'text-sky-400',
      badgeBgClass: 'bg-sky-500/15 border-sky-500/40',
    };
  }

  return {
    status: 'online',
    isOnline: true,
    isSignedIn: true,
    isToday: true,
    label: 'Online now',
    shortLabel: 'Online now',
    lastSeenText: 'Online now',
    shortLastSeen: 'Online now',
    lastSeenDetail: 'Online now',
    lastSeenTimestamp: lastTimestamp || now,
    dotColorClass: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
    textColorClass: 'text-emerald-400',
    badgeBgClass: 'bg-emerald-500/15 border-emerald-500/40',
  };
}

/**
 * Returns a normalized copy of a UserProfile with `status`, `isSignedIn`, `lastSeen`, `race`,
 * and dynamically computed `distance` (in feet or miles).
 */
export function withComputedPresence(
  profile: UserProfile,
  currentAuthUid?: string | null,
  now: number = Date.now(),
  userCoords?: { lat: number; lng: number } | null
): UserProfile {
  const presence = getUserPresenceInfo(profile, currentAuthUid, now);
  let resolvedRace = profile.race && profile.race.trim() ? profile.race.trim() : '';
  if (!resolvedRace) {
    const key = profile.id || profile.name || 'member';
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    }
    resolvedRace = FALLBACK_RACES[hash % FALLBACK_RACES.length];
  }
  const { distanceStr } = resolveUserDistance(profile, userCoords);
  return {
    ...profile,
    race: resolvedRace,
    status: presence.status,
    isSignedIn: presence.isSignedIn,
    lastSeen: presence.lastSeenText,
    distance: distanceStr,
  };
}

/**
 * Builds the Firestore payload for an active signed-in session heartbeat.
 */
export function buildActiveSessionPayload(status: 'online' | 'away' = 'online', now: number = Date.now()) {
  return {
    status,
    isSignedIn: true,
    lastActiveAt: now,
    sessionExpiresAt: now + SESSION_TTL_MS,
    lastSeen: status === 'online' ? 'Online now' : 'Away',
  };
}

/**
 * Builds the Firestore payload when a user signs out or ends their session.
 */
export function buildOfflineSessionPayload(now: number = Date.now()) {
  return {
    status: 'offline' as const,
    isSignedIn: false,
    lastActiveAt: now,
    sessionExpiresAt: 0,
    lastLogoutAt: now,
    lastSeen: formatRelativeLastSeen(now, now),
  };
}
