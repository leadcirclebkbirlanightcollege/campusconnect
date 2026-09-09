# Campus Connect — Production Supabase Auth Email Template System

This directory contains the production-ready email templates for **Campus Connect** at **B. K. Birla Night Arts, Science & Commerce College, Kalyan**.

All emails are processed and dispatched natively by **Supabase Auth (GoTrue)** using custom **Zoho SMTP**.

> [!IMPORTANT]
> **SMTP Configuration Unchanged**:
> This task does **NOT** modify the SMTP server, credentials, ports, or sender configuration. Zoho SMTP (`smtp.zoho.in:465`, SSL, `noreply@campusconnect.indevs.in`) remains verified and intact.

---

## 1. Complete Email Template Matrix

The following table lists all 13 official email templates supported by Supabase Auth, categorized into **Authentication Emails** and **Security Notification Emails**.

### Part A: Authentication Emails

| Template | Type | When it is sent | Supabase Dashboard location | Supported variables | CTA required? | OTP required? | Security warning required? |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| [`confirm-signup.html`](./confirm-signup.html) | Authentication | User signs up with email & password | `Authentication` &rarr; `Email Templates` &rarr; `Confirm signup` | `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .TokenHash }}`, `{{ .SiteURL }}`, `{{ .Email }}`, `{{ .RedirectTo }}`, `{{ .Data }}` | **Yes** (`{{ .ConfirmationURL }}`) | **Yes** (`{{ .Token }}`) | **Yes** (Safe to ignore if not registered) |
| [`invite-user.html`](./invite-user.html) | Authentication | Admin invites a user via email | `Authentication` &rarr; `Email Templates` &rarr; `Invite user` | `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .TokenHash }}`, `{{ .SiteURL }}`, `{{ .Email }}`, `{{ .RedirectTo }}`, `{{ .Data }}` | **Yes** (`{{ .ConfirmationURL }}`) | Optional | **Yes** (Ignore if unexpected) |
| [`magic-link.html`](./magic-link.html) | Authentication | User requests passwordless sign-in | `Authentication` &rarr; `Email Templates` &rarr; `Magic Link` | `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .TokenHash }}`, `{{ .SiteURL }}`, `{{ .Email }}`, `{{ .RedirectTo }}`, `{{ .Data }}` | **Yes** (`{{ .ConfirmationURL }}`) | **Yes** (`{{ .Token }}`) | **Yes** (Single session expiry notice) |
| [`change-email.html`](./change-email.html) | Authentication | User initiates email change in app | `Authentication` &rarr; `Email Templates` &rarr; `Change Email Address` | `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .TokenHash }}`, `{{ .SiteURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .RedirectTo }}`, `{{ .Data }}` | **Yes** (`{{ .ConfirmationURL }}`) | **Yes** (`{{ .Token }}`) | **Yes** (Alert if not requested) |
| [`reset-password.html`](./reset-password.html) | Authentication | User clicks "Forgot password" | `Authentication` &rarr; `Email Templates` &rarr; `Reset Password` | `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .TokenHash }}`, `{{ .SiteURL }}`, `{{ .Email }}`, `{{ .RedirectTo }}`, `{{ .Data }}` | **Yes** (`{{ .ConfirmationURL }}`) | **Yes** (`{{ .Token }}`) | **Yes** (Password unchanged until link clicked) |
| [`reauthentication.html`](./reauthentication.html) | Authentication | Sensitive in-app action triggers MFA / sudo reauth | `Authentication` &rarr; `Email Templates` &rarr; `Reauthentication` | `{{ .Token }}`, `{{ .Email }}`, `{{ .SiteURL }}`, `{{ .Data }}` | **No** (OTP only; no URL provided) | **Yes** (`{{ .Token }}`) | **Yes** (Do not share code advisory) |

---

### Part B: Security Notification Emails

Security notification emails are notification-only alerts dispatched to inform users of account security state changes. They do **not** provide confirmation links or authentication CTAs.

