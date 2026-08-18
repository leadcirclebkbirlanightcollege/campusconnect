# Campus Connect — Comprehensive Feature Inventory

This document inventories every verified feature and user experience module in the Campus Connect codebase.

---

## 1. Student Experience Portal (`/app/*`)

- **Interactive Dashboard (`/app/dashboard`)**:
  - Daily greeting, dynamic streak counter, check-in card, and lecture countdown.
  - Quick action buttons (Mark Attendance, View Timetable, Assignments, Points balance).
  - PWA install prompts and platform status alerts.
- **Dynamic QR Attendance Scanner (`/app/attendance/scan`)**:
  - Live camera scanner using `html5-qrcode` and `jsqr`.
  - Single-use rotating TOTP token verification with geofence proximity validation.
  - Instant sound feedback and visual success card with attendance streak progress.
- **Attendance History (`/app/attendance/history`)**:
  - Monthly attendance percentage breakdown by course and subject.
  - Daily attendance logs with verification status badges.
- **Master Timetable (`/app/timetable`)**:
  - Day-by-day weekly timetable grid with room numbers and faculty details.
  - Active lecture highlight with live countdown indicators.
- **Examination Results (`/app/results`)**:
  - Semester-wise GPA and subject marks viewer.
  - Grade status indicator with downloadable mark sheets.
- **Assignments & Homework (`/app/assignments`)**:
  - Filter by Pending, Submitted, Graded.
  - File uploader supporting up to 5 multi-file attachments (max 20MB per file).
  - Feedback and marks viewer.
- **Study Materials & Documents (`/app/documents`)**:
  - Filterable by Notes, Syllabus, Assignments, Resources.
  - Fast search by title or subject with direct PDF download.
- **Gamification, Points & Badges (`/app/points`)**:
  - Realtime points balance with full credit/debit transaction ledger.
  - 8 Unlockable achievement badges with progress percentages.
  - Daily login streak tracking with bonus reward multipliers.
  - Reward catalogue for campus merchandise redemption.
- **Campus Leaderboards (`/app/leaderboard`)**:
  - Realtime top 100 student rankings filtered by class, department, and college.
  - Gold, Silver, Bronze badges.
- **Digital Student Identity Card (`/app/id-card`)**:
  - Digital smart ID card featuring student photo, roll number, department, QR token, and college seal.
- **Community Hub & Campus Life (`/app/community`)**:
  - Hub matrix linking to Events, Announcements, Learning Circles, and Support.
- **Campus Events & Stalls (`/app/events`)**:
  - Cultural and technical event registrations with live capacity tracker.
  - E-Cell entrepreneurship stall registrations and showcase.
- **Notification Inbox & Web Push (`/app/inbox`, `/app/notification-settings`)**:
  - In-app notification center with read/unread toggle and deep linking.
  - Web Push notification toggle with custom channel preferences.
- **Profile Management (`/app/profile`)**:
  - Edit personal details, avatar upload, and password change.
- **Help & Grievance Support (`/app/support`)**:
  - Submit support tickets to college staff with resolution tracking.

---

## 2. Faculty Portal (`/faculty/*`)

- **Faculty Dashboard (`/faculty/dashboard`)**:
  - Daily scheduled lectures overview, quick attendance launch, and class rosters.
- **Live Lecture & Attendance Controller (`/faculty/lectures`)**:
  - Start lecture, project dynamic rotating QR codes for auditorium screens.
  - Realtime present student counter via Supabase Realtime subscriptions.
  - Manual student attendance overrides with reason logging.
  - Attendance finalization and points reward commit.
- **Faculty Assignment Manager (`/faculty/assignments`)**:
  - Create assignments with due dates, maximum marks, and syllabus attachments.
  - Review student submissions, view submitted attachments, grade marks, and provide written feedback.
- **Faculty Profile & Schedule (`/faculty/profile`)**:
  - View allocated subjects, timetable slots, and assigned divisions.

---

## 3. College Administrator Portal (`/platform/admin/*`)

- **College ERP Dashboard (`/platform/admin/dashboard`)**:
  - Total enrolled students, daily attendance percentage, active lectures, and verified document tallies.
- **Live Attendance Command Center (`/platform/admin/attendance`)**:
  - Realtime multi-classroom attendance monitor.
  - Batch attendance generation for scheduled classes.
  - Attendance audit log inspecting all manual modifications.
- **Student Information System (`/platform/admin/students`)**:
  - Searchable student directory with filters by department, class, and approval status.
  - Student profile verification and account approval.
  - Direct student onboarding and bulk batch promotion (FY -> SY -> TY).
  - Reset college student records.
- **Faculty Management (`/platform/admin/faculty`)**:
  - Manage faculty profiles, assign teaching departments, and configure subject allocations.
- **Academic Structure Manager (`/platform/admin/departments`)**:
  - Configure departments, programmes, classes, and academic years.
  - Configure timetable slots with room designations and timing.
- **Academic Document Publisher (`/platform/admin/documents`)**:
  - Upload notes, notices, and syllabi to the `documents` storage bucket with role-based access control.
- **Tamper-Proof Document Verification Center (`/platform/admin/verify`)**:
  - Issue official certificates, degrees, awards, and ID cards with cryptographic QR verification tokens.
  - Upload official PDF documents to private `verify-documents` bucket.
  - Revoke, reactivate, or audit document scan counts.
- **Campus Announcements & Notifications (`/platform/admin/announcements`, `/platform/admin/notifications`)**:
  - Compose rich broadcast notifications targeting specific classes, departments, or entire colleges.
  - Schedule future notification dispatches.
- **Sub-Role Capabilities Matrix (`/platform/admin/permissions`)**:
  - Configure granular capability overrides for Head of Department (HOD), Class Coordinators, and Event Managers.
- **College Branding & Settings (`/platform/admin/settings`)**:
  - Customize college primary/secondary colors, crest/logo, tagline, and contact information.

---

## 4. Super Admin Multi-Tenant Control Plane (`/platform/admin-control/*`)

- **Tenant College Directory (`/platform/admin-control/colleges`)**:
  - Add, edit, suspend, or activate institution tenants.
  - Configure tenant feature toggles (Attendance, Gamification, E-Cell, Events, Results).
- **Platform Analytics (`/platform/admin-control/analytics`)**:
  - Cross-college student adoption graphs, retention curves, and daily active user metrics.
- **Admin Account Management (`/platform/admin-control/admins`)**:
  - Provision college admin credentials linked to specific institutions.
- **Global White-Label Branding (`/platform/admin-control/branding`)**:
  - Configure platform brand name, tagline, master logo, and favicon.
- **Security & Platform Health (`/platform/admin-control/health`, `/platform/admin-control/security`)**:
  - Database latency monitor, API health check probe, and audit logs.
  - Platform-wide student cohort reset utilities.
- **Institution Partners Showcase (`/platform/admin-control/partners`)**:
  - Manage landing page marquee partners and accreditation badges.

---

## 5. Public / Landing Pages

- **Landing Page (`/`)**: Hero, feature showcase, dynamic partner marquee, gamification preview, and mobile app call to action.
- **Admissions / Demo Booking (`/book-demo`)**: Lead capture for prospective colleges.
- **Public Document Verification (`/verify/:reference?t=:token`)**:
  - Universal, tamper-proof document verification screen with instant validation badges.
  - Generates short-lived signed PDF viewing links for legitimate certificates.
- **Legal Compliance (`/privacy`, `/terms`)**: Comprehensive privacy policy and terms of service.
