'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SafariCameraStream, DroneTelemetry, WildlifeDetection, StreamStatus } from '@/types/safari';
import { DroneHudOverlay } from './DroneHudOverlay';
import { savannaAudio } from '@/utils/audioSynthesizer';
import { wildlifeDetectionService } from '@/services/wildlifeDetectionService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlay,
  faPause,
  faVolumeHigh,
  faVolumeXmark,
  faExpand,
  faCompress,
  faEye,
  faEyeSlash,
  faFire,
  faCamera,
  faVrCardboard,
  faTowerBroadcast,
  faCircleNotch,
  faDownload,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';

interface SafariVideoPlayerProps {
  currentStream: SafariCameraStream;
  streams: SafariCameraStream[];
  telemetry: DroneTelemetry;
  onSelectStream: (stream: SafariCameraStream) => void;
  onSelectAnimal: (animal: WildlifeDetection) => void;
  onLiveDetectionsFound?: (detections: WildlifeDetection[]) => void;
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
  onLiveDetectionsFound,
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<boolean>(false);
  const [snapshotStatus, setSnapshotStatus] = useState<{ message: string; isError?: boolean } | null>(null);
  const [simulatedPing, setSimulatedPing] = useState<number>(118);

  // Reset video error and show loading state when switching streams or videos
  useEffect(() => {
    setVideoError(false);
    setIsLoading(true);
  }, [currentStream.videoUrl]);

  // Ensure current stream is represented in the dropdown options
  const allStreams = streams.some((s) => s.id === currentStream.id)
    ? streams
    : [currentStream, ...streams];

