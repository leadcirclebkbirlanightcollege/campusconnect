import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@fontsource/syne/500.css";
import "@fontsource/syne/700.css";
import "@fontsource/syne/800.css";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";


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

// Globally swallow benign AbortErrors (e.g. Supabase fetch cancelled on unmount)
// so they don't surface as unhandled promise rejections in the console / runtime panel.
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const reason: any = event.reason;
    const name = reason?.name?.toLowerCase?.() ?? "";
    const msg = (reason?.message ?? String(reason ?? "")).toLowerCase();
    if (name === "aborterror" || msg.includes("aborted") || msg.includes("signal is aborted")) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
