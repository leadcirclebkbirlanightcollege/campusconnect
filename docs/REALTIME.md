# Campus Connect — Supabase Realtime Architecture

Campus Connect utilizes Supabase Realtime over WebSockets (`supabase.channel(...)`) for live attendance tracking, instant notification toasts, and dynamic updates.

---

## 1. Supabase Realtime Publications

To enable realtime broadcasting on an independent Supabase project, the relevant tables must be added to the `supabase_realtime` publication:

```sql
-- Enable Realtime Replication for core interactive tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_recipients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campus_polls;
```

---

## 2. Active Realtime Channels in Codebase

| Channel Name Pattern | Event Type | Target Table | Filter / Scope | Frontend Listener Files |
|---|---|---|---|---|
| `admin_attendance_live_${lectureId}` | `INSERT` / `UPDATE` | `public.attendance` | `lecture_id=eq.${lectureId}` | `src/pages/admin/attendance/AdminAttendanceLiveView.tsx` |
| `attendance_status_${userId}` | `INSERT` | `public.attendance` | `student_user_id=eq.${userId}` | `src/pages/student/attendance/AttendanceLiveCard.tsx`, `StudentScanAttendance.tsx` |
| `notifications_${userId}` | `INSERT` / `UPDATE` | `public.notification_recipients` | `user_id=eq.${userId}` | `src/providers/GlobalAuthListener.tsx`, `StudentInbox.tsx` |
| `chat_messages_${collegeId}` | `INSERT` | `public.messages` | `college_id=eq.${collegeId}` | `src/pages/student/chat/`, `CommunityHub.tsx` |
| `announcements_${collegeId}` | `INSERT` | `public.announcements` | `college_id=eq.${collegeId}` | `src/pages/student/announcements/`, `AdminAnnouncementsPage.tsx` |

---

## 3. Realtime Implementation Details

### Live Admin Attendance View
In `src/pages/admin/attendance/AdminAttendanceLiveView.tsx`:
```ts
const channel = supabase
  .channel(`admin_attendance_live_${lectureId}`)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "attendance",
      filter: `lecture_id=eq.${lectureId}`,
    },
    () => {
      // Invalidate query cache and reload student presence lists immediately
      presentQuery.refetch();
      summaryQuery.refetch();
    }
  )
  .subscribe();
```

### In-App Notification Bell Realtime Listener
In `src/providers/GlobalAuthListener.tsx` & `src/pages/student/StudentInbox.tsx`:
```ts
const channel = supabase
  .channel(`notifications_${user.id}`)
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "notification_recipients",
      filter: `user_id=eq.${user.id}`,
    },
    (payload) => {
      // Trigger toast and update badge counter
      qc.invalidateQueries({ queryKey: ["unread_notifications_count"] });
    }
  )
  .subscribe();
```

---

## 4. Verification Checklist for Independent Supabase
1. In the Supabase Dashboard, navigate to **Database > Publications > supabase_realtime**.
2. Confirm that `attendance`, `notification_recipients`, `messages`, and `announcements` are checked.
3. Test WebSocket connection in browser network tab (`/realtime/v1/websocket`).
