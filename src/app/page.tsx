'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  INITIAL_TELEMETRY,
  CAMERA_STREAMS,
  MAP_FEATURES
} from '@/data/mockSafariData';
import {
  DroneTelemetry,
  SafariCameraStream,
  WildlifeDetection,
  SimulationMode
} from '@/types/safari';
import { WildlifeSighting } from '@/types/sightings';
import { sightingsService } from '@/services/sightingsService';
import { wildlifeDetectionService } from '@/services/wildlifeDetectionService';
import { BackendHealth, ModelDetectionResponse } from '@/types/wildlifeDetection';
import { SafariVideoPlayer } from '@/components/SafariVideoPlayer';
import { TelemetryPanel } from '@/components/TelemetryPanel';
import { SafariMap } from '@/components/SafariMap';
import { WildlifePanel } from '@/components/WildlifePanel';
import { SafariDecisionSupport } from '@/components/SafariDecisionSupport';
import { WildlifeAnalyticsModal } from '@/components/WildlifeAnalyticsModal';
import { VirtualRealityExperience } from '@/components/VirtualRealityExperience';
import { ArchitectureModal } from '@/components/ArchitectureModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLocationDot,
  faChartBar,
  faDiagramProject,
  faGlasses,
  faPaw,
} from '@fortawesome/free-solid-svg-icons';

