import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, ArrowLeft, Send } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GlassCard } from "@/components/ui/GlassCard";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import PageBreadcrumb from "@/components/seo/Breadcrumb";

const CONTACT_INFO = [
  { icon: Mail, label: "Email", value: "atharv@bkbirlanightcollege.qzz.io", href: "mailto:atharv@bkbirlanightcollege.qzz.io" },
  { icon: Phone, label: "Phone", value: "+91 91727 82265", href: "tel:+919172782265" },
  { icon: MapPin, label: "Location", value: "B.K. Birla College, Kalyan, Maharashtra, India", href: "https://share.google/wxegMHTOp8DoULe0Z" },
] as const;

export default function Contact() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string).trim();
    const email = (fd.get("email") as string).trim();
    const message = (fd.get("message") as string).trim();

    if (!name || !email || !message) {
      toast.error("Please fill all fields");
      setLoading(false);
      return;
    }

    const { error } = await (supabase as any).from("leads").insert({
      name,
      email,
      college: "Contact Form",
      notes: message,
      status: "contact",
    });

    if (error) toast.error("Failed to send. Please try again.");
    else {
      toast.success("Message sent! We'll get back to you soon.");
      (e.target as HTMLFormElement).reset();
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border-subtle/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Back to home">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <span className="text-sm font-semibold text-muted-foreground">Contact Us</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        {/* Breadcrumb */}
        <PageBreadcrumb items={[{ label: "Contact Us" }]} />

        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight">Get In Touch</h1>
          <p className="text-sm text-muted-foreground">We'd love to hear from you. Reach out for demos, support, or partnerships.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {CONTACT_INFO.map(({ icon: Icon, label, value, href }) => {
            const card = (
              <GlassCard key={label} padding="lg" className="text-center space-y-2 h-full">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                </div>
                <p className="text-xs font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground break-all">{value}</p>
              </GlassCard>
            );
            const isExternal = href?.startsWith("http");
            return href ? (
              <a
                key={label}
                href={href}
                {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="block hover:opacity-90 transition-opacity"
                aria-label={`${label}: ${value}`}
              >
                {card}
              </a>
            ) : (
              <div key={label}>{card}</div>
            );
          })}
        </div>

        <GlassCard padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4" aria-label="Contact form">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="name" placeholder="Your Name" required maxLength={100} aria-label="Full name" />
              <Input name="email" type="email" placeholder="Email Address" required maxLength={255} aria-label="Email address" />
            </div>
            <Textarea name="message" placeholder="How can we help?" required maxLength={1000} rows={5} aria-label="Message" />
            <Button type="submit" disabled={loading} className="w-full gap-2">
              <Send className="h-4 w-4" aria-hidden="true" />
              {loading ? "Sending…" : "Send Message"}
            </Button>
          </form>
        </GlassCard>

        {/* Internal navigation links */}
        <nav aria-label="Related pages" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground border-t border-border-subtle/60 pt-4">
          <Link to="/help" className="hover:text-foreground transition-colors">Help & Support</Link>
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          <Link to="/book-demo" className="hover:text-foreground transition-colors">Book a Demo</Link>
        </nav>
      </main>
    </div>
  );
}
