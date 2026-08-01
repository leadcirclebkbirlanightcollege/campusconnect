/**
 * ContextualFAB — native-app primary action button.
 *
 * Adapts its icon + action to the current route family so the user always
 * has the most relevant next-step one tap away.
 */
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  QrCode,
  CalendarPlus,
  Upload,
  UserPen,
  Zap,
  Trophy,
  BookOpenCheck,
  Bell,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface FabAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onTap: () => void;
}

/** Read-only surfaces: a floating action here is noise, not help. */
const FAB_HIDDEN_PREFIXES = [
  "/app/scan",
  "/app/results",
  "/app/attendance",
  "/app/timetable",
  "/app/announcements",
  "/app/profile",
  "/app/settings",
  "/app/id-card",
  "/app/leaderboard",
  "/app/points",
];

function resolveAction(pathname: string, nav: (to: string) => void): FabAction | null {
  if (FAB_HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  // Order matters — more specific first
  if (pathname.startsWith("/app/academics"))     return { icon: QrCode,        label: "Scan QR",       onTap: () => nav("/app/scan") };
  if (pathname.startsWith("/app/community"))     return { icon: CalendarPlus,  label: "Events",        onTap: () => nav("/app/events") };
  if (pathname.startsWith("/app/lectures"))      return { icon: QrCode,        label: "Join Lecture",  onTap: () => nav("/app/scan") };
  if (pathname.startsWith("/app/assignments"))   return { icon: BookOpenCheck, label: "My Assignments",onTap: () => nav("/app/assignments") };
  if (pathname.startsWith("/app/documents"))     return { icon: Upload,        label: "My Documents",  onTap: () => nav("/app/documents") };
  if (pathname.startsWith("/app/events"))        return { icon: CalendarPlus,  label: "Events",        onTap: () => nav("/app/events") };
  if (pathname.startsWith("/app/programmes"))    return { icon: BookOpenCheck, label: "Learning",      onTap: () => nav("/app/programmes") };
  if (pathname.startsWith("/app/ecell"))         return { icon: Rocket,        label: "E-Cell",        onTap: () => nav("/app/ecell") };
  if (pathname.startsWith("/app/dashboard"))     return { icon: QrCode,        label: "Quick Scan",    onTap: () => nav("/app/scan") };
  return null;
}





export default function ContextualFAB() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const action = useMemo(() => resolveAction(pathname, (to) => navigate(to)), [pathname, navigate]);

  return (
    <AnimatePresence mode="wait">
      {action && (
        <motion.button
          key={pathname}
          initial={{ opacity: 0, y: 12, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 480, damping: 32 }}
          whileTap={{ scale: 0.92 }}
          onClick={action.onTap}
          aria-label={action.label}
          className={cn(
            // Desktop-only — mobile now uses the built-in Scan tab in BottomNavigation
            "hidden md:flex fixed right-6 z-[9998]",
            "bottom-[calc(env(safe-area-inset-bottom,0px)+88px)]",
            "items-center gap-2 rounded-full pl-3.5 pr-4 h-12",
            "bg-primary text-primary-foreground",
            "border border-primary/30",
            "shadow-[0_10px_30px_-8px_hsl(var(--primary)/0.55),0_4px_12px_-4px_hsl(var(--primary)/0.45)]",
            "hover:brightness-110 transition-[filter,transform]",
          )}
        >
          <action.icon className="h-5 w-5" />
          <span className="text-[13px] font-semibold leading-none">{action.label}</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
