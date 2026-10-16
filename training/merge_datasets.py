from pathlib import Path
from collections import Counter
import hashlib
import shutil
import yaml


# ============================================================
# CONFIGURATION
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[1]

BASE_DATASET = PROJECT_ROOT / "datasets" / "safarivision_v3"
EXTRA_DATASET = PROJECT_ROOT / "datasets" / "safari_animals"
OUTPUT_DATASET = PROJECT_ROOT / "datasets" / "safari_vision_combined"

CLASS_NAMES = [
    "bird",
    "buffalo",
    "deer",
    "elephant",
    "giraffe",
    "impala",
    "lion",
    "oryx",
    "wildebeest",
    "zebra",
]

# Safari Animals class ID -> SafariVision class ID
CLASS_MAPPING = {
    0: 3,  # Elephant
    1: 4,  # Giraffe
    2: 5,  # Impala
    5: 9,  # Zebra
}

# These classes cannot be represented in the existing model.
UNSUPPORTED_CLASS_IDS = {3, 4}

IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".bmp",
    ".webp",
    ".tif",
    ".tiff",
}


# ============================================================
# HELPERS
# ============================================================

def sha256_file(path: Path) -> str:
    """Calculate a file hash for exact duplicate detection."""
    digest = hashlib.sha256()

    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)

    return digest.hexdigest()


def find_split(dataset: Path, split: str) -> tuple[Path, Path]:
    """Resolve an image and label directory for a dataset split."""

    candidates = [
        (dataset / split / "images", dataset / split / "labels"),
        (dataset / "images" / split, dataset / "labels" / split),
    ]

    for image_dir, label_dir in candidates:
        if image_dir.is_dir() and label_dir.is_dir():
            return image_dir, label_dir

    raise FileNotFoundError(
        f"Could not find image and label directories for "
        f"split '{split}' in {dataset}"
    )


def image_label_pairs(image_dir: Path, label_dir: Path):
    """Yield images that have corresponding annotation files."""

    images = sorted(
        path
        for path in image_dir.rglob("*")
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    )

    for image in images:
        label = label_dir / f"{image.stem}.txt"

        if not label.is_file():
            print(f"WARNING: Missing annotation: {image}")
            continue

        yield image, label


def read_labels(label_path: Path):
    """Read and validate YOLO annotation rows."""

    rows = []

    with label_path.open("r", encoding="utf-8") as file:
        for line_number, line in enumerate(file, start=1):
            line = line.strip()

            if not line:
                continue

            parts = line.split()

            if len(parts) != 5:
                raise ValueError(
                    f"Invalid YOLO annotation in {label_path}, "
                    f"line {line_number}: expected 5 values, "
                    f"found {len(parts)}"
                )

            try:
                class_id = int(parts[0])
                coordinates = [float(value) for value in parts[1:]]
            except ValueError as exc:
                raise ValueError(
                    f"Invalid annotation in {label_path}, "
                    f"line {line_number}"
                ) from exc

            if not all(0.0 <= value <= 1.0 for value in coordinates):
                raise ValueError(
                    f"Coordinates outside [0, 1] in "
                    f"{label_path}, line {line_number}"
                )

            rows.append((class_id, coordinates))

    return rows


def write_labels(label_path: Path, rows):
    """Write YOLO annotation rows."""

    with label_path.open("w", encoding="utf-8", newline="\n") as file:
        for class_id, coordinates in rows:
            values = " ".join(f"{value:.8f}" for value in coordinates)
            file.write(f"{class_id} {values}\n")


def copy_original_split(split: str):
    """Copy an original split without changing its annotations."""

    image_dir, label_dir = find_split(BASE_DATASET, split)

    out_images = OUTPUT_DATASET / split / "images"
    out_labels = OUTPUT_DATASET / split / "labels"

    out_images.mkdir(parents=True, exist_ok=True)
    out_labels.mkdir(parents=True, exist_ok=True)

    copied = 0

    for image, label in image_label_pairs(image_dir, label_dir):
        destination_image = out_images / image.name
        destination_label = out_labels / label.name

        if destination_image.exists() or destination_label.exists():
            raise FileExistsError(
                f"Unexpected filename collision while copying "
                f"original data: {image.name}"
            )

        shutil.copy2(image, destination_image)
        shutil.copy2(label, destination_label)
        copied += 1

    print(f"Original {split}: copied {copied} image-label pairs")


def collect_existing_hashes():
    """Hash images already copied into the combined training set."""

    hashes = set()
    train_images = OUTPUT_DATASET / "train" / "images"

    for image in train_images.iterdir():
        if image.is_file() and image.suffix.lower() in IMAGE_EXTENSIONS:
            hashes.add(sha256_file(image))

    return hashes


