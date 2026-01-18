import { ReactNode } from "react";
import { Link } from "react-router-dom";

interface AppShellProps {
  children: ReactNode;
}

const AppShell = ({ children }: AppShellProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Ambient background effect */}
      <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.02] pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-mesh pointer-events-none" />
      
      <header className="sticky top-0 z-50 border-b border-border/40 bg-card/80 backdrop-blur-xl shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-premium flex items-center justify-center shadow-premium group-hover:shadow-xl transition-all">
                <span className="text-white font-bold text-lg">CC</span>
              </div>
              <span className="text-xl font-bold bg-gradient-premium bg-clip-text text-transparent">
                Campus Connect
              </span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10">
        {children}
      </main>

      <footer className="relative z-10 border-t border-border/40 bg-card/60 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>&copy; 2026 Campus Connect. All rights reserved.</p>
            <p className="mt-1">Empowering academic excellence through technology</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AppShell;