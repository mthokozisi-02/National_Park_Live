import { DroneTelemetry, SafariCameraStream, WildlifeDetection, MapFeature } from '@/types/safari';

export const INITIAL_TELEMETRY: DroneTelemetry = {
  droneId: 'HWANGE-SCOUT-01',
  droneModel: 'DJI Matrice 350 RTK (Safari Spec)',
  latitude: -18.6292,
  longitude: 26.9501,
  altitude: 124.5,
  targetAltitude: 120.0,
  speed: 18.4,
  heading: 42,
  pitch: -3.2,
  roll: 1.8,
  yaw: 42.0,
  gimbalPitch: -38.5,
  batteryPercentage: 78,
  batteryVoltage: 23.4,
  flightTimeRemainingMin: 28,
  signalStrength: 96,
  signalType: 'Starlink Uplink',
  satelliteCount: 22,
  rtkStatus: 'FIXED',
  isLive: false,
  dataMode: 'simulated',
  flightMode: 'AUTONOMOUS PATROL',
  temperatureC: 28.5,
  windSpeedKmh: 14.2,
  windDirection: 'ENE',
  distanceFromHomeM: 1420
};

export const MOCK_WILDLIFE_CATALOG: WildlifeDetection[] = [
  {
    id: 'det-01',
    species: 'Loxodonta africana',
    commonName: 'African Bush Elephant',
    scientificName: 'Loxodonta africana',
    confidence: 0.96,
    count: 6,
    box: {
      x: 32,
      y: 42,
      width: 24,
      height: 28
    },
    distanceFromDroneM: 145,
    behavior: 'Active herd migration towards Mandavu Pan water reservoir',
    conservationStatus: 'Endangered',
    habitat: 'Savannas, grasslands, and miombo woodlands',
    diet: 'Herbivore (grasses, foliage, bark, and roots - up to 150kg/day)',
    description: 'The African bush elephant is the largest living terrestrial animal. Elephants are keystone ecosystem engineers in Hwange, digging dry riverbeds to expose subterranean water for other species.',
    funFact: 'Elephants communicate over miles using low-frequency infrasound that travels through the earth and is felt through their feet.',
    imageUrl: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=800&q=80',
    timestamp: '14:28:12',
    source: 'simulated',
    modelVersion: 'YOLOv8-Wildlife-v1-sim'
  },
  {
    id: 'det-02',
    species: 'Giraffa camelopardalis',
    commonName: 'Southern Giraffe',
    scientificName: 'Giraffa camelopardalis giraffa',
    confidence: 0.94,
    count: 3,
    box: {
      x: 64,
      y: 28,
      width: 16,
      height: 38
    },
    distanceFromDroneM: 180,
    behavior: 'Browsing acacia canopy foliage; lookout posturing',
    conservationStatus: 'Vulnerable',
    habitat: 'Acacia savanna and open woodlands',
    diet: 'Herbivorous folivore (primarily Acacia and Commiphora leaves)',
    description: 'Towering above the scrub canopy, giraffes in Hwange utilize their 45cm prehensile blue-black tongues to strip thorned acacia branches with pinpoint precision.',
    funFact: 'A giraffe heart weighs about 11 kg (25 lb) and generates double the blood pressure of a human to pump blood up its 2-meter neck.',
    imageUrl: 'https://images.unsplash.com/photo-1547721064-da6cfb341d50?auto=format&fit=crop&w=800&q=80',
    timestamp: '14:26:40',
    source: 'simulated',
    modelVersion: 'YOLOv8-Wildlife-v1-sim'
  },
  {
    id: 'det-03',
    species: 'Panthera leo',
    commonName: 'African Lion (Pride)',
    scientificName: 'Panthera leo',
    confidence: 0.91,
    count: 4,
    box: {
      x: 18,
      y: 62,
      width: 20,
      height: 18
    },
    distanceFromDroneM: 210,
    behavior: 'Resting in shaded termite mound thicket; awaiting dusk hunt',
    conservationStatus: 'Vulnerable',
    habitat: 'Savanna grasslands and scrub woodland',
    diet: 'Apex carnivore (zebras, wildebeest, buffalo)',
    description: 'The famed Hwange lion prides are monitored by conservation telemetry collaring projects. This pride is resting during peak afternoon heat.',
    funFact: 'A lion roar can reach 114 decibels and can be heard from up to 8 kilometers (5 miles) away across the savanna.',
    imageUrl: 'https://images.unsplash.com/photo-1614027164847-1b28cfe1df60?auto=format&fit=crop&w=800&q=80',
    timestamp: '14:22:15',
    source: 'simulated',
    modelVersion: 'YOLOv8-Wildlife-v1-sim'
  },
  {
    id: 'det-04',
    species: 'Equus quagga',
    commonName: 'Plains Zebra',
    scientificName: 'Equus quagga',
    confidence: 0.89,
    count: 12,
    box: {
      x: 52,
      y: 58,
      width: 22,
      height: 22
    },
    distanceFromDroneM: 165,
    behavior: 'Grazing in open pan clearing alongside impalas',
    conservationStatus: 'Near Threatened',
    habitat: 'Treeless grasslands and savanna woodlands',
    diet: 'Herbivore (coarse grasses)',
    description: 'A dazzle of plains zebras grazing peacefully. Each zebra striping pattern is as unique as a human fingerprint, disrupting predator depth perception.',
    funFact: 'Zebras sleep standing up, and only sleep when neighbors are around to warn them of approaching predators.',
    imageUrl: 'https://images.unsplash.com/photo-1509728143841-416756a3eed8?auto=format&fit=crop&w=800&q=80',
    timestamp: '14:19:05',
    source: 'simulated',
    modelVersion: 'YOLOv8-Wildlife-v1-sim'
  }
];

