import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  Mail,
  MapPin,
  ArrowLeft,
  Send,
  Building2,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  ShieldCheck,
  Globe,
  Loader2,
  MessageSquare,
  Sparkles,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BRANDING } from "@/config/branding";
import { supabase } from "@/integrations/supabase/client";
import { showErrorToast, showSuccessToast } from "@/lib/error-handling";
import PageBreadcrumb from "@/components/seo/Breadcrumb";

const OFFICIAL_EMAIL = "atharv@campusconnect.indevs.in";
const MAPS_URL = "https://share.google/wxegMHTOp8DoULe0Z";

const ENQUIRY_TYPES = [
  { value: "General Enquiry", label: "General Enquiry" },
  { value: "Institutional Partnership", label: "Institutional Partnership" },
  { value: "Demo Request", label: "Platform Demo Request" },
  { value: "Platform Support", label: "Technical & Platform Support" },
  { value: "Student / Faculty Feedback", label: "Student / Faculty Feedback" },
  { value: "Other", label: "Other" },
];

export default function Contact() {
  const shouldReduceMotion = useReducedMotion();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [enquiryType, setEnquiryType] = useState("General Enquiry");
  const [message, setMessage] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Form validation before submission
  const validate = () => {
    const errs: Record<string, string> = {};
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName) {
      errs.name = "Please enter your name.";
    } else if (trimmedName.length < 2) {
      errs.name = "Name must be at least 2 characters.";
    }

    if (!trimmedEmail) {
      errs.email = "Please enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errs.email = "Please enter a valid work or institutional email address.";
    }

    if (!trimmedMessage) {
      errs.message = "Please tell us a little more about your enquiry.";
    } else if (trimmedMessage.length < 10) {
      errs.message = "Message must be at least 10 characters.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        college: enquiryType,
        notes: `[Enquiry Type: ${enquiryType}]\n\n${message.trim()}`,
        status: "contact",
      };

      const { error } = await (supabase as any).from("leads").insert(payload);

      if (error) throw error;

      showSuccessToast("Message sent successfully!", "Thanks for reaching out. We'll get back to you soon.");
      setIsSubmitted(true);
    } catch (err: unknown) {
      showErrorToast(err, {
        context: "contact-form",
        fallback: "We couldn't send your message right now. Please try again or email us directly.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFullName("");
    setEmail("");
    setEnquiryType("General Enquiry");
    setMessage("");
    setErrors({});
    setIsSubmitted(false);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-background text-foreground relative selection:bg-primary/20 selection:text-primary">
      {/* Ambient background lighting and subtle blueprint grid */}
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(ellipse_70%_50%_at_50%_10%,hsl(var(--primary)/0.09),transparent_70%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.025] [background-image:linear-gradient(to_right,hsl(var(--foreground))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground))_1px,transparent_1px)] [background-size:32px_32px]" />

      {/* Header */}
      <header className="border-b border-border/50 bg-background/85 backdrop-blur-md sticky top-0 z-40 safe-area-top">
        <div className="max-w-6xl mx-auto flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
            aria-label="Campus Connect Home"
          >
            <img
              src={BRANDING.logo}
              alt={BRANDING.name}
              className="h-7 w-7 sm:h-8 sm:w-8 object-contain rounded-lg border border-border/50 bg-card p-0.5 shadow-2xs transition-transform group-hover:scale-105"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-foreground">
                {BRANDING.name}
              </span>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold tracking-wide">
                Contact
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            <Link to="/">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Home
              </Button>
            </Link>
            <Link to="/auth">
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3.5 text-xs font-semibold rounded-lg border-border/70 hover:bg-muted cursor-pointer"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <PageBreadcrumb items={[{ label: "Contact Us" }]} />
          <span className="text-[11px] font-medium text-muted-foreground hidden sm:inline-block">
            Official Institution & Partner Portal
          </span>
        </div>

        {/* Hero Section */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="text-center max-w-2xl mx-auto space-y-3.5"
        >
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-0.5 text-[11px] font-semibold text-primary shadow-2xs">
            <Sparkles className="h-3 w-3" />
            <span>Official Communications</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Get in Touch
          </h1>

          <p className="text-base text-foreground font-semibold">
            We'd love to hear from you.
          </p>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Whether you're exploring Campus Connect, looking for support, or interested in an institutional partnership, our team is here to assist you.
          </p>
        </motion.div>

        {/* 3 Contact Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Official Email */}
          <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 flex flex-col justify-between shadow-2xs hover:border-primary/40 hover:shadow-xs transition-all group">
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Email Inquiries</h3>
                <a
                  href={`mailto:${OFFICIAL_EMAIL}`}
                  className="text-xs font-semibold text-primary hover:underline break-all mt-0.5 block"
                >
                  {OFFICIAL_EMAIL}
                </a>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                General enquiries, technical support, partnerships, and platform information.
              </p>
            </div>
            <div className="pt-4 mt-2 border-t border-border/40">
              <a
                href={`mailto:${OFFICIAL_EMAIL}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                <span>Send Email</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Card 2: Institutional Office */}
          <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 flex flex-col justify-between shadow-2xs hover:border-primary/40 hover:shadow-xs transition-all group">
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">Institutional Office</h3>
                <p className="text-xs font-semibold text-foreground/95 leading-snug">
                  B.K. Birla Night Arts, Science & Commerce College (BKBNC)
                </p>
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed space-y-0.5">
                <p>Birla College Road, Kalyan - 421301</p>
                <p>Maharashtra, India</p>
              </div>
            </div>
            <div className="pt-4 mt-2 border-t border-border/40">
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                <span>View Location on Map</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Card 3: Partnerships & Demos */}
          <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 flex flex-col justify-between shadow-2xs hover:border-primary/40 hover:shadow-xs transition-all group">
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Partnerships & Demos</h3>
                <p className="text-xs font-medium text-foreground/90 mt-0.5">
                  Institutional Deployments
                </p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Let's discuss institutional collaborations, custom demonstrations, and multi-campus onboarding.
              </p>
            </div>
            <div className="pt-4 mt-2 border-t border-border/40">
              <a
                href={`mailto:${OFFICIAL_EMAIL}?subject=Partnership%20and%20Demo%20Enquiry`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                <span>Contact Team</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Contact Form Section */}
        <div id="enquiry-form" className="rounded-2xl border border-border/70 bg-card/80 p-6 sm:p-8 shadow-xs backdrop-blur-xs">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Send a Message</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                How can we help your institution?
              </h2>
              <p className="text-xs text-muted-foreground">
                Fill out the form below and our team will get back to you within 24 hours.
              </p>
            </div>

            {isSubmitted ? (
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-10 text-center space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-6"
              >
                <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-base font-bold text-foreground">Message Sent Successfully!</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Thanks for contacting Campus Connect. We've received your enquiry and our coordination team will reply to you at{" "}
                    <span className="font-semibold text-foreground">{email}</span> shortly.
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="h-8.5 px-4 text-xs font-semibold rounded-lg shadow-2xs hover:bg-card cursor-pointer"
                  >
                    Send Another Message
                  </Button>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4.5" noValidate>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-name" className="text-xs font-semibold text-foreground">
                      Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="contact-name"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                      }}
                      placeholder="e.g. Dr. Rajesh Sharma"
                      className="h-9.5 text-xs rounded-xl"
                      disabled={isSubmitting}
                    />
                    {errors.name && (
                      <p className="text-[11px] text-destructive font-medium">{errors.name}</p>
                    )}
                  </div>

                  {/* Work / Institutional Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-email" className="text-xs font-semibold text-foreground">
                      Work / Institutional Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                      }}
                      placeholder="e.g. rsharma@college.edu"
                      className="h-9.5 text-xs rounded-xl"
                      disabled={isSubmitting}
                    />
                    {errors.email && (
                      <p className="text-[11px] text-destructive font-medium">{errors.email}</p>
                    )}
                  </div>
                </div>

                {/* Enquiry Type Dropdown */}
                <div className="space-y-1.5">
                  <Label htmlFor="contact-enquiry-type" className="text-xs font-semibold text-foreground">
                    Enquiry Type
                  </Label>
                  <Select
                    value={enquiryType}
                    onValueChange={setEnquiryType}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="contact-enquiry-type" className="h-9.5 text-xs rounded-xl bg-background">
                      <SelectValue placeholder="Select enquiry type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENQUIRY_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value} className="text-xs">
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <Label htmlFor="contact-message" className="text-xs font-semibold text-foreground">
                    Message <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="contact-message"
                    rows={4}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      if (errors.message) setErrors((prev) => ({ ...prev, message: "" }));
                    }}
                    placeholder="Tell us about your campus, requirements, or question..."
                    className="text-xs rounded-xl resize-none"
                    disabled={isSubmitting}
                  />
                  {errors.message && (
                    <p className="text-[11px] text-destructive font-medium">{errors.message}</p>
                  )}
                </div>

                {/* Submit button */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <p className="text-[11px] text-muted-foreground">
                    Direct inquiries:{" "}
                    <a href={`mailto:${OFFICIAL_EMAIL}`} className="text-primary font-medium hover:underline">
                      {OFFICIAL_EMAIL}
                    </a>
                  </p>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-9.5 px-6 rounded-xl text-xs font-bold gap-2 shadow-xs shadow-primary/25 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Sending…</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Send Message</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Partnership Callout Banner */}
        <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="space-y-1.5 max-w-xl">
            <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              Building a more connected campus?
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Let's explore how Campus Connect can unify attendance, academic timetables, and campus workflows for your institution.
            </p>
          </div>
          <a href={`mailto:${OFFICIAL_EMAIL}?subject=Institutional%20Partnership%20Inquiry`}>
            <Button
              size="default"
              className="h-10 px-5 rounded-xl text-xs font-bold gap-2 shadow-xs shadow-primary/20 shrink-0 cursor-pointer"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Start a Conversation</span>
            </Button>
          </a>
        </div>

        {/* Quick Help & Directory Links */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-foreground">Explore Related Resources:</span>
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <Link to="/help" className="hover:text-primary transition-colors inline-flex items-center gap-1 font-medium">
                <HelpCircle className="h-3 w-3 text-primary" />
                Help & Support
              </Link>
              <Link to="/demo" className="hover:text-primary transition-colors inline-flex items-center gap-1 font-medium">
                <ShieldCheck className="h-3 w-3 text-primary" />
                Platform Demo
              </Link>
              <Link to="/privacy" className="hover:text-primary transition-colors font-medium">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-primary transition-colors font-medium">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-5 px-4 text-center text-xs text-muted-foreground safe-area-bottom space-y-1">
        <p>© {new Date().getFullYear()} {BRANDING.name} — Campus Operating System. All rights reserved.</p>
        <p className="text-[11px] text-muted-foreground/60">
          Developed in partnership with Department of Computer Science · Lead Circle
        </p>
      </footer>
    </div>
  );
}
