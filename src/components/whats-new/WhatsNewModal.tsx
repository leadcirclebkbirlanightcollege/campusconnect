import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Sparkles, Shield, ScanLine, CreditCard, BarChart3, Zap } from "lucide-react";
import { APP_VERSION } from "@/config/version";

const STORAGE_KEY = "cc_last_seen_version";
const DONT_SHOW_KEY = "cc_whats_new_dismissed";

const slides = [
  {
    icon: BarChart3,
    title: "Intelligence Dashboard",
    description: "A redesigned command center with real-time KPIs, live operations panel, programme health overview, and quick insights — all at a glance.",
    color: "text-primary",
  },
  {
    icon: Sparkles,
    title: "Reputation Engine",
    description: "Points, tiers, and leaderboard rankings now power a comprehensive student reputation system. Track consistency and engagement.",
    color: "text-accent",
  },
  {
    icon: Shield,
    title: "Risk Detection System",
    description: "Automated alerts for low attendance, inconsistent behavior, and programme drop-offs. Stay proactive, not reactive.",
    color: "text-destructive",
  },
  {
    icon: CreditCard,
    title: "Digital ID Upgrades",
    description: "Glassmorphism-styled student ID cards with QR + Barcode, downloadable branded PNG, and backend-verified authenticity.",
    color: "text-premium",
  },
  {
    icon: ScanLine,
    title: "Scanner Improvements",
    description: "Stable camera lifecycle, one-scan lock, torch toggle, and instant verification with a full action panel for admins.",
    color: "text-success",
  },
  {
    icon: Zap,
    title: "Security Enhancements",
    description: "Strict RLS policies, role-based routing, audit logging, and device session management for enterprise-grade security.",
    color: "text-primary",
  },
];

interface WhatsNewModalProps {
  manualOpen?: boolean;
  onManualClose?: () => void;
}

export default function WhatsNewModal({ manualOpen, onManualClose }: WhatsNewModalProps) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  const [dontShow, setDontShow] = useState(false);

  useEffect(() => {
    if (manualOpen) {
      setOpen(true);
      setCurrent(0);
      return;
    }
    const dismissed = localStorage.getItem(DONT_SHOW_KEY);
    const lastSeen = localStorage.getItem(STORAGE_KEY);
    if (dismissed === APP_VERSION) return;
    if (lastSeen === APP_VERSION) return;
    setOpen(true);
  }, [manualOpen]);

  const handleClose = useCallback(() => {
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, APP_VERSION);
    if (dontShow) localStorage.setItem(DONT_SHOW_KEY, APP_VERSION);
    onManualClose?.();
  }, [dontShow, onManualClose]);

  const slide = slides[current];
  const Icon = slide.icon;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-border/30 bg-card/95 backdrop-blur-xl">
        <div className="p-6 space-y-6">
          <DialogTitle className="text-center">
            <span className="text-xs font-medium tracking-widest uppercase text-muted-foreground">What's New in v{APP_VERSION}</span>
          </DialogTitle>

          <div className="flex flex-col items-center text-center space-y-4 min-h-[200px] justify-center transition-all duration-300">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
              <Icon className={`h-7 w-7 ${slide.color}`} />
            </div>
            <h3 className="text-lg font-semibold text-foreground">{slide.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{slide.description}</p>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all duration-200 ${i === current ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"}`}
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
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>

            {current < slides.length - 1 ? (
              <Button
                size="sm"
                onClick={() => setCurrent((p) => p + 1)}
                className="gap-1 bg-primary hover:bg-primary/90"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleClose} className="bg-primary hover:bg-primary/90">
                Get Started
              </Button>
            )}
          </div>

          {/* Don't show again */}
          <div className="flex items-center justify-center gap-2 pt-2 border-t border-border/30">
            <Checkbox
              id="dont-show"
              checked={dontShow}
              onCheckedChange={(v) => setDontShow(v === true)}
            />
            <label htmlFor="dont-show" className="text-xs text-muted-foreground cursor-pointer">
              Don't show again for this version
            </label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
