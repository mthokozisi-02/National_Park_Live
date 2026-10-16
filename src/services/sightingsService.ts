import { WildlifeSighting, SightingFilterOptions, SightingsStats, SightingAgeCategory } from '@/types/sightings';
import { API_BASE_URL } from '@/config/api';
const API_BASE = API_BASE_URL;

const FALLBACK_SIGHTINGS: WildlifeSighting[] = [
  {
    id: 's-ele-01',
    species: 'Loxodonta africana',
    common_name: 'African Elephant',
    confidence: 0.94,
    count: 6,
    latitude: -18.6315,
    longitude: 26.9525,
    altitude_m: 1045.0,
    timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(), // 8 mins ago
    source_video: 'final_test.mp4',
    source_frame: 120,
    track_id: 1,
    notes: 'Breeding herd of 6 drinking at Nyamandhlovu Pan edge.',
  },
  {
    id: 's-zeb-02',
    species: 'Equus quagga',
    common_name: 'Plains Zebra',
    confidence: 0.89,
    count: 12,
    latitude: -18.6340,
    longitude: 26.9550,
    altitude_m: 1040.0,
    timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(), // 14 mins ago
    source_video: 'final_test.mp4',
    source_frame: 180,
    track_id: 4,
    notes: 'Harem group grazing openly on the vlei.',
  },
  {
    id: 's-gir-03',
    species: 'Giraffa camelopardalis',
    common_name: 'Giraffe',
    confidence: 0.92,
    count: 3,
    latitude: -18.6865,
    longitude: 26.8940,
    altitude_m: 1055.0,
    timestamp: new Date(Date.now() - 80 * 60 * 1000).toISOString(), // 80 mins ago
    source_video: 'final.mp4',
    source_frame: 450,
    track_id: 7,
    notes: 'Tower of 3 browsing acacia tops near Guvalala.',
  },
  {
    id: 's-lio-04',
    species: 'Panthera leo',
    common_name: 'Lion',
    confidence: 0.88,
    count: 2,
    latitude: -18.7280,
    longitude: 26.9480,
    altitude_m: 1060.0,
    timestamp: new Date(Date.now() - 165 * 60 * 1000).toISOString(), // ~2.7 hrs ago
    source_video: 'test.mp4',
    source_frame: 310,
    track_id: 11,
    notes: 'Two adult lionesses resting under teak canopy near Main Camp.',
  },
  {
    id: 's-buf-05',
    species: 'Syncerus caffer',
    common_name: 'Cape Buffalo',
    confidence: 0.91,
    count: 24,
    latitude: -18.5740,
    longitude: 26.4280,
    altitude_m: 995.0,
    timestamp: new Date(Date.now() - 7 * 3600 * 1000).toISOString(), // 7 hrs ago
    source_video: 'safari.webm',
    source_frame: 220,
    track_id: 15,
    notes: 'Large bachelor herd wallowing along Mandavu Dam shoreline.',
  },
  {
    id: 's-imp-06',
    species: 'Aepyceros melampus',
    common_name: 'Impala',
    confidence: 0.87,
    count: 18,
    latitude: -18.6360,
    longitude: 26.9480,
    altitude_m: 1042.0,
    timestamp: new Date(Date.now() - 9 * 3600 * 1000).toISOString(), // 9 hrs ago
    source_video: 'final_test.mp4',
    source_frame: 90,
    track_id: 2,
    notes: 'Bachelor herd alert near southern treeline.',
  },
  {
    id: 's-ele-07',
    species: 'Loxodonta africana',
    common_name: 'African Elephant',
    confidence: 0.96,
    count: 14,
    latitude: -18.5850,
    longitude: 26.3180,
    altitude_m: 1080.0,
    timestamp: new Date(Date.now() - 28 * 3600 * 1000).toISOString(), // 28 hrs ago
    source_video: 'final.mp4',
    source_frame: 600,
    track_id: 22,
    notes: 'Family herd with two calves traversing Sinamatella ridge.',
  },
];

export const sightingsService = {
  /**
   * Fetch wildlife sightings with optional species and age filters
   */
  async getSightings(options?: SightingFilterOptions): Promise<WildlifeSighting[]> {
    try {
      const params = new URLSearchParams();
      if (options?.species && options.species !== 'all') {
        params.append('species', options.species);
      }
      if (options?.maxAgeHours && options.maxAgeHours > 0) {
        params.append('max_age_hours', options.maxAgeHours.toString());
      }
      if (options?.limit) {
        params.append('limit', options.limit.toString());
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`${API_BASE}/api/sightings${queryString}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Sightings API error: ${response.status}`);
      }

      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
      return this.filterFallbackSightings(options);
    } catch (err) {
      console.warn('Failed to fetch from /api/sightings, utilizing local fallback sightings:', err);
      return this.filterFallbackSightings(options);
    }
  },

  /**
   * Helper to filter fallback sightings locally if offline
   */
  filterFallbackSightings(options?: SightingFilterOptions): WildlifeSighting[] {
    let list = [...FALLBACK_SIGHTINGS];

    if (options?.species && options.species !== 'all') {
      const sp = options.species.toLowerCase();
      list = list.filter(
        (s) =>
          s.common_name.toLowerCase().includes(sp) ||
          s.species.toLowerCase().includes(sp)
      );
    }

    if (options?.maxAgeHours && options.maxAgeHours > 0) {
      const cutoff = Date.now() - options.maxAgeHours * 3600 * 1000;
      list = list.filter((s) => new Date(s.timestamp).getTime() >= cutoff);
    }

    return list;
  },

  /**
   * Helper to determine age classification of a sighting
   */
  getAgeCategory(timestamp: string): SightingAgeCategory {
    const ageMs = Date.now() - new Date(timestamp).getTime();
    const ageMins = ageMs / (1000 * 60);

    if (ageMins <= 15) return 'fresh';
    if (ageMins <= 120) return 'recent';
    if (ageMins <= 1440) return 'today';
    return 'historical';
  },

  /**
   * Format friendly human relative time
   */
  formatTimeAgo(timestamp: string): string {
    const ageMs = Math.max(0, Date.now() - new Date(timestamp).getTime());
    const mins = Math.floor(ageMs / (1000 * 60));
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return 'Just now';
    if (mins === 1) return '1 min ago';
    if (mins < 60) return `${mins} mins ago`;
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  },

  /**
   * Fetch statistical summary
   */
  async getStats(): Promise<SightingsStats | null> {
    try {
      const response = await fetch(`${API_BASE}/api/sightings/stats`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  },
};
