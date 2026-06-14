import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-tight shadow-xs transition-all duration-fast focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-primary/30 bg-gradient-to-b from-primary to-[hsl(var(--primary-hover))] text-primary-foreground shadow-primary hover:brightness-[1.06]",
        secondary:
          "border-border-subtle bg-gradient-to-b from-surface-2 to-surface-1 text-secondary-foreground hover:border-border-strong",
        destructive:
          "border-destructive/40 bg-gradient-to-b from-destructive to-[hsl(var(--action-danger-hover))] text-destructive-foreground hover:brightness-[1.06]",
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
