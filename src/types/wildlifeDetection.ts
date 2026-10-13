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
  species: string;
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
  detections: number;
  species_counts: Record<string, number>;
  output_video: string;
  output_url: string;
  sample_detections: ModelDetectionItem[];
}

export interface BackendHealth {
  status: string;
  service: string;
  model: string;
  device: string;
}
