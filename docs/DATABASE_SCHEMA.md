# Campus Connect — Database Schema Reference

Source of truth: generated Supabase types (`src/integrations/supabase/types.ts`, reflects the live schema) cross-checked against `supabase/migrations/*.sql`.

- Tables: **62** (schema `public`)
- Views / materialized views: **0**
- Enums: **8**
- RLS policies (final state parsed from migrations): **201**
- Triggers: **31**
- Indexes explicitly created: **144**

Legend: `optional-on-insert` means the column has a database default or is nullable, so inserts may omit it.

---

## `academic_promotion_runs`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `college_id` | `string` | no | no |
| `created_at` | `string` | no | yes |
| `details` | `Json` | no | yes |
| `from_session` | `string | null` | yes | yes |
| `id` | `string` | no | yes |
| `performed_by` | `string` | no | no |
| `reversed_at` | `string | null` | yes | yes |
| `reversed_by` | `string | null` | yes | yes |
| `to_session` | `string` | no | no |
| `total_graduated` | `number` | no | yes |
| `total_promoted` | `number` | no | yes |

**Foreign keys**

| Column | References |
|---|---|
| `college_id` | `colleges.id` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_promotion_runs_college` | college_id, created_at DESC |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| promotion_runs_admin_insert | INSERT | public |
| promotion_runs_admin_select | SELECT | public |
| promotion_runs_admin_update | UPDATE | public |

---

## `account_deletion_requests`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `admin_note` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `id` | `string` | no | yes |
| `reason` | `string | null` | yes | yes |
| `reviewed_at` | `string | null` | yes | yes |
| `reviewed_by` | `string | null` | yes | yes |
| `status` | `Database["public"]["Enums"]["account_deletion_status"]` | no | yes |
| `user_id` | `string` | no | no |

**Triggers**

| Trigger | Timing | Events | Function |
|---|---|---|---|
| `trg_prevent_multiple_open_deletion_requests` | BEFORE | INSERT OR UPDATE | `public.prevent_multiple_open_deletion_requests` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_account_deletion_requests_user_id` | user_id |
| `idx_account_deletion_requests_status` | status |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Admins can delete deletion requests | DELETE | public |
| Admins can update deletion requests | UPDATE | public |
| Users can create own deletion request | INSERT | public |
| Users can view own deletion request | SELECT | public |

---

## `achievements`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `code` | `string` | no | no |
| `created_at` | `string` | no | yes |
| `created_by` | `string | null` | yes | yes |
| `description` | `string` | no | no |
| `icon` | `string` | no | yes |
| `id` | `string` | no | yes |
| `is_active` | `boolean` | no | yes |
| `points_reward` | `number` | no | yes |
| `title` | `string` | no | no |
| `updated_at` | `string` | no | yes |

**Triggers**

| Trigger | Timing | Events | Function |
|---|---|---|---|
| `update_achievements_updated_at` | BEFORE | UPDATE | `public.update_updated_at_column` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_achievements_active` | is_active |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Admins can manage achievements | ALL | public |
| Anyone can read active achievements | SELECT | public |

---

## `announcements`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `created_at` | `string` | no | yes |
| `created_by` | `string` | no | no |
| `description` | `string` | no | no |
| `expires_at` | `string | null` | yes | yes |
| `id` | `string` | no | yes |
| `is_pinned` | `boolean` | no | yes |
| `priority` | `string` | no | yes |
| `target` | `string` | no | yes |
| `target_class` | `string | null` | yes | yes |
| `target_programme_id` | `string | null` | yes | yes |
| `title` | `string` | no | no |
| `updated_at` | `string` | no | yes |

**Foreign keys**

| Column | References |
|---|---|
| `target_programme_id` | `programmes.id` |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Active users can view announcements | SELECT | public |
| Admins can manage announcements | ALL | public |
| Faculty can create announcements | INSERT | public |

---

## `assignments`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `attachment_name` | `string | null` | yes | yes |
| `attachment_url` | `string | null` | yes | yes |
| `college_id` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `created_by` | `string` | no | no |
| `description` | `string | null` | yes | yes |
| `due_date` | `string` | no | no |
| `id` | `string` | no | yes |
| `is_active` | `boolean` | no | yes |
| `max_marks` | `number | null` | yes | yes |
| `title` | `string` | no | no |
| `updated_at` | `string` | no | yes |

**Foreign keys**

| Column | References |
|---|---|
| `college_id` | `colleges.id` |

**Triggers**

| Trigger | Timing | Events | Function |
|---|---|---|---|
| `update_assignments_updated_at` | BEFORE | UPDATE | `public.update_updated_at_column` |
| `trg_notify_assignment_created` | AFTER | INSERT | `public.notify_on_assignment_created` |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Admins and faculty can manage assignments | ALL | public |
| Students can view assignments | SELECT | public |

---

## `attendance`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `college_id` | `string | null` | yes | yes |
| `edited_at` | `string | null` | yes | yes |
| `edited_by` | `string | null` | yes | yes |
| `id` | `string` | no | yes |
| `lecture_id` | `string` | no | no |
| `marked_at` | `string` | no | yes |
| `points_earned` | `number` | no | yes |
| `status` | `string` | no | yes |
| `student_user_id` | `string` | no | no |

**Foreign keys**

| Column | References |
|---|---|
| `college_id` | `colleges.id` |
| `lecture_id` | `lectures.id` |
| `student_user_id` | `profiles.user_id` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_attendance_lecture_id` | lecture_id |
| `idx_attendance_student_id` | student_user_id |
| `uq_attendance_lecture_student` | UNIQUE lecture_id, student_user_id |
| `idx_attendance_lecture_student` | lecture_id, student_user_id |
| `idx_attendance_student` | student_user_id |
| `idx_attendance_status` | status |
| `idx_attendance_lecture_student` | lecture_id, student_user_id |
| `idx_attendance_status` | status |
| `idx_attendance_lecture_marked` | lecture_id, marked_at |
| `idx_attendance_student_marked` | student_user_id, marked_at |
| `idx_attendance_college_id` | college_id |
| `idx_attendance_student_status` | student_user_id, status, marked_at DESC |
| `idx_attendance_lecture_status` | lecture_id, status |
| `idx_attendance_college_time` | college_id, marked_at DESC |
| `idx_attendance_college_id` | college_id |
| `idx_attendance_college_student` | college_id, student_user_id, marked_at DESC |
| `idx_attendance_marked_at` | marked_at DESC |
| `idx_attendance_student_user_id` | student_user_id |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Admins can delete attendance | DELETE | public |
| Admins can insert attendance | INSERT | authenticated |
| Admins can update attendance | UPDATE | public |
| Faculty can view attendance | SELECT | public |
| Students can mark own attendance | INSERT | public |
| Users can view own attendance, admins view all | SELECT | public |

---

## `attendance_audit_log`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `attendance_id` | `string | null` | yes | yes |
| `changed_at` | `string` | no | yes |
| `changed_by` | `string` | no | no |
| `id` | `string` | no | yes |
| `lecture_id` | `string` | no | no |
| `new_status` | `string | null` | yes | yes |
| `old_status` | `string | null` | yes | yes |
| `reason` | `string` | no | no |
| `student_user_id` | `string` | no | no |

