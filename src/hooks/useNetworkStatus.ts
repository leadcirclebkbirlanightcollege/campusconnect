import { useEffect, useState, useCallback, useRef } from "react";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const update = (status: boolean) => {
      clearTimeout(timeout.current);
      timeout.current = setTimeout(() => setIsOnline(status), status ? 0 : 800);
    };
    const goOnline = () => update(true);
    const goOffline = () => update(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      clearTimeout(timeout.current);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const retry = useCallback(() => {
    if (navigator.onLine) {
      setIsOnline(true);
    }
  }, []);

  return { isOnline, retry };
}
