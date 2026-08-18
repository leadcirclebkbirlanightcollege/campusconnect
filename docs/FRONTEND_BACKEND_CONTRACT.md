# Campus Connect — Frontend-Backend Contract Matrix

This contract details how every user interface component and screen connects to PostgreSQL tables, Remote Procedure Calls (RPCs), Edge Functions, Storage buckets, and Realtime channels.

---

## 1. Student Portal Modules

### 1.1 Authentication & Login
- **Frontend Files**: `src/pages/Auth.tsx`, `src/pages/onboarding/OnboardingWizard.tsx`, `src/pages/PendingApproval.tsx`
- **Backend Resources**:
  - Edge Function: `auth-resolve-identifier` (resolves student_id to email)
  - Tables: `auth.users`, `public.profiles`, `public.user_roles`, `public.login_activity`
  - Edge Function: `retention-on-login`
- **Auth Requirement**: Public / Anonymous during login; Authenticated for profile setup
- **Role Requirement**: `student`
- **Tenant Scope**: Tenant resolved via `user_roles.college_id`

### 1.2 Student Dashboard & Timetable
- **Frontend Files**: `src/pages/student/StudentDashboard.tsx`, `src/pages/student/StudentTimetable.tsx`
- **Backend Resources**:
  - Tables: `lectures`, `timetable_slots`, `departments`, `classes`, `academic_years`, `daily_checkins`, `student_streaks`
  - Edge Function: `daily-checkin`
- **Auth Requirement**: Authenticated
- **Role Requirement**: `student`
- **Tenant Scope**: `college_id = get_my_college_id()`

### 1.3 QR Attendance & Live Status
- **Frontend Files**: `src/pages/student/StudentScanAttendance.tsx`, `src/components/qr/QrScannerDialog.tsx`, `src/pages/student/attendance/AttendanceLiveCard.tsx`
- **Backend Resources**:
  - Edge Function: `mark-attendance`
  - Tables: `attendance`, `lectures`, `points_ledger`
  - Realtime: `attendance_status_${userId}`
- **Auth Requirement**: Authenticated
- **Role Requirement**: `student`
- **Tenant Scope**: Scoped to active lecture's `college_id`

### 1.4 Student Assignments & Submissions
- **Frontend Files**: `src/pages/student/StudentAssignments.tsx`
- **Backend Resources**:
  - Tables: `assignments`, `submissions`
  - Storage Bucket: `submissions` (Path: `${auth.uid()}/${assignment_id}/*`)
- **Auth Requirement**: Authenticated
- **Role Requirement**: `student`
- **Tenant Scope**: Filtered by active student `college_id`

### 1.5 Academic Documents & Notes
- **Frontend Files**: `src/pages/student/StudentDocuments.tsx`
- **Backend Resources**:
  - Tables: `documents`
  - Storage Bucket: `documents` (Public URL)
- **Auth Requirement**: Authenticated
- **Role Requirement**: `student`
- **Tenant Scope**: `college_id = get_my_college_id()`

### 1.6 Points, Rewards & Leaderboard
- **Frontend Files**: `src/pages/student/points/StudentPoints.tsx`, `src/pages/Leaderboard.tsx`
- **Backend Resources**:
  - Tables: `points_ledger`, `point_claims`, `achievements`, `student_achievements`, `rewards_catalogue`
- **Auth Requirement**: Authenticated
- **Role Requirement**: `student`
- **Tenant Scope**: `college_id = get_my_college_id()`

### 1.7 Student Digital ID Card
- **Frontend Files**: `src/pages/student/StudentDigitalId.tsx`
- **Backend Resources**:
  - Tables: `profiles`, `student_cards`, `colleges`
- **Auth Requirement**: Authenticated
- **Role Requirement**: `student`
- **Tenant Scope**: `college_id = get_my_college_id()`

---

## 2. Faculty Portal Modules

### 2.1 Faculty Dashboard & Lecture Management
- **Frontend Files**: `src/pages/faculty/FacultyDashboard.tsx`, `src/pages/faculty/FacultyLectures.tsx`
- **Backend Resources**:
  - Tables: `lectures`, `attendance`, `timetable_slots`, `classes`
  - Edge Function: `finalize-attendance`, `lecture-status-notify`
- **Auth Requirement**: Authenticated
- **Role Requirement**: `faculty` (or `admin`)
- **Tenant Scope**: `college_id = get_my_college_id()`

### 2.2 Faculty Assignments & Grading
- **Frontend Files**: `src/pages/faculty/FacultyAssignments.tsx`
- **Backend Resources**:
  - Tables: `assignments`, `submissions`, `profiles`
  - Storage Bucket: `submissions`
- **Auth Requirement**: Authenticated
- **Role Requirement**: `faculty`
- **Tenant Scope**: `college_id = get_my_college_id()`

---

## 3. College Admin Portal Modules

### 3.1 Attendance Management & Live Monitor
- **Frontend Files**: `src/pages/admin/attendance/AdminAttendancePage.tsx`, `src/pages/admin/attendance/AdminAttendanceLiveView.tsx`
- **Backend Resources**:
  - Tables: `attendance`, `attendance_audit_log`, `lectures`, `profiles`
  - RPC: `get_lecture_attendance_summary`
  - Edge Functions: `admin-generate-attendance`, `admin-update-attendance`
  - Realtime: `admin_attendance_live_${lectureId}`
- **Auth Requirement**: Authenticated
- **Role Requirement**: `admin`
- **Tenant Scope**: `college_id = get_my_college_id()`

### 3.2 Student Management & Promotion
- **Frontend Files**: `src/pages/admin/students/AdminStudentsPage.tsx`
- **Backend Resources**:
  - Tables: `profiles`, `user_roles`, `classes`, `programmes`
  - Edge Functions: `admin-create-student`, `academic-promote-students`, `admin-reset-college-students`
- **Auth Requirement**: Authenticated
- **Role Requirement**: `admin`
- **Tenant Scope**: `college_id = get_my_college_id()`

### 3.3 Document Issuance & Verification Management
- **Frontend Files**: `src/pages/admin/verify/AdminVerifyDocumentsPage.tsx`, `src/pages/verify/DocumentVerificationPage.tsx`
- **Backend Resources**:
  - Tables: `verify_documents`
  - Storage Bucket: `verify-documents` (Private)
  - RPCs: `verify_document_public`, `verify_document_touch`
- **Auth Requirement**: Admin for issuance; Public for verification page
- **Role Requirement**: `admin` for creation; Any for verification
- **Tenant Scope**: Admin scoped to college; Verification token globally resolved

---

## 4. Super Admin Control Plane

### 4.1 Multi-College Tenant ERP
- **Frontend Files**: `src/pages/platform/pages/SACollegesPage.tsx`, `src/pages/platform/components/CollegeManagement.tsx`
- **Backend Resources**:
  - Tables: `colleges`, `profiles`, `lectures`
- **Auth Requirement**: Authenticated
- **Role Requirement**: `super_admin`
- **Tenant Scope**: Global (Bypasses all `college_id` boundaries)

### 4.2 Platform Administrators & Security Controls
- **Frontend Files**: `src/pages/platform/pages/SAAdminsPage.tsx`, `src/pages/platform/pages/SACreateAdminPage.tsx`, `src/pages/platform/pages/SASecurityPage.tsx`
- **Backend Resources**:
  - Tables: `auth.users`, `user_roles`, `audit_logs`
  - Edge Functions: `super-admin-create-admin`, `super-admin-reset-students`, `health-check`
- **Auth Requirement**: Authenticated
- **Role Requirement**: `super_admin`
- **Tenant Scope**: Global
