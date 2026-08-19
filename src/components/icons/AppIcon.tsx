import * as React from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { SEMANTIC_ICON_MAP, type SemanticIconName, LUCIDE_TO_HUGEICON_MAP } from "./icon-map";
import { cn } from "@/lib/utils";

export type IconSizeToken = "micro" | "sm" | "default" | "nav" | "lg" | "hero";

const SIZE_MAP: Record<IconSizeToken, number> = {
  micro: 12,    // Tiny metadata / status indicators
  sm: 16,       // Inline text / action icons / table actions
  default: 18,  // Buttons / compact controls
  nav: 20,      // Primary sidebar / bottom navigation
  lg: 24,       // Card headers / major actions
  hero: 36,     // Feature / empty-state illustrations
};

export interface AppIconProps extends React.SVGProps<SVGSVGElement> {
  /** Semantic name from the icon system or direct Hugeicon definition */
  name?: SemanticIconName | string;
  /** Direct Hugeicons icon element (overrides `name` if supplied) */
  icon?: IconSvgElement;
  /**
   * Sizing system:
   * - "micro": 12px
   * - "sm": 16px
   * - "default": 18px
   * - "nav": 20px
   * - "lg": 24px
   * - "hero": 36px
   * Or a direct number / string in px.
   */
  size?: IconSizeToken | number | string;
  /** Stroke weight (default: 1.5 for stroke-rounded) */
  strokeWidth?: number;
  /** High emphasis / active state */
  active?: boolean;
  /** Icon visual variant */
  variant?: "stroke" | "solid" | "duotone";
  /** Optional accessible label (if icon is interactive or standalone) */
  label?: string;
  /** Additional CSS class names */
  className?: string;
  /** Icon color (defaults to currentColor) */
  color?: string;
}

export const AppIcon = React.forwardRef<SVGSVGElement, AppIconProps>(
  (
    {
      name,
      icon,
      size = "default",
      strokeWidth = 1.5,
      active = false,
      variant = "stroke",
      label,
      className,
      color = "currentColor",
      ...props
    },
    ref
  ) => {
    // Resolve pixel size
    const resolvedSize =
      typeof size === "string" && size in SIZE_MAP
        ? SIZE_MAP[size as IconSizeToken]
        : size;

    // Resolve icon SVG element
    let targetIcon: IconSvgElement | null = icon ?? null;

    if (!targetIcon && name) {
      if (name in SEMANTIC_ICON_MAP) {
        const pair = SEMANTIC_ICON_MAP[name as SemanticIconName];
        targetIcon = active ? pair.active : pair.inactive;
      } else if (name in LUCIDE_TO_HUGEICON_MAP) {
        targetIcon = LUCIDE_TO_HUGEICON_MAP[name];
      }
    }

    // Fallback if no valid icon found
    if (!targetIcon) {
      targetIcon = SEMANTIC_ICON_MAP.help.inactive;
    }

    // Active state stroke boost for subtle emphasis if not using a solid variant
    const resolvedStrokeWidth = active ? (strokeWidth < 2 ? 2.0 : strokeWidth) : strokeWidth;

    return (
      <HugeiconsIcon
        ref={ref}
        icon={targetIcon}
        size={resolvedSize}
        strokeWidth={resolvedStrokeWidth}
        color={color}
        aria-hidden={label ? undefined : true}
        aria-label={label}
        role={label ? "img" : undefined}
        className={cn(
          "inline-block shrink-0 align-middle transition-colors duration-150",
          className
        )}
        {...props}
      />
    );
  }
);

AppIcon.displayName = "AppIcon";
export default AppIcon;
