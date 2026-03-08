export async function refreshToLatest() {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.update().catch(() => undefined)));
    }

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // best effort
  }

  const rootUrl = new URL("/", window.location.origin);
  rootUrl.searchParams.set("cc_refresh", String(Date.now()));
  window.location.replace(rootUrl.toString());
}
