import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useActiveEventPromo } from "@/hooks/use-active-event-promo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  CalendarDays,
  Clock,
  MapPin,
  ArrowRight,
  Sparkles,
  Rocket,
  Image as ImageIcon,
} from "@/components/icons";
import { format } from "date-fns";

export default function EventPromoModal() {
  const { activePromo, dismissPromo } = useActiveEventPromo();
  const navigate = useNavigate();

  // Image load state
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  // Timer & progress state
  const [isPaused, setIsPaused] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number>(7000);
  const totalDurationMs = useRef<number>(7000);

  // Focus management
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // When activePromo changes, reset states
  useEffect(() => {
    if (!activePromo) {
      setImageLoaded(false);
      setImageFailed(false);
      return;
    }

    const durationSec = Math.min(
      9,
      Math.max(5, Number(activePromo.promotional_duration_seconds) || 7)
    );
    const durationMs = durationSec * 1000;
    totalDurationMs.current = durationMs;
    setRemainingMs(durationMs);
    setImageLoaded(false);
    setImageFailed(false);
  }, [activePromo?.id, activePromo?.promotional_duration_seconds]);

  // Pre-load promotional image
  useEffect(() => {
    if (!activePromo?.imageUrl) return;

    let isSubscribed = true;

    try {
      const img = new window.Image();
      img.onload = () => {
        if (isSubscribed) {
          setImageLoaded(true);
          setImageFailed(false);
        }
      };

      img.onerror = () => {
        if (isSubscribed) {
          // Fail gracefully: don't crash, still allow modal to display with fallback
          setImageLoaded(true);
          setImageFailed(true);
        }
      };

      img.src = activePromo.imageUrl;

      if (img.complete) {
        setImageLoaded(true);
      }
    } catch {
      setImageLoaded(true);
    }

    // Safety timeout: on very slow network or constrained environments, never stall display indefinitely
    const safetyTimer = window.setTimeout(() => {
      if (isSubscribed) {
        setImageLoaded(true);
      }
    }, 2000);

    return () => {
      isSubscribed = false;
      clearTimeout(safetyTimer);
    };
  }, [activePromo?.imageUrl]);

  // Countdown timer: starts ONLY when content is ready (image loaded or failed gracefully)
  const isReadyToDisplay = Boolean(activePromo && imageLoaded);

  const handleDismiss = useCallback(() => {
    if (!activePromo) return;
    dismissPromo(activePromo.id);
  }, [activePromo, dismissPromo]);

  const handleViewEvent = useCallback(() => {
    if (!activePromo) return;
    dismissPromo(activePromo.id);
    navigate(`/events/${activePromo.id}`);
  }, [activePromo, dismissPromo, navigate]);

  // Escape key listener
  useEffect(() => {
    if (!isReadyToDisplay) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isReadyToDisplay, handleDismiss]);

  // Ticking countdown timer
  useEffect(() => {
    if (!isReadyToDisplay || isPaused) return;

    const tickInterval = 50; // 50ms smooth resolution
    const interval = setInterval(() => {
      setRemainingMs((prev) => {
        const next = prev - tickInterval;
        if (next <= 0) {
          clearInterval(interval);
          handleDismiss();
          return 0;
        }
        return next;
      });
    }, tickInterval);

    return () => clearInterval(interval);
  }, [isReadyToDisplay, isPaused, handleDismiss]);

  // Focus close button on mount
  useEffect(() => {
    if (isReadyToDisplay) {
      closeButtonRef.current?.focus();
    }
  }, [isReadyToDisplay]);

  if (!activePromo || !isReadyToDisplay) {
    return null;
  }

  // Format event date nicely
  let formattedDate = activePromo.event_date;
  try {
    formattedDate = format(new Date(activePromo.event_date), "EEE, d MMMM yyyy");
  } catch {
    // Keep fallback
  }

  const progressPercent = Math.max(
    0,
    Math.min(100, (remainingMs / totalDurationMs.current) * 100)
  );

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[9990] flex items-center justify-center p-4 sm:p-6 select-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-event-title"
        aria-describedby="promo-event-desc"
      >
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24 }}
          onClick={handleDismiss}
          className="fixed inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Card */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          className="relative z-10 w-full max-w-sm sm:max-w-md max-h-[88vh] overflow-hidden rounded-3xl bg-[#0B1220] border border-white/10 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8),0_0_40px_-5px_rgba(75,111,251,0.25)] flex flex-col"
        >
          {/* Top Progress bar showing remaining display time */}
          <div className="h-1 w-full bg-white/10 overflow-hidden shrink-0">
            <div
              className="h-full bg-gradient-to-r from-[#315BEA] via-[#4B6FFB] to-[#06B6D4] transition-all duration-75 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Close button */}
          <button
            ref={closeButtonRef}
            onClick={handleDismiss}
            aria-label="Close promotional popup"
            className="absolute top-3 right-3 z-30 flex items-center justify-center h-9 w-9 rounded-full bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border border-white/15 transition-all duration-150 shadow-md backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Scrollable container for small screens */}
          <div className="overflow-y-auto overscroll-contain flex-1">
            {/* Event Promotional Poster */}
            <div className="relative aspect-[16/10] w-full bg-slate-950 overflow-hidden">
              {!imageFailed ? (
                <img
                  src={activePromo.imageUrl}
                  alt={activePromo.title}
                  className="w-full h-full object-cover object-center"
                  loading="eager"
                  decoding="sync"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-900 to-[#0B1220]">
                  <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mb-2">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-300">
                    {activePromo.title}
                  </p>
                </div>
              )}

              {/* Badges on image overlay */}
              <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                {activePromo.is_ecell_event && (
                  <Badge className="bg-amber-500/90 text-white border-none font-bold text-[10px] gap-1 shadow-md">
                    <Rocket className="h-3 w-3" /> E-Cell
                  </Badge>
                )}
                {activePromo.is_featured && !activePromo.is_ecell_event && (
                  <Badge className="bg-primary/90 text-white border-none font-bold text-[10px] gap-1 shadow-md">
                    <Sparkles className="h-3 w-3" /> Featured
                  </Badge>
                )}
              </div>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-4">
              {/* Event Title */}
              <div>
                <h2
                  id="promo-event-title"
                  className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug line-clamp-2"
                >
                  {activePromo.title}
                </h2>
                {activePromo.description && (
                  <p
                    id="promo-event-desc"
                    className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed"
                  >
                    {activePromo.description}
                  </p>
                )}
              </div>

              {/* Event Metadata */}
              <div className="flex flex-wrap gap-2 text-xs text-slate-300 pt-0.5">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/5">
                  <CalendarDays className="h-3.5 w-3.5 text-primary" />
                  <span>{formattedDate}</span>
                </div>
                {activePromo.event_time && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/5">
                    <Clock className="h-3.5 w-3.5 text-cyan-400" />
                    <span>{activePromo.event_time}</span>
                  </div>
                )}
                {activePromo.venue && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/5 line-clamp-1 max-w-full">
                    <MapPin className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                    <span className="truncate">{activePromo.venue}</span>
                  </div>
                )}
              </div>

              {/* CTA Action */}
              <div className="pt-2">
                <Button
                  onClick={handleViewEvent}
                  className="w-full h-11 rounded-2xl bg-gradient-to-r from-[#315BEA] to-[#4B6FFB] hover:from-[#2546c4] hover:to-[#3858e6] text-white font-bold text-sm shadow-[0_4px_20px_-4px_rgba(75,111,251,0.5)] transition-all duration-150 gap-2 focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  <span>VIEW EVENT</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
