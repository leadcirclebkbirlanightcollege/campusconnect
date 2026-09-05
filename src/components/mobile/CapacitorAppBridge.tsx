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

    // 5. Helper to parse and extract valid in-app deep link paths
    const handleIncomingUrl = (rawUrl: string) => {
      if (!rawUrl) return;
      try {
        let targetPath: string | null = null;
        if (rawUrl.startsWith("campusconnect://")) {
          const pathPart = rawUrl.replace(/^campusconnect:\/\//, "");
          targetPath = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
        } else {
          const parsed = new URL(rawUrl);
          const host = parsed.hostname.toLowerCase();
          if (host === "campusconnect.indevs.in" || host.endsWith(".campusconnect.indevs.in")) {
            targetPath = parsed.pathname + parsed.search + parsed.hash;
          }
        }

        if (targetPath) {
          // Normalize and preserve destination for post-login redirect if needed
          if (targetPath !== "/" && targetPath !== "/auth" && !targetPath.startsWith("/auth?")) {
            sessionStorage.setItem("cc_redirect_after_login", targetPath);
          }
          const currentFullPath = locationRef.current.pathname + locationRef.current.search + locationRef.current.hash;
          if (targetPath !== currentFullPath) {
            navigate(targetPath);
          }
        }
      } catch (err) {
        console.error("[CapacitorAppBridge] Failed to parse deep link URL:", err);
      }
    };

    // 6. Handle Warm-Start Verified App Links (app already running in background)
    let urlListenerHandle: { remove: () => void } | null = null;
    CapApp.addListener("appUrlOpen", (event) => {
      if (event?.url) {
        handleIncomingUrl(event.url);
      }
    }).then((handle) => {
      urlListenerHandle = handle;
    });

    // 7. Handle Cold-Start Verified App Links (app launched from URL)
    CapApp.getLaunchUrl().then((launchUrl) => {
      if (launchUrl?.url) {
        handleIncomingUrl(launchUrl.url);
      }
    }).catch(() => {});

    return () => {
      clearTimeout(splashTimer);
      if (backListenerHandle) {
        backListenerHandle.remove();
      }
      if (urlListenerHandle) {
        urlListenerHandle.remove();
      }
    };
  }, [navigate]);

  return null;
}
