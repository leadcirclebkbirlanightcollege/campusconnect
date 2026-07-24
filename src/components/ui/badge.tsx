import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-tight transition-colors duration-fast focus:outline-none focus:ring-2 focus:ring-primary/40",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/12 text-primary hover:bg-primary/18",
        solid:
          "border-transparent bg-primary text-primary-foreground shadow-[0_4px_10px_-4px_hsl(var(--primary)/0.5)] hover:brightness-[1.05]",
        secondary:
          "border-border-subtle bg-surface-2 text-foreground/80 hover:bg-surface-3",
        success:
          "border-transparent bg-success/12 text-success hover:bg-success/18",
        warning:
          "border-transparent bg-warning/15 text-warning hover:bg-warning/22",
        destructive:
          "border-transparent bg-danger/12 text-danger hover:bg-danger/18",
        outline:
          "border-border-strong bg-transparent text-foreground hover:border-primary/50 hover:text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
