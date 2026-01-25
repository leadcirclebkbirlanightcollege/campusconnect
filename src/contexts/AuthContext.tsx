import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";
export type AppRole = "admin" | "student" | null;

type AuthState = {
  status: AuthStatus;
  user: User | null;
  role: AppRole;
  // For rare cases (role row created after signup), a manual refresh is safer than loops.
  refreshRole: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function fetchRole(userId: string): Promise<AppRole> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[auth] role lookup failed:", error);
    return null;
  }
  return (data?.role as AppRole) ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const mountedRef = useRef(true);
  const roleReqIdRef = useRef(0);

  const refreshRole = async () => {
    const u = user;
    if (!u) {
      setRole(null);
      return;
    }

    const reqId = ++roleReqIdRef.current;
    const nextRole = await fetchRole(u.id);
    if (!mountedRef.current) return;
    if (reqId !== roleReqIdRef.current) return;
    setRole(nextRole);
  };

  useEffect(() => {
    mountedRef.current = true;

    // One listener for the entire app lifetime.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user ?? null;

      setUser(nextUser);
      if (!nextUser) {
        setRole(null);
        setStatus("unauthenticated");
        return;
      }

      setStatus("authenticated");
      // Role is fetched asynchronously; keep UI stable (don’t bounce routes while loading).
      // We do NOT set status back to loading.
      const reqId = ++roleReqIdRef.current;
      const nextRole = await fetchRole(nextUser.id);
      if (!mountedRef.current) return;
      if (reqId !== roleReqIdRef.current) return;
      setRole(nextRole);
    });

    // Initial session load once.
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const initialUser = data.session?.user ?? null;
        setUser(initialUser);
        if (!initialUser) {
          setRole(null);
          setStatus("unauthenticated");
          return;
        }

        setStatus("authenticated");
        const reqId = ++roleReqIdRef.current;
        const initialRole = await fetchRole(initialUser.id);
        if (!mountedRef.current) return;
        if (reqId !== roleReqIdRef.current) return;
        setRole(initialRole);
      } catch (e) {
        console.error("[auth] initial session load failed:", e);
        setUser(null);
        setRole(null);
        setStatus("unauthenticated");
      }
    })();

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(() => ({ status, user, role, refreshRole }), [status, user, role]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