  // Ping jitter simulation to reflect low-latency link
  useEffect(() => {
    const interval = setInterval(() => {
      setSimulatedPing(Math.floor(110 + Math.random() * 25));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Real-time Video Frame Scanner using YOLOv8
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDetectedVideo =
    currentStream.videoUrl.includes('/api/output/') ||
    currentStream.videoUrl.includes('_detected');

  // Ref to decouple callback from scanner effect to prevent re-render cascading
  const onLiveDetectionsFoundRef = useRef(onLiveDetectionsFound);
  useEffect(() => {
    onLiveDetectionsFoundRef.current = onLiveDetectionsFound;
  }, [onLiveDetectionsFound]);

  useEffect(() => {
    // If AI vision is off or video already has burned-in detections from YOLO, skip frame snapshotting
    if (!showAiVision || isDetectedVideo) {
      onLiveDetectionsFoundRef.current?.([]);
      return;
    }

    // Immediately clear detections when switching videos to prevent previous video's animals from persisting
    onLiveDetectionsFoundRef.current?.([]);

    let isScanning = false;
    let timerId: NodeJS.Timeout;
    let isMounted = true;

    const runFrameScan = async () => {
      if (!isMounted) return;
      const video = videoRef.current;
      if (!video || video.paused || video.ended || video.readyState < 2) {
        timerId = setTimeout(runFrameScan, 250);
        return;
      }

      if (isScanning) {
        timerId = setTimeout(runFrameScan, 100);
        return;
      }

      try {
        isScanning = true;
        if (!scanCanvasRef.current) {
          scanCanvasRef.current = document.createElement('canvas');
        }
        const canvas = scanCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          isScanning = false;
          if (isMounted) timerId = setTimeout(runFrameScan, 250);
          return;
        }

        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 360;
        const scale = Math.min(640 / vw, 640 / vh, 1.0);
        canvas.width = Math.round(vw * scale);
        canvas.height = Math.round(vh * scale);

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
          try {
            if (blob && isMounted) {
              const liveDetections = await wildlifeDetectionService.detectFrame(blob, 0.25);
              if (isMounted) {
                // Always report detections to HUD: if animals are detected, show them;
                // if none are detected in this frame, CLEAR the overlay immediately!
                onLiveDetectionsFoundRef.current?.(liveDetections || []);
              }
            }
          } catch {
            // Keep going on network hiccup
          } finally {
            isScanning = false;
            if (isMounted) {
              // Schedule next scan in 250ms for smooth real-time tracking
              timerId = setTimeout(runFrameScan, 250);
            }
          }
        }, 'image/jpeg', 0.80);
      } catch {
        isScanning = false;
        if (isMounted) {
          timerId = setTimeout(runFrameScan, 250);
        }
      }
    };

    timerId = setTimeout(runFrameScan, 200);

    return () => {
      isMounted = false;
      clearTimeout(timerId);
    };
  }, [showAiVision, isDetectedVideo, currentStream.videoUrl]);

  // Synchronize fullscreen state with document changes (e.g. user presses Esc)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Ambient soundscape audio toggle
  const toggleAudio = () => {
    const active = savannaAudio.toggle();
    setIsAudioMuted(!active);
  };

  // Procedural Canvas Drone Camera Feed Fallback / Offline Engine
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
        const seedX = (i * 137.5 + frame * 0.4) % w;
        const seedY = (i * 91.3) % h;
        const radius = 12 + (i % 8) * 3;
        ctx.beginPath();
        ctx.arc(seedX, seedY, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Procedural Elephant silhouettes crossing the plain
      ctx.fillStyle = '#3a3a3a';
      const herdBaseX = w * 0.4 + Math.sin(frame * 0.01) * 30;
      const herdBaseY = h * 0.5 + Math.cos(frame * 0.008) * 20;

      // Lead Matriarch
      ctx.beginPath();
      ctx.ellipse(herdBaseX, herdBaseY, 32, 22, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(herdBaseX + 26, herdBaseY - 6, 14, 0, Math.PI * 2);
      ctx.fill();

      // Following herd members
      ctx.beginPath();
      ctx.ellipse(herdBaseX - 50, herdBaseY + 25, 26, 18, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(herdBaseX - 90, herdBaseY + 15, 18, 12, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Atmospheric shimmer
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
      } else {
        videoRef.current.play().catch(() => {});
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // HIGH-PRIORITY FIX: Real Snapshot Capture with Telemetry Watermark & File Download
  type SnapshotSource = 'video' | 'procedural' | 'failed';

  const handleTakeSnapshot = useCallback(() => {
    const captureWidth = 1920;
    const captureHeight = 1080;
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = captureWidth;
    captureCanvas.height = captureHeight;
    const ctx = captureCanvas.getContext('2d');

    if (!ctx) {
      setSnapshotStatus({ message: 'Failed to initialize capture canvas', isError: true });
      setTimeout(() => setSnapshotStatus(null), 3500);
      return;
    }

    let snapshotSource: SnapshotSource = 'failed';

    // 1. Attempt to draw the live video frame
    if (!videoError && videoRef.current && videoRef.current.readyState >= 2) {
      try {
        ctx.drawImage(videoRef.current, 0, 0, captureWidth, captureHeight);
        snapshotSource = 'video';
      } catch {
        // Cross-origin security may taint the canvas if CORS headers are absent
        snapshotSource = 'failed';
      }
    }

    // 2. Fall back to the procedural canvas if the video could not be drawn
    if (snapshotSource === 'failed' && canvasRef.current) {
      try {
        ctx.drawImage(canvasRef.current, 0, 0, captureWidth, captureHeight);
        snapshotSource = 'procedural';
      } catch {
        snapshotSource = 'failed';
      }
    }

    // 3. Abort export — neither video nor procedural canvas was captured
    if (snapshotSource === 'failed') {
      setSnapshotStatus({
        message: 'Snapshot failed: no video frame or canvas available',
        isError: true,
      });
      setTimeout(() => setSnapshotStatus(null), 4000);
      return;
    }

    // 4. Render Tactical Telemetry Watermark Overlay
    // Top banner
    ctx.fillStyle = 'rgba(7, 13, 19, 0.85)';
    ctx.fillRect(40, 40, 720, 160);
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 40, 720, 160);

    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('SAFARIVISION TACTICAL INSPECTION', 60, 80);

    ctx.fillStyle = '#f3f4f6';
    ctx.font = '20px monospace';
    ctx.fillText(`DRONE ID:  ${telemetry.droneId} (${telemetry.droneModel})`, 60, 115);
    ctx.fillText(`GPS FIX:   ${telemetry.latitude.toFixed(6)}°, ${telemetry.longitude.toFixed(6)}° (RTK ${telemetry.rtkStatus})`, 60, 145);
    ctx.fillText(`ALTITUDE:  ${telemetry.altitude.toFixed(1)}m AGL | AIRSPEED: ${telemetry.speed.toFixed(1)} km/h | HDG: ${Math.round(telemetry.heading)}°`, 60, 175);

    // Source label (bottom-left, small)
    const sourceLabel = snapshotSource === 'video' ? 'SOURCE: LIVE VIDEO FRAME' : 'SOURCE: PROCEDURAL CANVAS';
    ctx.fillStyle = 'rgba(7, 13, 19, 0.7)';
    ctx.fillRect(40, captureHeight - 60, 420, 40);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px monospace';
    ctx.fillText(sourceLabel, 55, captureHeight - 34);

    // Bottom Watermark Timestamp
    const nowIso = new Date().toISOString();
    ctx.fillStyle = 'rgba(7, 13, 19, 0.85)';
    ctx.fillRect(captureWidth - 620, captureHeight - 100, 580, 60);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(captureWidth - 620, captureHeight - 100, 580, 60);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`TIMESTAMP: ${nowIso}`, captureWidth - 600, captureHeight - 65);

    // Target crosshair in center
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(captureWidth / 2 - 40, captureHeight / 2);
    ctx.lineTo(captureWidth / 2 + 40, captureHeight / 2);
    ctx.moveTo(captureWidth / 2, captureHeight / 2 - 40);
    ctx.lineTo(captureWidth / 2, captureHeight / 2 + 40);
    ctx.stroke();

    // 5. Trigger Real Browser Download
    try {
      captureCanvas.toBlob((blob) => {
        if (!blob) {
          setSnapshotStatus({ message: 'Failed to export image blob', isError: true });
          setTimeout(() => setSnapshotStatus(null), 3500);
          return;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const filename = `SafariVision_Snapshot_${Date.now()}.png`;
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Defer revocation so the browser has time to consume the object URL
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        setSnapshotStatus({
          message: `Saved ${snapshotSource === 'video' ? 'video frame' : 'procedural frame'}: ${filename}`,
          isError: false,
        });
        setTimeout(() => setSnapshotStatus(null), 4000);
      }, 'image/png');
    } catch (err: any) {
      setSnapshotStatus({
        message: 'Snapshot capture restricted by video CORS. Fallback logged.',
        isError: true,
      });
      setTimeout(() => setSnapshotStatus(null), 4000);
    }
  }, [telemetry, videoError]);

  // Stream status badge mapping
  const renderStatusBadge = () => {
    switch (currentStream.streamStatus) {
      case 'live':
        return (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded text-emerald-800 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>LIVE FEED (WEBRTC)</span>
          </div>
        );
      case 'demo':
        return (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded text-amber-800 font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>DEMO FOOTAGE (SAMPLE FEED)</span>
          </div>
        );
      case 'connecting':
        return (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-300 px-2.5 py-1 rounded text-blue-800 font-bold">
            <FontAwesomeIcon icon={faCircleNotch} className="w-3 h-3 animate-spin text-blue-600" />
            <span>CONNECTING...</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded text-slate-700 font-bold">
            <span>FEED OFFLINE</span>
          </div>
        );
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-xs flex flex-col p-1.5 ${
        isFullscreen ? 'h-screen rounded-none border-none p-0' : 'aspect-[16/9] min-h-[460px]'
      }`}
    >
      {/* Video Stream or Fallback Engine */}
      <div className="relative w-full h-full flex-1 overflow-hidden rounded-xl bg-slate-900">
        {isLoading && !videoError && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/80 backdrop-blur-xs">
            <div className="flex flex-col items-center gap-2 font-mono text-xs text-slate-800">
              <FontAwesomeIcon icon={faCircleNotch} className="w-8 h-8 animate-spin text-emerald-600" />
              <span className="font-bold">BUFFERING STREAM FEED...</span>
            </div>
          </div>
        )}

        {/* Real-time Status Badge */}
        {isDetectedVideo ? (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-white/95 backdrop-blur-md border border-slate-200 text-slate-900 px-3.5 py-1 rounded-full text-xs font-mono shadow-md font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="tracking-wide">YOLO DETECTED STREAM (NATIVE HD)</span>
          </div>
        ) : showAiVision ? (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-white/95 backdrop-blur-md border border-slate-200 text-slate-900 px-3.5 py-1 rounded-full text-xs font-mono shadow-md font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="tracking-wide">RAW DRONE CAMERA FEED</span>
          </div>
        ) : null}

        {!videoError ? (
          <video
            ref={videoRef}
            key={currentStream.videoUrl}
            src={currentStream.videoUrl}
            poster={currentStream.posterUrl}
            autoPlay
            loop
            muted
            playsInline
            onLoadStart={() => setIsLoading(true)}
            onCanPlay={() => setIsLoading(false)}
            onPlaying={() => {
              setIsPlaying(true);
              setIsLoading(false);
            }}
            onPause={() => setIsPlaying(false)}
            onError={() => {
              setVideoError(true);
              setIsLoading(false);
            }}
            className={`w-full h-full object-contain bg-black transition-filter duration-300 ${
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
            className={`w-full h-full object-contain bg-black ${
              showThermal ? 'filter invert contrast-150' : ''
            }`}
          />
        )}

        {/* Tactical HUD Telemetry Layer */}
        <DroneHudOverlay
          telemetry={telemetry}
          wildlifeDetections={isDetectedVideo ? [] : currentStream.detectedWildlife}
          showAiVision={showAiVision}
          showThermal={showThermal}
          onSelectAnimal={onSelectAnimal}
        />

        {/* Snapshot Notification Banner */}
        {snapshotStatus && (
          <div
            className={`absolute top-20 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-lg font-mono text-xs font-bold flex items-center gap-2 shadow-xl animate-bounce ${
              snapshotStatus.isError
                ? 'bg-amber-500 text-black'
                : 'bg-emerald-500 text-black'
            }`}
          >
            {snapshotStatus.isError ? (
              <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4" />
            ) : (
              <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
            )}
            <span>{snapshotStatus.message}</span>
          </div>
        )}
      </div>

      {/* Control Console & Bottom HUD Toolbar */}
      <div className="relative z-20 bg-white border-t border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-800">
        {/* Stream Status & Source Selector */}
        <div className="flex items-center gap-3">
          {renderStatusBadge()}

          <div className="flex items-center gap-1.5 text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200">
            <FontAwesomeIcon icon={faTowerBroadcast} className="w-3 h-3 text-emerald-600" />
            <span>{currentStream.quality}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-900 font-bold">{currentStream.bitrateMbps} Mbps</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600">LATENCY: {simulatedPing}ms</span>
          </div>

          {/* Quick Stream Dropdown */}
          <select
            value={currentStream.id}
            onChange={(e) => {
              const selected = allStreams.find((s) => s.id === e.target.value);
              if (selected) {
                setVideoError(false);
                setIsLoading(true);
                onSelectStream(selected);
              }
            }}
            className="bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 px-3 py-1 rounded focus:outline-none cursor-pointer"
          >
            {allStreams.map((stream) => (
              <option key={stream.id} value={stream.id}>
                {stream.name}
              </option>
            ))}
          </select>
        </div>

        {/* Feature Switches & Tools */}
        <div className="flex items-center gap-2">
          {/* Play/Pause Button */}
          <button
            onClick={togglePlay}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-300 p-1.5 rounded text-slate-700 cursor-pointer shadow-2xs"
            title={isPlaying ? 'Pause Feed' : 'Resume Feed'}
          >
            <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} className="w-3.5 h-3.5" />
          </button>

          {/* Detection Overlay Toggle */}
          <button
            onClick={() => setShowAiVision(!showAiVision)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded border transition-all cursor-pointer shadow-2xs ${
              showAiVision
                ? 'bg-emerald-50 border-emerald-400 text-emerald-800 font-semibold'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title="Toggle Wildlife Bounding Boxes"
          >
            <FontAwesomeIcon icon={showAiVision ? faEye : faEyeSlash} className="w-3.5 h-3.5" />
            <span>DETECTIONS</span>
          </button>

          {/* Thermal Vision Toggle */}
          <button
            onClick={() => setShowThermal(!showThermal)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded border transition-all cursor-pointer shadow-2xs ${
              showThermal
                ? 'bg-amber-50 border-amber-400 text-amber-800 font-semibold'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title="Toggle Thermal Imagery"
          >
            <FontAwesomeIcon icon={faFire} className="w-3.5 h-3.5" />
            <span>THERMAL</span>
          </button>

          {/* Snapshot Button */}
          <button
            onClick={handleTakeSnapshot}
            className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 px-3 py-1 rounded transition-colors cursor-pointer shadow-2xs"
            title="Capture Geotagged Frame"
          >
            <FontAwesomeIcon icon={faCamera} className="w-3.5 h-3.5 text-blue-600" />
            <span>SNAPSHOT</span>
          </button>

          {/* Savanna Audio Toggle */}
          <button
            onClick={toggleAudio}
            className={`flex items-center gap-1.5 px-3 py-1 rounded border transition-colors cursor-pointer shadow-2xs ${
              !isAudioMuted
                ? 'bg-blue-50 border-blue-400 text-blue-800'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title="Toggle Savanna Soundscape"
          >
            <FontAwesomeIcon icon={!isAudioMuted ? faVolumeHigh : faVolumeXmark} className="w-3.5 h-3.5" />
            <span>AUDIO</span>
          </button>

          {/* Enter VR Action Button */}
          <button
            onClick={onEnterVr}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1 rounded shadow-xs transition-all cursor-pointer"
          >
            <FontAwesomeIcon icon={faVrCardboard} className="w-3.5 h-3.5" />
            <span>VR</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-300 p-1.5 rounded text-slate-700 cursor-pointer shadow-2xs"
            title="Toggle Fullscreen"
          >
            <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
