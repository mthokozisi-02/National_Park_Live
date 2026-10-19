import {
  AnalyticsSummary,
  PredictiveOccurrenceResponse,
  WildlifeReportResponse,
} from '@/types/analytics';

import { API_BASE_URL } from '@/config/api';
const API_BASE = API_BASE_URL;

const FALLBACK_SUMMARY: AnalyticsSummary = {
  total_sightings: 8,
  total_animals_observed: 81,
  estimated_survey_flight_hours: 6.5,
  survey_coverage_km2: 420.0,
  species_breakdown: [
    { common_name: 'Cape Buffalo', sightings: 1, animals: 24, avg_conf: 0.91 },
    { common_name: 'Plains Zebra', sightings: 2, animals: 20, avg_conf: 0.87 },
    { common_name: 'African Elephant', sightings: 2, animals: 20, avg_conf: 0.95 },
    { common_name: 'Impala', sightings: 1, animals: 18, avg_conf: 0.87 },
    { common_name: 'Giraffe', sightings: 1, animals: 3, avg_conf: 0.92 },
    { common_name: 'Lion', sightings: 1, animals: 2, avg_conf: 0.88 },
  ],
  sector_analysis: [
    {
      sector: 'Central Vlei & Pan Sector',
      raw_sightings: 4,
      raw_animals: 42,
      corrected_estimated_animals: 46,
      detection_probability: 0.91,
      canopy_cover_pct: 25,
      dominant_species: 'African Elephant',
    },
    {
      sector: 'Mandavu Dam & Northern Basins',
      raw_sightings: 2,
      raw_animals: 32,
      corrected_estimated_animals: 38,
      detection_probability: 0.86,
      canopy_cover_pct: 40,
      dominant_species: 'Cape Buffalo',
    },
    {
      sector: 'Main Camp & Teak Woodland',
      raw_sightings: 1,
      raw_animals: 2,
      corrected_estimated_animals: 3,
      detection_probability: 0.77,
      canopy_cover_pct: 65,
      dominant_species: 'Lion',
    },
    {
      sector: 'Guvalala & Wilderness Trails',
      raw_sightings: 1,
      raw_animals: 3,
      corrected_estimated_animals: 4,
      detection_probability: 0.88,
      canopy_cover_pct: 35,
      dominant_species: 'Giraffe',
    },
  ],
  highest_density_sector: 'Central Vlei & Pan Sector',
  is_simulated: true,
};

export const analyticsService = {
  /**
   * Fetch aggregate wildlife analytics and survey effort metrics
   */
  async getSummary(): Promise<AnalyticsSummary> {
    try {
      const resp = await fetch(`${API_BASE}/api/analytics/summary`, {
        headers: { Accept: 'application/json' },
      });
      if (!resp.ok) throw new Error('API Error');
      const data = await resp.json();
      return { ...data, is_simulated: false };
    } catch {
      return FALLBACK_SUMMARY;
    }
  },

  /**
   * Fetch predictive occurrence model predictions by hour of day
   */
  async getPredictiveOccurrence(hour?: number): Promise<PredictiveOccurrenceResponse> {
    const q = hour !== undefined ? `?hour=${hour}` : '';
    try {
      const resp = await fetch(`${API_BASE}/api/analytics/predictive-occurrence${q}`, {
        headers: { Accept: 'application/json' },
      });
      if (!resp.ok) throw new Error('API Error');
      const data = await resp.json();
      return { ...data, is_simulated: false };
    } catch {
      const h = hour !== undefined ? hour : new Date().getHours();
      return {
        is_simulated: true,
        evaluation_hour: h,
        time_window: `${h.toString().padStart(2, '0')}:00 - ${((h + 1) % 24).toString().padStart(2, '0')}:00`,
        recommendation_summary: `At ${h}:00, highest predicted likelihood is African Elephant (89% at Nyamandhlovu Pan).`,
        predictions: [
          {
            species: 'African Elephant',
            current_hour: h,
            occurrence_probability: h >= 14 && h <= 18 ? 0.92 : 0.45,
            status: h >= 14 && h <= 18 ? 'Peak Activity Window' : 'Transiting',
            best_hotspot: 'Nyamandhlovu Pan',
            habitat_notes: 'Perennial pans, mud-wallows, and open vleis',
            movement_notes: 'Daily transit from teak woodland feeding grounds to waterholes',
          },
          {
            species: 'Plains Zebra',
            current_hour: h,
            occurrence_probability: (h >= 8 && h <= 11) || (h >= 15 && h <= 16) ? 0.88 : 0.5,
            status: 'Steady Grazing Window',
            best_hotspot: 'Nyamandhlovu Open Vlei',
            habitat_notes: 'Open short-grass savannas',
            movement_notes: 'Early drink before apex predators stir',
          },
          {
            species: 'Lion',
            current_hour: h,
            occurrence_probability: h <= 7 || h >= 18 ? 0.78 : 0.2,
            status: h <= 7 || h >= 18 ? 'Crepuscular Patrol Window' : 'Resting in Teak Canopy Shade',
            best_hotspot: 'Main Camp Woodland Edge',
            habitat_notes: 'Riverine brush and shade canopy',
            movement_notes: 'Nocturnal & crepuscular territorial patrols; sedentary midday',
          },
          {
            species: 'Cape Buffalo',
            current_hour: h,
            occurrence_probability: h >= 11 && h <= 15 ? 0.85 : 0.35,
            status: 'Midday Waterhole Wallower',
            best_hotspot: 'Mandavu Dam Shoreline',
            habitat_notes: 'Riparian shorelines and reedbeds',
            movement_notes: 'Bulk grazers congregating around permanent water during peak heat',
          },
        ],
      };
    }
  },

  /**
   * Generate daily or weekly wildlife briefing report
   */
  async getReport(period: 'daily' | 'weekly' = 'daily'): Promise<WildlifeReportResponse> {
    try {
      const resp = await fetch(`${API_BASE}/api/analytics/report?report_type=${period}`, {
        headers: { Accept: 'application/json' },
      });
      if (!resp.ok) throw new Error('API Error');
      const data = await resp.json();
      return { ...data, is_simulated: false };
    } catch {
      const summary = await this.getSummary();
      const predictions = await this.getPredictiveOccurrence();
      return {
        is_simulated: true,
        title: `Hwange National Park Wildlife Intelligence ${period === 'daily' ? 'Daily Briefing' : 'Weekly Summary'}`,
        generated_at: new Date().toISOString(),
        period,
        summary,
        predictions,
        key_takeaways: [
          `Total of ${summary.total_animals_observed} animals censused across ${summary.total_sightings} verified observations.`,
          `Highest density identified in ${summary.highest_density_sector}.`,
          `Detection correction for canopy obscuration projects ~${summary.sector_analysis.reduce((acc, s) => acc + s.corrected_estimated_animals, 0)} total population in surveyed corridors.`,
          predictions.recommendation_summary,
        ],
        author: 'SafariVision Autonomous Wildlife Intelligence System',
      };
    }
  },
};
