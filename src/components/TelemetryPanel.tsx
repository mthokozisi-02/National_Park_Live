'use client';

import React from 'react';
import { DroneTelemetry, SimulationMode } from '@/types/safari';
import { clampAltitude, clampSpeed } from '@/utils/telemetry';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGauge,
  faCompass,
  faBatteryFull,
  faWind,
  faSun,
  faTowerBroadcast,
  faLocationArrow,
  faSliders,
  faRotateLeft,
  faShieldHalved,
  faHeartPulse,
  faPlay,
  faPause,
} from '@fortawesome/free-solid-svg-icons';

interface TelemetryPanelProps {
  telemetry: DroneTelemetry;
  setTelemetry: React.Dispatch<React.SetStateAction<DroneTelemetry>>;
  simulationMode: SimulationMode;
  setSimulationMode: (mode: SimulationMode) => void;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  telemetry,
  setTelemetry,
  simulationMode,
  setSimulationMode,
}) => {
  const adjustAltitude = (delta: number) => {
    setTelemetry((prev) => {
      const newAlt = clampAltitude(prev.targetAltitude, delta);
      return {
        ...prev,
        targetAltitude: newAlt,
        altitude: newAlt,
      };
    });
  };

  const adjustSpeed = (delta: number) => {
    setTelemetry((prev) => ({
      ...prev,
      speed: clampSpeed(prev.speed, delta),
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
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faHeartPulse} className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-sm tracking-wide text-slate-900">DRONE TELEMETRY</span>
          </div>
          <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-semibold">
            {telemetry.droneModel}
          </span>
        </div>

        {/* Telemetry Dials Grid */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          {/* Altitude */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-medium">ALTITUDE (AGL)</span>
              <FontAwesomeIcon icon={faGauge} className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900">{telemetry.altitude.toFixed(1)}</span>
              <span className="text-[10px] text-slate-500 font-medium">meters</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (telemetry.altitude / 200) * 100)}%` }}
              />
            </div>
          </div>

          {/* Speed */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-medium">AIRSPEED</span>
              <FontAwesomeIcon icon={faLocationArrow} className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900">{telemetry.speed.toFixed(1)}</span>
              <span className="text-[10px] text-slate-500 font-medium">km/h</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (telemetry.speed / 50) * 100)}%` }}
              />
            </div>
          </div>

          {/* Heading */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-medium">HEADING</span>
              <FontAwesomeIcon icon={faCompass} className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900">{Math.round(telemetry.heading)}°</span>
              <span className="text-[10px] text-slate-500 font-medium">BEARING</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">
              Roll {telemetry.roll.toFixed(1)}° | Pitch {telemetry.pitch.toFixed(1)}°
            </span>
          </div>

          {/* Battery */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-medium">BATTERY PACK</span>
              <FontAwesomeIcon icon={faBatteryFull} className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900">{telemetry.batteryPercentage}%</span>
              <span className="text-[10px] text-slate-500 font-medium">({telemetry.flightTimeRemainingMin}m)</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${telemetry.batteryPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Flight Mode Selector & RTH Safety Banner */}
        <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faShieldHalved} className="w-4 h-4 text-blue-600" />
            <div>
              <div className="text-[10px] text-slate-500 font-medium">AUTOPILOT FLIGHT MODE</div>
              <div className="font-bold text-slate-900">{telemetry.flightMode}</div>
            </div>
          </div>
          <button
            onClick={cycleFlightMode}
            className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <FontAwesomeIcon icon={faRotateLeft} className="w-3 h-3 text-slate-500" />
            SWITCH MODE
          </button>
        </div>
      </div>

      {/* Savanna Microclimate & Link Health Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faTowerBroadcast} className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-sm tracking-wide text-slate-900">SAVANNA ENVIRONMENT</span>
          </div>
          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
            HWANGE SECTOR 4
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <FontAwesomeIcon icon={faSun} className="w-4 h-4 text-amber-500" />
            <div>
              <span className="text-[10px] text-slate-500 block font-medium">TEMPERATURE</span>
              <span className="font-bold text-slate-900">{telemetry.temperatureC}°C Dry Savanna</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <FontAwesomeIcon icon={faWind} className="w-4 h-4 text-blue-500" />
            <div>
              <span className="text-[10px] text-slate-500 block font-medium">WIND VECTOR</span>
              <span className="font-bold text-slate-900">{telemetry.windSpeedKmh} km/h {telemetry.windDirection}</span>
            </div>
          </div>
        </div>

        {/* Link Quality Bar */}
        <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between text-[10px] text-slate-600 mb-1">
            <span className="font-medium">UPLINK SIGNAL ({telemetry.signalType})</span>
            <span className="text-emerald-700 font-bold">{telemetry.signalStrength}% (EXCELLENT)</span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full"
              style={{ width: `${telemetry.signalStrength}%` }}
            />
          </div>
        </div>
      </div>

      {/* Interactive Sandbox Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-slate-800 text-[11px] font-bold">
            <FontAwesomeIcon icon={faSliders} className="w-3.5 h-3.5 text-slate-600" />
            <span>FLIGHT SIMULATION CONTROLS</span>
          </div>
          {/* Simulation Mode Toggle */}
          <button
            onClick={() =>
              setSimulationMode(simulationMode === 'automatic' ? 'manual' : 'automatic')
            }
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
              simulationMode === 'automatic'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}
          >
            <FontAwesomeIcon
              icon={simulationMode === 'automatic' ? faPlay : faPause}
              className="w-2.5 h-2.5"
            />
            <span>{simulationMode === 'automatic' ? 'AUTO PATROL' : 'MANUAL HOLD'}</span>
          </button>
        </div>

        <p className="text-[10px] text-slate-500 mb-2 font-sans">
          {simulationMode === 'automatic'
            ? 'Autopilot is orbiting simulated coordinates. Adjusting below overrides baseline.'
            : 'Manual hold active: values remain locked to your manual adjustments.'}
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => adjustAltitude(10)}
            className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 py-1.5 rounded text-[10px] border border-slate-300 font-semibold cursor-pointer shadow-2xs"
          >
            +10m Alt
          </button>
          <button
            onClick={() => adjustAltitude(-10)}
            className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 py-1.5 rounded text-[10px] border border-slate-300 font-semibold cursor-pointer shadow-2xs"
          >
            -10m Alt
          </button>
          <button
            onClick={() => adjustSpeed(5)}
            className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 py-1.5 rounded text-[10px] border border-slate-300 font-semibold cursor-pointer shadow-2xs"
          >
            +5 km/h
          </button>
          <button
            onClick={() => adjustSpeed(-5)}
            className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 py-1.5 rounded text-[10px] border border-slate-300 font-semibold cursor-pointer shadow-2xs"
          >
            -5 km/h
          </button>
        </div>
      </div>
    </div>
  );
};
