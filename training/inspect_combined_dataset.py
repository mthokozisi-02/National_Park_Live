from pathlib import Path
from collections import Counter
import yaml

DATASET_DIR = (
    Path(__file__).resolve().parents[1]
    / "datasets"
    / "safari_vision_combined"
)

with open(DATASET_DIR / "data.yaml", "r", encoding="utf-8") as file:
    config = yaml.safe_load(file)

names = config["names"]

if isinstance(names, list):
    class_names = {
        index: name
        for index, name in enumerate(names)
    }
else:
    class_names = {
        int(index): name
        for index, name in names.items()
    }

print("SAFARIVISION COMBINED DATASET")
print("=" * 55)

for split in ("train", "valid", "test"):
    label_dir = DATASET_DIR / split / "labels"
    image_dir = DATASET_DIR / split / "images"

    counts = Counter()

    label_files = list(label_dir.glob("*.txt"))
    image_files = [
        path for path in image_dir.iterdir()
        if path.is_file()
    ]

    for label_file in label_files:
        with label_file.open("r", encoding="utf-8") as file:
            for line in file:
                parts = line.strip().split()

                if not parts:
                    continue

                class_id = int(parts[0])

                if class_id not in class_names:
                    raise ValueError(
                        f"Invalid class ID {class_id} "
                        f"in {label_file}"
                    )

                counts[class_id] += 1

    print(f"\n{split.upper()}")
    print("-" * 55)
    print(f"Images: {len(image_files)}")
    print(f"Annotation files: {len(label_files)}")

    for class_id, name in class_names.items():
        print(
            f"{class_id:2} | {name:12} | "
            f"{counts[class_id]:6} objects"
        )

    print(f"Total annotated objects: {sum(counts.values())}")