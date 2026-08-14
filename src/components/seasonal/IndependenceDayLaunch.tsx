/**
 * Independence Day launch experience — cinematic full-screen seasonal welcome.
 * Visual-only layer: shows once per session inside the campaign window.
 *
 * Sequence: navy → tricolour lighting → logo → chakra → particles →
 * wordmark → seasonal message → continue button.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BRANDING } from "@/config/branding";
import {
  TRICOLOUR,
  hasSeenIndependenceLaunch,
  isIndependenceDayActive,
  isIndependenceDayItself,
  markIndependenceLaunchSeen,
} from "@/config/seasonal";
import { SeasonalHeroAtmosphere } from "@/components/seasonal/SeasonalKit";

const EASE = [0.22, 1, 0.36, 1] as const;

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

  const step = (delay: number) => ({
    initial: { opacity: 0, y: reduced ? 0 : 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay: reduced ? 0 : delay, ease: EASE },
  });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="independence-launch"
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center overflow-hidden px-6 text-center"
          style={{
            background:
              "linear-gradient(180deg, hsl(231 68% 11%) 0%, hsl(231 62% 7%) 100%)",
            paddingTop: "max(24px, env(safe-area-inset-top, 0px))",
            paddingBottom: "max(24px, env(safe-area-inset-bottom, 0px))",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: reduced ? 1 : 1.03, filter: "blur(4px)" }}
          transition={{ duration: 0.5, ease: EASE }}
          role="dialog"
          aria-modal="true"
          aria-label="Independence Day welcome"
        >
          {/* Stage 2 — tricolour lighting, chakra, particles fade in */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.4, delay: reduced ? 0 : 0.25, ease: "easeOut" }}
          >
            <SeasonalHeroAtmosphere chakraSize={460} particles={16} />
          </motion.div>

          <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6">
            {/* Stage 3 — logo */}
            <motion.div
              initial={{ opacity: 0, scale: reduced ? 1 : 0.82 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: reduced ? 0 : 0.15, ease: EASE }}
              className="relative flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/12 bg-white/[0.07] backdrop-blur-md"
              style={{ boxShadow: "0 20px 60px -30px rgba(255,153,51,0.7)" }}
            >
              <span
                className="absolute inset-0 rounded-[28px]"
                style={{
                  padding: 1.5,
                  background: `linear-gradient(140deg, ${TRICOLOUR.saffron}, rgba(255,255,255,0.85), ${TRICOLOUR.green})`,
                  WebkitMask:
                    "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                  opacity: 0.85,
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

            <div className="space-y-3">
              {/* Stage 6 — wordmark */}
              <motion.h1
                {...step(0.85)}
                className="text-[22px] font-black uppercase tracking-[0.3em] text-white"
              >
                Campus Connect
              </motion.h1>

              <motion.div
                initial={{ opacity: 0, scaleX: 0.2 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.8, delay: reduced ? 0 : 1.0, ease: EASE }}
                className="mx-auto h-[2px] w-28 rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${TRICOLOUR.saffron}, #ffffff, ${TRICOLOUR.green})`,
                  boxShadow: "0 0 18px rgba(255,255,255,0.25)",
                }}
              />

              {/* Stage 7 — seasonal message */}
              <motion.p {...step(1.2)} className="text-[15px] font-semibold text-white/90">
                Celebrating the Spirit of Freedom 🇮🇳
              </motion.p>
              <motion.p {...step(1.35)} className="text-[13px] text-white/55">
                Together. Connected. Moving Forward.
              </motion.p>
              <motion.p
                {...step(1.5)}
                className="text-[15px] font-bold"
                style={{ color: TRICOLOUR.gold }}
              >
                {isIndependenceDayItself()
                  ? "Happy Independence Day"
                  : "Happy Independence Day Week"}
              </motion.p>
            </div>

            {/* Stage 8 — continue */}
            <motion.button
              type="button"
              onClick={dismiss}
              {...step(1.8)}
              whileTap={{ scale: 0.97 }}
              className="relative mt-2 w-full overflow-hidden rounded-2xl px-6 py-3.5 text-sm font-bold text-white"
              style={{
                background: `linear-gradient(100deg, ${TRICOLOUR.saffron}dd 0%, #f7ede0 48%, ${TRICOLOUR.green}dd 100%)`,
                color: "#0f142e",
                boxShadow: "0 18px 40px -22px rgba(255,153,51,0.65)",
              }}
            >
              {!reduced && (
                <motion.span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 w-1/4"
                  style={{
                    background:
                      "linear-gradient(100deg, transparent, rgba(255,255,255,0.55), transparent)",
                  }}
                  initial={{ x: "-150%" }}
                  animate={{ x: ["-150%", "450%"] }}
                  transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.6 }}
                />
              )}
              <span className="relative">Continue to Campus Connect</span>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
