import { WifiOff, RefreshCw } from "@/components/icons";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function NoInternet() {
  const { retry } = useNetworkStatus();
  const queryClient = useQueryClient();

  const handleRetry = () => {
    retry();
    if (navigator.onLine) {
      queryClient.invalidateQueries();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-background/80 backdrop-blur-sm p-6"
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        className="flex flex-col items-center gap-6 max-w-sm text-center rounded-2xl border border-border bg-card p-8 shadow-xl"
      >
        {/* Pulsing icon */}
        <div className="relative flex items-center justify-center">
          <span className="absolute h-20 w-20 rounded-full bg-destructive/10 animate-ping opacity-40" />
          <div className="relative h-16 w-16 rounded-2xl bg-destructive/15 border border-destructive/20 flex items-center justify-center">
            <WifiOff className="h-7 w-7 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground">No Internet Connection</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Please check your connection and try again.
          </p>
        </div>

        <Button onClick={handleRetry} size="lg" className="gap-2 w-full">
          <RefreshCw className="h-4 w-4" />
          Retry Connection
        </Button>
      </motion.div>
    </motion.div>
  );
}
