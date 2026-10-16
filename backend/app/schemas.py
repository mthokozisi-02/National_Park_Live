from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class BoundingBox(BaseModel):
    x: float = Field(..., description="Normalized X coordinate (0.0 to 1.0, relative to frame width)")
    y: float = Field(..., description="Normalized Y coordinate (0.0 to 1.0, relative to frame height)")
    width: float = Field(..., description="Normalized width (0.0 to 1.0, relative to frame width)")
    height: float = Field(..., description="Normalized height (0.0 to 1.0, relative to frame height)")

class DetectionItem(BaseModel):
    id: str
    track_id: Optional[int] = Field(None, description="Persistent ByteTrack ID across video frames")
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
    total_frame_detections: Optional[int] = Field(None, description="Total animal bounding box detections across evaluated frames (Detection Events)")
    detections: int = Field(..., description="Total detection events count across frames")
    tracked_individuals: Optional[int] = Field(None, description="Total unique animal tracks observed via ByteTrack persistent IDs within this video feed")
    unique_individuals: Optional[int] = Field(None, description="Backward-compatibility alias for tracked_individuals")
    tracking_active: Optional[bool] = Field(False, description="Whether ByteTrack tracking IDs were detected")
    species_tracked_counts: Dict[str, int] = Field(default_factory=dict, description="Unique tracked individuals count per species within this video feed")
    species_unique_counts: Dict[str, int] = Field(default_factory=dict, description="Backward-compatibility alias for species_tracked_counts")
    species_frame_counts: Dict[str, int] = Field(default_factory=dict, description="Detection events per species across frames")
    species_counts: Dict[str, int] = Field(default_factory=dict, description="Detections per species dictionary")
    inference_speed_ms: Optional[float] = Field(None, description="Average YOLO inference latency per frame in milliseconds")
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

class SightingItem(BaseModel):
    id: str
    species: str
    common_name: str
    confidence: float
    count: int = 1
    latitude: float
    longitude: float
    altitude_m: Optional[float] = None
    timestamp: str
    source_video: Optional[str] = None
    source_frame: Optional[int] = None
    track_id: Optional[int] = None
    notes: Optional[str] = None

class SightingCreate(BaseModel):
    species: str
    common_name: str
    confidence: float = 0.9
    count: int = 1
    latitude: float
    longitude: float
    altitude_m: Optional[float] = 1000.0
    source_video: Optional[str] = None
    source_frame: Optional[int] = None
    track_id: Optional[int] = None
    notes: Optional[str] = None

class SpeciesBreakdownItem(BaseModel):
    common_name: str
    sighting_count: int
    animal_count: int

class SightingStatsResponse(BaseModel):
    total_sightings: int
    total_animals: int
    species_breakdown: List[SpeciesBreakdownItem]
    latest_sighting: Optional[str] = None
