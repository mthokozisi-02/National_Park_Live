'use client';

import React from 'react';
import { DroneTelemetry, WildlifeDetection } from '@/types/safari';
import { Crosshair, ShieldCheck, Eye, Sparkles } from 'lucide-react';
import { formatCoordinate } from '@/utils/coordinates';

interface DroneHudOverlayProps {
  telemetry: DroneTelemetry;
  wildlifeDetections: WildlifeDetection[];
  showAiVision: boolean;
  showThermal: boolean;
  onSelectAnimal: (animal: WildlifeDetection) => void;
}

export const DroneHudOverlay: React.FC<DroneHudOverlayProps> = ({
  telemetry,
  wildlifeDetections,
  showAiVision,
  showThermal,
  onSelectAnimal,
}) => {


  // Generate compass heading tape ticks
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
    <div
      className={`absolute inset-0 pointer-events-none select-none overflow-hidden transition-colors duration-500 ${
        showThermal
          ? 'bg-emerald-950/20 mix-blend-color-dodge'
          : 'bg-transparent'
      }`}
    >
      {/* Thermal Night Vision Grid & Scanline Effect */}
      {showThermal && (
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,255,140,0.06)_50%)] bg-[length:100%_4px] pointer-events-none" />
      )}

      {/* Top Banner: Flight Mode, Drone ID & Signal Pill */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded border border-cyan-500/30 text-cyan-300">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-semibold tracking-wider">{telemetry.droneId}</span>
          <span className="text-gray-500">|</span>
          <span className="text-emerald-400">{telemetry.flightMode}</span>
        </div>

        {/* Heading Compass Tape Center */}
        <div className="flex flex-col items-center bg-black/70 backdrop-blur-md px-4 py-1 rounded border border-cyan-500/30">
          <div className="flex items-center gap-1 text-cyan-400 font-bold text-sm">
            <span>HDG</span>
            <span className="text-white text-base">
              {Math.round(telemetry.heading).toString().padStart(3, '0')}°
            </span>
            <span className="text-amber-400">
              {cardinalMap[Math.round(telemetry.heading)] || ''}
            </span>
          </div>
          {/* Compass Ribbon */}
          <div className="flex items-center gap-3 overflow-hidden w-48 justify-center h-4 text-[10px] text-cyan-300/80">
            {compassTicks.map((offset) => {
              const deg = (Math.round(telemetry.heading) + offset + 360) % 360;
              const isMajor = deg % 30 === 0;
              return (
                <div key={offset} className="flex flex-col items-center min-w-[20px]">
                  <span className={isMajor ? 'font-bold text-cyan-200' : 'text-cyan-500/60'}>
                    {cardinalMap[deg] || (isMajor ? deg : '|')}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[5px] border-b-amber-400 mt-0.5" />
        </div>

        {/* RTK & Battery status pill */}
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded border border-cyan-500/30 text-cyan-300">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400 font-bold">RTK {telemetry.rtkStatus} (SIM)</span>
          </div>
          <span className="text-gray-500">|</span>
          <span>SATS: {telemetry.satelliteCount}</span>
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
          <div className="absolute w-44 flex items-center justify-between text-[10px] font-mono text-cyan-400/80">
            <div className="flex items-center gap-1">
              <span>+10</span>
              <div className="w-8 h-[2px] bg-cyan-400/80" />
            </div>
            <div className="flex items-center gap-1">
              <div className="w-8 h-[2px] bg-cyan-400/80" />
              <span>+10</span>
            </div>
          </div>

          {/* Center Zero Horizon Bar */}
          <div className="absolute w-56 flex items-center justify-between">
            <div className="w-16 h-[2px] bg-emerald-400/90 shadow-[0_0_8px_#34d399]" />
            <div className="w-16 h-[2px] bg-emerald-400/90 shadow-[0_0_8px_#34d399]" />
          </div>

          <div className="absolute w-44 flex items-center justify-between text-[10px] font-mono text-cyan-400/80 transform translate-y-12">
            <div className="flex items-center gap-1">
              <span>-10</span>
              <div className="w-8 h-[2px] bg-cyan-400/80" />
            </div>
            <div className="flex items-center gap-1">
              <div className="w-8 h-[2px] bg-cyan-400/80" />
              <span>-10</span>
            </div>
          </div>
        </div>

        {/* Center Aim Crosshair & Gimbal Target Box */}
        <div className="absolute flex flex-col items-center">
          <div className="relative w-16 h-16 flex items-center justify-center">
            {/* Outer Reticle Corners */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />

            <Crosshair className="w-6 h-6 text-cyan-400/80 animate-pulse" />
          </div>
          <span className="text-[10px] font-mono text-cyan-300/80 mt-1 bg-black/60 px-1 rounded">
            GIMBAL PITCH {telemetry.gimbalPitch.toFixed(1)}°
          </span>
        </div>
      </div>

      {/* Left Tape: Airspeed (km/h) */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center font-mono">
        <div className="bg-black/70 backdrop-blur-md px-3 py-4 rounded border border-cyan-500/30 flex flex-col items-center">
          <span className="text-[10px] text-cyan-400 font-bold mb-1">SPD km/h</span>
          <div className="text-xl font-bold text-white tracking-wider">
            {telemetry.speed.toFixed(1)}
          </div>
          <div className="w-full h-24 flex flex-col justify-between py-2 text-[10px] text-cyan-400/70 border-r border-cyan-500/40 pr-2">
            <div>— {(telemetry.speed + 10).toFixed(0)}</div>
            <div className="font-bold text-cyan-200">▶ {(telemetry.speed).toFixed(0)}</div>
            <div>— {Math.max(0, telemetry.speed - 10).toFixed(0)}</div>
          </div>
          <span className="text-[9px] text-gray-400 mt-1">WIND {telemetry.windSpeedKmh.toFixed(0)}km/h {telemetry.windDirection}</span>
        </div>
      </div>

      {/* Right Tape: Altitude (Meters AGL) */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center font-mono">
        <div className="bg-black/70 backdrop-blur-md px-3 py-4 rounded border border-cyan-500/30 flex flex-col items-center">
          <span className="text-[10px] text-cyan-400 font-bold mb-1">ALT m AGL</span>
          <div className="text-xl font-bold text-white tracking-wider">
            {telemetry.altitude.toFixed(1)}
          </div>
          <div className="w-full h-24 flex flex-col justify-between py-2 text-[10px] text-cyan-400/70 border-l border-cyan-500/40 pl-2">
            <div>{(telemetry.altitude + 15).toFixed(0)} —</div>
            <div className="font-bold text-cyan-200">{(telemetry.altitude).toFixed(0)} ◀</div>
            <div>{Math.max(0, telemetry.altitude - 15).toFixed(0)} —</div>
          </div>
          <span className="text-[9px] text-emerald-400 mt-1">HOLD {telemetry.targetAltitude.toFixed(0)}m</span>
        </div>
      </div>

      {/* AI Wildlife Vision Overlays (Bounding Boxes) */}
      {showAiVision &&
        wildlifeDetections.map((detection) => (
          <div
            key={detection.id}
            style={{
              left: `${detection.box.x}%`,
              top: `${detection.box.y}%`,
              width: `${detection.box.width}%`,
              height: `${detection.box.height}%`,
            }}
            className="absolute border border-amber-400/80 bg-amber-500/10 rounded transition-all duration-300 pointer-events-auto cursor-pointer group hover:border-emerald-400 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
            onClick={() => onSelectAnimal(detection)}
          >
            {/* Corner Brackets */}
            <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-amber-400 group-hover:border-emerald-400" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-amber-400 group-hover:border-emerald-400" />
            <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-amber-400 group-hover:border-emerald-400" />
            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-amber-400 group-hover:border-emerald-400" />

            {/* Floating Detection Tag */}
            <div className="absolute -top-7 left-0 flex items-center gap-1.5 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded border border-amber-400/80 text-[11px] font-mono whitespace-nowrap text-amber-300 group-hover:border-emerald-400 group-hover:text-emerald-300 transition-colors">
              <Sparkles className="w-3 h-3 animate-spin text-amber-400 group-hover:text-emerald-400" />
              <span className="font-bold">{detection.commonName.toUpperCase()}</span>
              <span className="text-[10px] bg-amber-500/20 px-1 py-0.2 rounded font-semibold">
                {(detection.confidence * 100).toFixed(0)}%
              </span>
              <span className="text-gray-400 text-[10px]">({detection.distanceFromDroneM}m)</span>
            </div>

            {/* Bottom quick inspect trigger */}
            <div className="absolute -bottom-5 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
              <Eye className="w-2.5 h-2.5" />
              INSPECT BIO
            </div>
          </div>
        ))}

      {/* Bottom Bar: GPS Coordinates, RTH distance, and Environmental Telemetry */}
      <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between text-xs font-mono text-cyan-300">
        <div className="flex items-center gap-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded border border-cyan-500/30">
          <span className="text-gray-400">GPS:</span>
          <span className="text-white font-bold">
            {formatCoordinate(telemetry.latitude, true)} {formatCoordinate(telemetry.longitude, false)}
          </span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-400">DIST HOME:</span>
          <span className="text-amber-400 font-bold">{(telemetry.distanceFromHomeM / 1000).toFixed(2)} km</span>
        </div>

        <div className="flex items-center gap-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded border border-cyan-500/30">
          <span className="text-gray-400">TEMP:</span>
          <span className="text-amber-300 font-bold">{telemetry.temperatureC}°C</span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-400">UPLINK:</span>
          <span className="text-emerald-400 font-bold">{telemetry.signalType}</span>
        </div>
      </div>
    </div>
  );
};
