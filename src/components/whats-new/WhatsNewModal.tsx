import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronLeft, ChevronRight, Sparkles, Shield,
  ScanLine, Smartphone, TrendingUp, Zap,
  Activity, MessageSquarePlus,
} from "lucide-react";
import { APP_VERSION } from "@/config/version";

const STORAGE_KEY   = "cc_last_seen_version";
const DONT_SHOW_KEY = "cc_whats_new_dismissed";

const slides = [
  {
    icon: Activity,
    title: "Platform Monitoring Dashboard",
    description: "Super Admins now have a live monitoring center: login activity, active lectures, attendance today, open feedback, and security alerts — all auto-refreshing every 60s.",
    color: "text-primary",
  },
  {
    icon: MessageSquarePlus,
    title: "User Feedback System",
    description: "Students and admins can now submit bug reports, feature ideas, UI issues, and general feedback using the floating button. Super Admins review and resolve all submissions.",
    color: "text-success",
  },
  {
    icon: Sparkles,
    title: "Smart Insights Strip",
    description: "Personalised rotating insights on your dashboard — tier progress, streak nudges, attendance tips, and motivational milestones.",
    color: "text-accent",
  },
  {
    icon: Smartphone,
    title: "PWA — Install on Device",
    description: "Campus Connect is now fully installable. Add it to your home screen for a native app experience with offline detection.",
    color: "text-warning",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Row-Level Security on every table, tamper-proof points ledger, complete audit trail, inactivity auto-logout, and server-side role validation.",
    color: "text-danger",
  },
  {
    icon: ScanLine,
    title: "Attendance Intelligence",
    description: "QR + OTP attendance with retry resilience, real-time live widgets, admin corrections with audit logs, and monthly CSV export.",
    color: "text-primary",
  },
  {
    icon: TrendingUp,
    title: "Performance Optimized",
    description: "React Query caching, composite DB indexes, progressive dashboard loading, and code splitting — dashboard loads in under 700ms.",
    color: "text-success",
  },
  {
    icon: Zap,
    title: "Gamification Engine",
    description: "Tiered reputation (Bronze → Elite), daily streaks, mystery rewards, achievements with points bonuses, and a competitive leaderboard.",
    color: "text-premium",
  },
];

interface WhatsNewModalProps {
  manualOpen?: boolean;
  onManualClose?: () => void;
}

export default function WhatsNewModal({ manualOpen, onManualClose }: WhatsNewModalProps) {
  const [open, setOpen]       = useState(false);
  const [current, setCurrent] = useState(0);
  const [dontShow, setDontShow] = useState(false);

  useEffect(() => {
    if (manualOpen) { setOpen(true); setCurrent(0); return; }
    const dismissed = localStorage.getItem(DONT_SHOW_KEY);
    const lastSeen  = localStorage.getItem(STORAGE_KEY);
    if (dismissed === APP_VERSION) return;
    if (lastSeen  === APP_VERSION) return;
    setOpen(true);
  }, [manualOpen]);

  const handleClose = useCallback(() => {
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, APP_VERSION);
    if (dontShow) localStorage.setItem(DONT_SHOW_KEY, APP_VERSION);
    onManualClose?.();
  }, [dontShow, onManualClose]);

  const slide = slides[current];
  const Icon  = slide.icon;

  const isLast = current === slides.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-border-subtle/70 bg-surface-1/95 backdrop-blur-2xl shadow-2xl">
        {/* Ambient gradient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.18),transparent_70%)]"
        />

        <div className="relative p-7 pb-6 space-y-6">
          {/* Header */}
          <DialogTitle asChild>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                What's New
              </span>
              <span className="text-[10px] font-mono font-medium text-muted-foreground/70 px-2 py-0.5 rounded-full border border-border-subtle bg-surface-2">
                v{APP_VERSION}
              </span>
            </div>
          </DialogTitle>

          {/* Slide body */}
          <div className="flex flex-col items-center text-center space-y-5 min-h-[220px] justify-center">
            <div className="relative">
              <div
                aria-hidden
                className="absolute inset-0 rounded-2xl bg-primary/20 blur-2xl scale-110"
              />
              <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-surface-3 to-surface-2 border border-border-subtle flex items-center justify-center shadow-inner">
                <Icon className={`h-7 w-7 ${slide.color}`} strokeWidth={1.75} />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-[18px] font-semibold text-foreground tracking-tight">
                {slide.title}
              </h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
                {slide.description}
              </p>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setCurrent(i)}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-5 bg-primary"
                    : "w-1 bg-muted-foreground/25 hover:bg-muted-foreground/40"
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrent((p) => Math.max(0, p - 1))}
              disabled={current === 0}
              className="gap-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>

            <span className="text-[11px] font-mono text-muted-foreground/60 tabular-nums">
              {current + 1} / {slides.length}
            </span>

            {!isLast ? (
              <Button size="sm" onClick={() => setCurrent((p) => p + 1)} className="gap-1">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleClose} className="gap-1">
                Get Started
              </Button>
            )}
          </div>

          {/* Don't show again */}
          <div className="flex items-center justify-center gap-2 pt-4 border-t border-border-subtle/60">
            <Checkbox
              id="dont-show"
              checked={dontShow}
              onCheckedChange={(v) => setDontShow(v === true)}
              className="h-3.5 w-3.5"
            />
            <label htmlFor="dont-show" className="text-[11px] text-muted-foreground cursor-pointer select-none">
              Don't show again for this version
            </label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