def add_extra_training_data():
    """Add supported Safari Animals images to the training set."""

    image_dir, label_dir = find_split(EXTRA_DATASET, "train")

    out_images = OUTPUT_DATASET / "train" / "images"
    out_labels = OUTPUT_DATASET / "train" / "labels"

    existing_hashes = collect_existing_hashes()

    stats = Counter()
    added_objects = Counter()

    for image, label in image_label_pairs(image_dir, label_dir):
        stats["images_examined"] += 1

        rows = read_labels(label)

        if not rows:
            stats["empty_annotations_skipped"] += 1
            continue

        source_class_ids = {class_id for class_id, _ in rows}

        # Exclude images with unsupported classes rather than silently
        # treating those animals as background.
        if source_class_ids & UNSUPPORTED_CLASS_IDS:
            stats["unsupported_class_images_skipped"] += 1
            continue

        # Fail rather than accidentally mislabel an unexpected class.
        unexpected_ids = source_class_ids - set(CLASS_MAPPING)

        if unexpected_ids:
            raise ValueError(
                f"Unexpected class IDs {sorted(unexpected_ids)} in "
                f"{label}. Check the source data.yaml before proceeding."
            )

        # Only retain images whose every annotation can be represented.
        remapped_rows = [
            (CLASS_MAPPING[class_id], coordinates)
            for class_id, coordinates in rows
        ]

        image_hash = sha256_file(image)

        if image_hash in existing_hashes:
            stats["duplicate_images_skipped"] += 1
            continue

        # Use unique filenames so that external data cannot overwrite
        # an existing image or annotation.
        prefix = f"safari_animals_{image.stem}"
        destination_stem = prefix
        suffix = 1

        while (
            (out_images / f"{destination_stem}{image.suffix.lower()}").exists()
            or (out_labels / f"{destination_stem}.txt").exists()
        ):
            destination_stem = f"{prefix}_{suffix}"
            suffix += 1

        destination_image = (
            out_images / f"{destination_stem}{image.suffix.lower()}"
        )
        destination_label = out_labels / f"{destination_stem}.txt"

        shutil.copy2(image, destination_image)
        write_labels(destination_label, remapped_rows)

        existing_hashes.add(image_hash)

        stats["images_added"] += 1

        for class_id, _ in remapped_rows:
            added_objects[class_id] += 1

    print("\nExternal training data")
    print("-" * 45)

    for key, value in stats.items():
        print(f"{key}: {value}")

    print("\nAdded object counts")
    print("-" * 45)

    for class_id, class_name in enumerate(CLASS_NAMES):
        print(f"{class_id}: {class_name}: {added_objects[class_id]}")


def write_dataset_yaml():
    """Create the final ten-class Ultralytics configuration."""

    config = {
        "path": str(OUTPUT_DATASET.resolve()).replace("\\", "/"),
        "train": "train/images",
        "val": "valid/images",
        "test": "test/images",
        "nc": len(CLASS_NAMES),
        "names": CLASS_NAMES,
    }

    with (OUTPUT_DATASET / "data.yaml").open(
        "w", encoding="utf-8"
    ) as file:
        yaml.safe_dump(
            config,
            file,
            sort_keys=False,
            allow_unicode=True,
        )


def main():
    if not BASE_DATASET.is_dir():
        raise FileNotFoundError(
            f"Original dataset not found: {BASE_DATASET}"
        )

    if not EXTRA_DATASET.is_dir():
        raise FileNotFoundError(
            f"Supplementary dataset not found: {EXTRA_DATASET}"
        )

    if OUTPUT_DATASET.exists():
        raise FileExistsError(
            f"Output dataset already exists: {OUTPUT_DATASET}\n"
            "Nothing was overwritten. Inspect the directory or choose "
            "a new output path before running again."
        )

    # Verify the external dataset class names before remapping.
    with (EXTRA_DATASET / "data.yaml").open(
        "r", encoding="utf-8"
    ) as file:
        extra_config = yaml.safe_load(file)

    raw_names = extra_config.get("names")

    if isinstance(raw_names, list):
        extra_names = {
            index: str(name).lower()
            for index, name in enumerate(raw_names)
        }
    elif isinstance(raw_names, dict):
        extra_names = {
            int(index): str(name).lower()
            for index, name in raw_names.items()
        }
    else:
        raise ValueError("Unsupported names format in safari_animals/data.yaml")

    expected_names = {
        0: "elephant",
        1: "giraffe",
        2: "impala",
        3: "lechwe",
        4: "tsessebe",
        5: "zebra",
    }

    if extra_names != expected_names:
        raise ValueError(
            "The external dataset class mapping differs from the "
            f"expected mapping.\nFound: {extra_names}\n"
            f"Expected: {expected_names}"
        )

    # Verify original dataset class names before copying.
    with (BASE_DATASET / "data.yaml").open(
        "r", encoding="utf-8"
    ) as file:
        base_config = yaml.safe_load(file)

    base_names = base_config.get("names")

    if isinstance(base_names, list):
        base_names = [str(name).lower() for name in base_names]
    elif isinstance(base_names, dict):
        base_names = [
            str(base_names[index]).lower()
            for index in range(len(base_names))
        ]
    else:
        raise ValueError("Unsupported names format in safarivision_v3/data.yaml")

    if base_names != CLASS_NAMES:
        raise ValueError(
            "Original dataset classes do not match the expected order.\n"
            f"Found: {base_names}\nExpected: {CLASS_NAMES}"
        )

    print(f"Original dataset: {BASE_DATASET}")
    print(f"Supplementary dataset: {EXTRA_DATASET}")
    print(f"Output dataset: {OUTPUT_DATASET}")

    OUTPUT_DATASET.mkdir(parents=True)

    try:
        # Preserve original training data and original evaluation splits.
        copy_original_split("train")
        copy_original_split("valid")
        copy_original_split("test")

        # Add eligible external examples only to training.
        add_extra_training_data()

        write_dataset_yaml()

    except Exception:
        print(
            "\nDataset preparation stopped because an error occurred. "
            "The original source datasets remain unchanged. "
            f"Inspect the partial output at: {OUTPUT_DATASET}"
        )
        raise

    print("\nDataset preparation completed.")
    print(f"Combined dataset: {OUTPUT_DATASET}")
    print(f"Configuration: {OUTPUT_DATASET / 'data.yaml'}")


if __name__ == "__main__":
    main()
