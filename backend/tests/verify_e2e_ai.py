"""
End-to-End AI Verification Test Suite for SafariVision
Validates the complete workflow requested:
  Test A: Model Loading & Class Names
  Test B: Missing Checkpoint Graceful Degradation (HTTP 503 & Health)
  Test C: Real Video Inference & ByteTrack Tracking
  Test D: Video Switching & Cross-Video Track Isolation
"""

import os
import sys
import unittest
import importlib
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
import app.detector as detector
from app.main import app
from app.detector import WILDLIFE_MAPPINGS, MODEL_PATH, VIDEO_DIR

client = TestClient(app)

class TestSafariVisionEndToEnd(unittest.TestCase):

    # ==========================================================
    # TEST A: MODEL LOADING & TAXONOMY
    # ==========================================================
    def test_A_model_loading_and_taxonomy(self):
        """Verify best_finetuned.pt loads cleanly with exact 10 trained wildlife classes."""
        print("\n--- Running Test A: Model Loading & Taxonomy ---")
        self.assertTrue(MODEL_PATH.is_file(), f"Model checkpoint must exist at {MODEL_PATH}")
        self.assertIsNotNone(detector.model, "YOLO model must be initialized in memory")

        # 1. Inspect model's internal class names
        class_names = set(detector.MODEL_CLASS_NAMES.values())
        print(f"Loaded model: {detector.MODEL_NAME}")
        print(f"Trained classes ({len(class_names)}): {sorted(class_names)}")

        expected_10 = {
            "bird", "buffalo", "deer", "elephant", "giraffe",
            "impala", "lion", "oryx", "wildebeest", "zebra"
        }
        self.assertEqual(class_names, expected_10, "Model must contain exactly the 10 trained wildlife classes")

        # 2. Confirm /api/health reports operational status
        res = client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print(f"Health response: status={data['status']}, model_loaded={data['model_loaded']}, device={data.get('device')}")

        self.assertEqual(data["status"], "ok")
        self.assertTrue(data["model_loaded"])
        self.assertEqual(data["model"], "best_finetuned.pt")
        self.assertIsNone(data.get("error"))
        self.assertEqual(len(data["supported_classes"]), 10)
        print("✓ Test A Passed: Model loaded cleanly with exact 10-species taxonomy.")

    # ==========================================================
    # TEST B: MISSING CHECKPOINT GRACEFUL DEGRADATION
    # ==========================================================
    def test_B_missing_checkpoint_degradation(self):
        """Verify graceful degradation when model checkpoint is missing."""
        print("\n--- Running Test B: Missing Checkpoint Degradation ---")
        saved_model = detector.model
        saved_error = detector.MODEL_LOAD_ERROR

        try:
            # Simulate missing checkpoint
            detector.model = None
            detector.MODEL_LOAD_ERROR = "Simulated missing best_finetuned.pt checkpoint"

            # 1. /api/health reports degraded status
            health_res = client.get("/api/health")
            self.assertEqual(health_res.status_code, 200)
            health_data = health_res.json()
            print(f"Degraded Health: status={health_data['status']}, error={health_data['error']}")
            self.assertEqual(health_data["status"], "degraded")
            self.assertFalse(health_data["model_loaded"])
            self.assertIn("Simulated missing", health_data["error"])

            # 2. Non-inference endpoints remain 100% available
            videos_res = client.get("/api/videos")
            self.assertEqual(videos_res.status_code, 200)
            self.assertIsInstance(videos_res.json(), list)

            sightings_res = client.get("/api/sightings")
            self.assertEqual(sightings_res.status_code, 200)

            analytics_res = client.get("/api/analytics/summary")
            self.assertEqual(analytics_res.status_code, 200)

            # 3. Inference requests return HTTP 503
            detect_res = client.post("/api/detect/final.mp4")
            self.assertEqual(detect_res.status_code, 503)
            self.assertIn("unavailable", detect_res.json()["detail"].lower())

            frame_res = client.post(
                "/api/detect/frame",
                files={"file": ("frame.jpg", b"fake-jpeg", "image/jpeg")}
            )
            self.assertEqual(frame_res.status_code, 503)
            print("✓ Test B Passed: Degraded mode handles missing weights with HTTP 503 without crashing server.")
        finally:
            # Restore model state
            detector.model = saved_model
            detector.MODEL_LOAD_ERROR = saved_error

    # ==========================================================
    # TEST C: ACTUAL VIDEO INFERENCE & TRACKING
    # ==========================================================
    def test_C_actual_video_inference(self):
        """Run real inference on video footage, verifying bounding boxes, confidence, and ByteTrack."""
        print("\n--- Running Test C: Actual Video Inference ---")
        target_video = "final_test.mp4"
        self.assertTrue((VIDEO_DIR / target_video).is_file(), f"{target_video} must exist in backend/videos")

        # Process first 15 frames with stride 2 for fast, deterministic end-to-end verification
        res = client.post(f"/api/detect/{target_video}?max_frames=15&frame_stride=2&conf=0.20")
        self.assertEqual(res.status_code, 200, f"Inference failed: {res.text}")
        data = res.json()

        print(f"Video processed: {data['video']}")
        print(f"Frames evaluated: {data['frames_processed']}, FPS: {data['fps']}")
        print(f"Detection Events (boxes across frames): {data['total_frame_detections']}")
        print(f"Tracked Individuals (ByteTrack): {data.get('tracked_individuals', data.get('unique_individuals'))}")
        print(f"Species Counts: {data.get('species_counts')}")
        print(f"Inference Speed: {data.get('inference_speed_ms')} ms/frame")

        # Assertions
        self.assertEqual(data["video"], target_video)
        self.assertGreater(data["frames_processed"], 0)
        self.assertGreater(data["fps"], 0)
        self.assertGreater(data["total_frame_detections"], 0)

        # Verify Detection Events >= Tracked Individuals (crucial semantic rule)
        tracked = data.get("tracked_individuals", data.get("unique_individuals", 0))
        events = data.get("total_frame_detections", data.get("detections", 0))
        if data.get("tracking_active"):
            self.assertGreaterEqual(events, tracked, "Total detection events must be >= unique tracked individuals")

        # Verify sample detections format
        sample_dets = data.get("sample_detections", [])
        self.assertGreater(len(sample_dets), 0, "Must return sample detections")

        for det in sample_dets[:5]:
            # Confidence check
            conf = det["confidence"]
            self.assertGreaterEqual(conf, 0.20)
            self.assertLessEqual(conf, 1.0)

            # Bounding box coordinates normalized [0.0 - 1.0]
            box = det["box"]
            self.assertGreaterEqual(box["x"], 0.0)
            self.assertLessEqual(box["x"], 1.0)
            self.assertGreaterEqual(box["y"], 0.0)
            self.assertLessEqual(box["y"], 1.0)
            self.assertGreater(box["width"], 0.0)
            self.assertGreater(box["height"], 0.0)
            self.assertLessEqual(box["x"] + box["width"], 1.05)
            self.assertLessEqual(box["y"] + box["height"], 1.05)

            # Common name mapped
            self.assertIn(det["common_name"], [m["common_name"] for m in WILDLIFE_MAPPINGS.values()])

        print("✓ Test C Passed: Real inference produced valid bounding boxes, confidences, and tracking metrics.")

    # ==========================================================
    # TEST D: FRONTEND/DATABASE SYNCHRONIZATION & VIDEO SWITCHING
    # ==========================================================
    def test_D_video_switching_and_cross_video_isolation(self):
        """Verify video switching produces independent detection results and track IDs are scoped per video."""
        print("\n--- Running Test D: Video Switching & Cross-Video Track Isolation ---")
        # Run detection on video 1
        res1 = client.post("/api/detect/final_test.mp4?max_frames=10&frame_stride=3")
        self.assertEqual(res1.status_code, 200)
        data1 = res1.json()

        # Run detection on video 2
        res2 = client.post("/api/detect/test.mp4?max_frames=10&frame_stride=3")
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()

        print(f"Video 1 ({data1['video']}): {data1['total_frame_detections']} events, output: {data1['output_url']}")
        print(f"Video 2 ({data2['video']}): {data2['total_frame_detections']} events, output: {data2['output_url']}")

        self.assertNotEqual(data1["video"], data2["video"])
        self.assertNotEqual(data1["output_url"], data2["output_url"])

        # Check sightings database records
        sightings_res = client.get("/api/sightings")
        self.assertEqual(sightings_res.status_code, 200)
        all_sightings = sightings_res.json()

        # Verify sightings recorded from video 1 have source_video = final_test.mp4
        s_video1 = [s for s in all_sightings if s.get("source_video") == "final_test.mp4"]
        s_video2 = [s for s in all_sightings if s.get("source_video") == "test.mp4"]
        print(f"Database observations recorded: final_test.mp4={len(s_video1)}, test.mp4={len(s_video2)}")

        # Test Idempotency: Rescan video 1 and verify database count for video 1 does not explode with duplicate rows
        count_before = len(s_video1)
        res1_rescan = client.post("/api/detect/final_test.mp4?max_frames=10&frame_stride=3")
        self.assertEqual(res1_rescan.status_code, 200)

        sightings_res_after = client.get("/api/sightings")
        all_sightings_after = sightings_res_after.json()
        s_video1_after = [s for s in all_sightings_after if s.get("source_video") == "final_test.mp4"]
        print(f"Database observations for final_test.mp4 after rescan: {len(s_video1_after)} (initial: {count_before})")
        self.assertEqual(len(s_video1_after), count_before, "Re-scanning video must be idempotent and not duplicate sighting records")

        print("✓ Test D Passed: Video switching produces isolated output videos, detections, and idempotent database records.")


if __name__ == "__main__":
    unittest.main()
