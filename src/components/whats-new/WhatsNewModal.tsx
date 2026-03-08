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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-border-subtle bg-surface-1/95 backdrop-blur-xl shadow-lg">
        <div className="p-6 space-y-6">
          <DialogTitle className="text-center">
            <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
              What's New in v{APP_VERSION}
            </span>
          </DialogTitle>

          <div className="flex flex-col items-center text-center space-y-4 min-h-[200px] justify-center">
            <div className="h-14 w-14 rounded-2xl bg-surface-3 border border-border-subtle flex items-center justify-center">
              <Icon className={`h-7 w-7 ${slide.color}`} />
            </div>
            <h3 className="text-[17px] font-semibold text-foreground">{slide.title}</h3>
            <p className="text-[13px] text-muted-foreground leading-relaxed max-w-xs">{slide.description}</p>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === current ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/25"
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrent((p) => Math.max(0, p - 1))}
              disabled={current === 0}
              className="gap-1 text-muted-foreground"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>

            {current < slides.length - 1 ? (
              <Button size="sm" onClick={() => setCurrent((p) => p + 1)} className="gap-1">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleClose}>
                Get Started 🚀
              </Button>
            )}
          </div>

          {/* Don't show again */}
          <div className="flex items-center justify-center gap-2 pt-2 border-t border-border-subtle">
            <Checkbox
              id="dont-show"
              checked={dontShow}
              onCheckedChange={(v) => setDontShow(v === true)}
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
