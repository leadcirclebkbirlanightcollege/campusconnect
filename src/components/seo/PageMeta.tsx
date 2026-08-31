import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { BRANDING } from "@/config/branding";

const SITE_URL = "https://campusconnect.indevs.in";

interface RouteMeta {
  title: string;
  description: string;
  noindex?: boolean;
  /** Schema.org @type for the WebPage JSON-LD — defaults to WebPage */
  pageType?: string;
}

const ROUTE_META_MAP: Record<string, RouteMeta> = {
  "/": {
    title: `${BRANDING.name} — Your Complete College Life, One App`,
    description: "Unified campus operating system for intelligent attendance, academics, student engagement, digital IDs, and college administration.",
    pageType: "WebPage",
  },
  "/auth": {
    title: `Sign In — ${BRANDING.name}`,
    description: "Access your student or faculty campus dashboard with your email or Student ID.",
    pageType: "WebPage",
    noindex: true,
  },
  "/auth/login": {
    title: `Sign In — ${BRANDING.name}`,
    description: "Access your student or faculty campus dashboard with your email or Student ID.",
    noindex: true,
  },
  "/auth/signup": {
    title: `Create Account — ${BRANDING.name}`,
    description: "Sign up for Campus Connect to manage your academics, attendance, and campus life.",
    noindex: true,
  },
  "/demo": {
    title: `Interactive Platform Demo — ${BRANDING.name}`,
    description: "Experience the Campus Connect platform across student, faculty, and administrator roles. No sign-up required.",
    pageType: "WebPage",
  },
  "/book-demo": {
    title: `Book an Institution Demo — ${BRANDING.name}`,
    description: "Schedule a personalised demonstration of Campus Connect for your college or university. We'll walk you through every feature.",
    pageType: "WebPage",
  },
  "/help": {
    title: `Help & Support Center — ${BRANDING.name}`,
    description: "Find guides, frequently asked questions, and direct support for Campus Connect students, faculty, and administrators.",
    pageType: "FAQPage",
  },
  "/contact": {
    title: `Contact Us — ${BRANDING.name}`,
    description: "Get in touch with the Campus Connect team for demos, partnerships, admissions, and technical inquiries.",
    pageType: "ContactPage",
  },
  "/privacy": {
    title: `Privacy Policy — ${BRANDING.name}`,
    description: "Learn how Campus Connect collects, protects, and manages institutional and student data in compliance with applicable laws.",
    pageType: "WebPage",
  },
  "/terms": {
    title: `Terms of Service — ${BRANDING.name}`,
    description: "Terms and conditions governing the use of the Campus Connect institutional operating system for students, faculty, and administrators.",
    pageType: "WebPage",
  },
  "/onboarding": {
    title: `Get Your College on Campus Connect — ${BRANDING.name}`,
    description: "Onboard your educational institution and set up customised attendance, academics, and engagement modules in minutes.",
    pageType: "WebPage",
  },
  "/start": {
    title: `Get Your College on Campus Connect — ${BRANDING.name}`,
    description: "Onboard your educational institution and set up customised attendance, academics, and engagement modules in minutes.",
    pageType: "WebPage",
  },
};

function getRouteMetadata(pathname: string): RouteMeta {
  if (ROUTE_META_MAP[pathname]) {
    return ROUTE_META_MAP[pathname];
  }

  if (pathname.startsWith("/verify/")) {
    return {
      title: `Document Verification — ${BRANDING.name}`,
      description: "Verify the authenticity of official institutional documents, academic transcripts, and certificates issued by Campus Connect.",
      pageType: "WebPage",
    };
  }

  if (pathname.startsWith("/app/")) {
    const sub = pathname.replace("/app/", "");
    const formatted = sub.charAt(0).toUpperCase() + sub.slice(1).replace(/[-/]/g, " ");
    return {
      title: `${formatted} — ${BRANDING.name}`,
      description: "Student dashboard and academic portal.",
      noindex: true,
    };
  }

  if (pathname.startsWith("/platform/admin-control")) {
    return {
      title: `Platform Admin — ${BRANDING.name}`,
      description: "Platform administration and system operations.",
      noindex: true,
    };
  }

  if (pathname.startsWith("/platform/admin")) {
    return {
      title: `College Admin Portal — ${BRANDING.name}`,
      description: "Institutional ERP management and administration.",
      noindex: true,
    };
  }

  if (pathname.startsWith("/faculty")) {
    return {
      title: `Faculty Workspace — ${BRANDING.name}`,
      description: "Faculty lecture and attendance management portal.",
      noindex: true,
    };
  }

  if (pathname === "/onboarding-wizard" || pathname === "/pending-approval") {
    return {
      title: `Student Onboarding — ${BRANDING.name}`,
      description: "Set up your student profile and academic details.",
      noindex: true,
    };
  }

  // 404 or unknown route
  return {
    title: `Page Not Found — ${BRANDING.name}`,
    description: "The requested page could not be found on Campus Connect.",
    noindex: true,
  };
}

/**
 * PageMeta
 * Listens to location changes and reactively updates:
 * - document.title
 * - meta description
 * - canonical link
 * - Open Graph tags (og:title, og:description, og:url)
 * - Twitter Card tags
 * - robots meta (noindex pages)
 * - WebPage JSON-LD per route
 */
export default function PageMeta() {
  const location = useLocation();

  useEffect(() => {
    const meta = getRouteMetadata(location.pathname);
    const origin = typeof window !== "undefined" ? window.location.origin : SITE_URL;
    const canonicalUrl = `${origin}${location.pathname}`;

    // ── Title ────────────────────────────────────────────────────────
    document.title = meta.title;

    // ── Helper: set or create a meta tag ─────────────────────────────
    const setMetaTag = (attr: "name" | "property", key: string, value: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.content = value;
    };

    // ── Description ───────────────────────────────────────────────────
    setMetaTag("name", "description", meta.description);

    // ── Open Graph ────────────────────────────────────────────────────
    setMetaTag("property", "og:title", meta.title);
    setMetaTag("property", "og:description", meta.description);
    setMetaTag("property", "og:url", canonicalUrl);

    // ── Twitter Card ─────────────────────────────────────────────────
    setMetaTag("name", "twitter:title", meta.title);
    setMetaTag("name", "twitter:description", meta.description);

    // ── Canonical ────────────────────────────────────────────────────
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    // ── Robots ───────────────────────────────────────────────────────
    let robots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (meta.noindex) {
      if (!robots) {
        robots = document.createElement("meta");
        robots.name = "robots";
        document.head.appendChild(robots);
      }
      robots.content = "noindex, nofollow";
    } else {
      if (robots) robots.remove();
    }

    // ── Per-page WebPage JSON-LD ──────────────────────────────────────
    const LD_ID = "page-meta-jsonld";
    let ldScript = document.getElementById(LD_ID) as HTMLScriptElement | null;

    if (!meta.noindex && meta.pageType) {
      const ld = {
        "@context": "https://schema.org",
        "@type": meta.pageType,
        "@id": canonicalUrl,
        "url": canonicalUrl,
        "name": meta.title,
        "description": meta.description,
        "isPartOf": { "@id": `${origin}/#website` },
        "inLanguage": "en-IN",
      };
      if (!ldScript) {
        ldScript = document.createElement("script");
        ldScript.type = "application/ld+json";
        ldScript.id = LD_ID;
        document.head.appendChild(ldScript);
      }
      ldScript.textContent = JSON.stringify(ld);
    } else {
      ldScript?.remove();
    }
  }, [location.pathname]);

  return null;
}
