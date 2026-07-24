import * as React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds hover lift, border glow, and press feedback for clickable cards. */
  interactive?: boolean;
  /** Visual tone — 'plain' = flat white, 'raised' = soft shadow (default), 'glass' = translucent. */
  tone?: "plain" | "raised" | "glass";
}

const TONE: Record<NonNullable<CardProps["tone"]>, string> = {
  plain:  "bg-surface-1 border border-border-subtle",
  raised: "bg-surface-1 border border-border-subtle shadow-[0_1px_2px_hsl(var(--foreground)/0.04),0_8px_24px_-16px_hsl(var(--foreground)/0.12)]",
  glass:  "glass-surface border border-border-subtle/70",
};

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, tone = "raised", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-[20px] transition-all duration-base ease-out",
        TONE[tone],
        interactive && "cursor-pointer active:scale-[0.985] active:brightness-[0.99] hover:-translate-y-0.5 hover:shadow-[0_2px_4px_hsl(var(--foreground)/0.05),0_16px_36px_-18px_hsl(var(--foreground)/0.18)]",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-5", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("font-heading text-[17px] font-bold leading-tight tracking-[-0.01em] text-foreground", className)}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-[13px] leading-relaxed text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-5 pb-5 pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center px-5 pb-5 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
