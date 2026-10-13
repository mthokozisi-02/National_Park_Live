'use client';

import React, { useEffect, useRef } from 'react';
import { DroneTelemetry, MapFeature, WildlifeDetection } from '@/types/safari';
import { MapPin, Navigation2, Compass, Layers } from 'lucide-react';

interface SafariMapProps {
  telemetry: DroneTelemetry;
  mapFeatures: MapFeature[];
  onSelectFeature?: (feature: MapFeature) => void;
}

export const SafariMap: React.FC<SafariMapProps> = ({
  telemetry,
  mapFeatures,
  onSelectFeature,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const droneMarkerRef = useRef<any>(null);
  const trailPolylineRef = useRef<any>(null);
  const trailPointsRef = useRef<[number, number][]>([]);

  useEffect(() => {
    let isMounted = true;

    // Dynamically import Leaflet on client side
    const initMap = async () => {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      const L = (await import('leaflet')).default;

      if (!isMounted || mapInstanceRef.current) return;

      // Base coordinates around Hwange National Park
      const initialLat = telemetry.latitude;
      const initialLng = telemetry.longitude;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 14,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Topographic / Satellite style tiles (CartoDB Dark Matter for futuristic tactical look)
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          maxZoom: 19,
          subdomains: 'abcd',
        }
      ).addTo(map);

      mapInstanceRef.current = map;

      // Custom Drone Marker Icon with Heading Rotation
      const createDroneIcon = (heading: number) => {
        return L.divIcon({
          className: 'custom-drone-icon',
          html: `
            <div style="transform: rotate(${heading}deg); transition: transform 0.3s ease; display: flex; align-items: center; justify-content: center; width: 42px; height: 42px;">
              <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; border: 1.5px dashed rgba(6, 182, 212, 0.6); animation: spin 8s linear infinite;"></div>
              <div style="background: rgba(14, 165, 233, 0.9); width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 16px #06b6d4; border: 2px solid #ffffff;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
                </svg>
              </div>
            </div>
          `,
          iconSize: [42, 42],
          iconAnchor: [21, 21],
        });
      };

      // Add Drone Marker
      const droneMarker = L.marker([telemetry.latitude, telemetry.longitude], {
        icon: createDroneIcon(telemetry.heading),
      })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: monospace; font-size: 11px; color: #0f172a; padding: 4px;">
            <strong>${telemetry.droneId}</strong><br/>
            Alt: ${telemetry.altitude.toFixed(1)}m AGL<br/>
            Speed: ${telemetry.speed.toFixed(1)} km/h
          </div>
        `);
      droneMarkerRef.current = droneMarker;

      // Add Trail Polyline
      trailPointsRef.current = [[telemetry.latitude, telemetry.longitude]];
      const trail = L.polyline(trailPointsRef.current, {
        color: '#06b6d4',
        weight: 3,
        dashArray: '6, 8',
        opacity: 0.8,
      }).addTo(map);
      trailPolylineRef.current = trail;

      // Add Wildlife & Point-of-Interest Markers
      mapFeatures.forEach((feat) => {
        if (feat.type === 'drone') return; // Handled separately

        let iconColor = '#f59e0b';
        let badgeSymbol = '🐾';
        if (feat.icon === 'elephant') {
          badgeSymbol = '🐘';
          iconColor = '#38bdf8';
        } else if (feat.icon === 'giraffe') {
          badgeSymbol = '🦒';
          iconColor = '#fbbf24';
        } else if (feat.icon === 'lion') {
          badgeSymbol = '🦁';
          iconColor = '#ef4444';
        } else if (feat.icon === 'waterhole') {
          badgeSymbol = '💧';
          iconColor = '#3b82f6';
        } else if (feat.icon === 'ranger') {
          badgeSymbol = '🛡️';
          iconColor = '#10b981';
        }

        const featureIcon = L.divIcon({
          className: 'custom-feature-icon',
          html: `
            <div style="background: ${iconColor}; color: #ffffff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px ${iconColor}; border: 2px solid #ffffff; font-size: 15px; cursor: pointer;">
              ${badgeSymbol}
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker(feat.coordinates, { icon: featureIcon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: monospace; font-size: 12px; color: #0f172a; padding: 4px;">
            <strong style="color: #0369a1;">${feat.title}</strong><br/>
            <span style="color: #64748b;">${feat.subtitle || ''}</span>
          </div>
        `);

        marker.on('click', () => {
          if (onSelectFeature) onSelectFeature(feat);
        });
      });
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update drone marker position and heading when telemetry updates
  useEffect(() => {
    if (!mapInstanceRef.current || !droneMarkerRef.current) return;
    import('leaflet').then((L) => {
      const latlng: [number, number] = [telemetry.latitude, telemetry.longitude];
      droneMarkerRef.current.setLatLng(latlng);

      // Re-create rotated icon
      const updatedIcon = L.divIcon({
        className: 'custom-drone-icon',
        html: `
          <div style="transform: rotate(${telemetry.heading}deg); transition: transform 0.3s ease; display: flex; align-items: center; justify-content: center; width: 42px; height: 42px;">
            <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; border: 1.5px dashed rgba(6, 182, 212, 0.6);"></div>
            <div style="background: rgba(14, 165, 233, 0.9); width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 16px #06b6d4; border: 2px solid #ffffff;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
              </svg>
            </div>
          </div>
        `,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      });
      droneMarkerRef.current.setIcon(updatedIcon);

      // Update flight trail
      if (trailPolylineRef.current) {
        const last = trailPointsRef.current[trailPointsRef.current.length - 1];
        if (!last || last[0] !== latlng[0] || last[1] !== latlng[1]) {
          trailPointsRef.current.push(latlng);
          trailPolylineRef.current.setLatLngs(trailPointsRef.current);
        }
      }
    });
  }, [telemetry.latitude, telemetry.longitude, telemetry.heading]);

  return (
    <div className="relative w-full h-[360px] rounded-xl overflow-hidden border border-cyan-500/20 bg-slate-900 shadow-xl flex flex-col">
      {/* Map Header Overlay */}
      <div className="absolute top-3 left-3 z-10 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-500/30 flex items-center gap-2 text-xs font-mono">
        <Compass className="w-3.5 h-3.5 text-cyan-400" />
        <span className="font-bold text-gray-200">HWANGE TACTICAL MAP</span>
        <span className="text-gray-500">|</span>
        <span className="text-cyan-400">SAT FEED GPS ACTIVE</span>
      </div>

      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Map Legend Footer */}
      <div className="absolute bottom-2 left-2 z-10 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-4 text-[10px] font-mono text-gray-300">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
          <span>Active Drone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span>Tracked Wildlife</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span>Waterholes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Ranger Station</span>
        </div>
      </div>
    </div>
  );
};
