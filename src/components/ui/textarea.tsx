import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[96px] w-full rounded-2xl border border-border-subtle bg-input-bg text-input-text",
        "px-4 py-3 text-[15px] leading-relaxed",
        "ring-offset-background transition-[border-color,box-shadow,background-color] duration-150",
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
});
Textarea.displayName = "Textarea";

export { Textarea };
