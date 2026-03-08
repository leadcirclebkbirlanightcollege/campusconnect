/**
 * useWebVitals
 * Lightweight Web Vitals observer — logs CLS, LCP, FCP, INP, TTFB
 * to the console (dev) and could POST to an edge function in production.
 * Uses the native PerformanceObserver API — no extra dependency needed.
 */
import { useEffect } from "react";

type MetricName = "CLS" | "LCP" | "FCP" | "INP" | "TTFB";

interface Metric {
  name: MetricName;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
}

const THRESHOLDS: Record<MetricName, [number, number]> = {
  CLS:  [0.1,   0.25],
  LCP:  [2500,  4000],
  FCP:  [1800,  3000],
  INP:  [200,   500],
  TTFB: [800,   1800],
};

function rate(name: MetricName, value: number): Metric["rating"] {
  const [good, poor] = THRESHOLDS[name];
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

function report(metric: Metric) {
  const isProd = import.meta.env.PROD;
  const badge = metric.rating === "good" ? "✅" : metric.rating === "needs-improvement" ? "⚠️" : "❌";
  if (!isProd) {
    const unit = metric.name === "CLS" ? "" : "ms";
    console.info(`[WebVitals] ${badge} ${metric.name}: ${metric.value.toFixed(metric.name === "CLS" ? 3 : 0)}${unit} (${metric.rating})`);
  }
  // In production, you could POST to a monitoring edge function:
  // if (isProd && metric.rating === "poor") {
  //   navigator.sendBeacon("/api/metrics", JSON.stringify(metric));
  // }
}

export function useWebVitals() {
  useEffect(() => {
    if (typeof PerformanceObserver === "undefined") return;

    // LCP
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number; loadTime?: number };
        const value = last.renderTime ?? last.loadTime ?? last.startTime;
        report({ name: "LCP", value, rating: rate("LCP", value) });
      }).observe({ type: "largest-contentful-paint", buffered: true });
    } catch { /* not supported */ }

    // FCP
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === "first-contentful-paint") {
            report({ name: "FCP", value: entry.startTime, rating: rate("FCP", entry.startTime) });
          }
        }
      }).observe({ type: "paint", buffered: true });
    } catch { /* not supported */ }

    // CLS
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const e = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
          if (!e.hadRecentInput) clsValue += (e.value ?? 0);
        }
        report({ name: "CLS", value: clsValue, rating: rate("CLS", clsValue) });
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });
    } catch { /* not supported */ }

    // INP (replaces FID in Core Web Vitals 2024)
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const e = entry as PerformanceEntry & { processingStart?: number; duration?: number };
          const duration = e.processingStart
            ? e.processingStart - entry.startTime + (e.duration ?? 0)
            : (e.duration ?? 0);
          report({ name: "INP", value: duration, rating: rate("INP", duration) });
        }
      }).observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
    } catch { /* not supported */ }

    // TTFB
    try {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (nav) {
        report({ name: "TTFB", value: nav.responseStart, rating: rate("TTFB", nav.responseStart) });
      }
    } catch { /* not supported */ }
  }, []);
}
