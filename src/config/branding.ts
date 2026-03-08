import logoAsset from "@/assets/logo.png";

/**
 * Centralized branding configuration.
 * Import from here — never hardcode logos anywhere else.
 */
export const BRANDING = {
  name: "Campus Connect",
  tagline: "By Students For Students",
  /** Bundled local logo asset — always available, no network needed */
  logo: logoAsset,
} as const;
