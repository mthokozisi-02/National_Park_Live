import os
import uuid
from pathlib import Path
from typing import Dict, Any, List, Optional
import cv2
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent.parent
VIDEO_DIR = BASE_DIR / "videos"
OUTPUT_DIR = BASE_DIR / "output"

VIDEO_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Default to YOLOv8n (nano), fast and reliable pretrained model
MODEL_NAME = os.getenv("YOLO_MODEL_NAME", "yolov8n.pt")
model = YOLO(MODEL_NAME)

# Mapping standard COCO animal classes to Savanna Wildlife taxonomy
WILDLIFE_MAPPINGS: Dict[str, Dict[str, str]] = {
    "elephant": {
        "common_name": "African Bush Elephant",
        "scientific_name": "Loxodonta africana"
    },
    "zebra": {
        "common_name": "Plains Zebra",
        "scientific_name": "Equus quagga"
    },
    "giraffe": {
        "common_name": "Southern Giraffe",
        "scientific_name": "Giraffa camelopardalis"
    },
    "bird": {
        "common_name": "Savanna Raptor / Hornbill",
        "scientific_name": "Aves"
    },
    "cat": {
        "common_name": "African Lion / Leopard",
        "scientific_name": "Panthera leo"
    },
    "dog": {
        "common_name": "African Wild Dog",
        "scientific_name": "Lycaon pictus"
    },
    "cow": {
        "common_name": "African Buffalo / Wildebeest",
        "scientific_name": "Syncerus caffer"
    },
    "sheep": {
        "common_name": "Savanna Antelope / Impala",
        "scientific_name": "Aepyceros melampus"
    },
    "horse": {
        "common_name": "Plains Equid",
        "scientific_name": "Equus"
    },
    "bear": {
        "common_name": "Large Savanna Mammal",
        "scientific_name": "Mammalia"
    }
}

TARGET_CLASSES = set(WILDLIFE_MAPPINGS.keys())

def detect_animals(
    video_name: str,
    conf_threshold: float = 0.25,
    max_frames: Optional[int] = None,
    frame_stride: int = 1
) -> Dict[str, Any]:
    """
    Process a safari video file, detect wildlife using YOLO,
    annotate the frames with bounding boxes, and save an annotated video.
    """
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
    total_detections = 0
    species_counts: Dict[str, int] = {}
    sample_detections: List[Dict[str, Any]] = []

    try:
        while True:
            success, frame = capture.read()
            if not success:
                break

            # Honor frame stride for faster inference
            if frame_index % frame_stride != 0:
                frame_index += 1
                continue

            # Run YOLO prediction
            results = model.predict(source=frame, conf=conf_threshold, verbose=False)[0]

            # Annotate frame
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
                        total_detections += 1
                        mapping = WILDLIFE_MAPPINGS[class_name]
                        species_name = mapping["common_name"]
                        species_counts[species_name] = species_counts.get(species_name, 0) + 1

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
        "detections": total_detections,
        "species_counts": species_counts,
        "output_video": str(output_path),
        "output_url": f"/api/output/{output_filename}",
        "sample_detections": sample_detections
    }
