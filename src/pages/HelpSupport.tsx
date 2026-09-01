import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { HelpCircle, MessageSquare, Bug, ChevronDown, ChevronRight, Send, Mail, BookOpen, Shield } from "@/components/icons";
import PageBreadcrumb from "@/components/seo/Breadcrumb";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/providers/AuthProvider";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import PublicFooter from "@/components/layout/PublicFooter";

const FAQ_ITEMS = [
  { q: "How do I mark attendance?", a: "Go to the Attendance section in your dashboard. If a lecture is live, you can scan the QR code or enter the OTP provided by your admin/faculty to mark your presence." },
  { q: "How do I view my results?", a: "Navigate to the Results page from the student dashboard. All published exam results will appear there with your marks and grades." },
  { q: "How do I change my password?", a: "Go to Profile → Settings → Security. You can update your password from there." },
  { q: "What is the points/leaderboard system?", a: "You earn points for attending lectures, completing daily check-ins, and achieving milestones. Check the Leaderboard to see your ranking." },
  { q: "How do I contact my admin?", a: "Use the Messages section to send a direct message, or submit a support request using the form below." },
  { q: "My attendance is missing. What should I do?", a: "Contact your admin through the support form below. They can review and correct attendance records from the admin panel." },
  { q: "How do I install the app on my phone?", a: "Visit the Install page from your dashboard. You'll see instructions to add the app to your home screen for quick access." },
  { q: "Can faculty post announcements?", a: "Yes, faculty members can post announcements from their dashboard under the Announcements section." },
];

const issueSchema = z.object({
  category: z.string().min(1),
  message: z.string().min(10, "Please provide at least 10 characters"),
});

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen(!open)} className="w-full text-left border-b border-border last:border-0 py-3 px-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{q}</span>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </div>
      {open && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{a}</p>}
    </button>
  );
}

export default function HelpSupport() {
  const { user } = useAuth();
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");

  const submitMutation = useMutation({
    mutationFn: async () => {
      const parsed = issueSchema.safeParse({ category, message });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      if (!user) throw new Error("You must be logged in");

      const { error } = await supabase.from("feedback").insert({
        user_id: user.id,
        category: parsed.data.category,
        message: parsed.data.message,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Your request has been submitted. We'll get back to you soon.");
      setMessage("");
      setCategory("general");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to submit"),
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8 flex-1 w-full">
      {/* Breadcrumb */}
      <PageBreadcrumb items={[{ label: "Help & Support" }]} />

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-primary" aria-hidden="true" />
          Help & Support
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Find answers to common questions or reach out for support.</p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-border hover:border-primary/30 transition-colors cursor-default">
          <CardContent className="py-4 flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-blue-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">Documentation</p>
              <p className="text-xs text-muted-foreground">Guides & tutorials</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border hover:border-primary/30 transition-colors cursor-default">
          <CardContent className="py-4 flex items-center gap-3">
            <Shield className="h-5 w-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">Privacy & Security</p>
              <p className="text-xs text-muted-foreground">Data protection</p>
            </div>
          </CardContent>
        </Card>
        <a href="mailto:atharv@campusconnect.indevs.in" className="block">
          <Card className="border-border hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="py-4 flex items-center gap-3">
              <Mail className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-medium">Email Support</p>
                <p className="text-xs text-muted-foreground">atharv@campusconnect.indevs.in</p>
              </div>
            </CardContent>
          </Card>
        </a>
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {FAQ_ITEMS.map((item) => (
            <FAQItem key={item.q} q={item.q} a={item.a} />
          ))}
        </CardContent>
      </Card>

      {/* Report Issue */}
      {user && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bug className="h-5 w-5 text-destructive" />
              Report an Issue
            </CardTitle>
            <CardDescription>Submit a bug report or feature request. Our team will review it promptly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                  <SelectItem value="attendance">Attendance Issue</SelectItem>
                  <SelectItem value="account">Account Problem</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue or request in detail…"
                rows={4}
              />
            </div>
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || message.trim().length < 10}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {submitMutation.isPending ? "Submitting…" : "Submit"}
            </Button>
          </CardContent>
        </Card>
      )}

    </div>
    <PublicFooter />
    </div>
  );
}
