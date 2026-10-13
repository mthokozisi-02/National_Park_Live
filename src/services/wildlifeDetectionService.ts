import { BackendHealth, ModelDetectionResponse } from '@/types/wildlifeDetection';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

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
  }
};
