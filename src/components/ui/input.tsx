import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-border-strong bg-input-bg text-input-text px-3.5 py-2 text-base ring-offset-background input-premium",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-input-placeholder",
          "focus-visible:outline-none focus-visible:ring-0 focus-visible:border-primary",
          "disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-action-disabled disabled:text-action-disabled-foreground md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
