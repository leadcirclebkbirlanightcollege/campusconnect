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

registerSW({
  immediate: true,
});

createRoot(document.getElementById("root")!).render(<App />);
