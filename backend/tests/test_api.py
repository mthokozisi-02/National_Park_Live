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
from app.detector import WILDLIFE_MAPPINGS, model, MODEL_CLASS_NAMES, MODEL_NAME
from app.schemas import BoundingBox, DetectionItem, DetectionResponse

client = TestClient(app)

class TestSafariVisionBackend(unittest.TestCase):

    def test_health_endpoint(self):
        """Verify health check reports model status and device."""
        response = client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status", data)
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["service"], "wildlife-detection")
        self.assertIn("model", data)
        self.assertIn("device", data)

    def test_species_mappings_and_trained_model_classes(self):
        """Verify trained model classes are in WILDLIFE_MAPPINGS and no spurious domestic classes exist."""
        # Ensure domestic COCO classes aren't present as target model classes
        model_classes = set(MODEL_CLASS_NAMES.values())
        self.assertNotIn("cat", model_classes)
        self.assertNotIn("dog", model_classes)
        self.assertNotIn("cow", model_classes)
        self.assertNotIn("sheep", model_classes)

        # Ensure all trained model classes are accounted for in WILDLIFE_MAPPINGS
        for cls_name in model_classes:
            self.assertIn(cls_name, WILDLIFE_MAPPINGS)
            self.assertIsNotNone(WILDLIFE_MAPPINGS[cls_name]["common_name"])
            self.assertIsNotNone(WILDLIFE_MAPPINGS[cls_name]["scientific_name"])

    def test_list_videos(self):
        """Verify video listing returns a list containing available videos including final.mp4."""
        response = client.get("/api/videos")
        self.assertEqual(response.status_code, 200)
        video_list = response.json()
        self.assertIsInstance(video_list, list)
        self.assertIn("final.mp4", video_list)

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
        """Verify DetectionResponse schema parses successfully."""
        resp = DetectionResponse(
            video="test.mp4",
            frames_processed=50,
            fps=25.0,
            duration_seconds=2.0,
            total_frame_detections=15,
            detections=15,
            species_frame_counts={"African Bush Elephant": 15},
            species_counts={"African Bush Elephant": 15},
            output_video="test_detected.mp4",
            output_url="/api/output/test_detected.mp4",
            sample_detections=[]
        )
        self.assertEqual(resp.total_frame_detections, 15)
        self.assertEqual(resp.detections, 15)
        self.assertEqual(resp.species_counts["African Bush Elephant"], 15)

    def test_detect_endpoint_with_final_video(self):
        """Verify /api/detect/final.mp4 runs successfully with trained model."""
        response = client.post("/api/detect/final.mp4?max_frames=10&frame_stride=5")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["video"], "final.mp4")
        self.assertEqual(data["frames_processed"], 10)
        self.assertGreater(data["detections"], 0)
        self.assertIn("species_counts", data)
        self.assertTrue(len(data["species_counts"]) > 0)
        self.assertIn("sample_detections", data)
        self.assertTrue(len(data["sample_detections"]) > 0)


if __name__ == "__main__":
    unittest.main()
