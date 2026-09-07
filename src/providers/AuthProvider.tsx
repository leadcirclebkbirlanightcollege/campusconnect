import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // NOTE: queryClient is NOT available here (AuthProvider wraps QueryProvider).
  // The cache-clear on sign-out is handled by useLogout() and the listener
  // inside QueryProvider / AppProviders instead.
  React.useEffect(() => {
    let mounted = true;

    // Set up listener BEFORE getSession to avoid missing events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session: nextSession } }) => {
      if (!mounted) return;
      if (nextSession) {
        setSession(nextSession);
        setUser(nextSession.user);
        setIsLoading(false);

        // Verify that the user still exists on the server
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (!mounted) return;
        if (userError || !userData?.user) {
          const msg = (userError?.message || "").toLowerCase();
          const isUserMissing =
            userError?.status === 401 ||
            userError?.status === 403 ||
            userError?.status === 404 ||
            msg.includes("does not exist") ||
            msg.includes("user not found") ||
            msg.includes("invalid claim");

          if (isUserMissing) {
            console.warn("[AuthProvider] Stale session detected; user not found on server. Clearing session.");
            await supabase.auth.signOut().catch(() => {});
            setSession(null);
            setUser(null);
          }
        }
      } else {
        setSession(null);
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
