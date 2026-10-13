'use client';

import React, { useState } from 'react';
import {
  X,
  Cpu,
  Radio,
  Server,
  Workflow,
  CheckCircle2,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-sans">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Live Safari Drone Architecture & Integration Blueprint
              </h2>
              <p className="text-xs text-gray-400 font-mono">
                System Specifications & Phased Implementation Plan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 font-mono text-xs">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-6 py-3 border-b-2 font-bold transition-colors cursor-pointer ${
              activeTab === 'pipeline'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            1. STREAMING & TELEMETRY PIPELINE
          </button>
          <button
            onClick={() => setActiveTab('hardware')}
            className={`px-6 py-3 border-b-2 font-bold transition-colors cursor-pointer ${
              activeTab === 'hardware'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            2. HARDWARE SPECIFICATIONS
          </button>
          <button
            onClick={() => setActiveTab('roadmap')}
            className={`px-6 py-3 border-b-2 font-bold transition-colors cursor-pointer ${
              activeTab === 'roadmap'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            3. PHASED ROLLOUT ROADMAP
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto text-sm text-gray-300 leading-relaxed flex-1">
          {activeTab === 'pipeline' && (
            <div className="flex flex-col gap-6">
              {/* Architecture Scope Notice */}
              <div className="bg-cyan-500/10 border border-cyan-500/30 p-3.5 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-cyan-100">
                  <strong className="text-cyan-300 font-bold">Proposed Architecture vs Current Prototype:</strong>{' '}
                  This diagram represents the candidate end-to-end streaming architecture. In the current prototype, telemetry and video feeds run on simulated client loops and sample streams to validate the user experience prior to committing hardware resources.
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs">
                <div className="text-cyan-400 font-bold mb-2">TARGET DATAFLOW (SUB-SECOND LATENCY OBJECTIVE)</div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
                  <div className="bg-slate-900 p-3 rounded border border-slate-800">
                    <div className="text-amber-400 font-bold mb-1">1. DRONE CAMERA</div>
                    <div className="text-[10px] text-gray-400">DJI Matrice 350 / Zenmuse H20N Optical + Thermal</div>
                  </div>
                  <div className="bg-slate-900 p-3 rounded border border-slate-800">
                    <div className="text-emerald-400 font-bold mb-1">2. FIELD GATEWAY</div>
                    <div className="text-[10px] text-gray-400">DJI RC Pro / RTMP-SRT Field Encoder / Starlink Uplink</div>
                  </div>
                  <div className="bg-slate-900 p-3 rounded border border-slate-800">
                    <div className="text-cyan-400 font-bold mb-1">3. MEDIAMTX SERVER</div>
                    <div className="text-[10px] text-gray-400">WebRTC (WHEP) Media Gateway & WebSocket Telemetry</div>
                  </div>
                  <div className="bg-slate-900 p-3 rounded border border-slate-800">
                    <div className="text-purple-400 font-bold mb-1">4. WEB & VR CLIENT</div>
                    <div className="text-[10px] text-gray-400">Next.js Tactical HUD + Three.js WebXR Lounge</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                  <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                    <Server className="w-4 h-4 text-cyan-400" />
                    Target Video Pipeline (WebRTC / SRT)
                  </h4>
                  <p className="text-xs text-gray-400 mb-3">
                    Standard HLS or DASH introduces 10-25 seconds of buffer lag. For an interactive virtual safari, we target <strong>WebRTC (WHEP protocol)</strong> or ultra-low-latency SRT ingest via MediaMTX. Real-world latency depends on savanna uplink throughput.
                  </p>
                  <ul className="text-xs text-gray-300 space-y-1.5 list-disc list-inside">
                    <li>Ingest: RTMP / SRT from drone ground station</li>
                    <li>Distribution: WebRTC with adaptive bitrate fallback</li>
                    <li>Current Status: Simulated playback with sample footage</li>
                  </ul>
                </div>

                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                  <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400" />
                    Target Telemetry Architecture
                  </h4>
                  <p className="text-xs text-gray-400 mb-3">
                    Flight instruments (altitude, airspeed, heading, coordinates, gimbal tilt) will be decoupled from the video stream over lightweight WebSockets.
                  </p>
                  <ul className="text-xs text-gray-300 space-y-1.5 list-disc list-inside">
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
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs font-mono text-cyan-400 font-bold block mb-1">PROPOSED AIRFRAME</span>
                  <h4 className="font-bold text-white mb-2">DJI Matrice 350 RTK</h4>
                  <p className="text-xs text-gray-400 mb-3">
                    Enterprise multi-rotor airframe featuring up to 55-minute manufacturer flight endurance, IP55 rating, and support for Zenmuse H20N dual thermal/optical gimbal.
                  </p>
                  <div className="text-[11px] font-mono text-gray-300 bg-slate-900 p-2 rounded">
                    Candidate for long-range savanna patrol
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs font-mono text-emerald-400 font-bold block mb-1">PROPOSED DOCK STATION</span>
                  <h4 className="font-bold text-white mb-2">DJI Dock 2 (Automated Hub)</h4>
                  <p className="text-xs text-gray-400 mb-3">
                    Candidate autonomous ground station for remote charging, scheduled takeoff, and weather-protected housing. Requires verified field power and network testing.
                  </p>
                  <div className="text-[11px] font-mono text-gray-300 bg-slate-900 p-2 rounded">
                    Weatherproof Station • Remote Ops
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs font-mono text-amber-400 font-bold block mb-1">UPLINK CONNECTIVITY</span>
                  <h4 className="font-bold text-white mb-2">Starlink Mini Relay</h4>
                  <p className="text-xs text-gray-400 mb-3">
                    Because remote national parks have spotty cellular LTE, satellite uplinks mounted on patrol vehicles or base camps are proposed to provide high-bandwidth cloud ingest.
                  </p>
                  <div className="text-[11px] font-mono text-gray-300 bg-slate-900 p-2 rounded">
                    12V Low Power • High Uplink Bandwidth
                  </div>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl">
                <h4 className="font-bold text-amber-300 text-sm mb-1 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Regulatory & Wildlife Safety Notice
                </h4>
                <p className="text-xs text-amber-100/90 leading-relaxed">
                  Field operations in Hwange National Park require authorization from the Zimbabwe National Parks and Wildlife Management Authority (Zimparks). Drone operations must maintain strict minimum operating altitudes (typically 100m+ AGL) and use long-range optical zoom lenses to ensure zero harassment to elephants, rhinos, and predators.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'roadmap' && (
            <div className="flex flex-col gap-4">
              <div className="space-y-3">
                <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/50 flex items-start gap-4">
                  <span className="bg-emerald-500 text-black font-bold font-mono text-xs px-2.5 py-1 rounded">PHASE 1</span>
                  <div>
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <span>Visual & Interactive Prototype</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.2 rounded font-mono">
                        DELIVERED
                      </span>
                    </h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Full dashboard UI, 4K wildlife streams, tactical HUD overlay, simulated live telemetry dials, interactive Leaflet GPS map, real frame snapshot downloads, and WebXR Three.js 3D observation lounge for client approval.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start gap-4">
                  <span className="bg-cyan-500 text-black font-bold font-mono text-xs px-2.5 py-1 rounded">PHASE 2</span>
                  <div>
                    <h4 className="font-bold text-white text-sm">Media Server & Field Telemetry Testing</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Deploy MediaMTX server instance, configure WebRTC WHEP gateway, test latency over cellular/Starlink connections, and establish live MAVLink/DJI SDK telemetry bridge.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start gap-4">
                  <span className="bg-purple-500 text-black font-bold font-mono text-xs px-2.5 py-1 rounded">PHASE 3</span>
                  <div>
                    <h4 className="font-bold text-white text-sm">Production WebXR VR Hardware Integration</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Optimize WebXR sessions for Meta Quest 3 and Apple Vision Pro, refine spatial audio positioning, and implement 3D controller interactions for virtual tourism.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start gap-4">
                  <span className="bg-amber-500 text-black font-bold font-mono text-xs px-2.5 py-1 rounded">PHASE 4</span>
                  <div>
                    <h4 className="font-bold text-white text-sm">Automated Computer Vision & Field Deployment</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Train and evaluate aerial YOLO object detection models on African savanna wildlife for real-time species recognition, conservation data collection, and ranger patrol assistance.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-gray-500 font-mono">
            SafariVision Platform • Commercial Engineering Plan
          </span>
          <button
            onClick={onClose}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-5 py-2 rounded-lg text-xs font-mono transition-colors cursor-pointer"
          >
            RETURN TO PROTOTYPE
          </button>
        </div>
      </div>
    </div>
  );
};
