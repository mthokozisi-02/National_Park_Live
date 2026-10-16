import os
import uuid
import time
import subprocess
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import cv2
from ultralytics import YOLO

logger = logging.getLogger("safari.detector")


# ============================================================
# PATHS & WEB H.264 CONVERTER
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

VIDEO_DIR = BASE_DIR / "videos"
OUTPUT_DIR = BASE_DIR / "output"
MODEL_DIR = BASE_DIR / "models"

VIDEO_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def convert_to_web_h264(video_path: Path) -> Path:
    """
    Ensure the detected video is encoded with H.264 (AVC) and yuv420p with faststart,
    which is universally supported across all modern web browsers (Chrome, Edge, Safari, Firefox).
    Uses imageio_ffmpeg bundled binary if available.
    """
    try:
        import imageio_ffmpeg
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        temp_h264 = video_path.with_name(f"{video_path.stem}_web.mp4")
        cmd = [
            ffmpeg_exe, "-y",
            "-i", str(video_path),
            "-c:v", "libx264",
            "-crf", "18",
            "-preset", "fast",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            str(temp_h264)
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=180)
        if res.returncode == 0 and temp_h264.is_file() and temp_h264.stat().st_size > 0:
            video_path.unlink()
            temp_h264.rename(video_path)
            logger.info(f"Successfully converted {video_path.name} to web-compatible H.264")
        else:
            if temp_h264.is_file():
                temp_h264.unlink()
            logger.warning(f"FFmpeg conversion warning: {res.stderr[:200]}")
    except Exception as exc:
        logger.warning(f"Could not convert video to H.264: {exc}")
    return video_path

# Use the trained model by default.
# YOLO_MODEL_PATH can override this path when required.
MODEL_PATH = Path(
    os.getenv(
        "YOLO_MODEL_PATH",
        str(MODEL_DIR / "best_finetuned.pt")
    )
)

if not MODEL_PATH.is_absolute():
    MODEL_PATH = (Path.cwd() / MODEL_PATH).resolve()


# ============================================================
# MODEL LOADING
# ============================================================

if not MODEL_PATH.is_file():
    raise FileNotFoundError(
        f"Trained wildlife model not found: {MODEL_PATH}. "
        "Place best.pt inside backend/models/ or configure "
        "the YOLO_MODEL_PATH environment variable."
    )

model = YOLO(str(MODEL_PATH))

MODEL_NAME = MODEL_PATH.name


# ============================================================
# SAFARIVISION WILDLIFE TAXONOMY
# ============================================================

WILDLIFE_MAPPINGS: Dict[str, Dict[str, str]] = {
    "bird": {
        "common_name": "Savanna Bird",
        "scientific_name": "Aves",
    },
    "buffalo": {
        "common_name": "African Buffalo",
        "scientific_name": "Syncerus caffer",
    },
    "deer": {
        "common_name": "Deer",
        "scientific_name": "Cervidae",
    },
    "elephant": {
        "common_name": "African Bush Elephant",
        "scientific_name": "Loxodonta africana",
    },
    "giraffe": {
        "common_name": "Giraffe",
        "scientific_name": "Giraffa camelopardalis",
    },
    "impala": {
        "common_name": "Impala",
        "scientific_name": "Aepyceros melampus",
    },
    "lion": {
        "common_name": "African Lion",
        "scientific_name": "Panthera leo",
    },
    "oryx": {
        "common_name": "Oryx",
        "scientific_name": "Oryx",
    },
    "wildebeest": {
        "common_name": "Wildebeest",
        "scientific_name": "Connochaetes",
    },
    "zebra": {
        "common_name": "Plains Zebra",
        "scientific_name": "Equus quagga",
    },
}

# Read the actual names stored in the trained model.
# This prevents accidental assumptions about class IDs.
MODEL_CLASS_NAMES = {
    int(class_id): str(class_name).lower().strip()
    for class_id, class_name in model.names.items()
}

