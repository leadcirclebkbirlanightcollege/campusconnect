import { Link } from "react-router-dom";
import { ChevronRight, Home } from "@/components/icons";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  /** Omit href for the current (last) item */
  href?: string;
}

interface PageBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * PageBreadcrumb
 * - Renders an accessible <nav aria-label="Breadcrumb"> with structured <ol> + <li>
 * - Automatically injects a BreadcrumbList JSON-LD <script> into <head>
 * - Uses Hugeicons ChevronRight between items (no emoji, no mixed libraries)
 * - The last item is the current page and is rendered as plain text (aria-current="page")
 */
export default function PageBreadcrumb({ items, className }: PageBreadcrumbProps) {
  const base = typeof window !== "undefined" ? window.location.origin : "https://campusconnect.indevs.in";

  const allItems = [{ label: "Home", href: "/" }, ...items];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: allItems.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `${base}${item.href}` } : {}),
    })),
  };

  return (
    <>
      {/* Inject BreadcrumbList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className={cn("w-full", className)}>
        <ol className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
          {allItems.map((item, i) => {
            const isLast = i === allItems.length - 1;
            return (
              <li key={i} className="flex items-center gap-1">
                {i === 0 && (
                  <Home
                    className="h-3 w-3 shrink-0 text-muted-foreground/70"
                    aria-hidden="true"
                  />
                )}
                {isLast ? (
                  <span
                    aria-current="page"
                    className="font-medium text-foreground/80 truncate max-w-[180px]"
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    to={item.href!}
                    className="hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                )}
                {!isLast && (
                  <ChevronRight
                    className="h-3 w-3 shrink-0 text-muted-foreground/40"
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
