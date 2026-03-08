import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[14px] font-medium",
    "tap-ripple ring-offset-background",
    "transition-[transform,background-color,box-shadow,opacity,border-color] duration-[120ms] ease-[cubic-bezier(0.0,0,0.2,1)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "hover:scale-[1.02] active:scale-[0.97]",
    "select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 hover:shadow-sm active:bg-primary",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
        outline:
          "border border-border-subtle bg-surface-1 text-foreground shadow-xs hover:bg-surface-2 hover:border-border-strong",
        secondary:
          "bg-surface-2 text-foreground border border-border-subtle shadow-xs hover:bg-surface-3",
        ghost:
          "hover:bg-surface-2 text-foreground hover:scale-100 active:scale-[0.98]",
        link:
          "text-primary underline-offset-4 hover:underline hover:scale-100 active:scale-100",
      },
      size: {
        default: "h-9 px-4 py-2 text-[14px]",
        sm:      "h-7 rounded-md px-3 text-[12px]",
        lg:      "h-11 rounded-lg px-6 text-[15px]",
        icon:    "h-9 w-9",
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
