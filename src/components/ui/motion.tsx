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
  duration = 150,
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
  duration = 180,
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
  duration = 600,
  className,
}: MetricCountUpProps) {
  const [display, setDisplay] = React.useState(0);
  const frameRef = React.useRef<number | null>(null);
  const startRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const start = performance.now();
    startRef.current = start;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out quad
      const eased = 1 - Math.pow(1 - progress, 2);
      setDisplay(Math.round(eased * value));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

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
