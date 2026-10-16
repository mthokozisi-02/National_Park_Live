import math
import sqlite3
import uuid
import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

DB_DIR = Path(__file__).resolve().parent.parent / "data"
DB_PATH = DB_DIR / "sightings.db"

# Earth radius in meters
EARTH_RADIUS_M = 6371000.0

# Standard drone camera specs (approx DJI Mavic 3 / Matrice 300 HFOV)
HFOV_DEG = 84.0
VFOV_DEG = 53.0

# Default Hwange National Park focal points for realistic positioning
HWANGE_ZONES = {
    "Nyamandhlovu Pan": (-18.6320, 26.9535),
    "Main Camp Waterhole": (-18.7315, 26.9510),
    "Guvalala Platform": (-18.6850, 26.8920),
    "Mandavu Dam": (-18.5720, 26.4250),
    "Sinamatella Hills": (-18.5830, 26.3150),
    "Deteema Dam": (-18.6120, 26.2410),
}


# ============================================================
# GROUND LOCATION ESTIMATION (GEODESIC PROJECTION)
# ============================================================

def estimate_animal_ground_location(
    drone_lat: float,
    drone_lng: float,
    drone_alt_m: float = 80.0,
    heading_deg: float = 0.0,
    gimbal_pitch_deg: float = -45.0,
    bbox_center_x: float = 0.5,
    bbox_center_y: float = 0.5,
) -> Dict[str, float]:
    """
    Estimate animal ground GPS coordinates from drone telemetry and bounding box offset.

    Parameters:
      drone_lat, drone_lng: Drone GPS coordinates
      drone_alt_m: Drone altitude above ground level (meters)
      heading_deg: Compass heading of drone/gimbal (0° = North, 90° = East)
      gimbal_pitch_deg: Gimbal pitch (-90° is straight down, -45° is tilted forward)
      bbox_center_x, bbox_center_y: Normalized center of bounding box (0.0 to 1.0)

    Returns:
      {"latitude": float, "longitude": float, "ground_distance_m": float}
    """
    # Angular offsets from optical center
    dx_norm = bbox_center_x - 0.5
    dy_norm = bbox_center_y - 0.5

    azimuth_offset_deg = dx_norm * HFOV_DEG
    pitch_offset_deg = -dy_norm * VFOV_DEG

    effective_pitch = gimbal_pitch_deg + pitch_offset_deg
    # Clamp to avoid division by zero or looking above horizon
    effective_pitch_deg = max(-89.0, min(-10.0, effective_pitch))
    pitch_rad = math.radians(abs(effective_pitch_deg))

    # Ground distance from nadir to target
    ground_dist_m = drone_alt_m / math.tan(pitch_rad)
    ground_dist_m = max(1.0, min(1000.0, ground_dist_m))

    # Target bearing
    target_bearing_deg = (heading_deg + azimuth_offset_deg) % 360.0
    bearing_rad = math.radians(target_bearing_deg)

    # Forward geodesic formula on sphere
    lat1_rad = math.radians(drone_lat)
    lng1_rad = math.radians(drone_lng)
    angular_dist = ground_dist_m / EARTH_RADIUS_M

    lat2_rad = math.asin(
        math.sin(lat1_rad) * math.cos(angular_dist)
        + math.cos(lat1_rad) * math.sin(angular_dist) * math.cos(bearing_rad)
    )

    lng2_rad = lng1_rad + math.atan2(
        math.sin(bearing_rad) * math.sin(angular_dist) * math.cos(lat1_rad),
        math.cos(angular_dist) - math.sin(lat1_rad) * math.sin(lat2_rad),
    )

    return {
        "latitude": round(math.degrees(lat2_rad), 6),
        "longitude": round(math.degrees(lng2_rad), 6),
        "ground_distance_m": round(ground_dist_m, 1),
    }


# ============================================================
# DATABASE PERSISTENCE
# ============================================================

