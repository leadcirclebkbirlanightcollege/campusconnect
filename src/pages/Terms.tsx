import { Link } from "react-router-dom";
import { ArrowLeft, GraduationCap, ShieldCheck } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { BRANDING } from "@/config/branding";
import PageBreadcrumb from "@/components/seo/Breadcrumb";
import PublicFooter from "@/components/layout/PublicFooter";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20 selection:text-primary">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border-subtle/70 bg-background/90 backdrop-blur-xl safe-area-top">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
                <GraduationCap className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm font-bold">{BRANDING.name}</span>
            </div>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">Legal &amp; Compliance</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14 space-y-8">
        {/* Breadcrumb */}
        <PageBreadcrumb items={[{ label: "Terms of Service" }]} />

        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-[11px] font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Institutional Agreement &amp; Acceptable Use</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground">
            Last Updated: August 2026 · Effective for all enrolled students, faculty members, and institutional administrators.
          </p>
        </div>

        <GlassCard padding="lg" className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing or utilizing Campus Connect ("Platform"), you agree to be legally bound by these Terms of Service.
              If you are using the platform on behalf of an educational institution, college, or university, you represent that
              you hold the institutional authority to bind such entity to these terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">2. User Accounts &amp; Access Controls</h2>
            <p>
              Access to Campus Connect is managed via authenticated credentials. Users are responsible for safeguarding their
              login credentials and preventing unauthorized access. Institutional administrators are responsible for verifying
              student enrollments, designating faculty roles, and managing department-level privileges.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">3. Academic Integrity &amp; Acceptable Use</h2>
            <p>Users agree to strictly adhere to institutional codes of conduct. Prohibited activities include:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-foreground">Attendance Tampering:</strong> Sharing QR codes, spoofing GPS location coordinates,
                marking fraudulent proxy attendance, or generating counterfeit check-in tokens.
              </li>
              <li>
                <strong className="text-foreground">System Misuse:</strong> Attempting unauthorized access, reverse engineering API endpoints,
                introducing malicious code, or disrupting server infrastructure.
              </li>
              <li>
                <strong className="text-foreground">Impersonation:</strong> Falsifying identity documents, grade records, faculty signatures,
                or administrative verification credentials.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">4. Intellectual Property &amp; Institutional Ownership</h2>
            <p>
              The Campus Connect platform software, user interface design, logos, and proprietary algorithms are protected by
              intellectual property laws. Institutional data—including student rosters, official grades, and departmental notices—remains
              the sole property of the respective enrolled educational institution.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">5. Service Availability &amp; Maintenance</h2>
            <p>
              We strive to deliver high platform availability (target 99.9% uptime). Scheduled maintenance windows are communicated
              in advance whenever feasible. Campus Connect provides offline PWA resilience for cached records and schedules, but
              real-time features (such as dynamic QR rotation) require active network connectivity.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">6. Termination &amp; Account Suspension</h2>
            <p>
              Campus Connect and institution administrators reserve the right to suspend or terminate accounts that violate academic
              integrity guidelines, misuse security features, or engage in unauthorized access attempts.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">7. Inquiries &amp; Contact</h2>
            <p>
              For legal questions, institutional onboarding contracts, or terms clarification, please contact:
            </p>
            <div className="rounded-xl border border-border-subtle bg-surface-2/60 p-4 space-y-1 text-xs">
              <p className="font-bold text-foreground">Campus Connect Administration</p>
              <p>Department of Computer Science · B.K. Birla College, Kalyan, Maharashtra, India</p>
              <p>
                Email:{" "}
                <a href="mailto:atharv@campusconnect.indevs.in" className="text-primary font-semibold hover:underline">
                  atharv@campusconnect.indevs.in
                </a>
              </p>
            </div>
          </section>
        </GlassCard>
      </main>

      <PublicFooter />
    </div>
  );
}