**Indexes**

| Index | Definition |
|---|---|
| `idx_attendance_audit_student` | student_user_id |
| `idx_attendance_audit_lecture` | lecture_id |
| `idx_attendance_audit_log_changed_by` | changed_by |
| `idx_attendance_audit_log_changed_at` | changed_at DESC |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Admins can insert audit logs | INSERT | authenticated |
| Admins can view audit logs | SELECT | authenticated |

---

## `attendance_tokens`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `created_at` | `string` | no | yes |
| `created_by` | `string` | no | no |
| `expires_at` | `string` | no | no |
| `id` | `string` | no | yes |
| `is_active` | `boolean` | no | yes |
| `lecture_id` | `string` | no | no |
| `otp_hash` | `string` | no | no |
| `token` | `string` | no | no |
| `used_count` | `number` | no | yes |

**Foreign keys**

| Column | References |
|---|---|
| `lecture_id` | `lectures.id` |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Only admins can create tokens | INSERT | public |
| Only admins can delete tokens | DELETE | public |
| Only admins can update tokens | UPDATE | public |
| Only admins can view tokens | SELECT | public |

---

## `audit_logs`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `action` | `string` | no | no |
| `college_id` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `details` | `Json | null` | yes | yes |
| `id` | `string` | no | yes |
| `ip_address` | `string | null` | yes | yes |
| `performed_by` | `string` | no | no |
| `target_entity` | `string` | no | no |
| `target_id` | `string | null` | yes | yes |

**Foreign keys**

| Column | References |
|---|---|
| `college_id` | `colleges.id` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_audit_logs_performed_by` | performed_by |
| `idx_audit_logs_action` | action |
| `idx_audit_logs_created_at` | created_at DESC |
| `idx_audit_logs_college_id` | college_id |
| `idx_audit_logs_college_time` | college_id, created_at DESC |
| `idx_audit_logs_college` | college_id |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Admins can insert audit logs | INSERT | public |
| audit_logs_select | SELECT | public |

---

## `challenges`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `bonus_points` | `number` | no | yes |
| `challenge_type` | `string` | no | yes |
| `college_id` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `created_by` | `string` | no | no |
| `description` | `string | null` | yes | yes |
| `end_date` | `string` | no | no |
| `id` | `string` | no | yes |
| `is_active` | `boolean` | no | yes |
| `start_date` | `string` | no | no |
| `target_value` | `number` | no | yes |
| `title` | `string` | no | no |

**Foreign keys**

| Column | References |
|---|---|
| `college_id` | `colleges.id` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_challenges_active_dates` | is_active, start_date, end_date |
| `idx_challenges_college` | college_id |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Active users can view active challenges | SELECT | public |
| Admins can manage challenges | ALL | public |

---

## `channel_members`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `channel_id` | `string` | no | no |
| `id` | `string` | no | yes |
| `joined_at` | `string` | no | yes |
| `role` | `string` | no | yes |
| `user_id` | `string` | no | no |

**Foreign keys**

| Column | References |
|---|---|
| `channel_id` | `channels.id` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_channel_members_channel_id` | channel_id |
| `idx_channel_members_user_id` | user_id |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Admins can manage channel members | ALL | public |
| Users can join channels | INSERT | public |
| Users can view channel memberships | SELECT | public |

---

## `channels`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `college_id` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `created_by` | `string` | no | no |
| `description` | `string | null` | yes | yes |
| `id` | `string` | no | yes |
| `is_active` | `boolean` | no | yes |
| `name` | `string` | no | no |
| `type` | `string` | no | yes |
| `updated_at` | `string` | no | yes |

**Foreign keys**

| Column | References |
|---|---|
| `college_id` | `colleges.id` |

**Triggers**

| Trigger | Timing | Events | Function |
|---|---|---|---|
| `update_channels_updated_at` | BEFORE | UPDATE | `public.update_updated_at_column` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_channels_college_id` | college_id |
| `idx_channels_type` | type |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Active users can view channels | SELECT | public |
| Admins and faculty can create channels | INSERT | public |
| Admins can manage channels | ALL | public |

---

## `class_promotion_rules`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `college_id` | `string` | no | no |
| `created_at` | `string` | no | yes |
| `created_by` | `string | null` | yes | yes |
| `from_class` | `string` | no | no |
| `graduates` | `boolean` | no | yes |
| `id` | `string` | no | yes |
| `next_year` | `number | null` | yes | yes |
| `to_class` | `string | null` | yes | yes |
| `updated_at` | `string` | no | yes |

**Foreign keys**

| Column | References |
|---|---|
| `college_id` | `colleges.id` |

**Triggers**

| Trigger | Timing | Events | Function |
|---|---|---|---|
| `class_promotion_rules_set_updated` | BEFORE | UPDATE | `public.update_updated_at_column` |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| promotion_rules_admin_manage | ALL | public |
| promotion_rules_read | SELECT | public |

---

## `classes`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `college_id` | `string` | no | no |
| `created_at` | `string` | no | yes |
| `created_by` | `string | null` | yes | yes |
| `department_id` | `string | null` | yes | yes |
| `id` | `string` | no | yes |
| `is_active` | `boolean` | no | yes |
| `name` | `string` | no | no |
| `section` | `string | null` | yes | yes |
| `updated_at` | `string` | no | yes |
| `year` | `number | null` | yes | yes |

**Foreign keys**

| Column | References |
|---|---|
| `college_id` | `colleges.id` |
| `department_id` | `departments.id` |

**Triggers**

| Trigger | Timing | Events | Function |
|---|---|---|---|
| `update_classes_updated_at` | BEFORE | UPDATE | `public.update_updated_at_column` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_classes_college` | college_id |
| `idx_classes_department` | department_id |
| `classes_unique_college_dept_year` | UNIQUE college_id, department_id, year |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Active users can view classes | SELECT | public |
| Admins can manage classes | ALL | public |

---

## `colleges`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `banner_image` | `string | null` | yes | yes |
| `college_name` | `string` | no | no |
| `created_at` | `string` | no | yes |
| `enabled_features` | `Json` | no | yes |
| `id` | `string` | no | yes |
| `is_active` | `boolean` | no | yes |
| `logo_url` | `string | null` | yes | yes |
| `primary_color` | `string | null` | yes | yes |
| `secondary_color` | `string | null` | yes | yes |
| `subdomain` | `string | null` | yes | yes |
| `tagline` | `string | null` | yes | yes |
| `updated_at` | `string` | no | yes |

**Triggers**

| Trigger | Timing | Events | Function |
|---|---|---|---|
| `colleges_validate_primary_color` | BEFORE | INSERT OR UPDATE OF primary_color | `public._colleges_validate_primary_color` |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Anyone can read active colleges | SELECT | public |
| Super admins can manage colleges | ALL | public |
| Super admins can read all colleges | SELECT | public |

---

## `core_team_members`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `class` | `string | null` | yes | yes |
| `college_id` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `designation` | `string | null` | yes | yes |
| `id` | `string` | no | yes |
| `is_active` | `boolean` | no | yes |
| `name` | `string` | no | no |
| `order_index` | `number` | no | yes |
| `photo_url` | `string | null` | yes | yes |

**Foreign keys**

| Column | References |
|---|---|
| `college_id` | `colleges.id` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_core_team_members_college_id` | college_id |
| `idx_core_team_college` | college_id |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Admins can manage team members | ALL | public |
| Anyone can read team members | SELECT | public |

