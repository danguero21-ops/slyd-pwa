import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { UserProfile, hasActivePremiumSubscription } from '../types';
import { 
  Compass, 
  MapPin, 
  Sparkles, 
  ShieldCheck, 
  MessageSquare, 
  Lock, 
  Eye, 
  Navigation, 
  Plus, 
  Minus, 
  Layers, 
  ShieldAlert,
  Shield
} from 'lucide-react';
import { getUserPresenceInfo, isUserTrulyOnline } from '../src/lib/presence';
import { fuzzCoordinates, createPrivacyZoneGeoJSON } from '../src/lib/geoPrivacy';

interface OpenStreetMapLibreViewProps {
  profiles: UserProfile[];
  userLocation: { lat: number; lng: number } | null;
  onSelect?: (profile: UserProfile) => void;
  onSelectProfile?: (profile: UserProfile) => void;
  onChat?: (profile: UserProfile) => void;
  isPremium?: boolean;
  onPremiumClick?: (featureName?: string) => void;
  teleportLocation?: { name: string; lat: number; lng: number } | null;
  onSetTeleportLocation?: (loc: { name: string; lat: number; lng: number } | null) => void;
  myAvailabilityMode?: 'right_now' | 'later' | null;
}

const DEFAULT_COORDS = { lat: 34.0522, lng: -118.2437 }; // Los Angeles fallback

// Curated destinations for Slyd+ Global Roam feature
const ROAM_DESTINATIONS = [
  { name: 'Los Angeles (West Hollywood)', lat: 34.0900, lng: -118.3617 },
  { name: 'New York (Hell\'s Kitchen)', lat: 40.7638, lng: -73.9918 },
  { name: 'London (Soho)', lat: 51.5136, lng: -0.1365 },
  { name: 'Paris (Le Marais)', lat: 48.8575, lng: 2.3585 },
  { name: 'Berlin (Schöneberg)', lat: 52.4827, lng: 13.3579 },
  { name: 'Madrid (Chueca)', lat: 40.4226, lng: -3.6974 },
  { name: 'Tokyo (Shinjuku)', lat: 35.6938, lng: 139.7034 },
  { name: 'Sydney (Darlinghurst)', lat: -33.8800, lng: 151.2180 }
];