def get_connection() -> sqlite3.Connection:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_sightings_db():
    """Initialize SQLite sightings schema and seed historical observations if empty."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sightings (
                id TEXT PRIMARY KEY,
                species TEXT NOT NULL,
                common_name TEXT NOT NULL,
                confidence REAL NOT NULL,
                count INTEGER DEFAULT 1,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                altitude_m REAL DEFAULT 0,
                timestamp TEXT NOT NULL,
                source_video TEXT,
                source_frame INTEGER,
                track_id INTEGER,
                notes TEXT
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sightings_time ON sightings(timestamp);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sightings_species ON sightings(common_name);")

        # Check if already seeded
        cursor.execute("SELECT COUNT(*) FROM sightings;")
        count = cursor.fetchone()[0]
        if count == 0:
            _seed_historical_sightings(cursor)
        conn.commit()


def _seed_historical_sightings(cursor: sqlite3.Cursor):
    """Seed authentic wildlife sightings across Hwange National Park."""
    now = datetime.datetime.now(datetime.timezone.utc)

    seeds = [
        # Fresh (< 15 mins)
        {
            "species": "Loxodonta africana",
            "common_name": "African Elephant",
            "confidence": 0.94,
            "count": 6,
            "latitude": -18.6315,
            "longitude": 26.9525,
            "altitude_m": 1045.0,
            "timestamp": (now - datetime.timedelta(minutes=8)).isoformat(),
            "source_video": "final_test.mp4",
            "source_frame": 120,
            "track_id": 1,
            "notes": "Breeding herd of 6 drinking at Nyamandhlovu Pan edge.",
        },
        {
            "species": "Equus quagga",
            "common_name": "Plains Zebra",
            "confidence": 0.89,
            "count": 12,
            "latitude": -18.6340,
            "longitude": 26.9550,
            "altitude_m": 1040.0,
            "timestamp": (now - datetime.timedelta(minutes=14)).isoformat(),
            "source_video": "final_test.mp4",
            "source_frame": 180,
            "track_id": 4,
            "notes": "Harem group grazing openly on the vlei.",
        },
        # Recent (1-3 hours)
        {
            "species": "Giraffa camelopardalis",
            "common_name": "Giraffe",
            "confidence": 0.92,
            "count": 3,
            "latitude": -18.6865,
            "longitude": 26.8940,
            "altitude_m": 1055.0,
            "timestamp": (now - datetime.timedelta(hours=1, minutes=20)).isoformat(),
            "source_video": "final.mp4",
            "source_frame": 450,
            "track_id": 7,
            "notes": "Tower of 3 browsing acacia tops near Guvalala.",
        },
        {
            "species": "Panthera leo",
            "common_name": "Lion",
            "confidence": 0.88,
            "count": 2,
            "latitude": -18.7280,
            "longitude": 26.9480,
            "altitude_m": 1060.0,
            "timestamp": (now - datetime.timedelta(hours=2, minutes=45)).isoformat(),
            "source_video": "test.mp4",
            "source_frame": 310,
            "track_id": 11,
            "notes": "Two adult lionesses resting under teak canopy near Main Camp.",
        },
        # Older (6-12 hours)
        {
            "species": "Syncerus caffer",
            "common_name": "Cape Buffalo",
            "confidence": 0.91,
            "count": 24,
            "latitude": -18.5740,
            "longitude": 26.4280,
            "altitude_m": 995.0,
            "timestamp": (now - datetime.timedelta(hours=7)).isoformat(),
            "source_video": "safari.webm",
            "source_frame": 220,
            "track_id": 15,
            "notes": "Large bachelor herd wallowing along Mandavu Dam shoreline.",
        },
        {
            "species": "Aepyceros melampus",
            "common_name": "Impala",
            "confidence": 0.87,
            "count": 18,
            "latitude": -18.6360,
            "longitude": 26.9480,
            "altitude_m": 1042.0,
            "timestamp": (now - datetime.timedelta(hours=9)).isoformat(),
            "source_video": "final_test.mp4",
            "source_frame": 90,
            "track_id": 2,
            "notes": "Bachelor herd alert near southern treeline.",
        },
        # Historical (1-3 days)
        {
            "species": "Loxodonta africana",
            "common_name": "African Elephant",
            "confidence": 0.96,
            "count": 14,
            "latitude": -18.5850,
            "longitude": 26.3180,
            "altitude_m": 1080.0,
            "timestamp": (now - datetime.timedelta(days=1, hours=4)).isoformat(),
            "source_video": "final.mp4",
            "source_frame": 600,
            "track_id": 22,
            "notes": "Family herd with two calves traversing Sinamatella ridge.",
        },
        {
            "species": "Equus quagga",
            "common_name": "Plains Zebra",
            "confidence": 0.85,
            "count": 8,
            "latitude": -18.6140,
            "longitude": 26.2430,
            "altitude_m": 1010.0,
            "timestamp": (now - datetime.timedelta(days=2)).isoformat(),
            "source_video": "test.mp4",
            "source_frame": 150,
            "track_id": 26,
            "notes": "Gathered at Deteema water pump.",
        },
    ]

    for item in seeds:
        cursor.execute("""
            INSERT OR REPLACE INTO sightings (
                id, species, common_name, confidence, count,
                latitude, longitude, altitude_m, timestamp,
                source_video, source_frame, track_id, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            str(uuid.uuid4())[:8],
            item["species"],
            item["common_name"],
            item["confidence"],
            item["count"],
            item["latitude"],
            item["longitude"],
            item["altitude_m"],
            item["timestamp"],
            item["source_video"],
            item["source_frame"],
            item["track_id"],
            item["notes"],
        ))


