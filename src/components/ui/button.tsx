import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "@/components/icons";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-[14px] font-medium",
    "tap-ripple ring-offset-background",
    "transition-[background-color,box-shadow,opacity,border-color,filter] duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-60",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "active:brightness-95",
    "select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border border-primary/70 shadow-[0_1px_0_hsl(var(--primary)/0.25)_inset,0_6px_20px_-8px_hsl(var(--primary)/0.55)] hover:brightness-110",
        destructive:
          "bg-action-danger text-action-danger-foreground border border-action-danger shadow-sm hover:brightness-110",
        outline:
          "border border-border-strong bg-action-secondary text-action-secondary-foreground shadow-sm hover:bg-action-secondary-hover hover:border-primary/40",
        secondary:
          "bg-action-secondary text-action-secondary-foreground border border-border-subtle shadow-sm hover:bg-action-secondary-hover",
        ghost:
          "bg-transparent border border-transparent text-control-text hover:bg-control-hover",
        link:
          "text-primary underline-offset-4 hover:underline",
        success:
          "bg-emerald-500 text-white border border-emerald-500 shadow-sm hover:brightness-110",
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
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = disabled || loading;

    // When using asChild (Slot), we cannot inject a spinner sibling — Slot forwards a single child.
    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
