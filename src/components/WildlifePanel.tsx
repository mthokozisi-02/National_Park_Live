'use client';

import React, { useState } from 'react';
import { WildlifeDetection } from '@/types/safari';
import {
  Sparkles,
  Info,
  Clock,
  Layers,
  ChevronRight,
  X,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

interface WildlifePanelProps {
  detections: WildlifeDetection[];
  selectedAnimal: WildlifeDetection | null;
  onSelectAnimal: (animal: WildlifeDetection | null) => void;
}

export const WildlifePanel: React.FC<WildlifePanelProps> = ({
  detections,
  selectedAnimal,
  onSelectAnimal,
}) => {
  return (
    <div className="flex flex-col gap-3 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-sm tracking-wide text-gray-100">
            AI WILDLIFE SIGHTINGS
          </span>
        </div>
        <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-semibold">
          LIVE DETECTIONS ({detections.length})
        </span>
      </div>

      {/* Sightings List */}
      <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1">
        {detections.map((animal) => (
          <div
            key={animal.id}
            onClick={() => onSelectAnimal(animal)}
            className="group bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/60 p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-700 group-hover:border-amber-400 flex-shrink-0">
                <img
                  src={animal.imageUrl}
                  alt={animal.commonName}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <span className="absolute bottom-0 right-0 bg-black/80 text-[8px] text-amber-300 px-1 font-bold">
                  x{animal.count}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-200 text-xs group-hover:text-amber-300 transition-colors">
                    {animal.commonName}
                  </span>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 rounded">
                    {(animal.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 italic">
                  {animal.scientificName}
                </div>
                <div className="flex items-center gap-2 text-[9px] text-gray-500 mt-1">
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" /> {animal.timestamp}
                  </span>
                  <span>•</span>
                  <span>Dist: {animal.distanceFromDroneM}m</span>
                  <span>•</span>
                  <span className="text-amber-400/90">{animal.conservationStatus}</span>
                </div>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
          </div>
        ))}
      </div>

      {/* Selected Wildlife Encyclopedia Modal */}
      {selectedAnimal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative font-sans text-gray-200">
            {/* Modal Image Header */}
            <div className="relative h-48 w-full">
              <img
                src={selectedAnimal.imageUrl}
                alt={selectedAnimal.commonName}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
              <button
                onClick={() => onSelectAnimal(null)}
                className="absolute top-3 right-3 bg-black/60 hover:bg-black/90 text-white p-1.5 rounded-full border border-white/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="absolute bottom-3 left-4 right-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-amber-500 text-black font-bold text-xs px-2 py-0.5 rounded font-mono">
                    AI IDENTIFIED • {(selectedAnimal.confidence * 100).toFixed(0)}%
                  </span>
                  <span className="bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] px-2 py-0.5 rounded font-mono">
                    {selectedAnimal.conservationStatus}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {selectedAnimal.commonName}
                </h3>
                <p className="text-xs text-amber-200/90 italic font-mono">
                  {selectedAnimal.scientificName}
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex flex-col gap-3.5 max-h-[60vh] overflow-y-auto">
              <div>
                <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-1">
                  Observed Behavior & Real-time Context
                </h4>
                <p className="text-sm text-gray-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  {selectedAnimal.behavior}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-1">
                  Ecosystem Role in Hwange
                </h4>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {selectedAnimal.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-gray-400 block text-[10px]">DIET</span>
                  <span className="text-emerald-300 font-semibold">{selectedAnimal.diet}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-gray-400 block text-[10px]">HABITAT</span>
                  <span className="text-cyan-300 font-semibold">{selectedAnimal.habitat}</span>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-1">
                  <Info className="w-3.5 h-3.5" />
                  <span>DID YOU KNOW?</span>
                </div>
                <p className="text-amber-100/90 leading-relaxed">
                  {selectedAnimal.funFact}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => onSelectAnimal(null)}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-4 py-1.5 rounded-lg text-xs font-mono transition-colors"
              >
                CLOSE BIO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