---

## `daily_checkins`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `checkin_date` | `string` | no | yes |
| `college_id` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `id` | `string` | no | yes |
| `user_id` | `string` | no | no |

**Indexes**

| Index | Definition |
|---|---|
| `idx_daily_checkins_user_date` | user_id, checkin_date DESC |
| `idx_daily_checkins_user_date` | user_id, checkin_date DESC |
| `idx_daily_checkins_college` | college_id |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Service role can insert check-ins | INSERT | public |
| Users can view own check-ins, admins view all | SELECT | public |

---

## `daily_content`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `body` | `string | null` | yes | yes |
| `content_type` | `string` | no | no |
| `created_at` | `string` | no | yes |
| `created_by` | `string` | no | no |
| `id` | `string` | no | yes |
| `image_url` | `string | null` | yes | yes |
| `is_active` | `boolean` | no | yes |
| `publish_date` | `string | null` | yes | yes |
| `title` | `string | null` | yes | yes |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Active users can view daily content | SELECT | public |
| Admins can manage daily content | ALL | public |

---

## `daily_rewards_log`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `created_at` | `string` | no | yes |
| `id` | `string` | no | yes |
| `message` | `string | null` | yes | yes |
| `points_awarded` | `number` | no | yes |
| `reward_date` | `string` | no | no |
| `reward_type` | `string` | no | no |
| `user_id` | `string` | no | no |

**Indexes**

| Index | Definition |
|---|---|
| `uq_daily_rewards_user_date` | UNIQUE user_id, reward_date |
| `idx_daily_rewards_user_date` | user_id, reward_date DESC |
| `idx_daily_rewards_user_date` | user_id, reward_date |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Users can view own daily rewards, admins view all | SELECT | authenticated |

---

## `departments`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `college_id` | `string` | no | no |
| `created_at` | `string` | no | yes |
| `created_by` | `string | null` | yes | yes |
| `description` | `string | null` | yes | yes |
| `id` | `string` | no | yes |
| `is_active` | `boolean` | no | yes |
| `name` | `string` | no | no |
| `normalized_name` | `string | null` | yes | yes |
| `updated_at` | `string` | no | yes |

**Foreign keys**

| Column | References |
|---|---|
| `college_id` | `colleges.id` |

**Triggers**

| Trigger | Timing | Events | Function |
|---|---|---|---|
| `update_departments_updated_at` | BEFORE | UPDATE | `public.update_updated_at_column` |
| `departments_set_updated_at` | BEFORE | UPDATE | `public.update_updated_at_column` |
| `departments_normalize_name` | BEFORE | INSERT OR UPDATE OF name | `public.departments_set_normalized_name` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_departments_college` | college_id |
| `departments_college_normalized_name_key` | UNIQUE college_id, normalized_name |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Active users can view departments in their college | SELECT | public |
| Admins can manage departments | ALL | public |
| departments_admin_write | ALL | authenticated |
| departments_select_same_college | SELECT | authenticated |

---

## `documents`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `access_level` | `string` | no | yes |
| `class_id` | `string | null` | yes | yes |
| `college_id` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `doc_type` | `string` | no | yes |
| `file_name` | `string | null` | yes | yes |
| `file_size` | `number | null` | yes | yes |
| `file_url` | `string` | no | no |
| `id` | `string` | no | yes |
| `is_active` | `boolean` | no | yes |
| `subject` | `string | null` | yes | yes |
| `title` | `string` | no | no |
| `updated_at` | `string` | no | yes |
| `uploaded_by` | `string` | no | no |

**Foreign keys**

| Column | References |
|---|---|
| `class_id` | `classes.id` |
| `college_id` | `colleges.id` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_documents_college` | college_id |
| `idx_documents_class` | class_id |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Faculty and admins can manage documents | ALL | public |
| Students can view accessible documents | SELECT | public |

---

## `erp_import_batches`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `admin_id` | `string` | no | no |
| `archived_count` | `number` | no | yes |
| `college_id` | `string` | no | no |
| `completed_at` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `created_count` | `number` | no | yes |
| `created_user_ids` | `string[]` | no | yes |
| `duplicate_count` | `number` | no | yes |
| `failed_count` | `number` | no | yes |
| `filename` | `string | null` | yes | yes |
| `full_replacement` | `boolean` | no | yes |
| `id` | `string` | no | yes |
| `invalid_count` | `number` | no | yes |
| `notes` | `string | null` | yes | yes |
| `seen_enrollments` | `string[]` | no | yes |
| `started_at` | `string` | no | yes |
| `status` | `string` | no | yes |
| `total_records` | `number` | no | yes |
| `updated_at` | `string` | no | yes |
| `updated_count` | `number` | no | yes |
| `valid_count` | `number` | no | yes |

**Foreign keys**

| Column | References |
|---|---|
| `college_id` | `colleges.id` |

**Triggers**

| Trigger | Timing | Events | Function |
|---|---|---|---|
| `erp_batches_set_updated_at` | BEFORE | UPDATE | `public.update_updated_at_column` |

**Indexes**

| Index | Definition |
|---|---|
| `erp_batches_college_idx` | college_id, created_at DESC |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| erp_batches_admin_write | ALL | authenticated |
| erp_batches_select | SELECT | authenticated |

---

## `erp_import_errors`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `batch_id` | `string` | no | no |
| `college_id` | `string` | no | no |
| `created_at` | `string` | no | yes |
| `id` | `string` | no | yes |
| `raw_data` | `Json | null` | yes | yes |
| `reason` | `string` | no | no |
| `row_number` | `number | null` | yes | yes |

**Foreign keys**

| Column | References |
|---|---|
| `batch_id` | `erp_import_batches.id` |
| `college_id` | `colleges.id` |

**Indexes**

| Index | Definition |
|---|---|
| `erp_errors_batch_idx` | batch_id |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| erp_errors_admin_write | ALL | authenticated |
| erp_errors_select | SELECT | authenticated |

---

## `erp_import_staging`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `batch_id` | `string` | no | no |
| `college_id` | `string` | no | no |
| `created_at` | `string` | no | yes |
| `diff_action` | `string | null` | yes | yes |
| `error_reason` | `string | null` | yes | yes |
| `id` | `string` | no | yes |
| `parsed` | `Json | null` | yes | yes |
| `parsed_state` | `string` | no | yes |
| `raw` | `Json` | no | no |
| `row_number` | `number` | no | no |
| `validation_state` | `string` | no | yes |

**Foreign keys**

| Column | References |
|---|---|
| `batch_id` | `erp_import_batches.id` |
| `college_id` | `colleges.id` |

