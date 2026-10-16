from pathlib import Path
from collections import Counter
import yaml

DATASET_DIR = Path(
    r"C:\source\National_Park_Live\datasets\safari_animals"
)

DATA_YAML = DATASET_DIR / "data.yaml"

with open(DATA_YAML, "r", encoding="utf-8") as file:
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

print("\nDATASET CLASSES")
print("=" * 40)

for class_id, name in class_names.items():
    print(f"{class_id}: {name}")

print("\nANNOTATION COUNTS")
print("=" * 40)

for split in ("train", "valid", "test"):
    label_dir = DATASET_DIR / split / "labels"

    if not label_dir.exists():
        print(f"\n{split}: labels directory not found")
        continue

    counts = Counter()
    label_files = list(label_dir.glob("*.txt"))

    for label_file in label_files:
        with open(label_file, "r", encoding="utf-8") as file:
            for line in file:
                parts = line.strip().split()

                if not parts:
                    continue

                try:
                    class_id = int(parts[0])
                except ValueError:
                    continue

                counts[class_id] += 1

    print(f"\n{split.upper()}")
    print(f"Label files: {len(label_files)}")

    for class_id, name in class_names.items():
        print(f"{name}: {counts[class_id]} annotated objects")

    print(f"Total annotated objects: {sum(counts.values())}")