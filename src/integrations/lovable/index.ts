// Standalone Supabase Auth adapter (replaces Lovable Cloud OAuth proxy)
import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: "google" | "apple" | "microsoft" | "lovable", opts?: SignInOptions) => {
      if (provider === "lovable") {
        return { error: new Error("Lovable OAuth provider is not available in standalone mode. Please use Google or standard email/password.") };
      }
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as "google" | "apple",
        options: {
          redirectTo: opts?.redirect_uri || window.location.origin,
          queryParams: opts?.extraParams,
        },
      });
      return { data, error, redirected: !error };
    },
  },
};

