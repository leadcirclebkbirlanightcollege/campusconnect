import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.853dc20549ab4f86bd92cff90b27ccd7",
  appName: "Campus Connect",
  webDir: "dist",
  server: {
    url: "https://853dc205-49ab-4f86-bd92-cff90b27ccd7.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1a1a2e",
      showSpinner: true,
      spinnerColor: "#6366f1",
    },
  },
};

export default config;
