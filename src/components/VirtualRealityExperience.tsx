'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { SafariCameraStream, DroneTelemetry } from '@/types/safari';
import {
  X,
  Compass,
  Headphones,
  Maximize2,
  Tv,
  Globe2,
  HelpCircle,
  Eye,
  Info,
  CheckCircle2
} from 'lucide-react';

interface VirtualRealityExperienceProps {
  currentStream: SafariCameraStream;
  telemetry: DroneTelemetry;
  onExitVr: () => void;
}

export const VirtualRealityExperience: React.FC<VirtualRealityExperienceProps> = ({
  currentStream,
  telemetry,
  onExitVr,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [xrSupported, setXrSupported] = useState<boolean>(false);
  const [xrActive, setXrActive] = useState<boolean>(false);
  const [xrNotice, setXrNotice] = useState<string | null>(null);

  // Keep latest telemetry in ref so scene never recreates on tick
  const telemetryRef = useRef<DroneTelemetry>(telemetry);
  useEffect(() => {
    telemetryRef.current = telemetry;
  }, [telemetry]);

  // Three.js and DOM refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const videoTextureRef = useRef<THREE.VideoTexture | null>(null);
  const leftHoloTexRef = useRef<THREE.CanvasTexture | null>(null);
  const rightHoloTexRef = useRef<THREE.CanvasTexture | null>(null);
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const xrSessionRef = useRef<any>(null);

  // Check WebXR hardware support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'xr' in navigator) {
      (navigator as any).xr
        ?.isSessionSupported?.('immersive-vr')
        .then((supported: boolean) => {
          setXrSupported(supported);
        })
        .catch(() => {});
    }
  }, []);

  // Update holographic canvas textures in-place without touching 3D meshes
  const updateHoloTextures = useCallback(() => {
    const t = telemetryRef.current;

    // Left Telemetry Panel
    const leftCanvas = leftCanvasRef.current;
    if (leftCanvas && leftHoloTexRef.current) {
      const ctx = leftCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(7, 18, 28, 0.9)';
        ctx.fillRect(0, 0, 512, 256);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 6;
        ctx.strokeRect(6, 6, 500, 244);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 30px monospace';
        ctx.fillText(`FLIGHT TELEMETRY`, 24, 55);

        ctx.fillStyle = '#f3f4f6';
        ctx.font = '22px monospace';
        ctx.fillText(`ALTITUDE: ${t.altitude.toFixed(1)}m AGL`, 24, 105);
        ctx.fillText(`AIRSPEED: ${t.speed.toFixed(1)} km/h`, 24, 145);
        ctx.fillText(`HEADING:  ${Math.round(t.heading)}° (NE)`, 24, 185);
        ctx.fillText(`BATTERY:  ${t.batteryPercentage}% (${t.flightTimeRemainingMin}m)`, 24, 225);

        leftHoloTexRef.current.needsUpdate = true;
      }
    }

    // Right Mission Status Panel
    const rightCanvas = rightCanvasRef.current;
    if (rightCanvas && rightHoloTexRef.current) {
      const ctx = rightCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(7, 18, 28, 0.9)';
        ctx.fillRect(0, 0, 512, 256);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 6;
        ctx.strokeRect(6, 6, 500, 244);

        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 30px monospace';
        ctx.fillText(`HWANGE SAFARI VR`, 24, 55);

        ctx.fillStyle = '#f3f4f6';
        ctx.font = '22px monospace';
        ctx.fillText(`MODE: ${t.flightMode}`, 24, 105);
        ctx.fillText(`LINK: ${t.signalType} (${t.signalStrength}%)`, 24, 145);
        ctx.fillText(`GPS:  ${t.dataMode.toUpperCase()} (22 SATS)`, 24, 185);
        ctx.fillText(`TEMP: ${t.temperatureC}°C | ${t.windSpeedKmh}km/h ${t.windDirection}`, 24, 225);

        rightHoloTexRef.current.needsUpdate = true;
      }
    }
  }, []);

  // Update telemetry canvas periodically
  useEffect(() => {
    const interval = setInterval(updateHoloTextures, 1000);
    return () => clearInterval(interval);
  }, [updateHoloTextures]);

  // Main Scene Lifecycle: Mounted ONCE, completely decoupled from telemetry updates
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Track all disposable Three.js resources
    const disposables: {
      geometries: THREE.BufferGeometry[];
      materials: THREE.Material[];
      textures: THREE.Texture[];
    } = {
      geometries: [],
      materials: [],
      textures: [],
    };

    // 1. Scene, Camera, WebXR-enabled Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x1a1208, 0.012);

    const camera = new THREE.PerspectiveCamera(
      70,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.6, 0); // 1.6m eye level

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // CRITICAL FINDING FIX: Enable WebXR on the renderer
    renderer.xr.enabled = true;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // 2. Savanna Atmospheric Dusk Lighting
    const ambientLight = new THREE.AmbientLight(0xffecd2, 0.7);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xf59e0b, 1.8);
    sunLight.position.set(50, 25, -60);
    scene.add(sunLight);

    // 3. Savanna Sky Dome
    const skyGeo = new THREE.SphereGeometry(400, 32, 15);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x140e06, side: THREE.BackSide });
    disposables.geometries.push(skyGeo);
    disposables.materials.push(skyMat);
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // 4. Observation Deck Platform & Railing
    const deckGeo = new THREE.CylinderGeometry(8, 8.5, 0.4, 32);
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x1f1912, roughness: 0.8, metalness: 0.1 });
    disposables.geometries.push(deckGeo);
    disposables.materials.push(deckMat);
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.y = -0.2;
    scene.add(deck);

    const railingGeo = new THREE.TorusGeometry(7.8, 0.05, 12, 48);
    const railingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    disposables.geometries.push(railingGeo);
    disposables.materials.push(railingMat);
    const railing = new THREE.Mesh(railingGeo, railingMat);
    railing.rotation.x = Math.PI / 2;
    railing.position.y = 1.0;
    scene.add(railing);

    // 5. Procedural Acacia Trees around perimeter
    const treeGroup = new THREE.Group();
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.6, 6, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x27190d });
    const canopyGeo = new THREE.CylinderGeometry(4.5, 1.2, 0.8, 12);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x1e2712 });
    disposables.geometries.push(trunkGeo, canopyGeo);
    disposables.materials.push(trunkMat, canopyMat);

    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const dist = 35 + (i % 4) * 8;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(x, 3, z);
      treeGroup.add(trunk);

      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.set(x, 6.2, z);
      treeGroup.add(canopy);
    }
    scene.add(treeGroup);

    // 6. Giant Curved Cinema Screen with Live Video Texture
    const video = document.createElement('video');
    video.src = currentStream.videoUrl;
    if (currentStream.videoUrl.startsWith('http')) {
      video.crossOrigin = 'anonymous';
    }
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.play().catch(() => {});
    videoElementRef.current = video;

    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    disposables.textures.push(videoTexture);
    videoTextureRef.current = videoTexture;

    const screenGeo = new THREE.CylinderGeometry(12, 12, 6.75, 48, 1, true, -Math.PI / 4, Math.PI / 2);
    const screenMat = new THREE.MeshBasicMaterial({ map: videoTexture, side: THREE.DoubleSide });
    disposables.geometries.push(screenGeo);
    disposables.materials.push(screenMat);

    const curvedScreen = new THREE.Mesh(screenGeo, screenMat);
    curvedScreen.position.set(0, 3.2, 0);
    curvedScreen.rotation.y = Math.PI;
    scene.add(curvedScreen);

    // 7. Floating 3D Holographic Telemetry Panels
    const createHoloCanvas = () => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 256;
      return c;
    };

    const leftCanvas = createHoloCanvas();
    const rightCanvas = createHoloCanvas();
    leftCanvasRef.current = leftCanvas;
    rightCanvasRef.current = rightCanvas;

    const leftTex = new THREE.CanvasTexture(leftCanvas);
    const rightTex = new THREE.CanvasTexture(rightCanvas);
    disposables.textures.push(leftTex, rightTex);
    leftHoloTexRef.current = leftTex;
    rightHoloTexRef.current = rightTex;

    const panelGeo = new THREE.PlaneGeometry(3.5, 1.75);
    const leftMat = new THREE.MeshBasicMaterial({ map: leftTex, transparent: true, opacity: 0.9 });
    const rightMat = new THREE.MeshBasicMaterial({ map: rightTex, transparent: true, opacity: 0.9 });
    disposables.geometries.push(panelGeo);
    disposables.materials.push(leftMat, rightMat);

    const leftHolo = new THREE.Mesh(panelGeo, leftMat);
    leftHolo.position.set(-6.2, 3.2, -6.8);
    leftHolo.rotation.y = Math.PI / 4;
    scene.add(leftHolo);

    const rightHolo = new THREE.Mesh(panelGeo, rightMat);
    rightHolo.position.set(6.2, 3.2, -6.8);
    rightHolo.rotation.y = -Math.PI / 4;
    scene.add(rightHolo);

    // Populate initial text on panels
    updateHoloTextures();

    // 8. Scoped Pointer Interaction on Container
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let lon = 0;
    let lat = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
      container.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;

      lon += dx * 0.18;
      lat -= dy * 0.18;
      lat = Math.max(-85, Math.min(85, lat));
    };

    const onPointerUp = (e: PointerEvent) => {
      isDragging = false;
      try {
        container.releasePointerCapture(e.pointerId);
      } catch {}
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);

    // Resize handling
    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // CRITICAL FINDING FIX: Use Three.js XR-compatible animation loop
    renderer.setAnimationLoop(() => {
      // If NOT in WebXR headset, manual spherical camera look is applied
      if (!renderer.xr.isPresenting) {
        const phi = THREE.MathUtils.degToRad(90 - lat);
        const theta = THREE.MathUtils.degToRad(lon - 90);

        const targetX = 500 * Math.sin(phi) * Math.cos(theta);
        const targetY = 500 * Math.cos(phi);
        const targetZ = 500 * Math.sin(phi) * Math.sin(theta);

        camera.lookAt(targetX, targetY, targetZ);
      }

      // Gentle floating oscillation for holographic HUDs
      const time = Date.now() * 0.0015;
      leftHolo.position.y = 3.2 + Math.sin(time) * 0.06;
      rightHolo.position.y = 3.2 + Math.cos(time) * 0.06;

      renderer.render(scene, camera);
    });

    // Cleanup: Stop animation loop, remove events, dispose all WebGL resources
    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', onResize);

      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);

      // End XR session if active
      if (xrSessionRef.current) {
        xrSessionRef.current.end().catch(() => {});
      }

      // Pause & release video
      video.pause();
      video.removeAttribute('src');
      video.load();

      // Dispose Three.js objects
      disposables.geometries.forEach((g) => g.dispose());
      disposables.materials.forEach((m) => m.dispose());
      disposables.textures.forEach((t) => t.dispose());

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [updateHoloTextures]);

  // Video source switching decoupled from scene rebuild
  useEffect(() => {
    if (videoElementRef.current && currentStream.videoUrl) {
      const v = videoElementRef.current;
      if (v.src !== currentStream.videoUrl) {
        v.src = currentStream.videoUrl;
        v.play().catch(() => {});
      }
    }
  }, [currentStream.videoUrl]);

  // WebXR immersive VR session request and connection
  const triggerWebXrSession = async () => {
    if (typeof window === 'undefined' || !(navigator as any).xr) {
      setXrNotice('No WebXR device detected. Orbit 3D mode is active — drag anywhere to look around!');
      setTimeout(() => setXrNotice(null), 4000);
      return;
    }

    try {
      const session = await (navigator as any).xr.requestSession('immersive-vr');
      xrSessionRef.current = session;

      // CRITICAL FINDING FIX: Connect the session to the Three.js renderer
      if (rendererRef.current) {
        await rendererRef.current.xr.setSession(session);
      }

      setXrActive(true);
      setXrNotice('WebXR VR Headset Session Connected!');
      setTimeout(() => setXrNotice(null), 3000);

      session.addEventListener('end', () => {
        setXrActive(false);
        xrSessionRef.current = null;
        setXrNotice('WebXR Headset Session Ended');
        setTimeout(() => setXrNotice(null), 3000);
      });
    } catch (err: any) {
      setXrNotice(`Could not initiate VR headset session (${err?.message || 'Unsupported'}). 3D Orbit mode is active!`);
      setTimeout(() => setXrNotice(null), 4500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none overflow-hidden font-mono">
      {/* Three.js Canvas Container (Pointer events scoped here) */}
      <div
        ref={containerRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing touch-none"
      />

      {/* Top Floating VR Navigation Header */}
      <div className="relative z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/40 to-transparent">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/20 border border-amber-400/80 px-3 py-1.5 rounded-lg flex items-center gap-2 text-amber-300 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-bold">SAFARIVISION VR LOUNGE</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-500/30 text-cyan-300 text-xs">
            <span>DRONE FEED:</span>
            <span className="text-white font-bold">{currentStream.name}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={triggerWebXrSession}
            className={`font-bold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              xrActive
                ? 'bg-purple-600 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <Headphones className="w-4 h-4" />
            <span>
              {xrActive
                ? 'VR HEADSET ACTIVE'
                : xrSupported
                ? 'LAUNCH VR HEADSET'
                : 'ENTER HEADSET MODE'}
            </span>
          </button>

          <button
            onClick={onExitVr}
            className="bg-red-600/80 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>EXIT VR</span>
          </button>
        </div>
      </div>

      {/* Dynamic Feedback Notification */}
      {xrNotice && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-slate-900/90 text-cyan-300 border border-cyan-500/50 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-2xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>{xrNotice}</span>
        </div>
      )}

      {/* Bottom Guidance Hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-black/80 backdrop-blur-md border border-cyan-500/30 text-gray-300 px-5 py-2 rounded-full text-xs flex items-center gap-2 shadow-2xl pointer-events-none">
        <Eye className="w-4 h-4 text-cyan-400 animate-pulse" />
        <span>Drag to orbit the 3D safari lounge • Live telemetry updates in-place</span>
      </div>
    </div>
  );
};
