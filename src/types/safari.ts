export type StreamStatus = 'connecting' | 'live' | 'demo' | 'reconnecting' | 'offline';
export type DetectionSource = 'simulated' | 'model' | 'operator';
export type SimulationMode = 'automatic' | 'manual';

export interface DroneTelemetry {
  droneId: string;
  droneModel: string;
  latitude: number;
  longitude: number;
  altitude: number; // meters AGL
  targetAltitude: number;
  speed: number; // km/h
  heading: number; // 0-360 degrees
  pitch: number; // degrees
  roll: number; // degrees
  yaw: number;
  gimbalPitch: number; // -90 (down) to +20
  batteryPercentage: number;
  batteryVoltage: number;
  flightTimeRemainingMin: number;
  signalStrength: number; // percentage
  signalType: '5G Low-Latency' | 'Starlink Uplink' | '4G LTE' | 'RF O3 Pro';
  satelliteCount: number;
  rtkStatus: 'FIXED' | 'FLOAT' | 'STANDBY';
  isLive: boolean;
  dataMode: 'simulated' | 'live';
  flightMode: 'AUTONOMOUS PATROL' | 'MANUAL OVERRIDE' | 'RETURN TO HOME' | 'TARGET ORBIT';
  temperatureC: number;
  windSpeedKmh: number;
  windDirection: string;
  distanceFromHomeM: number;
}

export interface WildlifeDetection {
  id: string;
  species: string;
  commonName: string;
  scientificName: string;
  confidence: number; // 0.0 - 1.0
  count: number;
  box: {
    x: number; // percentage (0 - 100)
    y: number;
    width: number;
    height: number;
  };
  distanceFromDroneM: number;
  behavior: string;
  conservationStatus: 'Critically Endangered' | 'Endangered' | 'Vulnerable' | 'Near Threatened' | 'Least Concern';
  habitat: string;
  diet: string;
  description: string;
  funFact: string;
  imageUrl: string;
  timestamp: string;
  source: DetectionSource;
  modelVersion?: string;
}

export interface SafariCameraStream {
  id: string;
  name: string;
  locationName: string;
  description: string;
  coordinates: [number, number];
  videoUrl: string;
  posterUrl: string;
  quality: '4K Ultra HD' | '1080p 60fps';
  bitrateMbps: number;
  streamStatus: StreamStatus;
  detectedWildlife: WildlifeDetection[];
}

export interface MapFeature {
  id: string;
  type: 'drone' | 'wildlife' | 'waterhole' | 'ranger_station' | 'waypoint';
  title: string;
  subtitle?: string;
  coordinates: [number, number];
  icon: string;
  details?: Record<string, string | number>;
}
