import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { useMetricCountUp } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  icon: LucideIcon;
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  className?: string;
}

const MetricCard = React.memo(function MetricCard({
  icon: Icon,
  value,
  label,
  prefix = "",
  suffix = "",
  className,
}: MetricCardProps) {
  const animatedValue = useMetricCountUp(value);

  return (
    <article
      className={cn(
        "rounded-2xl border border-border-subtle bg-surface-1/90 p-4 shadow-card",
        "transition-[transform,box-shadow] duration-180 hover:-translate-y-0.5 hover:shadow-elevated",
        className,
      )}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <p className="font-heading text-[28px] font-black leading-none text-foreground tabular-nums">
        {prefix}
        {animatedValue}
        {suffix}
      </p>
      <p className="mt-1 font-heading text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
    </article>
  );
});

export { MetricCard };
