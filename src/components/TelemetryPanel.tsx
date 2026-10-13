'use client';

import React from 'react';
import { DroneTelemetry } from '@/types/safari';
import {
  BatteryCharging,
  Gauge,
  Compass,
  Wind,
  Sun,
  Radio,
  Navigation,
  SlidersHorizontal,
  RotateCcw,
  Shield,
  Activity
} from 'lucide-react';

interface TelemetryPanelProps {
  telemetry: DroneTelemetry;
  setTelemetry: React.Dispatch<React.SetStateAction<DroneTelemetry>>;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  telemetry,
  setTelemetry,
}) => {
  // Simulator adjustment helpers for client interactive presentations
  const adjustAltitude = (delta: number) => {
    setTelemetry((prev) => ({
      ...prev,
      altitude: Math.max(20, Math.min(300, prev.altitude + delta)),
      targetAltitude: Math.max(20, Math.min(300, prev.altitude + delta)),
    }));
  };

  const adjustSpeed = (delta: number) => {
    setTelemetry((prev) => ({
      ...prev,
      speed: Math.max(0, Math.min(65, prev.speed + delta)),
    }));
  };

  const cycleFlightMode = () => {
    const modes: DroneTelemetry['flightMode'][] = [
      'AUTONOMOUS PATROL',
      'TARGET ORBIT',
      'RETURN TO HOME',
      'MANUAL OVERRIDE',
    ];
    setTelemetry((prev) => {
      const nextIndex = (modes.indexOf(prev.flightMode) + 1) % modes.length;
      return {
        ...prev,
        flightMode: modes[nextIndex],
      };
    });
  };

  return (
    <div className="flex flex-col gap-4 font-mono text-xs">
      {/* Flight Dynamics Primary Card */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-cyan-500/20 rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-sm tracking-wide text-gray-100">DRONE TELEMETRY</span>
          </div>
          <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded font-semibold">
            {telemetry.droneModel}
          </span>
        </div>

        {/* Telemetry Dials Grid */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          {/* Altitude */}
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[10px]">ALTITUDE (AGL)</span>
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-white">{telemetry.altitude.toFixed(1)}</span>
              <span className="text-[10px] text-cyan-400">meters</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-cyan-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (telemetry.altitude / 200) * 100)}%` }}
              />
            </div>
          </div>

          {/* Speed */}
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[10px]">AIRSPEED</span>
              <Navigation className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-white">{telemetry.speed.toFixed(1)}</span>
              <span className="text-[10px] text-emerald-400">km/h</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (telemetry.speed / 50) * 100)}%` }}
              />
            </div>
          </div>

          {/* Heading */}
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[10px]">HEADING</span>
              <Compass className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-white">{Math.round(telemetry.heading)}°</span>
              <span className="text-[10px] text-amber-400">BEARING</span>
            </div>
            <span className="text-[10px] text-gray-500 block mt-1">Roll {telemetry.roll.toFixed(1)}° | Pitch {telemetry.pitch.toFixed(1)}°</span>
          </div>

          {/* Battery */}
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[10px]">BATTERY PACK</span>
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-white">{telemetry.batteryPercentage}%</span>
              <span className="text-[10px] text-emerald-400">({telemetry.flightTimeRemainingMin}m)</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${telemetry.batteryPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Flight Mode Selector & RTH Safety Banner */}
        <div className="mt-3 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-[10px] text-gray-400">FLIGHT AUTOPILOT MODE</div>
              <div className="font-bold text-white">{telemetry.flightMode}</div>
            </div>
          </div>
          <button
            onClick={cycleFlightMode}
            className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-1 rounded text-[10px] flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            SWITCH MODE
          </button>
        </div>
      </div>

      {/* Savanna Microclimate & Link Health Card */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-cyan-500/20 rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-sm tracking-wide text-gray-100">SAVANNA ENVIRONMENT</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold">HWANGE SECTOR 4</span>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="flex items-center gap-2.5 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
            <Sun className="w-4 h-4 text-amber-400" />
            <div>
              <span className="text-[10px] text-gray-400 block">TEMPERATURE</span>
              <span className="font-bold text-white">{telemetry.temperatureC}°C Dry Savanna</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
            <Wind className="w-4 h-4 text-cyan-400" />
            <div>
              <span className="text-[10px] text-gray-400 block">WIND VECTOR</span>
              <span className="font-bold text-white">{telemetry.windSpeedKmh} km/h {telemetry.windDirection}</span>
            </div>
          </div>
        </div>

        {/* Link Quality Bar */}
        <div className="mt-3 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
            <span>UPLINK SIGNAL ({telemetry.signalType})</span>
            <span className="text-emerald-400 font-bold">{telemetry.signalStrength}% (EXCELLENT)</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full"
              style={{ width: `${telemetry.signalStrength}%` }}
            />
          </div>
        </div>
      </div>

      {/* Client Demo Interactive Sandbox Controls */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
        <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-bold mb-2">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>PROTOTYPE SIMULATION CONTROLS</span>
        </div>
        <p className="text-[10px] text-gray-400 mb-2">
          Use these controls during your client pitch to demonstrate live telemetry reactions in the HUD and 3D VR environment.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => adjustAltitude(10)}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-gray-200 py-1 rounded text-[10px] border border-slate-700"
          >
            +10m Alt
          </button>
          <button
            onClick={() => adjustAltitude(-10)}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-gray-200 py-1 rounded text-[10px] border border-slate-700"
          >
            -10m Alt
          </button>
          <button
            onClick={() => adjustSpeed(5)}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-gray-200 py-1 rounded text-[10px] border border-slate-700"
          >
            +5 km/h
          </button>
          <button
            onClick={() => adjustSpeed(-5)}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-gray-200 py-1 rounded text-[10px] border border-slate-700"
          >
            -5 km/h
          </button>
        </div>
      </div>
    </div>
  );
};
