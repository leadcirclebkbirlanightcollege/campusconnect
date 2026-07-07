import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border-subtle/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link to="/"><Button variant="ghost" size="icon" className="h-9 w-9"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-sm font-semibold">Terms of Service</h1>
        </div>
      </header>
      <main className="prose prose-sm dark:prose-invert mx-auto max-w-3xl px-4 py-8">
        <h2>Terms of Service</h2>
        <p><strong>Last updated:</strong> April 2026</p>
        <h3>1. Acceptance</h3>
        <p>By using Campus Connect, you agree to these terms. If you do not agree, do not use the platform.</p>
        <h3>2. Accounts</h3>
        <p>You are responsible for maintaining the confidentiality of your account credentials. Institutions are responsible for managing their users.</p>
        <h3>3. Acceptable Use</h3>
        <ul>
          <li>Do not misuse attendance or grading systems</li>
          <li>Do not attempt unauthorized access to other accounts</li>
          <li>Do not upload malicious content</li>
        </ul>
        <h3>4. Intellectual Property</h3>
        <p>Campus Connect and its original content are protected by intellectual property laws. Institutional data remains the property of the respective institution.</p>
        <h3>5. Service Availability</h3>
        <p>We strive for 99.9% uptime but do not guarantee uninterrupted service. Maintenance windows will be communicated in advance.</p>
        <h3>6. Termination</h3>
        <p>We reserve the right to suspend accounts that violate these terms. Institutions may request data export before account closure.</p>
        <h3>7. Contact</h3>
        <p>For questions, email <a href="mailto:atharv@bkbirlanightcollege.qzz.io" className="text-primary hover:underline"><strong>atharv@bkbirlanightcollege.qzz.io</strong></a></p>
      </main>
    </div>
  );
}