export default function SafariVisionApp() {
  const [telemetry, setTelemetry] = useState<DroneTelemetry>(INITIAL_TELEMETRY);
  const [simulationMode, setSimulationMode] = useState<SimulationMode>('automatic');
  const [currentStream, setCurrentStream] = useState<SafariCameraStream>(CAMERA_STREAMS[0]);
  const [selectedAnimal, setSelectedAnimal] = useState<WildlifeDetection | null>(null);
  const [wildlifeDetections, setWildlifeDetections] = useState<WildlifeDetection[]>([]);
  const [showAiVision, setShowAiVision] = useState<boolean>(true);
  const [showThermal, setShowThermal] = useState<boolean>(false);
  const [isVrActive, setIsVrActive] = useState<boolean>(false);
  const [isArchModalOpen, setIsArchModalOpen] = useState<boolean>(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState<boolean>(false);
  const [activeDestination, setActiveDestination] = useState<WildlifeSighting | null>(null);
  const [sightings, setSightings] = useState<WildlifeSighting[]>([]);
  const [isSightingsLoading, setIsSightingsLoading] = useState<boolean>(true);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null);
  const [isInferring, setIsInferring] = useState<boolean>(false);
  const [inferenceResult, setInferenceResult] = useState<ModelDetectionResponse | null>(null);
  const [inferenceError, setInferenceError] = useState<string | null>(null);

  const loadSightings = useCallback(async () => {
    setIsSightingsLoading(true);
    try {
      const fetched = await sightingsService.getSightings();
      if (fetched) {
        setSightings(fetched);
      }
    } catch (e) {
      console.warn('Could not load sightings from database:', e);
    } finally {
      setIsSightingsLoading(false);
    }
  }, []);

  // Load backend status, sightings, and driver location on mount
  useEffect(() => {
    wildlifeDetectionService.checkHealth().then(setBackendHealth);
    loadSightings();
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, [loadSightings]);

  const handleModelDetectionsLoaded = (modelDetections: WildlifeDetection[]) => {
    setWildlifeDetections(modelDetections);
    setCurrentStream((prev) => ({
      ...prev,
      detectedWildlife: modelDetections,
    }));
    // Refresh sightings database to include newly detected video observations
    loadSightings();
  };

  const handlePlayVideoOnMainScreen = (videoUrl: string, title: string) => {
    const cleanStream: SafariCameraStream = {
      id: `stream-${Date.now()}`,
      name: title,
      locationName: 'AI Safari Feed',
      description: `Active Video: ${title}`,
      coordinates: [-18.6292, 26.9501],
      videoUrl,
      posterUrl: '',
      quality: '1080p 60fps',
      bitrateMbps: 16,
      streamStatus: 'demo',
      detectedWildlife: [], // Start completely clean without stale/mock overlays
    };
    setCurrentStream(cleanStream);
  };

  const handleRunInference = async (videoName?: string) => {
    const targetVideo = videoName || currentStream.videoUrl.split('/').pop() || 'final_test.mp4';
    setIsInferring(true);
    setInferenceResult(null);
    setInferenceError(null);
    try {
      const result = await wildlifeDetectionService.runDetection(targetVideo, {
        conf: 0.25,
        frameStride: 1,
      });
      setInferenceResult(result);

      if (result.output_url) {
        const outputFilename = result.output_url.split('/').pop() || '';
        const outputUrl = wildlifeDetectionService.getOutputVideoUrl(outputFilename);
        handlePlayVideoOnMainScreen(outputUrl, `${targetVideo} (YOLO Detected Stream)`);
      }

      if (result.sample_detections && result.sample_detections.length > 0) {
        // Group detections by persistent individual track ID (or detection ID if tracking is inactive)
        // Select the highest-confidence observation as the representative individual entry
        const individualMap = new Map<string, (typeof result.sample_detections)[0]>();
        result.sample_detections.forEach((det) => {
          const groupKey =
            det.track_id !== undefined && det.track_id !== null
              ? `track-${det.common_name}-${det.track_id}`
              : `det-${det.id}`;
          const existing = individualMap.get(groupKey);
          if (!existing || (det.confidence || 0) > (existing.confidence || 0)) {
            individualMap.set(groupKey, det);
          }
        });

        const representativeDetections = Array.from(individualMap.values());
        const speciesTrackedCounts = result.species_tracked_counts || {};
        const speciesFrameCounts = result.species_frame_counts || result.species_counts || {};

        const individualDetections: WildlifeDetection[] = representativeDetections.map((det, idx) => {
          const totalTrackedForSpecies =
            speciesTrackedCounts[det.common_name] ||
            (result.tracking_active ? 1 : speciesFrameCounts[det.common_name] || 1);
          const animal = wildlifeDetectionService.convertToWildlifeDetection(
            det,
            totalTrackedForSpecies,
            result.video,
            idx
          );
          if (det.track_id !== undefined && det.track_id !== null) {
            animal.id = `${det.common_name.toLowerCase().replace(/\s+/g, '-')}-track-${det.track_id}`;
          }
          return animal;
        });

        handleModelDetectionsLoaded(individualDetections);
      }
    } catch (err: any) {
      console.error('Inference error:', err);
      setInferenceError(err.message || 'Detection failed');
    } finally {
      setIsInferring(false);
    }
  };

  const handleLiveDetectionsFound = useCallback(
    (liveDetections: WildlifeDetection[]) => {
      if (liveDetections.length > 0) {
        // Calculate true individual counts detected in this frame from best_finetuned.pt
        const speciesCounts = new Map<string, number>();
        liveDetections.forEach((d) => {
          speciesCounts.set(d.commonName, (speciesCounts.get(d.commonName) || 0) + 1);
        });

        setWildlifeDetections((prev) => {
          const speciesMap = new Map<string, WildlifeDetection>();

          liveDetections.forEach((d) => {
            if (!speciesMap.has(d.commonName)) {
              speciesMap.set(d.commonName, {
                ...d,
                count: speciesCounts.get(d.commonName) || 1,
              });
            }
          });

          // Retain animals observed during this active session
          prev.forEach((d) => {
            if (!speciesMap.has(d.commonName)) {
              speciesMap.set(d.commonName, d);
            }
          });
          return Array.from(speciesMap.values());
        });

        // Inject live YOLO camera detections into sightings for instant real-time Safari Decision Support
        // Group by species so each species has exactly ONE live sighting with the true animal count and a unique ID
        setSightings((prevSightings) => {
          const nowIso = new Date().toISOString();
          const liveSightingsMap = new Map<string, WildlifeSighting>();

          liveDetections.forEach((det) => {
            const speciesKey = det.commonName.toLowerCase().replace(/\s+/g, '-');
            const count = speciesCounts.get(det.commonName) || 1;
            const existing = liveSightingsMap.get(speciesKey);

            if (!existing || (det.confidence && (!existing.confidence || det.confidence > existing.confidence))) {
              liveSightingsMap.set(speciesKey, {
                id: `live-${speciesKey}`,
                species: det.species,
                common_name: det.commonName,
                confidence: det.confidence,
                count: count,
                latitude: currentStream.coordinates[0],
                longitude: currentStream.coordinates[1],
                altitude_m: telemetry.altitude || 1045,
                timestamp: nowIso,
                source_video: currentStream.name || 'Live Camera Feed',
                source_frame: 0,
                track_id: det.trackId ?? undefined,
                notes: `Live YOLO detection on ${currentStream.name} (${count} ${count > 1 ? 'animals' : 'animal'}, ${(det.confidence * 100).toFixed(0)}% conf)`,
              });
            }
          });

          const liveSightings = Array.from(liveSightingsMap.values());
          const liveSpecies = new Set(liveSightings.map((s) => s.common_name));
          const nonDupePrev = prevSightings.filter(
            (s) => !s.id.startsWith('live-') || !liveSpecies.has(s.common_name)
          );

          // Guarantee absolute uniqueness across all sighting IDs
          const seenIds = new Set<string>();
          const uniqueSightings: WildlifeSighting[] = [];
          for (const s of [...liveSightings, ...nonDupePrev]) {
            if (!seenIds.has(s.id)) {
              seenIds.add(s.id);
              uniqueSightings.push(s);
            }
          }
          return uniqueSightings;
        });
      }

      // Reflect the EXACT current frame detections on the active HUD
      setCurrentStream((prev) => {
        if (prev.detectedWildlife.length === 0 && liveDetections.length === 0) {
          return prev;
        }
        return {
          ...prev,
          detectedWildlife: liveDetections,
        };
      });
    },
    [currentStream.coordinates, currentStream.name, telemetry.altitude]
  );

  // Background Drone Flight Simulation
  useEffect(() => {
    let tick = 0;
    const interval = setInterval(() => {
      tick++;
      setTelemetry((prev) => {
        // Subtle pitch & roll turbulence
        const newRoll = Math.sin(tick * 0.2) * 2.2;
        const newPitch = Math.cos(tick * 0.15) * 1.8;

        // If in MANUAL HOLD mode, do not override user-adjusted speed or altitude
        if (simulationMode === 'manual') {
          return {
            ...prev,
            roll: newRoll,
            pitch: newPitch,
            batteryPercentage: Math.max(12, 78 - Math.floor(tick / 180)),
          };
        }

        // AUTOMATIC PATROL mode: Orbit around Hwange coordinates
        const angle = tick * 0.04;
        const radiusLat = 0.0035;
        const radiusLng = 0.0045;
        const newLat = -18.6292 + Math.sin(angle) * radiusLat;
        const newLng = 26.9501 + Math.cos(angle) * radiusLng;

        // Dynamic heading pointing along orbit tangent
        const newHeading =
          (Math.atan2(Math.sin(angle), Math.cos(angle)) * (180 / Math.PI) + 90 + 360) % 360;

        // Smooth convergence toward target altitude with minor atmospheric draft
        const targetAlt = prev.targetAltitude;
        const altitudeDrift = Math.cos(tick * 0.08) * 1.2;
        const newAltitude = targetAlt + altitudeDrift;

        return {
          ...prev,
          latitude: newLat,
          longitude: newLng,
          heading: newHeading,
          roll: newRoll,
          pitch: newPitch,
          speed: 18.0 + Math.sin(tick * 0.1) * 2.5,
          altitude: newAltitude,
          batteryPercentage: Math.max(12, 78 - Math.floor(tick / 180)),
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [simulationMode]);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Top Header & Brand Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-4 lg:px-6 py-2.5 shadow-xs">
        <div className="w-full max-w-[1920px] mx-auto flex items-center justify-between">
          {/* Logo & Park Location */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
              <FontAwesomeIcon icon={faPaw} className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base lg:text-lg text-slate-900 tracking-tight">
                  SAFARIVISION
                </h1>
                <span className="hidden sm:inline-block bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                  NATIONAL PARK LIVE
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                <FontAwesomeIcon icon={faLocationDot} className="w-3 h-3 text-red-500" />
                <span>Hwange National Park, Zimbabwe</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-700 font-semibold">Wildlife Decision & Operations</span>
              </div>
            </div>
          </div>

          {/* Action Navigation Buttons */}
          <div className="flex items-center gap-2 lg:gap-3">
            {/* Wildlife Analytics & Reports Modal Button */}
            <button
              onClick={() => setIsAnalyticsModalOpen(true)}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-semibold font-mono transition-colors cursor-pointer shadow-xs"
              title="Open Wildlife Analytics & Occurrence Reports"
            >
              <FontAwesomeIcon icon={faChartBar} className="w-3.5 h-3.5 text-blue-600" />
              <span>ANALYTICS & REPORTS</span>
            </button>

            {/* System Architecture Blueprint */}
            <button
              onClick={() => setIsArchModalOpen(true)}
              className="hidden md:flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-semibold font-mono transition-colors cursor-pointer shadow-xs"
            >
              <FontAwesomeIcon icon={faDiagramProject} className="w-3.5 h-3.5 text-slate-600" />
              <span>ARCHITECTURE</span>
            </button>

            {/* Enter VR Experience Primary Button */}
            <button
              onClick={() => setIsVrActive(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold px-4 py-2 rounded-xl text-xs font-mono shadow-sm transition-all cursor-pointer"
            >
              <FontAwesomeIcon icon={faGlasses} className="w-4 h-4" />
              <span>VIRTUAL SAFARI</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Tactical Dashboard Body */}
      <div className="flex-1 w-full max-w-[1920px] mx-auto px-2 sm:px-3 lg:px-4 py-3 sm:py-4 flex flex-col gap-4">
        {/* Top Overview Grid: Video Player + Telemetry Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
          {/* Main Video Viewport (8 Columns on desktop, 9 on ultra-wide 2xl) */}
          <div className="lg:col-span-8 2xl:col-span-9 flex flex-col gap-4">
            <SafariVideoPlayer
              currentStream={currentStream}
              streams={CAMERA_STREAMS}
              telemetry={telemetry}
              onSelectStream={setCurrentStream}
              onSelectAnimal={setSelectedAnimal}
              onLiveDetectionsFound={handleLiveDetectionsFound}
              showAiVision={showAiVision}
              setShowAiVision={setShowAiVision}
              showThermal={showThermal}
              setShowThermal={setShowThermal}
              onEnterVr={() => setIsVrActive(true)}
            />

            {/* Tactical Map Container */}
            <SafariMap
              telemetry={telemetry}
              mapFeatures={MAP_FEATURES}
              activeDestination={activeDestination}
              onClearDestination={() => setActiveDestination(null)}
              onSelectSighting={(s) => {
                setActiveDestination(s);
                const match = wildlifeDetections.find(
                  (w) =>
                    w.id === s.id ||
                    w.commonName.toLowerCase().includes(s.common_name.toLowerCase()) ||
                    s.common_name.toLowerCase().includes(w.commonName.toLowerCase())
                );
                if (match) setSelectedAnimal(match);
              }}
              onSelectFeature={(feat) => {
                if (feat.type === 'wildlife') {
                  // 1. Stable sightingId or animal ID match
                  let match = wildlifeDetections.find(
                    (w) => w.id === feat.sightingId || w.id === feat.id
                  );
                  // 2. Explicit speciesKey match
                  if (!match && feat.speciesKey) {
                    match = wildlifeDetections.find((w) =>
                      w.commonName.toLowerCase().includes(feat.speciesKey!.toLowerCase())
                    );
                  }
                  // 3. Taxonomic root matching
                  if (!match) {
                    const titleLower = feat.title.toLowerCase();
                    const speciesRoots = ['elephant', 'giraffe', 'lion', 'zebra', 'buffalo', 'impala', 'wildebeest', 'bird'];
                    const matchedRoot = speciesRoots.find((root) => titleLower.includes(root));
                    if (matchedRoot) {
                      match = wildlifeDetections.find((w) =>
                        w.commonName.toLowerCase().includes(matchedRoot)
                      );
                    }
                  }
                  // 4. Also route destination to linked sighting if present
                  const linkedSighting = sightings.find(
                    (s) => s.id === feat.sightingId || feat.title.toLowerCase().includes(s.common_name.toLowerCase())
                  );
                  if (linkedSighting) setActiveDestination(linkedSighting);
                  if (match) setSelectedAnimal(match);
                }
              }}
            />

            {/* Safari Decision Support Panel */}
            <SafariDecisionSupport
              sightings={sightings}
              driverLocation={driverLocation}
              onNavigateToSighting={(s) => setActiveDestination(s)}
              activeDestinationId={activeDestination?.id}
              onRefreshSightings={loadSightings}
              isSightingsLoading={isSightingsLoading}
            />
          </div>

          {/* Right Instrument & Sightings Column (4 Columns on desktop, 3 on ultra-wide 2xl) */}
          <div className="lg:col-span-4 2xl:col-span-3 flex flex-col gap-4">
            <TelemetryPanel
              telemetry={telemetry}
              setTelemetry={setTelemetry}
              simulationMode={simulationMode}
              setSimulationMode={setSimulationMode}
            />

            <WildlifePanel
              detections={wildlifeDetections}
              selectedAnimal={selectedAnimal}
              onSelectAnimal={setSelectedAnimal}
              onModelDetectionsLoaded={handleModelDetectionsLoaded}
              onPlayVideoOnMainScreen={handlePlayVideoOnMainScreen}
              currentVideoName={currentStream.videoUrl.split('/').pop()}
              backendHealth={backendHealth}
              isInferring={isInferring}
              onRunInference={handleRunInference}
              inferenceResult={inferenceResult}
              inferenceError={inferenceError}
            />
          </div>
        </div>
      </div>

      {/* WebXR Three.js 3D Virtual Safari Overlay Modal */}
      {isVrActive && (
        <VirtualRealityExperience
          currentStream={currentStream}
          telemetry={telemetry}
          onExitVr={() => setIsVrActive(false)}
        />
      )}

      {/* System Technical Architecture & Integration Modal */}
      <ArchitectureModal
        isOpen={isArchModalOpen}
        onClose={() => setIsArchModalOpen(false)}
      />

      {/* Wildlife Intelligence & Analytics Modal (Phase 4) */}
      <WildlifeAnalyticsModal
        isOpen={isAnalyticsModalOpen}
        onClose={() => setIsAnalyticsModalOpen(false)}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 px-3 sm:px-4 lg:px-6 text-xs text-slate-500 font-mono shadow-xs">
        <div className="w-full max-w-[1920px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-800 font-bold">SafariVision v1.1</span>
            <span>•</span>
            <span>Hwange National Park Wildlife Intelligence Operations</span>
          </div>
          <div className="flex items-center gap-4 text-slate-600">
            <button
              onClick={() => setIsArchModalOpen(true)}
              className="hover:underline hover:text-blue-600 cursor-pointer"
            >
              Drone Ingestion Blueprint
            </button>
            <span>•</span>
            <span className="text-slate-400">Conservation Telemetry Project</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
