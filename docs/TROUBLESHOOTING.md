# Campus Connect — Migration & Production Troubleshooting

## 1. Migration Issues

### Issue: `permission denied for schema extensions`
- **Cause**: Trying to install extensions in schemas other than `extensions`.
- **Solution**: Ensure your migrations include `CREATE EXTENSION IF NOT EXISTS <name> WITH SCHEMA extensions;` (already configured across all 79 migrations).

### Issue: `relation "storage.buckets" does not exist`
- **Cause**: Running storage SQL before Supabase storage service is initialized.
- **Solution**: In new Supabase projects, initialize Storage via the Supabase dashboard or create the 4 buckets (`lecture-flyers`, `documents`, `submissions`, `verify-documents`) via the dashboard UI.

---

## 2. Authentication & Login Issues

### Issue: `Student ID login fails with "User not found"`
- **Cause**: The student does not have an entry in `public.profiles` matching `student_id`, or `auth-resolve-identifier` Edge Function is not deployed.
- **Solution**:
  1. Verify `/functions/v1/auth-resolve-identifier` is deployed with `verify_jwt = false` in `supabase/config.toml`.
  2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Edge Function secrets.

### Issue: `Login succeeds but redirects to /auth or shows empty screen`
- **Cause**: Authenticated user has no row in `public.user_roles` linking them to a `college_id` and `role`.
- **Solution**: Check `public.user_roles` for the user's `user_id`. Ensure `college_id` is set to an active college in `public.colleges`.

---

## 3. Storage & Upload Issues

### Issue: `403 Forbidden on PDF / Document Upload`
- **Cause**: RLS policy violation on `storage.objects` or missing bucket.
- **Solution**: Verify the bucket exists and that the user's role is `admin` or `faculty` for public document uploads, or that the student is uploading into their own `{user_id}/*` prefix in `submissions`.

---

## 4. Web Push Notification Issues

### Issue: `VAPID signing failure (ES256 error)`
- **Cause**: Missing or malformed `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` secrets.
- **Solution**: Deploy `generate-vapid-keys` Edge Function or generate a valid base64url-encoded P-256 keypair and set in Edge Function secrets via `supabase secrets set`.
