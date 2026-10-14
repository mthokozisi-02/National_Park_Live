import os
import sys
import unittest
import io
from pathlib import Path

# Add backend directory to sys.path so app module can be resolved
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from app.main import app
from app.detector import WILDLIFE_MAPPINGS, TARGET_CLASSES, model_container
from app.schemas import BoundingBox, DetectionItem, DetectionResponse

client = TestClient(app)

class TestSafariVisionBackend(unittest.TestCase):

    def test_health_endpoint(self):
        """Verify health check reports model status, supported classes, and device."""
        response = client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status", data)
        self.assertIn("model_loaded", data)
        self.assertIn("supported_classes", data)
        self.assertIn("elephant", data["supported_classes"])
        self.assertIn("zebra", data["supported_classes"])
        self.assertIn("giraffe", data["supported_classes"])
        self.assertIn("bird", data["supported_classes"])

    def test_species_mappings_conservative(self):
        """Verify no unverified wildlife species mappings (e.g. cat -> lion, dog -> wild dog)."""
        self.assertNotIn("cat", TARGET_CLASSES)
        self.assertNotIn("dog", TARGET_CLASSES)
        self.assertNotIn("cow", TARGET_CLASSES)
        self.assertNotIn("sheep", TARGET_CLASSES)

        for species_key, meta in WILDLIFE_MAPPINGS.items():
            self.assertIn(species_key, ["elephant", "zebra", "giraffe", "bird"])
            self.assertIsNone(meta["scientific_name"])

    def test_list_videos(self):
        """Verify video listing returns a list with allowed extensions."""
        response = client.get("/api/videos")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json(), list)

    def test_upload_invalid_extension(self):
        """Verify uploads with invalid extension (e.g. .exe) are rejected with 400."""
        file_content = b"fake binary payload"
        response = client.post(
            "/api/upload",
            files={"file": ("malicious_script.exe", io.BytesIO(file_content), "application/octet-stream")}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Unsupported file format", response.json()["detail"])

    def test_upload_corrupt_video(self):
        """Verify upload of corrupt/non-video file with valid extension is rejected by OpenCV check."""
        corrupt_content = b"This is not a real mp4 video file header."
        response = client.post(
            "/api/upload",
            files={"file": ("corrupt_test.mp4", io.BytesIO(corrupt_content), "video/mp4")}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("not a readable or valid video", response.json()["detail"])

    def test_detect_path_traversal_protection(self):
        """Verify directory traversal is prevented."""
        response = client.post("/api/detect/subdir%2Fvideo.mp4")
        self.assertIn(response.status_code, [400, 404])

    def test_output_path_traversal_protection(self):
        """Verify output endpoint prevents directory traversal."""
        response = client.get("/api/output/subdir%2Fsecret.txt")
        self.assertIn(response.status_code, [400, 404])

    def test_schemas_metric_separation(self):
        """Verify DetectionResponse separates frame detections from unique animals."""
        resp = DetectionResponse(
            video="test.mp4",
            frames_processed=50,
            fps=25.0,
            duration_seconds=2.0,
            total_frame_detections=15,
            detections=15,
            species_frame_counts={"Elephant": 15},
            species_counts={"Elephant": 15},
            output_video="test_detected.mp4",
            output_url="/api/output/test_detected.mp4",
            sample_detections=[]
        )
        self.assertEqual(resp.total_frame_detections, 15)
        self.assertEqual(resp.species_frame_counts["Elephant"], 15)
        self.assertEqual(resp.sample_detections, [])

    def test_normalized_bounding_box_coordinates(self):
        """Verify BoundingBox schema enforces normalized 0-1 values."""
        box = BoundingBox(x=0.25, y=0.15, width=0.50, height=0.60)
        self.assertAlmostEqual(box.x, 0.25)
        self.assertAlmostEqual(box.y, 0.15)
        self.assertAlmostEqual(box.width, 0.50)
        self.assertAlmostEqual(box.height, 0.60)

if __name__ == "__main__":
    unittest.main()
