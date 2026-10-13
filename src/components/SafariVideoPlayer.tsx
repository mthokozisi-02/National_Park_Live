'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SafariCameraStream, DroneTelemetry, WildlifeDetection } from '@/types/safari';
import { DroneHudOverlay } from './DroneHudOverlay';
import { savannaAudio } from '@/utils/audioSynthesizer';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Eye,
  EyeOff,
  Flame,
  Camera,
  Radio,
  Sliders,
  CheckCircle2,
  Share2
} from 'lucide-react';

interface SafariVideoPlayerProps {
  currentStream: SafariCameraStream;
  streams: SafariCameraStream[];
  telemetry: DroneTelemetry;
  onSelectStream: (stream: SafariCameraStream) => void;
  onSelectAnimal: (animal: WildlifeDetection) => void;
  showAiVision: boolean;
  setShowAiVision: (val: boolean) => void;
  showThermal: boolean;
  setShowThermal: (val: boolean) => void;
  onEnterVr: () => void;
}

export const SafariVideoPlayer: React.FC<SafariVideoPlayerProps> = ({
  currentStream,
  streams,
  telemetry,
  onSelectStream,
  onSelectAnimal,
  showAiVision,
  setShowAiVision,
  showThermal,
  setShowThermal,
  onEnterVr,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<boolean>(false);
  const [snapshotSuccess, setSnapshotSuccess] = useState<string | null>(null);
  const [simulatedPing, setSimulatedPing] = useState<number>(118);

  // Ping jitter simulation to reflect live WebRTC link
  useEffect(() => {
    const interval = setInterval(() => {
      setSimulatedPing(Math.floor(110 + Math.random() * 25));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Sync ambient soundscape
  const toggleAudio = () => {
    const active = savannaAudio.toggle();
    setIsAudioMuted(!active);
  };

  // Procedural Canvas Drone Camera Feed Fallback / Overlay
  useEffect(() => {
    if (!videoError) return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    const render = () => {
      frame++;
      const w = canvas.width;
      const h = canvas.height;

      // Savanna aerial grassland background
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#534327');
      grad.addColorStop(0.5, '#6a5a36');
      grad.addColorStop(1, '#42361e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Procedural Acacia Trees & scrub bushes
      ctx.fillStyle = '#283818';
      for (let i = 0; i < 40; i++) {
        const seedX = ((i * 137.5 + frame * 0.4) % w);
        const seedY = (i * 91.3) % h;
        const radius = 12 + (i % 8) * 3;
        ctx.beginPath();
        ctx.arc(seedX, seedY, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Procedural Elephant silhouettes crossing the plain
      ctx.fillStyle = '#3a3a3a';
      const herdBaseX = (w * 0.4 + Math.sin(frame * 0.01) * 30);
      const herdBaseY = (h * 0.5 + Math.cos(frame * 0.008) * 20);

      // Lead Matriarch
      ctx.beginPath();
      ctx.ellipse(herdBaseX, herdBaseY, 32, 22, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath(); // Head & Ears
      ctx.arc(herdBaseX + 26, herdBaseY - 6, 14, 0, Math.PI * 2);
      ctx.fill();

      // Following herd members
      ctx.beginPath();
      ctx.ellipse(herdBaseX - 50, herdBaseY + 25, 26, 18, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(herdBaseX - 90, herdBaseY + 15, 18, 12, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Sun glint / heat shimmer
      ctx.fillStyle = 'rgba(255, 230, 180, 0.04)';
      ctx.fillRect(0, 0, w, h);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [videoError]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleTakeSnapshot = useCallback(() => {
    setSnapshotSuccess('Tactical inspection snapshot captured with GPS stamp!');
    setTimeout(() => setSnapshotSuccess(null), 3500);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl overflow-hidden border border-cyan-500/30 bg-black shadow-2xl flex flex-col ${
        isFullscreen ? 'h-screen rounded-none border-none' : 'aspect-[16/9] min-h-[460px]'
      }`}
    >
      {/* Video Stream or Fallback Engine */}
      <div className="relative w-full h-full flex-1 overflow-hidden bg-slate-950">
        {!videoError ? (
          <video
            ref={videoRef}
            src={currentStream.videoUrl}
            poster={currentStream.posterUrl}
            autoPlay
            loop
            muted
            playsInline
            onError={() => setVideoError(true)}
            className={`w-full h-full object-cover transition-filter duration-300 ${
              showThermal
                ? 'filter invert contrast-200 hue-rotate-180 brightness-90 saturate-200'
                : ''
            }`}
          />
        ) : (
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            className={`w-full h-full object-cover ${
              showThermal ? 'filter invert contrast-150' : ''
            }`}
          />
        )}

        {/* Tactical HUD Telemetry Layer */}
        <DroneHudOverlay
          telemetry={telemetry}
          wildlifeDetections={currentStream.detectedWildlife}
          showAiVision={showAiVision}
          showThermal={showThermal}
          onSelectAnimal={onSelectAnimal}
        />

        {/* Snapshot Success Notification Banner */}
        {snapshotSuccess && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-emerald-500 text-black px-4 py-2 rounded-lg font-mono text-xs font-bold flex items-center gap-2 shadow-lg animate-bounce">
            <CheckCircle2 className="w-4 h-4" />
            {snapshotSuccess}
          </div>
        )}
      </div>

      {/* Control Console & Bottom HUD Toolbar */}
      <div className="relative z-20 bg-slate-950/90 backdrop-blur-xl border-t border-cyan-500/20 px-4 py-3 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        {/* Stream Status & Source Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-red-600/20 border border-red-500/50 px-2.5 py-1 rounded text-red-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>LIVE FEED</span>
          </div>

          <div className="flex items-center gap-1.5 text-gray-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>{currentStream.quality}</span>
            <span className="text-gray-600">•</span>
            <span className="text-cyan-400">{currentStream.bitrateMbps} Mbps</span>
            <span className="text-gray-600">•</span>
            <span className="text-emerald-400">{simulatedPing}ms WebRTC</span>
          </div>

          {/* Quick Stream Dropdown */}
          <select
            value={currentStream.id}
            onChange={(e) => {
              const selected = streams.find((s) => s.id === e.target.value);
              if (selected) {
                setVideoError(false);
                onSelectStream(selected);
              }
            }}
            className="bg-slate-900 border border-slate-700 hover:border-cyan-500 text-gray-200 px-3 py-1 rounded focus:outline-none cursor-pointer"
          >
            {streams.map((stream) => (
              <option key={stream.id} value={stream.id}>
                {stream.name}
              </option>
            ))}
          </select>
        </div>

        {/* Feature Switches & Tactical Tools */}
        <div className="flex items-center gap-2">
          {/* AI Vision Overlay Toggle */}
          <button
            onClick={() => setShowAiVision(!showAiVision)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded border transition-all ${
              showAiVision
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                : 'bg-slate-900 border-slate-800 text-gray-400 hover:text-gray-200'
            }`}
            title="Toggle AI Wildlife Bounding Boxes"
          >
            {showAiVision ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>AI VISION</span>
          </button>

          {/* FLIR Thermal Night Vision Toggle */}
          <button
            onClick={() => setShowThermal(!showThermal)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded border transition-all ${
              showThermal
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'bg-slate-900 border-slate-800 text-gray-400 hover:text-gray-200'
            }`}
            title="Toggle Anti-Poaching FLIR Thermal Imagery"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>FLIR THERMAL</span>
          </button>

          {/* Snapshot Button */}
          <button
            onClick={handleTakeSnapshot}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400 text-gray-300 px-3 py-1 rounded transition-colors"
            title="Capture Geotagged Frame"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span>SNAPSHOT</span>
          </button>

          {/* Savanna Ambient Soundscape Toggle */}
          <button
            onClick={toggleAudio}
            className={`flex items-center gap-1.5 px-3 py-1 rounded border transition-colors ${
              !isAudioMuted
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-gray-400 hover:text-gray-200'
            }`}
            title="Toggle Procedural Savanna Soundscape"
          >
            {!isAudioMuted ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>SAVANNA AUDIO</span>
          </button>

          {/* Enter VR Action Button */}
          <button
            onClick={onEnterVr}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold px-3 py-1 rounded shadow-md hover:shadow-amber-500/30 transition-all cursor-pointer"
          >
            <span>ENTER VR</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 p-1 rounded text-gray-300"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
