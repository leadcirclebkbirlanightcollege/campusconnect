import { useEffect, useState } from "react";
import { WifiOff } from "@/components/icons";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[99999] flex items-center justify-center gap-2 bg-destructive/90 text-destructive-foreground text-xs py-2 px-4 text-center"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)" }}
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      You are offline. Some features may not work.
    </div>

  );
}
