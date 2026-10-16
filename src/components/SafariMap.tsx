'use client';

import React, { useEffect, useRef, useState } from 'react';
import { DroneTelemetry, MapFeature } from '@/types/safari';
import { WildlifeSighting } from '@/types/sightings';
import { sightingsService } from '@/services/sightingsService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPaw,
  faCrosshairs,
  faCompass,
  faRoute,
  faFire,
  faLocationDot,
  faRotateRight,
  faMap,
  faSatellite,
  faLocationArrow,
  faBinoculars,
  faShieldHalved,
  faFeather,
  faCircleNotch,
} from '@fortawesome/free-solid-svg-icons';

interface SafariMapProps {
  telemetry?: DroneTelemetry;
  mapFeatures?: MapFeature[];
  onSelectFeature?: (feature: MapFeature) => void;
  onSelectSighting?: (sighting: WildlifeSighting) => void;
  activeDestination?: WildlifeSighting | null;
  onClearDestination?: () => void;
}

const SPECIES_FILTERS = [
  { id: 'all', label: 'All Species', icon: faPaw },
  { id: 'African Elephant', label: 'Elephant', icon: faPaw },
  { id: 'Lion', label: 'Lion', icon: faCrosshairs },
  { id: 'Plains Zebra', label: 'Zebra', icon: faRoute },
  { id: 'Giraffe', label: 'Giraffe', icon: faBinoculars },
  { id: 'Cape Buffalo', label: 'Buffalo', icon: faShieldHalved },
  { id: 'Impala', label: 'Impala', icon: faFeather },
];

const AGE_FILTERS = [
  { id: 'all', label: 'All History', hours: undefined, dot: 'bg-slate-400' },
  { id: 'fresh', label: 'Fresh (<15m)', hours: 0.25, dot: 'bg-emerald-500' },
  { id: 'recent', label: 'Recent (<2h)', hours: 2.0, dot: 'bg-amber-500' },
  { id: 'today', label: 'Today (<24h)', hours: 24.0, dot: 'bg-blue-500' },
];