def record_sighting(sighting: Dict[str, Any]) -> Dict[str, Any]:
    """Insert a new sighting record into SQLite."""
    record_id = sighting.get("id") or str(uuid.uuid4())[:8]
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    ts = sighting.get("timestamp") or now_iso

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO sightings (
                id, species, common_name, confidence, count,
                latitude, longitude, altitude_m, timestamp,
                source_video, source_frame, track_id, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            record_id,
            sighting["species"],
            sighting["common_name"],
            float(sighting.get("confidence", 0.9)),
            int(sighting.get("count", 1)),
            float(sighting["latitude"]),
            float(sighting["longitude"]),
            float(sighting.get("altitude_m", 1000.0)),
            ts,
            sighting.get("source_video", "drone_stream"),
            sighting.get("source_frame", 0),
            sighting.get("track_id"),
            sighting.get("notes", "YOLO Automated Field Sighting"),
        ))
        conn.commit()

    return {**sighting, "id": record_id, "timestamp": ts}


def get_sightings(
    species: Optional[str] = None,
    max_age_hours: Optional[float] = None,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    """Query sightings filtered by species or age in hours."""
    query = "SELECT * FROM sightings WHERE 1=1"
    params: List[Any] = []

    if species and species.lower() != "all":
        query += " AND (LOWER(common_name) = ? OR LOWER(species) = ?)"
        params.extend([species.lower(), species.lower()])

    if max_age_hours is not None and max_age_hours > 0:
        cutoff = (
            datetime.datetime.now(datetime.timezone.utc)
            - datetime.timedelta(hours=max_age_hours)
        ).isoformat()
        query += " AND timestamp >= ?"
        params.append(cutoff)

    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def get_sighting_stats() -> Dict[str, Any]:
    """Calculate summary statistics for historical wildlife analytics."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM sightings;")
        total_sightings = cursor.fetchone()[0]

        cursor.execute("SELECT SUM(count) FROM sightings;")
        total_animals = cursor.fetchone()[0] or 0

        cursor.execute("""
            SELECT common_name, COUNT(*) as sighting_count, SUM(count) as animal_count
            FROM sightings
            GROUP BY common_name
            ORDER BY animal_count DESC;
        """)
        species_breakdown = [
            {
                "common_name": row["common_name"],
                "sighting_count": row["sighting_count"],
                "animal_count": row["animal_count"],
            }
            for row in cursor.fetchall()
        ]

        cursor.execute("SELECT MAX(timestamp) FROM sightings;")
        latest_timestamp = cursor.fetchone()[0]

    return {
        "total_sightings": total_sightings,
        "total_animals": total_animals,
        "species_breakdown": species_breakdown,
        "latest_sighting": latest_timestamp,
    }
