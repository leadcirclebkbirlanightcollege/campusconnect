import { motion } from "framer-motion";
import { Download, Smartphone, Share2, MoreVertical, Plus, CheckCircle2, Wifi, Bell, Zap } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { usePlatformBranding } from "@/hooks/use-platform-branding";
import { BRANDING } from "@/config/branding";
import { cn } from "@/lib/utils";

const FEATURES = [
  { icon: Wifi,        title: "Works Offline",        desc: "Access your dashboard and past records without internet." },
  { icon: Bell,        title: "Instant Notifications", desc: "Get lecture reminders and announcements instantly." },
  { icon: Zap,         title: "Blazing Fast",          desc: "Loads in under 2 seconds — no app store needed." },
  { icon: Smartphone,  title: "Native Feel",           desc: "Runs in standalone mode — no browser chrome." },
];

const STEPS_ANDROID = [
  { icon: MoreVertical, step: "Tap the browser menu  ⋮" },
  { icon: Plus,          step: 'Select "Add to Home Screen"' },
  { icon: CheckCircle2,  step: "Tap Install or Add" },
];

const STEPS_IOS = [
  { icon: Share2,       step: "Tap the Share icon  ⎋" },
  { icon: Plus,          step: '"Add to Home Screen"' },
  { icon: CheckCircle2,  step: "Tap Add in the top-right" },
];

export default function PwaInstallPage() {
  const { installState, dismissed, triggerInstall, resetDismiss } = usePwaInstall();
  const { branding } = usePlatformBranding();

  const name    = branding.brand_name ?? BRANDING.name;
  const logoSrc = branding.logo_url   ?? BRANDING.logo;

  const canInstall = installState === "installable";
  const isInstalled = installState === "installed";

  /* iOS detection */
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const steps = isIos ? STEPS_IOS : STEPS_ANDROID;

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-background px-4 py-8">

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md text-center"
      >
        {/* Logo */}
        <div className="flex justify-center mb-5">
          <div className="relative">
            <img
              src={logoSrc}
              alt={`${name} app icon`}
              className="h-20 w-20 rounded-[22px] shadow-xl"
            />
            {isInstalled && (
              <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-success flex items-center justify-center shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-success-foreground" />
              </span>
            )}
          </div>
        </div>

        <h1 className="text-[24px] font-black text-foreground leading-tight">
          {isInstalled ? "Already Installed!" : `Install ${name}`}
        </h1>
        <p className="text-[14px] text-muted-foreground mt-2 leading-relaxed">
          {isInstalled
            ? `${name} is installed on your device. Launch it from your home screen.`
            : "Add to your home screen for the fastest campus experience — no app store required."}
        </p>

        {/* CTA */}
        {canInstall && !isInstalled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-6"
          >
            <Button
              size="lg"
              className="w-full h-12 gap-2 text-[15px] font-bold shadow-md"
              onClick={() => { triggerInstall(); if (dismissed) resetDismiss(); }}
            >
              <Download className="h-5 w-5" />
              Install App — Free
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* Feature cards */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.35 }}
        className="mt-8 w-full max-w-md grid grid-cols-2 gap-3"
      >
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="rounded-2xl border border-border-subtle bg-surface-1 p-4 shadow-xs"
          >
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="text-[13px] font-bold text-foreground leading-tight">{title}</p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{desc}</p>
          </div>
        ))}
      </motion.div>

      {/* Manual install steps (shown when prompt isn't available) */}
      {!canInstall && !isInstalled && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.35 }}
          className="mt-6 w-full max-w-md rounded-2xl border border-border-subtle bg-surface-1 p-5 shadow-xs"
        >
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
            {isIos ? "How to install on iPhone / iPad" : "How to install on Android"}
          </p>
          <div className="space-y-3">
            {steps.map(({ icon: StepIcon, step }, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-black text-primary">{idx + 1}</span>
                </div>
                <p className="text-[13px] text-foreground font-medium">{step}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Spacer for mobile bottom nav */}
      <div className="h-20 md:h-4" />
    </div>
  );
}
