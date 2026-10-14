"""
SafariVision - Fine-tuning YOLOv8 for 8 African Wildlife Species
Trains a customized YOLO model using the African wildlife dataset.
"""

import sys
from pathlib import Path
from ultralytics import YOLO

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATASET_CONFIG = PROJECT_ROOT / "datasets" / "african_wildlife" / "data.yaml"
TRAIN_IMAGES_DIR = PROJECT_ROOT / "datasets" / "african_wildlife" / "images" / "train"
VAL_IMAGES_DIR = PROJECT_ROOT / "datasets" / "african_wildlife" / "images" / "val"
RUNS_DIR = PROJECT_ROOT / "training" / "runs"


def verify_dataset_readiness() -> bool:
    """
    Check if dataset images and labels have been placed before initiating training.
    """
    if not DATASET_CONFIG.is_file():
        print(f"Error: Dataset configuration file missing at: {DATASET_CONFIG}")
        return False

    supported_img_exts = {".jpg", ".jpeg", ".png", ".webp"}

    train_images = [
        f for f in TRAIN_IMAGES_DIR.iterdir()
        if f.is_file() and f.suffix.lower() in supported_img_exts
    ] if TRAIN_IMAGES_DIR.exists() else []

    val_images = [
        f for f in VAL_IMAGES_DIR.iterdir()
        if f.is_file() and f.suffix.lower() in supported_img_exts
    ] if VAL_IMAGES_DIR.exists() else []

    if len(train_images) == 0:
        print("\n" + "=" * 60)
        print("DATASET NOT READY FOR TRAINING")
        print("=" * 60)
        print(f"Training directory is empty: {TRAIN_IMAGES_DIR}")
        print("\nNext Steps:")
        print("1. Extract frames from your safari videos:")
        print("   python training/extract_frames.py")
        print("2. Upload extracted frames to Roboflow or CVAT to label the 8 species:")
        print("   elephant, giraffe, zebra, impala, lion, leopard, african_buffalo, rhinoceros")
        print("3. Export as 'YOLOv8' format and copy images/labels to:")
        print("   datasets/african_wildlife/images/train/ & val/")
        print("   datasets/african_wildlife/labels/train/ & val/")
        print("4. Re-run this training script once images and labels are placed.")
        print("=" * 60 + "\n")
        return False

    print(f"Dataset verified: {len(train_images)} train images, {len(val_images)} validation images.")
    return True


def train(
    base_model: str = "yolov8n.pt",
    epochs: int = 100,
    imgsz: int = 640,
    batch: int = 8,
    patience: int = 20,
):
    """
    Fine-tune YOLO model on the African wildlife dataset.
    """
    if not verify_dataset_readiness():
        sys.exit(1)

    print(f"\nStarting YOLO fine-tuning with base weights: {base_model}")
    print(f"Epochs: {epochs} | Image size: {imgsz} | Batch size: {batch} | Patience: {patience}")
    print(f"Dataset config: {DATASET_CONFIG}")

    model = YOLO(base_model)

    results = model.train(
        data=str(DATASET_CONFIG),
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        patience=patience,
        project=str(RUNS_DIR),
        name="african_wildlife",
        exist_ok=True,
    )

    best_weights = RUNS_DIR / "african_wildlife" / "weights" / "best.pt"
    print("\n" + "=" * 60)
    print("TRAINING FINISHED")
    print("=" * 60)
    if best_weights.exists():
        print(f"Best model checkpoint saved at: {best_weights}")
        print("\nTo use this model in the backend API, update your backend/.env or set:")
        print(f"YOLO_MODEL_NAME={best_weights}")
    else:
        print("Check training run directory for generated weights:", RUNS_DIR / "african_wildlife")
    print("=" * 60)
    return results


if __name__ == "__main__":
    train()
