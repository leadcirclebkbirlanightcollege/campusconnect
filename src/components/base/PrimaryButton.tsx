/**
 * PrimaryButton — gradient CTA with loading & icon support
 *
 * Usage:
 *   <PrimaryButton>Save Changes</PrimaryButton>
 *   <PrimaryButton variant="ghost" size="sm">Cancel</PrimaryButton>
 *   <PrimaryButton loading>Saving...</PrimaryButton>
 */

import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "gradient" | "solid" | "outline" | "ghost" | "danger" | "success";
type ButtonSize    = "xs" | "sm" | "md" | "lg" | "xl";

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:      ButtonVariant;
  size?:         ButtonSize;
  loading?:      boolean;
  icon?:         React.ReactNode;
  iconRight?:    React.ReactNode;
  fullWidth?:    boolean;
  /** Adds glow shadow on hover */
  glow?:         boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  gradient: "btn-gradient text-action-primary-foreground border border-action-primary",
  solid:    "bg-action-primary text-action-primary-foreground border border-action-primary hover:bg-action-primary-hover shadow-primary",
  outline:  "border border-border-strong bg-action-secondary text-action-secondary-foreground hover:bg-action-secondary-hover",
  ghost:    "border border-transparent bg-transparent text-control-text hover:bg-control-hover",
  danger:   "bg-action-danger text-action-danger-foreground border border-action-danger hover:bg-action-danger-hover",
  success:  "bg-success text-success-foreground border border-success hover:bg-success/90",
};

const SIZES: Record<ButtonSize, string> = {
  xs: "h-8  px-3   text-[11px] rounded-lg  gap-1.5 font-semibold",
  sm: "h-9  px-3.5 text-[12px] rounded-lg  gap-1.5 font-medium",
  md: "h-11 px-4   text-[13px] rounded-xl  gap-2   font-medium  min-h-[48px]",
  lg: "h-13 px-5   text-[15px] rounded-xl  gap-2   font-semibold min-h-[52px]",
  xl: "h-14 px-6   text-[16px] rounded-2xl gap-2.5 font-semibold min-h-[56px]",
};

export function PrimaryButton({
  children,
  variant  = "gradient",
  size     = "md",
  loading  = false,
  icon,
  iconRight,
  fullWidth = false,
  glow      = false,
  className,
  disabled,
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center",
        "transition-all duration-[120ms] ease-[cubic-bezier(0,0,0.2,1)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        "disabled:opacity-100 disabled:pointer-events-none disabled:bg-action-disabled disabled:text-action-disabled-foreground disabled:border-action-disabled",
        "select-none",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        glow && !disabled && !loading && "hover:shadow-glow",
        className,
      )}
    >
      {loading ? (
        <>
          <span className="h-4 w-4 rounded-full border-2 border-current/30 border-t-current animate-spin shrink-0" />
          {children && <span className="ml-2 opacity-70">{children}</span>}
        </>
      ) : (
        <>
          {icon     && <span className="shrink-0">{icon}</span>}
          {children}
          {iconRight && <span className="shrink-0">{iconRight}</span>}
        </>
      )}
    </button>
  );
}
