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
    species: Optional[str] = Field(None, description="Scientific or model species name if known")
    common_name: str
    confidence: float
    box: BoundingBox
    source: str = "model"

class DetectionResponse(BaseModel):
    video: str
    frames_processed: int
    fps: float
    duration_seconds: float
    total_frame_detections: Optional[int] = Field(None, description="Total animal bounding box detections across evaluated frames")
    detections: int = Field(..., description="Total detections count")
    species_frame_counts: Dict[str, int] = Field(default_factory=dict, description="Detections per species across frames")
    species_counts: Dict[str, int] = Field(default_factory=dict, description="Detections per species dictionary")
    output_video: str
    output_url: str
    sample_detections: List[DetectionItem] = Field(default_factory=list)

class HealthResponse(BaseModel):
    status: str
    service: str
    model: str
    device: Optional[str] = None
    model_loaded: Optional[bool] = Field(True, description="Whether the model is loaded")
    supported_classes: List[str] = Field(default_factory=list)
    error: Optional[str] = None