| Template | Type | When it is sent | Supabase Dashboard location | Supported variables | CTA required? | OTP required? | Security warning required? |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| [`password-changed.html`](./password-changed.html) | Security Notification | Account password has been updated | `Authentication` &rarr; `Email Templates` &rarr; `Password changed` | `{{ .Email }}`, `{{ .SiteURL }}`, `{{ .Data }}` | **No** (Notification only) | **No** | **Yes** ("If you did not make this change...") |
| [`email-changed.html`](./email-changed.html) | Security Notification | Account primary email has been updated | `Authentication` &rarr; `Email Templates` &rarr; `Email address changed` | `{{ .OldEmail }}`, `{{ .Email }}`, `{{ .SiteURL }}`, `{{ .Data }}` | **No** (Notification only) | **No** | **Yes** ("If you did not make this change...") |
| [`phone-changed.html`](./phone-changed.html) | Security Notification | Account phone number has been updated | `Authentication` &rarr; `Email Templates` &rarr; `Phone number changed` | `{{ .OldPhone }}`, `{{ .Phone }}`, `{{ .Email }}`, `{{ .SiteURL }}`, `{{ .Data }}` | **No** (Notification only) | **No** | **Yes** ("If you did not make this change...") |
| [`mfa-enrolled.html`](./mfa-enrolled.html) | Security Notification | MFA factor enrolled on account | `Authentication` &rarr; `Email Templates` &rarr; `Verification method added` | `{{ .FactorType }}`, `{{ .Email }}`, `{{ .SiteURL }}`, `{{ .Data }}` | **No** (Notification only) | **No** | **Yes** ("If you did not make this change...") |
| [`mfa-unenrolled.html`](./mfa-unenrolled.html) | Security Notification | MFA factor removed from account | `Authentication` &rarr; `Email Templates` &rarr; `Verification method removed` | `{{ .FactorType }}`, `{{ .Email }}`, `{{ .SiteURL }}`, `{{ .Data }}` | **No** (Notification only) | **No** | **Yes** ("If you did not make this change...") |
| [`identity-linked.html`](./identity-linked.html) | Security Notification | OAuth identity linked to account | `Authentication` &rarr; `Email Templates` &rarr; `Sign-in method linked` | `{{ .Provider }}`, `{{ .Email }}`, `{{ .SiteURL }}`, `{{ .Data }}` | **No** (Notification only) | **No** | **Yes** ("If you did not make this change...") |
| [`identity-unlinked.html`](./identity-unlinked.html) | Security Notification | OAuth identity unlinked from account | `Authentication` &rarr; `Email Templates` &rarr; `Sign-in method removed` | `{{ .Provider }}`, `{{ .Email }}`, `{{ .SiteURL }}`, `{{ .Data }}` | **No** (Notification only) | **No** | **Yes** ("If you did not make this change...") |

---

## 2. Supported Variables vs Intentionally Omitted Variables

According to current official Supabase documentation (`https://supabase.com/docs/guides/auth/auth-email-templates`):

### Officially Supported Variables Per Template

1. **`{{ .ConfirmationURL }}`**:
   - Supported: `confirm-signup`, `invite-user`, `magic-link`, `change-email`, `reset-password`.
   - **NOT supported**: `reauthentication`, and all 7 security notifications.
2. **`{{ .Token }}`**:
   - Supported: `confirm-signup`, `invite-user`, `magic-link`, `change-email`, `reset-password`, `reauthentication`.
   - Contains a 6-digit one-time password (OTP).
3. **`{{ .TokenHash }}`**:
   - Supported in authentication templates where custom verification links are assembled.
4. **`{{ .SiteURL }}`**:
   - Supported across all templates. Contains configured site URL (`https://campusconnect.indevs.in`).
5. **`{{ .Email }}`**:
   - Supported across all templates. Represents user's active/target email.
6. **`{{ .NewEmail }}`**:
   - Supported **ONLY** in `change-email` (`Change email address`).
7. **`{{ .OldEmail }}`**:
   - Supported **ONLY** in `email-changed` (`Email address changed notification`).
8. **`{{ .Phone }}` and `{{ .OldPhone }}`**:
   - Supported **ONLY** in `phone-changed` (`Phone number changed notification`).
9. **`{{ .Provider }}`**:
   - Supported **ONLY** in `identity-linked` and `identity-unlinked` (`Sign-in method linked / removed`).
10. **`{{ .FactorType }}`**:
    - Supported **ONLY** in `mfa-enrolled` and `mfa-unenrolled` (`Verification method added / removed`).
11. **`{{ .Data }}`**:
    - Contains user metadata from `auth.users.user_metadata`.

### Intentionally Omitted / Unused Variables

