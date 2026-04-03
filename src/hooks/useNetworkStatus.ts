import { useEffect, useState, useCallback } from "react";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const retry = useCallback(() => {
    if (navigator.onLine) {
      setIsOnline(true);
      window.location.reload();
    }
  }, []);

  return { isOnline, retry };
}
