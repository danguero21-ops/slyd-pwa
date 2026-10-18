import React from 'react';
import OpenStreetMapLibreView from './OpenStreetMapLibreView';
import { UserProfile } from '../types';

export interface MapViewProps {
  profiles: UserProfile[];
  userLocation: { lat: number; lng: number } | null;
  onSelect: (profile: UserProfile) => void;
  onChat?: (profile: UserProfile) => void;
  isPremium?: boolean;
  onPremiumClick?: (featureName?: string) => void;
  teleportLocation?: { name: string; lat: number; lng: number } | null;
  onSetTeleportLocation?: (loc: { name: string; lat: number; lng: number } | null) => void;
  myAvailabilityMode?: 'right_now' | 'later';
}

/**
 * OpenStreetMap & MapLibre GL JS MapView with built-in location privacy fuzzing.
 * Replaces legacy Google Maps API with zero-API-key OpenStreetMap / Carto Dark Matter tiles.
 */
export const MapView: React.FC<MapViewProps> = (props) => {
  return <OpenStreetMapLibreView {...props} />;
};

export default MapView;
export { OpenStreetMapLibreView };
