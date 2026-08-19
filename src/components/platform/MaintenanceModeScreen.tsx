import { Settings } from "@/components/icons";
import { PlatformModeSettings } from "@/hooks/use-platform-mode";

interface Props {
  settings: PlatformModeSettings;
}

export default function MaintenanceModeScreen({ settings }: Props) {
  const headline = settings.custom_headline ?? "Platform Under Maintenance ⚙️";
  const subtext =
    settings.custom_subtext ?? "We are upgrading Campus Connect.";

  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-background page-enter px-6">
      <div className="fixed inset-0 bg-gradient-to-br from-muted/30 via-background to-background pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-lg gap-6">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center shadow-md">
          <Settings className="w-10 h-10 text-muted-foreground animate-spin [animation-duration:4s]" />
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

        <p className="text-sm text-muted-foreground">
          Please check back later.
        </p>

        {settings.estimated_return && (
          <div className="mt-2 px-4 py-2 rounded-lg bg-muted border border-border">
            <p className="text-xs text-muted-foreground">Estimated return</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">
              {settings.estimated_return}
            </p>
          </div>
        )}
      </div>

      <div className="fixed left-0 right-0 text-center bottom-[calc(env(safe-area-inset-bottom,0px)+24px)]">
        <p className="text-xs text-muted-foreground">
          Developed by Atharv Jadhav — Department of Computer Science
        </p>
      </div>
    </div>
  );
}