// OpenStreetMap & Carto Dark Matter Vector/Raster Styles
const MAP_STYLES = {
  dark: {
    name: 'SlyD Dark (OSM / Carto)',
    url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
  },
  osm_standard: {
    name: 'OpenStreetMap Standard',
    style: {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: [
            'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'osm-tiles-layer',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    }
  }
};

// Singleton script loader for MapLibre GL JS & CSS
let maplibreScriptPromise: Promise<any> | null = null;
function loadMapLibreGL(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window unavailable'));
  if ((window as any).maplibregl) return Promise.resolve((window as any).maplibregl);

  if (!maplibreScriptPromise) {
    maplibreScriptPromise = new Promise((resolve, reject) => {
      // Inject CSS
      if (!document.getElementById('maplibre-gl-css')) {
        const link = document.createElement('link');
        link.id = 'maplibre-gl-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
        document.head.appendChild(link);
      }

      // Inject JS
      const script = document.createElement('script');
      script.id = 'maplibre-gl-js';
      script.src = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';
      script.async = true;
      script.onload = () => {
        resolve((window as any).maplibregl);
      };
      script.onerror = (err) => {
        maplibreScriptPromise = null;
        reject(err);
      };
      document.body.appendChild(script);
    });
  }

  return maplibreScriptPromise;
}

export const OpenStreetMapLibreView: React.FC<OpenStreetMapLibreViewProps> = ({
  profiles,
  userLocation,
  onSelect,
  onSelectProfile,
  onChat,
  isPremium = false,
  onPremiumClick,
  teleportLocation,
  onSetTeleportLocation,
  myAvailabilityMode = 'right_now'
}) => {
  const handleSelect = onSelect || onSelectProfile || (() => {});
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [showRoamPicker, setShowRoamPicker] = useState(false);
  const [activeStyleKey, setActiveStyleKey] = useState<'dark' | 'osm_standard'>('dark');
  const [rightNowOnly, setRightNowOnly] = useState<boolean>(myAvailabilityMode === 'right_now');

  // Privacy module: Obfuscate user and member coordinates deterministically
  const fuzzedUserLocation = useMemo(() => {
    if (!userLocation) return null;
    return fuzzCoordinates(userLocation, {
      minRadiusMeters: 300,
      maxRadiusMeters: 600,
      seed: 'my_current_device_location'
    });
  }, [userLocation]);

  const fuzzedProfiles = useMemo(() => {
    return profiles.map(p => {
      const coords = p.coordinates || DEFAULT_COORDS;
      const randomized = fuzzCoordinates(coords, {
        minRadiusMeters: 350,
        maxRadiusMeters: 750,
        seed: p.id || p.name
      });
      return {
        ...p,
        coordinates: randomized
      };
    });
  }, [profiles]);

  const displayedProfiles = useMemo(() => {
    if (!rightNowOnly) return fuzzedProfiles;
    return fuzzedProfiles.filter(
      p => p.availabilityMode === 'right_now' || (Array.isArray(p.lookingFor) && p.lookingFor.includes('Right Now'))
    );
  }, [fuzzedProfiles, rightNowOnly]);

  const activeCenter = useMemo(() => {
    if (teleportLocation) {
      return { lat: teleportLocation.lat, lng: teleportLocation.lng };
    }
    if (fuzzedUserLocation) {
      return fuzzedUserLocation;
    }
    if (displayedProfiles[0]?.coordinates) {
      return displayedProfiles[0].coordinates;
    }
    return DEFAULT_COORDS;
  }, [teleportLocation, fuzzedUserLocation, displayedProfiles]);

  // Initialize MapLibre GL
  useEffect(() => {
    let isCancelled = false;

    loadMapLibreGL()
      .then((maplibregl) => {
        if (isCancelled || !mapContainerRef.current) return;

        if (!mapInstanceRef.current) {
          const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: MAP_STYLES.dark.url,
            center: [activeCenter.lng, activeCenter.lat],
            zoom: 13.5,
            attributionControl: false
          });

          // Add compact navigation controls in top-right
          map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
          map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

          map.on('load', () => {
            if (isCancelled) return;
            setMapLoaded(true);
            setLoadError(null);
          });

          map.on('error', (e: any) => {
            console.warn('MapLibre style load event, falling back to OSM standard raster:', e);
            // Fallback to standard raster tiles if Carto vector gl fails
            try {
              map.setStyle(MAP_STYLES.osm_standard.style);
            } catch {}
          });

          mapInstanceRef.current = map;
        } else {
          mapInstanceRef.current.easeTo({
            center: [activeCenter.lng, activeCenter.lat],
            duration: 800
          });
        }
      })
      .catch((err) => {
        console.error('Failed to load MapLibre GL:', err);
        setLoadError('Failed to initialize OpenStreetMap viewer.');
      });

    return () => {
      isCancelled = true;
    };
  }, [activeCenter]);

  // Update privacy zone circular layer when a profile is selected
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const sourceId = 'slyd-privacy-zone-source';
    const fillLayerId = 'slyd-privacy-zone-fill';
    const lineLayerId = 'slyd-privacy-zone-line';

    if (!selectedProfile?.coordinates) {
      if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      return;
    }

    const geojsonData = createPrivacyZoneGeoJSON(selectedProfile.coordinates, 500);

    if (map.getSource(sourceId)) {
      map.getSource(sourceId).setData(geojsonData);
    } else {
      map.addSource(sourceId, {
        type: 'geojson',
        data: geojsonData
      });

      map.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': '#0284c7', // Sky-600
          'fill-opacity': 0.18
        }
      });

      map.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#38bdf8', // Sky-400
          'line-width': 2,
          'line-dasharray': [3, 2]
        }
      });
    }
  }, [selectedProfile, mapLoaded]);

  // Render User Location Pulse Marker
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !fuzzedUserLocation) return;
    const maplibregl = (window as any).maplibregl;
    if (!maplibregl) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    const el = document.createElement('div');
    el.className = 'slyd-user-location-marker relative flex items-center justify-center';
    el.innerHTML = `
      <div class="relative flex items-center justify-center">
        <span class="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-sky-400/40 opacity-75"></span>
        <div class="relative w-6 h-6 rounded-full bg-sky-500 border-2 border-white shadow-xl flex items-center justify-center">
          <div class="w-2 h-2 rounded-full bg-white"></div>
        </div>
      </div>
    `;

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([fuzzedUserLocation.lng, fuzzedUserLocation.lat])
      .addTo(mapInstanceRef.current);

    userMarkerRef.current = marker;

    return () => {
      marker.remove();
    };
  }, [mapLoaded, fuzzedUserLocation]);

  // Render Profile Markers on MapLibre
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;
    const maplibregl = (window as any).maplibregl;
    if (!maplibregl) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    displayedProfiles.forEach(p => {
      if (!p.coordinates) return;

      const isSelected = selectedProfile?.id === p.id;
      const isOnline = isUserTrulyOnline(p);
      const isVerified = Boolean(p.isVerified);

      const el = document.createElement('div');
      el.className = 'cursor-pointer select-none transition-transform duration-200 hover:scale-110 active:scale-95';
      el.style.width = isSelected ? '56px' : '44px';
      el.style.height = isSelected ? '56px' : '44px';

      el.innerHTML = `
        <div class="relative w-full h-full rounded-2xl overflow-hidden border-2 shadow-2xl transition-all ${
          isSelected 
            ? 'border-sky-400 ring-4 ring-sky-500/40 scale-105' 
            : 'border-slate-800 hover:border-sky-400/80'
        } bg-slate-900">
          <img src="${p.imageUrl}" alt="${p.name}" class="w-full h-full object-cover" />
          ${
            isOnline 
              ? '<span class="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-950 shadow-[0_0_8px_#34d399] animate-pulse"></span>' 
              : ''
          }
          ${
            isVerified 
              ? '<span class="absolute top-1 left-1 w-3.5 h-3.5 rounded-md bg-sky-500 text-white flex items-center justify-center text-[8px] font-black shadow-md">✓</span>' 
              : ''
          }
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedProfile(p);
        mapInstanceRef.current?.easeTo({
          center: [p.coordinates.lng, p.coordinates.lat],
          duration: 500,
          zoom: Math.max(mapInstanceRef.current.getZoom(), 14)
        });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([p.coordinates.lng, p.coordinates.lat])
        .addTo(mapInstanceRef.current);

      markersRef.current.push(marker);
    });
  }, [displayedProfiles, selectedProfile, mapLoaded]);

  // Recenter handler
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    const target = fuzzedUserLocation || activeCenter;
    mapInstanceRef.current.flyTo({
      center: [target.lng, target.lat],
      zoom: 14,
      essential: true
    });
  };

  // Switch map tile style
  const handleToggleStyle = () => {
    if (!mapInstanceRef.current) return;
    const nextKey = activeStyleKey === 'dark' ? 'osm_standard' : 'dark';
    setActiveStyleKey(nextKey);
    if (nextKey === 'dark') {
      mapInstanceRef.current.setStyle(MAP_STYLES.dark.url);
    } else {
      mapInstanceRef.current.setStyle(MAP_STYLES.osm_standard.style);
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Load error message if any */}
      {loadError && (
        <div className="absolute top-4 left-4 right-4 z-30 p-3 rounded-2xl bg-red-950/90 border border-red-500/40 text-red-200 text-xs font-bold shadow-2xl flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Top Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Right Now Filter Pill */}
          <button
            type="button"
            onClick={() => setRightNowOnly(prev => !prev)}
            className={`pointer-events-auto rounded-full border px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider shadow-2xl backdrop-blur-xl flex items-center gap-1.5 transition-all ${
              rightNowOnly
                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                : 'bg-slate-900/85 border-slate-800 text-slate-200 hover:border-emerald-500/40'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${rightNowOnly ? 'bg-slate-950 animate-pulse' : 'bg-emerald-400'}`} />
            <span>{rightNowOnly ? `Right Now (${displayedProfiles.length})` : `All Nearby (${displayedProfiles.length})`}</span>
          </button>

          {/* Privacy Zone Indicator Pill */}
          <div className="pointer-events-auto rounded-full border border-sky-500/30 bg-slate-900/85 px-3 py-1 text-[9px] font-bold text-sky-300 shadow-2xl backdrop-blur-xl flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-sky-400" />
            <span>Privacy Guard Active · ~500m General Area</span>
          </div>

          {/* Roam / Destination Picker Button */}
          <button
            type="button"
            onClick={() => setShowRoamPicker(!showRoamPicker)}
            className={`pointer-events-auto rounded-full border px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider shadow-2xl backdrop-blur-xl flex items-center gap-1.5 transition-colors ${
              teleportLocation
                ? 'bg-sky-500 text-white border-sky-400'
                : 'bg-slate-900/85 border-slate-800 text-sky-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{teleportLocation ? `Roam: ${teleportLocation.name}` : 'Global Roam'}</span>
            {!isPremium && <Lock className="w-3 h-3 text-slate-400" />}
          </button>
        </div>

        {/* Global Roam Modal Drawer */}
        {showRoamPicker && (
          <div className="pointer-events-auto bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-3xl p-4 shadow-2xl space-y-3 max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-sky-400" />
                <span>Slyd+ Global Roam / Teleport</span>
              </span>
              <button
                type="button"
                onClick={() => setShowRoamPicker(false)}
                className="text-xs text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Explore profiles and connections in other cities without exposing your real location.
            </p>
            <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto no-scrollbar">
              {ROAM_DESTINATIONS.map(city => {
                const isSelected = teleportLocation?.name === city.name;
                return (
                  <button
                    key={city.name}
                    type="button"
                    onClick={() => {
                      if (!isPremium) {
                        onPremiumClick?.('Global Roam / Teleport');
                        return;
                      }
                      onSetTeleportLocation?.(city);
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.flyTo({ center: [city.lng, city.lat], zoom: 13.5 });
                      }
                      setShowRoamPicker(false);
                    }}
                    className={`px-3 py-2 rounded-xl border text-left text-xs font-bold transition-all truncate ${
                      isSelected
                        ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-950'
                        : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-sky-500/40'
                    }`}
                  >
                    {city.name}
                  </button>
                );
              })}
            </div>
            {teleportLocation && (
              <button
                type="button"
                onClick={() => {
                  onSetTeleportLocation?.(null);
                  setShowRoamPicker(false);
                  handleRecenter();
                }}
                className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-colors"
              >
                Reset to Current GPS Area
              </button>
            )}
          </div>
        )}
      </div>

      {/* Floating Action Buttons: Tile Style Toggle & Recenter on GPS */}
      <div className="absolute right-4 bottom-24 z-20 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleToggleStyle}
          title="Toggle Map Style (Dark / Standard OSM)"
          className="w-11 h-11 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-sky-400 backdrop-blur-xl flex items-center justify-center shadow-xl active:scale-95 transition-all"
        >
          <Layers className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={handleRecenter}
          title="Recenter on My Location"
          className="w-11 h-11 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white shadow-xl shadow-sky-950/60 flex items-center justify-center active:scale-95 transition-all"
        >
          <Navigation className="w-5 h-5" />
        </button>
      </div>

      {/* Selected Member Floating Preview Card */}
      {selectedProfile && (
        <div className="absolute bottom-6 left-4 right-4 z-30 max-w-sm mx-auto bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-3xl p-3.5 shadow-2xl animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-3">
            <div 
              onClick={() => handleSelect(selectedProfile)}
              className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 cursor-pointer border border-slate-700 shadow-md group"
            >
              <img src={selectedProfile.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              {isUserTrulyOnline(selectedProfile) && (
                <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-950 animate-pulse" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-baseline gap-1.5 truncate">
                  <h3 
                    onClick={() => handleSelect(selectedProfile)}
                    className="text-sm font-black text-white truncate cursor-pointer hover:text-sky-300"
                  >
                    {selectedProfile.name}
                  </h3>
                  <span className="text-xs text-slate-400 font-bold">{selectedProfile.age}</span>
                </div>
                {selectedProfile.isVerified && (
                  <span className="p-1 rounded-md bg-sky-500/20 text-sky-300 text-[9px] font-black flex items-center gap-0.5 border border-sky-500/30">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    <span>Verified</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1 text-[11px] text-sky-400 font-bold">
                <MapPin className="w-3 h-3 shrink-0" />
                <span>{selectedProfile.distance || '350 ft'}</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-300">
                  {getUserPresenceInfo(selectedProfile).shortLastSeen}
                </span>
                {selectedProfile.role && (
                  <>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-300 uppercase">{selectedProfile.role}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={() => handleSelect(selectedProfile)}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span>View Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChat(selectedProfile)}
                  className="py-1.5 px-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-md shadow-sky-950 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpenStreetMapLibreView;
