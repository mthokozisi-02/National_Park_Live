"""
SafariVision - Fine-tune the existing 10-class wildlife detector.

Uses the existing SafariVision checkpoint and the combined dataset.
The original checkpoint and source datasets are not modified.
"""

import sys
from pathlib import Path

from ultralytics import YOLO


# ============================================================
# PROJECT PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[1]

DATASET_CONFIG = (
    PROJECT_ROOT
    / "datasets"
    / "safari_vision_combined"
    / "data.yaml"
)

BASE_MODEL = PROJECT_ROOT / "backend" / "models" / "best.pt"

RUNS_DIR = PROJECT_ROOT / "training" / "runs"

RUN_NAME = "safari_vision_combined"

EXPECTED_CLASSES = {
    0: "bird",
    1: "buffalo",
    2: "deer",
    3: "elephant",
    4: "giraffe",
    5: "impala",
    6: "lion",
    7: "oryx",
    8: "wildebeest",
    9: "zebra",
}

SUPPORTED_IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".bmp",
    ".tif",
    ".tiff",
}


# ============================================================
# VALIDATE CONFIGURATION AND DATASET
# ============================================================

def verify_dataset_readiness() -> bool:
    """Validate paths, image/label pairs, and the model class mapping."""

    print("\n" + "=" * 65)
    print("SAFARIVISION DATASET VALIDATION")
    print("=" * 65)

    if not DATASET_CONFIG.is_file():
        print(f"ERROR: Dataset configuration not found:\n{DATASET_CONFIG}")
        return False

    if not BASE_MODEL.is_file():
        print(f"ERROR: Existing model checkpoint not found:\n{BASE_MODEL}")
        return False

    dataset_root = DATASET_CONFIG.parent

    for split in ("train", "valid", "test"):
        image_dir = dataset_root / split / "images"
        label_dir = dataset_root / split / "labels"

        if not image_dir.is_dir():
            print(f"ERROR: Missing image directory: {image_dir}")
            return False

        if not label_dir.is_dir():
            print(f"ERROR: Missing label directory: {label_dir}")
            return False

        images = [
            path
            for path in image_dir.iterdir()
            if path.is_file()
            and path.suffix.lower() in SUPPORTED_IMAGE_EXTENSIONS
        ]

        labels = list(label_dir.glob("*.txt"))

        if not images:
            print(f"ERROR: No images found in {image_dir}")
            return False

        label_stems = {label.stem for label in labels}
        missing_labels = [
            image.name
            for image in images
            if image.stem not in label_stems
        ]

        if missing_labels:
            print(
                f"ERROR: {len(missing_labels)} images in {split} "
                "have no corresponding label file."
            )
            print("Examples:", missing_labels[:5])
            return False

        print(
            f"{split.upper():5} | "
            f"{len(images):5} images | "
            f"{len(labels):5} label files"
        )

    # Verify the checkpoint has the expected class names and order.
    print("\nLoading existing checkpoint to verify classes...")

    try:
        model = YOLO(str(BASE_MODEL))
        actual_classes = model.names

        normalized_classes = {
            int(class_id): str(class_name).strip().lower()
            for class_id, class_name in actual_classes.items()
        }

        expected_classes = {
            class_id: class_name.lower()
            for class_id, class_name in EXPECTED_CLASSES.items()
        }

        if normalized_classes != expected_classes:
            print("ERROR: The checkpoint class mapping does not match.")
            print("Expected:", expected_classes)
            print("Actual:  ", normalized_classes)
            return False

    except Exception as exc:
        print(f"ERROR: Could not load checkpoint: {exc}")
        return False

    print("\nCheckpoint classes verified.")
    print("Dataset configuration found.")
    print("Image directories and label files verified.")
    print("=" * 65)

    return True


# ============================================================
# FINE-TUNE MODEL
# ============================================================

def train(
    epochs: int = 100,
    imgsz: int = 640,
    batch: int = 8,
    patience: int = 20,
):
    """Fine-tune the existing SafariVision model."""

    if not verify_dataset_readiness():
        sys.exit(1)

    print("\nStarting SafariVision fine-tuning")
    print(f"Starting checkpoint: {BASE_MODEL}")
    print(f"Dataset:             {DATASET_CONFIG}")
    print(f"Epochs:              {epochs}")
    print(f"Image size:          {imgsz}")
    print(f"Batch size:          {batch}")
    print(f"Early stopping:      {patience}")
    print(f"Output directory:    {RUNS_DIR / RUN_NAME}")

    # Start from the existing 10-class SafariVision model.
    model = YOLO(str(BASE_MODEL))

    results = model.train(
        data=str(DATASET_CONFIG),
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        patience=patience,

        # Use a new run name and do not overwrite an existing run.
        project=str(RUNS_DIR),
        name=RUN_NAME,
        exist_ok=False,

        # Reproducibility and validation.
        seed=42,
        deterministic=True,
        val=True,

        # Preserve the best checkpoint and the final checkpoint.
        save=True,
        save_period=10,

        # Keep the existing class mapping.
        single_cls=False,

        # Allow Ultralytics to use an available supported device.
        device=None,

        # Conservative fine-tuning settings.
        lr0=0.001,
        cos_lr=True,

        # Keep the best model based on validation performance.
        plots=True,
        verbose=True,
    )

    best_weights = (
        RUNS_DIR
        / RUN_NAME
        / "weights"
        / "best.pt"
    )

    last_weights = (
        RUNS_DIR
        / RUN_NAME
        / "weights"
        / "last.pt"
    )

    print("\n" + "=" * 65)
    print("SAFARIVISION TRAINING FINISHED")
    print("=" * 65)

    if best_weights.exists():
        print(f"Best checkpoint:  {best_weights}")

    if last_weights.exists():
        print(f"Last checkpoint:  {last_weights}")

    print("\nIMPORTANT:")
    print("The original backend/models/best.pt was not overwritten.")
    print("Evaluate the new checkpoint before deploying it.")

    print("=" * 65)

    return results


if __name__ == "__main__":
    train()
