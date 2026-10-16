import { WildlifeSighting } from '@/types/sightings';
import {
  DestinationRecommendation,
  DriverPriorityMode,
  DecisionSupportConfig,
} from '@/types/decisionSupport';

// Hwange Safari Vehicle Staging Base (Main Camp)
export const HWANGE_BASE_COORDS = {
  lat: -18.7315,
  lng: 26.9510,
  name: 'Main Camp Safari Gate',
};

// Road track curvature multiplier through bush terrain
const BUSH_ROAD_CURVATURE_FACTOR = 1.28;

// Earth radius in km
const EARTH_RADIUS_KM = 6371.0;

/**
 * Great-circle distance between two GPS coordinates in kilometers
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180.0;
  const dLng = ((lng2 - lng1) * Math.PI) / 180.0;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180.0) *
      Math.cos((lat2 * Math.PI) / 180.0) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

const SPECIES_RARITY_SCORES: Record<string, number> = {
  lion: 98,
  leopard: 100,
  cheetah: 98,
  'african elephant': 88,
  elephant: 88,
  giraffe: 78,
  'cape buffalo': 74,
  buffalo: 74,
  'plains zebra': 58,
  zebra: 58,
  impala: 50,
  oryx: 75,
  deer: 52,
  bird: 45,
};

export const decisionSupportService = {
  /**
   * Rank all available wildlife sightings for game-drive drivers
   */
  rankDestinations(
    sightings: WildlifeSighting[],
    driverCoords: { lat: number; lng: number },
    config: DecisionSupportConfig = {
      mode: 'balanced',
      maxDistanceKm: 40.0,
      includeHistorical: false,
      averageSpeedKmh: 30.0,
    }
  ): DestinationRecommendation[] {
    if (!sightings || sightings.length === 0) return [];

    const now = Date.now();

    const allEvaluated = sightings
      .map((s) => {
        // Calculate distances
        const straightDistKm = calculateHaversineDistanceKm(
          driverCoords.lat,
          driverCoords.lng,
          s.latitude,
          s.longitude
        );

        const roadDistKm = straightDistKm * BUSH_ROAD_CURVATURE_FACTOR;
        const driveTimeMins = Math.round(
          (roadDistKm / Math.max(15.0, config.averageSpeedKmh)) * 60.0
        );

        // Calculate age
        const ageMs = Math.max(0, now - new Date(s.timestamp).getTime());
        const ageHours = ageMs / (3600 * 1000);
        const ageMins = Math.round(ageMs / 60000);

        // 1. Freshness Score (0 - 100)
        let freshnessScore = 10;
        let freshnessLabel = 'Historical (>24h)';
        if (ageMins <= 15) {
          freshnessScore = 100;
          freshnessLabel = `Very Fresh (${ageMins}m ago)`;
        } else if (ageMins <= 60) {
          freshnessScore = 85;
          freshnessLabel = `Fresh (${ageMins}m ago)`;
        } else if (ageHours <= 3) {
          freshnessScore = 60;
          freshnessLabel = `Recent (${Math.round(ageHours)}h ago)`;
        } else if (ageHours <= 12) {
          freshnessScore = 35;
          freshnessLabel = `Earlier Today (${Math.round(ageHours)}h ago)`;
        } else if (ageHours <= 24) {
          freshnessScore = 20;
          freshnessLabel = `Yesterday (${Math.round(ageHours)}h ago)`;
        }

        // 2. Species Rarity / Predator Score (0 - 100)
        const lowerName = s.common_name.toLowerCase();
        let rarityScore = 50;
        for (const [key, val] of Object.entries(SPECIES_RARITY_SCORES)) {
          if (lowerName.includes(key)) {
            rarityScore = val;
            break;
          }
        }

        // 3. Proximity Score (0 - 100)
        // Exponential decay: 0 km = 100 pts, 10 km = ~50 pts, 25 km = ~15 pts
        const proximityScore = Math.round(
          100.0 * Math.exp(-straightDistKm / 12.0)
        );

        // 4. Group Size Bonus (0 - 30)
        const groupBonus = Math.min(30, (s.count || 1) * 3);

        // Weighting by priority mode
        let compositeScore = 0;
        switch (config.mode) {
          case 'predators':
            compositeScore =
              rarityScore * 0.55 +
              freshnessScore * 0.25 +
              proximityScore * 0.15 +
              groupBonus * 0.05;
            break;
          case 'nearest':
            compositeScore =
              proximityScore * 0.60 +
              freshnessScore * 0.25 +
              rarityScore * 0.10 +
              groupBonus * 0.05;
            break;
          case 'mega_herds':
            compositeScore =
              (groupBonus / 30) * 100 * 0.45 +
              freshnessScore * 0.25 +
              rarityScore * 0.15 +
              proximityScore * 0.15;
            break;
          case 'balanced':
          default:
            compositeScore =
              freshnessScore * 0.35 +
              rarityScore * 0.30 +
              proximityScore * 0.25 +
              groupBonus * 0.10;
            break;
        }

        compositeScore = Math.min(100, Math.max(1, Math.round(compositeScore)));

        // Generate context-aware reason
        const reasoning = this.generateReasoning(
          s,
          ageMins,
          roadDistKm,
          driveTimeMins,
          rarityScore,
          freshnessScore
        );

        return {
          sighting: s,
          rank: 0,
          score: compositeScore,
          straightDistanceKm: Math.round(straightDistKm * 10) / 10,
          roadDistanceKm: Math.round(roadDistKm * 10) / 10,
          driveTimeMinutes: driveTimeMins,
          reasoning,
          keyFactors: {
            freshnessLabel,
            rarityScore,
            proximityScore,
            groupBonus,
          },
        };
      });

    const maxDist = config.maxDistanceKm && config.maxDistanceKm > 0 ? config.maxDistanceKm : 120.0;

    let evaluated = allEvaluated.filter((rec) => {
      if (!config.includeHistorical && rec.keyFactors.freshnessLabel.includes('Historical')) {
        return false;
      }
      return rec.straightDistanceKm <= maxDist;
    });

    // If all sightings are outside maxDist (e.g. testing remotely or across park), retain all candidates
    if (evaluated.length === 0 && allEvaluated.length > 0) {
      evaluated = allEvaluated.filter((rec) => {
        if (!config.includeHistorical && rec.keyFactors.freshnessLabel.includes('Historical')) {
          return false;
        }
        return true;
      });
      if (evaluated.length === 0) {
        evaluated = [...allEvaluated];
      }
    }

    // Sort descending by composite score
    evaluated.sort((a, b) => b.score - a.score);

    // Assign 1-indexed ranks
    return evaluated.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  },

  /**
   * Produce explainable driver guidance
   */
  generateReasoning(
    sighting: WildlifeSighting,
    ageMins: number,
    roadKm: number,
    driveMins: number,
    rarity: number,
    freshness: number
  ): string {
    const isPredator = rarity >= 90;
    const isFresh = ageMins <= 30;
    const isClose = roadKm <= 10.0;
    const isLargeHerd = (sighting.count || 1) >= 6;

    if (isPredator && isFresh) {
      return `🔥 Apex sighting: ${sighting.count} ${sighting.common_name} spotted ${ageMins}m ago (${roadKm.toFixed(1)} km, ~${driveMins} mins drive). Urgent dispatch recommended before animals retreat to thick brush.`;
    }

    if (isLargeHerd && isFresh) {
      return `⭐ Prime viewing: Active herd of ${sighting.count} ${sighting.common_name} observed ${ageMins}m ago. High confidence viewing (~${driveMins} min drive).`;
    }

    if (isClose && isFresh) {
      return `⚡ Immediate opportunity: ${sighting.common_name} only ${roadKm.toFixed(1)} km away (~${driveMins} mins). Animals likely still in the immediate vicinity.`;
    }

    if (isPredator) {
      return `🦁 High-interest predator target: ${sighting.common_name} recorded ${sighting.notes || 'in territory'} (~${driveMins} mins drive).`;
    }

    if (isLargeHerd) {
      return `🐘 Large congregation: ${sighting.count} ${sighting.common_name} gathered at waterhole/vlei (~${roadKm.toFixed(1)} km away). Excellent photo opportunities.`;
    }

    return `📍 Steady sighting: ${sighting.common_name} observed at ${sighting.latitude.toFixed(4)}, ${sighting.longitude.toFixed(4)} (~${driveMins} mins drive).`;
  },
};
