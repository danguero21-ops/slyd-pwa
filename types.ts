
export interface ProfilePhoto {
  id: string;
  url: string;
  isPrivate: boolean;
  createdAt?: number;
  caption?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  age: number;
  distance: string;
  status: 'online' | 'offline' | 'away';
  isSignedIn?: boolean; // True only while the user has an active authenticated session
  lastActiveAt?: number; // Epoch timestamp (ms) of most recent active session heartbeat
  sessionExpiresAt?: number; // Epoch timestamp (ms) when active session expires without heartbeat
  lastLogoutAt?: number; // Epoch timestamp (ms) when the user last signed out
  imageUrl: string;
  photos?: ProfilePhoto[]; // Stored multiple photos with public/private status
  unlockedPrivateUsers?: string[]; // IDs of users allowed to view private photos
  referenceSelfieUrl?: string; // Original selfie from signup
  isVerified?: boolean;
  isShieldVerified?: boolean; // SlyD Shield mandatory biometric validation
  shieldVerifiedAt?: number; // Epoch timestamp of SlyD Shield check
  isPremium?: boolean;
  isAdmin?: boolean; // Administrator access
  isSelfieExempt?: boolean; // Exemption from selfie verification (automatic for admin accounts)
  isNewUser?: boolean; // New member badge
  createdAt?: number; // Member signup timestamp
  isDisabled?: boolean; // Full account suspension
  disabledReason?: string; // Reason for account suspension
  disabledAt?: number; // Timestamp of suspension
  messagingDisabled?: boolean; // Chat feature lock
  mediaDisabled?: boolean; // Photo / camera upload lock
  hiddenFromGrid?: boolean; // Hidden from discovery grid and map
  lastPasswordResetRequestedAt?: number; // Timestamp of admin/user password reset request
  lastVerifiedAt?: number; // Timestamp (ms) of last daily verification
  lastSelfieAttemptAt?: number; // Timestamp (ms) of last initial/verification selfie attempt (1 per day limit)
  selfieAttemptCount?: number; // Total number of selfie attempts
  bio: string;
  height?: string; // e.g., "5'11\""
  weight?: string; // e.g., "175lbs"
  bodyType?: string;
  role?: 'Top' | 'Bottom' | 'Vers' | 'Side';
  race?: string;
  interests?: string[];
  personality?: 'Introvert' | 'Extrovert' | 'Ambivert' | 'Chill' | 'Energetic';
  relationshipStatus?: 'Single' | 'Married' | 'Open' | 'Partnered';
  lookingFor: string[]; // e.g., ['Friends', 'Right Now', 'Dates']
  hostTravel?: 'Host' | 'Travel' | 'Both' | 'Ask';
  tribes: string[];
  lastSeen: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  blockedUsers?: string[];
  isIncognito?: boolean;
  showOnlineStatus?: boolean;
  showDistance?: boolean;
  readReceipts?: boolean;
  screenshotProtection?: boolean;
  preferences?: Partial<UserPreferences>;
  premiumPlan?: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  premiumSince?: number;
  premiumExpiresAt?: number;
  paymentMethod?: 'stripe_card' | 'stripe_link';
  lastPaymentId?: string;
  likedUsers?: string[];
  superLikedUsers?: string[];
  likedByUsers?: string[];
  superLikedByUsers?: string[];
  notInterestedUsers?: string[];
  viewedByUsers?: string[];
  viewedUsers?: string[];
  favoriteUsers?: string[];
  savedPhrases?: string[];
  profileNotes?: Record<string, string>;
  availabilityMode?: 'right_now' | 'later';
  availabilityUpdatedAt?: number;
  sessionState?: {
    intent: 'NOW' | 'LATER';
    isHosting: boolean;
    isTraveling: boolean;
    lastActiveLocation?: {
      lat: number;
      lng: number;
    };
    lastActiveTimestamp?: number;
  };
  subscription?: {
    tier: 'FREE' | 'SLYD_PLUS';
    expiresAt?: number;
  };
  teleportLocation?: {
    name: string;
    lat: number;
    lng: number;
  } | null;
}

export interface UserPreferences {
  units: 'imperial' | 'metric';
  gridDensity: 'compact' | 'comfortable';
  defaultTab: 'grid' | 'map' | 'inbox';
  showOffline: boolean;
  soundEffects: boolean;
  pushNotifications: boolean;
  woofAlerts?: boolean;
  nearbyAlerts: boolean;
  disableTypingIndicator?: boolean;
  adFreeExperience?: boolean;
}

export interface PrivacySettings {
  isIncognito: boolean;
  showOnlineStatus: boolean;
  showDistance: boolean;
  readReceipts: boolean;
  screenshotProtection: boolean;
  locationMode: LocationPrivacyMode;
  proximityRadius: number;
}

export interface UserReport {
  id?: string;
  reporterId: string;
  reportedUserId: string;
  reportedUserName: string;
  reason: string;
  details?: string;
  createdAt: number;
  status: 'pending' | 'reviewed' | 'resolved';
}

export interface SystemSetting {
  id: string;
  requireBiometrics: boolean;
  requireSubscriptionForPlus?: boolean;
  allowMessaging: boolean;
  maintenanceMode: boolean;
  allowRegistrations: boolean;
  updatedAt: number;
  updatedBy: string;
}

export const hasActivePremiumSubscription = (
  user?: Partial<UserProfile> | null,
  requireSubscriptionForPlus = true
): boolean => {
  if (!requireSubscriptionForPlus) return true;
  if (!user) return false;
  if (user.isPremium !== true) return false;
  if (typeof user.premiumExpiresAt === 'number' && user.premiumExpiresAt <= Date.now()) {
    return false;
  }
  return Boolean(
    user.premiumPlan ||
    user.paymentMethod ||
    (typeof user.premiumSince === 'number' && user.premiumSince > 0) ||
    (typeof user.premiumExpiresAt === 'number' && user.premiumExpiresAt > Date.now())
  );
};

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  imageUrl?: string;
  isExpiringPhoto?: boolean;
  viewedByReceiver?: boolean;
  timestamp: Date;
  isRead: boolean;
  location?: {
    lat: number;
    lng: number;
    address?: string;
    sharedAt: number;
  };
}

export interface Filters {
  minAge: number;
  maxAge: number;
  roles: string[];
  relationshipStatuses: string[];
  lookingFor: string[];
  hostTravel: string[];
  races: string[];
  interests: string[];
  heightRange: [number, number]; // [min_inches, max_inches]
  sortBy: 'distance' | 'age' | 'lastSeen' | 'newest' | 'race';
  onlineOnly?: boolean;
  verifiedOnly?: boolean;
  hasPhotosOnly?: boolean;
}

export type AppView = 'grid' | 'map' | 'inbox' | 'profile' | 'chat' | 'admin';

export type LocationPrivacyMode = 'proximity' | 'exact';

export interface LocationPrivacySettings {
  mode: LocationPrivacyMode;
  radiusMeters: number;
}

export const isAdminUser = (user?: Partial<UserProfile> | null, email?: string | null): boolean => {
  if (!user && !email) return false;
  if (user?.isAdmin) return true;
  if (user?.email && user.email.toLowerCase() === 'danguero21@gmail.com') return true;
  if (email && email.toLowerCase() === 'danguero21@gmail.com') return true;
  return false;
};

export const isSelfieExemptUser = (user?: Partial<UserProfile> | null, email?: string | null): boolean => {
  if (isAdminUser(user, email)) return true;
  if (user?.isSelfieExempt) return true;
  return false;
};