**Indexes**

| Index | Definition |
|---|---|
| `erp_staging_batch_idx` | batch_id, row_number |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| erp_staging_admin_write | ALL | authenticated |
| erp_staging_select | SELECT | authenticated |

---

## `events`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `college_id` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `created_by` | `string` | no | no |
| `description` | `string | null` | yes | yes |
| `event_date` | `string` | no | no |
| `event_time` | `string` | no | no |
| `flyer_url` | `string | null` | yes | yes |
| `id` | `string` | no | yes |
| `is_ecell_event` | `boolean` | no | yes |
| `is_featured` | `boolean` | no | yes |
| `max_stalls` | `number | null` | yes | yes |
| `poster_url` | `string | null` | yes | yes |
| `title` | `string` | no | no |
| `updated_at` | `string` | no | yes |
| `venue` | `string | null` | yes | yes |

**Triggers**

| Trigger | Timing | Events | Function |
|---|---|---|---|
| `trg_events_set_college_id` | BEFORE | INSERT | `public.events_set_college_id` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_events_college_featured` | college_id, is_featured, event_date DESC |
| `idx_events_is_ecell_event` | is_ecell_event |
| `idx_events_date_ecell` | event_date, is_ecell_event |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Admins manage their college events | ALL | authenticated |
| Members can view their college events | SELECT | authenticated |

---

## `exam_results`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `college_id` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `entered_by` | `string` | no | no |
| `exam_id` | `string` | no | no |
| `grade` | `string | null` | yes | yes |
| `id` | `string` | no | yes |
| `marks_obtained` | `number` | no | yes |
| `remarks` | `string | null` | yes | yes |
| `student_user_id` | `string` | no | no |
| `updated_at` | `string` | no | yes |

**Foreign keys**

| Column | References |
|---|---|
| `college_id` | `colleges.id` |
| `exam_id` | `exams.id` |

**Triggers**

| Trigger | Timing | Events | Function |
|---|---|---|---|
| `trg_notify_result_published` | AFTER | INSERT | `public.notify_on_result_published` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_exam_results_exam` | exam_id |
| `idx_exam_results_student` | student_user_id |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Admins and faculty can manage results | ALL | public |
| Students can view own results | SELECT | public |

---

## `exams`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `college_id` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `created_by` | `string` | no | no |
| `description` | `string | null` | yes | yes |
| `exam_date` | `string` | no | no |
| `id` | `string` | no | yes |
| `is_active` | `boolean` | no | yes |
| `max_marks` | `number` | no | yes |
| `subject` | `string` | no | no |
| `title` | `string` | no | no |
| `updated_at` | `string` | no | yes |

**Foreign keys**

| Column | References |
|---|---|
| `college_id` | `colleges.id` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_exams_college` | college_id |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Active users can view exams | SELECT | public |
| Admins and faculty can manage exams | ALL | public |

---

## `feedback`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `admin_note` | `string | null` | yes | yes |
| `category` | `string` | no | yes |
| `college_id` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `id` | `string` | no | yes |
| `message` | `string` | no | no |
| `reviewed_at` | `string | null` | yes | yes |
| `reviewed_by` | `string | null` | yes | yes |
| `status` | `string` | no | yes |
| `user_id` | `string` | no | no |

**Foreign keys**

| Column | References |
|---|---|
| `college_id` | `colleges.id` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_feedback_college_status` | college_id, status, created_at DESC |
| `idx_feedback_user` | user_id, created_at DESC |
| `idx_feedback_college` | college_id |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Admins can update feedback status | UPDATE | public |
| Users can submit own feedback | INSERT | public |
| Users can view own feedback | SELECT | public |

---

## `institution_partners`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `badge` | `string | null` | yes | yes |
| `city` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `display_order` | `number` | no | yes |
| `id` | `string` | no | yes |
| `is_active` | `boolean` | no | yes |
| `logo_url` | `string | null` | yes | yes |
| `name` | `string` | no | no |
| `state` | `string | null` | yes | yes |
| `updated_at` | `string` | no | yes |
| `website` | `string | null` | yes | yes |

**Triggers**

| Trigger | Timing | Events | Function |
|---|---|---|---|
| `trg_institution_partners_updated_at` | BEFORE | UPDATE | `public.update_updated_at_column` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_institution_partners_active_order` | is_active, display_order |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Public can read active partners | SELECT | public |
| Super admins can delete partners | DELETE | authenticated |
| Super admins can insert partners | INSERT | authenticated |
| Super admins can update partners | UPDATE | authenticated |

---

## `leads`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `city` | `string | null` | yes | yes |
| `college` | `string` | no | no |
| `created_at` | `string` | no | yes |
| `email` | `string | null` | yes | yes |
| `id` | `string` | no | yes |
| `name` | `string` | no | no |
| `notes` | `string | null` | yes | yes |
| `phone` | `string | null` | yes | yes |
| `status` | `string` | no | yes |
| `student_count` | `string | null` | yes | yes |
| `updated_at` | `string` | no | yes |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Admins can view leads | SELECT | public |
| Anyone can insert leads | INSERT | public |
| Super admins can manage leads | ALL | public |

---

## `lecture_programme_tags`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `id` | `string` | no | yes |
| `lecture_id` | `string` | no | no |
| `programme_id` | `string` | no | no |
| `tagged_at` | `string` | no | yes |
| `tagged_by` | `string` | no | no |

**Foreign keys**

| Column | References |
|---|---|
| `lecture_id` | `lectures.id` |
| `programme_id` | `programmes.id` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_lecture_programme_tags_lecture` | lecture_id |
| `idx_lecture_programme_tags_programme` | programme_id |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Active users can view lecture tags | SELECT | public |
| Admins can manage lecture tags | ALL | public |

---

## `lectures`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `college_id` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `created_by` | `string` | no | no |
| `end_at` | `string` | no | no |
| `end_time` | `string` | no | no |
| `ended_at` | `string | null` | yes | yes |
| `flyer_object_path` | `string | null` | yes | yes |
| `id` | `string` | no | yes |
| `lecture_date` | `string` | no | no |
| `live_started_at` | `string | null` | yes | yes |
| `start_at` | `string` | no | no |
| `start_time` | `string` | no | no |
| `status` | `Database["public"]["Enums"]["lecture_status"]` | no | yes |
| `topic` | `string` | no | no |
| `updated_at` | `string` | no | yes |
| `venue` | `string` | no | no |

**Foreign keys**

| Column | References |
|---|---|
| `college_id` | `colleges.id` |

**Triggers**

