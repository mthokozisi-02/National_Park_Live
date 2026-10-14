import { BackendHealth, ModelDetectionResponse, ModelDetectionItem } from '@/types/wildlifeDetection';
import { WildlifeDetection } from '@/types/safari';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_WILDLIFE_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://127.0.0.1:8000';

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
   * Get direct URL to processed annotated video
   */
  getOutputVideoUrl(filename: string): string {
    return `${API_BASE_URL}/api/output/${filename}`;
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

    const isElephant = item.common_name.toLowerCase().includes('elephant');
    const isGiraffe = item.common_name.toLowerCase().includes('giraffe');
    const isZebra = item.common_name.toLowerCase().includes('zebra');

    const imageUrl = isElephant
      ? 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=800&q=80'
      : isGiraffe
      ? 'https://images.unsplash.com/photo-1547721064-da6cfb341d50?auto=format&fit=crop&w=800&q=80'
      : isZebra
      ? 'https://images.unsplash.com/photo-1501706362039-c06b2d715385?auto=format&fit=crop&w=800&q=80'
      : 'https://images.unsplash.com/photo-1444464666168-49d633b86797?auto=format&fit=crop&w=800&q=80';

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
      conservationStatus: isElephant ? 'Endangered' : isGiraffe ? 'Vulnerable' : 'Least Concern',
      habitat: 'Hwange National Park Savanna Corridor',
      diet: 'Herbivore',
      description: `Target ${item.common_name} detected with ${(item.confidence * 100).toFixed(1)}% confidence in ${videoName}.`,
      funFact: `Recorded in ${totalCount} frame detection(s) during video analysis.`,
      imageUrl,
      timestamp: new Date().toLocaleTimeString(),
      source: 'model',
      modelVersion: 'Ultralytics-YOLOv8n'
    };
  }
};
