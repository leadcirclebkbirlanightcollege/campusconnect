import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { GraduationCap, Loader2 } from "lucide-react";
import { User } from "@supabase/supabase-js";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Login form
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupStudentId, setSignupStudentId] = useState("");
  const [signupDepartment, setSignupDepartment] = useState("");
  const [signupClass, setSignupClass] = useState("");

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        redirectToDashboard(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          redirectToDashboard(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const redirectToDashboard = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.warn("Role lookup failed; defaulting to student:", error);
        navigate("/app/dashboard", { replace: true });
        return;
      }

      if (data?.role === "admin") {
        navigate("/app/admin/dashboard", { replace: true });
      } else {
        navigate("/app/dashboard", { replace: true });
      }
    } catch (error) {
      console.error("Error fetching role:", error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const identifier = loginIdentifier.trim();
      if (!identifier) throw new Error("Please enter Email or Student ID");

      // If user typed a Student ID, resolve it to an email via backend (service role).
      let email = identifier;
      if (!identifier.includes("@")) {
        const { data: resolved, error: resolveError } = await supabase.functions.invoke(
          "auth-resolve-identifier",
          {
            body: { identifier },
          },
        );

        if (resolveError || !resolved?.email) {
          throw new Error("Invalid credentials");
        }
        email = String(resolved.email);
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      });

      if (error) throw error;

      toast.success("Login successful!");
      
      if (data.user) {
        redirectToDashboard(data.user.id);
      }
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const name = signupName.trim();
      const email = signupEmail.trim();
      const password = signupPassword;

      if (!name) throw new Error("Name is required");
      if (!email) throw new Error("Email is required");
      if (!password) throw new Error("Password is required");

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Failed to create user");
      }

      // Create profile
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: authData.user.id,
        name,
        email,
        phone: signupPhone || null,
        student_id: signupStudentId || null,
        department: signupDepartment || null,
        class_name: signupClass || null,
      });

      if (profileError) throw profileError;

      // Assign student role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: authData.user.id,
        role: "student",
      });

      if (roleError) throw roleError;

      toast.success("Account created — please verify your email to activate your account.");
      toast.message("We sent you a verification link. Open your inbox and click 'Verify Email' to continue.");

      // When email verification is required, the auth provider will not create an active session yet.
      // Redirect to a dedicated screen where the user can resend/change email.
      setSignupPassword("");
      navigate(`/auth/verify?email=${encodeURIComponent(email)}`, { replace: true });
    } catch (error: any) {
      toast.error(error.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-primary/5">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-mesh pointer-events-none" />
      <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.02] pointer-events-none" />

      <Card className="w-full max-w-md shadow-premium relative z-10 border-primary/10">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-premium flex items-center justify-center mb-4 shadow-premium">
            <GraduationCap className="w-10 h-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-premium bg-clip-text text-transparent">
            Campus Connect
          </CardTitle>
          <CardDescription>Manage lectures, attendance & academic progress</CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-identifier">Email / Student ID</Label>
                  <Input
                    id="login-identifier"
                    placeholder="your.email@college.edu or CS-2026-001"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-premium hover:opacity-90 transition-opacity shadow-premium" 
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Login
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name *</Label>
                  <Input
                    id="signup-name"
                    placeholder="John Doe"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email *</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your.email@college.edu"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password *</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a strong password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Phone</Label>
                    <Input
                      id="signup-phone"
                      placeholder="1234567890"
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-student-id">Student ID</Label>
                    <Input
                      id="signup-student-id"
                      placeholder="CS-2024-001"
                      value={signupStudentId}
                      onChange={(e) => setSignupStudentId(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="signup-department">Department</Label>
                    <Input
                      id="signup-department"
                      placeholder="Computer Science"
                      value={signupDepartment}
                      onChange={(e) => setSignupDepartment(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-class">Class</Label>
                    <Input
                      id="signup-class"
                      placeholder="2024-A"
                      value={signupClass}
                      onChange={(e) => setSignupClass(e.target.value)}
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-accent hover:opacity-90 transition-opacity shadow-accent" 
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </CardFooter>
      </Card>

      <div className="absolute bottom-6 left-0 right-0 px-4">
        <p className="text-center text-xs text-muted-foreground">
          Developed by - Atharv Jadhav - Department Of Computer Science
        </p>
      </div>
    </div>
  );
};

export default Auth;