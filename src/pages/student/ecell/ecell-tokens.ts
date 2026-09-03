/**
 * E-Cell Official Brand Identity Design Tokens
 * B. K. Birla Night College, Kalyan
 *
 * Primary:          #FCE541 — Sunflower Yellow
 * Primary Dark:     #C08634 — Warm Gold
 * Secondary Accent: #FAD943 — Golden Yellow
 * Text Primary:     #000000 — Black
 * Text Secondary:   #593018 — Deep Brown
 * Background:       #FAF9F7 — Off White
 * Surface:          #FFFFFF — Clean White
 * Border:           #E8D98A — Soft Gold Border
 *
 * Tagline: "Vision to Venture"
 */

export const ECELL_PALETTE = {
  primary: "#FCE541",        // Sunflower Yellow
  primaryDark: "#C08634",    // Warm Gold
  secondaryAccent: "#FAD943",// Golden Yellow
  textPrimary: "#000000",    // Black
  textSecondary: "#593018",  // Deep Brown
  background: "#FAF9F7",     // Off White
  surface: "#FFFFFF",        // Pure White
  border: "#E8D98A",         // Soft Gold Border
  // Dark mode adaptations (maintains brand yellow & gold accents while ensuring contrast)
  dark: {
    background: "#11100D",
    surface: "#191713",
    surfaceElevated: "#23201B",
    border: "#3D3523",
    textPrimary: "#FDFDFD",
    textSecondary: "#D8C7A5",
  },
} as const;

export const ECELL_ASSETS = {
  logo: "/ecell-logo.png",
  college: "B. K. Birla Night College, Kalyan",
  organization: "Entrepreneurship Cell",
  tagline: "Vision to Venture",
  version: "1.0.0",
} as const;

/** Shared inline styles and CSS token helpers for E-Cell brand */
export const ecellStyles = {
  primaryButton: {
    backgroundColor: ECELL_PALETTE.primary,
    color: ECELL_PALETTE.textPrimary,
    borderColor: ECELL_PALETTE.primaryDark,
  },
  goldGradient: `linear-gradient(135deg, ${ECELL_PALETTE.primary}, ${ECELL_PALETTE.secondaryAccent})`,
  darkGoldGradient: `linear-gradient(135deg, ${ECELL_PALETTE.primaryDark}, #9A6623)`,
  radialSunflowerGlow: `radial-gradient(circle at 50% 0%, rgba(252, 229, 65, 0.18), transparent 70%)`,
  warmShadow: `0 8px 30px -8px rgba(192, 134, 52, 0.25)`,
  softBorder: `1px solid ${ECELL_PALETTE.border}`,
};
