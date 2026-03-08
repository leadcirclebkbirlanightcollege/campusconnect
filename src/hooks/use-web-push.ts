import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

/** Convert a base64url string to Uint8Array (needed by pushManager.subscribe) */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = atob(base64);
  const output  = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export type PushState = "unsupported" | "denied" | "prompt" | "subscribed";

export function useWebPush() {
  const [state, setState]               = useState<PushState>("unsupported");
  const [loading, setLoading]           = useState(false);
  const [vapidPublicKey, setVapidKey]   = useState<string | null>(null);

  // Fetch VAPID public key and check current permission
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    // Fetch public VAPID key
    fetch(`${FUNCTIONS_URL}/subscribe-web-push`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.vapidPublicKey) setVapidKey(d.vapidPublicKey);
      })
      .catch(() => {});

    // Determine current state
    navigator.serviceWorker.ready.then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        setState("subscribed");
        return;
      }
      const perm = Notification.permission;
      if (perm === "denied") setState("denied");
      else setState("prompt");
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (!vapidPublicKey) return;
    setLoading(true);
    try {
      const reg        = await navigator.serviceWorker.ready;
      const appServerKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey,
      });

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${FUNCTIONS_URL}/subscribe-web-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action: "subscribe", subscription }),
      });

      if (res.ok) setState("subscribed");
    } catch (err) {
      if (Notification.permission === "denied") setState("denied");
      console.error("useWebPush subscribe error", err);
    } finally {
      setLoading(false);
    }
  }, [vapidPublicKey]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg          = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (!subscription) { setState("prompt"); return; }

      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${FUNCTIONS_URL}/subscribe-web-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action: "unsubscribe", endpoint: subscription.endpoint }),
      });

      await subscription.unsubscribe();
      setState("prompt");
    } catch (err) {
      console.error("useWebPush unsubscribe error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const isSupported = state !== "unsupported";

  return { state, loading, isSupported, subscribe, unsubscribe };
}
