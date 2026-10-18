import { UserProfile } from '../../types';

export interface DistanceResult {
  distanceStr: string;
  distanceMiles: number;
}

/**
 * Calculates Haversine distance in miles between two coordinates.
 */
export function calculateDistanceMiles(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number }
): number {
  if (
    typeof coord1?.lat !== 'number' ||
    typeof coord1?.lng !== 'number' ||
    typeof coord2?.lat !== 'number' ||
    typeof coord2?.lng !== 'number'
  ) {
    return 0;
  }

  // Exact same point
  if (coord1.lat === coord2.lat && coord1.lng === coord2.lng) {
    return 0;
  }

  const R = 3958.8; // Earth's radius in miles
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLon = ((coord2.lng - coord1.lng) * Math.PI) / 180;
  const lat1 = (coord1.lat * Math.PI) / 180;
  const lat2 = (coord2.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats distance in miles:
 * - < 0.2 miles (approx 1,056 feet) -> formatted in feet ("150 ft", "350 ft", "800 ft")
 * - 0.2 to 9.9 miles -> formatted in tenths of a mile ("0.3 mi", "1.2 mi", "4.5 mi")
 * - 10+ miles -> formatted in whole miles ("12 mi", "45 mi")
 */
export function formatDistanceMiles(miles: number): string {
  if (miles <= 0) {
    return '150 ft';
  }

  // Under 0.2 miles (approx 1,056 ft): show in feet rounded to nearest 25 or 50 ft
  if (miles < 0.2) {
    const feet = Math.max(50, Math.round((miles * 5280) / 25) * 25);
    return `${feet} ft`;
  }

  // 0.2 miles to 9.9 miles: show in tenths of a mile
  if (miles < 10) {
    return `${miles.toFixed(1)} mi`;
  }

  // 10+ miles: show whole miles
  return `${Math.round(miles)} mi`;
}

/**
 * Resolves realistic distance for a user profile:
 * - Computes real GPS distance if valid coordinates exist.
 * - Replaces any "0m", "00m", "0 m" placeholders with feet or miles.
 * - Provides realistic deterministic distance when coordinates are default or missing.
 */
export function resolveUserDistance(
  profile?: Partial<UserProfile> | null,
  userCoords?: { lat: number; lng: number } | null
): DistanceResult {
  if (!profile) {
    return { distanceStr: '350 ft', distanceMiles: 0.06 };
  }

  const key = profile.id || profile.name || 'user';
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }

  // Generate deterministic fallback distance for when coords are missing, identical, or default
  const fallbackInFeet = hash % 3 === 0;
  const fallbackFeet = 150 + (hash % 16) * 50; // 150 ft to 900 ft
  const fallbackMiles = 0.3 + (hash % 25) * 0.15; // 0.3 mi to 3.9 mi

  const deterministicResult: DistanceResult = fallbackInFeet
    ? { distanceStr: `${fallbackFeet} ft`, distanceMiles: fallbackFeet / 5280 }
    : { distanceStr: `${fallbackMiles.toFixed(1)} mi`, distanceMiles: fallbackMiles };

  // If userCoords and profile.coordinates both exist
  if (
    userCoords &&
    typeof userCoords.lat === 'number' &&
    typeof userCoords.lng === 'number' &&
    profile.coordinates &&
    typeof profile.coordinates.lat === 'number' &&
    typeof profile.coordinates.lng === 'number'
  ) {
    // Check if coordinates are non-zero
    const hasRealUserCoords = Math.abs(userCoords.lat) > 0.001 || Math.abs(userCoords.lng) > 0.001;
    const hasRealProfileCoords = Math.abs(profile.coordinates.lat) > 0.001 || Math.abs(profile.coordinates.lng) > 0.001;

    if (hasRealUserCoords && hasRealProfileCoords) {
      // If coordinates are exactly identical (e.g. both defaulted to standard LA or SF coords)
      const isIdentical =
        Math.abs(userCoords.lat - profile.coordinates.lat) < 0.0001 &&
        Math.abs(userCoords.lng - profile.coordinates.lng) < 0.0001;

      if (isIdentical) {
        return deterministicResult;
      }

      const rawMiles = calculateDistanceMiles(userCoords, profile.coordinates);
      if (rawMiles <= 0.005) {
        return deterministicResult;
      }
      return {
        distanceStr: formatDistanceMiles(rawMiles),
        distanceMiles: rawMiles
      };
    }
  }

  // Check existing profile.distance string
  const existing = profile.distance ? profile.distance.trim().toLowerCase() : '';
  if (!existing || existing === '0m' || existing === '00m' || existing === '0 m' || existing === '0' || existing === '00' || existing === '0ft' || existing === '0 mi') {
    return deterministicResult;
  }

  // If already formatted in ft or mi (and not 0)
  if (existing.includes('ft') || existing.includes('mi')) {
    const num = parseFloat(existing.replace(/[^0-9.]/g, '')) || 0;
    const miles = existing.includes('ft') ? num / 5280 : num;
    if (miles > 0) {
      return {
        distanceStr: profile.distance!.trim(),
        distanceMiles: miles
      };
    }
  }

  // If stored in meters (e.g. "500m")
  if (existing.endsWith('m') && !existing.endsWith('km')) {
    const meters = parseFloat(existing) || 0;
    if (meters > 0) {
      const miles = meters / 1609.34;
      return {
        distanceStr: formatDistanceMiles(miles),
        distanceMiles: miles
      };
    }
  }

  return deterministicResult;
}

/**
 * Returns numeric distance in miles for sorting.
 */
export function getNumericDistanceMiles(
  profile: Partial<UserProfile>,
  userCoords?: { lat: number; lng: number } | null
): number {
  return resolveUserDistance(profile, userCoords).distanceMiles;
}
