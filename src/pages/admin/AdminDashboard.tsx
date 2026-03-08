import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Users, BookOpen, CheckSquare, Bell, LayoutDashboard, Settings, Shield,
  Coins, GraduationCap, ScanLine, Megaphone, CalendarDays, BarChart3, Sparkles,
  FileText, FileEdit, Palette, UserCog, ChevronDown, Trophy,
} from "lucide-react";
import AdminOverviewTab from "@/pages/admin/overview/AdminOverviewTab";
import StudentManagementTab from "@/pages/admin/students/StudentManagementTab";
import LectureManagementTab from "@/pages/admin/lectures/LectureManagementTab";
import AdminAttendanceControlTab from "@/pages/admin/attendance/AdminAttendanceControlTab";
import AdminMonthlyAttendance from "@/pages/admin/attendance/AdminMonthlyAttendance";
import AdminNotificationCenterTab from "@/pages/admin/notifications/AdminNotificationCenterTab";
import PointsRulesSettings from "@/pages/admin/system/PointsRulesSettings";
import AdminProfileSettings from "@/pages/admin/system/AdminProfileSettings";
import AdminPointsAdjustmentsTab from "@/pages/admin/system/AdminPointsAdjustmentsTab";
import ProgrammeManagementTab from "@/pages/admin/programmes/ProgrammeManagementTab";
import StudentAllotmentTab from "@/pages/admin/programmes/StudentAllotmentTab";
import AdminDigitalIdScanner from "@/pages/admin/scanner/AdminDigitalIdScanner";
import AdminAnnouncementsTab from "@/pages/admin/announcements/AdminAnnouncementsTab";
import AdminEventsTab from "@/pages/admin/events/AdminEventsTab";
import AdminPollsTab from "@/pages/admin/polls/AdminPollsTab";
import AdminDailyContentTab from "@/pages/admin/content/AdminDailyContentTab";
import AdminAuditLogTab from "@/pages/admin/audit/AdminAuditLogTab";
import AdminAttendanceCorrections from "@/pages/admin/attendance/AdminAttendanceCorrections";
import SystemHealthPanel from "@/pages/admin/system/SystemHealthPanel";
import AdminRoleBackfillPanel from "@/pages/admin/system/AdminRoleBackfillPanel";
import AdminSystemControlTab from "@/pages/admin/system/AdminSystemControlTab";
import AdminBrandingTab from "@/pages/admin/branding/AdminBrandingTab";
import AdminCoreTeamTab from "@/pages/admin/team/AdminCoreTeamTab";
import AdminChallengesTab from "@/pages/admin/challenges/AdminChallengesTab";
import { APP_VERSION, BUILD_NUMBER, RELEASE_DATE, ENVIRONMENT } from "@/config/version";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TabItem = { value: string; label: string; icon: React.ElementType };
type TabGroup = { group: string; items: TabItem[] };

const TAB_GROUPS: TabGroup[] = [
  {
    group: "Command",
    items: [
      { value: "overview",       label: "Overview",      icon: LayoutDashboard },
    ],
  },
  {
    group: "Academics",
    items: [
      { value: "students",       label: "Students",      icon: Users },
      { value: "lectures",       label: "Lectures",      icon: BookOpen },
      { value: "programmes",     label: "Programmes",    icon: GraduationCap },
      { value: "allotments",     label: "Allotments",    icon: Users },
    ],
  },
  {
    group: "Attendance",
    items: [
      { value: "attendance",     label: "Control",       icon: CheckSquare },
      { value: "monthly",        label: "Monthly",       icon: BarChart3 },
      { value: "corrections",    label: "Corrections",   icon: FileEdit },
    ],
  },
  {
    group: "Engage",
    items: [
      { value: "announcements",  label: "Announce",      icon: Megaphone },
      { value: "events",         label: "Events",        icon: CalendarDays },
      { value: "polls",          label: "Polls",         icon: BarChart3 },
      { value: "daily_content",  label: "Daily",         icon: Sparkles },
      { value: "notifications",  label: "Notify",        icon: Bell },
    ],
  },
  {
    group: "System",
    items: [
      { value: "points",         label: "Points",        icon: Coins },
      { value: "scanner",        label: "ID Scanner",    icon: ScanLine },
      { value: "audit_log",      label: "Audit Log",     icon: FileText },
      { value: "branding",       label: "Branding",      icon: Palette },
      { value: "core_team",      label: "Core Team",     icon: UserCog },
      { value: "system_control", label: "Platform",      icon: Settings },
      { value: "settings",       label: "Settings",      icon: Settings },
      { value: "admin_profile",  label: "My Profile",    icon: Shield },
    ],
  },
];

const ALL_TABS: TabItem[] = TAB_GROUPS.flatMap((g) => g.items);

