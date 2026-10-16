'use client';

import React, { useState, useEffect } from 'react';
import { WildlifeDetection } from '@/types/safari';
import { wildlifeDetectionService } from '@/services/wildlifeDetectionService';
import { BackendHealth, ModelDetectionResponse } from '@/types/wildlifeDetection';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPaw,
  faCircleInfo,
  faClock,
  faChevronRight,
  faXmark,
  faMicrochip,
  faPlay,
  faCircleNotch,
  faCircleCheck,
  faTriangleExclamation,
  faVideo,
} from '@fortawesome/free-solid-svg-icons';

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
  const [outputVideos, setOutputVideos] = useState<string[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string>('final.mp4');
  const [scanMode, setScanMode] = useState<'full' | 'preview'>('full');
  const [lastOutputVideoUrl, setLastOutputVideoUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'catalog' | 'model'>('catalog');

  // Check FastAPI backend status and fetch available input & detected output videos
  const checkBackendStatus = async () => {
    setIsCheckingBackend(true);
    const health = await wildlifeDetectionService.checkHealth();
    const videos = await wildlifeDetectionService.listVideos();
    const outputs = await wildlifeDetectionService.listOutputVideos();
    setBackendHealth(health);
    if (videos && videos.length > 0) {
      setAvailableVideos(Array.from(new Set([...DEFAULT_VIDEOS, ...videos])));
    }
    if (outputs && outputs.length > 0) {
      setOutputVideos(outputs);
    }
    setIsCheckingBackend(false);
  };

  useEffect(() => {
    checkBackendStatus();
  }, []);

  const getStem = (name: string) => name.replace(/\.[^/.]+$/, '');
  const getDetectedFilename = (videoName: string) => `${getStem(videoName)}_detected.mp4`;
  const isDetectedAvailable = (videoName: string) => outputVideos.includes(getDetectedFilename(videoName));

  const handlePlayAnnotatedOnMainScreen = (videoName: string) => {
    const filename = getDetectedFilename(videoName);
    const outputUrl = wildlifeDetectionService.getOutputVideoUrl(filename);
    if (onPlayVideoOnMainScreen) {
      onPlayVideoOnMainScreen(outputUrl, `${videoName} (YOLO Detected Stream)`);
    }
  };

  const handlePlayRawOnMainScreen = (videoName: string) => {
    if (onPlayVideoOnMainScreen) {
      onPlayVideoOnMainScreen(`/videos/${videoName}`, `${videoName} (Raw Drone Feed)`);
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
        ...(scanMode === 'preview' ? { maxFrames: 100 } : {}),
        frameStride: 1, // Full native framerate
      });
      setInferenceResult(result);
      setActiveTab('model');

      // Build the output video URL and immediately play the clean detected video
      if (result.output_url) {
        const outputFilename = result.output_url.split('/').pop() || '';
        const outputUrl = wildlifeDetectionService.getOutputVideoUrl(outputFilename);
        setLastOutputVideoUrl(outputUrl);

        // Refresh output videos list
        const updatedOutputs = await wildlifeDetectionService.listOutputVideos();
        setOutputVideos(updatedOutputs);

        // Play the clean, high-framerate YOLO detected video directly on the main screen
        if (onPlayVideoOnMainScreen) {
          onPlayVideoOnMainScreen(outputUrl, `${targetVideo} (YOLO Detected Stream)`);
        }
      }

      // Convert sample detections to WildlifeDetection objects for the HUD & catalog
      if (result.sample_detections && result.sample_detections.length > 0) {
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
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faPaw} className="w-4 h-4 text-emerald-600" />
          <span className="font-bold text-sm tracking-wide text-slate-900">
            WILDLIFE SIGHTINGS CATALOG
          </span>
        </div>

        {/* Backend Status Badge */}
        {backendHealth && backendHealth.model_loaded ? (
          <span className="flex items-center gap-1.5 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            YOLO ONLINE ({backendHealth.model} • {backendHealth.device ? backendHealth.device.toUpperCase() : 'CPU'})
          </span>
        ) : (
          <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-semibold">
            SIMULATED CATALOG
          </span>
        )}
      </div>

      {/* Backend Action Control Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-2 shadow-2xs">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <FontAwesomeIcon icon={faMicrochip} className="w-3.5 h-3.5 text-blue-600" />
            <span>YOLO DETECTION ENGINE</span>
          </div>
          {isCheckingBackend && (
            <FontAwesomeIcon icon={faCircleNotch} className="w-3.5 h-3.5 animate-spin text-slate-400" />
          )}
        </div>

        <p className="text-[11px] text-slate-600 leading-snug font-sans">
          Run the Ultralytics YOLOv8 neural network against aerial video footage to detect wildlife and track individuals.
        </p>

        <div className="flex flex-col gap-2.5 pt-1">
          {/* Video Selection Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-600 font-bold uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-700">
                <FontAwesomeIcon icon={faVideo} className="w-3 h-3 text-slate-500" /> SELECT VIDEO FOOTAGE:
              </span>
              <span className="text-[9px] text-slate-500 font-mono">
                {availableVideos.length} videos available
              </span>
            </label>
            <select
              value={selectedVideo}
              onChange={(e) => {
                const vid = e.target.value;
                setSelectedVideo(vid);
                if (isDetectedAvailable(vid)) {
                  handlePlayAnnotatedOnMainScreen(vid);
                } else {
                  handlePlayRawOnMainScreen(vid);
                }
              }}
              disabled={isInferring}
              className="w-full bg-white border border-slate-300 hover:border-slate-400 text-slate-800 px-2.5 py-1.5 rounded text-xs font-mono focus:outline-none focus:border-emerald-600 cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {availableVideos.map((v) => {
                const detected = isDetectedAvailable(v);
                return (
                  <option key={v} value={v}>
                    {detected ? `${v} (✓ Detected Video Available)` : v}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Action Buttons: Clean Backend Video Playback */}
          <div className="flex flex-col gap-2">
            {isDetectedAvailable(selectedVideo) ? (
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => handlePlayAnnotatedOnMainScreen(selectedVideo)}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-lg text-xs transition-all shadow-xs cursor-pointer"
                >
                  <FontAwesomeIcon icon={faPlay} className="w-3.5 h-3.5" />
                  <span>PLAY DETECTED VIDEO ON MAIN SCREEN</span>
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handlePlayRawOnMainScreen(selectedVideo)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold py-1.5 px-2 rounded text-[11px] transition-all cursor-pointer shadow-2xs"
                  >
                    <FontAwesomeIcon icon={faVideo} className="w-3 h-3 text-slate-500" />
                    <span>Play Raw Video</span>
                  </button>
                  <button
                    onClick={() => handleRunInference()}
                    disabled={isInferring || !backendHealth}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold py-1.5 px-2 rounded text-[11px] transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
                  >
                    {isInferring ? (
                      <>
                        <FontAwesomeIcon icon={faCircleNotch} className="w-3 h-3 animate-spin text-slate-500" />
                        <span>Re-Scanning...</span>
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faMicrochip} className="w-3 h-3 text-slate-500" />
                        <span>Re-Scan Full Video</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => handleRunInference()}
                  disabled={isInferring || !backendHealth}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-lg text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isInferring ? (
                    <>
                      <FontAwesomeIcon icon={faCircleNotch} className="w-3.5 h-3.5 animate-spin" />
                      <span>PROCESSING VIDEO INFERENCE...</span>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faMicrochip} className="w-3.5 h-3.5" />
                      <span>SCAN & DETECT WILDLIFE IN VIDEO</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handlePlayRawOnMainScreen(selectedVideo)}
                  className="w-full flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold py-1.5 px-3 rounded text-[11px] transition-all cursor-pointer shadow-2xs"
                >
                  <FontAwesomeIcon icon={faVideo} className="w-3 h-3 text-slate-500" />
                  <span>Play Raw Video</span>
                </button>
              </div>
            )}
          </div>

          {/* Inference Result Summary Banner */}
          {inferenceResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded p-2.5 text-[10px] text-slate-700 flex flex-col gap-1.5 shadow-2xs">
              <div className="flex items-center justify-between text-emerald-800 font-bold">
                <span className="flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faCircleCheck} className="w-3 h-3 text-emerald-600" /> YOLO INFERENCE COMPLETE
                </span>
                <span>{inferenceResult.frames_processed} frames ({inferenceResult.duration_seconds}s)</span>
              </div>

              {inferenceResult.inference_speed_ms !== undefined && (
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-600">Inference Speed:</span>
                  <span className="text-slate-900 font-bold">
                    {inferenceResult.inference_speed_ms} ms/frame ({Math.round(1000 / (inferenceResult.inference_speed_ms || 1))} FPS)
                  </span>
                </div>
              )}

              {inferenceResult.unique_individuals !== undefined && (
                <div className="flex items-center justify-between text-[10px] bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-300">
                  <span className="text-emerald-900 font-bold">Unique Individuals (ByteTrack):</span>
                  <span className="text-emerald-900 font-black text-xs">
                    {inferenceResult.unique_individuals} animals
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span>Total Frame Detections:</span>
                <span className="text-slate-900 font-semibold">
                  {inferenceResult.total_frame_detections ?? inferenceResult.detections}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Unique by Species:</span>
                <span className="text-slate-900 font-semibold">
                  {Object.entries(inferenceResult.species_unique_counts || inferenceResult.species_frame_counts || inferenceResult.species_counts || {})
                    .map(([k, v]) => `${k} (${v})`)
                    .join(', ') || 'None'}
                </span>
              </div>

              <div className="text-[9px] text-slate-500 italic pt-0.5 border-t border-emerald-200">
                * Deduplicated using ByteTrack persistent object ID tracking.
              </div>
            </div>
          )}

          {inferenceError && (
            <div className="bg-red-50 border border-red-200 rounded p-2 text-[10px] text-red-700 flex items-center gap-1.5 shadow-2xs">
              <FontAwesomeIcon icon={faTriangleExclamation} className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
              <span>{inferenceError}</span>
            </div>
          )}

          {/* Backend Offline Guidance Card */}
          {!backendHealth && (
            <div className="bg-amber-50 border border-amber-200 rounded p-2 text-[10px] text-amber-900 flex flex-col gap-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-amber-800 font-bold flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faTriangleExclamation} className="w-3.5 h-3.5 text-amber-600" />
                  FastAPI Backend Offline
                </span>
                <button
                  onClick={checkBackendStatus}
                  className="text-[9px] bg-white hover:bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-300 font-bold cursor-pointer"
                >
                  Retry Connect
                </button>
              </div>
              <p className="text-[10px] text-amber-800/80 font-sans">
                Real-time video plays in the main display. To enable custom YOLO batch export, start your backend:
              </p>
              <code className="text-slate-800 bg-white/90 border border-amber-200 px-1.5 py-0.5 rounded font-mono text-[9px] select-all">
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
            className="group bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 group-hover:border-slate-300 flex-shrink-0">
                <img
                  src={animal.imageUrl}
                  alt={animal.commonName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute bottom-0 right-0 bg-slate-900/80 text-[8px] text-white px-1 font-bold">
                  x{animal.count}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 text-xs group-hover:text-emerald-700 transition-colors">
                    {animal.commonName}
                  </span>
                  <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 rounded font-semibold">
                    {(animal.confidence * 100).toFixed(0)}%
                  </span>
                  {animal.source === 'model' && (
                    <span className="text-[8px] bg-blue-50 text-blue-700 border border-blue-200 px-1 rounded font-bold">
                      YOLO
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 italic">
                  {animal.scientificName}
                </div>
                <div className="flex items-center gap-2 text-[9px] text-slate-500 mt-1">
                  <span className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faClock} className="w-2.5 h-2.5 text-slate-400" /> {animal.timestamp}
                  </span>
                  <span>•</span>
                  <span>Dist: {animal.distanceFromDroneM}m</span>
                  <span>•</span>
                  <span className="text-amber-700 font-medium">{animal.conservationStatus}</span>
                </div>
              </div>
            </div>

            <FontAwesomeIcon icon={faChevronRight} className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
          </div>
        ))}
      </div>

      {/* Selected Wildlife Encyclopedia Modal */}
      {selectedAnimal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative font-sans text-slate-800">
            {/* Modal Image Header */}
            <div className="relative h-48 w-full bg-slate-950">
              <img
                src={selectedAnimal.imageUrl}
                alt={selectedAnimal.commonName}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <button
                onClick={() => onSelectAnimal(null)}
                className="absolute top-3 right-3 bg-black/60 hover:bg-black/90 text-white w-7 h-7 rounded-full flex items-center justify-center border border-white/20 transition-colors cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
              </button>

              <div className="absolute bottom-3 left-4 right-4 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-emerald-600 text-white font-bold text-xs px-2 py-0.5 rounded font-mono flex items-center gap-1.5 shadow-xs">
                    <FontAwesomeIcon icon={faMicrochip} className="w-3 h-3" />
                    {selectedAnimal.source === 'model' ? 'YOLOv8 MODEL' : 'SIMULATED'} • {(selectedAnimal.confidence * 100).toFixed(0)}%
                  </span>
                  <span className="bg-red-500/80 text-white text-[10px] px-2 py-0.5 rounded font-mono font-semibold">
                    {selectedAnimal.conservationStatus}
                  </span>
                </div>
                <h3 className="text-xl font-bold tracking-tight">
                  {selectedAnimal.commonName}
                </h3>
                <p className="text-xs text-slate-300 italic font-mono">
                  {selectedAnimal.scientificName} • Source: {selectedAnimal.source.toUpperCase()} ({selectedAnimal.modelVersion || 'YOLOv8n'})
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex flex-col gap-3.5 max-h-[60vh] overflow-y-auto">
              <div>
                <h4 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Observed Behavior & Real-time Context
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {selectedAnimal.behavior}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Ecosystem Role in Hwange
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {selectedAnimal.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px] font-semibold">DIET</span>
                  <span className="text-slate-800 font-semibold">{selectedAnimal.diet}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px] font-semibold">HABITAT</span>
                  <span className="text-slate-800 font-semibold">{selectedAnimal.habitat}</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-800 mb-1">
                  <FontAwesomeIcon icon={faCircleInfo} className="w-3.5 h-3.5" />
                  <span>DID YOU KNOW?</span>
                </div>
                <p className="text-amber-900 leading-relaxed font-sans">
                  {selectedAnimal.funFact}
                </p>
              </div>

              <div className="text-[10px] text-slate-500 font-mono italic">
                {selectedAnimal.source === 'model'
                  ? '* Detections generated by Ultralytics YOLOv8 object recognition model directly from video frames.'
                  : '* Note: Wildlife metadata and detections are currently simulated demonstration values to showcase computer vision cataloging.'}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => onSelectAnimal(null)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer"
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
