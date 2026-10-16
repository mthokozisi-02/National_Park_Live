'use client';

import React, { useState, useEffect } from 'react';
import { WildlifeSighting } from '@/types/sightings';
import {
  DestinationRecommendation,
  DriverPriorityMode,
} from '@/types/decisionSupport';
import {
  decisionSupportService,
  HWANGE_BASE_COORDS,
  calculateHaversineDistanceKm,
} from '@/services/decisionSupportService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRoute,
  faLocationCrosshairs,
  faRoad,
  faClock,
  faCarSide,
  faShieldHalved,
  faBolt,
  faScaleBalanced,
  faCrosshairs,
  faUsers,
  faLocationDot,
  faCircleCheck,
  faPaw,
  faRotateLeft,
  faTrophy,
  faBullseye,
  faLightbulb,
  faBinoculars,
  faMapLocationDot,
} from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

interface SafariDecisionSupportProps {
  sightings: WildlifeSighting[];
  driverLocation: { lat: number; lng: number } | null;
  onNavigateToSighting: (sighting: WildlifeSighting) => void;
  activeDestinationId?: string | null;
  onResetToDefaultSightings?: () => void;
}

const PRIORITY_MODES: {
  id: DriverPriorityMode;
  label: string;
  icon: IconDefinition;
  desc: string;
}[] = [
  {
    id: 'balanced',
    label: 'Balanced',
    icon: faScaleBalanced,
    desc: 'Optimal balance of freshness, rarity & distance',
  },
  {
    id: 'predators',
    label: 'Predator Tracker',
    icon: faCrosshairs,
    desc: 'Prioritizes lions, leopards & apex carnivores',
  },
  {
    id: 'nearest',
    label: 'Nearest Action',
    icon: faBolt,
    desc: 'Closest sightings with minimal driving time',
  },
  {
    id: 'mega_herds',
    label: 'Mega-Herds',
    icon: faUsers,
    desc: 'Largest animal congregations & herds',
  },
];

