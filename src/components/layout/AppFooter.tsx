/**
 * Global mandatory app footer.
 * Rendered once at the app root so it appears on every page.
 */
const AppFooter = () => {
  return (
    <footer
      role="contentinfo"
      className="w-full border-t border-border/40 bg-background/60 backdrop-blur-sm px-4 py-3 text-center text-[11px] leading-relaxed text-muted-foreground/80 select-none"
    >
      Designed &amp; proudly developed by the Department of Computer Science with{" "}
      <span aria-label="love" className="text-red-500">❤️</span>
    </footer>
  );
};

export default AppFooter;
