/**
 * Campus Connect Platform Feature Flags
 *
 * Central feature switches for launch-period and transitional features.
 */

/**
 * TEMPORARY LAUNCH FEATURE: Guest Stall Registration
 *
 * During the initial launch of Campus Connect (e.g. Startup Mela with Bappa),
 * students can register for event stalls without being signed in.
 *
 * Set to `false` after the launch period to enforce the standard requirement
 * that students must be authenticated before registering a stall.
 *
 * NOTE: Do NOT auto-remove or date-expire this flag. It must be manually
 * toggled by the project team when the launch grace period concludes.
 */
export const GUEST_STALL_REGISTRATION_ENABLED = true;