export const SafariDecisionSupport: React.FC<SafariDecisionSupportProps> = ({
  sightings,
  driverLocation,
  onNavigateToSighting,
  activeDestinationId,
  onResetToDefaultSightings,
}) => {
  const [priorityMode, setPriorityMode] = useState<DriverPriorityMode>('balanced');
  const [recommendations, setRecommendations] = useState<DestinationRecommendation[]>([]);
  const [useParkBase, setUseParkBase] = useState<boolean>(false);

  // Check if driver GPS is actually located within the Hwange National Park boundaries (< 80km)
  const isDriverInPark = driverLocation
    ? calculateHaversineDistanceKm(
        driverLocation.lat,
        driverLocation.lng,
        HWANGE_BASE_COORDS.lat,
        HWANGE_BASE_COORDS.lng
      ) <= 80.0
    : false;

  const effectiveLocation =
    isDriverInPark && !useParkBase && driverLocation
      ? driverLocation
      : { lat: HWANGE_BASE_COORDS.lat, lng: HWANGE_BASE_COORDS.lng };

  useEffect(() => {
    const ranked = decisionSupportService.rankDestinations(
      sightings,
      effectiveLocation,
      {
        mode: priorityMode,
        maxDistanceKm: 120.0,
        includeHistorical: true,
        averageSpeedKmh: 35.0,
      }
    );
    setRecommendations(ranked);
  }, [sightings, priorityMode, effectiveLocation.lat, effectiveLocation.lng]);

  const getSpeciesIcon = (commonName: string): IconDefinition => {
    const n = commonName.toLowerCase();
    if (n.includes('lion') || n.includes('leopard') || n.includes('cheetah')) return faCrosshairs;
    if (n.includes('elephant') || n.includes('buffalo')) return faUsers;
    if (n.includes('giraffe') || n.includes('bird')) return faBinoculars;
    return faPaw;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col gap-3 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
            <FontAwesomeIcon icon={faRoute} className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-wide text-slate-900 flex items-center gap-1.5">
              <span>SAFARI DECISION SUPPORT</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
                PHASE 3
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 font-sans">
              Real-time dispatch optimization, road routing calculations, and multi-criteria sighting ranking.
            </p>
          </div>
        </div>

        {/* Dispatch Origin Indicator */}
        <div className="flex items-center gap-2 text-[10px] bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 shadow-2xs">
          <FontAwesomeIcon icon={faCarSide} className="w-3.5 h-3.5 text-blue-600" />
          <span>
            Dispatching from:{' '}
            <strong className="text-slate-900">
              {useParkBase || !driverLocation
                ? 'Hwange Main Camp'
                : isDriverInPark
                ? 'Live GPS Vehicle'
                : 'Hwange Main Camp (Remote GPS)'}
            </strong>
          </span>
          {driverLocation && isDriverInPark && (
            <button
              onClick={() => setUseParkBase(!useParkBase)}
              className="text-emerald-700 underline hover:text-emerald-800 ml-1 cursor-pointer font-semibold"
            >
              {useParkBase ? 'Use GPS' : 'Use Park Gate'}
            </button>
          )}
        </div>
      </div>

      {/* Priority Mode Switcher */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] text-slate-600 uppercase tracking-wider font-bold flex items-center gap-1.5">
          <FontAwesomeIcon icon={faLocationCrosshairs} className="w-3 h-3 text-slate-500" />
          <span>DRIVER STRATEGY / PRIORITY:</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRIORITY_MODES.map((mode) => {
            const active = priorityMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setPriorityMode(mode.id)}
                className={`flex flex-col items-start p-2.5 rounded-lg text-left transition-all cursor-pointer border ${
                  active
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs ring-1 ring-emerald-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <FontAwesomeIcon icon={mode.icon} className={active ? 'text-emerald-700' : 'text-slate-500'} />
                  <span>{mode.label}</span>
                </div>
                <span className="text-[9px] text-slate-500 font-sans mt-0.5 leading-tight">
                  {mode.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recommendations List */}
      <div className="flex flex-col gap-2.5 pt-1 max-h-[380px] overflow-y-auto pr-1">
        {recommendations.length === 0 ? (
          <div className="text-center py-6 px-4 text-xs text-slate-600 font-sans bg-slate-50 rounded-lg border border-slate-200 flex flex-col items-center gap-2">
            <span className="italic">No active wildlife sightings match the current criteria.</span>
            {onResetToDefaultSightings && (
              <button
                onClick={onResetToDefaultSightings}
                className="mt-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-mono text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <FontAwesomeIcon icon={faRotateLeft} className="w-3 h-3 text-emerald-600" />
                <span>LOAD HWANGE SIGHTINGS CATALOG</span>
              </button>
            )}
          </div>
        ) : (
          recommendations.map((rec) => {
            const isSelected = activeDestinationId === rec.sighting.id;
            const speciesIcon = getSpeciesIcon(rec.sighting.common_name);

            return (
              <div
                key={rec.sighting.id}
                className={`flex flex-col gap-2 p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-emerald-50/60 border-emerald-500 shadow-xs ring-1 ring-emerald-500/30'
                    : 'bg-slate-50 hover:bg-slate-100/70 border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Header: Rank + Species + Score */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-md flex items-center justify-center font-black text-xs ${
                        rec.rank === 1
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : rec.rank === 2
                          ? 'bg-slate-700 text-white'
                          : rec.rank === 3
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-300 text-slate-800'
                      }`}
                    >
                      {rec.rank === 1 ? (
                        <FontAwesomeIcon icon={faTrophy} className="w-3 h-3 text-white" />
                      ) : (
                        `#${rec.rank}`
                      )}
                    </span>
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <FontAwesomeIcon icon={speciesIcon} className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{rec.sighting.common_name}</span>
                      <span className="text-xs text-slate-500 font-normal">
                        ({rec.sighting.count} {rec.sighting.count > 1 ? 'animals' : 'animal'})
                      </span>
                    </span>
                  </div>

                  {/* Multi-Criteria Match Score Badge */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 font-sans">Match Score:</span>
                    <span className="font-black text-xs text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded flex items-center gap-1">
                      <FontAwesomeIcon icon={faBullseye} className="w-2.5 h-2.5 text-emerald-700" />
                      <span>{rec.score}%</span>
                    </span>
                  </div>
                </div>

                {/* Metrics Pill Bar: Distance, Drive Time, Freshness */}
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-700">
                  <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs font-semibold">
                    <FontAwesomeIcon icon={faRoad} className="w-3 h-3 text-blue-600" />
                    <span>{rec.roadDistanceKm} km road</span>
                  </span>

                  <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs font-semibold">
                    <FontAwesomeIcon icon={faClock} className="w-3 h-3 text-amber-600" />
                    <span>~{rec.driveTimeMinutes} mins drive</span>
                  </span>

                  <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{rec.keyFactors.freshnessLabel}</span>
                  </span>
                </div>

                {/* Explainable Reasoning Block */}
                <div className="text-[11px] font-sans text-slate-700 bg-white border border-slate-200 rounded-lg p-2.5 leading-snug">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold mb-0.5 text-[10px] uppercase tracking-wide">
                    <FontAwesomeIcon icon={faLightbulb} className="w-3 h-3 text-emerald-600" />
                    <span>Driver Recommendation Rationale:</span>
                  </div>
                  <p className="text-slate-600">{rec.reasoning}</p>
                </div>

                {/* Action Dispatch Button */}
                <div className="flex items-center justify-between pt-1">
                  <div className="text-[9px] text-slate-500 font-mono flex items-center gap-1">
                    <FontAwesomeIcon icon={faLocationDot} className="w-2.5 h-2.5 text-slate-400" />
                    <span>Coords: {rec.sighting.latitude.toFixed(4)}°, {rec.sighting.longitude.toFixed(4)}°</span>
                  </div>

                  <button
                    onClick={() => onNavigateToSighting(rec.sighting)}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs ${
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <FontAwesomeIcon icon={faCircleCheck} className="w-3.5 h-3.5" />
                        <span>ACTIVE ROUTE TARGET</span>
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faRoute} className="w-3.5 h-3.5" />
                        <span>NAVIGATE & ROUTE ON MAP</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
