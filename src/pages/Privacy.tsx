import { Link } from "react-router-dom";
import { ArrowLeft, GraduationCap, ShieldCheck } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { BRANDING } from "@/config/branding";
import PageBreadcrumb from "@/components/seo/Breadcrumb";

export default function Privacy() {
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
        <PageBreadcrumb items={[{ label: "Privacy Policy" }]} />

        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-[11px] font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Digital Data Protection &amp; Privacy</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            Last Updated: August 2026 · Effective for all Campus Connect users and affiliated institutions.
          </p>
        </div>

        <GlassCard padding="lg" className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">1. Overview &amp; Scope</h2>
            <p>
              Campus Connect ("Platform", "we", "us", or "our") provides a next-generation academic operating system
              enabling higher education institutions to manage attendance, student engagement, digital identity, timetables,
              and academic workflows. This Privacy Policy describes how we collect, use, disclose, and safeguard personal
              data when students, faculty members, and institutional administrators use Campus Connect.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">2. Information We Collect</h2>
            <p>We collect only the information necessary to provide institutional educational services:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-foreground">Identity &amp; Account Information:</strong> Full name, institutional email address,
                phone number, student identification number (PRN/Roll No.), program/department, academic semester, and profile avatar.
              </li>
              <li>
                <strong className="text-foreground">Attendance &amp; Verification Telemetry:</strong> Cryptographic QR attendance scan tokens,
                timestamp of lecture attendance, and device GPS geolocation coordinates captured strictly at the moment of QR attendance scanning
                to verify proximity within the classroom geofence boundary. We do not perform background or continuous location tracking.
              </li>
              <li>
                <strong className="text-foreground">Academic Records &amp; Activity:</strong> Course enrollments, timetable schedules, assignments,
                examination marks, event participation, earned gamification points, and digital document verification records.
              </li>
              <li>
                <strong className="text-foreground">Technical Device Data:</strong> Browser type, operating system, PWA installation status,
                and session authentication tokens required for secure platform login.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">3. How We Use Your Information</h2>
            <p>Your data is processed strictly for academic and institutional operations, including:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Authenticating student, faculty, and administrative users securely.</li>
              <li>Validating classroom attendance and preventing proxy attendance via cryptographic geofencing.</li>
              <li>Maintaining institutional academic records, semester rankings, and points leaderboards.</li>
              <li>Delivering critical college notices, lecture cancellations, and real-time schedule updates.</li>
              <li>Generating tamper-proof digital ID cards and verifiable academic credentials.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">4. Data Security &amp; Multi-Tenant Isolation</h2>
            <p>
              Campus Connect employs an enterprise-grade security posture. All network communication is encrypted in transit
              via TLS 1.3. Database records are secured with strict PostgreSQL Row Level Security (RLS) policies ensuring
              that students and faculty can access only authorized data within their respective enrolled institution. Access to
              administrative tools is protected by role-based access controls (RBAC).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">5. Cookies &amp; Local Storage</h2>
            <p>
              Campus Connect utilizes strictly essential functional cookies and browser local storage to maintain authenticated
              user sessions, manage offline PWA cache, and persist interface theme preferences (dark/light mode). We do not
              deploy third-party advertising cookies, behavioral trackers, or cross-site commercial analytics.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">6. Data Sharing &amp; Third Parties</h2>
            <p>
              We do not sell, rent, or monetize your personal information. Data is shared exclusively with authorized administrators
              and faculty of the student's enrolled educational institution as required for collegiate governance. We may disclose
              data only when required by applicable law or institutional regulation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">7. Your Rights &amp; Data Retention</h2>
            <p>
              In accordance with the Digital Personal Data Protection (DPDP) Act and applicable institutional policies, users
              may request access to, correction of, or export of their profile data by contacting their college administrator
              or our grievance officer. Academic records are retained during the duration of the student's enrollment and in
              accordance with statutory university archiving requirements.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">8. Grievance Redressal &amp; Contact</h2>
            <p>
              If you have inquiries, feedback, or grievance requests concerning this Privacy Policy, please contact:
            </p>
            <div className="rounded-xl border border-border-subtle bg-surface-2/60 p-4 space-y-1 text-xs">
              <p className="font-bold text-foreground">Campus Connect Technical Administration</p>
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

      {/* Footer */}
      <footer className="border-t border-border-subtle/60 py-6 px-4 text-center safe-area-bottom space-y-2">
        <nav aria-label="Related pages" className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          <Link to="/contact" className="hover:text-foreground transition-colors">Contact Us</Link>
          <Link to="/help" className="hover:text-foreground transition-colors">Help & Support</Link>
        </nav>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} {BRANDING.name}. All rights reserved.</p>
      </footer>
    </div>
  );
}
