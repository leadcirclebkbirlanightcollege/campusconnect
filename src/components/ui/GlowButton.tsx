import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { BUTTON_TAP_ANIMATION, PRESS_TRANSITION } from "@/motion/gestureAnimations";

type GlowButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  children?: React.ReactNode;
};

const GlowButton = React.memo(
  React.forwardRef<HTMLButtonElement, GlowButtonProps>(({ className, children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.12 }}
        className={cn(
          "relative isolate inline-flex h-12 min-w-[120px] items-center justify-center overflow-hidden rounded-xl px-5",
          "text-sm font-semibold text-primary-foreground",
          "bg-gradient-to-r from-primary to-primary/80",
          "border border-primary/40 shadow-glow",
          "transition-[transform,box-shadow,opacity] duration-180",
          "hover:shadow-[0_0_24px_hsl(var(--primary)/0.42)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-60",
          "after:absolute after:left-1/2 after:top-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:-translate-y-1/2",
          "after:rounded-full after:bg-primary-foreground/30 after:opacity-0 after:transition-all after:duration-180",
          "active:after:h-24 active:after:w-24 active:after:opacity-100",
          className,
        )}
        {...props}
      >
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/0 via-primary-foreground/10 to-primary-foreground/5" />
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </motion.button>
    );
  }),
);

GlowButton.displayName = "GlowButton";

export { GlowButton };

