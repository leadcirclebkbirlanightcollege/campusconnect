import { useEffect, useRef, useState } from "react";

type Status = "online" | "slow" | "offline";

const DOT: Record<Status, string> = {
  online: "bg-success",
  slow: "bg-warning",
  offline: "bg-destructive",
};

const LABEL: Record<Status, string> = {
  online: "Online",
  slow: "Slow connection",
  offline: "Offline",
};

const PING_INTERVAL_MS = 120_000;
const PING_TIMEOUT_MS = 2_500;
const SLOW_MS = 1_200;

export default function NetworkHealthDot() {
  const [status, setStatus] = useState<Status>(navigator.onLine ? "online" : "offline");
  const timerRef = useRef<number | undefined>(undefined);

  const ping = async () => {
    if (!navigator.onLine) {
      setStatus("offline");
      return;
    }

    const startedAt = performance.now();
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), PING_TIMEOUT_MS);

    try {
      await fetch("/favicon.ico", {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      });

      const ms = performance.now() - startedAt;
      setStatus(ms > SLOW_MS ? "slow" : "online");
    } catch {
      setStatus(navigator.onLine ? "slow" : "offline");
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  useEffect(() => {
    const onOnline = () => {
      setStatus("online");
      void ping();
    };
    const onOffline = () => setStatus("offline");

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    void ping();
    timerRef.current = window.setInterval(() => void ping(), PING_INTERVAL_MS);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div
      title={LABEL[status]}
      aria-label={LABEL[status]}
      className="fixed right-4 z-[9990] hidden items-center gap-1.5 rounded-full border border-border/40 bg-card/80 px-2.5 py-1 shadow-sm backdrop-blur-sm select-none pointer-events-none sm:flex"
      style={{ bottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}
    >
      <span className={`h-2 w-2 rounded-full ${DOT[status]} ${status !== "offline" ? "animate-pulse" : ""}`} />
      <span className="text-[10px] font-medium text-muted-foreground">{LABEL[status]}</span>
    </div>
  );
}
