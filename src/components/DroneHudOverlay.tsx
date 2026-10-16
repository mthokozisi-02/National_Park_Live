'use client';

import React from 'react';
import { DroneTelemetry, WildlifeDetection } from '@/types/safari';
import { formatCoordinate } from '@/utils/coordinates';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCrosshairs,
  faShieldHalved,
  faEye,
  faPaw,
  faLocationDot,
  faTowerBroadcast,
} from '@fortawesome/free-solid-svg-icons';

export interface VideoBounds {
  leftPercent: number;
  topPercent: number;
  widthPercent: number;
  heightPercent: number;
}

interface DroneHudOverlayProps {
  telemetry: DroneTelemetry;
  wildlifeDetections: WildlifeDetection[];
  showAiVision: boolean;
  showThermal: boolean;
  onSelectAnimal: (animal: WildlifeDetection) => void;
  videoBounds?: VideoBounds;
}

export const DroneHudOverlay: React.FC<DroneHudOverlayProps> = ({
  telemetry,
  wildlifeDetections,
  showAiVision,
  showThermal,
  onSelectAnimal,
  videoBounds,
}) => {
  // Compass heading tape ticks
  const compassTicks = [-40, -30, -20, -10, 0, 10, 20, 30, 40];
  const cardinalMap: Record<number, string> = {
    0: 'N',
    45: 'NE',
    90: 'E',
    135: 'SE',
    180: 'S',
    225: 'SW',
    270: 'W',
    315: 'NW',
    360: 'N',
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden bg-transparent">
      {/* Top Banner: Flight Mode, Drone ID & Heading Tape */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 text-slate-800 shadow-md">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold tracking-wider text-slate-900">{telemetry.droneId}</span>
          <span className="text-slate-300">|</span>
          <span className="text-emerald-700 font-semibold">{telemetry.flightMode}</span>
        </div>

        {/* Heading Compass Tape Center */}
        <div className="flex flex-col items-center bg-white/95 backdrop-blur-md px-4 py-1.5 rounded-lg border border-slate-200 shadow-md">
          <div className="flex items-center gap-1.5 text-slate-900 font-bold text-sm">
            <span className="text-[10px] text-slate-500">HDG</span>
            <span className="text-slate-900 text-base font-black">
              {Math.round(telemetry.heading).toString().padStart(3, '0')}°
            </span>
            <span className="text-emerald-700 font-bold">
              {cardinalMap[Math.round(telemetry.heading)] || ''}
            </span>
          </div>
          {/* Compass Ribbon */}
          <div className="flex items-center gap-3 overflow-hidden w-48 justify-center h-4 text-[10px] text-slate-600">
            {compassTicks.map((offset) => {
              const deg = (Math.round(telemetry.heading) + offset + 360) % 360;
              const isMajor = deg % 30 === 0;
              return (
                <div key={offset} className="flex flex-col items-center min-w-[20px]">
                  <span className={isMajor ? 'font-bold text-slate-900' : 'text-slate-400'}>
                    {cardinalMap[deg] || (isMajor ? deg : '|')}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[5px] border-b-emerald-600 mt-0.5" />
        </div>

        {/* RTK & Battery status pill */}
        <div className="flex items-center gap-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 text-slate-800 shadow-md">
          <div className="flex items-center gap-1.5">
            <FontAwesomeIcon icon={faShieldHalved} className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-emerald-700 font-bold">RTK {telemetry.rtkStatus}</span>
          </div>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600 font-medium">SATS: {telemetry.satelliteCount}</span>
        </div>
      </div>

      {/* Artificial Horizon Pitch Ladder & Center Reticle */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Dynamic Artificial Horizon / Roll indicator */}
        <div
          className="relative w-72 h-72 flex items-center justify-center transition-transform duration-100 ease-out"
          style={{
            transform: `rotate(${-telemetry.roll}deg) translateY(${telemetry.pitch * 3}px)`,
          }}
        >
          {/* Pitch Bars */}
          <div className="absolute w-44 flex items-center justify-between text-[10px] font-mono text-slate-700/80 font-bold">
            <div className="flex items-center gap-1">
              <span>+10</span>
              <div className="w-8 h-[2px] bg-slate-700/80" />
            </div>
            <div className="flex items-center gap-1">
              <div className="w-8 h-[2px] bg-slate-700/80" />
              <span>+10</span>
            </div>
          </div>

          {/* Center Zero Horizon Bar */}
          <div className="absolute w-56 flex items-center justify-between">
            <div className="w-16 h-[2px] bg-emerald-600 shadow-xs" />
            <div className="w-16 h-[2px] bg-emerald-600 shadow-xs" />
          </div>

          <div className="absolute w-44 flex items-center justify-between text-[10px] font-mono text-slate-700/80 font-bold transform translate-y-12">
            <div className="flex items-center gap-1">
              <span>-10</span>
              <div className="w-8 h-[2px] bg-slate-700/80" />
            </div>
            <div className="flex items-center gap-1">
              <div className="w-8 h-[2px] bg-slate-700/80" />
              <span>-10</span>
            </div>
          </div>
        </div>

        {/* Center Aim Crosshair & Gimbal Target Box */}
        <div className="absolute flex flex-col items-center">
          <div className="relative w-16 h-16 flex items-center justify-center">
            {/* Outer Reticle Corners */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-slate-700" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-slate-700" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-slate-700" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-slate-700" />

            <FontAwesomeIcon icon={faCrosshairs} className="w-6 h-6 text-slate-800 animate-pulse" />
          </div>
          <span className="text-[10px] font-mono text-slate-800 font-bold mt-1 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded border border-slate-200 shadow-xs">
            GIMBAL PITCH {telemetry.gimbalPitch.toFixed(1)}°
          </span>
        </div>
      </div>

      {/* Left Tape: Airspeed (km/h) */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center font-mono">
        <div className="bg-white/95 backdrop-blur-md px-3 py-4 rounded-xl border border-slate-200 shadow-md flex flex-col items-center">
          <span className="text-[10px] text-slate-500 font-bold mb-1">SPD km/h</span>
          <div className="text-xl font-black text-slate-900 tracking-wider">
            {telemetry.speed.toFixed(1)}
          </div>
          <div className="w-full h-24 flex flex-col justify-between py-2 text-[10px] text-slate-600 border-r border-slate-300 pr-2">
            <div>— {(telemetry.speed + 10).toFixed(0)}</div>
            <div className="font-bold text-emerald-700">▶ {(telemetry.speed).toFixed(0)}</div>
            <div>— {Math.max(0, telemetry.speed - 10).toFixed(0)}</div>
          </div>
          <span className="text-[9px] text-slate-500 mt-1">
            WIND {telemetry.windSpeedKmh.toFixed(0)}km/h {telemetry.windDirection}
          </span>
        </div>
      </div>

      {/* Right Tape: Altitude (Meters AGL) */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center font-mono">
        <div className="bg-white/95 backdrop-blur-md px-3 py-4 rounded-xl border border-slate-200 shadow-md flex flex-col items-center">
          <span className="text-[10px] text-slate-500 font-bold mb-1">ALT m AGL</span>
          <div className="text-xl font-black text-slate-900 tracking-wider">
            {telemetry.altitude.toFixed(1)}
          </div>
          <div className="w-full h-24 flex flex-col justify-between py-2 text-[10px] text-slate-600 border-l border-slate-300 pl-2">
            <div>{(telemetry.altitude + 15).toFixed(0)} —</div>
            <div className="font-bold text-emerald-700">{(telemetry.altitude).toFixed(0)} ◀</div>
            <div>{Math.max(0, telemetry.altitude - 15).toFixed(0)} —</div>
          </div>
          <span className="text-[9px] text-emerald-700 font-bold mt-1">
            HOLD {telemetry.targetAltitude.toFixed(0)}m
          </span>
        </div>
      </div>

      {/* Wildlife Vision Overlays (Bounding Boxes) aligned to actual video area */}
      {showAiVision && (
        <div
          style={{
            position: 'absolute',
            left: `${videoBounds?.leftPercent ?? 0}%`,
            top: `${videoBounds?.topPercent ?? 0}%`,
            width: `${videoBounds?.widthPercent ?? 100}%`,
            height: `${videoBounds?.heightPercent ?? 100}%`,
            pointerEvents: 'none',
          }}
        >
          {wildlifeDetections.map((detection) => {
            const rawLeft = detection.box.x <= 1 ? detection.box.x * 100 : detection.box.x;
            const rawTop = detection.box.y <= 1 ? detection.box.y * 100 : detection.box.y;
            const rawWidth = detection.box.width <= 1 ? detection.box.width * 100 : detection.box.width;
            const rawHeight = detection.box.height <= 1 ? detection.box.height * 100 : detection.box.height;

            const leftPct = Math.min(100, Math.max(0, rawLeft));
            const topPct = Math.min(100, Math.max(0, rawTop));
            const widthPct = Math.min(100 - leftPct, Math.max(0, rawWidth));
            const heightPct = Math.min(100 - topPct, Math.max(0, rawHeight));

            return (
              <div
                key={detection.id}
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                }}
                className="absolute border-2 border-emerald-500 bg-emerald-500/10 rounded-lg transition-all duration-300 pointer-events-auto cursor-pointer group hover:border-emerald-600 hover:bg-emerald-500/20 shadow-md"
                onClick={() => onSelectAnimal(detection)}
              >
                {/* Corner Brackets */}
                <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-emerald-600" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-emerald-600" />
                <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-emerald-600" />
                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-emerald-600" />

                {/* Floating Detection Tag */}
                <div className="absolute -top-8 left-0 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-300 text-xs font-mono whitespace-nowrap text-slate-900 group-hover:border-emerald-600 transition-colors shadow-lg">
                  <FontAwesomeIcon icon={faPaw} className="w-3 h-3 text-emerald-600" />
                  <span className="font-black tracking-wide">{detection.commonName.toUpperCase()}</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 py-0.5 rounded font-bold">
                    {(detection.confidence * 100).toFixed(0)}%
                  </span>
                  <span className="text-slate-500 text-[10px]">({detection.distanceFromDroneM}m)</span>
                </div>

                {/* Bottom quick inspect trigger */}
                <div className="absolute -bottom-5 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded font-mono flex items-center gap-1 shadow-xs">
                  <FontAwesomeIcon icon={faEye} className="w-2.5 h-2.5" />
                  INSPECT BIO
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Bar: GPS Coordinates, RTH distance, and Environmental Telemetry */}
      <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between text-xs font-mono text-slate-800">
        <div className="flex items-center gap-3 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-md">
          <span className="text-slate-500 font-semibold">GPS:</span>
          <span className="text-slate-900 font-bold">
            {formatCoordinate(telemetry.latitude, true)} {formatCoordinate(telemetry.longitude, false)}
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500 font-semibold">DIST HOME:</span>
          <span className="text-emerald-700 font-bold">{(telemetry.distanceFromHomeM / 1000).toFixed(2)} km</span>
        </div>

        <div className="flex items-center gap-3 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-md">
          <span className="text-slate-500 font-semibold">TEMP:</span>
          <span className="text-slate-900 font-bold">{telemetry.temperatureC}°C</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500 font-semibold">UPLINK:</span>
          <span className="text-emerald-700 font-bold">{telemetry.signalType}</span>
        </div>
      </div>
    </div>
  );
};
