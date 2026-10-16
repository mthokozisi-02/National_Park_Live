import os
import re
import uuid
import shutil
import logging
from pathlib import Path
from typing import Optional, List
import cv2
import numpy as np
from fastapi import FastAPI, HTTPException, Query, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.detector import (
    detect_animals,
    VIDEO_DIR,
    OUTPUT_DIR,
    MODEL_NAME,
    model,
    WILDLIFE_MAPPINGS,
)
from app.sightings import (
    init_sightings_db,
    record_sighting,
    get_sightings,
    get_sighting_stats,
    estimate_animal_ground_location,
    HWANGE_ZONES,
)
from app.analytics import (
    get_analytics_summary,
    get_predictive_occurrence,
    generate_wildlife_report,
)
from app.schemas import (
    DetectionResponse,
    HealthResponse,
    SightingItem,
    SightingCreate,
    SightingStatsResponse,
)

logger = logging.getLogger("safari.api")

app = FastAPI(
    title="SafariVision Wildlife Detection API",
    description="Real-time and batch wildlife detection engine using Ultralytics YOLO & OpenCV for Hwange National Park drone feeds.",
    version="1.1.0",
)

@app.on_event("startup")
def on_startup():
    init_sightings_db()

# CORS configuration - tightened to specific origins and explicit methods
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"
).split(",")

allowed_origins = [orig.strip() for orig in CORS_ORIGINS if orig.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)

# Serve output directory and raw videos directory for direct video playback in frontend
app.mount("/output", StaticFiles(directory=str(OUTPUT_DIR)), name="output")
app.mount("/videos", StaticFiles(directory=str(VIDEO_DIR)), name="videos")

# Video upload limits & supported extensions
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", 100 * 1024 * 1024))  # 100 MB
ALLOWED_EXTENSIONS = {".mp4", ".webm", ".mov"}


@app.get("/api/health", response_model=HealthResponse)
def health():
    device = getattr(model, "device", "cpu")
    supported = []
    if model is not None and hasattr(model, "names") and model.names:
        supported = list(model.names.values())
    else:
        supported = list(WILDLIFE_MAPPINGS.values())

    return {
        "status": "ok",
        "service": "wildlife-detection",
        "model": MODEL_NAME,
        "device": str(device),
        "model_loaded": model is not None,
        "supported_classes": supported,
    }


@app.get("/api/videos", response_model=List[str])
def list_videos():
    """List safari videos available for processing in the backend/videos directory."""
    videos = [
        f.name for f in VIDEO_DIR.iterdir()
        if f.is_file() and f.suffix.lower() in ALLOWED_EXTENSIONS
    ]
    return sorted(videos)


@app.get("/api/outputs", response_model=List[str])
def list_output_videos():
    """List processed detected videos available in the backend/output directory."""
    videos = [
        f.name for f in OUTPUT_DIR.iterdir()
        if f.is_file() and f.suffix.lower() in ALLOWED_EXTENSIONS
    ]
    return sorted(videos)


@app.get("/api/videos/{filename}")
def get_raw_video(filename: str):
    """Retrieve raw safari video file from backend/videos for player streaming."""
    if Path(filename).name != filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename.")
    file_path = VIDEO_DIR / filename
    if not file_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video file not found.")
    ext = file_path.suffix.lower()
    media_type = "video/webm" if ext == ".webm" else "video/mp4"
    return FileResponse(path=str(file_path), media_type=media_type)


@app.post("/api/upload")
async def upload_video(file: UploadFile = File(...)):
    """
    Upload a new safari video file to the backend/videos directory with full safeguards:
    - Allowed extension verification (.mp4, .webm, .mov)
    - File size limit enforcement (streamed in chunks, max 100MB)
    - Filename sanitization and collision prevention
    - Video integrity verification with OpenCV
    - Incomplete upload cleanup on failure
    """
    raw_name = Path(file.filename or "uploaded_video.mp4").name
    extension = Path(raw_name).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{extension}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Sanitize base name to alphanumeric, underscores, hyphens
    sanitized_stem = re.sub(r"[^a-zA-Z0-9_\-]", "_", Path(raw_name).stem)[:50]
    safe_filename = f"{sanitized_stem}{extension}"
    target_path = VIDEO_DIR / safe_filename

    # Prevent accidental overwrites by appending a short unique token if file exists
    if target_path.exists():
        unique_token = uuid.uuid4().hex[:6]
        safe_filename = f"{sanitized_stem}_{unique_token}{extension}"
        target_path = VIDEO_DIR / safe_filename

    total_bytes = 0
    chunk_size = 1024 * 1024  # 1 MB chunks

    try:
        with open(target_path, "wb") as buffer:
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Video exceeds maximum allowed upload size of {MAX_UPLOAD_BYTES // (1024 * 1024)}MB",
                    )
                buffer.write(chunk)
    except Exception as exc:
        if target_path.exists():
            target_path.unlink()
        if isinstance(exc, HTTPException):
            raise exc
        logger.error(f"Error during video upload streaming: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to stream video upload to disk",
        )

    # Validate that OpenCV can actually open and read frames from this video
    test_cap = cv2.VideoCapture(str(target_path))
    is_valid = test_cap.isOpened()
    frame_count = int(test_cap.get(cv2.CAP_PROP_FRAME_COUNT)) if is_valid else 0
    test_cap.release()

    if not is_valid or frame_count <= 0:
        if target_path.exists():
            target_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is not a readable or valid video",
        )

    return {
        "message": "Video uploaded and verified successfully",
        "filename": safe_filename,
        "size_bytes": total_bytes,
        "total_frames": frame_count
    }