| Trigger | Timing | Events | Function |
|---|---|---|---|
| `update_lectures_updated_at` | BEFORE | UPDATE | `public.update_updated_at_column` |
| `trg_notify_lecture_created` | AFTER | INSERT | `public.notify_on_lecture_created` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_lectures_date` | lecture_date |
| `idx_lectures_status` | status |
| `idx_lectures_college_id` | college_id |
| `idx_lectures_status_date` | status, lecture_date DESC |
| `idx_lectures_college_date` | college_id, lecture_date DESC, status |
| `idx_lectures_college_id` | college_id |
| `idx_lectures_college_date` | college_id, lecture_date DESC |
| `idx_lectures_status_college` | status, college_id |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Active users can view lectures | SELECT | public |
| Faculty can view college lectures | SELECT | public |
| Only admins can delete lectures | DELETE | public |
| Only admins can manage lectures | INSERT | public |
| Only admins can update lectures | UPDATE | public |

---

## `login_activity`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `college_id` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `id` | `string` | no | yes |
| `ip_address` | `string | null` | yes | yes |
| `user_agent` | `string | null` | yes | yes |
| `user_id` | `string` | no | no |

**Foreign keys**

| Column | References |
|---|---|
| `college_id` | `colleges.id` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_login_activity_user_id` | user_id |
| `idx_login_activity_created_at` | created_at DESC |
| `idx_login_activity_user_time` | user_id, created_at DESC |
| `idx_login_activity_college` | college_id |
| `idx_login_activity_created_at` | created_at DESC |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Users can insert own login activity | INSERT | public |
| login_activity_select | SELECT | public |

---

## `messages`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `attachments` | `Json | null` | yes | yes |
| `channel_id` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `id` | `string` | no | yes |
| `is_deleted` | `boolean` | no | yes |
| `message_text` | `string | null` | yes | yes |
| `reactions` | `Json | null` | yes | yes |
| `receiver_id` | `string | null` | yes | yes |
| `reply_to_id` | `string | null` | yes | yes |
| `sender_id` | `string` | no | no |
| `updated_at` | `string` | no | yes |

**Foreign keys**

| Column | References |
|---|---|
| `channel_id` | `channels.id` |
| `reply_to_id` | `messages.id` |

**Triggers**

| Trigger | Timing | Events | Function |
|---|---|---|---|
| `update_messages_updated_at` | BEFORE | UPDATE | `public.update_updated_at_column` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_messages_channel_id` | channel_id, created_at DESC |
| `idx_messages_sender_id` | sender_id |
| `idx_messages_receiver_id` | receiver_id |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Active users can send messages | INSERT | public |
| Admins can delete messages | DELETE | public |
| Users can update own messages | UPDATE | public |
| Users can view their channel or DM messages | SELECT | authenticated |

---

## `notification_preferences`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `achievement_alerts` | `boolean` | no | yes |
| `announcements` | `boolean` | no | yes |
| `attendance_alerts` | `boolean` | no | yes |
| `created_at` | `string` | no | yes |
| `id` | `string` | no | yes |
| `lecture_alerts` | `boolean` | no | yes |
| `system_updates` | `boolean` | no | yes |
| `updated_at` | `string` | no | yes |
| `user_id` | `string` | no | no |

**Triggers**

| Trigger | Timing | Events | Function |
|---|---|---|---|
| `update_notification_preferences_updated_at` | BEFORE | UPDATE | `public.update_updated_at_column` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_notification_preferences_user_id` | user_id |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Admins can view notification preferences | SELECT | public |
| Users can insert own notification preferences | INSERT | public |
| Users can update own notification preferences | UPDATE | public |
| Users can view own notification preferences | SELECT | public |

---

## `notification_recipients`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `created_at` | `string` | no | yes |
| `id` | `string` | no | yes |
| `notification_id` | `string` | no | no |
| `read_at` | `string | null` | yes | yes |
| `user_id` | `string` | no | no |

**Foreign keys**

| Column | References |
|---|---|
| `notification_id` | `notifications.id` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_notification_recipients_user_id` | user_id |
| `idx_notification_recipients_user_created_at` | user_id, created_at DESC |
| `idx_notif_recipients_user_unread` | user_id, created_at DESC |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Admins and system can insert notification receipts | INSERT | public |
| Users can update own notification read status | UPDATE | public |
| Users can view own notification receipts | SELECT | public |
| notification_recipients_insert_admin | INSERT | public |

---

## `notifications`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `body` | `string` | no | no |
| `cancelled_at` | `string | null` | yes | yes |
| `cancelled_by` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `created_by` | `string` | no | no |
| `id` | `string` | no | yes |
| `kind` | `string` | no | yes |
| `lecture_id` | `string | null` | yes | yes |
| `scheduled_for` | `string | null` | yes | yes |
| `sent_at` | `string | null` | yes | yes |
| `status` | `Database["public"]["Enums"]["notification_status"]` | no | yes |
| `target_role` | `Database["public"]["Enums"]["app_role"] | null` | yes | yes |
| `target_user_id` | `string | null` | yes | yes |
| `title` | `string` | no | no |

**Foreign keys**

| Column | References |
|---|---|
| `lecture_id` | `lectures.id` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_notifications_status_scheduled_for` | status, scheduled_for |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Only admins can create notifications | INSERT | public |
| Only admins can delete notifications | DELETE | public |
| Only admins can update notifications | UPDATE | public |
| Users can view notifications they received, admins view all | SELECT | public |

---

## `permissions`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `can_create` | `boolean` | no | yes |
| `can_delete` | `boolean` | no | yes |
| `can_edit` | `boolean` | no | yes |
| `can_view` | `boolean` | no | yes |
| `college_id` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `id` | `string` | no | yes |
| `module` | `string` | no | no |
| `role` | `string` | no | no |
| `updated_at` | `string` | no | yes |

**Foreign keys**

| Column | References |
|---|---|
| `college_id` | `colleges.id` |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Admins can manage permissions | ALL | public |
| Authenticated users can view permissions | SELECT | authenticated |

---

## `platform_branding`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `brand_name` | `string` | no | yes |
| `favicon_url` | `string | null` | yes | yes |
| `id` | `string` | no | yes |
| `logo_url` | `string | null` | yes | yes |
| `tagline` | `string` | no | yes |
| `updated_at` | `string` | no | yes |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Admins can manage branding | ALL | public |
| Anyone can read branding | SELECT | public |

---

## `platform_settings`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `key` | `string` | no | no |
| `updated_at` | `string` | no | yes |
| `updated_by` | `string | null` | yes | yes |
| `value` | `Json` | no | yes |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Admins can manage platform settings | ALL | public |
| Admins can read all platform settings | SELECT | public |
| Public client settings are readable | SELECT | public |

---

## `point_claims`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `activity_type` | `Database["public"]["Enums"]["claim_activity_type"]` | no | no |
| `college_id` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `description` | `string | null` | yes | yes |
| `event_id` | `string | null` | yes | yes |
| `evidence_url` | `string | null` | yes | yes |
| `id` | `string` | no | yes |
| `points` | `number` | no | no |
| `review_note` | `string | null` | yes | yes |
| `reviewed_at` | `string | null` | yes | yes |
| `reviewed_by` | `string | null` | yes | yes |
| `status` | `Database["public"]["Enums"]["claim_status"]` | no | yes |
| `updated_at` | `string` | no | yes |
| `user_id` | `string` | no | no |

**Foreign keys**

| Column | References |
|---|---|
| `event_id` | `events.id` |

**Triggers**

