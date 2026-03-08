import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  clearOneSignalUser,
  identifyOneSignalUser,
  initializeOneSignal,
  isOneSignalConfigured,
  promptOneSignalSlidedown,
} from "@/lib/onesignal";

const promptKey = (userId: string) => `onesignal_slidedown_seen_${userId}`;

function kindPrefix(kind: string) {
  if (kind === "lecture_reminder") return "📚 Lecture reminder";
  if (kind === "achievement") return "🏆 Achievement unlocked";
  if (kind === "announcement") return "📢 Announcement";
  if (kind === "attendance_alert") return "🗓️ Attendance alert";
  if (kind === "system_update") return "⚙️ System update";
  return "🔔 Notification";
}

export default function OneSignalManager() {
  useEffect(() => {
    void initializeOneSignal();

    const syncUser = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        await clearOneSignalUser();
        return null;
      }

      const [{ data: roleRow }, { data: profileRow }] = await Promise.all([
        supabase.from("user_roles").select("role,college_id").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("college_id,class_name").eq("user_id", user.id).maybeSingle(),
      ]);

      const role = (roleRow?.role ?? "student") as "student" | "admin" | "super_admin";
      const college_id = roleRow?.college_id ?? profileRow?.college_id ?? null;
      const class_name = profileRow?.class_name ?? null;

      await identifyOneSignalUser(user.id, { role, college_id, class_name });

      if (!localStorage.getItem(promptKey(user.id))) {
        await promptOneSignalSlidedown();
        localStorage.setItem(promptKey(user.id), "1");
      }

      return user.id;
    };

    let activeChannel: ReturnType<typeof supabase.channel> | null = null;

    const bindRealtimeToasts = async () => {
      const uid = await syncUser();
      if (!uid) return;

      activeChannel = supabase
        .channel(`onesignal_toast_${uid}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notification_recipients",
            filter: `user_id=eq.${uid}`,
          },
          async (payload) => {
            const row = payload.new as { notification_id?: string };
            if (!row?.notification_id) return;

            const { data: notification } = await supabase
              .from("notifications")
              .select("title,body,kind")
              .eq("id", row.notification_id)
              .maybeSingle();

            if (!notification) return;
            toast.info(`${kindPrefix(notification.kind)}: ${notification.title}`, {
              description: notification.body,
              duration: 3200,
            });
          }
        )
        .subscribe();
    };

    void bindRealtimeToasts();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
        activeChannel = null;
      }

      if (!session?.user) {
        await clearOneSignalUser();
        return;
      }

      await syncUser();
      await bindRealtimeToasts();
    });

    return () => {
      subscription.unsubscribe();
      if (activeChannel) supabase.removeChannel(activeChannel);
    };
  }, []);

  if (!isOneSignalConfigured()) return null;
  return null;
}
