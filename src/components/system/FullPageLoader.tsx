import { Loader2 } from "lucide-react";

export default function FullPageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-primary/5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  );
}
