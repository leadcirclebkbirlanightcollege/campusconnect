import { useLocation } from "react-router-dom";

/**
 * Global app footer.
 * Renders on public utility and standalone pages without dedicated footers.
 */
const AppFooter = () => {
  const location = useLocation();

  // Hide on pages that have their own dedicated layouts/footers/bottom navigation
  if (
    location.pathname === "/" ||
    location.pathname.startsWith("/app") ||
    location.pathname.startsWith("/platform") ||
    location.pathname.startsWith("/faculty") ||
    location.pathname.startsWith("/auth")
  ) {
    return null;
  }

  return (
    <footer
      role="contentinfo"
      className="w-full border-t border-border-subtle/60 bg-surface-1/70 backdrop-blur-md px-4 py-4 text-center text-[11px] leading-relaxed text-muted-foreground select-none safe-area-bottom"
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© {new Date().getFullYear()} Campus Connect. All rights reserved.</p>
        <p>
          Designed &amp; developed by the Department of Computer Science with{" "}
          <span aria-label="love" className="text-red-500">❤️</span>
        </p>
      </div>
    </footer>
  );
};

export default AppFooter;
