import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const glassCardVariants = cva(
  [
    "relative overflow-hidden border border-border-subtle/80",
    "bg-gradient-to-br from-surface-2/90 via-surface-1/85 to-surface-3/75",
    "backdrop-blur-md",
    "transition-[transform,box-shadow,border-color] duration-180",
  ].join(" "),
  {
    variants: {
      padding: {
        none: "p-0",
        sm: "p-3",
        md: "p-4",
        lg: "p-6",
      },
      radius: {
        md: "rounded-xl",
        lg: "rounded-2xl",
        xl: "rounded-[20px]",
      },
      elevation: {
        low: "shadow-soft",
        medium: "shadow-card",
        high: "shadow-elevated",
      },
      hover: {
        true: "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-glow",
        false: "",
      },
    },
    defaultVariants: {
      padding: "md",
      radius: "lg",
      elevation: "medium",
      hover: true,
    },
  },
);

export interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {}

const GlassCard = React.memo(
  React.forwardRef<HTMLDivElement, GlassCardProps>(
    ({ className, padding, radius, elevation, hover, children, ...props }, ref) => {
      return (
        <div
          ref={ref}
          className={cn(glassCardVariants({ padding, radius, elevation, hover }), className)}
          {...props}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/8 via-transparent to-transparent" />
          <div className="relative">{children}</div>
        </div>
      );
    },
  ),
);

GlassCard.displayName = "GlassCard";

export { GlassCard, glassCardVariants };
