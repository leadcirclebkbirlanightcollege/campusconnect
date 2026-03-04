import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformBranding {
  brand_name: string;
  tagline: string;
  logo_url: string | null;
  favicon_url: string | null;
}

const DEFAULT: PlatformBranding = {
  brand_name: "Campus Connect",
  tagline: "By Students For Students",
  logo_url: null,
  favicon_url: null,
};

let cache: PlatformBranding | null = null;
let lastFetched = 0;
const TTL = 5 * 60 * 1000;

export function usePlatformBranding() {
  const [branding, setBranding] = useState<PlatformBranding>(cache ?? DEFAULT);
  const [loading, setLoading] = useState(!cache);
  const fetchedRef = useRef(false);

  useEffect(() => {
    const now = Date.now();
    if (cache && now - lastFetched < TTL) {
      setBranding(cache);
      setLoading(false);
      return;
    }
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    (supabase as any)
      .from("platform_branding")
      .select("brand_name,tagline,logo_url,favicon_url")
      .limit(1)
      .maybeSingle()
      .then(({ data, error }: any) => {
        if (!error && data) {
          cache = data as PlatformBranding;
          lastFetched = Date.now();
          setBranding(cache);
        }
        setLoading(false);
      });
  }, []);

  return { branding, loading };
}

export function invalidateBrandingCache() {
  cache = null;
  lastFetched = 0;
}
