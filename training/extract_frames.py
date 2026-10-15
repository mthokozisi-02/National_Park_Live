import cv2
from pathlib import Path

# Project directories
PROJECT_ROOT = Path(r"C:\source\National_Park_Live")

VIDEO_DIR = PROJECT_ROOT / "backend" / "videos"
OUTPUT_DIR = PROJECT_ROOT / "datasets" / "extracted_frames"

# Extract one frame every 3 seconds.
FRAME_INTERVAL_SECONDS = 3

# Your source videos
VIDEOS = [
    VIDEO_DIR / "final_test.mp4",
    VIDEO_DIR / "test.mp4",
]


def extract_frames(video_path: Path):
    """Extract frames at regular intervals from a video."""

    if not video_path.exists():
        print(f"[ERROR] Video not found: {video_path}")
        return

    video_name = video_path.stem
    video_output_dir = OUTPUT_DIR / video_name
    video_output_dir.mkdir(parents=True, exist_ok=True)

    capture = cv2.VideoCapture(str(video_path))

    if not capture.isOpened():
        print(f"[ERROR] Could not open video: {video_path}")
        return

    fps = capture.get(cv2.CAP_PROP_FPS)
    total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))

    if fps <= 0:
        print(f"[ERROR] Invalid FPS for video: {video_path}")
        capture.release()
        return

    duration = total_frames / fps
    interval = max(1, round(fps * FRAME_INTERVAL_SECONDS))

    print(f"\nProcessing: {video_path.name}")
    print(f"Duration: {duration:.1f} seconds")
    print(f"FPS: {fps:.2f}")
    print(f"Total frames: {total_frames}")

    saved_count = 0
    frame_number = 0

    while True:
        success, frame = capture.read()

        if not success:
            break

        if frame_number % interval == 0:
            timestamp = frame_number / fps

            filename = (
                f"{video_name}_"
                f"{int(timestamp // 60):02d}m"
                f"{int(timestamp % 60):02d}s.jpg"
            )

            output_path = video_output_dir / filename

            if cv2.imwrite(str(output_path), frame):
                saved_count += 1

        frame_number += 1

    capture.release()

    print(f"Frames saved: {saved_count}")
    print(f"Output folder: {video_output_dir}")


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for video_path in VIDEOS:
        extract_frames(video_path)

    print("\nFrame extraction completed.")
    print(f"Check the frames in: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()