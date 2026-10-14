/**
 * Types representing AI Model detection contracts returned by the FastAPI backend
 */

export interface ModelBoundingBox {
  x: number;      // Normalized 0.0 - 1.0 (top-left X)
  y: number;      // Normalized 0.0 - 1.0 (top-left Y)
  width: number;  // Normalized 0.0 - 1.0
  height: number; // Normalized 0.0 - 1.0
}

export interface ModelDetectionItem {
  id: string;
  frame: number;
  timestamp_sec: number;
  species?: string | null;
  common_name: string;
  confidence: number;
  box: ModelBoundingBox;
  source: 'model';
}

export interface ModelDetectionResponse {
  video: string;
  frames_processed: number;
  fps: number;
  duration_seconds: number;
  total_frame_detections: number;
  detections: number; // backward compatibility alias
  species_frame_counts: Record<string, number>;
  species_counts: Record<string, number>; // backward compatibility alias
  output_video: string;
  output_url: string;
  sample_detections: ModelDetectionItem[];
}

export interface BackendHealth {
  status: 'ok' | 'degraded';
  service: string;
  model_loaded: boolean;
  model: string;
  device?: string | null;
  supported_classes: string[];
  error?: string | null;
}
