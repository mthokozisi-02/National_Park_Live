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
from app.detector import WILDLIFE_MAPPINGS, model, MODEL_CLASS_NAMES, MODEL_NAME, VIDEO_DIR
from app.schemas import BoundingBox, DetectionItem, DetectionResponse

client = TestClient(app)

class TestSafariVisionBackend(unittest.TestCase):

    def test_health_endpoint(self):
        """Verify health check reports model status and device."""
        response = client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status", data)
        self.assertIn(data["status"], ["ok", "degraded"])
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
        if model is None or not (VIDEO_DIR / "final.mp4").is_file():
            self.skipTest("Skipping detect test: model or final.mp4 not present.")
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

    def test_sightings_endpoints(self):
        """Verify sightings list, species filter, and age filter."""
        # 1. Fetch all sightings
        resp = client.get("/api/sightings")
        self.assertEqual(resp.status_code, 200)
        sightings = resp.json()
        self.assertIsInstance(sightings, list)
        self.assertGreater(len(sightings), 0)

        # 2. Filter by species
        resp_elephants = client.get("/api/sightings?species=African%20Elephant")
        self.assertEqual(resp_elephants.status_code, 200)
        elephants = resp_elephants.json()
        for s in elephants:
            self.assertEqual(s["common_name"], "African Elephant")

        # 3. Filter by recent age
        resp_recent = client.get("/api/sightings?max_age_hours=1.0")
        self.assertEqual(resp_recent.status_code, 200)

    def test_create_sighting_and_stats(self):
        """Verify manual sighting creation and stats calculation."""
        payload = {
            "species": "Panthera leo",
            "common_name": "Lion",
            "confidence": 0.95,
            "count": 3,
            "latitude": -18.632,
            "longitude": 26.953,
            "altitude_m": 1045.0,
            "notes": "Test pride sighting"
        }
        create_resp = client.post("/api/sightings", json=payload)
        self.assertEqual(create_resp.status_code, 200)
        created = create_resp.json()
        self.assertIn("id", created)
        self.assertEqual(created["common_name"], "Lion")
        self.assertEqual(created["count"], 3)

        # Verify stats endpoint
        stats_resp = client.get("/api/sightings/stats")
        self.assertEqual(stats_resp.status_code, 200)
        stats = stats_resp.json()
        self.assertGreater(stats["total_sightings"], 0)
        self.assertGreater(stats["total_animals"], 0)
        self.assertTrue(len(stats["species_breakdown"]) > 0)

    def test_estimate_ground_location(self):
        """Verify ground geodesic projection calculation."""
        resp = client.post(
            "/api/sightings/estimate-location?drone_lat=-18.6320&drone_lng=26.9535&drone_alt_m=80.0&heading_deg=0.0&gimbal_pitch_deg=-45.0&bbox_x=0.5&bbox_y=0.5"
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("latitude", data)
        self.assertIn("longitude", data)
        self.assertIn("ground_distance_m", data)
        self.assertGreater(data["ground_distance_m"], 0.0)

    def test_analytics_endpoints(self):
        """Verify analytics summary, predictive occurrence, and intelligence reports."""
        # 1. Summary
        sum_resp = client.get("/api/analytics/summary")
        self.assertEqual(sum_resp.status_code, 200)
        summary = sum_resp.json()
        self.assertIn("total_sightings", summary)
        self.assertIn("sector_analysis", summary)
        self.assertTrue(len(summary["sector_analysis"]) > 0)

        # 2. Predictive occurrence
        pred_resp = client.get("/api/analytics/predictive-occurrence?hour=15")
        self.assertEqual(pred_resp.status_code, 200)
        pred = pred_resp.json()
        self.assertEqual(pred["evaluation_hour"], 15)
        self.assertIn("predictions", pred)
        self.assertTrue(len(pred["predictions"]) > 0)

        # 3. Wildlife report
        rep_resp = client.get("/api/analytics/report?report_type=daily")
        self.assertEqual(rep_resp.status_code, 200)
        report = rep_resp.json()
        self.assertIn("title", report)
        self.assertIn("key_takeaways", report)
        self.assertTrue(len(report["key_takeaways"]) > 0)


if __name__ == "__main__":
    unittest.main()
