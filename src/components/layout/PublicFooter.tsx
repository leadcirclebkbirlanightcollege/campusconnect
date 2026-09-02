import { Link } from "react-router-dom";
import { Mail, MapPin } from "@/components/icons";
import { BRANDING } from "@/config/branding";
import { APP_VERSION } from "@/config/version";

const OFFICIAL_EMAIL = "atharv@campusconnect.indevs.in";

const FOOTER_COLUMNS = [
  {
    title: "Platform",
    links: [
      { label: "Overview", href: "/" },
      { label: "Features", href: "/#benefits" },
      { label: "Institution Partners", href: "/#partners" },
      { label: "Sign In", href: "/auth" },
    ],
  },
  {
    title: "For Institutions",
    links: [
      { label: "Book a Demo", href: "/book-demo" },
      { label: "College Onboarding", href: "/onboarding" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Help & Support", href: "/help" },
      { label: "Contact Team", href: "/contact" },
      { label: "Platform Demo", href: "/demo" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
] as const;

/**
 * Global public-facing footer for Campus Connect.
 *
 * Used on all public pages (landing, contact, legal, help, demo, 404, etc.).
 * NOT intended for authenticated dashboard layouts (admin/faculty/student)
 * which have their own navigation/footer systems.
 */
export default function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      role="contentinfo"
      className="border-t border-border/50 bg-card/40 safe-area-bottom"
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
        {/* Top Grid: Brand + Nav Columns */}
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
              aria-label="Campus Connect Home"
            >
              <img
                src={BRANDING.logo}
                alt={BRANDING.name}
                className="h-8 w-8 object-contain rounded-lg border border-border/50 bg-card p-0.5 shadow-2xs transition-transform group-hover:scale-105"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-foreground leading-none">
                  {BRANDING.name}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium tracking-tight mt-0.5">
                  Campus Operating System
                </span>
              </div>
            </Link>

            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              Connecting institutions, departments, faculty, and students
              through one intelligent campus operating system.
            </p>

            {/* Contact Email */}
            <a
              href={`mailto:${OFFICIAL_EMAIL}`}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Mail className="h-3 w-3 text-primary shrink-0" />
              <span className="font-medium">{OFFICIAL_EMAIL}</span>
            </a>
          </div>

          {/* Navigation Columns */}
          <div className="lg:col-span-8 grid grid-cols-2 gap-8 sm:grid-cols-4">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title} className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-foreground">
                  {col.title}
                </p>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith("/#") ? (
                        <a
                          href={link.href}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          to={link.href}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Institutional Attribution */}
        <div className="mt-10 pt-6 border-t border-border/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-medium text-foreground/90">
                  Developed in collaboration with B.K. Birla Night Arts, Science
                  & Commerce College (BKBNC)
                </p>
                <p>Birla College Road, Kalyan - 421301, Maharashtra, India</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between flex-wrap gap-2">
          <p>© {year} {BRANDING.name}. All rights reserved.</p>
          <p className="font-mono opacity-80">Version {APP_VERSION}</p>
        </div>
      </div>
    </footer>
  );
}
