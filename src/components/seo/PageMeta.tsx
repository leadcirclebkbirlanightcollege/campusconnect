import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { BRANDING } from "@/config/branding";

interface RouteMeta {
  title: string;
  description: string;
  noindex?: boolean;
}

const ROUTE_META_MAP: Record<string, RouteMeta> = {
  "/": {
    title: `${BRANDING.name} — Your Complete College Life, One App`,
    description: "Unified campus operating system for intelligent attendance, academics, student engagement, digital IDs, and college administration.",
  },
  "/auth": {
    title: `Sign In — ${BRANDING.name}`,
    description: "Access your student or faculty campus dashboard with your email or Student ID.",
  },
  "/auth/login": {
    title: `Sign In — ${BRANDING.name}`,
    description: "Access your student or faculty campus dashboard with your email or Student ID.",
  },
  "/auth/signup": {
    title: `Create Account — ${BRANDING.name}`,
    description: "Sign up for Campus Connect to manage your academics, attendance, and campus life.",
  },
  "/demo": {
    title: `Interactive Platform Demo — ${BRANDING.name}`,
    description: "Experience the Campus Connect platform across student, faculty, and administrator roles.",
  },
  "/book-demo": {
    title: `Book an Institution Demo — ${BRANDING.name}`,
    description: "Schedule a personalized demonstration of Campus Connect for your college or university.",
  },
  "/help": {
    title: `Help & Support Center — ${BRANDING.name}`,
    description: "Find guides, frequently asked questions, and direct support for Campus Connect.",
  },
  "/contact": {
    title: `Contact Us — ${BRANDING.name}`,
    description: "Get in touch with the Campus Connect team for admissions, partnerships, and technical inquiries.",
  },
  "/privacy": {
    title: `Privacy Policy — ${BRANDING.name}`,
    description: "Learn how Campus Connect collects, protects, and manages institutional and student data.",
  },
  "/terms": {
    title: `Terms of Service — ${BRANDING.name}`,
    description: "Terms and conditions for utilizing the Campus Connect institutional operating system.",
  },
  "/onboarding": {
    title: `College Onboarding — ${BRANDING.name}`,
    description: "Onboard your educational institution and set up customized campus modules in minutes.",
  },
  "/start": {
    title: `College Onboarding — ${BRANDING.name}`,
    description: "Onboard your educational institution and set up customized campus modules in minutes.",
  },
};

function getRouteMetadata(pathname: string): RouteMeta {
  if (ROUTE_META_MAP[pathname]) {
    return ROUTE_META_MAP[pathname];
  }

  if (pathname.startsWith("/verify/")) {
    return {
      title: `Cryptographic Document Verification — ${BRANDING.name}`,
      description: "Verify official institutional documents, academic transcripts, and certificates cryptographically.",
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
 * Listens to location changes and reactively updates document title,
 * meta description, canonical link, Open Graph tags, and robots meta.
 */
export default function PageMeta() {
  const location = useLocation();

  useEffect(() => {
    const meta = getRouteMetadata(location.pathname);

    // Update document title
    document.title = meta.title;

    // Helper to set or create meta tag
    const setMetaTag = (attr: "name" | "property", key: string, value: string) => {
      let element = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attr, key);
        document.head.appendChild(element);
      }
      element.content = value;
    };

    // Description
    setMetaTag("name", "description", meta.description);

    // Open Graph
    setMetaTag("property", "og:title", meta.title);
    setMetaTag("property", "og:description", meta.description);
    const origin = typeof window !== "undefined" ? window.location.origin : "https://campusconnect.indevs.in";
    setMetaTag("property", "og:url", `${origin}${location.pathname}`);

    // Twitter Card
    setMetaTag("name", "twitter:title", meta.title);
    setMetaTag("name", "twitter:description", meta.description);

    // Canonical link
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `${origin}${location.pathname}`;

    // Robots indexing
    let robots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (meta.noindex) {
      if (!robots) {
        robots = document.createElement("meta");
        robots.name = "robots";
        document.head.appendChild(robots);
      }
      robots.content = "noindex, nofollow";
    } else {
      if (robots) {
        robots.remove();
      }
    }
  }, [location.pathname]);

  return null;
}
