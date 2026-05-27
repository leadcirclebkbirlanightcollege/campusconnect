import { GraduationCap } from "lucide-react";
import { PlatformModeSettings } from "@/hooks/use-platform-mode";

interface Props {
  settings: PlatformModeSettings;
}

export default function SemesterClosedScreen({ settings }: Props) {
  const headline = settings.custom_headline ?? "That's All For This Semester 🎓";
  const subtext =
    settings.custom_subtext ??
    "Thank you for being part of this journey. We'll see you in the next semester.";
  const suspense =
    settings.custom_suspense ?? "Something new is coming after exams…";

  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-background page-enter px-6">
      {/* Subtle ambient glow */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-background to-background pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-lg gap-6">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center shadow-lg">
          <GraduationCap className="w-10 h-10 text-primary" />
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            {headline}
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            {subtext}
          </p>
        </div>

        {/* Divider */}
        <div className="w-16 h-px bg-border" />

        {/* Main message */}
        <p className="text-sm text-muted-foreground italic">
          "Campus Connect will return stronger, smarter, and better."
        </p>

        {/* Suspense line */}
        <p className="text-xs text-primary/70 font-medium mt-2">{suspense}</p>
      </div>

      {/* Footer */}
      <div className="fixed left-0 right-0 text-center bottom-[calc(env(safe-area-inset-bottom,0px)+24px)]">
        <p className="text-xs text-muted-foreground">See you soon.</p>
      </div>
    </div>
  );
}
