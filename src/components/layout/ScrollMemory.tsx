/**
 * ScrollMemory — per-route scroll restoration.
 *
 * Saves the scroll offset of each route before leaving it and restores it
 * when the user comes back (tab switch, smart back, browser history), so
 * navigation feels native instead of jumping to the top every time.
 */
import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const store = new Map<string, number>();

export default function ScrollMemory() {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  const prev = useRef<string | null>(null);

  useEffect(() => {
    // Persist the outgoing route's offset
    if (prev.current && prev.current !== pathname) {
      store.set(prev.current, window.scrollY);
    }
    prev.current = pathname;

    const saved = store.get(pathname);
    const target = navType === "PUSH" ? 0 : saved ?? 0;

    // Wait a frame so the incoming page has painted
    const raf = requestAnimationFrame(() => {
      window.scrollTo({ top: target, behavior: "auto" });
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname, navType]);

  useEffect(() => {
    const onLeave = () => {
      if (prev.current) store.set(prev.current, window.scrollY);
    };
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, []);

  return null;
}
