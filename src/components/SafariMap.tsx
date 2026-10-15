'use client';

import React, { useEffect, useRef, useState } from 'react';
import { DroneTelemetry, MapFeature } from '@/types/safari';
import { MapPin, Navigation, Layers, Satellite, Map as MapIcon, Loader2 } from 'lucide-react';

interface SafariMapProps {
  telemetry?: DroneTelemetry;
  mapFeatures?: MapFeature[];
  onSelectFeature?: (feature: MapFeature) => void;
}

export const SafariMap: React.FC<SafariMapProps> = ({ telemetry }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const userAccuracyCircleRef = useRef<any>(null);

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
  } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('Detecting your location...');
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');
  const [isLocating, setIsLocating] = useState<boolean>(true);

  const tileLayersRef = useRef<{ streets?: any; satellite?: any }>({});

  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      const L = (await import('leaflet')).default;

      if (!isMounted || mapInstanceRef.current) return;
      leafletRef.current = L;

      // Default fallback coordinates (will update immediately to user location)
      const defaultLat = telemetry?.latitude ?? -18.6292;
      const defaultLng = telemetry?.longitude ?? 26.9501;

      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 15,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Google Maps Standard Roadmap Tiles
      const googleStreets = L.tileLayer(
        'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        {
          attribution: '&copy; Google Maps',
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        }
      );

      // Google Maps Satellite / Hybrid Tiles
      const googleSatellite = L.tileLayer(
        'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        {
          attribution: '&copy; Google Maps Satellite',
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        }
      );

      googleStreets.addTo(map);

      tileLayersRef.current = {
        streets: googleStreets,
        satellite: googleSatellite,
      };

      mapInstanceRef.current = map;

      // Create Google Maps style pulsing blue dot icon
      const createBlueDotIcon = () => {
        return L.divIcon({
          className: 'custom-user-location-marker',
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
              <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(66, 133, 244, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: relative; width: 16px; height: 16px; border-radius: 50%; background: #1a73e8; border: 3px solid #ffffff; box-shadow: 0 1px 4px rgba(0,0,0,0.4);"></div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
      };

      // Request real user geolocation from browser
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!isMounted) return;
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const acc = pos.coords.accuracy;

            setUserLocation({ lat, lng, accuracy: acc });
            setLocationStatus('Location found');
            setIsLocating(false);

            map.setView([lat, lng], 16);

            // Add accuracy circle
            if (acc) {
              const circle = L.circle([lat, lng], {
                radius: acc,
                color: '#1a73e8',
                weight: 1,
                fillColor: '#4285f4',
                fillOpacity: 0.15,
              }).addTo(map);
              userAccuracyCircleRef.current = circle;
            }

            // Add User Blue Dot Marker
            const marker = L.marker([lat, lng], {
              icon: createBlueDotIcon(),
            })
              .addTo(map)
              .bindPopup(`
                <div style="font-family: sans-serif; font-size: 12px; color: #1e293b; padding: 4px; text-align: center;">
                  <strong style="color: #1a73e8;">Your Location</strong><br/>
                  ${lat.toFixed(5)}°, ${lng.toFixed(5)}°<br/>
                  <span style="font-size: 10px; color: #64748b;">Accurate to ~${Math.round(acc)}m</span>
                </div>
              `);
            userMarkerRef.current = marker;
          },
          (err) => {
            if (!isMounted) return;
            console.warn('Geolocation error:', err.message);
            setLocationStatus('GPS permission needed (showing default)');
            setIsLocating(false);

            // Place marker at default coords
            const marker = L.marker([defaultLat, defaultLng], {
              icon: createBlueDotIcon(),
            })
              .addTo(map)
              .bindPopup('<strong>Map Center</strong>');
            userMarkerRef.current = marker;
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        setLocationStatus('Geolocation not supported by browser');
        setIsLocating(false);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      userMarkerRef.current = null;
      userAccuracyCircleRef.current = null;
      leafletRef.current = null;
    };
  }, [telemetry]);

  // Center map on user location
  const handleCenterOnUser = () => {
    if (!mapInstanceRef.current) return;
    if (userLocation) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 16, {
        animate: true,
      });
      if (userMarkerRef.current) {
        userMarkerRef.current.openPopup();
      }
    } else if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      setIsLocating(true);
      setLocationStatus('Locating...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation({ lat, lng, accuracy: pos.coords.accuracy });
          setLocationStatus('Location found');
          setIsLocating(false);
          mapInstanceRef.current?.setView([lat, lng], 16);
        },
        () => {
          setLocationStatus('Unable to retrieve location');
          setIsLocating(false);
        }
      );
    }
  };

  // Toggle between Google Map view and Google Satellite view
  const handleToggleMapType = (type: 'streets' | 'satellite') => {
    const map = mapInstanceRef.current;
    const layers = tileLayersRef.current;
    if (!map || !layers.streets || !layers.satellite) return;

    if (type === 'streets') {
      map.removeLayer(layers.satellite);
      layers.streets.addTo(map);
    } else {
      map.removeLayer(layers.streets);
      layers.satellite.addTo(map);
    }
    setMapType(type);
  };

  return (
    <div className="relative w-full h-[360px] rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-xl flex flex-col font-sans">
      {/* Top Header Controls Overlay */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        {/* Title & Status */}
        <div className="bg-white/95 text-slate-800 shadow-md px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-medium pointer-events-auto border border-slate-200">
          <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="font-semibold text-slate-900">Google Maps</span>
          <span className="text-slate-300">|</span>
          {isLocating ? (
            <span className="text-blue-600 flex items-center gap-1 text-[11px]">
              <Loader2 className="w-3 h-3 animate-spin" />
              Locating you...
            </span>
          ) : userLocation ? (
            <span className="text-emerald-700 flex items-center gap-1.5 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Your location found
            </span>
          ) : (
            <span className="text-slate-500 text-[11px]">{locationStatus}</span>
          )}
        </div>

        {/* Map View & Re-Center Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Map Layer Switcher: Street vs Satellite */}
          <div className="bg-white/95 text-slate-700 shadow-md p-1 rounded-lg border border-slate-200 flex items-center gap-1 text-xs font-medium">
            <button
              onClick={() => handleToggleMapType('streets')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                mapType === 'streets'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map</span>
            </button>
            <button
              onClick={() => handleToggleMapType('satellite')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                mapType === 'satellite'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Satellite className="w-3.5 h-3.5" />
              <span>Satellite</span>
            </button>
          </div>

          {/* Re-center button */}
          <button
            onClick={handleCenterOnUser}
            className="bg-white/95 hover:bg-slate-50 text-slate-700 hover:text-blue-600 shadow-md p-2 rounded-lg border border-slate-200 transition-colors flex items-center justify-center"
            title="Center on my location"
          >
            <Navigation className="w-4 h-4 text-blue-600" />
          </button>
        </div>
      </div>

      {/* Map DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Bottom Coordinates Strip */}
      <div className="absolute bottom-2 left-2 z-10 bg-white/95 text-slate-800 shadow-md px-3 py-1 rounded-lg border border-slate-200 text-[11px] flex items-center gap-3">
        {userLocation ? (
          <>
            <span className="flex items-center gap-1 text-slate-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              Lat: {userLocation.lat.toFixed(5)}°, Lng: {userLocation.lng.toFixed(5)}°
            </span>
            {userLocation.accuracy && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">
                  Accuracy: ±{Math.round(userLocation.accuracy)}m
                </span>
              </>
            )}
          </>
        ) : (
          <span className="text-slate-500 italic">Click the navigation arrow to locate yourself</span>
        )}
      </div>
    </div>
  );
};
