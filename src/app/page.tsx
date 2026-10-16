'use client';

import React, { useState, useEffect } from 'react';
import {
  INITIAL_TELEMETRY,
  CAMERA_STREAMS,
  MAP_FEATURES,
  MOCK_WILDLIFE_CATALOG
} from '@/data/mockSafariData';
import {
  DroneTelemetry,
  SafariCameraStream,
  WildlifeDetection,
  SimulationMode
} from '@/types/safari';
import { SafariVideoPlayer } from '@/components/SafariVideoPlayer';
import { TelemetryPanel } from '@/components/TelemetryPanel';
import { SafariMap } from '@/components/SafariMap';
import { WildlifePanel } from '@/components/WildlifePanel';
import { VirtualRealityExperience } from '@/components/VirtualRealityExperience';
import { ArchitectureModal } from '@/components/ArchitectureModal';
import {
  Headphones,
  Workflow,
  MapPin
} from 'lucide-react';

export default function SafariVisionApp() {
  const [telemetry, setTelemetry] = useState<DroneTelemetry>(INITIAL_TELEMETRY);
  const [simulationMode, setSimulationMode] = useState<SimulationMode>('automatic');
  const [currentStream, setCurrentStream] = useState<SafariCameraStream>(CAMERA_STREAMS[0]);
  const [selectedAnimal, setSelectedAnimal] = useState<WildlifeDetection | null>(null);
  const [wildlifeDetections, setWildlifeDetections] = useState<WildlifeDetection[]>(MOCK_WILDLIFE_CATALOG);
  const [showAiVision, setShowAiVision] = useState<boolean>(true);
  const [showThermal, setShowThermal] = useState<boolean>(false);
  const [isVrActive, setIsVrActive] = useState<boolean>(false);
  const [isArchModalOpen, setIsArchModalOpen] = useState<boolean>(false);

  const handleModelDetectionsLoaded = (modelDetections: WildlifeDetection[]) => {
    setWildlifeDetections(modelDetections);
    setCurrentStream((prev) => ({
      ...prev,
      detectedWildlife: modelDetections,
    }));
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

  const handleLiveDetectionsFound = (liveDetections: WildlifeDetection[]) => {
    if (liveDetections.length > 0) {
      setWildlifeDetections((prev) => {
        const speciesMap = new Map<string, WildlifeDetection>();
        liveDetections.forEach((d) => speciesMap.set(d.commonName, d));
        prev.forEach((d) => {
          if (!speciesMap.has(d.commonName)) {
            speciesMap.set(d.commonName, d);
          }
        });
        return Array.from(speciesMap.values());
      });
    }

    // Reflect the EXACT current frame detections on the active HUD
    setCurrentStream((prev) => ({
      ...prev,
      detectedWildlife: liveDetections,
    }));
  };

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
    <main className="min-h-screen bg-[#070b0e] text-gray-100 flex flex-col font-sans">
      {/* Top Header & Tactical Brand Bar */}
      <header className="sticky top-0 z-40 bg-[#090e13]/90 backdrop-blur-xl border-b border-cyan-500/20 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Park Location */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-black font-black text-xl shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              SV
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base lg:text-lg text-white tracking-tight">
                  SAFARIVISION
                </h1>
                <span className="hidden sm:inline-block bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono px-2 py-0.5 rounded font-semibold">
                  LIVE VIRTUAL SAFARI
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 font-mono">
                <MapPin className="w-3 h-3 text-amber-400" />
                <span>Hwange National Park, Zimbabwe</span>
                <span className="text-gray-600">•</span>
                <span className="text-amber-400">Prototype Demonstration</span>
              </div>
            </div>
          </div>

          {/* Action Navigation Buttons */}
          <div className="flex items-center gap-2 lg:gap-3">
            {/* System Architecture Blueprint */}
            <button
              onClick={() => setIsArchModalOpen(true)}
              className="hidden md:flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 px-3.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer"
            >
              <Workflow className="w-3.5 h-3.5" />
              <span>SYSTEM ARCHITECTURE</span>
            </button>

            {/* Enter VR Experience Primary Button */}
            <button
              onClick={() => setIsVrActive(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-black font-black px-4 py-2 rounded-xl text-xs font-mono shadow-lg hover:shadow-amber-500/30 transition-all cursor-pointer"
            >
              <Headphones className="w-4 h-4" />
              <span>ENTER VR EXPERIENCE</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Tactical Dashboard Body */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6 flex flex-col gap-6">
        {/* Top Overview Grid: Video Player + Telemetry Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Video Viewport (8 Columns on desktop) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
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
              onSelectFeature={(feat) => {
                if (feat.type === 'wildlife') {
                  const match = MOCK_WILDLIFE_CATALOG.find((w) =>
                    feat.title.toLowerCase().includes(w.commonName.toLowerCase().split(' ')[0])
                  );
                  if (match) setSelectedAnimal(match);
                }
              }}
            />
          </div>

          {/* Right Instrument & Sightings Column (4 Columns on desktop) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
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

      {/* Footer */}
      <footer className="bg-[#05080b] border-t border-slate-900 py-4 px-6 text-xs text-gray-500 font-mono flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-semibold">SafariVision Prototype v1.0</span>
          <span>•</span>
          <span>Proof of Concept Prototype (Hwange National Park)</span>
        </div>
        <div className="flex items-center gap-4 text-cyan-500">
          <button
            onClick={() => setIsArchModalOpen(true)}
            className="hover:underline hover:text-cyan-400 cursor-pointer"
          >
            Drone Ingestion Blueprint
          </button>
          <span>•</span>
          <span className="text-gray-500">Conservation Telemetry Project</span>
        </div>
      </footer>
    </main>
  );
}
