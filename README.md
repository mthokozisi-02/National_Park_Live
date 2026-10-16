# SafariVision — Live Wildlife Detection & Drone Telemetry Platform

**SafariVision** is a full-stack wildlife detection and drone operations platform for **Hwange National Park, Zimbabwe**. The system combines a fine-tuned YOLOv8 detection model served via a FastAPI backend with a Next.js 16 tactical dashboard, enabling real-time species identification from aerial video footage.

---

## 🌟 Key Features

### 1. Real-Time AI Wildlife Detection (YOLOv8 + FastAPI)
* **Trained YOLO Model** (`best_finetuned.pt`): Custom fine-tuned YOLOv8 model detecting 10 African wildlife species (elephant, lion, giraffe, zebra, buffalo, impala, wildebeest, oryx, bird, deer).
* **Frame-Level Live Inference**: The frontend extracts video frames every 250 ms and sends them to `/api/detect/frame` for immediate bounding box predictions on the HUD.
* **Full-Video Batch Detection**: Run `/api/detect/{video_name}` to process entire videos with ByteTrack persistent ID tracking, producing an annotated H.264 output video.
* **Three-Tier Information Architecture**: The wildlife panel clearly distinguishes **AI Model Predictions** (confidence, bounding boxes from `best_finetuned.pt`), **Calculated Metrics** (estimated individuals from ByteTrack IDs, geodesic distance), and **Reference Taxonomy** (IUCN status, scientific name, habitat).
* **Accurate Count Semantics**: Total frame detection events (bounding boxes across all frames) are reported separately from estimated unique individuals (ByteTrack persistent IDs). The system never inflates population counts using frame-level detection sums.

### 2. Bounding Box Overlay Alignment
* **object-contain Letterbox Correction**: The HUD overlay precisely accounts for letterboxing when the video aspect ratio differs from the player container, using `ResizeObserver` and `onLoadedMetadata` to compute the exact visible video bounds and align bounding boxes to the true video area.

### 3. Tactical Drone Video & Aviation HUD
* **Multi-Corridor Camera Feeds**: Switchable feeds across prime savanna corridors.
* **Fail-Safe Procedural Engine**: Procedural canvas fallback (simulated savanna terrain) when video is unavailable.
* **Aviation-Grade HUD**: Artificial horizon, heading tape, airspeed/altitude ladders, GPS.
* **FLIR Thermal Vision**: CSS filter chain applied only to the video element (not the HUD overlays).
* **Geotagged Snapshots**: Captures video frames with telemetry watermark and accurate source labels (`RECORDED FOOTAGE`, `LIVE TELEMETRY STREAM`, or `PROCEDURAL SIMULATION`).

### 4. Immersive 3D WebXR Virtual Safari Lounge
* Three.js savanna environment with a curved IMAX screen projecting live footage.
* WebXR session API integration for VR headsets.

### 5. Interactive Safari GPS Map (Leaflet.js)
* Real-time drone marker with compass bearing rotation.
* Wildlife sighting markers linked to inference results.

### 6. Wildlife Sightings & Analytics
* FastAPI persists detected sightings to SQLite with geospatial ground location estimation.
* Analytics endpoints: summary, predictive occurrence, intelligence reports.

---

## 🛠️ Technology Stack

| Component | Technology | Description |
|---|---|---|
| **Frontend** | Next.js 16 (App Router + Turbopack) | React 19 with Server/Client components |
| **Styling** | Tailwind CSS v4 | Tactical light-theme dashboard |
| **AI Detection** | Ultralytics YOLOv8 + ByteTrack | Fine-tuned wildlife detection model |
| **Backend** | FastAPI + Uvicorn | REST API for detection, sightings, analytics |
| **3D / VR** | Three.js & WebXR | Immersive safari lounge |
| **Mapping** | Leaflet.js | Topographic mapping of Hwange National Park |
| **Icons** | FontAwesome | Tactical and wildlife iconography |
| **Audio** | Web Audio API | Procedural savanna soundscape |
| **Testing** | Python unittest + Node.js Test Runner | Backend API + frontend service tests |

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: v20+ (tested on v24)
* **npm**: v10+
* **Python**: 3.10+ with pip (for backend)

### Frontend Installation
```bash
git clone https://github.com/mthokozisi-02/National_Park_Live.git
cd National_Park_Live
npm ci
```

