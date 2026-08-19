import { Wifi, WifiOff, Smartphone, CheckCircle2, Download, RefreshCw } from "@/components/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { useEffect, useState } from "react";

/**
 * PWA status panel for the Student Profile settings page.
 * Shows: installed state, offline readiness, SW cache status.
 */
export default function PwaStatusCard() {
  const { installState, dismissed, triggerInstall, resetDismiss } = usePwaInstall();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [swRegistered, setSwRegistered] = useState(false);

  useEffect(() => {
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);

    // Check SW
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        setSwRegistered(!!reg);
      });
    }

    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  const rows: { label: string; value: string; ok: boolean }[] = [
    {
      label: "App Installed",
      value: installState === "installed" ? "Yes — Standalone" : "Not installed",
      ok: installState === "installed",
    },
    {
      label: "Offline Caching",
      value: swRegistered ? "Enabled ✓" : "Not available",
      ok: swRegistered,
    },
    {
      label: "Network Status",
      value: isOnline ? "Online" : "Offline",
      ok: isOnline,
    },
  ];

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-[14px] flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-primary" />
          App &amp; PWA Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
            <span className="text-[12px] text-muted-foreground">{row.label}</span>
            <Badge
              variant={row.ok ? "default" : "secondary"}
              className="text-[10px] h-5 px-2"
            >
              {row.ok ? (
                <CheckCircle2 className="h-3 w-3 mr-1 text-success" />
              ) : null}
              {row.value}
            </Badge>
          </div>
        ))}

        {/* Install CTA — only if installable */}
        {installState === "installable" && (
          <div className="pt-1">
            {dismissed && (
              <p className="text-[11px] text-muted-foreground mb-2">
                You dismissed the install banner.
              </p>
            )}
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-[12px] gap-2"
              onClick={() => {
                resetDismiss();
                triggerInstall();
              }}
            >
              <Download className="h-3.5 w-3.5" />
              Install Campus Connect
            </Button>
          </div>
        )}

        {/* SW refresh hint */}
        {swRegistered && (
          <p className="text-[10px] text-muted-foreground/60 pt-1">
            Service worker active — app loads faster after first visit.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
