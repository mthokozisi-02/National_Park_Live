import os
import uuid
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import cv2
from ultralytics import YOLO

logger = logging.getLogger("safari.detector")

BASE_DIR = Path(__file__).resolve().parent.parent
VIDEO_DIR = BASE_DIR / "videos"
OUTPUT_DIR = BASE_DIR / "output"

VIDEO_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MODEL_NAME = os.getenv("YOLO_MODEL_NAME", "yolov8n.pt")

# Stage A: General-purpose detector mapping.
# We map supported categories conservatively to avoid false scientific claims.
# Categories not explicitly trained (e.g. wild lion vs domestic cat) are excluded
# to prevent misidentifications in conservation applications.
WILDLIFE_MAPPINGS: Dict[str, Dict[str, Optional[str]]] = {
    "elephant": {
        "common_name": "Elephant",
        "scientific_name": None,
    },
    "zebra": {
        "common_name": "Zebra",
        "scientific_name": None,
    },
    "giraffe": {
        "common_name": "Giraffe",
        "scientific_name": None,
    },
    "bird": {
        "common_name": "Bird",
        "scientific_name": None,
    },
}

TARGET_CLASSES = set(WILDLIFE_MAPPINGS.keys())

class ModelContainer:
    def __init__(self, model_name: str):
        self.model_name = model_name
        self.model: Optional[YOLO] = None
        self.is_loaded = False
        self.device = "cpu"
        self.load_error: Optional[str] = None
        self.wildlife_class_ids: List[int] = []
        self._initialize()

    def _initialize(self):
        try:
            logger.info(f"Loading YOLO model: {self.model_name}")
            self.model = YOLO(self.model_name)
            self.device = str(getattr(self.model, "device", "cpu"))
            self.is_loaded = True
            self.load_error = None

            # Dynamically resolve target class indices from actual model names
            if hasattr(self.model, "names") and isinstance(self.model.names, dict):
                self.wildlife_class_ids = [
                    cls_id for cls_id, cls_name in self.model.names.items()
                    if str(cls_name).lower() in TARGET_CLASSES
                ]
            logger.info(f"Model loaded successfully. Wildlife class IDs: {self.wildlife_class_ids}")
        except Exception as e:
            logger.error(f"Failed to load YOLO model {self.model_name}: {e}")
            self.is_loaded = False
            self.load_error = str(e)
            self.model = None

    def get_status(self) -> Dict[str, Any]:
        return {
            "model_loaded": self.is_loaded,
            "model": self.model_name,
            "device": self.device if self.is_loaded else None,
            "supported_classes": list(TARGET_CLASSES),
            "error": self.load_error
        }

model_container = ModelContainer(MODEL_NAME)
# For backward compatibility if imported directly
model = model_container.model


def detect_animals(
    video_name: str,
    conf_threshold: float = 0.25,
    max_frames: Optional[int] = None,
    frame_stride: int = 1
) -> Dict[str, Any]:
    """
    Process a safari video file, detect wildlife using YOLO,
    annotate only genuine wildlife classes, and save an annotated video.
    """
    if not model_container.is_loaded or model_container.model is None:
        raise RuntimeError(f"YOLO model is not loaded: {model_container.load_error}")

    video_path = VIDEO_DIR / video_name
    if not video_path.is_file():
        raise FileNotFoundError(f"Video file not found at: {video_path}")

    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise RuntimeError(f"Unable to open video: {video_path}")

    fps = capture.get(cv2.CAP_PROP_FPS)
    if not fps or fps <= 0:
        fps = 25.0
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_video_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))

    output_filename = f"{video_path.stem}_detected.mp4"
    output_path = OUTPUT_DIR / output_filename
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(output_path), fourcc, fps / max(1, frame_stride), (width, height))

    if not writer.isOpened():
        capture.release()
        raise RuntimeError(f"Unable to initialize output video writer at: {output_path}")

    frame_index = 0
    frames_processed = 0
    total_frame_detections = 0
    species_frame_counts: Dict[str, int] = {}
    sample_detections: List[Dict[str, Any]] = []

    active_classes = model_container.wildlife_class_ids if model_container.wildlife_class_ids else None

    try:
        while True:
            success, frame = capture.read()
            if not success:
                break

            # Honor frame stride for faster inference
            if frame_index % frame_stride != 0:
                frame_index += 1
                continue

            # Run YOLO prediction strictly filtered to wildlife classes
            # This ensures results.plot() ONLY annotates genuine wildlife classes!
            results = model_container.model.predict(
                source=frame,
                conf=conf_threshold,
                classes=active_classes,
                verbose=False
            )[0]

            # Annotate frame - only target wildlife will be drawn
            annotated_frame = results.plot()
            writer.write(annotated_frame)
            frames_processed += 1

            timestamp_sec = frame_index / fps

            # Process detected bounding boxes
            if results.boxes is not None and len(results.boxes) > 0:
                for box in results.boxes:
                    class_id = int(box.cls[0].item())
                    confidence = float(box.conf[0].item())
                    class_name = results.names.get(class_id, "unknown").lower()

                    if class_name in TARGET_CLASSES:
                        total_frame_detections += 1
                        mapping = WILDLIFE_MAPPINGS[class_name]
                        species_name = mapping["common_name"] or class_name.capitalize()
                        species_frame_counts[species_name] = species_frame_counts.get(species_name, 0) + 1

                        # Extract normalized bounding box [x_center, y_center, w, h]
                        xywhn = box.xywhn[0].tolist()
                        x_tl = max(0.0, xywhn[0] - xywhn[2] / 2.0)
                        y_tl = max(0.0, xywhn[1] - xywhn[3] / 2.0)
                        w = min(1.0, xywhn[2])
                        h = min(1.0, xywhn[3])

                        # Keep sample detections for API response metadata
                        if len(sample_detections) < 50:
                            sample_detections.append({
                                "id": str(uuid.uuid4())[:8],
                                "frame": frame_index,
                                "timestamp_sec": round(timestamp_sec, 2),
                                "species": mapping["scientific_name"],
                                "common_name": species_name,
                                "confidence": round(confidence, 3),
                                "box": {
                                    "x": round(x_tl, 4),
                                    "y": round(y_tl, 4),
                                    "width": round(w, 4),
                                    "height": round(h, 4)
                                },
                                "source": "model"
                            })

            frame_index += 1
            if max_frames and frames_processed >= max_frames:
                break

    finally:
        capture.release()
        writer.release()

    duration_sec = frame_index / fps if fps > 0 else 0.0

    return {
        "video": video_name,
        "frames_processed": frames_processed,
        "fps": round(fps, 2),
        "duration_seconds": round(duration_sec, 2),
        "total_frame_detections": total_frame_detections,
        "detections": total_frame_detections,
        "species_frame_counts": species_frame_counts,
        "species_counts": species_frame_counts,
        "output_video": str(output_path),
        "output_url": f"/api/output/{output_filename}",
        "sample_detections": sample_detections
    }
