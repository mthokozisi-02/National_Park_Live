import { WildlifeSighting } from './sightings';

export type DriverPriorityMode = 'balanced' | 'predators' | 'nearest' | 'mega_herds';

export interface DestinationRecommendation {
  sighting: WildlifeSighting;
  rank: number;
  score: number; // 0 - 100
  straightDistanceKm: number;
  roadDistanceKm: number;
  driveTimeMinutes: number;
  reasoning: string;
  keyFactors: {
    freshnessLabel: string;
    rarityScore: number;
    proximityScore: number;
    groupBonus: number;
  };
}

export interface DecisionSupportConfig {
  mode: DriverPriorityMode;
  maxDistanceKm: number;
  includeHistorical: boolean;
  averageSpeedKmh: number;
}