- **`{{ .RedirectTo }}`**: Intentionally omitted from static action buttons because `{{ .ConfirmationURL }}` already contains the fully-encoded server redirect parameters configured on the client and Supabase allow list.
- **`{{ .ConfirmationURL }}` in Reauthentication**: Supabase GoTrue treats reauthentication strictly as an in-app challenge. No confirmation URL exists in reauthentication context; injecting it would break rendering or confuse users.
- **`{{ .ConfirmationURL }}` and `{{ .Token }}` in Security Notifications**: Security notifications indicate past events (e.g. password was changed). They are strictly informational and must NOT contain authentication links or OTPs.

---

## 3. Template Feature Breakdown

### Templates Containing CTA Buttons (5)
- `confirm-signup.html` &rarr; "Verify Email Address &rarr;"
- `invite-user.html` &rarr; "Accept Invitation &rarr;"
- `magic-link.html` &rarr; "Sign In to Campus Connect &rarr;"
- `change-email.html` &rarr; "Confirm New Email &rarr;"
- `reset-password.html` &rarr; "Reset Password &rarr;"

### Templates Using OTPs (5)
- `confirm-signup.html` &rarr; 6-digit code fallback
- `magic-link.html` &rarr; 6-digit one-time code fallback
- `change-email.html` &rarr; 6-digit code fallback
- `reset-password.html` &rarr; 6-digit code fallback
- `reauthentication.html` &rarr; 6-digit primary verification code

### Templates That Are Notification-Only (7)
- `password-changed.html`
- `email-changed.html`
- `phone-changed.html`
- `mfa-enrolled.html`
- `mfa-unenrolled.html`
- `identity-linked.html`
- `identity-unlinked.html`

All notification-only templates include a structured security event box and a prominent amber warning box:
> "Important Security Warning: If you did not make this change, please contact institutional support immediately..."

---

## 4. Supabase Dashboard Deployment Instructions

To paste and activate these templates in the Supabase Dashboard:

1. Open the [Supabase Dashboard](https://supabase.com/dashboard/project/_/auth/templates).
2. Go to **Authentication** &rarr; **Email Templates**.
3. For each template:
   - Click the template entry in the list.
   - Set the **Subject** line as documented in the table below.
   - Open the matching local `.html` file from `docs/email-templates/`.
   - Copy the entire HTML and paste into the **Body** field.
   - Click **Save**.

### Subject Line Reference

| Template | Recommended Subject Line |
| :--- | :--- |
| `confirm-signup.html` | `Verify your email address — Campus Connect` |
| `invite-user.html` | `You've been invited to Campus Connect` |
| `magic-link.html` | `Your Campus Connect sign-in link` |
| `change-email.html` | `Confirm your new email address — Campus Connect` |
| `reset-password.html` | `Reset your Campus Connect password` |
| `reauthentication.html` | `Confirm your identity — Campus Connect` |
| `password-changed.html` | `Security Notice: Your password was changed — Campus Connect` |
| `email-changed.html` | `Security Notice: Your email address was changed — Campus Connect` |
| `phone-changed.html` | `Security Notice: Your phone number was changed — Campus Connect` |
| `mfa-enrolled.html` | `Security Notice: A new verification method was added — Campus Connect` |
| `mfa-unenrolled.html` | `Security Notice: A verification method was removed — Campus Connect` |
| `identity-linked.html` | `Security Notice: A sign-in method was linked — Campus Connect` |
| `identity-unlinked.html` | `Security Notice: A sign-in method was removed — Campus Connect` |

> [!NOTE]
> For security notification templates, verify in your Supabase project settings that security notifications are enabled (e.g. `mailer_notifications_*_enabled: true`).

---

## 5. Design & Deliverability Standards

1. **Fluid Hybrid Layout**:
   - Table-based layout with `role="presentation"` and `560px` max-width container.
   - Outlook conditional comments (`<v:roundrect>`) for bulletproof button rendering.
2. **Branding & Visual Hierarchy**:
   - Header gradient (`#0b1220` to `#172554`) with Campus Connect logo.
   - Official institutional credit: *B. K. Birla Night Arts, Science & Commerce College, Kalyan*.
   - System typography stack (Apple System, BlinkMacSystemFont, Segoe UI, Roboto).
3. **Strict Deliverability & Privacy**:
   - Zero external tracking scripts, telemetry pixels, or Google Analytics tags.
   - No broken links or unauthorized third-party CDN dependencies.
   - Plaintext fallback links provided for email clients that strip HTML buttons.
