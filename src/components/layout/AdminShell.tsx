import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminShellProps {
  children: ReactNode;
}

const AdminShell = ({ children }: AdminShellProps) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Logout failed");
    } else {
      toast.success("Logged out successfully");
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Ambient background effect */}
      <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.02] pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-mesh pointer-events-none" />
      
      <header className="sticky top-0 z-50 border-b border-border/40 bg-card/80 backdrop-blur-xl shadow-premium">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/admin" className="flex items-center space-x-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-premium flex items-center justify-center shadow-premium group-hover:shadow-xl transition-all">
                <LayoutDashboard className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-premium bg-clip-text text-transparent block">
                  Campus Connect
                </span>
                <span className="text-xs text-muted-foreground">Admin Dashboard</span>
              </div>
            </Link>
            
            <Button onClick={handleLogout} variant="outline" className="gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
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
            <p className="mt-2">Developed by - Atharv Jadhav - Department Of Computer Science</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AdminShell;