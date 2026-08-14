/**
 * Independence Day treatment for the dashboard hero.
 * Thin wrapper around SeasonalKit so the dashboard keeps a stable API.
 * Renders nothing outside the campaign window.
 */

import {
  SeasonalBadge,
  SeasonalGreeting,
  SeasonalHeroAtmosphere,
  SeasonalLightLine,
  useSeasonal,
} from "@/components/seasonal/SeasonalKit";
import { isIndependenceDayActive, isIndependenceDayItself } from "@/config/seasonal";

export function useIndependenceDay() {
  return { active: isIndependenceDayActive(), isTheDay: isIndependenceDayItself() };
}

/** Cinematic tricolour lighting + cropped chakra, inside a relative hero */
export function IndependenceDayHeroAccent({
  rounded = true,
  chakraSize = 300,
}: {
  rounded?: boolean;
  chakraSize?: number;
}) {
  const { active } = useSeasonal();
  if (!active) return null;

  return (
    <>
      <SeasonalHeroAtmosphere chakraSize={chakraSize} />
      <SeasonalLightLine position="top" />
      {rounded && <SeasonalLightLine position="bottom" className="opacity-60" />}
    </>
  );
}

/** Small premium seasonal chip */
export function IndependenceDayBadge({ className }: { className?: string }) {
  return <SeasonalBadge className={className} />;
}

/** One-line patriotic greeting for the hero */
export function IndependenceDayGreeting({ className }: { className?: string }) {
  return <SeasonalGreeting className={className} />;
}
