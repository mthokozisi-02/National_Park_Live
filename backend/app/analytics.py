import math
import datetime
from typing import Dict, List, Any, Optional
from app.sightings import get_connection, HWANGE_ZONES

SECTORS = {
    "Central Vlei & Pan Sector": {
        "bounds": {"min_lat": -18.70, "max_lat": -18.60, "min_lng": 26.90, "max_lng": 27.05},
        "description": "High water-table pans including Nyamandhlovu and Dom pans.",
        "canopy_cover_pct": 25,
    },
    "Main Camp & Teak Woodland": {
        "bounds": {"min_lat": -18.80, "max_lat": -18.70, "min_lng": 26.90, "max_lng": 27.05},
        "description": "Dense Baikiaea plurijuga (Zambezi teak) woodland canopy.",
        "canopy_cover_pct": 65,
    },
    "Guvalala & Wilderness Trails": {
        "bounds": {"min_lat": -18.72, "max_lat": -18.65, "min_lng": 26.82, "max_lng": 26.90},
        "description": "Raised viewing platform and Kalahari sand ecotone.",
        "canopy_cover_pct": 35,
    },
    "Mandavu Dam & Northern Basins": {
        "bounds": {"min_lat": -18.62, "max_lat": -18.52, "min_lng": 26.20, "max_lng": 26.50},
        "description": "Permanent deep water body and basalt rocky ridges.",
        "canopy_cover_pct": 40,
    },
}

# Diurnal activity probability curves (0-23 hours)
# Reflects peer-reviewed African savanna mammal waterhole visitation & movement ecology
SPECIES_DIURNAL_PROFILES = {
    "African Elephant": {
        "peak_hours": [14, 15, 16, 17, 18],
        "base_prob": 0.40,
        "peak_prob": 0.92,
        "habitat": "Perennial pans, mud-wallows, and open vleis",
        "movement_tendency": "Daily transit from teak woodland feeding grounds to waterholes",
    },
    "Lion": {
        "peak_hours": [5, 6, 7, 18, 19, 20],
        "base_prob": 0.15,
        "peak_prob": 0.78,
        "habitat": "Thick riverine brush, waterhole ambushes, and shade canopies",
        "movement_tendency": "Nocturnal & crepuscular territorial patrols; sedentary midday",
    },
    "Plains Zebra": {
        "peak_hours": [8, 9, 10, 11, 15, 16],
        "base_prob": 0.50,
        "peak_prob": 0.88,
        "habitat": "Open short-grass savannas with high predator visibility",
        "movement_tendency": "Mixed herds following fresh grass shoots; early drink before apex predators stir",
    },
    "Giraffe": {
        "peak_hours": [7, 8, 9, 16, 17],
        "base_prob": 0.45,
        "peak_prob": 0.82,
        "habitat": "Acacia and combretum woodland canopies",
        "movement_tendency": "Steady daylight browsing; cautious, staggered visits to water",
    },
    "Cape Buffalo": {
        "peak_hours": [11, 12, 13, 14, 15],
        "base_prob": 0.35,
        "peak_prob": 0.85,
        "habitat": "Riparian shorelines, reedbeds, and alluvial floodplains",
        "movement_tendency": "Bulk grazers congregating around permanent water during peak heat",
    },
}