EXPECTED_CLASSES = set(WILDLIFE_MAPPINGS.keys())

missing_classes = EXPECTED_CLASSES - set(MODEL_CLASS_NAMES.values())

if missing_classes:
    raise ValueError(
        "The trained model is missing expected wildlife classes: "
        f"{sorted(missing_classes)}. "
        f"Model classes: {MODEL_CLASS_NAMES}"
    )


# ============================================================
# WILDLIFE VIDEO DETECTION
# ============================================================

def detect_animals(
    video_name: str,
    conf_threshold: float = 0.25,
    max_frames: Optional[int] = None,
    frame_stride: int = 1,
) -> Dict[str, Any]:
    """
    Detect wildlife in a video using the custom-trained YOLOv8s model.

    The function:
      1. Opens the source video.
      2. Runs wildlife detection on selected frames.
      3. Draws bounding boxes and class labels.
      4. Saves an annotated output video.
      5. Returns detection statistics and normalized bounding boxes.
    """

    # --------------------------------------------------------
    # Validate input
    # --------------------------------------------------------

    if Path(video_name).name != video_name:
        raise ValueError("Invalid video filename.")

    if frame_stride < 1:
        raise ValueError("frame_stride must be at least 1.")

    if not 0.0 < conf_threshold < 1.0:
        raise ValueError(
            "Confidence threshold must be between 0 and 1."
        )

    video_path = VIDEO_DIR / video_name

    if not video_path.is_file():
        raise FileNotFoundError(
            f"Video file not found: {video_path}"
        )

    capture = cv2.VideoCapture(str(video_path))

    if not capture.isOpened():
        raise RuntimeError(
            f"Unable to open video: {video_path}"
        )

    # --------------------------------------------------------
    # Video properties
    # --------------------------------------------------------

    fps = capture.get(cv2.CAP_PROP_FPS)

    if not fps or fps <= 0:
        fps = 25.0

    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))

    total_video_frames = int(
        capture.get(cv2.CAP_PROP_FRAME_COUNT)
    )

    output_filename = f"{video_path.stem}_detected.mp4"
    output_path = OUTPUT_DIR / output_filename

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")

    output_fps = fps / frame_stride

    writer = cv2.VideoWriter(
        str(output_path),
        fourcc,
        output_fps,
        (width, height),
    )

    if not writer.isOpened():
        capture.release()

        raise RuntimeError(
            f"Unable to initialize output video: {output_path}"
        )

    # --------------------------------------------------------
    # Detection statistics
    # --------------------------------------------------------

    frame_index = 0
    frames_processed = 0
    total_detections = 0
    unique_track_ids: set = set()
    species_unique_ids: Dict[str, set] = {}
    total_inference_time: float = 0.0

    species_counts: Dict[str, int] = {}
    sample_detections: List[Dict[str, Any]] = []

    # --------------------------------------------------------
    # Process video
    # --------------------------------------------------------

    try:
        while True:
            success, frame = capture.read()

            if not success:
                break

            current_frame = frame_index
            frame_index += 1

            # Process every Nth frame.
            if current_frame % frame_stride != 0:
                continue

            # Run the custom-trained model with ByteTrack object tracking
            t0 = time.perf_counter()
            try:
                results = model.track(
                    source=frame,
                    conf=conf_threshold,
                    imgsz=640,
                    persist=True,
                    tracker="bytetrack.yaml",
                    verbose=False,
                )[0]
            except Exception:
                results = model.predict(
                    source=frame,
                    conf=conf_threshold,
                    imgsz=640,
                    verbose=False,
                )[0]
            total_inference_time += (time.perf_counter() - t0)

            # Draw bounding boxes and class labels.
            annotated_frame = results.plot()

            writer.write(annotated_frame)

            frames_processed += 1

            timestamp_sec = current_frame / fps

            # ------------------------------------------------
            # Extract detections
            # ------------------------------------------------

            if results.boxes is None or len(results.boxes) == 0:
                if (
                    max_frames is not None
                    and max_frames > 0
                    and frames_processed >= max_frames
                ):
                    break

                continue

            for box in results.boxes:
                class_id = int(box.cls[0].item())
                confidence = float(box.conf[0].item())

                class_name = MODEL_CLASS_NAMES.get(
                    class_id,
                    "unknown",
                )

                # Ignore unexpected classes.
                if class_name not in WILDLIFE_MAPPINGS:
                    continue

                mapping = WILDLIFE_MAPPINGS[class_name]

                common_name = mapping["common_name"]
                scientific_name = mapping["scientific_name"]

                total_detections += 1

                # Track unique animal individuals across frames via ByteTrack ID
                track_id = (
                    int(box.id[0].item())
                    if (box.id is not None and len(box.id) > 0)
                    else None
                )
                if track_id is not None:
                    unique_track_ids.add(track_id)
                    if common_name not in species_unique_ids:
                        species_unique_ids[common_name] = set()
                    species_unique_ids[common_name].add(track_id)

                species_counts[common_name] = (
                    species_counts.get(common_name, 0) + 1
                )

                # YOLO returns normalized center coordinates:
                # [center_x, center_y, box_width, box_height].
                xywhn = box.xywhn[0].tolist()

                center_x = float(xywhn[0])
                center_y = float(xywhn[1])
                box_width = float(xywhn[2])
                box_height = float(xywhn[3])

                # Convert center coordinates to top-left coordinates.
                x = max(0.0, center_x - box_width / 2.0)
                y = max(0.0, center_y - box_height / 2.0)

                # Clip the box to the normalized frame boundaries.
                x = min(1.0, x)
                y = min(1.0, y)

                box_width = min(box_width, 1.0 - x)
                box_height = min(box_height, 1.0 - y)

                # Retain detections across frames for complete timeline tracking
                if len(sample_detections) < 1000:
                    sample_detections.append({
                        "id": str(uuid.uuid4())[:8],
                        "track_id": track_id,
                        "frame": current_frame,
                        "timestamp_sec": round(timestamp_sec, 2),
                        "species": scientific_name,
                        "common_name": common_name,
                        "confidence": round(confidence, 3),
                        "box": {
                            "x": round(x, 4),
                            "y": round(y, 4),
                            "width": round(box_width, 4),
                            "height": round(box_height, 4),
                        },
                        "source": "model",
                    })

            if (
                max_frames is not None
                and max_frames > 0
                and frames_processed >= max_frames
            ):
                break

    finally:
        capture.release()
        writer.release()

    # Ensure output video is universally playable in all web browsers (H.264)
    output_path = convert_to_web_h264(output_path)

    # --------------------------------------------------------
    # API response
    # --------------------------------------------------------

    duration_sec = (
        total_video_frames / fps
        if total_video_frames > 0
        else frame_index / fps
    )

    avg_inference_ms = (
        (total_inference_time / frames_processed) * 1000.0
        if frames_processed > 0
        else 0.0
    )

    species_unique_counts = {
        k: len(v) for k, v in species_unique_ids.items()
    }

    return {
        "video": video_name,
        "frames_processed": frames_processed,
        "fps": round(fps, 2),
        "duration_seconds": round(duration_sec, 2),
        "total_frame_detections": total_detections,
        "detections": total_detections,
        "unique_individuals": len(unique_track_ids) if unique_track_ids else total_detections,
        "species_frame_counts": species_counts,
        "species_counts": species_counts,
        "species_unique_counts": species_unique_counts if species_unique_counts else species_counts,
        "inference_speed_ms": round(avg_inference_ms, 1),
        "output_video": str(output_path),
        "output_url": f"/api/output/{output_filename}",
        "sample_detections": sample_detections,
    }