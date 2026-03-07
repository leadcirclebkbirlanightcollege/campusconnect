import AdminSystemControlTab from "@/pages/admin/system/AdminSystemControlTab";

/**
 * Wraps the existing platform mode control for the Super Admin dashboard.
 */
export default function SAPlatformModeTab() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">Platform Mode Switchboard</h2>
        <p className="text-xs text-muted-foreground">
          Control system-wide access modes. Students are affected; admins and super admins bypass all modes.
        </p>
      </div>
      <AdminSystemControlTab />
    </div>
  );
}
