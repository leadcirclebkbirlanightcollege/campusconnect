import * as React from "react";
import { setupSlowRequestLogger } from "@/ui-engine/performance-engine";

export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    const teardown = setupSlowRequestLogger();
    return () => teardown();
  }, []);

  return <>{children}</>;
}
