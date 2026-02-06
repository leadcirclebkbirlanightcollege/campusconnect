import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Loader2, MailCheck } from "lucide-react";

export default function AuthVerifyEmail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const initialEmail = useMemo(() => (params.get("email") ?? "").trim(), [params]);

  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);

  const resend = async (targetEmail: string) => {
    const trimmed = targetEmail.trim();
    if (!trimmed) {
      toast.error("Please enter your email");
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: trimmed });
      if (error) throw error;

      toast.success("Verification email sent");
      toast.message("Open your inbox and click the verification link to activate your account.");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to resend verification email");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-mesh pointer-events-none" />
      <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.02] pointer-events-none" />

      <Card className="w-full max-w-md shadow-premium relative z-10 border-primary/10">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-premium flex items-center justify-center mb-4 shadow-premium">
            <GraduationCap className="w-10 h-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription>
            We’ve sent a verification link{initialEmail ? " to" : ""}{" "}
            {initialEmail ? <span className="font-medium">{initialEmail}</span> : "to your email"}. Verify to activate your
            account.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg border border-primary/10 bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-md bg-primary/10 p-2">
                <MailCheck className="h-5 w-5 text-primary" />
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Didn’t get the email?</p>
                <ul className="mt-2 list-disc pl-4 space-y-1">
                  <li>Check your Spam/Junk folder</li>
                  <li>Make sure the email address is correct</li>
                  <li>Resend the verification link below</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="verify-email">Email</Label>
            <Input
              id="verify-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@college.edu"
              autoComplete="email"
            />
          </div>

          <Button className="w-full bg-gradient-premium hover:opacity-90 transition-opacity shadow-premium" disabled={sending} onClick={() => resend(email)}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Resend verification link
          </Button>
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Button variant="outline" className="w-full" onClick={() => navigate("/auth", { replace: true })}>
            Back to login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