| Trigger | Timing | Events | Function |
|---|---|---|---|
| `trg_point_claims_set_college` | BEFORE | INSERT OR UPDATE | `public.set_point_claim_college` |
| `trg_point_claims_award` | BEFORE | UPDATE | `public.point_claim_award_on_approve` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_point_claims_user` | user_id, created_at DESC |
| `idx_point_claims_college_status` | college_id, status, created_at DESC |
| `idx_point_claims_event_id` | event_id |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Admins can delete college claims | DELETE | public |
| Admins can update college claims | UPDATE | public |
| Admins can view college claims | SELECT | public |
| Super admins can view all claims | SELECT | public |
| Users can create own claims | INSERT | public |
| Users can view own claims | SELECT | public |

---

## `points_ledger`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `college_id` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `created_by` | `string | null` | yes | yes |
| `id` | `string` | no | yes |
| `metadata` | `Json | null` | yes | yes |
| `note` | `string | null` | yes | yes |
| `points` | `number` | no | no |
| `source` | `string` | no | no |
| `source_id` | `string | null` | yes | yes |
| `user_id` | `string` | no | no |

**Foreign keys**

| Column | References |
|---|---|
| `college_id` | `colleges.id` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_points_ledger_user_id` | user_id |
| `idx_points_ledger_user_created` | user_id, created_at |
| `idx_points_ledger_college_id` | college_id |
| `idx_points_ledger_user_time` | user_id, created_at DESC |
| `idx_points_ledger_college_source` | college_id, source, created_at DESC |
| `idx_points_ledger_college` | college_id |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Admins can delete points | DELETE | public |
| Admins can update points | UPDATE | public |
| Users can view own points, admins view all | SELECT | public |
| points_ledger_select | SELECT | public |

---

## `points_rules`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `created_at` | `string` | no | yes |
| `id` | `string` | no | yes |
| `points_per_attendance` | `number` | no | yes |
| `updated_at` | `string` | no | yes |
| `updated_by` | `string | null` | yes | yes |

**Triggers**

| Trigger | Timing | Events | Function |
|---|---|---|---|
| `update_points_rules_updated_at` | BEFORE | UPDATE | `public.update_updated_at_column` |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Active users can view points rules | SELECT | public |
| Admins can delete points rules | DELETE | public |
| Admins can insert points rules | INSERT | public |
| Admins can update points rules | UPDATE | public |

---

## `poll_votes`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `created_at` | `string` | no | yes |
| `id` | `string` | no | yes |
| `option_index` | `number` | no | no |
| `poll_id` | `string` | no | no |
| `user_id` | `string` | no | no |

**Foreign keys**

| Column | References |
|---|---|
| `poll_id` | `polls.id` |

**Indexes**

| Index | Definition |
|---|---|
| `uq_poll_votes_user_poll` | UNIQUE poll_id, user_id |
| `idx_poll_votes_poll_user` | poll_id, user_id |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Users can cast own vote | INSERT | public |
| Users can view votes | SELECT | public |
| Voters and admins see own votes | SELECT | authenticated |

---

## `polls`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `created_at` | `string` | no | yes |
| `created_by` | `string` | no | no |
| `expires_at` | `string | null` | yes | yes |
| `id` | `string` | no | yes |
| `is_anonymous` | `boolean` | no | yes |
| `options` | `Json` | no | yes |
| `question` | `string` | no | no |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Active users can view polls | SELECT | public |
| Admins can manage polls | ALL | public |

---

## `profiles`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `academic_session` | `string | null` | yes | yes |
| `academic_year` | `string | null` | yes | yes |
| `admission_no` | `string | null` | yes | yes |
| `approval_status` | `string` | no | yes |
| `approved_at` | `string | null` | yes | yes |
| `approved_by` | `string | null` | yes | yes |
| `archived_at` | `string | null` | yes | yes |
| `avatar_url` | `string | null` | yes | yes |
| `bio` | `string | null` | yes | yes |
| `category` | `string | null` | yes | yes |
| `class_id` | `string | null` | yes | yes |
| `class_name` | `string | null` | yes | yes |
| `college_assigned` | `boolean` | no | yes |
| `college_id` | `string | null` | yes | yes |
| `course_code` | `string | null` | yes | yes |
| `course_name` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `current_year` | `number | null` | yes | yes |
| `date_of_birth` | `string | null` | yes | yes |
| `deleted_at` | `string | null` | yes | yes |
| `department` | `string | null` | yes | yes |
| `department_id` | `string | null` | yes | yes |
| `email` | `string` | no | no |
| `enrollment_no` | `string | null` | yes | yes |
| `enrollment_number` | `string | null` | yes | yes |
| `enrollment_status` | `string | null` | yes | yes |
| `erp_student_id` | `string | null` | yes | yes |
| `first_name` | `string | null` | yes | yes |
| `gender` | `string | null` | yes | yes |
| `google_connected` | `boolean` | no | yes |
| `graduation_status` | `string` | no | yes |
| `graduation_year` | `number | null` | yes | yes |
| `guardian_name` | `string | null` | yes | yes |
| `id` | `string` | no | yes |
| `is_active` | `boolean` | no | yes |
| `is_deleted` | `boolean` | no | yes |
| `is_verified` | `boolean` | no | yes |
| `last_name` | `string | null` | yes | yes |
| `mobile` | `string | null` | yes | yes |
| `must_change_password` | `boolean` | no | yes |
| `name` | `string` | no | no |
| `onboarding_completed` | `boolean` | no | yes |
| `phone` | `string | null` | yes | yes |
| `profile_completed` | `boolean` | no | yes |
| `profile_submitted_at` | `string | null` | yes | yes |
| `programme_id` | `string | null` | yes | yes |
| `promoted_at` | `string | null` | yes | yes |
| `rejection_reason` | `string | null` | yes | yes |
| `roll_no` | `string | null` | yes | yes |
| `status` | `string` | no | yes |
| `student_id` | `string | null` | yes | yes |
| `updated_at` | `string` | no | yes |
| `user_id` | `string` | no | no |
| `validity_end` | `string | null` | yes | yes |
| `validity_start` | `string | null` | yes | yes |
| `verified_at` | `string | null` | yes | yes |
| `verified_by` | `string | null` | yes | yes |

**Foreign keys**

| Column | References |
|---|---|
| `class_id` | `classes.id` |
| `college_id` | `colleges.id` |
| `department_id` | `departments.id` |
| `programme_id` | `programmes.id` |

**Triggers**

