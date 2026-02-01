import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GraduationCap, Calendar, Trophy, Bell, ArrowRight, CheckCircle, Loader2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        if (!user) return;

        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!mounted) return;

        if (data?.role === "admin") navigate("/app/admin/dashboard", { replace: true });
        else navigate("/app/dashboard", { replace: true });
      } finally {
        if (mounted) setChecking(false);
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-primary/5">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Ambient background effect */}
      <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.02] pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-mesh pointer-events-none" />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-premium mb-8 shadow-premium animate-in fade-in zoom-in duration-700">
            <GraduationCap className="w-12 h-12 text-primary-foreground" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-premium bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            Welcome to Campus Connect
          </h1>
          
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            Your complete platform for managing college lectures, tracking attendance, earning points, and staying connected with your academic community.
          </p>

          <div className="flex flex-wrap gap-4 justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <Link to="/auth">
              <Button size="lg" className="bg-gradient-premium hover:opacity-90 transition-opacity shadow-premium group">
                Get Started
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline">
                Student Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20 bg-card/30 rounded-3xl my-20 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Powerful Features</h2>
          <p className="text-muted-foreground text-lg">Everything you need for seamless academic management</p>
        </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-premium transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-gradient-premium flex items-center justify-center mb-4 shadow-premium">
                <Calendar className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Lecture Management</h3>
              <p className="text-sm text-muted-foreground">
                View upcoming lectures with dates, times, venues, and downloadable flyers
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-accent transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center mb-4 shadow-accent">
                <CheckCircle className="w-6 h-6 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">QR & OTP Attendance</h3>
              <p className="text-sm text-muted-foreground">
                Mark attendance instantly with QR codes or 6-digit OTP codes
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-premium transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-gradient-premium flex items-center justify-center mb-4 shadow-premium">
                <Trophy className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Points System</h3>
              <p className="text-sm text-muted-foreground">
                Earn points for attendance and track your academic progress
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-accent transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center mb-4 shadow-accent">
                <Bell className="w-6 h-6 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Smart Notifications</h3>
              <p className="text-sm text-muted-foreground">
                Stay updated with real-time notifications and announcements
              </p>
            </div>
          </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-3xl mx-auto text-center p-12 rounded-3xl bg-gradient-premium shadow-premium">
          <h2 className="text-4xl font-bold text-primary-foreground mb-4">
            Ready to Transform Your Academic Experience?
          </h2>
          <p className="text-primary-foreground/90 mb-8 text-lg">
            Join thousands of students already using Campus Connect
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="shadow-lg">
              Create Your Account Now
            </Button>
          </Link>
        </div>
      </section>

      <footer className="mt-auto border-t border-border/40 bg-card/60 backdrop-blur-sm relative z-10">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-xs text-muted-foreground">
            Developed by - Atharv Jadhav - Department Of Computer Science
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
