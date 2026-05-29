// Campus Connect custom Service Worker
// This file is injected with the Workbox precache manifest by vite-plugin-pwa
// and handles Web Push events natively.

// ── Workbox (injected at build time) ────────────────────────────────────────
importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js"
);

// Tell Workbox where the precache manifest will be injected
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);
workbox.precaching.cleanupOutdatedCaches();

// Production/PWA hotfix: do not let an older worker keep serving a stale
// CSS/JS shell after a design-token rebuild. The new worker must activate
// immediately and claim installed PWA tabs on the next load.
self.skipWaiting();
workbox.core.clientsClaim();

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    await caches.delete("pages");
    const windowClients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });
    await Promise.all(windowClients.map((client) => {
      const url = new URL(client.url);
      if (url.searchParams.has("cc_sw_refresh")) return undefined;
      url.searchParams.set("cc_sw_refresh", Date.now().toString());
      return client.navigate(url.toString());
    }));
  })());
});

// SPA navigation: network-first, skip OAuth/auth routes
workbox.routing.registerRoute(
  new workbox.routing.NavigationRoute(
    new workbox.strategies.NetworkFirst({
      cacheName: "pages",
    }),
    {
      denylist: [/^\/~oauth/, /^\/auth/],
    }
  )
);

// Supabase API: network-first with 6s timeout
workbox.routing.registerRoute(
  ({ url }) =>
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("supabase.in"),
  new workbox.strategies.NetworkFirst({
    cacheName: "supabase-api-cache",
    networkTimeoutSeconds: 6,
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 80,
        maxAgeSeconds: 5 * 60,
      }),
    ],
  })
);

// Images: cache-first
workbox.routing.registerRoute(
  ({ request }) => request.destination === "image",
  new workbox.strategies.CacheFirst({
    cacheName: "image-cache",
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      }),
    ],
  })
);

// ── Web Push ─────────────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { body: event.data.text() };
  }

  const title = payload.title || "Campus Connect";
  const options = {
    body:    payload.body  || "",
    icon:    payload.icon  || "/pwa-512.png",
    badge:   payload.badge || "/pwa-512.png",
    tag:     "cc-notification",
    data:    payload.data  || {},
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/app/inbox";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── Skip waiting ─────────────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