@app.post("/api/detect/frame")
async def detect_frame(
    file: UploadFile = File(...),
    conf: float = Query(0.25, ge=0.05, le=0.95, description="Confidence threshold"),
):
    """
    Real-time single frame wildlife detection.
    Receives an image frame from the video player and returns detected bounding boxes instantly.
    """
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Wildlife detection model unavailable",
        )

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if frame is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image frame data")

    results = model.predict(source=frame, conf=conf, imgsz=640, verbose=False)[0]
    detections = []
    names = getattr(model, "names", {})

    if results.boxes is not None and len(results.boxes) > 0:
        for box in results.boxes:
            class_id = int(box.cls[0].item())
            confidence = float(box.conf[0].item())
            class_name = names.get(class_id, "unknown")

            if class_name not in WILDLIFE_MAPPINGS:
                continue

            mapping = WILDLIFE_MAPPINGS[class_name]
            xywhn = box.xywhn[0].tolist()
            center_x, center_y, bw, bh = xywhn

            x = max(0.0, center_x - bw / 2.0)
            y = max(0.0, center_y - bh / 2.0)

            detections.append({
                "id": str(uuid.uuid4())[:8],
                "common_name": mapping["common_name"],
                "species": mapping["scientific_name"],
                "confidence": round(confidence, 3),
                "box": {
                    "x": round(min(1.0, max(0.0, x)), 4),
                    "y": round(min(1.0, max(0.0, y)), 4),
                    "width": round(min(1.0 - x, bw), 4),
                    "height": round(min(1.0 - y, bh), 4),
                },
                "source": "model",
            })

    return {"detections": detections, "count": len(detections)}


@app.post("/api/detect/{video_name}", response_model=DetectionResponse)
def detect_video(
    video_name: str,
    conf: float = Query(0.25, ge=0.05, le=0.95, description="Confidence threshold"),
    max_frames: Optional[int] = Query(None, description="Max frames to process, or None to scan the full video"),
    frame_stride: int = Query(1, ge=1, le=30, description="Process every N-th frame (1 = full framerate)")
):
    """
    Run YOLO wildlife detection on a safari video.
    Returns detected species counts, normalized bounding box samples, and annotated video path.
    """
    # Prevent directory traversal attacks
    if Path(video_name).name != video_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid video filename. Path traversal not permitted.",
        )

    if model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Wildlife detection model unavailable: Not loaded",
        )

    try:
        results = detect_animals(
            video_name=video_name,
            conf_threshold=conf,
            max_frames=max_frames,
            frame_stride=frame_stride
        )

        # Automatically persist unique animal sightings into the sightings DB
        try:
            base_zone = HWANGE_ZONES["Nyamandhlovu Pan"]
            v_lower = video_name.lower()
            if "main" in v_lower:
                base_zone = HWANGE_ZONES["Main Camp Waterhole"]
            elif "guvalala" in v_lower:
                base_zone = HWANGE_ZONES["Guvalala Platform"]
            elif "mandavu" in v_lower:
                base_zone = HWANGE_ZONES["Mandavu Dam"]

            recorded_tracks = set()
            for sample in results.get("sample_detections", []):
                track_id = sample.get("track_id")
                c_name = sample.get("common_name")
                key = f"{c_name}_{track_id}" if track_id else f"{c_name}_{sample.get('id')}"
                if key in recorded_tracks:
                    continue
                recorded_tracks.add(key)

                box = sample.get("box", {})
                cx = box.get("x", 0.5) + (box.get("width", 0.1) / 2.0)
                cy = box.get("y", 0.5) + (box.get("height", 0.1) / 2.0)

                ground_pos = estimate_animal_ground_location(
                    drone_lat=base_zone[0],
                    drone_lng=base_zone[1],
                    drone_alt_m=85.0,
                    heading_deg=35.0,
                    gimbal_pitch_deg=-45.0,
                    bbox_center_x=cx,
                    bbox_center_y=cy,
                )

                record_sighting({
                    "species": sample.get("species") or c_name,
                    "common_name": c_name,
                    "confidence": sample.get("confidence", 0.9),
                    "count": 1,
                    "latitude": ground_pos["latitude"],
                    "longitude": ground_pos["longitude"],
                    "altitude_m": 1045.0,
                    "source_video": video_name,
                    "source_frame": sample.get("frame", 0),
                    "track_id": track_id,
                    "notes": f"Field observation from {video_name} (Track #{track_id or 'N/A'})",
                })
        except Exception as log_err:
            logger.warning(f"Failed to record sightings automatically: {log_err}")

        return results
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(fnf))
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


