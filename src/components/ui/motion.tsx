/**
 * CAMPUS CONNECT 2.0 — MOTION PRIMITIVES
 *
 * FadeIn        — opacity + translateY fade
 * SlideUp       — slightly more vertical travel
 * MetricCountUp — number counting animation
 *
 * Rules:
 * • Only animate opacity & transform (no layout, no shadow)
 * • Durations: 120–180ms
 * • Respects prefers-reduced-motion (handled in CSS)
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { MOTION_MS, MOTION_SPECIAL_MS } from "@/motion/motionTokens";
import { useCountUp } from "@/motion/microInteractions";

/* ── FadeIn ── */
interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;   // ms
  duration?: number; // ms
  as?: keyof React.JSX.IntrinsicElements;
}

export function FadeIn({
  children,
  className,
  delay = 0,
  duration = MOTION_MS.medium,
  as: Tag = "div",
}: FadeInProps) {
  return (
    <Tag
      className={cn("animate-fade-in", className)}
      style={{
        animationDuration: `${duration}ms`,
        animationDelay: delay ? `${delay}ms` : undefined,
        animationFillMode: "both",
      }}
    >
      {children}
    </Tag>
  );
}

/* ── SlideUp ── */
interface SlideUpProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}

export function SlideUp({
  children,
  className,
  delay = 0,
  duration = MOTION_MS.medium,
}: SlideUpProps) {
  return (
    <div
      className={cn("animate-slide-up", className)}
      style={{
        animationDuration: `${duration}ms`,
        animationDelay: delay ? `${delay}ms` : undefined,
        animationFillMode: "both",
      }}
    >
      {children}
    </div>
  );
}

/* ── MetricCountUp ── */
interface MetricCountUpProps {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number; // ms total
  className?: string;
}

export function MetricCountUp({
  value,
  suffix = "",
  prefix = "",
  duration = MOTION_SPECIAL_MS.metricCount,
  className,
}: MetricCountUpProps) {
  const display = useCountUp(value, duration);

  return (
    <span
      className={cn("tabular-nums animate-count-up", className)}
      style={{ animationFillMode: "both" }}
    >
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

/* ── useMetricCountUp hook ── */
export function useMetricCountUp(target: number, duration: number = MOTION_SPECIAL_MS.metricCount): number {
  return useCountUp(target, duration);
}

/* ── StaggerList ── */
interface StaggerListProps {
  children: React.ReactNode[];
  baseDelay?: number;
  step?: number;
  className?: string;
}

export function StaggerList({ children, baseDelay = 0, step = 40, className }: StaggerListProps) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, i) => (
        <FadeIn key={i} delay={baseDelay + i * step}>
          {child}
        </FadeIn>
      ))}
    </div>
  );
}

