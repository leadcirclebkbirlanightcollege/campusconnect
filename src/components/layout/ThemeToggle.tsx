import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/hooks/use-theme";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const checked = theme === "dark";

  return (
    <div className="flex items-center justify-between gap-3 rounded-md px-2 py-2">
      <Label htmlFor="theme-toggle" className="text-sm text-sidebar-foreground">
        Dark mode
      </Label>
      <Switch
        id="theme-toggle"
        checked={checked}
        onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
        aria-label="Toggle dark mode"
      />
    </div>
  );
}
