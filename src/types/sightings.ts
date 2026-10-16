export interface WildlifeSighting {
  id: string;
  species: string;
  common_name: string;
  confidence: number;
  count: number;
  latitude: number;
  longitude: number;
  altitude_m?: number;
  timestamp: string; // ISO 8601 string
  source_video?: string;
  source_frame?: number;
  track_id?: number | null;
  notes?: string;
}

export type SightingAgeCategory = 'fresh' | 'recent' | 'today' | 'historical';

export interface SightingFilterOptions {
  species?: string;
  maxAgeHours?: number;
  limit?: number;
}

export interface SpeciesBreakdown {
  common_name: string;
  sighting_count: number;
  animal_count: number;
}

export interface SightingsStats {
  total_sightings: number;
  total_animals: number;
  species_breakdown: SpeciesBreakdown[];
  latest_sighting?: string | null;
}
