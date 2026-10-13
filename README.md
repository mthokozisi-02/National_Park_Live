# SafariVision — Live Virtual Safari & Drone Telemetry Experience

**SafariVision** is a next-generation web and immersive Virtual Reality (WebXR) prototype designed for virtual safari tourism and conservation monitoring in **Hwange National Park, Zimbabwe**.

This repository demonstrates the interactive client-facing prototype (Phase 1), validating the user experience, low-latency tactical HUD, real-time telemetry instrument cluster, interactive GPS map, AI wildlife vision cataloging, and 3D WebXR observation lounge—without requiring immediate upfront drone hardware purchases.

---

## 🌟 Key Features & Prototype Architecture

### 1. Tactical Drone Video & Aviation HUD
* **Multi-Corridor Camera Feeds**: Switchable feeds across prime savanna corridors (*Mandavu Pan*, *Sinamatella Ridge*, *Nyamandhlovu Pan*).
* **Fail-Safe Procedural Drone Engine**: If external streaming assets are unavailable, the player automatically falls back to an animated 4K procedural canvas feed showing simulated savanna terrain and wildlife silhouettes.
* **Aviation-Grade Tactical HUD**: Real-time artificial horizon ladder with pitch/roll tracking, 360° compass rose heading tape, airspeed and altitude ladder tapes, and GPS coordinates.
* **FLIR Thermal Vision Simulation**: Invert and thermal imaging filter simulating anti-poaching night and dawn tracking.
* **Geotagged Tactical Snapshots**: Captures live video/canvas frames, composites a branded telemetry watermark (GPS coordinates, altitude, heading, airspeed, and timestamp), and triggers an automated image download.

### 2. Immersive 3D WebXR Virtual Safari Lounge
* **Three.js Savanna Environment**: Twilight savanna sky dome, procedural acacia trees, and observation platform.
* **Giant Curved IMAX Cinema Screen**: Projects live camera footage onto a curved cylindrical 3D mesh.
* **Floating Holographic Telemetry**: In-place canvas textures updating real-time flight metrics without tearing down or reconstructing 3D WebGL scenes.
* **Hardware WebXR Integration**: Connects directly to compatible VR headsets (`navigator.xr.requestSession('immersive-vr')`) and utilizes Three.js `renderer.setAnimationLoop()` with fallback to 3D orbit look controls.

### 3. Interactive Safari GPS Map (Leaflet.js)
* **Real-Time Drone Marker**: Dynamically rotates with drone compass bearing.
* **Bounded Breadcrumb Trail**: Tracks flight patrol history capped at 500 points to prevent memory leaks during long-running sessions.
* **Live Telemetry Popups**: Popup labels update dynamically with current speed, altitude, and heading.
* **Point-of-Interest Markers**: Geotagged markers for elephant herds, giraffe towers, lion prides, waterholes, and ranger posts.

### 4. Telemetry Instrument Cluster & Collision-Free Simulator
* **Dual Simulation Modes**:
  * **Auto Patrol**: Drone autonomously follows a simulated orbital patrol pattern around Hwange National Park.
  * **Manual Hold**: Locks flight instruments to user manual adjustments (`+10m Alt`, `-10m Alt`, `+5 km/h`, `-5 km/h`) without background simulator overwrite conflicts.
* **Savanna Microclimate Station**: Ambient temperature, wind vectors, barometric pressure, and solar cycle indicators.

### 5. Procedural Savanna Soundscape
* **Web Audio API Engine**: Generates procedural brown-noise savanna breezes and high-frequency cicada pulses without heavy audio downloads.
* **Lifecycle Management**: Clean AudioContext suspension and node lifecycle tracking.

---

## 🛠️ Technology Stack

| Component | Technology | Description |
|---|---|---|
| **Frontend Framework** | Next.js 16 (App Router) | High-performance React 19 architecture with Server/Client components |
| **Styling** | Tailwind CSS v4 | Futuristic tactical dark HUD aesthetic |
| **3D & VR** | Three.js & WebXR | 3D observation lounge, curved cinema display, and headset rendering |
| **Mapping** | Leaflet.js | Topographic / Dark satellite mapping of Hwange National Park |
| **Icons & Visuals** | Lucide React | Tactical aviation and drone telemetry iconography |
| **Audio** | Web Audio API | Procedural natural savanna soundscape synthesis |
| **Testing** | Node.js Test Runner | Automated tests for coordinate math, trail limits, and boundary clamping |

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: v20 or newer (tested on Node v24)
* **npm**: v10 or newer

### Installation
```bash
git clone https://github.com/mthokozisi-02/National_Park_Live.git
cd National_Park_Live
npm ci
```

### Running the Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** (or `http://localhost:3001` if port 3000 is occupied) in your browser.

### Running Automated Tests
```bash
npm test
```

### Production Build
```bash
npm run build
npm run start
```

---

## ⚠️ Prototype Status & Integration Scope

The current codebase is a **functional client-facing web and WebXR prototype**. To ensure transparency for developers, partners, and clients, the following capabilities are currently simulated and require future hardware and cloud integration in upcoming phases:

| Component | Current Prototype State | Required Field/Production Integration |
|---|---|---|
| **Drone Video Feed** | Local high-definition wildlife video loops (Creative Commons) | Live video ingestion from DJI Matrice / field encoder via RTMP/SRT |
| **Stream Delivery** | HTML5 video element with simulated latency indicator (`DEMO LATENCY`) | Low-latency WebRTC (WHEP) pipeline via media server (e.g. MediaMTX) |
| **Drone Telemetry** | Simulated orbital trajectory around Hwange National Park with manual override | Live MAVLink or DJI Mobile SDK telemetry over WebSocket/MQTT broker |
| **AI Wildlife Detection** | Mock bounding boxes & taxonomy encyclopedia | Real-time edge/cloud inference using YOLOv8 trained on African fauna |
| **WebXR VR Immersion** | Three.js scene connected to WebXR session API (`renderer.xr`) | Verification on physical VR headsets (Meta Quest 3, Apple Vision Pro) over HTTPS |

---

## 🗺️ Roadmap: Phased Path to Field Drone Integration

* **Phase 1: Visual & Interactive Prototype (DELIVERED)**
  * Dashboard layout, tactical HUD overlay, simulated live telemetry dials, interactive Leaflet GPS map with bounded trail history, and WebXR Three.js 3D observation lounge.
* **Phase 2: Streaming Gateway & Field Telemetry Testing**
  * Deploy MediaMTX media server for WebRTC (WHEP) sub-second streaming.
  * Ingest live video via RTMP/SRT from DJI RC Pro / field encoder.
  * Establish WebSocket broker for live MAVLink or DJI SDK telemetry.
* **Phase 3: Production WebXR Immersion**
  * Optimize WebXR sessions for Meta Quest 3, Apple Vision Pro, and mobile VR headsets with spatial audio and interactive 3D wildlife inspect cards.
* **Phase 4: Automated Computer Vision & Field Park Deployment**
  * Train and deploy YOLO object detection models on African savanna wildlife for real-time species recognition and conservation alerts.

---

## 🛡️ Regulatory & Conservation Note
Field drone operations in Hwange National Park are governed by the Zimbabwe National Parks and Wildlife Management Authority (Zimparks). Drone operations must maintain strict minimum operating altitudes (typically 100m+ AGL) and use optical zoom lenses to ensure zero harassment to elephants, rhinos, and savanna predators.