export const CAMERA_STREAMS: SafariCameraStream[] = [
  {
    id: 'stream-alpha',
    name: 'Drone Scout Alpha — Mandavu Pan Corridor',
    locationName: 'Hwange National Park (Sector 4)',
    description: 'Aerial patrol covering the main elephant migration route towards the central water pans.',
    coordinates: [-18.6292, 26.9501],
    videoUrl: '/videos/safari-feed-alpha.webm',
    posterUrl: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80',
    quality: '4K Ultra HD',
    bitrateMbps: 16.2,
    streamStatus: 'demo',
    detectedWildlife: [MOCK_WILDLIFE_CATALOG[0], MOCK_WILDLIFE_CATALOG[1]]
  },
  {
    id: 'stream-bravo',
    name: 'Drone Scout Bravo — Sinamatella Ridge',
    locationName: 'Sinamatella Hills (North Rim)',
    description: 'High-altitude ridge reconnaissance tracking lion prides and ungulate herds across granite kopjes.',
    coordinates: [-18.5830, 26.3120],
    videoUrl: '/videos/safari-feed-bravo.webm',
    posterUrl: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=1200&q=80',
    quality: '4K Ultra HD',
    bitrateMbps: 14.8,
    streamStatus: 'demo',
    detectedWildlife: [MOCK_WILDLIFE_CATALOG[2], MOCK_WILDLIFE_CATALOG[3]]
  },
  {
    id: 'stream-charlie',
    name: 'Perimeter Scout Charlie — Nyamandhlovu Pan',
    locationName: 'Nyamandhlovu Viewing Platform',
    description: 'Stationary high-gain optical mast overlooking prime drinking waterhole.',
    coordinates: [-18.7100, 27.0200],
    videoUrl: '/videos/safari-feed-charlie.webm',
    posterUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=1200&q=80',
    quality: '1080p 60fps',
    bitrateMbps: 9.6,
    streamStatus: 'demo',
    detectedWildlife: [MOCK_WILDLIFE_CATALOG[0], MOCK_WILDLIFE_CATALOG[3]]
  }
];

export const MAP_FEATURES: MapFeature[] = [
  {
    id: 'feat-drone-1',
    type: 'drone',
    title: 'Drone Scout Alpha (Demo Patrol)',
    subtitle: 'Altitude 125m • Speed 18 km/h • 78% Batt',
    coordinates: [-18.6292, 26.9501],
    icon: 'drone'
  },
  {
    id: 'feat-elephants',
    type: 'wildlife',
    title: 'Elephant Herd (6 Adults, 2 Calves)',
    subtitle: 'Direction: Westbound to Mandavu Pan',
    coordinates: [-18.6315, 26.9530],
    icon: 'elephant'
  },
  {
    id: 'feat-giraffes',
    type: 'wildlife',
    title: 'Giraffe Tower (3 individuals)',
    subtitle: 'Acacia grove browsing',
    coordinates: [-18.6260, 26.9470],
    icon: 'giraffe'
  },
  {
    id: 'feat-lions',
    type: 'wildlife',
    title: 'Sinamatella Lion Pride (4)',
    subtitle: 'Resting in shaded kopje',
    coordinates: [-18.6340, 26.9440],
    icon: 'lion'
  },
  {
    id: 'feat-waterhole-1',
    type: 'waterhole',
    title: 'Mandavu Pan Waterhole',
    subtitle: 'Capacity 92% • High animal traffic',
    coordinates: [-18.6380, 26.9580],
    icon: 'waterhole'
  },
  {
    id: 'feat-ranger-1',
    type: 'ranger_station',
    title: 'Main Camp Ranger Post & Drone Dock',
    subtitle: 'RTK Base Station Alpha • Starlink Gateway',
    coordinates: [-18.6210, 26.9390],
    icon: 'ranger'
  }
];
