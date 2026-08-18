# Campus Connect — Migration Inventory

79 migrations in `supabase/migrations/`, applied in filename order (UTC timestamp prefix).

| # | File | Lines | New tables | Altered tables | Functions | Triggers | Policies | Indexes | Types |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `20260118133501_7006026d-550d-4f45-9a41-27992f889dbc.sql` | 327 | `attendance`, `attendance_tokens`, `lectures`, `notification_recipients`, `notifications`, `points_ledger`, `profiles`, `user_roles` | `attendance`, `attendance_tokens`, `lectures`, `notification_recipients`, `notifications`, `points_ledger`, `profiles`, `user_roles` | `is_active_user`, `is_admin`, `is_student`, `update_updated_at_column` | `function`, `update_lectures_updated_at`, `update_profiles_updated_at` | 33 | 8 | `app_role` |
| 2 | `20260118133522_f3cb953b-9047-4bf6-94b7-8ec886271cf2.sql` | 19 | — | — | `update_updated_at_column` | — | 1 | — | — |
| 3 | `20260118135318_c40c1eca-2d5a-43c1-be47-4bff017e6bbc.sql` | 35 | — | `notifications` | — | — | 1 | 2 | `notification_status` |
| 4 | `20260118140207_a330e160-7170-490d-ae31-823279a96793.sql` | 3 | — | — | — | — | — | — | — |
| 5 | `20260118140230_b44464d3-3686-4df5-bf27-23a1f9e5debf.sql` | 10 | — | — | — | — | — | — | — |
| 6 | `20260118161949_00903402-8019-4568-a984-1bb7415af364.sql` | 139 | `points_rules` | `points_rules`, `profiles` | — | `update_points_rules_updated_at` | 8 | — | — |
| 7 | `20260118165212_be1fa865-5578-4793-a5ae-0a7d8d36b799.sql` | 76 | `account_deletion_requests` | `account_deletion_requests` | `prevent_multiple_open_deletion_requests` | `trg_prevent_multiple_open_deletion_requests` | 4 | 2 | `account_deletion_status` |
| 8 | `20260118170736_d615b733-53cb-44d8-9a07-1a7a77f3b713.sql` | 6 | — | `profiles` | — | — | — | 1 | — |
| 9 | `20260118171117_ff3ec485-58c9-4d09-bb60-f7c90f5a4d28.sql` | 38 | — | — | `get_leaderboard` | — | — | — | — |
| 10 | `20260123085035_d56dbfe0-184b-45f8-a5bb-732507c58987.sql` | 20 | — | `notifications` | — | — | — | — | — |
| 11 | `20260209075312_026f55f0-dbc0-45ac-843a-ba151d71b86f.sql` | 75 | `lecture_programme_tags`, `programmes`, `student_programme_allotments` | `lecture_programme_tags`, `programmes`, `student_programme_allotments` | — | `update_programmes_updated_at` | 6 | 5 | — |
| 12 | `20260212002157_ead3ee5c-90ac-432b-beb5-76636c4025bd.sql` | 89 | `announcements`, `daily_content`, `events`, `poll_votes`, `polls` | `announcements`, `daily_content`, `events`, `poll_votes`, `polls` | — | — | 10 | — | — |
| 13 | `20260214012033_e9efc281-0f6a-4daa-8792-6893d067f1af.sql` | 97 | `student_flags`, `student_intelligence` | `student_flags`, `student_intelligence` | `get_lecture_attendance_summary` | — | 8 | 2 | — |
| 14 | `20260214012041_0d9aebe0-3070-4e8e-995e-a4d529a9d8a5.sql` | 8 | — | — | — | — | — | — | — |
| 15 | `20260214012752_b1d192b3-8006-468c-9de0-1cacd8342baa.sql` | 4 | — | — | — | — | — | — | — |
| 16 | `20260215055731_6b2d17b6-14bb-4622-9680-434172c3192d.sql` | 6 | — | — | — | — | 1 | — | — |
| 17 | `20260215055803_1c9d6291-8a68-40bc-88d5-2166b3e93ee6.sql` | 3 | — | `points_ledger` | — | — | — | — | — |
| 18 | `20260215060617_1393f4fd-321e-4452-85b1-146e0b768144.sql` | 99 | — | — | `export_monthly_attendance_combined` | — | — | — | — |
| 19 | `20260216104346_78a299a1-9113-4698-af4f-b9bbc37da31c.sql` | 38 | `attendance_audit_log` | `attendance`, `attendance_audit_log` | — | — | 2 | 6 | — |
| 20 | `20260216105551_19c2d778-744b-498d-b6a0-dadc3acd6157.sql` | 5 | — | — | — | — | — | 4 | — |
| 21 | `20260219113857_cd588ae8-dac3-4d53-8c3e-46045064e734.sql` | 183 | `daily_rewards_log`, `student_achievements`, `student_streaks` | `daily_rewards_log`, `points_ledger`, `student_achievements`, `student_streaks` | `admin_get_attendance_corrections` | — | 4 | 7 | — |
| 22 | `20260219113940_a7b0dcba-4be7-43b6-902c-80e706198d0a.sql` | 112 | — | — | `get_my_achievements`, `get_my_points_total`, `get_my_streak`, `get_my_tier_progress` | — | — | — | — |
| 23 | `20260220052644_973db717-2102-4c25-b87b-50ec5ab4b247.sql` | 185 | — | `attendance`, `daily_rewards_log`, `student_achievements` | `get_growth_insights`, `get_weekly_leaderboard` | — | — | 6 | — |
| 24 | `20260301155728_51525fa2-000a-4736-9a44-be80c3602a94.sql` | 32 | `platform_settings` | `platform_settings` | — | — | 2 | — | — |
| 25 | `20260304040040_9dd609fd-1039-4b8d-8fa4-15fc9c55f723.sql` | 68 | `core_team_members`, `platform_branding` | `core_team_members`, `platform_branding` | — | — | 8 | — | — |
| 26 | `20260305060111_baa19495-e05e-405e-b433-b94cabe32055.sql` | 1 | — | — | — | — | — | — | — |
| 27 | `20260305060124_345bc3f0-0b8c-41b1-9227-ff1a12a593b0.sql` | 69 | `colleges` | `colleges` | `get_platform_analytics`, `is_admin`, `is_super_admin` | — | 2 | — | — |
| 28 | `20260306052134_c33ebd81-5a1e-42e1-add7-590eb7a6a356.sql` | 78 | — | `attendance`, `core_team_members`, `lectures`, `points_ledger`, `profiles`, `user_roles` | `get_college_admins`, `is_super_admin` | — | 1 | 6 | — |
| 29 | `20260307071401_4e8ef193-6752-4769-844b-411541047a6b.sql` | 44 | `achievements` | `achievements` | — | `update_achievements_updated_at` | 2 | 1 | — |
| 30 | `20260308063759_3d7b3bf8-e4c3-42c2-9787-7d27949d6251.sql` | 51 | `daily_checkins` | `daily_checkins`, `points_ledger` | — | — | 3 | 1 | — |
| 31 | `20260308072204_4b979724-5e06-4499-a0d2-ea05b7831e5b.sql` | 88 | — | — | — | — | 3 | — | — |
| 32 | `20260308072225_31edb08c-7350-483e-a579-296739749e84.sql` | 80 | `audit_logs`, `login_activity`, `security_alerts` | `audit_logs`, `login_activity`, `security_alerts` | — | — | 3 | 8 | — |
| 33 | `20260308072250_a469a93b-c670-4b49-9cbe-9ec2675d0660.sql` | 121 | — | — | `award_points`, `log_audit_event`, `unlock_achievement` | — | — | — | — |
| 34 | `20260308072529_63bb7c2d-dc16-424c-965f-09be22ccb9c2.sql` | 35 | — | — | — | — | 1 | — | — |
| 35 | `20260308073227_db63dec0-4bd6-48c8-8d47-37769a7ce487.sql` | 31 | — | — | — | — | 4 | — | — |
| 36 | `20260308093630_070214d4-1a72-49cc-823a-ba232c1ec8d4.sql` | 51 | — | — | — | — | — | 13 | — |
| 37 | `20260308094035_f6d8db3a-fc4d-4b4c-9c1b-1f67bbce37cd.sql` | 31 | `feedback` | `feedback` | — | — | 3 | 2 | — |
| 38 | `20260308094455_d1f60491-a601-4e48-aa65-66d8d11ee0ba.sql` | 55 | `challenges`, `student_goals` | `challenges`, `student_goals` | — | — | 4 | 2 | — |
| 39 | `20260308095454_a5b3b769-b6e9-425c-987b-60bfd8411aa1.sql` | 2 | — | — | — | — | — | — | — |
| 40 | `20260308131721_5d12477c-0bea-4f36-a7e1-13a8935e20df.sql` | 30 | `push_subscriptions` | `push_subscriptions` | — | `push_subscriptions_updated_at` | 2 | — | — |
| 41 | `20260308150059_a015a3ed-a76e-4168-bd4a-fe1512976881.sql` | 95 | `notification_preferences` | `notification_preferences` | — | `update_notification_preferences_updated_at` | 4 | 1 | — |
| 42 | `20260310073219_05feb5cc-ec0b-46d6-be62-f3a7bdcd5ba8.sql` | 118 | `classes`, `departments` | `classes`, `departments` | `get_my_college_id` | `update_classes_updated_at`, `update_departments_updated_at` | 4 | 18 | — |
| 43 | `20260316055138_31d148c0-7f20-4c01-81e0-54db8d6216c7.sql` | 32 | — | — | `get_platform_analytics` | — | — | 5 | — |
| 44 | `20260317101157_19184ee7-4410-43c8-bfd9-3377353a8c84.sql` | 2 | — | — | — | — | — | — | — |
| 45 | `20260317101232_9b9c4932-82a1-4757-9689-ceee6fd08909.sql` | 152 | `channel_members`, `channels`, `messages` | `channel_members`, `channels`, `messages` | `is_faculty` | `update_channels_updated_at`, `update_messages_updated_at` | 13 | 7 | — |
| 46 | `20260318100801_e4c19a98-bb2f-4650-b1d8-958165fa2274.sql` | 49 | — | — | — | — | 5 | — | — |
| 47 | `20260319122119_c0883c9d-e4f4-4e12-a17c-83b1301d8f8a.sql` | 14 | — | `colleges` | — | — | — | — | — |
| 48 | `20260321043930_6a482c21-ac81-454a-91fa-512c1ec59353.sql` | 208 | `assignments`, `submissions` | `assignments`, `submissions` | `get_admin_college_analytics`, `get_faculty_lecture_analytics` | `update_assignments_updated_at`, `update_submissions_updated_at` | 10 | — | — |
| 49 | `20260323100951_d1e3ae60-e104-4504-8976-9f6556df66bf.sql` | 134 | `documents`, `exam_results`, `exams`, `timetable_slots` | `documents`, `exam_results`, `exams`, `profiles`, `timetable_slots` | — | — | 8 | 7 | — |
| 50 | `20260327094005_7f179cfd-9ce9-465b-abf7-7fa233f5eda9.sql` | 43 | `permissions` | `permissions` | — | — | 2 | — | — |
| 51 | `20260328085730_d145eda6-43f5-40cc-a948-928a00053d6c.sql` | 9 | — | `attendance`, `profiles` | — | — | — | 2 | — |
| 52 | `20260329122439_85761ba1-931a-469c-a6f0-269c15bc8d98.sql` | 79 | — | — | `notify_on_assignment_created`, `notify_on_lecture_created`, `notify_on_result_published` | `trg_notify_assignment_created`, `trg_notify_lecture_created`, `trg_notify_result_published` | — | — | — |
| 53 | `20260401123711_37d36178-ef9c-41e9-ab02-a077bca8e6fb.sql` | 29 | `leads` | `leads` | — | — | 3 | — | — |
| 54 | `20260503082629_7943b569-578b-4bf9-8dca-23e3ef938663.sql` | 261 | `point_claims`, `stall_registrations` | `events`, `point_claims`, `stall_registrations` | `get_event_stall_summary`, `point_claim_award_on_approve`, `set_point_claim_college`, `stall_registration_guard` | `trg_point_claims_award`, `trg_point_claims_set_college`, `trg_stall_guard` | 13 | 6 | `claim_activity_type`, `claim_status`, `stall_status`, `stall_type` |
| 55 | `20260510042840_919a540f-7e1f-4016-91b5-faff1d2624df.sql` | 158 | `departments`, `erp_import_batches`, `erp_import_errors`, `erp_import_staging` | `departments`, `erp_import_batches`, `erp_import_errors`, `erp_import_staging`, `profiles`, `programmes` | — | `departments_set_updated_at`, `erp_batches_set_updated_at` | 8 | 7 | — |
| 56 | `20260511005047_cbc7c33e-8838-45d9-9388-5c5180f77547.sql` | 1 | — | `erp_import_batches` | — | — | — | — | — |
| 57 | `20260511005328_f73b2159-5813-4fdc-83b7-6b40718aa417.sql` | 1 | — | `erp_import_batches` | — | — | — | — | — |
| 58 | `20260512014206_68839d08-7590-40c7-8fc9-82ca5fcdc5b2.sql` | 29 | — | `departments` | `departments_set_normalized_name` | `departments_normalize_name` | — | 1 | — |
| 59 | `20260518140203_dc95bb40-ec53-413e-b800-e5831e8b99e9.sql` | 70 | `academic_promotion_runs`, `class_promotion_rules` | `academic_promotion_runs`, `class_promotion_rules`, `profiles` | — | `class_promotion_rules_set_updated` | 5 | 1 | — |
| 60 | `20260523052816_a3163c70-ff43-4b06-8532-f683d20c9734.sql` | 139 | — | `profiles` | `admin_approve_student`, `admin_reject_student`, `profiles_guard_protected_fields` | `profiles_guard_protected_fields_trg` | — | 1 | — |
| 61 | `20260524035903_329348c3-7b32-42c3-a562-e45db9b56124.sql` | 1 | — | `profiles` | — | — | — | — | — |
| 62 | `20260525005655_a49e219e-9c7e-4376-bed0-8ad862ab9923.sql` | 120 | — | `profiles` | `admin_approve_student`, `admin_preview_student_assignment`, `admin_regenerate_classes`, `course_code_to_class_suffix`, `ensure_department_classes`, `year_to_int` | — | — | 1 | — |
| 63 | `20260530044937_d890c9b8-c00d-425a-b537-0ab6c43a51d0.sql` | 43 | — | — | `_colleges_validate_primary_color` | `colleges_validate_primary_color` | — | — | — |
| 64 | `20260602105308_e31b8363-704d-4bac-a594-2eadd5de8d54.sql` | 61 | — | — | — | — | 3 | — | — |
| 65 | `20260610094646_f7e84763-93d1-49fe-a349-9237840a4738.sql` | 37 | — | — | `get_class_leaderboard` | — | — | — | — |
| 66 | `20260611134223_5ab5a570-b28e-45e2-a557-d096afd1613b.sql` | 20 | — | — | — | — | 1 | — | — |
| 67 | `20260612073425_dcdc607f-9337-471a-a3d5-9231e0e0c975.sql` | 9 | — | `platform_settings` | — | — | — | — | — |
| 68 | `20260618044310_cada27ed-46ac-4af3-8ad0-f845a79d5a02.sql` | 136 | `support_tickets`, `ticket_messages` | `support_tickets`, `ticket_messages` | `bump_ticket_last_message`, `set_ticket_college_id` | `trg_bump_ticket_last_message`, `trg_set_ticket_college_id` | 7 | 3 | — |
| 69 | `20260627091619_c213b242-dccb-43b7-a061-6a70c8f0eddc.sql` | 43 | — | — | `get_my_college_id` | — | 2 | — | — |
| 70 | `20260707143609_df11bd8f-4d94-4b42-96d0-9abacf576716.sql` | 58 | `institution_partners` | `institution_partners` | — | `trg_institution_partners_updated_at` | 4 | 1 | — |
| 71 | `20260713093558_7cfeb33b-7a77-43cf-b4fb-a14a6e708cfc.sql` | 135 | `verify_documents` | `verify_documents` | `verify_document_public`, `verify_document_touch` | `update_verify_documents_updated_at` | 4 | 3 | — |
| 72 | `20260713093619_2fceb566-b1c0-4267-b49a-6e1a0537af81.sql` | 20 | — | — | — | — | 4 | — | — |
| 73 | `20260727061050_15f8dce6-529c-42b2-8cb7-2e4433725533.sql` | 61 | — | `events` | `events_set_college_id` | `trg_events_set_college_id` | — | 1 | — |
| 74 | `20260731192033_eafb80f5-95ee-4692-ab6a-6268b5ee3671.sql` | 46 | — | `point_claims`, `stall_registrations` | — | — | 2 | 4 | — |
| 75 | `20260811060933_c9037cd5-fbc7-4de0-aa6b-76c8a1a0c42d.sql` | 188 | — | — | — | — | 27 | — | — |
| 76 | `20260811061012_79e63e4f-3d5c-445e-bba2-ba67113911c0.sql` | 31 | — | — | — | — | — | — | — |
| 77 | `20260811061025_500cb185-21ef-49e9-9a7b-c9521a814700.sql` | 16 | — | — | — | — | — | — | — |
| 78 | `20260811061045_44046aaf-a0d4-4cf2-b3f8-95e977ad297a.sql` | 7 | — | — | — | — | 2 | — | — |
| 79 | `20260811061120_42f38483-32dd-4578-bcf9-498f203f53ff.sql` | 6 | — | — | — | — | — | — | — |
