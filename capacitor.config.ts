import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "in.indevs.campusconnect",
  appName: "Campus Connect",
  webDir: "dist",
  server: {
    url: "https://campusconnect.indevs.in/auth",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#0B1220",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0B1220",
    },
    Keyboard: {
      resize: "body",
      style: "DARK",
    },
  },
};

export default config;
