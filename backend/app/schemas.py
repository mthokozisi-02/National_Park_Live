from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class BoundingBox(BaseModel):
    x: float = Field(..., description="Normalized X coordinate (0.0 to 1.0, relative to frame width)")
    y: float = Field(..., description="Normalized Y coordinate (0.0 to 1.0, relative to frame height)")
    width: float = Field(..., description="Normalized width (0.0 to 1.0, relative to frame width)")
    height: float = Field(..., description="Normalized height (0.0 to 1.0, relative to frame height)")

class DetectionItem(BaseModel):
    id: str
    frame: int
    timestamp_sec: float
    species: str
    common_name: str
    confidence: float
    box: BoundingBox
    source: str = "model"

class DetectionResponse(BaseModel):
    video: str
    frames_processed: int
    fps: float
    duration_seconds: float
    detections: int
    species_counts: Dict[str, int]
    output_video: str
    output_url: str
    sample_detections: List[DetectionItem] = []

class HealthResponse(BaseModel):
    status: str
    service: str
    model: str
    device: str
