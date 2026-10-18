import { UserProfile } from '../../types';

export interface GeoPrivacyOptions {
  /**
   * Minimum blur radius in meters (default: 350 meters ~ 0.22 miles)
   */
  minRadiusMeters?: number;
  /**
   * Maximum blur radius in meters (default: 750 meters ~ 0.47 miles)
   */
  maxRadiusMeters?: number;
  /**
   * Optional seed (e.g., user.id) to ensure stable position during a session
   */
  seed?: string;
  /**
   * Epoch time window in milliseconds for rotating fuzzy offset (default: 24h)
   */
  windowMs?: number;
}

/**
 * Deterministic hash function for string inputs.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Obfuscates exact GPS coordinates into a general area to prevent precise location exposure.
 * Uses polar coordinate displacement with a stable deterministic seed per user per time window.
 */
export function fuzzCoordinates(
  coords: { lat: number; lng: number },
  options: GeoPrivacyOptions = {}
): { lat: number; lng: number } {
  if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
    return { lat: 34.0522, lng: -118.2437 }; // Safe fallback
  }

  const {
    minRadiusMeters = 300,
    maxRadiusMeters = 750,
    seed = 'default_salt',
    windowMs = 24 * 60 * 60 * 1000 // 24 hours
  } = options;

  // Window bucket ensures location stays stable during the day
  const timeBucket = Math.floor(Date.now() / windowMs);
  const combinedSeed = `${seed}:${timeBucket}`;
  
  const hash1 = hashString(`${combinedSeed}:angle`);
  const hash2 = hashString(`${combinedSeed}:dist`);

  // Random angle in radians [0, 2*PI)
  const angle = ((hash1 % 3600) / 3600) * 2 * Math.PI;

  // Distance between min and max radius
  const distFactor = (hash2 % 1000) / 1000;
  const radius = minRadiusMeters + distFactor * (maxRadiusMeters - minRadiusMeters);

  // Conversion: 1 degree latitude ~ 111,320 meters
  const deltaLat = (radius * Math.cos(angle)) / 111320;
  
  // 1 degree longitude ~ 111,320 * cos(lat) meters
  const latRad = (coords.lat * Math.PI) / 180;
  const deltaLng = (radius * Math.sin(angle)) / (111320 * Math.max(Math.cos(latRad), 0.1));

  return {
    lat: Number((coords.lat + deltaLat).toFixed(5)),
    lng: Number((coords.lng + deltaLng).toFixed(5))
  };
}

/**
 * Creates a GeoJSON Polygon circle around a coordinate to represent an approximate privacy zone.
 */
export function createPrivacyZoneGeoJSON(
  center: { lat: number; lng: number },
  radiusMeters: number = 500,
  points: number = 40
): any {
  const coordinates: [number, number][] = [];
  const latRad = (center.lat * Math.PI) / 180;

  for (let i = 0; i <= points; i++) {
    const angle = (i * 2 * Math.PI) / points;
    const dLat = (radiusMeters * Math.cos(angle)) / 111320;
    const dLng = (radiusMeters * Math.sin(angle)) / (111320 * Math.max(Math.cos(latRad), 0.1));

    coordinates.push([
      Number((center.lng + dLng).toFixed(5)),
      Number((center.lat + dLat).toFixed(5))
    ]);
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates]
    },
    properties: {
      radiusMeters
    }
  };
}

/**
 * Sanitizes an array of user profiles by applying privacy coordinate fuzzing.
 */
export function anonymizeProfilesForMap(
  profiles: UserProfile[],
  options: GeoPrivacyOptions = {}
): UserProfile[] {
  return profiles.map(profile => {
    if (!profile.coordinates) return profile;

    const fuzzed = fuzzCoordinates(profile.coordinates, {
      ...options,
      seed: profile.id || profile.name || 'member'
    });

    return {
      ...profile,
      coordinates: fuzzed
    };
  });
}
