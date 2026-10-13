'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  Info
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
  const [vrMode, setVrMode] = useState<'lounge' | 'dome'>('lounge');
  const [xrSupported, setXrSupported] = useState<boolean>(false);
  const [xrActive, setXrActive] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'xr' in navigator) {
      (navigator as any).xr?.isSessionSupported?.('immersive-vr').then((supported: boolean) => {
        setXrSupported(supported);
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Setup Three.js Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x1a1208, 0.012);

    const camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.6, 0); // Average standing human eye height in meters

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // 2. Lighting (Savanna Sunset / Dusk Atmosphere)
    const ambientLight = new THREE.AmbientLight(0xffecd2, 0.7);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xf59e0b, 1.8);
    sunLight.position.set(50, 25, -60);
    scene.add(sunLight);

    // 3. Savanna Sky Dome
    const skyGeo = new THREE.SphereGeometry(400, 32, 15);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x140e06,
      side: THREE.BackSide,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // 4. Savanna Observation Deck Platform
    const deckGeo = new THREE.CylinderGeometry(8, 8.5, 0.4, 32);
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0x1f1912,
      roughness: 0.8,
      metalness: 0.1,
    });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.y = -0.2;
    scene.add(deck);

    // Deck Railing Posts
    const railingGeo = new THREE.TorusGeometry(7.8, 0.05, 12, 48);
    const railingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const railing = new THREE.Mesh(railingGeo, railingMat);
    railing.rotation.x = Math.PI / 2;
    railing.position.y = 1.0;
    scene.add(railing);

    // 5. Procedural Acacia Trees around the perimeter
    const treeGroup = new THREE.Group();
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const dist = 35 + (i % 4) * 8;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      // Trunk
      const trunkGeo = new THREE.CylinderGeometry(0.3, 0.6, 6, 8);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x27190d });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(x, 3, z);
      treeGroup.add(trunk);

      // Flat Umbrella Acacia Canopy
      const canopyGeo = new THREE.CylinderGeometry(4.5, 1.2, 0.8, 12);
      const canopyMat = new THREE.MeshStandardMaterial({ color: 0x1e2712 });
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.set(x, 6.2, z);
      treeGroup.add(canopy);
    }
    scene.add(treeGroup);

    // 6. Giant Curved Cinema Screen displaying live video stream texture
    const video = document.createElement('video');
    video.src = currentStream.videoUrl;
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.play().catch(() => {});

    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;

    // Curved display screen geometry
    const screenGeo = new THREE.CylinderGeometry(12, 12, 6.75, 48, 1, true, -Math.PI / 4, Math.PI / 2);
    const screenMat = new THREE.MeshBasicMaterial({
      map: videoTexture,
      side: THREE.DoubleSide,
    });
    const curvedScreen = new THREE.Mesh(screenGeo, screenMat);
    curvedScreen.position.set(0, 3.2, 0);
    curvedScreen.rotation.y = Math.PI; // Face towards camera
    scene.add(curvedScreen);

    // 7. Floating 3D Holographic Telemetry Panels
    const createHoloPanel = (text: string, x: number, y: number, z: number, rotY: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(7, 18, 28, 0.85)';
        ctx.fillRect(0, 0, 512, 256);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 6;
        ctx.strokeRect(6, 6, 500, 244);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 34px monospace';
        ctx.fillText(text, 24, 60);

        ctx.fillStyle = '#f3f4f6';
        ctx.font = '24px monospace';
        ctx.fillText(`ALT: ${telemetry.altitude.toFixed(0)}m AGL`, 24, 110);
        ctx.fillText(`SPD: ${telemetry.speed.toFixed(0)} km/h`, 24, 150);
        ctx.fillText(`BAT: ${telemetry.batteryPercentage}%`, 24, 190);
        ctx.fillText(`GPS: RTK FIXED`, 24, 230);
      }

      const tex = new THREE.CanvasTexture(canvas);
      const panelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9 });
      const panelGeo = new THREE.PlaneGeometry(3.5, 1.75);
      const mesh = new THREE.Mesh(panelGeo, panelMat);
      mesh.position.set(x, y, z);
      mesh.rotation.y = rotY;
      return mesh;
    };

    const leftHolo = createHoloPanel(`DRONE TELEMETRY`, -6.2, 3.2, -6.8, Math.PI / 4);
    const rightHolo = createHoloPanel(`HWANGE LIVE VR`, 6.2, 3.2, -6.8, -Math.PI / 4);
    scene.add(leftHolo);
    scene.add(rightHolo);

    // 8. Interactive Mouse Orbit / Look Controls
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let lon = 0;
    let lat = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      lon += deltaX * 0.15;
      lat -= deltaY * 0.15;
      lat = Math.max(-85, Math.min(85, lat));
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    // Touch support for tablets & smartphones
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        isDragging = true;
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length === 0) return;
      const deltaX = e.touches[0].clientX - prevMouseX;
      const deltaY = e.touches[0].clientY - prevMouseY;
      prevMouseX = e.touches[0].clientX;
      prevMouseY = e.touches[0].clientY;

      lon += deltaX * 0.2;
      lat -= deltaY * 0.2;
      lat = Math.max(-85, Math.min(85, lat));
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onMouseUp);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Compute camera target from spherical angles
      const phi = THREE.MathUtils.degToRad(90 - lat);
      const theta = THREE.MathUtils.degToRad(lon - 90);

      const targetX = 500 * Math.sin(phi) * Math.cos(theta);
      const targetY = 500 * Math.cos(phi);
      const targetZ = 500 * Math.sin(phi) * Math.sin(theta);

      camera.lookAt(targetX, targetY, targetZ);

      // Subtle float oscillation for futuristic holographic panels
      const t = Date.now() * 0.0015;
      leftHolo.position.y = 3.2 + Math.sin(t) * 0.08;
      rightHolo.position.y = 3.2 + Math.cos(t) * 0.08;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onMouseUp);

      video.pause();
      video.src = '';
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [currentStream.videoUrl, telemetry]);

  const triggerWebXrSession = async () => {
    if (typeof window !== 'undefined' && (navigator as any).xr) {
      try {
        const session = await (navigator as any).xr.requestSession('immersive-vr');
        setXrActive(true);
        session.addEventListener('end', () => setXrActive(false));
      } catch (err) {
        alert('WebXR immersive session could not be started directly. You can look around freely with your mouse/touch gestures!');
      }
    } else {
      alert('No WebXR headset detected on this browser. You are currently in Interactive 3D Orbit Mode — drag anywhere to look around!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none overflow-hidden font-mono">
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Top Floating VR Navigation Header */}
      <div className="relative z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
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
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Headphones className="w-4 h-4" />
            <span>{xrSupported ? 'LAUNCH VR HEADSET' : 'ENTER HEADSET MODE'}</span>
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

      {/* Bottom Hint Banner */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-black/75 backdrop-blur-md border border-cyan-500/30 text-gray-300 px-5 py-2 rounded-full text-xs flex items-center gap-2 shadow-2xl pointer-events-none">
        <Eye className="w-4 h-4 text-cyan-400 animate-pulse" />
        <span>Click and drag anywhere to look around the virtual 3D observation lounge</span>
      </div>
    </div>
  );
};
