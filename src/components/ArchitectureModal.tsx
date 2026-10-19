'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark,
  faMicrochip,
  faTowerBroadcast,
  faServer,
  faDiagramProject,
  faCircleCheck,
  faShieldHalved,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'hardware' | 'roadmap'>('pipeline');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <FontAwesomeIcon icon={faDiagramProject} className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Live Safari Drone Architecture & Integration Blueprint
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                System Specifications & Phased Implementation Plan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 font-mono text-xs">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-6 py-3 border-b-2 font-bold transition-colors cursor-pointer ${
              activeTab === 'pipeline'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            1. STREAMING & TELEMETRY PIPELINE
          </button>
          <button
            onClick={() => setActiveTab('hardware')}
            className={`px-6 py-3 border-b-2 font-bold transition-colors cursor-pointer ${
              activeTab === 'hardware'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            2. HARDWARE SPECIFICATIONS
          </button>
          <button
            onClick={() => setActiveTab('roadmap')}
            className={`px-6 py-3 border-b-2 font-bold transition-colors cursor-pointer ${
              activeTab === 'roadmap'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            3. PHASED ROLLOUT ROADMAP
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto text-sm text-slate-700 leading-relaxed flex-1">
          {activeTab === 'pipeline' && (
            <div className="flex flex-col gap-6">
              {/* Architecture Scope Notice */}
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-start gap-3">
                <FontAwesomeIcon icon={faTriangleExclamation} className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950 font-sans leading-relaxed">
                  <strong className="text-emerald-800 font-bold">Proposed Architecture vs Current Prototype:</strong>{' '}
                  This diagram represents the candidate end-to-end streaming architecture. In the current prototype, telemetry and video feeds run on simulated client loops and sample streams to validate the user experience prior to committing hardware resources.
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-xs">
                <div className="text-slate-900 font-bold mb-2">TARGET DATAFLOW (SUB-SECOND LATENCY OBJECTIVE)</div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                    <div className="text-amber-800 font-bold mb-1">1. DRONE CAMERA</div>
                    <div className="text-[10px] text-slate-500 font-sans">DJI Matrice 350 / Zenmuse H20N Optical + Thermal</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                    <div className="text-emerald-800 font-bold mb-1">2. FIELD GATEWAY</div>
                    <div className="text-[10px] text-slate-500 font-sans">DJI RC Pro / RTMP-SRT Field Encoder / Starlink Uplink</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                    <div className="text-blue-800 font-bold mb-1">3. MEDIAMTX SERVER</div>
                    <div className="text-[10px] text-slate-500 font-sans">WebRTC (WHEP) Media Gateway & WebSocket Telemetry</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                    <div className="text-purple-800 font-bold mb-1">4. WEB & VR CLIENT</div>
                    <div className="text-[10px] text-slate-500 font-sans">Next.js Tactical HUD + Three.js WebXR Lounge</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <FontAwesomeIcon icon={faServer} className="w-4 h-4 text-emerald-600" />
                    Target Video Pipeline (WebRTC / SRT)
                  </h4>
                  <p className="text-xs text-slate-600 mb-3 font-sans">
                    Standard HLS or DASH introduces 10-25 seconds of buffer lag. For an interactive virtual safari, we target <strong>WebRTC (WHEP protocol)</strong> or ultra-low-latency SRT ingest via MediaMTX. Real-world latency depends on savanna uplink throughput.
                  </p>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside font-sans">
                    <li>Ingest: RTMP / SRT from drone ground station</li>
                    <li>Distribution: WebRTC with adaptive bitrate fallback</li>
                    <li>Current Status: Simulated playback with sample footage</li>
                  </ul>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <FontAwesomeIcon icon={faTowerBroadcast} className="w-4 h-4 text-emerald-600" />
                    Target Telemetry Architecture
                  </h4>
                  <p className="text-xs text-slate-600 mb-3 font-sans">
                    Flight instruments (altitude, airspeed, heading, coordinates, gimbal tilt) will be decoupled from the video stream over lightweight WebSockets.
                  </p>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside font-sans">
                    <li>Protocol: MAVLink or DJI Mobile SDK Telemetry</li>
                    <li>Resilience: Telemetry continues updating even during video bitrate drops</li>
                    <li>Current Status: Simulated orbital flight model with manual sandbox override</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'hardware' && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-mono text-emerald-700 font-bold block mb-1">PROPOSED AIRFRAME</span>
                  <h4 className="font-bold text-slate-900 mb-2">DJI Matrice 350 RTK</h4>
                  <p className="text-xs text-slate-600 mb-3 font-sans">
                    Enterprise multi-rotor airframe featuring up to 55-minute manufacturer flight endurance, IP55 rating, and support for Zenmuse H20N dual thermal/optical gimbal.
                  </p>
                  <div className="text-[11px] font-mono text-slate-700 bg-white border border-slate-200 p-2 rounded">
                    Candidate for long-range savanna patrol
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-mono text-emerald-700 font-bold block mb-1">PROPOSED DOCK STATION</span>
                  <h4 className="font-bold text-slate-900 mb-2">DJI Dock 2 (Automated Hub)</h4>
                  <p className="text-xs text-slate-600 mb-3 font-sans">
                    Candidate autonomous ground station for remote charging, scheduled takeoff, and weather-protected housing. Requires verified field power and network testing.
                  </p>
                  <div className="text-[11px] font-mono text-slate-700 bg-white border border-slate-200 p-2 rounded">
                    Weatherproof Station • Remote Ops
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-mono text-amber-700 font-bold block mb-1">UPLINK CONNECTIVITY</span>
                  <h4 className="font-bold text-slate-900 mb-2">Starlink Mini Relay</h4>
                  <p className="text-xs text-slate-600 mb-3 font-sans">
                    Because remote national parks have spotty cellular LTE, satellite uplinks mounted on patrol vehicles or base camps are proposed to provide high-bandwidth cloud ingest.
                  </p>
                  <div className="text-[11px] font-mono text-slate-700 bg-white border border-slate-200 p-2 rounded">
                    12V Low Power • High Uplink Bandwidth
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                <h4 className="font-bold text-amber-900 text-sm mb-1 flex items-center gap-2">
                  <FontAwesomeIcon icon={faShieldHalved} className="w-4 h-4 text-amber-700" />
                  Regulatory & Wildlife Safety Notice
                </h4>
                <p className="text-xs text-amber-950 leading-relaxed font-sans">
                  Field operations in Hwange National Park require authorization from the Zimbabwe National Parks and Wildlife Management Authority (Zimparks). Drone operations must maintain strict minimum operating altitudes (typically 100m+ AGL) and use long-range optical zoom lenses to ensure zero harassment to elephants, rhinos, and predators.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'roadmap' && (
            <div className="flex flex-col gap-4">
              <div className="space-y-3">
                <div className="bg-slate-50 p-4 rounded-xl border border-emerald-300 shadow-2xs flex items-start gap-4">
                  <span className="bg-emerald-600 text-white font-bold font-mono text-xs px-2.5 py-1 rounded">PHASE 1</span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span>Visual & Interactive Prototype</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-mono font-semibold">
                        DELIVERED
                      </span>
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 font-sans">
                      Full dashboard UI, 4K wildlife streams, tactical HUD overlay, simulated live telemetry dials, interactive Leaflet GPS map, real frame snapshot downloads, and WebXR Three.js 3D observation lounge.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs flex items-start gap-4">
                  <span className="bg-slate-900 text-white font-bold font-mono text-xs px-2.5 py-1 rounded">PHASE 2</span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Media Server & Field Telemetry Testing</h4>
                    <p className="text-xs text-slate-600 mt-1 font-sans">
                      Deploy MediaMTX server instance, configure WebRTC WHEP gateway, test latency over cellular/Starlink connections, and establish live MAVLink/DJI SDK telemetry bridge.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-emerald-300 shadow-2xs flex items-start gap-4">
                  <span className="bg-emerald-600 text-white font-bold font-mono text-xs px-2.5 py-1 rounded">DELIVERED</span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span>Decision Support & Route Guidance</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-mono font-semibold">
                        ACTIVE
                      </span>
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 font-sans">
                      Provide game-drive dispatch optimization, road routing calculations, distance matrices, and multi-criteria sighting ranking for vehicle guides.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs flex items-start gap-4">
                  <span className="bg-slate-900 text-white font-bold font-mono text-xs px-2.5 py-1 rounded">PHASE 4</span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Automated Computer Vision & Field Analytics</h4>
                    <p className="text-xs text-slate-600 mt-1 font-sans">
                      Fine-tuned aerial YOLO object detection on savanna wildlife, spatial census detection probability correction, and predictive occurrence modeling.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            SafariVision Platform • Engineering Plan
          </span>
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2 rounded-lg text-xs font-mono transition-colors cursor-pointer shadow-xs"
          >
            CLOSE BLUEPRINT
          </button>
        </div>
      </div>
    </div>
  );
};
