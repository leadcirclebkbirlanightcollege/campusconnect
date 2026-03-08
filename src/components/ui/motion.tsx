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

/* ── useMetricCountUp hook ── */
export function useMetricCountUp(target: number, duration = 900): number {
  const [count, setCount] = React.useState(0);
  const frameRef = React.useRef<number | undefined>(undefined);
  const startRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (target === 0) { setCount(0); return; }
    startRef.current = null;
    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, duration]);

  return count;
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