### Backend Installation
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate       # Windows
# source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
```

### Model Setup
Place your trained model checkpoint at:
```
backend/models/best_finetuned.pt
```
Or set the `MODEL_PATH` environment variable:
```bash
# Windows
set MODEL_PATH=C:\path\to\your\best_finetuned.pt
# macOS/Linux
export MODEL_PATH=/path/to/best_finetuned.pt
```

> **Note**: If the model checkpoint is missing, the backend starts in **degraded mode**. Non-inference endpoints (`/api/health`, `/api/videos`, `/api/sightings`, `/api/analytics`) continue working. Inference endpoints return HTTP 503.

### Video Files
Place safari video files in **both** locations (the frontend serves from `public/videos/`, the backend reads from `backend/videos/`):
```
public/videos/final.mp4
public/videos/safari-feed-alpha.webm
... etc.

backend/videos/final.mp4
backend/videos/safari-feed-alpha.webm
... etc.
```

### Running the Application

**Start the backend** (in `backend/`):
```bash
.venv\Scripts\uvicorn.exe app.main:app --port 8000 --reload
```

**Start the frontend** (in the project root):
```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### Environment Variables
Copy `.env.example` to `.env.local` and configure:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Copy `backend/.env.example` to `backend/.env`:
```bash
MODEL_PATH=./models/best_finetuned.pt
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Running Tests
```bash
# Frontend tests
npm test

# Backend tests
cd backend
.venv\Scripts\python.exe tests/test_api.py
```

### Production Build
```bash
npm run build
npm run start
```

---

## 🏗️ Architecture

```
National_Park_Live/
├── src/                          # Next.js 16 App Router frontend
│   ├── app/page.tsx              # Main dashboard — owns all inference state
│   ├── components/
│   │   ├── SafariVideoPlayer.tsx # Video + live frame scanning + videoBounds tracking
│   │   ├── DroneHudOverlay.tsx   # HUD overlays + letterbox-aligned bounding boxes
│   │   └── WildlifePanel.tsx     # YOLO control panel + three-tier animal info
│   ├── services/
│   │   ├── wildlifeDetectionService.ts  # FastAPI detection API client
│   │   ├── sightingsService.ts          # Sightings API client
│   │   └── analyticsService.ts         # Analytics API client
│   ├── config/api.ts             # Shared API_BASE_URL
│   └── types/
│       ├── safari.ts             # Frontend domain types
│       └── wildlifeDetection.ts  # Backend contract types
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI routes
│   │   ├── detector.py           # YOLO inference engine (graceful degraded mode)
│   │   ├── sightings.py          # SQLite sightings persistence
│   │   ├── analytics.py          # Wildlife analytics
│   │   └── schemas.py            # Pydantic response models
│   ├── models/                   # Place best_finetuned.pt here
│   └── videos/                   # Backend video source directory
├── public/videos/                # Frontend video serving directory
└── README.md
```

---

## ⚠️ Integration Status

| Component | Status | Notes |
|---|---|---|
| YOLO wildlife model | ✅ Integrated | `best_finetuned.pt` — graceful degradation if missing |
| FastAPI backend | ✅ Implemented | Detection, health, video, sightings, analytics endpoints |
| Live frame inference | ✅ Working | 250 ms frame scan cycle from video player |
| Bounding box alignment | ✅ Fixed | Letterbox-corrected via `videoBounds` computation |
| Count semantics | ✅ Fixed | Detection events vs. ByteTrack unique individuals clearly separated |
| Video directory sync | ✅ Fixed | `public/videos/` and `backend/videos/` aligned |
| Backend degraded mode | ✅ Fixed | `/api/health` returns `status: "degraded"` without crashing |
| Frontend state ownership | ✅ Fixed | `page.tsx` owns `inferenceResult`/`inferenceError` |
| Automated tests | ✅ Passing | 13/13 backend, 21/21 frontend |

---

## 🛡️ Regulatory & Conservation Note
Field drone operations in Hwange National Park are governed by the Zimbabwe National Parks and Wildlife Management Authority (Zimparks). Drone operations must maintain minimum operating altitudes (typically 100m+ AGL) and use optical zoom lenses to ensure zero harassment to elephants, rhinos, and savanna predators.
