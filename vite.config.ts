import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    // SPA fallback: serve index.html for any unknown path so React Router
    // handles routing — prevents 404 on hard refresh in development.
    historyApiFallback: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      manifestFilename: "manifest.webmanifest",
      includeAssets: ["favicon.ico", "pwa-512.png", "noise.png"],
      devOptions: { enabled: false },
      // Use custom SW that includes Web Push handlers
      strategies: "injectManifest",
      srcDir: "public",
      filename: "sw.js",
      injectManifest: {
        injectionPoint: "self.__WB_MANIFEST",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest,woff2}"],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MiB
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest,woff2}"],
        // Never cache OAuth redirect routes or push worker
        navigateFallbackDenylist: [/^\/~oauth/, /^\/auth/, /^\/sw-push\.js/],
        // Runtime caching: API + image responses
        runtimeCaching: [
          {
            // Supabase REST / Storage
            urlPattern: ({ url }) =>
              url.hostname.includes("supabase.co") ||
              url.hostname.includes("supabase.in"),
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache",
              expiration: { maxEntries: 80, maxAgeSeconds: 5 * 60 },
              networkTimeoutSeconds: 6,
            },
          },
          {
            // Google Fonts / external assets
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: { maxEntries: 60, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
        ],
      },
      manifest: {
        name: "Campus Connect",
        short_name: "CampusConnect",
        description: "College lecture, attendance & points management for your campus.",
        start_url: "/?source=pwa",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0b1220",
        theme_color: "#1a56db",
        categories: ["education", "productivity"],
        shortcuts: [
          {
            name: "Dashboard",
            url: "/app/dashboard",
            description: "Go to your student dashboard",
          },
          {
            name: "Scan Attendance",
            url: "/app/scan",
            description: "Mark your attendance",
          },
          {
            name: "Leaderboard",
            url: "/app/leaderboard",
            description: "Check rankings",
          },
        ],
        icons: [
          {
            src: "/pwa-512.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react":    ["react", "react-dom", "react-router-dom"],
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tabs",
            "@radix-ui/react-select",
            "@radix-ui/react-popover",
            "@radix-ui/react-toast",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-separator",
          ],
          "vendor-query":    ["@tanstack/react-query"],
          "vendor-charts":   ["recharts"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-forms":    ["react-hook-form", "@hookform/resolvers", "zod"],
          "vendor-motion":   ["framer-motion"],
          "vendor-scanner":  ["@zxing/browser", "@zxing/library"],
          "vendor-qr":       ["qrcode.react"],
        },
      },
    },
    // Warn only if a chunk exceeds 1.2 MiB (post-split chunks should be ~200-400 KB each)
    chunkSizeWarningLimit: 1200,
  },
}));
