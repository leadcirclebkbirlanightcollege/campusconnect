import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export default function NetworkHealthDot() {
  const [status, setStatus] = useState<Status>(navigator.onLine ? "online" : "offline");
  const timerRef = useRef<number | undefined>(undefined);

  const ping = async () => {
    if (!navigator.onLine) { setStatus("offline"); return; }
    const start = performance.now();
    try {
      // Lightweight ping — fetch the Supabase health endpoint
      await supabase.from("profiles").select("id").limit(1).abortSignal(AbortSignal.timeout(4000));
      const ms = performance.now() - start;
      setStatus(ms > 2500 ? "slow" : "online");
    } catch {
      setStatus(navigator.onLine ? "slow" : "offline");
    }
  };

  useEffect(() => {
    const onOnline = () => { setStatus("online"); ping(); };
    const onOffline = () => setStatus("offline");

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // Ping once on mount, then every 60s
    ping();
    timerRef.current = window.setInterval(ping, 60_000);

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
      className="fixed bottom-4 right-4 z-[9990] flex items-center gap-1.5 rounded-full bg-card/80 border border-border/40 backdrop-blur-sm px-2.5 py-1 shadow-sm select-none pointer-events-none"
    >
      <span className={`h-2 w-2 rounded-full ${DOT[status]} ${status !== "offline" ? "animate-pulse" : ""}`} />
      <span className="text-[10px] font-medium text-muted-foreground hidden sm:inline">{LABEL[status]}</span>
    </div>
  );
}