export const SafariMap: React.FC<SafariMapProps> = ({
  telemetry,
  onSelectSighting,
  activeDestination,
  onClearDestination,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const userAccuracyCircleRef = useRef<any>(null);
  const sightingsLayerGroupRef = useRef<any>(null);
  const heatmapLayerGroupRef = useRef<any>(null);
  const routePolylineRef = useRef<any>(null);

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
  } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('Detecting location...');
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');
  const [isLocating, setIsLocating] = useState<boolean>(true);

  // Sightings state
  const [sightings, setSightings] = useState<WildlifeSighting[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<string>('all');
  const [selectedAge, setSelectedAge] = useState<string>('all');
  const [isLoadingSightings, setIsLoadingSightings] = useState<boolean>(false);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);

  const tileLayersRef = useRef<{ streets?: any; satellite?: any }>({});

  // Load sightings from database / service
  const fetchSightings = async () => {
    setIsLoadingSightings(true);
    const ageFilterObj = AGE_FILTERS.find((a) => a.id === selectedAge);
    const results = await sightingsService.getSightings({
      species: selectedSpecies !== 'all' ? selectedSpecies : undefined,
      maxAgeHours: ageFilterObj?.hours,
    });
    setSightings(results);
    setIsLoadingSightings(false);
  };

  useEffect(() => {
    fetchSightings();
  }, [selectedSpecies, selectedAge]);

  // Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      const L = (await import('leaflet')).default;

      if (!isMounted || mapInstanceRef.current) return;
      leafletRef.current = L;

      // Default Hwange National Park focal coordinates (Nyamandhlovu Pan)
      const defaultLat = telemetry?.latitude ?? -18.6320;
      const defaultLng = telemetry?.longitude ?? 26.9535;

      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 13,
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

      // Create LayerGroups
      const sightingsGroup = L.layerGroup().addTo(map);
      sightingsLayerGroupRef.current = sightingsGroup;

      const heatmapGroup = L.layerGroup().addTo(map);
      heatmapLayerGroupRef.current = heatmapGroup;

      mapInstanceRef.current = map;

      // Google Maps style blue dot icon for user/driver position
      const createBlueDotIcon = () => {
        return L.divIcon({
          className: 'custom-user-location-marker',
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px;">
              <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(37, 99, 235, 0.25); border: 1px solid rgba(37, 99, 235, 0.5);"></div>
              <div style="position: relative; width: 14px; height: 14px; border-radius: 50%; background: #2563eb; border: 2.5px solid #ffffff; box-shadow: 0 1px 5px rgba(0,0,0,0.35);"></div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
      };

      // Request browser geolocation
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

            if (acc) {
              const circle = L.circle([lat, lng], {
                radius: acc,
                color: '#2563eb',
                weight: 1,
                fillColor: '#3b82f6',
                fillOpacity: 0.15,
              }).addTo(map);
              userAccuracyCircleRef.current = circle;
            }

            const marker = L.marker([lat, lng], {
              icon: createBlueDotIcon(),
            })
              .addTo(map)
              .bindPopup(`
                <div style="font-family: sans-serif; font-size: 12px; color: #1e293b; padding: 4px; text-align: center;">
                  <strong style="color: #2563eb;">Driver / Vehicle Location</strong><br/>
                  ${lat.toFixed(5)}°, ${lng.toFixed(5)}°<br/>
                  <span style="font-size: 10px; color: #64748b;">Accuracy: ±${Math.round(acc)}m</span>
                </div>
              `);
            userMarkerRef.current = marker;
          },
          (err) => {
            if (!isMounted) return;
            console.warn('Geolocation error:', err.message);
            setLocationStatus('GPS permission needed (showing Hwange)');
            setIsLocating(false);
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      } else {
        setLocationStatus('Geolocation not supported');
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
      sightingsLayerGroupRef.current = null;
      heatmapLayerGroupRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  // Render Heatmap density gradient layer
  useEffect(() => {
    const L = leafletRef.current;
    const heatGroup = heatmapLayerGroupRef.current;
    if (!L || !heatGroup) return;

    heatGroup.clearLayers();

    if (!showHeatmap) return;

    sightings.forEach((s) => {
      const radius = Math.min(1200, Math.max(300, (s.count || 1) * 75));
      L.circle([s.latitude, s.longitude], {
        radius: radius * 1.5,
        stroke: false,
        fillColor: '#f59e0b',
        fillOpacity: 0.2,
      }).addTo(heatGroup);

      L.circle([s.latitude, s.longitude], {
        radius: radius,
        stroke: false,
        fillColor: '#ea580c',
        fillOpacity: 0.35,
      }).addTo(heatGroup);

      L.circle([s.latitude, s.longitude], {
        radius: radius * 0.45,
        stroke: false,
        fillColor: '#dc2626',
        fillOpacity: 0.55,
      }).addTo(heatGroup);
    });
  }, [showHeatmap, sightings]);

  // Update Sightings Markers on Leaflet whenever sightings change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = leafletRef.current;
    const group = sightingsLayerGroupRef.current;

    if (!map || !L || !group) return;

    group.clearLayers();

    // Standard FontAwesome paw vector icon
    const pawSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" width="13" height="13">
        <path d="M226.5 92.9c14.3 42.9-.3 86.2-32.6 96.8s-70.1-15.6-84.4-58.5s.3-86.2 32.6-96.8s70.1 15.6 84.4 58.5zM100.4 198.6c18.9 32.4 14.3 70.1-10.2 84.1s-59.7-.9-78.5-33.3S-2.7 179.3 21.8 165.3s59.7 .9 78.5 33.3zM69.2 401.2C121.6 259.9 214.7 224 256 224s134.4 35.9 186.8 177.2c3.6 9.7 5.2 20.1 5.2 30.5l0 1.6c0 25.8-20.9 46.7-46.7 46.7c-11.5 0-22.9-1.4-34-4.2l-88-22c-15.3-3.8-31.3-3.8-46.6 0l-88 22c-11.1 2.8-22.5 4.2-34 4.2C84.9 480 64 459.1 64 433.3l0-1.6c0-10.4 1.6-20.8 5.2-30.5zM421.8 282.7c-24.5-14-29.1-51.7-10.2-84.1s54-47.3 78.5-33.3s29.1 51.7 10.2 84.1s-54 47.3-78.5 33.3zM318.1 189.7c-32.3-10.6-46.9-53.9-32.6-96.8s42.9-69.1 75.2-58.5s46.9 53.9 32.6 96.8s-42.9 69.1-75.2 58.5z"/>
      </svg>
    `;

    sightings.forEach((s) => {
      const ageCategory = sightingsService.getAgeCategory(s.timestamp);
      const timeAgo = sightingsService.formatTimeAgo(s.timestamp);

      let markerHtml = '';
      let badgeStyle = 'background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;';

      if (ageCategory === 'fresh') {
        badgeStyle = 'background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;';
        markerHtml = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;">
            <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(16, 185, 129, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 28px; height: 28px; border-radius: 50%; background: #ffffff; border: 2.5px solid #059669; color: #059669; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.25);">
              ${pawSvg}
            </div>
          </div>
        `;
      } else if (ageCategory === 'recent') {
        badgeStyle = 'background: #fffbeb; color: #b45309; border: 1px solid #fde68a;';
        markerHtml = `
          <div style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background: #ffffff; border: 2.5px solid #d97706; color: #d97706; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">
            ${pawSvg}
          </div>
        `;
      } else if (ageCategory === 'today') {
        badgeStyle = 'background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;';
        markerHtml = `
          <div style="display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: #ffffff; border: 2px solid #2563eb; color: #2563eb; box-shadow: 0 1px 4px rgba(0,0,0,0.18);">
            ${pawSvg}
          </div>
        `;
      } else {
        badgeStyle = 'background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;';
        markerHtml = `
          <div style="display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: #ffffff; border: 1.5px solid #64748b; color: #64748b; opacity: 0.85; box-shadow: 0 1px 3px rgba(0,0,0,0.15);">
            ${pawSvg}
          </div>
        `;
      }

      const icon = L.divIcon({
        className: 'custom-wildlife-marker',
        html: markerHtml,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker([s.latitude, s.longitude], { icon })
        .addTo(group)
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; min-width: 200px; color: #0f172a; padding: 4px; background: #ffffff;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
              <span style="font-weight: 700; font-size: 13px; color: #0f172a;">
                ${s.common_name}
              </span>
              <span style="font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; ${badgeStyle}">
                ${ageCategory.toUpperCase()}
              </span>
            </div>
            <div style="font-size: 11px; color: #334155; line-height: 1.4;">
              <div><strong>Group Count:</strong> ${s.count} animal${s.count > 1 ? 's' : ''}</div>
              <div><strong>Observed:</strong> ${timeAgo}</div>
              <div><strong>Confidence:</strong> ${Math.round(s.confidence * 100)}%</div>
              ${s.notes ? `<div style="font-style: italic; color: #64748b; font-size: 10px; margin-top: 3px;">"${s.notes}"</div>` : ''}
              <div style="font-size: 9px; color: #94a3b8; margin-top: 4px;">
                GPS: ${s.latitude.toFixed(5)}°, ${s.longitude.toFixed(5)}°
              </div>
            </div>
          </div>
        `);

      marker.on('click', () => {
        if (onSelectSighting) {
          onSelectSighting(s);
        }
      });
    });
  }, [sightings, onSelectSighting]);

  // Road Routing to Active Destination
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;

    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    if (!activeDestination) return;

    const originLat = userLocation?.lat ?? -18.7315;
    const originLng = userLocation?.lng ?? 26.9510;
    const destLat = activeDestination.latitude;
    const destLng = activeDestination.longitude;

    const midLat = (originLat + destLat) / 2.0;
    const midLng = (originLng + destLng) / 2.0 + 0.005;

    const routePoints = [
      [originLat, originLng],
      [midLat, midLng],
      [destLat, destLng],
    ];

    const polyline = L.polyline(routePoints, {
      color: '#d97706',
      weight: 5,
      opacity: 0.9,
      dashArray: '10, 8',
      lineCap: 'round',
    }).addTo(map);

    routePolylineRef.current = polyline;

    const bounds = L.latLngBounds([
      [originLat, originLng],
      [destLat, destLng],
    ]);
    map.fitBounds(bounds, { padding: [60, 60], animate: true });
  }, [activeDestination, userLocation]);

  const handleCenterOnUser = () => {
    if (!mapInstanceRef.current) return;
    if (userLocation) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 15, {
        animate: true,
      });
      userMarkerRef.current?.openPopup();
    } else if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation({ lat, lng, accuracy: pos.coords.accuracy });
          setIsLocating(false);
          mapInstanceRef.current?.setView([lat, lng], 15);
        },
        () => setIsLocating(false)
      );
    }
  };

  const handleCenterOnPark = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([-18.6320, 26.9535], 13, {
      animate: true,
    });
  };

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
    <div className="relative w-full h-[400px] rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs flex flex-col font-sans">
      {/* Top Header Controls Overlay */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex flex-col gap-2 pointer-events-none">
        {/* Active Destination Navigation Banner */}
        {activeDestination && (
          <div className="bg-amber-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center justify-between text-xs pointer-events-auto shadow-md border border-amber-600">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faRoute} className="w-4 h-4" />
              <span>
                ACTIVE ROUTE: {activeDestination.common_name} ({activeDestination.count} observed)
              </span>
            </div>
            {onClearDestination && (
              <button
                onClick={onClearDestination}
                className="bg-slate-900 hover:bg-black text-amber-200 px-2 py-0.5 rounded text-[10px] font-bold ml-2 cursor-pointer transition-colors"
              >
                Clear Route
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          {/* Title & Live Sightings Count */}
          <div className="bg-white/95 text-slate-900 shadow-sm px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-semibold pointer-events-auto border border-slate-200 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-slate-900">WILDLIFE INTELLIGENCE MAP</span>
            <span className="text-slate-300">|</span>
            <span className="text-[11px] text-slate-600 font-mono">
              {sightings.length} Sightings
            </span>
            {isLoadingSightings && <FontAwesomeIcon icon={faCircleNotch} className="w-3 h-3 animate-spin text-slate-400" />}
          </div>

          {/* Map Controls */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {/* Heatmap density toggle */}
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors border cursor-pointer ${
                showHeatmap
                  ? 'bg-red-600 text-white border-red-700 font-bold'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
              title="Toggle Wildlife Sighting Density Heatmap"
            >
              <FontAwesomeIcon icon={faFire} className={`w-3 h-3 ${showHeatmap ? 'text-white' : 'text-red-500'}`} />
              <span className="hidden sm:inline">Heatmap</span>
            </button>

            {/* Center on Hwange Wildlife Hotspots */}
            <button
              onClick={handleCenterOnPark}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Center on Hwange National Park Wildlife Zone"
            >
              <FontAwesomeIcon icon={faCompass} className="w-3.5 h-3.5 text-blue-600" />
              <span>Hwange Zone</span>
            </button>

            {/* Map Layer Switcher */}
            <div className="bg-white text-slate-700 shadow-xs p-0.5 rounded-lg border border-slate-200 flex items-center gap-1 text-xs">
              <button
                onClick={() => handleToggleMapType('streets')}
                className={`px-2 py-1 rounded transition-colors ${
                  mapType === 'streets'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Street Map"
              >
                <FontAwesomeIcon icon={faMap} className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleToggleMapType('satellite')}
                className={`px-2 py-1 rounded transition-colors ${
                  mapType === 'satellite'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Satellite Imagery"
              >
                <FontAwesomeIcon icon={faSatellite} className="w-3 h-3" />
              </button>
            </div>

            {/* Re-center on driver */}
            <button
              onClick={handleCenterOnUser}
              className="bg-white hover:bg-slate-50 text-blue-600 p-2 rounded-lg border border-slate-200 transition-colors shadow-xs cursor-pointer"
              title="Locate Driver / Visitor"
            >
              <FontAwesomeIcon icon={faLocationArrow} className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter Strip: Species & Sighting Age */}
        <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
          {/* Species Pills */}
          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg p-1 flex items-center gap-1 overflow-x-auto max-w-[70%] text-[10px] shadow-xs">
            {SPECIES_FILTERS.map((sp) => {
              const active = selectedSpecies === sp.id;
              return (
                <button
                  key={sp.id}
                  onClick={() => setSelectedSpecies(sp.id)}
                  className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <FontAwesomeIcon icon={sp.icon} className="w-2.5 h-2.5" />
                  <span>{sp.label}</span>
                </button>
              );
            })}
          </div>

          {/* Age Pills */}
          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg p-1 flex items-center gap-1 text-[10px] shadow-xs">
            {AGE_FILTERS.map((age) => {
              const active = selectedAge === age.id;
              return (
                <button
                  key={age.id}
                  onClick={() => setSelectedAge(age.id)}
                  className={`px-2 py-1 rounded-md flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${age.dot}`} />
                  <span>{age.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Map DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Bottom Status & Legend Strip */}
      <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between pointer-events-none">
        <div className="bg-white/95 text-slate-700 shadow-sm px-3 py-1 rounded-lg border border-slate-200 text-[10px] flex items-center gap-2 pointer-events-auto backdrop-blur-sm">
          <span className="text-slate-500 font-semibold">Legend:</span>
          <span className="flex items-center gap-1 text-emerald-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Fresh (&lt;15m)
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1 text-amber-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Recent (&lt;2h)
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1 text-blue-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Today
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1 text-slate-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-600" /> Driver Position
          </span>
        </div>

        <button
          onClick={fetchSightings}
          className="bg-white/95 hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] flex items-center gap-1.5 pointer-events-auto shadow-xs transition-colors cursor-pointer"
          title="Refresh Wildlife Sightings"
        >
          <FontAwesomeIcon icon={faRotateRight} className={`w-3 h-3 ${isLoadingSightings ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
};
