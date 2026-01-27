import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Loader2, RefreshCw, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  /** milliseconds before showing the fallback UI */
  timeoutMs?: number;
};

export default function AccountSetupFallback({ timeoutMs = 4000 }: Props) {
  const navigate = useNavigate();
  const { refreshRole } = useAuth();
  const [timedOut, setTimedOut] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTimedOut(false);
    const t = window.setTimeout(() => setTimedOut(true), timeoutMs);
    return () => window.clearTimeout(t);
  }, [timeoutMs]);

  const handleRetry = async () => {
    setBusy(true);
    try {
      await refreshRole();
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  if (!timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-primary/5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm">Loading your account…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Account setup in progress
          </CardTitle>
          <CardDescription>
            Your login worked, but your account role hasn’t finished syncing yet. This usually resolves in a few seconds.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={handleRetry} className="w-full" disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Retry
          </Button>
          <Button onClick={handleSignOut} variant="outline" className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
