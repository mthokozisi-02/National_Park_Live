import os
from pathlib import Path
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.detector import detect_animals, VIDEO_DIR, OUTPUT_DIR, MODEL_NAME, model
from app.schemas import DetectionResponse, HealthResponse

app = FastAPI(
    title="SafariVision Wildlife Detection API",
    description="Real-time and batch wildlife detection engine using Ultralytics YOLO & OpenCV for Hwange National Park drone feeds.",
    version="1.0.0",
)

# CORS configuration allowing local Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve output directory for direct video playback in frontend
app.mount("/output", StaticFiles(directory=str(OUTPUT_DIR)), name="output")

@app.get("/api/health", response_model=HealthResponse)
def health():
    """System health check endpoint."""
    device = getattr(model, "device", "cpu")
    return {
        "status": "ok",
        "service": "wildlife-detection",
        "model": MODEL_NAME,
        "device": str(device),
    }

@app.get("/api/videos", response_model=List[str])
def list_videos():
    """List safari videos available for processing in the backend/videos directory."""
    supported_exts = {".mp4", ".webm", ".mov", ".mkv", ".avi"}
    videos = [
        f.name for f in VIDEO_DIR.iterdir()
        if f.is_file() and f.suffix.lower() in supported_exts
    ]
    return sorted(videos)

@app.post("/api/upload")
async def upload_video(file: UploadFile = File(...)):
    """Upload a new safari video file to the backend/videos directory."""
    filename = Path(file.filename).name
    target_path = VIDEO_DIR / filename
    with open(target_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    return {"message": "Video uploaded successfully", "filename": filename, "size_bytes": len(content)}

@app.post("/api/detect/{video_name}", response_model=DetectionResponse)
def detect_video(
    video_name: str,
    conf: float = Query(0.25, ge=0.05, le=0.95, description="Confidence threshold"),
    max_frames: Optional[int] = Query(None, ge=10, description="Max frames to process (useful for quick previews)"),
    frame_stride: int = Query(1, ge=1, le=10, description="Process every N-th frame for speed")
):
    """
    Run YOLO wildlife detection on a safari video.
    Returns detected species counts, normalized bounding box samples, and annotated video path.
    """
    # Prevent directory traversal attacks
    if Path(video_name).name != video_name:
        raise HTTPException(
            status_code=400,
            detail="Invalid video filename. Path traversal not permitted.",
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
        raise HTTPException(status_code=404, detail=str(fnf))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.get("/api/output/{filename}")
def get_output_video(filename: str):
    """Retrieve processed annotated video file."""
    if Path(filename).name != filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")
    file_path = OUTPUT_DIR / filename
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Processed video not found.")
    return FileResponse(path=str(file_path), media_type="video/mp4")
