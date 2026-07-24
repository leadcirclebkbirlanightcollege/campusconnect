import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-2xl border border-border-subtle bg-input-bg text-input-text",
          "px-4 py-2 text-[15px] leading-none",
          "ring-offset-background transition-[border-color,box-shadow,background-color] duration-150",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-input-placeholder placeholder:font-normal",
          "hover:border-border-strong",
          "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/12",
          "disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-action-disabled",
          "md:text-sm",
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
