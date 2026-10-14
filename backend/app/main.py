import os
import re
import uuid
import shutil
import logging
from pathlib import Path
from typing import Optional, List
import cv2
from fastapi import FastAPI, HTTPException, Query, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.detector import (
    detect_animals,
    model_container,
    VIDEO_DIR,
    OUTPUT_DIR,
    MODEL_NAME
)
from app.schemas import DetectionResponse, HealthResponse

logger = logging.getLogger("safari.api")

app = FastAPI(
    title="SafariVision Wildlife Detection API",
    description="Real-time and batch wildlife detection engine using Ultralytics YOLO & OpenCV for Hwange National Park drone feeds.",
    version="1.1.0",
)

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

# Serve output directory for direct static video playback if needed
app.mount("/output", StaticFiles(directory=str(OUTPUT_DIR)), name="output")

# Video upload limits & supported extensions
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", 100 * 1024 * 1024))  # 100 MB
ALLOWED_EXTENSIONS = {".mp4", ".webm", ".mov"}


@app.get("/api/health", response_model=HealthResponse)
def health():
    """System health check endpoint reporting model status and device."""
    status_info = model_container.get_status()
    is_healthy = status_info["model_loaded"]
    
    return {
        "status": "ok" if is_healthy else "degraded",
        "service": "wildlife-detection",
        "model_loaded": is_healthy,
        "model": status_info["model"],
        "device": status_info["device"],
        "supported_classes": status_info["supported_classes"],
        "error": status_info["error"],
    }


@app.get("/api/videos", response_model=List[str])
def list_videos():
    """List safari videos available for processing in the backend/videos directory."""
    videos = [
        f.name for f in VIDEO_DIR.iterdir()
        if f.is_file() and f.suffix.lower() in ALLOWED_EXTENSIONS
    ]
    return sorted(videos)


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


@app.post("/api/detect/{video_name}", response_model=DetectionResponse)
def detect_video(
    video_name: str,
    conf: float = Query(0.25, ge=0.05, le=0.95, description="Confidence threshold"),
    max_frames: Optional[int] = Query(100, ge=10, le=2000, description="Max frames to process for fast responsive preview"),
    frame_stride: int = Query(2, ge=1, le=30, description="Process every N-th frame for speed")
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

    if not model_container.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Wildlife detection model unavailable: {model_container.load_error or 'Not loaded'}",
        )

    try:
        results = detect_animals(
            video_name=video_name,
            conf_threshold=conf,
            max_frames=max_frames,
            frame_stride=frame_stride
        )
        return results
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(fnf))
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@app.get("/api/output/{filename}")
def get_output_video(filename: str):
    """Retrieve processed annotated video file."""
    if Path(filename).name != filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename.")
    file_path = OUTPUT_DIR / filename
    if not file_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Processed video not found.")
    return FileResponse(path=str(file_path), media_type="video/mp4")
