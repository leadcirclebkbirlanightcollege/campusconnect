import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border-subtle/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link to="/"><Button variant="ghost" size="icon" className="h-9 w-9"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-sm font-semibold">Privacy Policy</h1>
        </div>
      </header>
      <main className="prose prose-sm dark:prose-invert mx-auto max-w-3xl px-4 py-8">
        <h2>Privacy Policy</h2>
        <p><strong>Last updated:</strong> April 2026</p>
        <h3>1. Information We Collect</h3>
        <p>We collect information you provide directly: name, email, phone number, institution details, and usage data when you interact with Campus Connect.</p>
        <h3>2. How We Use Information</h3>
        <ul>
          <li>Provide and maintain the platform</li>
          <li>Process attendance, grades, and academic records</li>
          <li>Send notifications and platform updates</li>
          <li>Improve our services and user experience</li>
        </ul>
        <h3>3. Data Security</h3>
        <p>We implement industry-standard security measures including encryption, RLS policies, and secure authentication to protect your data.</p>
        <h3>4. Data Sharing</h3>
        <p>We do not sell personal data. Data is shared only with your institution's administrators as required for platform functionality.</p>
        <h3>5. Your Rights</h3>
        <p>You may request access to, correction of, or deletion of your personal data by contacting your institution administrator or our support team.</p>
        <h3>6. Contact</h3>
        <p>For privacy inquiries, email <strong>atharv@bkbirlanightcollege.qzz.io</strong></p>
      </main>
    </div>
  );
}
