# Campus Connect — Storage Buckets Specification

## Overview
Campus Connect uses Supabase Storage for academic assets, lecture schedules, student assignment submissions, and tamper-proof verification certificates.

---

## 1. Storage Buckets Inventory

| Bucket Name | Visibility | Creation Mechanism | Storage RLS in SQL? | Signed URL Required? | Production Required? |
|---|---|---|---|---|---|
| **`lecture-flyers`** | **PUBLIC** | Created in SQL (`20260118133501`) | Yes | No (Direct public URL) | **YES** |
| **`documents`** | **PUBLIC** | Created in SQL (`20260323100951`) | Yes | No (Direct public URL) | **YES** |
| **`submissions`** | **PRIVATE** | Created in SQL (`20260321043930`) | Yes | **Yes** (`createSignedUrl(3600)`) | **YES** |
| **`verify-documents`**| **PRIVATE** | **MANUAL DASHBOARD / API CREATION** | Yes (`20260713093619`) | **Yes** (`createSignedUrl(600)`) | **YES** |

> **IMPORTANT DISTINCTION**:
> - **`public.verify_documents`** (with underscore `_`): **Active Database Table** created in SQL migration `20260713093558_7cfeb33b-7a77-43cf-b4fb-a14a6e708cfc.sql`.
> - **`verify-documents`** (with hyphen `-`): **Private Storage Bucket** holding binary PDF certificates. RLS policies are in `20260713093619_2fceb566-b1c0-4267-b49a-6e1a0537af81.sql`.
> - **Action Required**: The `verify-documents` storage bucket must be manually created via the Supabase Dashboard (`Storage > New Bucket`) or Storage API on your independent Supabase project.

---

## 2. Storage Row-Level Security (RLS) Policies (26 Net Policies)

1. **`lecture-flyers`**:
   - `SELECT`: Public access (anyone can view lecture promotional flyers).
   - `INSERT`/`UPDATE`/`DELETE`: Staff only (`public.is_admin(auth.uid()) OR public.is_faculty(auth.uid())`).
2. **`documents`**:
   - `SELECT`: Authenticated users.
   - `INSERT`/`UPDATE`/`DELETE`: Staff only (`public.is_admin(auth.uid()) OR public.is_faculty(auth.uid())`).
3. **`submissions`**:
   - `SELECT`: Faculty/admin OR student viewing their own folder `auth.uid()::text = (storage.foldername(name))[1]`.
   - `INSERT`: Student uploading into their own folder prefix `auth.uid()::text = (storage.foldername(name))[1]`.
4. **`verify-documents`**:
   - `SELECT`/`INSERT`/`UPDATE`/`DELETE`: Administrators and Super Administrators only (`public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())`).
