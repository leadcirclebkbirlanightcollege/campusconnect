import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

 // Initialize theme on app load
 const initTheme = () => {
   const stored = localStorage.getItem("theme");
   const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
   const theme = stored || (prefersDark ? "dark" : "light");
   document.documentElement.classList.add(theme);
 };
 
 initTheme();
 
registerSW({
  immediate: true,
});

createRoot(document.getElementById("root")!).render(<App />);
