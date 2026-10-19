'use client';

import React, { useState, useEffect } from 'react';
import {
  AnalyticsSummary,
  PredictiveOccurrenceResponse,
  WildlifeReportResponse,
} from '@/types/analytics';
import { analyticsService } from '@/services/analyticsService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartColumn,
  faArrowTrendUp,
  faClock,
  faShieldHalved,
  faFileLines,
  faLocationDot,
  faXmark,
  faSliders,
  faLayerGroup,
  faCalendarDays,
  faCircleCheck,
  faTree,
  faEye,
  faLightbulb,
} from '@fortawesome/free-solid-svg-icons';

interface WildlifeAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WildlifeAnalyticsModal: React.FC<WildlifeAnalyticsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'spatial' | 'predictive' | 'reports'>('overview');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [predictive, setPredictive] = useState<PredictiveOccurrenceResponse | null>(null);
  const [report, setReport] = useState<WildlifeReportResponse | null>(null);
  const [selectedHour, setSelectedHour] = useState<number>(14);
  const [reportType, setReportType] = useState<'daily' | 'weekly'>('daily');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) return;
    const currentHour = new Date().getHours();
    setSelectedHour(currentHour);
    setIsLoading(true);
    Promise.all([
      analyticsService.getSummary(),
      analyticsService.getPredictiveOccurrence(currentHour),
      analyticsService.getReport(reportType),
    ]).then(([sumData, predData, repData]) => {
      setSummary(sumData);
      setPredictive(predData);
      setReport(repData);
      setIsLoading(false);
    });
  }, [isOpen, reportType]);

  const handleHourChange = async (h: number) => {
    setSelectedHour(h);
    const updated = await analyticsService.getPredictiveOccurrence(h);
    setPredictive(updated);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-mono">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-800">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-200">
              <FontAwesomeIcon icon={faChartColumn} className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-wider flex items-center gap-2">
                <span>WILDLIFE INTELLIGENCE & ANALYTICS</span>
                {summary?.is_simulated ? (
                  <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                    SIMULATED DATA (Backend Offline)
                  </span>
                ) : (
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                    LIVE HWANGE CENSUS
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-500 font-sans">
                Accumulated observations, spatial census correction, and predictive occurrence models.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Strip */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-slate-200 bg-slate-50 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
            }`}
          >
            <FontAwesomeIcon icon={faArrowTrendUp} className="w-3.5 h-3.5" />
            <span>Overview & Species</span>
          </button>

          <button
            onClick={() => setActiveTab('spatial')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'spatial'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
            }`}
          >
            <FontAwesomeIcon icon={faLayerGroup} className="w-3.5 h-3.5" />
            <span>Spatial Sectors & Bias</span>
          </button>

          <button
            onClick={() => setActiveTab('predictive')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'predictive'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
            }`}
          >
            <FontAwesomeIcon icon={faClock} className="w-3.5 h-3.5" />
            <span>Predictive Models</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
            }`}
          >
            <FontAwesomeIcon icon={faFileLines} className="w-3.5 h-3.5" />
            <span>Intelligence Reports</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && summary && (
            <div className="flex flex-col gap-5">
              {/* Top Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[10px] text-slate-500 font-sans uppercase font-medium">Total Animals Censused</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">{summary.total_animals_observed}</div>
                  <div className="text-[10px] text-emerald-700 font-sans mt-0.5">Across {summary.total_sightings} verified sightings</div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[10px] text-slate-500 font-sans uppercase font-medium">Survey Flight Hours</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">{summary.estimated_survey_flight_hours} hrs</div>
                  <div className="text-[10px] text-slate-500 font-sans mt-0.5">Autonomous drone missions</div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[10px] text-slate-500 font-sans uppercase font-medium">Survey Coverage Area</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">{summary.survey_coverage_km2} km²</div>
                  <div className="text-[10px] text-slate-500 font-sans mt-0.5">Hwange National Park focal grid</div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[10px] text-slate-500 font-sans uppercase font-medium">Core High-Density Zone</div>
                  <div className="text-sm font-bold text-emerald-700 mt-1 truncate">{summary.highest_density_sector}</div>
                  <div className="text-[10px] text-slate-500 font-sans mt-0.5">Highest animal biomass</div>
                </div>
              </div>

              {/* Species Breakdown */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3 shadow-2xs">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faChartColumn} className="w-3.5 h-3.5 text-slate-600" />
                  <span>SPECIES DISTRIBUTION BREAKDOWN</span>
                </h3>

                <div className="flex flex-col gap-2.5">
                  {summary.species_breakdown.map((item) => {
                    const maxAnimals = Math.max(...summary.species_breakdown.map((s) => s.animals), 1);
                    const pct = Math.round((item.animals / maxAnimals) * 100);

                    return (
                      <div key={item.common_name} className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{item.common_name}</span>
                          <span className="text-slate-600 font-semibold">
                            {item.animals} animals ({item.sightings} sightings, avg conf: {Math.round(item.avg_conf * 100)}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SPATIAL SECTORS & BIAS CORRECTION */}
          {activeTab === 'spatial' && summary && (
            <div className="flex flex-col gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faTree} className="w-3.5 h-3.5 text-emerald-600" />
                      <span>SURVEY EFFORT & CANOPY DETECTION CORRECTION</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                      Raw visual counts significantly underestimate wildlife in dense Zambezi teak forest. The table below applies habitat-specific detection probability functions.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-2">Park Sector</th>
                        <th className="p-2 text-center">Canopy Cover</th>
                        <th className="p-2 text-center">Detectability</th>
                        <th className="p-2 text-center">Observed (Raw)</th>
                        <th className="p-2 text-center text-emerald-800 font-bold">Corrected Population</th>
                        <th className="p-2">Dominant Species</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {summary.sector_analysis.map((sec) => (
                        <tr key={sec.sector} className="hover:bg-white transition-colors">
                          <td className="p-2 font-bold text-slate-800">{sec.sector}</td>
                          <td className="p-2 text-center text-slate-600">{sec.canopy_cover_pct}%</td>
                          <td className="p-2 text-center text-blue-700 font-semibold">{Math.round(sec.detection_probability * 100)}%</td>
                          <td className="p-2 text-center font-semibold text-slate-700">{sec.raw_animals}</td>
                          <td className="p-2 text-center font-bold text-emerald-800 bg-emerald-50 rounded">
                            ~{sec.corrected_estimated_animals} animals
                          </td>
                          <td className="p-2 text-slate-800 font-semibold">{sec.dominant_species}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PREDICTIVE OCCURRENCE */}
          {activeTab === 'predictive' && predictive && (
            <div className="flex flex-col gap-4">
              {/* Hour of Day Slider */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faClock} className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase">
                      SELECT TIME OF DAY FOR PREDICTIVE OCCURRENCE:
                    </span>
                  </div>
                  <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                    {predictive.time_window}
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="23"
                  value={selectedHour}
                  onChange={(e) => handleHourChange(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />

                <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                  <span>00:00 (Night)</span>
                  <span>06:00 (Dawn)</span>
                  <span>12:00 (Midday)</span>
                  <span>18:00 (Dusk)</span>
                  <span>23:00</span>
                </div>

                <div className="text-[11px] font-sans text-emerald-900 bg-emerald-50 border border-emerald-200 rounded p-2.5 mt-1 flex items-start gap-2">
                  <FontAwesomeIcon icon={faLightbulb} className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Intelligence Advisory:</strong> {predictive.recommendation_summary}
                  </div>
                </div>
              </div>

              {/* Predictions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {predictive.predictions.map((p) => {
                  const probPct = Math.round(p.occurrence_probability * 100);
                  const isHigh = probPct >= 75;

                  return (
                    <div
                      key={p.species}
                      className={`p-3 rounded-xl border flex flex-col gap-2 shadow-2xs ${
                        isHigh
                          ? 'bg-emerald-50/50 border-emerald-300'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">{p.species}</span>
                        <span
                          className={`text-xs font-black px-2 py-0.5 rounded ${
                            isHigh
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {probPct}% Likelihood
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-700 font-semibold flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faLocationDot} className="w-3 h-3 text-slate-500 flex-shrink-0" />
                        <span>Best Hotspot: {p.best_hotspot}</span>
                      </div>

                      <div className="text-[10px] text-slate-600 font-sans leading-relaxed">
                        <div><strong>Behavior:</strong> {p.status}</div>
                        <div><strong>Ecological Routine:</strong> {p.movement_notes}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: INTELLIGENCE REPORTS */}
          {activeTab === 'reports' && report && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setReportType('daily')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      reportType === 'daily'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    Daily Briefing
                  </button>
                  <button
                    onClick={() => setReportType('weekly')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      reportType === 'weekly'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    Weekly Summary
                  </button>
                </div>

                <span className="text-[10px] text-slate-500">
                  Generated: {report.generated_at}
                </span>
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col gap-4 shadow-2xs">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-base font-bold text-slate-900">{report.title}</h3>
                  <div className="text-[10px] text-slate-500 mt-0.5">Author: {report.author}</div>
                </div>

                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    EXECUTIVE TAKEAWAYS & PATROL DIRECTIVES:
                  </h4>
                  <ul className="list-disc list-inside text-xs font-sans text-slate-700 space-y-1.5 pl-1 leading-relaxed">
                    {report.key_takeaways.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-[10px] text-slate-500 font-sans">
            SafariVision Wildlife Decision System • Hwange Ecological Dashboard
          </span>
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
