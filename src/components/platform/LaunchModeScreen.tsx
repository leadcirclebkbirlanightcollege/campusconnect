import { useEffect, useState } from "react";
import { Rocket } from "lucide-react";
import { PlatformModeSettings } from "@/hooks/use-platform-mode";

interface Props {
  settings: PlatformModeSettings;
}

function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!targetDate) return;
    const target = new Date(targetDate).getTime();

    const tick = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
}

export default function LaunchModeScreen({ settings }: Props) {
  const headline = settings.custom_headline ?? "Campus Connect 2.0 🚀";
  const subtext = settings.custom_subtext ?? "Something big is coming after exams…";
  const countdown = useCountdown(settings.launch_date ?? null);

  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-background page-enter px-6">
      <div className="fixed inset-0 bg-gradient-to-br from-primary/8 via-background to-background pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-lg gap-8">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center shadow-lg">
          <Rocket className="w-10 h-10 text-primary" />
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            {headline}
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            {subtext}
          </p>
        </div>

        {/* Countdown */}
        {countdown && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Days", value: countdown.days },
              { label: "Hours", value: countdown.hours },
              { label: "Mins", value: countdown.minutes },
              { label: "Secs", value: countdown.seconds },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center px-4 py-3 rounded-xl bg-muted border border-border">
                <span className="text-2xl font-bold text-foreground tabular-nums">
                  {String(value).padStart(2, "0")}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">{label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="w-16 h-px bg-border" />

        <p className="text-xs text-primary/70 font-medium">
          {settings.custom_suspense ?? "Stay tuned. The best is yet to come."}
        </p>
      </div>

      <div className="fixed bottom-6 left-0 right-0 text-center">
        <p className="text-xs text-muted-foreground">
          Developed by Atharv Jadhav — Department of Computer Science
        </p>
      </div>
    </div>
  );
}
