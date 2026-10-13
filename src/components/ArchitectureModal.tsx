'use client';

import React, { useState } from 'react';
import {
  X,
  Cpu,
  Radio,
  Server,
  Glasses,
  CheckCircle2,
  Workflow,
  Sparkles,
  ArrowRight,
  ShieldCheck
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
                Commercial Deployment Spec for Hwange National Park
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 font-mono text-xs">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-6 py-3 border-b-2 font-bold transition-colors ${
              activeTab === 'pipeline'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            1. STREAMING & TELEMETRY PIPELINE
          </button>
          <button
            onClick={() => setActiveTab('hardware')}
            className={`px-6 py-3 border-b-2 font-bold transition-colors ${
              activeTab === 'hardware'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            2. DRONE HARDWARE & STARLINK RELAY
          </button>
          <button
            onClick={() => setActiveTab('roadmap')}
            className={`px-6 py-3 border-b-2 font-bold transition-colors ${
              activeTab === 'roadmap'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            3. 4-PHASE ROLLOUT PLAN
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto text-sm text-gray-300 leading-relaxed flex-1">
          {activeTab === 'pipeline' && (
            <div className="flex flex-col gap-6">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs">
                <div className="text-cyan-400 font-bold mb-2">END-TO-END DATAFLOW (SUB-SECOND LATENCY)</div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
                  <div className="bg-slate-900 p-3 rounded border border-slate-800">
                    <div className="text-amber-400 font-bold mb-1">1. DRONE CAMERA</div>
                    <div className="text-[10px] text-gray-400">DJI Matrice 350 / Zenmuse H20T 4K + Thermal</div>
                  </div>
                  <div className="bg-slate-900 p-3 rounded border border-slate-800">
                    <div className="text-emerald-400 font-bold mb-1">2. FIELD GATEWAY</div>
                    <div className="text-[10px] text-gray-400">DJI Dock 2 / RC Pro / Starlink Mini Uplink</div>
                  </div>
                  <div className="bg-slate-900 p-3 rounded border border-slate-800">
                    <div className="text-cyan-400 font-bold mb-1">3. MEDIAMTX / WEBRTC</div>
                    <div className="text-[10px] text-gray-400">WHEP Media Gateway & WebSocket Telemetry</div>
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
                    Ultra-Low Latency Video (WebRTC)
                  </h4>
                  <p className="text-xs text-gray-400 mb-3">
                    Normal HLS streaming introduces 10-30 seconds of lag. For interactive drone tours, we use <strong>WebRTC (WHEP protocol)</strong> hosted on MediaMTX, achieving sub-200ms latency from the savanna to global viewers.
                  </p>
                  <ul className="text-xs text-gray-300 space-y-1.5 list-disc list-inside">
                    <li>Ingest: RTMP / SRT from drone field controller</li>
                    <li>Distribution: WebRTC with adaptive bitrate fallback</li>
                    <li>Failover: Multi-CDN backup stream</li>
                  </ul>
                </div>

                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                  <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400" />
                    Independent Telemetry Stream
                  </h4>
                  <p className="text-xs text-gray-400 mb-3">
                    Video and flight instruments travel on independent channels via a lightweight WebSocket broker.
                  </p>
                  <ul className="text-xs text-gray-300 space-y-1.5 list-disc list-inside">
                    <li>Protocol: MAVLink or DJI Mobile SDK Telemetry</li>
                    <li>Payload: Altitude, heading, coordinates, battery, gimbal tilt</li>
                    <li>Resilience: Telemetry continues updating even during video bitrate drops</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'hardware' && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs font-mono text-cyan-400 font-bold block mb-1">PRIMARY DRONE TIER</span>
                  <h4 className="font-bold text-white mb-2">DJI Matrice 350 RTK</h4>
                  <p className="text-xs text-gray-400 mb-3">
                    Enterprise workhorse with 55-minute flight time, IP55 rain/dust rating, and dual thermal/visual Zenmuse H20N gimbal.
                  </p>
                  <div className="text-[11px] font-mono text-gray-300 bg-slate-900 p-2 rounded">
                    Range: 20 km • RTK Centimeter Accuracy
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs font-mono text-emerald-400 font-bold block mb-1">AUTONOMOUS DOCK TIER</span>
                  <h4 className="font-bold text-white mb-2">DJI Dock 2 (Drone-in-a-Box)</h4>
                  <p className="text-xs text-gray-400 mb-3">
                    Enables 100% remote takeoff, automatic rapid battery swapping, and scheduled autonomous savanna patrols without local operators.
                  </p>
                  <div className="text-[11px] font-mono text-gray-300 bg-slate-900 p-2 rounded">
                    Weatherproof Station • Remote Cloud Ops
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs font-mono text-amber-400 font-bold block mb-1">CONNECTIVITY TIER</span>
                  <h4 className="font-bold text-white mb-2">Starlink Mini Relay</h4>
                  <p className="text-xs text-gray-400 mb-3">
                    Remote areas like Hwange lack consistent 5G coverage. Starlink Mini mounted on the ranger patrol vehicle supplies 100Mbps+ uplink directly to cloud servers.
                  </p>
                  <div className="text-[11px] font-mono text-gray-300 bg-slate-900 p-2 rounded">
                    12V Low Power • 100+ Mbps Savanna Uplink
                  </div>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl">
                <h4 className="font-bold text-amber-300 text-sm mb-1 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Wildlife Conservation & Drone Ethics Note
                </h4>
                <p className="text-xs text-amber-100/90 leading-relaxed">
                  Per Zimbabwe National Parks and Wildlife Management Authority (Zimparks) guidelines, drones must maintain minimum operating altitudes (typically 100m+ AGL) to avoid stressing elephants, rhinos, and predators. Low-noise propellers and telephoto zoom optics ensure zero disturbance to wildlife.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'roadmap' && (
            <div className="flex flex-col gap-4">
              <div className="space-y-3">
                <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 flex items-start gap-4">
                  <span className="bg-emerald-500 text-black font-bold font-mono text-xs px-2.5 py-1 rounded">PHASE 1</span>
                  <div>
                    <h4 className="font-bold text-white text-sm">Visual & Interactive Prototype (CURRENT)</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Full dashboard UI, 4K wildlife streams, tactical HUD overlay, simulated live telemetry dials, interactive Leaflet GPS map, and WebXR Three.js 3D observation lounge for client approval and investor presentations.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start gap-4">
                  <span className="bg-cyan-500 text-black font-bold font-mono text-xs px-2.5 py-1 rounded">PHASE 2</span>
                  <div>
                    <h4 className="font-bold text-white text-sm">WebRTC Streaming Gateway & Real Telemetry Ingest</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Deploy MediaMTX media server, connect DJI RC Pro or field encoder via RTMP/SRT, and establish WebSocket telemetry relay with live GPS updates.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start gap-4">
                  <span className="bg-purple-500 text-black font-bold font-mono text-xs px-2.5 py-1 rounded">PHASE 3</span>
                  <div>
                    <h4 className="font-bold text-white text-sm">Production WebXR & Headset Immersion</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Native support for Meta Quest 3, Apple Vision Pro, and mobile VR headsets with 3D audio spatialization and interactive animal info cards in 3D space.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start gap-4">
                  <span className="bg-amber-500 text-black font-bold font-mono text-xs px-2.5 py-1 rounded">PHASE 4</span>
                  <div>
                    <h4 className="font-bold text-white text-sm">Automated Computer Vision & Field Park Deployment</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Integrate real-time YOLO object detection trained on African savanna wildlife for automated species identification, ranger anti-poaching alerts, and automated tracking.
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
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-5 py-2 rounded-lg text-xs font-mono transition-colors"
          >
            RETURN TO PROTOTYPE
          </button>
        </div>
      </div>
    </div>
  );
};
