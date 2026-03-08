/**
 * Push notification handler injected into the Vite PWA service worker.
 * This file is imported by the custom SW entry point.
 *
 * Handles:
 *  - push events  → shows a system notification in the OS notification tray
 *  - notificationclick → focuses the app or opens it, navigates to a deep-link if provided
 */

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Campus Connect", body: event.data.text() };
  }

  const title   = payload.title   ?? "Campus Connect";
  const options = {
    body:    payload.body    ?? "",
    icon:    payload.icon    ?? "/pwa-512.png",
    badge:   payload.badge   ?? "/pwa-512.png",
    tag:     payload.tag     ?? "cc-notification",
    data:    payload.data    ?? {},
    vibrate: [100, 50, 100],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url ?? "/app/inbox";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Focus existing tab if already open
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
