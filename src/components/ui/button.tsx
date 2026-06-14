import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-[14px] font-medium",
    "tap-ripple ring-offset-background",
    "transition-[transform,background-color,box-shadow,opacity,border-color] duration-[120ms] ease-[cubic-bezier(0.0,0,0.2,1)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-100 disabled:bg-action-disabled disabled:text-action-disabled-foreground disabled:border-action-disabled",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "hover:scale-[1.02] active:scale-[0.97]",
    "select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "btn-sheen bg-gradient-to-b from-action-primary to-[hsl(var(--action-primary-bg-hover))] text-action-primary-foreground border border-action-primary/80 shadow-primary hover:brightness-[1.06] hover:shadow-glow active:brightness-[0.96]",
        destructive:
          "btn-sheen bg-action-danger text-action-danger-foreground border border-action-danger shadow-sm hover:bg-action-danger-hover hover:shadow-md active:bg-action-danger-hover",
        outline:
          "border border-border-strong bg-action-secondary text-action-secondary-foreground shadow-sm hover:bg-action-secondary-hover hover:border-primary/50",
        secondary:
          "bg-action-secondary text-action-secondary-foreground border border-border-subtle shadow-sm hover:bg-action-secondary-hover",
        ghost:
          "bg-transparent border border-transparent text-control-text hover:bg-control-hover hover:text-control-text hover:scale-100 active:scale-[0.98]",
        link:
          "text-primary underline-offset-4 hover:underline hover:scale-100 active:scale-100",
      },
      size: {
        default: "h-10 px-4 py-2 text-[14px]",
        sm:      "h-8 rounded-lg px-3 text-[12px]",
        lg:      "h-12 rounded-xl px-6 text-[15px]",
        icon:    "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
