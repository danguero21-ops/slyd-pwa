/**
 * SlydShield Security Engine & Cooldown Utilities
 * Enforces the strict 1-selfie-per-day rate limit for biometric verification
 * against profile pictures.
 */

export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface AntiCatfishCooldownInfo {
  isLocked: boolean;
  remainingMs: number;
  remainingHours: number;
  remainingMinutes: number;
  formattedRemaining: string;
}

/**
 * Calculates the current anti-catfish cooldown state based on the last attempt timestamp.
 */
export function getSlydShieldCooldown(lastAttemptAt?: number): AntiCatfishCooldownInfo {
  if (!lastAttemptAt || typeof lastAttemptAt !== 'number') {
    return {
      isLocked: false,
      remainingMs: 0,
      remainingHours: 0,
      remainingMinutes: 0,
      formattedRemaining: '0h 0m'
    };
  }

  const now = Date.now();
  const elapsed = now - lastAttemptAt;

  if (elapsed >= ONE_DAY_MS || elapsed < 0) {
    return {
      isLocked: false,
      remainingMs: 0,
      remainingHours: 0,
      remainingMinutes: 0,
      formattedRemaining: '0h 0m'
    };
  }

  const remainingMs = ONE_DAY_MS - elapsed;
  const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
  const remainingMinutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));

  let formatted = '';
  if (remainingHours > 0) {
    formatted = `${remainingHours}h ${remainingMinutes}m`;
  } else {
    formatted = `${Math.max(1, remainingMinutes)}m`;
  }

  return {
    isLocked: true,
    remainingMs,
    remainingHours,
    remainingMinutes,
    formattedRemaining: formatted
  };
}

export interface DailyVerificationStatus {
  isValid: boolean;
  expiresInMs: number;
  formattedExpiresIn: string;
}

/**
 * Calculates whether daily verification is active and when it expires.
 * Verification lasts 24 hours from lastVerifiedAt.
 */
export function getDailyVerificationStatus(lastVerifiedAt?: number): DailyVerificationStatus {
  if (!lastVerifiedAt || typeof lastVerifiedAt !== 'number') {
    return {
      isValid: false,
      expiresInMs: 0,
      formattedExpiresIn: 'Expired'
    };
  }

  const now = Date.now();
  const elapsed = now - lastVerifiedAt;

  if (elapsed >= ONE_DAY_MS || elapsed < 0) {
    return {
      isValid: false,
      expiresInMs: 0,
      formattedExpiresIn: 'Expired'
    };
  }

  const remainingMs = ONE_DAY_MS - elapsed;
  const hours = Math.floor(remainingMs / (60 * 60 * 1000));
  const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));

  let formatted = '';
  if (hours > 0) {
    formatted = `${hours}h ${minutes}m`;
  } else {
    formatted = `${Math.max(1, minutes)}m`;
  }

  return {
    isValid: true,
    expiresInMs: remainingMs,
    formattedExpiresIn: formatted
  };
}