# ============================================================
# WILDLIFE SIGHTINGS INTELLIGENCE ENDPOINTS (PHASE 2)
# ============================================================

@app.get("/api/sightings", response_model=List[SightingItem])
def list_sightings(
    species: Optional[str] = Query(None, description="Filter by species or common name (e.g. 'African Elephant', 'Lion', or 'all')"),
    max_age_hours: Optional[float] = Query(None, ge=0.1, le=720.0, description="Max age in hours (e.g. 1.0 for last hour, 24.0 for last day)"),
    limit: int = Query(100, ge=1, le=500, description="Max sightings to return"),
):
    """Retrieve geo-located wildlife sightings from SQLite database with species & age filtering."""
    return get_sightings(species=species, max_age_hours=max_age_hours, limit=limit)


@app.post("/api/sightings", response_model=SightingItem)
def create_sighting(payload: SightingCreate):
    """Record a verified wildlife sighting with GPS coordinates and observation metadata."""
    record = record_sighting(payload.model_dump())
    return record


@app.get("/api/sightings/stats", response_model=SightingStatsResponse)
def sightings_stats():
    """Retrieve statistical summary of wildlife sightings across Hwange National Park."""
    return get_sighting_stats()


@app.post("/api/sightings/estimate-location")
def estimate_location(
    drone_lat: float = Query(..., description="Drone latitude"),
    drone_lng: float = Query(..., description="Drone longitude"),
    drone_alt_m: float = Query(80.0, description="Drone altitude above ground in meters"),
    heading_deg: float = Query(0.0, description="Drone / camera heading in degrees (0-360)"),
    gimbal_pitch_deg: float = Query(-45.0, description="Camera gimbal pitch (-90 straight down to -10)"),
    bbox_x: float = Query(0.5, description="Normalized bounding box center X (0.0 - 1.0)"),
    bbox_y: float = Query(0.5, description="Normalized bounding box center Y (0.0 - 1.0)"),
):
    """Calculate projected ground GPS coordinates for a detected animal bounding box."""
    return estimate_animal_ground_location(
        drone_lat=drone_lat,
        drone_lng=drone_lng,
        drone_alt_m=drone_alt_m,
        heading_deg=heading_deg,
        gimbal_pitch_deg=gimbal_pitch_deg,
        bbox_center_x=bbox_x,
        bbox_center_y=bbox_y,
    )


# ============================================================
# WILDLIFE INTELLIGENCE & ANALYTICS ENDPOINTS (PHASE 4)
# ============================================================

@app.get("/api/analytics/summary")
def analytics_summary():
    """Aggregate wildlife census, species breakdown, and sector spatial density accounting for survey effort."""
    return get_analytics_summary()


@app.get("/api/analytics/predictive-occurrence")
def predictive_occurrence(
    hour: Optional[int] = Query(None, ge=0, le=23, description="Hour of day (0-23) to evaluate occurrence probability")
):
    """Predictive species occurrence probabilities based on circadian biological cycles and water-dependency."""
    return get_predictive_occurrence(hour=hour)


@app.get("/api/analytics/report")
def wildlife_report(
    report_type: str = Query("daily", pattern="^(daily|weekly)$", description="Report interval ('daily' or 'weekly')")
):
    """Generate executive daily or weekly wildlife intelligence briefing report."""
    return generate_wildlife_report(report_type=report_type)


@app.get("/api/output/{filename}")
def get_output_video(filename: str):
    """Retrieve processed annotated video file."""
    if Path(filename).name != filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename.")
    file_path = OUTPUT_DIR / filename
    if not file_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Processed video not found.")
    return FileResponse(path=str(file_path), media_type="video/mp4")
