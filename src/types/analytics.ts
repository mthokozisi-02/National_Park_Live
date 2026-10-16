export interface SpeciesSummaryItem {
  common_name: string;
  sightings: number;
  animals: number;
  avg_conf: number;
}

export interface SectorAnalysisItem {
  sector: string;
  raw_sightings: number;
  raw_animals: number;
  corrected_estimated_animals: number;
  detection_probability: number;
  canopy_cover_pct: number;
  dominant_species: string;
}

export interface AnalyticsSummary {
  total_sightings: number;
  total_animals_observed: number;
  estimated_survey_flight_hours: number;
  survey_coverage_km2: number;
  species_breakdown: SpeciesSummaryItem[];
  sector_analysis: SectorAnalysisItem[];
  highest_density_sector: string;
}

export interface SpeciesPredictionItem {
  species: string;
  current_hour: number;
  occurrence_probability: number; // 0.0 - 1.0
  status: string;
  best_hotspot: string;
  habitat_notes: string;
  movement_notes: string;
}

export interface PredictiveOccurrenceResponse {
  evaluation_hour: number;
  time_window: string;
  predictions: SpeciesPredictionItem[];
  recommendation_summary: string;
}

export interface WildlifeReportResponse {
  title: string;
  generated_at: string;
  period: 'daily' | 'weekly';
  summary: AnalyticsSummary;
  predictions: PredictiveOccurrenceResponse;
  key_takeaways: string[];
  author: string;
}
