import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { CARD_TAP_ANIMATION, PRESS_TRANSITION } from "@/motion/gestureAnimations";

interface ActionTileProps extends Omit<HTMLMotionProps<"button">, "children"> {
  icon: LucideIcon;
  label: string;
}

const ActionTile = React.memo(
  React.forwardRef<HTMLButtonElement, ActionTileProps>(({ icon: Icon, label, className, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.96 }}
        transition={{ duration: 0.12 }}
        className={cn(
          "group flex aspect-square min-h-24 w-full flex-col items-center justify-center gap-3 rounded-2xl",
          "border border-border-subtle bg-gradient-to-b from-surface-2 to-surface-1 p-4",
          "shadow-card transition-[transform,box-shadow,border-color] duration-180",
          "hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-glow",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          className,
        )}
        {...props}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary transition-transform duration-180 group-hover:scale-105">
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-xs font-semibold text-foreground">{label}</span>
      </motion.button>
    );
  }),
);

ActionTile.displayName = "ActionTile";

export { ActionTile };

