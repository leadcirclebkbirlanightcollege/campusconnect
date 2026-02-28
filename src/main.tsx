import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Apply theme before React renders to avoid flicker.
(() => {
  try {
    const stored = localStorage.getItem("theme");
    const initial = stored === "light" || stored === "dark"
      ? stored
      : window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

    document.documentElement.classList.toggle("dark", initial === "dark");
    document.documentElement.style.colorScheme = initial;
  } catch {
    // no-op
  }
})();

// SW registered with prompt mode — no forced reload on update.
// Users see a toast, not an automatic page refresh.
registerSW({
  immediate: false,
  onNeedRefresh() {
    // Non-blocking: just log. UI can show a refresh prompt later.
    console.info("[SW] New version available. Refresh when ready.");
  },
  onOfflineReady() {
    console.info("[SW] App ready for offline use.");
  },
});

createRoot(document.getElementById("root")!).render(<App />);