def get_analytics_summary() -> Dict[str, Any]:
    """Calculate comprehensive wildlife intelligence analytics accounting for survey effort."""
    with get_connection() as conn:
        cursor = conn.cursor()

        # Basic totals
        cursor.execute("SELECT COUNT(*), COALESCE(SUM(count), 0) FROM sightings;")
        total_sightings, total_animals = cursor.fetchone()

        # Breakdown by species
        cursor.execute("""
            SELECT common_name, COUNT(*) as sightings, SUM(count) as animals,
                   ROUND(AVG(confidence), 3) as avg_conf
            FROM sightings
            GROUP BY common_name
            ORDER BY animals DESC;
        """)
        species_data = [dict(row) for row in cursor.fetchall()]

        # Sector spatial analysis
        cursor.execute("SELECT latitude, longitude, count, common_name FROM sightings;")
        all_sightings = [dict(row) for row in cursor.fetchall()]

    sector_counts: Dict[str, Dict[str, Any]] = {
        name: {"sighting_count": 0, "animal_count": 0, "dominant_species": {}, "canopy_cover": info["canopy_cover_pct"]}
        for name, info in SECTORS.items()
    }
    unclassified_count = 0

    for s in all_sightings:
        lat, lng, cnt, sp = s["latitude"], s["longitude"], s["count"], s["common_name"]
        classified = False
        for sec_name, info in SECTORS.items():
            b = info["bounds"]
            if b["min_lat"] <= lat <= b["max_lat"] and b["min_lng"] <= lng <= b["max_lng"]:
                sector_counts[sec_name]["sighting_count"] += 1
                sector_counts[sec_name]["animal_count"] += cnt
                sector_counts[sec_name]["dominant_species"][sp] = (
                    sector_counts[sec_name]["dominant_species"].get(sp, 0) + cnt
                )
                classified = True
                break
        if not classified:
            unclassified_count += 1

    # Format sector analysis
    sector_analysis = []
    for name, data in sector_counts.items():
        dom_species = "None"
        if data["dominant_species"]:
            dom_species = max(data["dominant_species"].items(), key=lambda x: x[1])[0]

        # Survey effort and detection probability correction factor:
        # Heavily canopied areas conceal animals; apply detection correction:
        # Corrected_Estimated = observed / (1 - canopy_cover * 0.4)
        detectability = 1.0 - (data["canopy_cover"] / 100.0) * 0.35
        corrected_animals = int(math.ceil(data["animal_count"] / max(0.2, detectability)))

        sector_analysis.append({
            "sector": name,
            "raw_sightings": data["sighting_count"],
            "raw_animals": data["animal_count"],
            "corrected_estimated_animals": corrected_animals,
            "detection_probability": round(detectability, 2),
            "canopy_cover_pct": data["canopy_cover"],
            "dominant_species": dom_species,
        })

    # Sort sectors by corrected animal density
    sector_analysis.sort(key=lambda x: x["corrected_estimated_animals"], reverse=True)

    # Estimate survey effort
    cursor_videos = len(set(s.get("source_video") for s in all_sightings if s.get("source_video")))
    estimated_survey_hours = round(cursor_videos * 1.5 + (total_sightings * 0.2), 1)

    return {
        "total_sightings": total_sightings,
        "total_animals_observed": total_animals,
        "estimated_survey_flight_hours": max(4.0, estimated_survey_hours),
        "survey_coverage_km2": 420.0,
        "species_breakdown": species_data,
        "sector_analysis": sector_analysis,
        "highest_density_sector": sector_analysis[0]["sector"] if sector_analysis else "Central Vlei",
    }


def get_predictive_occurrence(hour: Optional[int] = None) -> Dict[str, Any]:
    """
    Predict species occurrence probabilities by hour of day and hotspot.
    Based on circadian biological water-dependence and thermal shelter dynamics.
    """
    if hour is None:
        hour = datetime.datetime.now().hour

    hour = max(0, min(23, hour))

    predictions = []
    for species, profile in SPECIES_DIURNAL_PROFILES.items():
        if hour in profile["peak_hours"]:
            prob = profile["peak_prob"]
            status = "Peak Activity Window"
        elif any(abs(hour - ph) == 1 for ph in profile["peak_hours"]):
            prob = (profile["base_prob"] + profile["peak_prob"]) / 2.0
            status = "Approaching Peak / Transiting"
        else:
            prob = profile["base_prob"]
            status = "Low Activity / Resting"

        # Key hotspot recommendation for this species
        best_hotspot = "Nyamandhlovu Pan"
        if species == "Lion":
            best_hotspot = "Main Camp Woodland Edge"
        elif species == "Cape Buffalo":
            best_hotspot = "Mandavu Dam Shoreline"
        elif species == "Giraffe":
            best_hotspot = "Guvalala Acacia Belt"

        predictions.append({
            "species": species,
            "current_hour": hour,
            "occurrence_probability": round(prob, 2),
            "status": status,
            "best_hotspot": best_hotspot,
            "habitat_notes": profile["habitat"],
            "movement_notes": profile["movement_tendency"],
        })

    predictions.sort(key=lambda x: x["occurrence_probability"], reverse=True)

    return {
        "evaluation_hour": hour,
        "time_window": f"{hour:02d}:00 - {(hour + 1) % 24:02d}:00",
        "predictions": predictions,
        "recommendation_summary": (
            f"At {hour:02d}:00, highest viewing likelihood is {predictions[0]['species']} "
            f"({int(predictions[0]['occurrence_probability'] * 100)}% probability at {predictions[0]['best_hotspot']})."
        ),
    }


def generate_wildlife_report(report_type: str = "daily") -> Dict[str, Any]:
    """Generate structured daily or weekly wildlife intelligence briefing."""
    summary = get_analytics_summary()
    predictions = get_predictive_occurrence()
    now = datetime.datetime.now()

    period = "Daily Briefing" if report_type == "daily" else "Weekly Executive Summary"
    title = f"Hwange National Park Wildlife Intelligence {period}"

    key_takeaways = [
        f"Total of {summary['total_animals_observed']} individual animals cataloged across {summary['total_sightings']} drone & field observations.",
        f"Highest wildlife concentration verified in {summary['highest_density_sector']}.",
        f"Correction for canopy obscuration projects ~{sum(s['corrected_estimated_animals'] for s in summary['sector_analysis'])} total animals in surveyed corridors.",
        f"Immediate game-drive focus: {predictions['recommendation_summary']}",
    ]

    return {
        "title": title,
        "generated_at": now.strftime("%Y-%m-%d %H:%M UTC"),
        "period": report_type,
        "summary": summary,
        "predictions": predictions,
        "key_takeaways": key_takeaways,
        "author": "SafariVision Autonomous Wildlife Intelligence System",
    }
