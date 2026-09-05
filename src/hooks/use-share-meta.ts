import { useEffect } from "react";
import { BRANDING } from "@/config/branding";

interface ShareMetaProps {
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  canonicalPath?: string | null;
  type?: string;
}

export function useShareMeta({
  title,
  description,
  imageUrl,
  canonicalPath,
  type = "website",
}: ShareMetaProps) {
  useEffect(() => {
    if (!title) return;

    const fullTitle = `${title} — ${BRANDING.name}`;
    const prevTitle = document.title;
    document.title = fullTitle;

    const origin =
      typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : "https://campusconnect.indevs.in";
    const canonicalUrl = canonicalPath
      ? `${origin}${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`
      : window.location.href;

    const setMetaTag = (attr: "name" | "property", key: string, value: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.content = value;
    };

    if (description) {
      setMetaTag("name", "description", description);
      setMetaTag("property", "og:description", description);
      setMetaTag("name", "twitter:description", description);
    }

    setMetaTag("property", "og:title", fullTitle);
    setMetaTag("property", "og:url", canonicalUrl);
    setMetaTag("property", "og:type", type);
    setMetaTag("name", "twitter:title", fullTitle);

    if (imageUrl) {
      setMetaTag("property", "og:image", imageUrl);
      setMetaTag("name", "twitter:image", imageUrl);
      setMetaTag("name", "twitter:card", "summary_large_image");
    }

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    return () => {
      document.title = prevTitle;
    };
  }, [title, description, imageUrl, canonicalPath, type]);
}
