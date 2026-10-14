# African Wildlife Dataset (8 Species)

This dataset defines the target species for **SafariVision** aerial wildlife detection in Hwange National Park.

## Target Species Taxonomy

| Class ID | Label Key | Common Name | Scientific Name | Conservation Status |
| :--- | :--- | :--- | :--- | :--- |
| `0` | `elephant` | African Bush Elephant | *Loxodonta africana* | Endangered |
| `1` | `giraffe` | Southern Giraffe | *Giraffa camelopardalis* | Vulnerable |
| `2` | `zebra` | Plains Zebra | *Equus quagga* | Near Threatened |
| `3` | `impala` | Impala | *Aepyceros melampus* | Least Concern |
| `4` | `lion` | African Lion | *Panthera leo* | Vulnerable |
| `5` | `leopard` | African Leopard | *Panthera pardus pardus* | Vulnerable |
| `6` | `african_buffalo` | African Buffalo | *Syncerus caffer* | Near Threatened |
| `7` | `rhinoceros` | White / Black Rhinoceros | *Ceratotherium simum* / *Diceros bicornis* | Critically Endangered |

## Dataset Structure

```
datasets/african_wildlife/
├── images/
│   ├── train/       # Training images (.jpg, .png)
│   ├── val/         # Validation images
│   └── test/        # Test holdout images
├── labels/
│   ├── train/       # YOLO text label files (.txt)
│   ├── val/
│   └── test/
└── data.yaml        # Dataset configuration for Ultralytics YOLO
```

## Annotation Format (YOLO format)

Each image has a matching `.txt` file:
```
<class_id> <x_center> <y_center> <width> <height>
```
All coordinate values are normalized between `0.0` and `1.0` relative to image dimensions.

Example `elephant_001.txt`:
```
0 0.512 0.438 0.285 0.392
```

## Recommended Annotation Tools
- **Roboflow**: [https://roboflow.com](https://roboflow.com) (export format: `YOLOv8`)
- **CVAT**: [https://www.cvat.ai](https://www.cvat.ai) (export format: `YOLO 1.1`)
- **LILA BC Wildlife**: [https://lila.science/datasets/](https://lila.science/datasets/) (for public wildlife images)
