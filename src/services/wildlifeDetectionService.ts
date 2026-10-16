import type { BackendHealth, ModelDetectionResponse, ModelDetectionItem } from '../types/wildlifeDetection';
import type { WildlifeDetection } from '../types/safari';

import { API_BASE_URL } from '../config/api.ts';

/**
 * Service to communicate with the FastAPI YOLO Wildlife Detection Backend.
 */
export const wildlifeDetectionService = {
  /**
   * Check backend health and model status
   */
  async checkHealth(): Promise<BackendHealth | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  /**
   * Fetch list of available videos in backend/videos
   */
  async listVideos(): Promise<string[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/videos`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  /**
   * Fetch list of processed detected videos in backend/output
   */
  async listOutputVideos(): Promise<string[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/outputs`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  /**
   * Upload video to backend
   */
  async uploadVideo(file: File): Promise<{ message: string; filename: string; size_bytes: number }> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || `Upload failed with status ${res.status}`);
    }

    return await res.json();
  },

  /**
   * Trigger YOLO detection on a video
   */
  async runDetection(
    videoName: string,
    options?: { conf?: number; maxFrames?: number; frameStride?: number }
  ): Promise<ModelDetectionResponse> {
    const params = new URLSearchParams();
    if (options?.conf !== undefined) params.append('conf', options.conf.toString());
    if (options?.maxFrames !== undefined) params.append('max_frames', options.maxFrames.toString());
    if (options?.frameStride !== undefined) params.append('frame_stride', options.frameStride.toString());

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/api/detect/${encodeURIComponent(videoName)}${queryString}`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Unknown detection error' }));
      throw new Error(err.detail || `Detection failed with HTTP ${res.status}`);
    }

    return await res.json();
  },

  /**
   * Run real-time detection on a single video frame blob
   */
  async detectFrame(
    imageBlob: Blob,
    conf: number = 0.25
  ): Promise<WildlifeDetection[]> {
    try {
      const formData = new FormData();
      formData.append('file', imageBlob, 'frame.jpg');

      const res = await fetch(`${API_BASE_URL}/api/detect/frame?conf=${conf}`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData,
      });

      if (!res.ok) return [];
      const data = await res.json();
      return (data.detections || []).map((det: any, idx: number) =>
        wildlifeDetectionService.convertToWildlifeDetection(det, 1, 'Live Stream', idx)
      );
    } catch {
      return [];
    }
  },

  /**
   * Get direct URL to processed annotated video
   */
  getOutputVideoUrl(filename: string): string {
    return `${API_BASE_URL}/api/output/${filename}`;
  },

  /**
   * Get direct URL to raw safari video in backend/videos
   */
  getRawVideoUrl(filename: string): string {
    return `${API_BASE_URL}/api/videos/${filename}`;
  },

  /**
   * Converts a model detection item (with normalized 0.0 - 1.0 coordinates)
   * into a frontend WildlifeDetection object with percentage-based coordinates (0.0 - 100.0).
   */
  convertToWildlifeDetection(
    item: ModelDetectionItem,
    totalCount: number,
    videoName: string,
    index: number = 0
  ): WildlifeDetection {
    // Normalise to percentages 0-100%
    const xPct = item.box.x <= 1 ? item.box.x * 100 : item.box.x;
    const yPct = item.box.y <= 1 ? item.box.y * 100 : item.box.y;
    const widthPct = item.box.width <= 1 ? item.box.width * 100 : item.box.width;
    const heightPct = item.box.height <= 1 ? item.box.height * 100 : item.box.height;

    const nameLower = item.common_name.toLowerCase();
    const isElephant = nameLower.includes('elephant');
    const isGiraffe = nameLower.includes('giraffe');
    const isZebra = nameLower.includes('zebra');
    const isLion = nameLower.includes('lion');
    const isBuffalo = nameLower.includes('buffalo');
    const isWildebeest = nameLower.includes('wildebeest');
    const isImpala = nameLower.includes('impala') || nameLower.includes('deer') || nameLower.includes('oryx');

    let imageUrl = 'https://images.unsplash.com/photo-1444464666168-49d633b86797?auto=format&fit=crop&w=800&q=80';
    let diet = 'Herbivore';
    let status: 'Endangered' | 'Critically Endangered' | 'Vulnerable' | 'Near Threatened' | 'Least Concern' = 'Least Concern';

    if (isElephant) {
      imageUrl = 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=800&q=80';
      status = 'Endangered';
    } else if (isGiraffe) {
      imageUrl = 'https://images.unsplash.com/photo-1547721064-da6cfb341d50?auto=format&fit=crop&w=800&q=80';
      status = 'Vulnerable';
    } else if (isZebra) {
      imageUrl = 'https://images.unsplash.com/photo-1509728143841-416756a3eed8?auto=format&fit=crop&w=800&q=80';
      status = 'Near Threatened';
    } else if (isLion) {
      imageUrl = 'https://images.unsplash.com/photo-1614027164847-1b28cfe1df60?auto=format&fit=crop&w=800&q=80';
      diet = 'Carnivore (Apex)';
      status = 'Vulnerable';
    } else if (isBuffalo) {
      imageUrl = 'https://images.unsplash.com/photo-1551972251-12070d63502a?auto=format&fit=crop&w=800&q=80';
      status = 'Near Threatened';
    } else if (isWildebeest) {
      imageUrl = 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=800&q=80';
      status = 'Least Concern';
    } else if (isImpala) {
      imageUrl = 'https://images.unsplash.com/photo-1484406566174-9da000fda645?auto=format&fit=crop&w=800&q=80';
      status = 'Least Concern';
    }

    return {
      id: `yolo-${item.id}-${index}`,
      species: item.species || `${item.common_name} (Class)`,
      commonName: item.common_name,
      scientificName: item.species || 'Taxonomy pending species model',
      confidence: item.confidence,
      count: totalCount,
      box: {
        x: Math.min(100, Math.max(0, xPct)),
        y: Math.min(100, Math.max(0, yPct)),
        width: Math.min(100, Math.max(0, widthPct)),
        height: Math.min(100, Math.max(0, heightPct)),
      },
      distanceFromDroneM: 90 + index * 18,
      behavior: 'Identified via YOLOv8 object detection model',
      conservationStatus: status,
      habitat: 'Hwange National Park Savanna Corridor',
      diet,
      description: `Target ${item.common_name} detected with ${(item.confidence * 100).toFixed(1)}% confidence in ${videoName}.`,
      funFact: `Recorded in ${totalCount} frame detection(s) during video analysis.`,
      imageUrl,
      timestamp: new Date().toLocaleTimeString(),
      source: 'model',
      modelVersion: 'best_finetuned.pt'
    };
  }
};
