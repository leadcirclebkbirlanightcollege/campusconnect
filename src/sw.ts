/**
 * Custom service worker entry point for Campus Connect PWA.
 * vite-plugin-pwa injects the Workbox precache manifest into this file.
 *
 * This file handles:
 *   1. Workbox precaching + routing (injected by vite-plugin-pwa)
 *   2. Web Push events → show native OS notifications
 *   3. notificationclick → focus/open the app
 */

// @ts-check
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

// vite-plugin-pwa replaces this with the actual manifest at build time
declare const self: ServiceWorkerGlobalScope;
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ── Navigation fallback (SPA) ────────────────────────────────────────────────
// Deny list keeps OAuth & auth routes network-only
const DENY = [/^~\/oauth/, /^\/auth/, /^\/sw-push\.js/];
registerRoute(
  new NavigationRoute(
    new NetworkFirst({ cacheName: "pages", plugins: [] }),
    { denylist: DENY }
  )
);

// ── Runtime caching ──────────────────────────────────────────────────────────
registerRoute(
  ({ url }) => url.hostname.includes("supabase.co") || url.hostname.includes("supabase.in"),
  new NetworkFirst({
    cacheName: "supabase-api-cache",
    plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 5 * 60 })],
    networkTimeoutSeconds: 6,
  })
);

registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "image-cache",
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 7 * 24 * 60 * 60 })],
  })
);

// ── Web Push ─────────────────────────────────────────────────────────────────
self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  let payload: { title?: string; body?: string; icon?: string; badge?: string; data?: Record<string, unknown> };
  try {
    payload = event.data.json();
  } catch {
    payload = { body: event.data.text() };
  }

  const title   = payload.title ?? "Campus Connect";
  const options: NotificationOptions = {
    body:    payload.body  ?? "",
    icon:    payload.icon  ?? "/pwa-512.png",
    badge:   payload.badge ?? "/pwa-512.png",
    tag:     "cc-notification",
    data:    payload.data  ?? {},
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const url = (event.notification.data as any)?.url ?? "/app/inbox";

  event.waitUntil(
    (self as any).clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients: WindowClient[]) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            (client as any).navigate(url);
            return;
          }
        }
        if ((self as any).clients.openWindow) {
          return (self as any).clients.openWindow(url);
        }
      })
  );
});

// ── Skip waiting ─────────────────────────────────────────────────────────────
self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