| Trigger | Timing | Events | Function |
|---|---|---|---|
| `update_profiles_updated_at` | BEFORE | UPDATE | `public.update_updated_at_column` |
| `profiles_guard_protected_fields_trg` | BEFORE | UPDATE | `public.profiles_guard_protected_fields` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_profiles_user_id` | user_id |
| `idx_profiles_is_deleted` | is_deleted |
| `idx_profiles_is_verified` | is_verified |
| `idx_profiles_college_id` | college_id |
| `idx_profiles_college_active` | college_id, is_deleted |
| `idx_profiles_college_id` | college_id |
| `idx_profiles_college_active` | college_id, is_deleted |
| `idx_profiles_college_active` | college_id, is_deleted |
| `idx_profiles_user_id` | user_id |
| `profiles_college_enrollment_uniq` | UNIQUE college_id, enrollment_no |
| `profiles_dept_idx` | department_id |
| `profiles_prog_idx` | programme_id |
| `profiles_enrollment_number_uniq` | UNIQUE lower(enrollment_number) |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Admins can delete profiles | DELETE | public |
| Faculty can view college profiles | SELECT | public |
| Users can insert own profile | INSERT | public |
| Users can update own profile | UPDATE | public |
| profiles_select_own_or_admin | SELECT | public |

---

## `programmes`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `college_id` | `string | null` | yes | yes |
| `color` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `created_by` | `string` | no | no |
| `department_id` | `string | null` | yes | yes |
| `description` | `string | null` | yes | yes |
| `id` | `string` | no | yes |
| `is_active` | `boolean` | no | yes |
| `name` | `string` | no | no |
| `programme_code` | `string | null` | yes | yes |
| `updated_at` | `string` | no | yes |

**Foreign keys**

| Column | References |
|---|---|
| `college_id` | `colleges.id` |
| `department_id` | `departments.id` |

**Triggers**

| Trigger | Timing | Events | Function |
|---|---|---|---|
| `update_programmes_updated_at` | BEFORE | UPDATE | `public.update_updated_at_column` |

**Indexes**

| Index | Definition |
|---|---|
| `programmes_college_code_uniq` | UNIQUE college_id, programme_code |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Active users can view programmes | SELECT | public |
| Admins can manage programmes | ALL | public |

---

## `push_subscriptions`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `auth` | `string` | no | no |
| `created_at` | `string` | no | yes |
| `endpoint` | `string` | no | no |
| `id` | `string` | no | yes |
| `p256dh` | `string` | no | no |
| `updated_at` | `string` | no | yes |
| `user_agent` | `string | null` | yes | yes |
| `user_id` | `string` | no | no |

**Triggers**

| Trigger | Timing | Events | Function |
|---|---|---|---|
| `push_subscriptions_updated_at` | BEFORE | UPDATE | `public.update_updated_at_column` |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Admins can read push subscriptions | SELECT | public |
| Users manage own push subscriptions | ALL | public |

---

## `security_alerts`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `alert_type` | `string` | no | no |
| `college_id` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `details` | `Json | null` | yes | yes |
| `id` | `string` | no | yes |
| `resolved` | `boolean` | no | yes |
| `resolved_at` | `string | null` | yes | yes |
| `resolved_by` | `string | null` | yes | yes |
| `user_id` | `string | null` | yes | yes |

**Foreign keys**

| Column | References |
|---|---|
| `college_id` | `colleges.id` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_security_alerts_created_at` | created_at DESC |
| `idx_security_alerts_resolved` | resolved |
| `idx_security_alerts_college` | college_id |
| `idx_security_alerts_resolved` | resolved |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Admins can insert security alerts | INSERT | public |
| security_alerts_select | SELECT | public |

---

## `stall_registrations`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `college_id` | `string | null` | yes | yes |
| `contact_email` | `string` | no | no |
| `contact_name` | `string` | no | no |
| `contact_phone` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `description` | `string | null` | yes | yes |
| `event_id` | `string | null` | yes | yes |
| `id` | `string` | no | yes |
| `requirements` | `string | null` | yes | yes |
| `review_note` | `string | null` | yes | yes |
| `reviewed_at` | `string | null` | yes | yes |
| `reviewed_by` | `string | null` | yes | yes |
| `stall_name` | `string` | no | no |
| `status` | `Database["public"]["Enums"]["stall_status"]` | no | yes |
| `type` | `Database["public"]["Enums"]["stall_type"]` | no | yes |
| `updated_at` | `string` | no | yes |
| `user_id` | `string` | no | no |

**Foreign keys**

| Column | References |
|---|---|
| `event_id` | `events.id` |

**Triggers**

| Trigger | Timing | Events | Function |
|---|---|---|---|
| `trg_stall_guard` | BEFORE | INSERT OR UPDATE | `public.stall_registration_guard` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_stall_event_status` | event_id, status |
| `idx_stall_college_status` | college_id, status, created_at DESC |
| `idx_stall_user` | user_id, created_at DESC |
| `idx_stall_registrations_event_id` | event_id |
| `idx_stall_registrations_user_id` | user_id |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Admins can delete college stalls | DELETE | public |
| Admins can update college stalls | UPDATE | public |
| Admins can view college stalls | SELECT | public |
| Super admins view all stalls | SELECT | public |
| Users can cancel own pending stall | DELETE | public |
| Users can create own stall registration | INSERT | public |
| Users can view own stalls | SELECT | public |

---

## `student_achievements`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `awarded_at` | `string` | no | yes |
| `code` | `string` | no | no |
| `id` | `string` | no | yes |
| `metadata` | `Json | null` | yes | yes |
| `user_id` | `string` | no | no |

**Indexes**

| Index | Definition |
|---|---|
| `uq_student_achievements_user_code` | UNIQUE user_id, code |
| `idx_student_achievements_user_id` | user_id |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Users can view own achievements, admins view all | SELECT | authenticated |

---

## `student_flags`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `created_at` | `string` | no | yes |
| `flag_type` | `string` | no | no |
| `id` | `string` | no | yes |
| `reason` | `string | null` | yes | yes |
| `resolved_at` | `string | null` | yes | yes |
| `user_id` | `string` | no | no |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Students view own flags | SELECT | public |
| System can manage flags | ALL | public |

---

## `student_goals`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `achieved_at` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `deadline` | `string | null` | yes | yes |
| `goal_type` | `string` | no | no |
| `id` | `string` | no | yes |
| `status` | `string` | no | yes |
| `target_value` | `number` | no | no |
| `updated_at` | `string` | no | yes |
| `user_id` | `string` | no | no |

**Indexes**

| Index | Definition |
|---|---|
| `idx_student_goals_user_status` | user_id, status |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Admins can view goals | SELECT | public |
| Users manage own goals | ALL | public |

---

## `student_intelligence`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `attendance_consistency` | `number` | no | yes |
| `behaviour_reliability` | `number` | no | yes |
| `engagement_index` | `number` | no | yes |
| `id` | `string` | no | yes |
| `risk_flags` | `string[]` | no | yes |
| `tier` | `string` | no | yes |
| `updated_at` | `string` | no | yes |
| `user_id` | `string` | no | no |

**Indexes**

| Index | Definition |
|---|---|
| `idx_student_intelligence_user` | user_id |
| `idx_student_intelligence_user` | user_id |
| `idx_student_intel_risk` | attendance_consistency, engagement_index |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Students view own intelligence | SELECT | public |
| System can upsert intelligence | ALL | public |

---

## `student_programme_allotments`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `allotted_at` | `string` | no | yes |
| `allotted_by` | `string` | no | no |
| `id` | `string` | no | yes |
| `programme_id` | `string` | no | no |
| `student_user_id` | `string` | no | no |

**Foreign keys**

| Column | References |
|---|---|
| `programme_id` | `programmes.id` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_student_programme_allotments_student` | student_user_id |
| `idx_student_programme_allotments_programme` | programme_id |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Admins can manage allotments | ALL | public |
| Students can view own allotments | SELECT | public |

