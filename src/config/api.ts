/**
 * Shared API Configuration for SafariVision Frontend.
 * Ensures all services (Detection, Sightings, Analytics, Decision Support)
 * communicate with the exact same backend endpoint in all environments.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_WILDLIFE_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://127.0.0.1:8000';
