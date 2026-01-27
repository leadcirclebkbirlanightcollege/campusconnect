import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import AppShell from "@/components/layout/AppShell";
import { GraduationCap, Calendar, Trophy, Bell, ArrowRight, CheckCircle } from "lucide-react";
import FullPageLoader from "@/components/system/FullPageLoader";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { status, role } = useAuth();

  useEffect(() => {
    if (status !== "authenticated") return;
    if (role === "admin") navigate("/admin", { replace: true });
    else if (role === "student") navigate("/student", { replace: true });
  }, [navigate, role, status]);

  if (status === "loading") return <FullPageLoader label="Loading…" />;

  return (
    <AppShell>
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
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
      <section className="container mx-auto px-4 py-20 bg-card/30 rounded-3xl my-20">
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
      <section className="container mx-auto px-4 py-20">
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
    </AppShell>
  );
};

export default Index;
