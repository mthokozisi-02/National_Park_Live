"""
Utility script to extract candidate frames from safari videos for dataset annotation.
Extracts frames at regular intervals (stride) to ensure visual diversity and avoid near-identical images.
"""

import argparse
from pathlib import Path
import cv2

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_VIDEO_DIR = PROJECT_ROOT / "backend" / "videos"
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "datasets" / "african_wildlife" / "extracted_raw"


def extract_frames(
    video_path: Path,
    output_dir: Path,
    frame_stride: int = 30,
    max_frames: int = 100
) -> int:
    """
    Extract frames from a single video and save as JPEG images.
    """
    if not video_path.is_file():
        print(f"Error: Video file not found: {video_path}")
        return 0

    output_dir.mkdir(parents=True, exist_ok=True)
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print(f"Error: Unable to open video: {video_path}")
        return 0

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    video_stem = video_path.stem

    print(f"Processing: {video_path.name} ({total_frames} total frames, {fps:.1f} FPS, stride={frame_stride})")

    frame_idx = 0
    saved_count = 0

    while True:
        success, frame = cap.read()
        if not success:
            break

        if frame_idx % frame_stride == 0:
            timestamp_sec = frame_idx / fps
            out_filename = f"{video_stem}_f{frame_idx:06d}_t{int(timestamp_sec)}s.jpg"
            out_path = output_dir / out_filename
            cv2.imwrite(str(out_path), frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
            saved_count += 1

            if saved_count >= max_frames:
                print(f"Reached max frame extraction limit ({max_frames} frames) for {video_path.name}")
                break

        frame_idx += 1

    cap.release()
    print(f"Extracted {saved_count} frames to {output_dir}")
    return saved_count


def main():
    parser = argparse.ArgumentParser(description="Extract video frames for SafariVision dataset labeling")
    parser.add_argument("--video", type=str, default=None, help="Specific video filename inside backend/videos/ or full path")
    parser.add_argument("--stride", type=int, default=30, help="Extract every N-th frame (default: 30)")
    parser.add_argument("--max", type=int, default=80, help="Maximum frames per video (default: 80)")
    parser.add_argument("--out", type=str, default=str(DEFAULT_OUTPUT_DIR), help="Output directory for extracted frames")
    args = parser.parse_args()

    out_dir = Path(args.out)

    if args.video:
        target_path = Path(args.video)
        if not target_path.is_file():
            target_path = DEFAULT_VIDEO_DIR / args.video
        extract_frames(target_path, out_dir, frame_stride=args.stride, max_frames=args.max)
    else:
        # Process all supported safari videos in backend/videos
        supported_exts = {".mp4", ".webm", ".mov"}
        videos = [f for f in DEFAULT_VIDEO_DIR.iterdir() if f.is_file() and f.suffix.lower() in supported_exts]
        if not videos:
            print(f"No video files found in {DEFAULT_VIDEO_DIR}")
            return

        total_extracted = 0
        for vid in sorted(videos):
            total_extracted += extract_frames(vid, out_dir, frame_stride=args.stride, max_frames=args.max)
        print(f"\nTotal extracted: {total_extracted} frames across {len(videos)} video(s).")
        print(f"Ready for annotation in CVAT (https://www.cvat.ai) or Roboflow (https://roboflow.com).")


if __name__ == "__main__":
    main()
