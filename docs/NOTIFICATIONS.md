# Campus Connect — Notifications & Web Push Architecture

Campus Connect includes an end-to-end multi-channel notification engine supporting:
1. **In-App Notifications**: Stored in Postgres and delivered in real-time via Supabase Realtime channels.
2. **Web Push Notifications**: Browser standard Push API with VAPID signing (RFC 8292) delivered to service workers on desktop and mobile PWA.

---

## 1. Notification Database Pipeline

```
  Admin / System Action
           │
           ▼
  [send-notification Edge Function]
           │
     ┌─────┴─────────────────────────┐
     ▼                               ▼
[notifications Table]       [push_subscriptions Table]
     │                               │
     ▼                               ▼
[notification_recipients]    [Native Web Crypto ES256 VAPID Signing]
     │                               │
     ▼ (Supabase Realtime)           ▼ (HTTPS Web Push Protocol)
[In-App Toast & Inbox]       [Browser OS Push Service (FCM, Apple, Mozilla)]
```

### Database Tables:
- `notifications`: Master notification content, category, urgency, action link, sender ID, college ID.
- `notification_recipients`: Per-user delivery ledger (`unread`, `read`, `archived`, `delivered_at`).
- `notification_preferences`: Per-user opt-in flags for lecture updates, announcements, event alerts, rewards.
- `push_subscriptions`: Stores browser PushSubscription objects (`endpoint`, `p256dh` key, `auth` key, `user_agent`).
- `scheduled_notifications`: Future scheduled notification broadcasts.

---

## 2. VAPID Configuration & Web Push Protocol

The `send-notification` function performs standard RFC 8292 ES256 JWT signing directly in Deno without relying on third-party npm packages.

### Generating VAPID Keys
To generate keys for your independent Supabase deployment:
```bash
# Using Node / web-push CLI
npx web-push generate-vapid-keys
```
Or use the included Edge function:
```bash
curl -X POST https://<your-project>.supabase.co/functions/v1/generate-vapid-keys \
  -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>"
```

### Setting VAPID Secrets
```bash
npx supabase secrets set \
  VAPID_PUBLIC_KEY="<public_key>" \
  VAPID_PRIVATE_KEY="<private_key>" \
  VAPID_SUBJECT="mailto:admin@yourcollege.edu"
```

---

## 3. Frontend Subscription Registration

1. **Service Worker Registration**:
   `public/sw.js` handles `push` and `notificationclick` events.
2. **Permission & Subscription**:
   In `src/pages/student/NotificationSettings.tsx`:
   - Checks `Notification.requestPermission()`.
   - Calls `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY })`.
   - Posts subscription credentials to the `subscribe-web-push` Edge Function.

---

## 4. Scheduled Notification Dispatch

The `notification-scheduler` Edge Function scans `scheduled_notifications` for items due for delivery (`scheduled_for <= NOW() AND status = 'scheduled'`) and invokes `send-notification` with target recipient criteria.
