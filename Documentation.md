# Campus Connect — Master Technical & Architecture Documentation

**Platform Version**: `3.0.0`
**Target Platform**: Independent Supabase Production Environment + React/Vite PWA
**Status**: Repository Prepared & Ready for Independent Supabase Migration

---

## 1. Product Overview
Campus Connect is an enterprise multi-tenant Higher Education Campus Operating System combining academic enterprise resource planning (ERP), dynamic QR attendance with geofence validation, student gamification with ledger-backed rewards, digital identity cards, tamper-proof document verification, entrepreneurship cell management, and real-time push notifications into a single unified platform.

---

## 2. Architecture Overview
The platform operates on a multi-tenant PostgreSQL model with role-based access control. Every institutional tenant is represented as a record in `public.colleges`. Data isolation is strictly enforced at the database kernel level through PostgreSQL Row Level Security (RLS) policies driven by the user's `college_id`.

```
                    ┌────────────────────────────────────────┐
                    │      Client Apps (PWA / Web / Mobile)  │
                    └───────────────────┬────────────────────┘
                                        │
                                        │ HTTPS / WSS
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             Supabase Production Stack                            │
│                                                                                  │
│   ┌─────────────────────┐   ┌──────────────────────┐   ┌─────────────────────┐   │
│   │    Supabase Auth    │   │  23 Edge Functions   │   │  4 Storage Buckets  │   │
│   │  (JWT, Identifiers) │   │ (Deno Runtime / APIs)│   │  (S3-Compatible)    │   │
│   └──────────┬──────────┘   └──────────┬───────────┘   └──────────┬──────────┘   │
│              │                         │                          │              │
│              ▼                         ▼                          ▼              │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │                        PostgreSQL 15+ Core Database                      │   │
│   │   - 62 Tables (public schema, 100% RLS Coverage)                         │   │
│   │   - Multi-tenant tenant isolation via `college_id`                       │   │
│   │   - 201 Row-Level Security (RLS) Policies (175 public + 26 storage)      │   │
│   │   - 48 Defined PostgreSQL Functions (2 Public RPCs, 28 Auth RPCs)        │   │
│   │   - 32 Database Triggers (Points ledger, Streaks, Audit logs)            │   │
│   └──────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack
- **Frontend**: React 18.3.1, TypeScript 5.8.2, Vite 5.4.19
- **Styling**: Tailwind CSS 3.4.17, Lucide Icons, Radix UI Primitives
- **State Management & Query Cache**: `@tanstack/react-query 5.83.0`
- **Backend & Database**: PostgreSQL 15+ hosted on independent Supabase
- **Edge Runtime**: Deno 1.x / 2.x serverless functions (23 functions)
- **Storage**: Supabase Storage (4 buckets: `lecture-flyers`, `documents`, `submissions`, `verify-documents`)
- **Push Protocols**: Browser Web Push API signed via native Web Crypto VAPID (RFC 8292)
- **Mobile Container**: Capacitor (Android/iOS)

---

## 4. Documentation Index (`/docs`)

| Document | Description |
|---|---|
| [`DATABASE_SCHEMA.md`](./docs/DATABASE_SCHEMA.md) | Complete 62-table schema specification with types, foreign keys, and indexes |
| [`RLS_SECURITY.md`](./docs/RLS_SECURITY.md) | Complete 201 RLS security policies breakdown and multi-tenant isolation rules |
| [`MIGRATION_INVENTORY.md`](./docs/MIGRATION_INVENTORY.md) | Sequential ledger of all 79 SQL migrations from bootstrap to latest feature |
| [`BACKEND_ARCHITECTURE.md`](./docs/BACKEND_ARCHITECTURE.md) | Relational domains, multi-tenancy model, and PostgreSQL kernel functions |
| [`AUTHENTICATION.md`](./docs/AUTHENTICATION.md) | Dual-identifier login flow, role resolution, and session persistence |
| [`ROLES_PERMISSIONS.md`](./docs/ROLES_PERMISSIONS.md) | 4 core roles + 3 sub-roles capability matrix and route authorization |
| [`EDGE_FUNCTIONS.md`](./docs/EDGE_FUNCTIONS.md) | Full catalog of all 23 Edge Functions with auth and secret requirements |
| [`STORAGE.md`](./docs/STORAGE.md) | Storage bucket specifications, visibility, and signed URL requirements |
| [`REALTIME.md`](./docs/REALTIME.md) | Supabase Realtime publication configuration and channel listeners |
| [`NOTIFICATIONS.md`](./docs/NOTIFICATIONS.md) | In-app notification center and Web Push crypto signing pipeline |
| [`SCHEDULED_JOBS.md`](./docs/SCHEDULED_JOBS.md) | Background automation schedules and `pg_cron` setup guidelines |
| [`ENVIRONMENT_VARIABLES.md`](./docs/ENVIRONMENT_VARIABLES.md) | Public frontend parameters vs server-only secret specification |
| [`SUPABASE_SETUP.md`](./docs/SUPABASE_SETUP.md) | Step-by-step procedure for provisioning an independent Supabase project |
| [`SUPABASE_DEPLOYMENT_GUIDE.md`](./docs/SUPABASE_DEPLOYMENT_GUIDE.md) | Practical guide to executing database migrations and Edge Function deployments |
| [`DEPLOYMENT_GUIDE.md`](./docs/DEPLOYMENT_GUIDE.md) | Production frontend hosting, Docker containerization, and DNS routing |
| [`TROUBLESHOOTING.md`](./docs/TROUBLESHOOTING.md) | Common migration, authentication, storage, and push notification remedies |
| [`FEATURE_INVENTORY.md`](./docs/FEATURE_INVENTORY.md) | Comprehensive functional mapping across all college operational modules |
| [`MIGRATION_CHECKLIST.md`](./docs/MIGRATION_CHECKLIST.md) | Complete pre-flight and post-deployment validation checklist |