---

## `student_streaks`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `current_streak` | `number` | no | yes |
| `last_login_date` | `string | null` | yes | yes |
| `longest_streak` | `number` | no | yes |
| `updated_at` | `string` | no | yes |
| `user_id` | `string` | no | no |

**Indexes**

| Index | Definition |
|---|---|
| `idx_student_streaks_user_id` | user_id |
| `idx_student_streaks_user` | user_id |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Users can view own streak, admins view all | SELECT | authenticated |

---

## `submissions`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `assignment_id` | `string` | no | no |
| `attachment_name` | `string | null` | yes | yes |
| `attachment_url` | `string | null` | yes | yes |
| `college_id` | `string | null` | yes | yes |
| `content` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `feedback` | `string | null` | yes | yes |
| `id` | `string` | no | yes |
| `marks_obtained` | `number | null` | yes | yes |
| `reviewed_at` | `string | null` | yes | yes |
| `reviewed_by` | `string | null` | yes | yes |
| `status` | `string` | no | yes |
| `student_user_id` | `string` | no | no |
| `submitted_at` | `string` | no | yes |
| `updated_at` | `string` | no | yes |

**Foreign keys**

| Column | References |
|---|---|
| `assignment_id` | `assignments.id` |
| `college_id` | `colleges.id` |

**Triggers**

| Trigger | Timing | Events | Function |
|---|---|---|---|
| `update_submissions_updated_at` | BEFORE | UPDATE | `public.update_updated_at_column` |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Faculty and admins can update submissions | UPDATE | public |
| Faculty and admins can view submissions | SELECT | public |
| Students can manage own submissions | ALL | public |

---

## `support_tickets`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `assigned_to` | `string | null` | yes | yes |
| `category` | `string` | no | yes |
| `college_id` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `created_by` | `string` | no | no |
| `id` | `string` | no | yes |
| `last_message_at` | `string` | no | yes |
| `priority` | `string` | no | yes |
| `status` | `string` | no | yes |
| `subject` | `string` | no | no |
| `updated_at` | `string` | no | yes |

**Foreign keys**

| Column | References |
|---|---|
| `college_id` | `colleges.id` |

**Triggers**

| Trigger | Timing | Events | Function |
|---|---|---|---|
| `trg_set_ticket_college_id` | BEFORE | INSERT OR UPDATE | `public.set_ticket_college_id` |

**Indexes**

| Index | Definition |
|---|---|
| `support_tickets_college_status_idx` | college_id, status, last_message_at DESC |
| `support_tickets_creator_idx` | created_by, last_message_at DESC |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| tickets_owner_insert | INSERT | authenticated |
| tickets_owner_select | SELECT | authenticated |
| tickets_owner_update | UPDATE | authenticated |
| tickets_staff_select | SELECT | authenticated |
| tickets_staff_update | UPDATE | authenticated |

---

## `ticket_messages`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `author_id` | `string` | no | no |
| `author_role` | `string` | no | yes |
| `body` | `string` | no | no |
| `created_at` | `string` | no | yes |
| `id` | `string` | no | yes |
| `ticket_id` | `string` | no | no |

**Foreign keys**

| Column | References |
|---|---|
| `ticket_id` | `support_tickets.id` |

**Triggers**

| Trigger | Timing | Events | Function |
|---|---|---|---|
| `trg_bump_ticket_last_message` | AFTER | INSERT | `public.bump_ticket_last_message` |

**Indexes**

| Index | Definition |
|---|---|
| `ticket_messages_ticket_idx` | ticket_id, created_at |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| ticket_msg_insert | INSERT | authenticated |
| ticket_msg_select | SELECT | authenticated |

---

## `timetable_slots`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `class_id` | `string | null` | yes | yes |
| `college_id` | `string` | no | no |
| `created_at` | `string` | no | yes |
| `created_by` | `string` | no | no |
| `day_of_week` | `number` | no | no |
| `department_id` | `string | null` | yes | yes |
| `end_time` | `string` | no | no |
| `faculty_name` | `string | null` | yes | yes |
| `id` | `string` | no | yes |
| `is_active` | `boolean` | no | yes |
| `start_time` | `string` | no | no |
| `subject` | `string` | no | no |
| `updated_at` | `string` | no | yes |
| `venue` | `string | null` | yes | yes |

**Foreign keys**

| Column | References |
|---|---|
| `class_id` | `classes.id` |
| `college_id` | `colleges.id` |
| `department_id` | `departments.id` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_timetable_college` | college_id |
| `idx_timetable_class` | class_id |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Active users can view timetable | SELECT | public |
| Admins can manage timetable | ALL | public |

---

## `user_roles`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `college_id` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `id` | `string` | no | yes |
| `role` | `Database["public"]["Enums"]["app_role"]` | no | no |
| `user_id` | `string` | no | no |

**Foreign keys**

| Column | References |
|---|---|
| `college_id` | `colleges.id` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_user_roles_user_id` | user_id |
| `idx_user_roles_college_id` | college_id |
| `idx_user_roles_college` | college_id |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Only admins can manage roles | ALL | public |
| Users can view own role, admins view all | SELECT | public |

---

## `verify_documents`

RLS: **enabled**

| Column | Type | Nullable | Optional on insert |
|---|---|---|---|
| `college` | `string | null` | yes | yes |
| `created_at` | `string` | no | yes |
| `created_by` | `string | null` | yes | yes |
| `department` | `string | null` | yes | yes |
| `document_type` | `string` | no | no |
| `email` | `string | null` | yes | yes |
| `expiry_date` | `string | null` | yes | yes |
| `id` | `string` | no | yes |
| `issue_date` | `string` | no | yes |
| `issued_by` | `string` | no | yes |
| `last_verified_at` | `string | null` | yes | yes |
| `pdf_path` | `string | null` | yes | yes |
| `phone` | `string | null` | yes | yes |
| `reference` | `string` | no | no |
| `revoked_at` | `string | null` | yes | yes |
| `revoked_reason` | `string | null` | yes | yes |
| `role` | `string | null` | yes | yes |
| `status` | `string` | no | yes |
| `student_name` | `string` | no | no |
| `updated_at` | `string` | no | yes |
| `verification_token` | `string` | no | no |
| `verified_count` | `number` | no | yes |

**Triggers**

| Trigger | Timing | Events | Function |
|---|---|---|---|
| `update_verify_documents_updated_at` | BEFORE | UPDATE | `public.update_updated_at_column` |

**Indexes**

| Index | Definition |
|---|---|
| `idx_verify_documents_reference` | reference |
| `idx_verify_documents_status` | status |
| `idx_verify_documents_created_at` | created_at DESC |

**RLS policies**

| Policy | Action | Roles |
|---|---|---|
| Admins can delete documents | DELETE | authenticated |
| Admins can insert documents | INSERT | authenticated |
| Admins can update documents | UPDATE | authenticated |
| Admins can view documents | SELECT | authenticated |

---