/* Scrollable mobile nav — grouped horizontal pill bar */
function MobileNav({ tab, setTab }: { tab: string; setTab: (v: string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeTab = ALL_TABS.find((t) => t.value === tab);

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 shadow-xs overflow-hidden">
      {/* Current tab header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border-subtle bg-surface-2/50">
        {activeTab && (
          <>
            <activeTab.icon className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-semibold text-foreground flex-1">{activeTab.label}</span>
          </>
        )}
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      {/* Scrollable groups */}
      <div ref={scrollRef} className="overflow-x-auto scrollbar-none">
        <div className="flex gap-0 min-w-max">
          {TAB_GROUPS.map((group, gi) => (
            <div key={group.group} className={cn("flex flex-col", gi > 0 && "border-l border-border-subtle")}>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold px-3 pt-2 pb-1">
                {group.group}
              </p>
              <div className="flex gap-0.5 px-2 pb-2">
                {group.items.map((t) => {
                  const Icon = t.icon;
                  const active = tab === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setTab(t.value)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all duration-120",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-surface-3"
                      )}
                    >
                      <Icon className="h-3 w-3 shrink-0" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Desktop grouped nav */
function DesktopNav({ tab, setTab }: { tab: string; setTab: (v: string) => void }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 p-3 shadow-xs overflow-x-auto">
      <div className="flex gap-5 min-w-max">
        {TAB_GROUPS.map((group) => (
          <div key={group.group} className="flex flex-col gap-1">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold px-1 mb-0.5">
              {group.group}
            </p>
            <div className="flex gap-0.5">
              {group.items.map((t) => {
                const Icon = t.icon;
                const active = tab === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setTab(t.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-120 cursor-pointer",
                      active
                        ? "bg-primary/10 text-primary border border-primary/15"
                        : "text-muted-foreground hover:text-foreground hover:bg-surface-3 border border-transparent"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const AdminDashboard = () => {
  const location = useLocation();
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    if (location.hash === "#admin_profile") setTab("admin_profile");
    if (location.hash === "#points")        setTab("points");
    if (location.hash === "#settings")      setTab("settings");
    if (location.hash === "#corrections")   setTab("corrections");
  }, [location.hash]);

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">

        {/* Nav — mobile gets scrollable pill bar, desktop gets grouped bar */}
        <div className="md:hidden">
          <MobileNav tab={tab} setTab={setTab} />
        </div>
        <div className="hidden md:block">
          <DesktopNav tab={tab} setTab={setTab} />
        </div>

        {/* Tab Content */}
        <TabsContent value="overview">
          <AdminOverviewTab onNavigateTab={setTab} />
        </TabsContent>
        <TabsContent value="students"><StudentManagementTab /></TabsContent>
        <TabsContent value="lectures"><LectureManagementTab /></TabsContent>
        <TabsContent value="programmes"><ProgrammeManagementTab /></TabsContent>
        <TabsContent value="allotments"><StudentAllotmentTab /></TabsContent>
        <TabsContent value="attendance"><AdminAttendanceControlTab /></TabsContent>
        <TabsContent value="monthly"><AdminMonthlyAttendance /></TabsContent>
        <TabsContent value="corrections"><AdminAttendanceCorrections /></TabsContent>
        <TabsContent value="announcements"><AdminAnnouncementsTab /></TabsContent>
        <TabsContent value="events"><AdminEventsTab /></TabsContent>
        <TabsContent value="polls"><AdminPollsTab /></TabsContent>
        <TabsContent value="daily_content"><AdminDailyContentTab /></TabsContent>
        <TabsContent value="notifications"><AdminNotificationCenterTab /></TabsContent>
        <TabsContent value="points"><AdminPointsAdjustmentsTab /></TabsContent>
        <TabsContent value="admin_profile"><AdminProfileSettings /></TabsContent>
        <TabsContent value="scanner"><AdminDigitalIdScanner /></TabsContent>
        <TabsContent value="system_control"><AdminSystemControlTab /></TabsContent>
        <TabsContent value="audit_log"><AdminAuditLogTab /></TabsContent>
        <TabsContent value="branding"><AdminBrandingTab /></TabsContent>
        <TabsContent value="core_team"><AdminCoreTeamTab /></TabsContent>
        <TabsContent value="settings">
          <div className="space-y-5">
            <PointsRulesSettings />
            <SystemHealthPanel />
            <AdminRoleBackfillPanel />
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">System Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-xs text-muted-foreground">Version</p><p className="font-medium">{APP_VERSION}</p></div>
                  <div><p className="text-xs text-muted-foreground">Build</p><p className="font-medium">{BUILD_NUMBER}</p></div>
                  <div><p className="text-xs text-muted-foreground">Release Date</p><p className="font-medium">{RELEASE_DATE}</p></div>
                  <div><p className="text-xs text-muted-foreground">Environment</p><Badge variant="secondary" className="text-[10px]">{ENVIRONMENT}</Badge></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
