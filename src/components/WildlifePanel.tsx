'use client';

import React, { useState, useEffect } from 'react';
import { WildlifeDetection } from '@/types/safari';
import { wildlifeDetectionService } from '@/services/wildlifeDetectionService';
import { BackendHealth, ModelDetectionResponse } from '@/types/wildlifeDetection';
import {
  Sparkles,
  Info,
  Clock,
  ChevronRight,
  X,
  Cpu,
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Video
} from 'lucide-react';

interface WildlifePanelProps {
  detections: WildlifeDetection[];
  selectedAnimal: WildlifeDetection | null;
  onSelectAnimal: (animal: WildlifeDetection | null) => void;
  onModelDetectionsLoaded?: (detections: WildlifeDetection[]) => void;
  onPlayVideoOnMainScreen?: (videoUrl: string, title: string) => void;
  currentVideoName?: string;
}

const DEFAULT_VIDEOS = [
  'final.mp4',
  'safari-feed-alpha.webm',
  'safari-feed-bravo.webm',
  'final_test.mp4',
  'safari.webm',
  'safari_test.mp4',
  'test.mp4',
];

export const WildlifePanel: React.FC<WildlifePanelProps> = ({
  detections,
  selectedAnimal,
  onSelectAnimal,
  onModelDetectionsLoaded,
  onPlayVideoOnMainScreen,
  currentVideoName = 'final.mp4',
}) => {
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null);
  const [isCheckingBackend, setIsCheckingBackend] = useState<boolean>(true);
  const [isInferring, setIsInferring] = useState<boolean>(false);
  const [inferenceResult, setInferenceResult] = useState<ModelDetectionResponse | null>(null);
  const [inferenceError, setInferenceError] = useState<string | null>(null);
  const [availableVideos, setAvailableVideos] = useState<string[]>(DEFAULT_VIDEOS);
  const [selectedVideo, setSelectedVideo] = useState<string>('final.mp4');
  const [scanMode, setScanMode] = useState<'full' | 'preview'>('full');
  const [lastOutputVideoUrl, setLastOutputVideoUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'catalog' | 'model'>('catalog');

  // Check FastAPI backend status
  const checkBackendStatus = async () => {
    setIsCheckingBackend(true);
    const health = await wildlifeDetectionService.checkHealth();
    const videos = await wildlifeDetectionService.listVideos();
    setBackendHealth(health);
    if (videos && videos.length > 0) {
      setAvailableVideos(Array.from(new Set([...DEFAULT_VIDEOS, ...videos])));
    }
    setIsCheckingBackend(false);
  };

  useEffect(() => {
    checkBackendStatus();
  }, []);

  const handlePlayOnMainScreen = (videoName: string) => {
    if (onPlayVideoOnMainScreen) {
      onPlayVideoOnMainScreen(`/videos/${videoName}`, `${videoName} (Live Safari Feed)`);
    }
  };

  // Trigger real YOLO detection via FastAPI
  const handleRunInference = async () => {
    const targetVideo = selectedVideo || (availableVideos.length > 0 ? availableVideos[0] : 'safari.webm');
    setIsInferring(true);
    setInferenceError(null);
    setLastOutputVideoUrl(null);

    try {
      const result = await wildlifeDetectionService.runDetection(targetVideo, {
        conf: 0.25,
        // Full scan: omit maxFrames so backend processes all frames; Preview: cap at 100
        ...(scanMode === 'preview' ? { maxFrames: 100 } : {}),
        frameStride: 2,
      });
      setInferenceResult(result);
      setActiveTab('model');

      // Build the output video URL from the backend response
      if (result.output_url) {
        const outputFilename = result.output_url.split('/').pop() || '';
        const outputUrl = wildlifeDetectionService.getOutputVideoUrl(outputFilename);
        setLastOutputVideoUrl(outputUrl);
      }

      // Convert sample detections to WildlifeDetection objects for the HUD & catalog
      if (result.sample_detections && result.sample_detections.length > 0) {
        // Map unique species found
        const speciesMap = new Map<string, WildlifeDetection>();
        const counts = result.species_frame_counts || result.species_counts || {};

        result.sample_detections.forEach((det, idx) => {
          if (!speciesMap.has(det.common_name)) {
            const animal = wildlifeDetectionService.convertToWildlifeDetection(
              det,
              counts[det.common_name] || 1,
              result.video,
              idx
            );
            speciesMap.set(det.common_name, animal);
          }
        });

        if (onModelDetectionsLoaded) {
          onModelDetectionsLoaded(Array.from(speciesMap.values()));
        }
      }
    } catch (err: any) {
      setInferenceError(err.message || 'Detection failed');
    } finally {
      setIsInferring(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-sm tracking-wide text-gray-100">
            AI WILDLIFE SIGHTINGS
          </span>
        </div>
        
        {/* Backend Online / Offline Status Badge */}
        {backendHealth && backendHealth.model_loaded ? (
          <span className="flex items-center gap-1.5 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            YOLO ONLINE ({backendHealth.model} • {backendHealth.device ? backendHealth.device.toUpperCase() : 'CPU'})
          </span>
        ) : (
          <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-semibold">
            SIMULATED CATALOG
          </span>
        )}
      </div>

      {/* Backend Action Control Bar */}
      <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-3 flex flex-col gap-2 shadow-inner">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-cyan-400 font-bold">
            <Cpu className="w-4 h-4" />
            <span>FASTAPI YOLO INFERENCE</span>
          </div>
          {isCheckingBackend && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
        </div>

        <p className="text-[11px] text-gray-400 leading-snug">
          Run the Ultralytics YOLOv8 neural network against sample safari video footage to detect live wildlife with real bounding boxes.
        </p>

        <div className="flex flex-col gap-2.5 pt-1">
          {/* Video Selection Dropdown - Always Available */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Video className="w-3.5 h-3.5" /> SELECT VIDEO FOOTAGE:
              </span>
              <span className="text-[9px] text-gray-500 font-mono">
                {availableVideos.length} videos available
              </span>
            </label>
            <select
              value={selectedVideo}
              onChange={(e) => {
                setSelectedVideo(e.target.value);
                handlePlayOnMainScreen(e.target.value);
              }}
              disabled={isInferring}
              className="w-full bg-slate-950 border border-slate-700 hover:border-cyan-500 text-gray-200 px-2.5 py-1.5 rounded text-xs font-mono focus:outline-none cursor-pointer disabled:opacity-50"
            >
              {availableVideos.map((v) => (
                <option key={v} value={v}>
                  {v === 'final.mp4' ? '🌟 final.mp4 (Full 3m 4s Safari Video)' : v}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons: Real-Time Play/Scan vs Full Batch Scan */}
          <div className="flex flex-col gap-2">
            {/* Real-time Play on Main Screen Button */}
            <button
              onClick={() => handlePlayOnMainScreen(selectedVideo)}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black py-2 px-3 rounded-lg text-xs transition-all shadow-lg hover:shadow-emerald-500/20 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>▶ PLAY & SCAN ON MAIN DISPLAY (REAL TIME)</span>
            </button>

            {/* Batch YOLO Scan Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRunInference()}
                disabled={isInferring || !backendHealth}
                className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/50 text-amber-300 font-bold py-1.5 px-3 rounded text-xs transition-all disabled:opacity-50 cursor-pointer"
                title={backendHealth ? 'Run YOLO inference across all frames' : 'Backend required for batch export'}
              >
                {isInferring ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>SCANNING ALL FRAMES...</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-3.5 h-3.5 text-amber-400" />
                    <span>⚡ BATCH SCAN (ALL FRAMES)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Inference Result Summary Banner */}
          {inferenceResult && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded p-2 text-[10px] text-gray-300 flex flex-col gap-1">
              <div className="flex items-center justify-between text-emerald-400 font-bold">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> YOLO INFERENCE COMPLETE
                </span>
                <span>{inferenceResult.frames_processed} frames ({inferenceResult.duration_seconds}s)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Frame Detections:</span>
                <span className="text-amber-300 font-semibold">
                  {inferenceResult.total_frame_detections ?? inferenceResult.detections}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Detections by Class:</span>
                <span className="text-amber-300 font-semibold">
                  {Object.entries(inferenceResult.species_frame_counts || inferenceResult.species_counts || {})
                    .map(([k, v]) => `${k} (${v})`)
                    .join(', ') || 'None'}
                </span>
              </div>

              {/* Play Annotated Output on Main Screen */}
              {lastOutputVideoUrl && onPlayVideoOnMainScreen && (
                <button
                  onClick={() => onPlayVideoOnMainScreen(lastOutputVideoUrl, `${selectedVideo} — AI Annotated`)}
                  className="mt-1 flex items-center justify-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-1.5 px-3 rounded text-[11px] transition-all cursor-pointer shadow-md"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>▶ PLAY ANNOTATED VIDEO ON MAIN SCREEN</span>
                </button>
              )}

              <div className="text-[9px] text-gray-400 italic pt-0.5 border-t border-emerald-900/40">
                * Frame detections count appearances across evaluated frames.
              </div>
            </div>
          )}

          {inferenceError && (
            <div className="bg-red-950/40 border border-red-500/40 rounded p-2 text-[10px] text-red-300 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              <span>{inferenceError}</span>
            </div>
          )}

          {/* Backend Offline Guidance Card */}
          {!backendHealth && (
            <div className="bg-slate-950/90 border border-amber-500/30 rounded p-2 text-[10px] text-gray-300 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-amber-300 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  FastAPI Backend Offline
                </span>
                <button
                  onClick={checkBackendStatus}
                  className="text-[9px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40 font-bold cursor-pointer"
                >
                  Retry Connect
                </button>
              </div>
              <p className="text-[10px] text-gray-400">
                Real-time video plays in the main display. To enable custom YOLO batch export, start your backend:
              </p>
              <code className="text-amber-200 bg-black/60 px-1.5 py-0.5 rounded font-mono text-[9px] select-all">
                .\backend\.venv\Scripts\uvicorn.exe app.main:app --port 8000
              </code>
            </div>
          )}
        </div>
      </div>

      {/* Sightings List */}
      <div className="flex flex-col gap-2.5 max-h-[340px] overflow-y-auto pr-1">
        {detections.map((animal) => (
          <div
            key={animal.id}
            onClick={() => onSelectAnimal(animal)}
            className="group bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/60 p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-700 group-hover:border-amber-400 flex-shrink-0">
                <img
                  src={animal.imageUrl}
                  alt={animal.commonName}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <span className="absolute bottom-0 right-0 bg-black/80 text-[8px] text-amber-300 px-1 font-bold">
                  x{animal.count}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-200 text-xs group-hover:text-amber-300 transition-colors">
                    {animal.commonName}
                  </span>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 rounded">
                    {(animal.confidence * 100).toFixed(0)}%
                  </span>
                  {animal.source === 'model' && (
                    <span className="text-[8px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-1 rounded font-bold">
                      YOLO
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-gray-400 italic">
                  {animal.scientificName}
                </div>
                <div className="flex items-center gap-2 text-[9px] text-gray-500 mt-1">
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" /> {animal.timestamp}
                  </span>
                  <span>•</span>
                  <span>Dist: {animal.distanceFromDroneM}m</span>
                  <span>•</span>
                  <span className="text-amber-400/90">{animal.conservationStatus}</span>
                </div>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
          </div>
        ))}
      </div>

      {/* Selected Wildlife Encyclopedia Modal */}
      {selectedAnimal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative font-sans text-gray-200">
            {/* Modal Image Header */}
            <div className="relative h-48 w-full">
              <img
                src={selectedAnimal.imageUrl}
                alt={selectedAnimal.commonName}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
              <button
                onClick={() => onSelectAnimal(null)}
                className="absolute top-3 right-3 bg-black/60 hover:bg-black/90 text-white p-1.5 rounded-full border border-white/20 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="absolute bottom-3 left-4 right-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-amber-500 text-black font-bold text-xs px-2 py-0.5 rounded font-mono flex items-center gap-1">
                    <Cpu className="w-3 h-3" />
                    {selectedAnimal.source === 'model' ? 'YOLOv8 MODEL' : 'SIMULATED AI'} • {(selectedAnimal.confidence * 100).toFixed(0)}%
                  </span>
                  <span className="bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] px-2 py-0.5 rounded font-mono">
                    {selectedAnimal.conservationStatus}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {selectedAnimal.commonName}
                </h3>
                <p className="text-xs text-amber-200/90 italic font-mono">
                  {selectedAnimal.scientificName} • Source: {selectedAnimal.source.toUpperCase()} ({selectedAnimal.modelVersion || 'YOLOv8n'})
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex flex-col gap-3.5 max-h-[60vh] overflow-y-auto">
              <div>
                <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-1">
                  Observed Behavior & Real-time Context
                </h4>
                <p className="text-sm text-gray-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  {selectedAnimal.behavior}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-1">
                  Ecosystem Role in Hwange
                </h4>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {selectedAnimal.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-gray-400 block text-[10px]">DIET</span>
                  <span className="text-emerald-300 font-semibold">{selectedAnimal.diet}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-gray-400 block text-[10px]">HABITAT</span>
                  <span className="text-cyan-300 font-semibold">{selectedAnimal.habitat}</span>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-1">
                  <Info className="w-3.5 h-3.5" />
                  <span>DID YOU KNOW?</span>
                </div>
                <p className="text-amber-100/90 leading-relaxed">
                  {selectedAnimal.funFact}
                </p>
              </div>

              <div className="text-[10px] text-gray-500 font-mono italic">
                {selectedAnimal.source === 'model'
                  ? '* Detections generated by Ultralytics YOLOv8 object recognition model directly from video frames.'
                  : '* Note: Wildlife metadata and detections are currently simulated demonstration values to showcase prospective computer vision cataloging before deploying real aerial models.'}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => onSelectAnimal(null)}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-4 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer"
              >
                CLOSE BIO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
