# Campus Connect — File Storage Specification

## Overview
Campus Connect uses **Google Drive** as its primary, scalable file storage layer for application-managed assets, with **Supabase PostgreSQL** acting as the single source of truth for authentication, permissions, Row-Level Security (RLS), metadata cataloging, and entity relationships.

The initial production deployment operates at **$0/month** using a personal Google account's free 15 GB storage tier via Google OAuth 2.0. The system features a clean provider abstraction upgradeable to a Google Workspace Shared Drive when organizational demand requires it.

---

## 1. Storage Architecture

```
Campus Connect Frontend (React 18 + Vite + TS)
        ↓
Supabase Auth (User JWT)
        ↓
Supabase Edge Function (`storage-google-drive`)
        ↓
Google OAuth 2.0 (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`)
        ↓
Google Drive API v3
        ↓
Personal Google Drive (15 GB Free Tier) / Shared Drive
        ↓
Campus Connect Folder Hierarchy
```

### Folder Structure in Google Drive:
```
Campus Connect/
├── Academics/             (Study materials, notes, syllabi)
├── Assignments/           (Problem sets, student submissions)
├── Events/                (Festivals, event banners, posters)
├── Notices/               (Official campus circulars)
├── Certificates/          (Tamper-proof verifiable PDF certificates)
├── Student Documents/     (Student ID verification cards)
├── Media/                 (Avatars, promotional images)
└── General/               (Uncategorized administrative files)
```

---

## 2. Metadata Schema (`public.storage_files`)

All files stored in Google Drive are indexed in the `public.storage_files` table in Supabase:

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `college_id` | UUID | Multi-tenant scoping reference |
| `file_name` | TEXT | Sanitized system file name |
| `original_file_name` | TEXT | User-uploaded file name |
| `mime_type` | TEXT | Verified MIME type |
| `file_size` | BIGINT | Size in bytes |
| `google_drive_file_id`| TEXT | Official Google Drive file ID |
| `google_drive_folder_id`| TEXT | Parent Google Drive folder ID |
| `drive_url` | TEXT | Web view URL |
| `drive_download_link` | TEXT | Download URL |
| `entity_type` | TEXT | Associated module (`document`, `event`, `assignment`, `certificate`, etc.) |
| `entity_id` | TEXT | Linked entity identifier |
| `access_level` | TEXT | `public`, `authenticated`, `private` |
| `uploaded_by` | UUID | Creator reference (`auth.users`) |
| `status` | TEXT | `active`, `archived`, `deleted`, `inaccessible` |
| `metadata` | JSONB | Additional Google Drive object telemetry |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

---

## 3. Server-Side Environment Variables

Set these secrets in Supabase via CLI (`npx supabase secrets set ...`):

| Variable | Description | Required? |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Google Cloud Console OAuth 2.0 Web Client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console OAuth 2.0 Client Secret | Yes |
| `GOOGLE_REFRESH_TOKEN` | Google OAuth 2.0 Refresh Token | Yes |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Root folder ID in Google Drive | Optional (auto-created if omitted) |
| `GOOGLE_DRIVE_TYPE` | Storage mode: `personal` ($0/mo, default) or `shared_drive` | Optional |
| `GOOGLE_DRIVE_SHARED_DRIVE_ID`| Shared Drive ID if upgrading to Workspace | Optional |

---

## 4. Backward Compatibility & Legacy Supabase Storage

Existing assets in Supabase Storage buckets continue to function transparently without disruption:
- `documents` (Academic resources)
- `verify-documents` (Private certificates)
- `submissions` (Student assignment submissions)
- `student-id-cards` (Private student verification ID cards)
- `lecture-flyers` (Lecture and event posters)
- `avatars` (User avatars)
- `team-photos` (E-Cell committee members)

New uploads and files managed via `/platform/admin/storage` flow directly to Google Drive.
