import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Shield, Users, BookOpen, ChevronRight, Sparkles } from "@/components/icons";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BRANDING } from "@/config/branding";

const DEMO_ROLES = [
  {
    role: "student",
    label: "Student",
    icon: GraduationCap,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    description: "Explore the student dashboard, lectures, attendance, assignments, and more.",
    route: "/app/dashboard",
  },
  {
    role: "faculty",
    label: "Faculty",
    icon: BookOpen,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    description: "See the faculty workspace — manage lectures, view student analytics.",
    route: "/faculty/dashboard",
  },
  {
    role: "admin",
    label: "College Admin",
    icon: Users,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    description: "Full ERP control panel — manage students, faculty, attendance, and settings.",
    route: "/platform/admin/dashboard",
  },
  {
    role: "super_admin",
    label: "Platform Admin",
    icon: Shield,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    description: "Platform-level control — manage colleges, system health, and global settings.",
    route: "/platform/admin-control/dashboard",
  },
] as const;

export default function DemoPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  const handleDemoLogin = async (role: typeof DEMO_ROLES[number]) => {
    setLoading(role.role);
    try {
      // Demo accounts use convention: demo-{role}@campusconnect.demo
      const email = `demo-${role.role}@campusconnect.demo`;
      const password = "demo-password-2026";

      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        // If demo account doesn't exist, show helpful message
        toast.error("Demo account not configured yet. Contact your platform administrator to set up demo accounts.");
        return;
      }

      toast.success(`Logged in as demo ${role.label}`);
      navigate(role.route);
    } catch (err) {
      toast.error("Demo login failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-svh bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={BRANDING.logo} alt={BRANDING.name} className="h-7 w-7 object-contain" />
            <span className="font-bold text-lg">{BRANDING.name}</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">DEMO</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
            Sign In
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Try {BRANDING.name}</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Experience the platform from any role. No signup needed — just pick a role and explore.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DEMO_ROLES.map((role) => {
              const Icon = role.icon;
              const isLoading = loading === role.role;
              return (
                <Card
                  key={role.role}
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary/30 hover:shadow-md",
                    isLoading && "opacity-70 pointer-events-none",
                  )}
                  onClick={() => handleDemoLogin(role)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className={cn("p-2 rounded-lg", role.bg)}>
                        <Icon className={cn("h-5 w-5", role.color)} />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-base mt-2">{role.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-xs leading-relaxed">{role.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Demo accounts are read-only sandboxes. Changes won't affect production data.
          </p>
        </div>
      </main>
    </div>
  );
}
