/**
 * Independence Day launch experience — full-screen seasonal welcome.
 * Visual-only layer: shows once per session inside the campaign window.
 */

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BRANDING } from "@/config/branding";
import {
  TRICOLOUR,
  hasSeenIndependenceLaunch,
  isIndependenceDayActive,
  markIndependenceLaunchSeen,
} from "@/config/seasonal";
import AshokaChakra from "@/components/seasonal/AshokaChakra";

function Particles({ reduced }: { reduced: boolean }) {
  const dots = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        left: (i * 37) % 100,
        delay: (i % 7) * 0.45,
        duration: 7 + (i % 5),
        size: 4 + (i % 3) * 2,
        color: i % 3 === 0 ? TRICOLOUR.saffron : i % 3 === 1 ? TRICOLOUR.green : TRICOLOUR.gold,
      })),
    [],
  );

  if (reduced) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {dots.map((d) => (
        <motion.span
          key={d.id}
          className="absolute rounded-full"
          style={{
            left: `${d.left}%`,
            width: d.size,
            height: d.size,
            background: d.color,
            opacity: 0.5,
            willChange: "transform, opacity",
          }}
          initial={{ y: "105vh", opacity: 0 }}
          animate={{ y: "-10vh", opacity: [0, 0.6, 0] }}
          transition={{ duration: d.duration, delay: d.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
}

export default function IndependenceDayLaunch() {
  const reduced = !!useReducedMotion();
  const [open, setOpen] = useState(
    () => isIndependenceDayActive() && !hasSeenIndependenceLaunch(),
  );

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const dismiss = () => {
    markIndependenceLaunchSeen();
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="independence-launch"
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center overflow-hidden px-6 text-center"
          style={{
            background:
              "radial-gradient(120% 80% at 50% -10%, rgba(255,153,51,0.18) 0%, transparent 55%)," +
              "radial-gradient(120% 80% at 50% 110%, rgba(19,136,8,0.18) 0%, transparent 55%)," +
              "linear-gradient(180deg, hsl(231 68% 12%) 0%, hsl(231 60% 8%) 100%)",
            paddingTop: "max(24px, env(safe-area-inset-top, 0px))",
            paddingBottom: "max(24px, env(safe-area-inset-bottom, 0px))",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: reduced ? 1 : 1.02 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          role="dialog"
          aria-modal="true"
          aria-label="Independence Day welcome"
        >
          {/* Tricolour sweep */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
            style={{
              background: `linear-gradient(90deg, ${TRICOLOUR.saffron}, #ffffff, ${TRICOLOUR.green})`,
              backgroundSize: "200% 100%",
            }}
            animate={reduced ? undefined : { backgroundPositionX: ["0%", "200%"] }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />

          <Particles reduced={reduced} />

          {/* Chakra motif */}
          <motion.div
            className="pointer-events-none absolute"
            style={{ willChange: "transform" }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 0.1, scale: 1, rotate: reduced ? 0 : 360 }}
            transition={{
              opacity: { duration: 0.8 },
              scale: { duration: 0.8 },
              rotate: { duration: 90, repeat: Infinity, ease: "linear" },
            }}
            aria-hidden="true"
          >
            <AshokaChakra size={320} color="#FFFFFF" />
          </motion.div>

          <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.86, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/15 bg-white/10 backdrop-blur-sm"
            >
              <span
                className="absolute inset-0 rounded-[28px]"
                style={{
                  padding: 1.5,
                  background: `linear-gradient(140deg, ${TRICOLOUR.saffron}, rgba(255,255,255,0.9), ${TRICOLOUR.green})`,
                  WebkitMask:
                    "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                }}
                aria-hidden="true"
              />
              <img
                src={BRANDING.logo}
                alt="Campus Connect"
                className="h-14 w-14 object-contain"
                loading="eager"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="space-y-3"
            >
              <h1 className="text-[22px] font-black uppercase tracking-[0.28em] text-white">
                Campus Connect
              </h1>
              <div
                className="mx-auto h-[3px] w-24 rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${TRICOLOUR.saffron}, #ffffff, ${TRICOLOUR.green})`,
                }}
              />
              <p className="text-base font-semibold text-white/90">
                Celebrating the Spirit of Freedom 🇮🇳
              </p>
              <p className="text-sm text-white/60">Together. Connected. Moving Forward.</p>
              <p
                className="text-[15px] font-bold"
                style={{ color: TRICOLOUR.gold }}
              >
                Happy Independence Day
              </p>
            </motion.div>

            <motion.button
              type="button"
              onClick={dismiss}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.3 }}
              whileTap={{ scale: 0.97 }}
              className="mt-2 w-full rounded-2xl px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-colors"
              style={{
                background: `linear-gradient(100deg, ${TRICOLOUR.saffron} 0%, #ffb066 45%, ${TRICOLOUR.green} 100%)`,
              }}
            >
              Continue to Campus Connect
            </motion.button>
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px]"
            style={{
              background: `linear-gradient(90deg, ${TRICOLOUR.green}, #ffffff, ${TRICOLOUR.saffron})`,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
