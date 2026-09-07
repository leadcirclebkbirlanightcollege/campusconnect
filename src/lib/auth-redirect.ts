/**
 * Deterministically derives the active authentication redirect URL.
 * In production, this always resolves to https://campusconnect.indevs.in.
 * Never redirects production users to localhost or stale deployment URLs.
 */
export const PRODUCTION_ORIGIN = "https://campusconnect.indevs.in";

export function getAuthRedirectUrl(path: string = "/auth/verify"): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin;
    // If running in development (localhost/127.0.0.1), use the local origin for developer testing
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      return `${origin}${cleanPath}`;
    }
    // If running on any production/preview domain, ensure canonical production URL
    if (origin.includes("campusconnect.indevs.in")) {
      return `${PRODUCTION_ORIGIN}${cleanPath}`;
    }
  }

  // Default canonical production URL
  return `${PRODUCTION_ORIGIN}${cleanPath}`;
}
