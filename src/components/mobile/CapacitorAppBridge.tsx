import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { toast } from "sonner";
import { TAB_ROOTS } from "@/ui-engine/navigation-engine";

/**
 * Root routes where back press should trigger exit (or double-tap exit)
 * instead of navigating backwards into login or internal stacks.
 */
const EXIT_ROUTES = new Set([
  "/",
  "/auth",
  "/app/dashboard",
  "/faculty/dashboard",
  "/admin",
  "/admin/overview",
  "/super-admin",
  ...TAB_ROOTS,
]);

export default function CapacitorAppBridge() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastBackPressTime = useRef<number>(0);
  const locationRef = useRef(location);
  locationRef.current = location;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // 1. Configure Android Status Bar
    try {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: "#0B1220" }).catch(() => {});
    } catch {
      // Gracefully ignore if not supported
    }

    // 2. Configure Android Mobile Keyboard Resize
    try {
      Keyboard.setResizeMode({ mode: KeyboardResize.Body }).catch(() => {});
    } catch {
      // Gracefully ignore
    }

    // 3. Gracefully hide splash screen after initial layout mounts
    const splashTimer = setTimeout(() => {
      try {
        SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {});
      } catch {
        // Gracefully ignore
      }
    }, 400);

    // 4. Handle Android Hardware Back Button
    let backListenerHandle: { remove: () => void } | null = null;
    CapApp.addListener("backButton", ({ canGoBack }) => {
      const currentPath = locationRef.current.pathname;
      const isExitRoute = EXIT_ROUTES.has(currentPath);

      if (isExitRoute || !canGoBack) {
        const now = Date.now();
        if (now - lastBackPressTime.current < 2000) {
          CapApp.exitApp();
        } else {
          lastBackPressTime.current = now;
          toast("Press back again to exit", { duration: 2000 });
        }
      } else {
        navigate(-1);
      }
    }).then((handle) => {
      backListenerHandle = handle;
    });

    return () => {
      clearTimeout(splashTimer);
      if (backListenerHandle) {
        backListenerHandle.remove();
      }
    };
  }, [navigate]);

  return null;
}
