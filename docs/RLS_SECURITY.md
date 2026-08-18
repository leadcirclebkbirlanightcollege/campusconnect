# Campus Connect — RLS & Multi-Tenant Security Reference

Final-state policy set, computed by replaying every `CREATE POLICY` / `DROP POLICY` in `supabase/migrations/` in filename (timestamp) order.

Total active policies: **201** across **63** tables.

## `public.academic_promotion_runs`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| promotion_runs_admin_insert | INSERT | public | `—` | `(public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid())` | 20260518140203_dc95bb40-ec53-413e-b800-e5831e8b99e9.sql |
| promotion_runs_admin_select | SELECT | public | `(public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid())` | `—` | 20260518140203_dc95bb40-ec53-413e-b800-e5831e8b99e9.sql |
| promotion_runs_admin_update | UPDATE | public | `(public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid())` | `—` | 20260518140203_dc95bb40-ec53-413e-b800-e5831e8b99e9.sql |

## `public.account_deletion_requests`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Admins can delete deletion requests | DELETE | public | `is_admin(auth.uid())` | `—` | 20260118165212_be1fa865-5578-4793-a5ae-0a7d8d36b799.sql |
| Admins can update deletion requests | UPDATE | public | `is_admin(auth.uid())` | `is_admin(auth.uid())` | 20260118165212_be1fa865-5578-4793-a5ae-0a7d8d36b799.sql |
| Users can create own deletion request | INSERT | public | `—` | `user_id = auth.uid()` | 20260118165212_be1fa865-5578-4793-a5ae-0a7d8d36b799.sql |
| Users can view own deletion request | SELECT | public | `user_id = auth.uid() OR is_admin(auth.uid())` | `—` | 20260118165212_be1fa865-5578-4793-a5ae-0a7d8d36b799.sql |

## `public.achievements`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Admins can manage achievements | ALL | public | `is_admin(auth.uid())` | `is_admin(auth.uid())` | 20260307071401_4e8ef193-6752-4769-844b-411541047a6b.sql |
| Anyone can read active achievements | SELECT | public | `is_active = true` | `—` | 20260307071401_4e8ef193-6752-4769-844b-411541047a6b.sql |

## `public.announcements`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Active users can view announcements | SELECT | public | `is_super_admin(auth.uid()) OR (is_active_user(auth.uid()) AND EXISTS ( SELECT 1 FROM public.profiles pr WHERE pr.user_id = announcements.created_by AND pr.college_id = get_my_college_id()))` | `—` | 20260811060933_c9037cd5-fbc7-4de0-aa6b-76c8a1a0c42d.sql |
| Admins can manage announcements | ALL | public | `is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND EXISTS ( SELECT 1 FROM public.profiles pr WHERE pr.user_id = announcements.created_by AND pr.college_id = get_my_college_id()))` | `is_super_admin(auth.uid()) OR is_admin(auth.uid())` | 20260811060933_c9037cd5-fbc7-4de0-aa6b-76c8a1a0c42d.sql |
| Faculty can create announcements | INSERT | public | `—` | `is_faculty(auth.uid()) OR is_admin(auth.uid())` | 20260318100801_e4c19a98-bb2f-4650-b1d8-958165fa2274.sql |

## `public.assignments`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Admins and faculty can manage assignments | ALL | public | `is_super_admin(auth.uid()) OR ((is_admin(auth.uid()) OR is_faculty(auth.uid())) AND college_id = get_my_college_id())` | `is_super_admin(auth.uid()) OR ((is_admin(auth.uid()) OR is_faculty(auth.uid())) AND college_id = get_my_college_id())` | 20260811060933_c9037cd5-fbc7-4de0-aa6b-76c8a1a0c42d.sql |
| Students can view assignments | SELECT | public | `is_super_admin(auth.uid()) OR (is_active_user(auth.uid()) AND is_active = true AND college_id = get_my_college_id())` | `—` | 20260811060933_c9037cd5-fbc7-4de0-aa6b-76c8a1a0c42d.sql |

## `public.attendance`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Admins can delete attendance | DELETE | public | `is_admin(auth.uid())` | `—` | 20260118133501_7006026d-550d-4f45-9a41-27992f889dbc.sql |
| Admins can insert attendance | INSERT | authenticated | `—` | `is_admin(auth.uid())` | 20260215055731_6b2d17b6-14bb-4622-9680-434172c3192d.sql |
| Admins can update attendance | UPDATE | public | `is_admin(auth.uid())` | `—` | 20260118133501_7006026d-550d-4f45-9a41-27992f889dbc.sql |
| Faculty can view attendance | SELECT | public | `is_faculty(auth.uid()) AND lecture_id IN ( SELECT id FROM public.lectures WHERE college_id = public.get_my_college_id() )` | `—` | 20260318100801_e4c19a98-bb2f-4650-b1d8-958165fa2274.sql |
| Students can mark own attendance | INSERT | public | `—` | `student_user_id = auth.uid() AND is_active_user(auth.uid())` | 20260118133501_7006026d-550d-4f45-9a41-27992f889dbc.sql |
| Users can view own attendance, admins view all | SELECT | public | `student_user_id = auth.uid() OR is_admin(auth.uid())` | `—` | 20260118133501_7006026d-550d-4f45-9a41-27992f889dbc.sql |

## `public.attendance_audit_log`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Admins can insert audit logs | INSERT | authenticated | `—` | `is_admin(auth.uid())` | 20260216104346_78a299a1-9113-4698-af4f-b9bbc37da31c.sql |
| Admins can view audit logs | SELECT | authenticated | `is_admin(auth.uid())` | `—` | 20260216104346_78a299a1-9113-4698-af4f-b9bbc37da31c.sql |

## `public.attendance_tokens`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Only admins can create tokens | INSERT | public | `—` | `is_admin(auth.uid())` | 20260118133501_7006026d-550d-4f45-9a41-27992f889dbc.sql |
| Only admins can delete tokens | DELETE | public | `is_admin(auth.uid())` | `—` | 20260118133501_7006026d-550d-4f45-9a41-27992f889dbc.sql |
| Only admins can update tokens | UPDATE | public | `is_admin(auth.uid())` | `—` | 20260118133501_7006026d-550d-4f45-9a41-27992f889dbc.sql |
| Only admins can view tokens | SELECT | public | `is_admin(auth.uid())` | `—` | 20260118133501_7006026d-550d-4f45-9a41-27992f889dbc.sql |

## `public.audit_logs`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Admins can insert audit logs | INSERT | public | `—` | `is_admin(auth.uid()) OR is_super_admin(auth.uid())` | 20260308073227_db63dec0-4bd6-48c8-8d47-37769a7ce487.sql |
| audit_logs_select | SELECT | public | `public.is_super_admin(auth.uid()) OR public.is_admin(auth.uid())` | `—` | 20260308072225_31edb08c-7350-483e-a579-296739749e84.sql |

## `public.challenges`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Active users can view active challenges | SELECT | public | `is_active_user(auth.uid()) AND is_active = true AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE` | `—` | 20260308094455_d1f60491-a601-4e48-aa65-66d8d11ee0ba.sql |
| Admins can manage challenges | ALL | public | `is_admin(auth.uid())` | `is_admin(auth.uid())` | 20260308094455_d1f60491-a601-4e48-aa65-66d8d11ee0ba.sql |

## `public.channel_members`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Admins can manage channel members | ALL | public | `is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND EXISTS ( SELECT 1 FROM public.channels c WHERE c.id = channel_members.channel_id AND c.college_id = get_my_college_id()))` | `is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND EXISTS ( SELECT 1 FROM public.channels c WHERE c.id = channel_members.channel_id AND c.college_id = get_my_college_id()))` | 20260811060933_c9037cd5-fbc7-4de0-aa6b-76c8a1a0c42d.sql |
| Users can join channels | INSERT | public | `—` | `user_id = auth.uid() OR is_admin(auth.uid()) OR is_faculty(auth.uid())` | 20260317101232_9b9c4932-82a1-4757-9689-ceee6fd08909.sql |
| Users can view channel memberships | SELECT | public | `is_super_admin(auth.uid()) OR channel_members.user_id = auth.uid() OR EXISTS ( SELECT 1 FROM public.channel_members me WHERE me.channel_id = channel_members.channel_id AND me.user_id = auth.uid()) OR (is_admin(auth.uid()) AND EXISTS ( SELECT 1 FROM public.channels c WHERE c.id = channel_members.chan` | `—` | 20260811060933_c9037cd5-fbc7-4de0-aa6b-76c8a1a0c42d.sql |

## `public.channels`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Active users can view channels | SELECT | public | `is_super_admin(auth.uid()) OR (is_active_user(auth.uid()) AND college_id = get_my_college_id())` | `—` | 20260811060933_c9037cd5-fbc7-4de0-aa6b-76c8a1a0c42d.sql |
| Admins and faculty can create channels | INSERT | public | `—` | `is_admin(auth.uid()) OR is_faculty(auth.uid())` | 20260317101232_9b9c4932-82a1-4757-9689-ceee6fd08909.sql |
| Admins can manage channels | ALL | public | `is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND college_id = get_my_college_id())` | `is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND college_id = get_my_college_id())` | 20260811060933_c9037cd5-fbc7-4de0-aa6b-76c8a1a0c42d.sql |

## `public.class_promotion_rules`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| promotion_rules_admin_manage | ALL | public | `(public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid())` | `(public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid())` | 20260518140203_dc95bb40-ec53-413e-b800-e5831e8b99e9.sql |
| promotion_rules_read | SELECT | public | `is_super_admin(auth.uid()) OR (is_active_user(auth.uid()) AND college_id = get_my_college_id())` | `—` | 20260811060933_c9037cd5-fbc7-4de0-aa6b-76c8a1a0c42d.sql |

## `public.classes`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Active users can view classes | SELECT | public | `is_super_admin(auth.uid()) OR ((is_active_user(auth.uid()) OR is_admin(auth.uid())) AND is_active = true AND college_id = get_my_college_id())` | `—` | 20260811060933_c9037cd5-fbc7-4de0-aa6b-76c8a1a0c42d.sql |
| Admins can manage classes | ALL | public | `is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND college_id = get_my_college_id())` | `is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND college_id = get_my_college_id())` | 20260811060933_c9037cd5-fbc7-4de0-aa6b-76c8a1a0c42d.sql |

## `public.colleges`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Anyone can read active colleges | SELECT | public | `is_active = true` | `—` | 20260305060124_345bc3f0-0b8c-41b1-9227-ff1a12a593b0.sql |
| Super admins can manage colleges | ALL | public | `EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')` | `EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')` | 20260305060124_345bc3f0-0b8c-41b1-9227-ff1a12a593b0.sql |
| Super admins can read all colleges | SELECT | public | `public.is_super_admin(auth.uid())` | `—` | 20260306052134_c33ebd81-5a1e-42e1-add7-590eb7a6a356.sql |

## `public.core_team_members`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Admins can manage team members | ALL | public | `public.is_admin(auth.uid())` | `public.is_admin(auth.uid())` | 20260304040040_9dd609fd-1039-4b8d-8fa4-15fc9c55f723.sql |
| Anyone can read team members | SELECT | public | `true` | `—` | 20260304040040_9dd609fd-1039-4b8d-8fa4-15fc9c55f723.sql |

## `public.daily_checkins`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Service role can insert check-ins | INSERT | public | `—` | `(user_id = auth.uid()) OR is_admin(auth.uid())` | 20260308063759_3d7b3bf8-e4c3-42c2-9787-7d27949d6251.sql |
| Users can view own check-ins, admins view all | SELECT | public | `(user_id = auth.uid()) OR is_admin(auth.uid())` | `—` | 20260308063759_3d7b3bf8-e4c3-42c2-9787-7d27949d6251.sql |

## `public.daily_content`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Active users can view daily content | SELECT | public | `is_active_user(auth.uid())` | `—` | 20260212002157_ead3ee5c-90ac-432b-beb5-76636c4025bd.sql |
| Admins can manage daily content | ALL | public | `is_admin(auth.uid())` | `—` | 20260212002157_ead3ee5c-90ac-432b-beb5-76636c4025bd.sql |

## `public.daily_rewards_log`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Users can view own daily rewards, admins view all | SELECT | authenticated | `user_id = auth.uid() OR public.is_admin(auth.uid())` | `—` | 20260219113857_cd588ae8-dac3-4d53-8c3e-46045064e734.sql |

## `public.departments`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Active users can view departments in their college | SELECT | public | `is_active = true AND ( is_active_user(auth.uid()) OR is_admin(auth.uid()) )` | `—` | 20260310073219_05feb5cc-ec0b-46d6-be62-f3a7bdcd5ba8.sql |
| Admins can manage departments | ALL | public | `is_admin(auth.uid())` | `is_admin(auth.uid())` | 20260310073219_05feb5cc-ec0b-46d6-be62-f3a7bdcd5ba8.sql |
| departments_admin_write | ALL | authenticated | `(public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid())` | `(public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid())` | 20260510042840_919a540f-7e1f-4016-91b5-faff1d2624df.sql |
| departments_select_same_college | SELECT | authenticated | `college_id = public.get_my_college_id() OR public.is_super_admin(auth.uid())` | `—` | 20260510042840_919a540f-7e1f-4016-91b5-faff1d2624df.sql |

## `public.documents`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Faculty and admins can manage documents | ALL | public | `is_super_admin(auth.uid()) OR ((is_admin(auth.uid()) OR is_faculty(auth.uid())) AND college_id = get_my_college_id())` | `is_super_admin(auth.uid()) OR ((is_admin(auth.uid()) OR is_faculty(auth.uid())) AND college_id = get_my_college_id())` | 20260811060933_c9037cd5-fbc7-4de0-aa6b-76c8a1a0c42d.sql |
| Students can view accessible documents | SELECT | public | `is_super_admin(auth.uid()) OR (is_active_user(auth.uid()) AND is_active = true AND college_id = get_my_college_id())` | `—` | 20260811060933_c9037cd5-fbc7-4de0-aa6b-76c8a1a0c42d.sql |

## `public.erp_import_batches`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| erp_batches_admin_write | ALL | authenticated | `(public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid())` | `(public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid())` | 20260510042840_919a540f-7e1f-4016-91b5-faff1d2624df.sql |
| erp_batches_select | SELECT | authenticated | `(public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid())` | `—` | 20260510042840_919a540f-7e1f-4016-91b5-faff1d2624df.sql |

## `public.erp_import_errors`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| erp_errors_admin_write | ALL | authenticated | `(public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid())` | `(public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid())` | 20260510042840_919a540f-7e1f-4016-91b5-faff1d2624df.sql |
| erp_errors_select | SELECT | authenticated | `(public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid())` | `—` | 20260510042840_919a540f-7e1f-4016-91b5-faff1d2624df.sql |

## `public.erp_import_staging`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| erp_staging_admin_write | ALL | authenticated | `(public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid())` | `(public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid())` | 20260510042840_919a540f-7e1f-4016-91b5-faff1d2624df.sql |
| erp_staging_select | SELECT | authenticated | `(public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid())` | `—` | 20260510042840_919a540f-7e1f-4016-91b5-faff1d2624df.sql |

## `public.events`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Admins manage their college events | ALL | authenticated | `public.is_super_admin(auth.uid()) OR (public.is_admin(auth.uid()) AND college_id = public.get_my_college_id())` | `public.is_super_admin(auth.uid()) OR (public.is_admin(auth.uid()) AND college_id = public.get_my_college_id())` | 20260731192033_eafb80f5-95ee-4692-ab6a-6268b5ee3671.sql |
| Members can view their college events | SELECT | authenticated | `public.is_super_admin(auth.uid()) OR (public.is_active_user(auth.uid()) AND college_id = public.get_my_college_id())` | `—` | 20260731192033_eafb80f5-95ee-4692-ab6a-6268b5ee3671.sql |

## `public.exam_results`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Admins and faculty can manage results | ALL | public | `is_admin(auth.uid()) OR is_faculty(auth.uid())` | `is_admin(auth.uid()) OR is_faculty(auth.uid())` | 20260323100951_d1e3ae60-e104-4504-8976-9f6556df66bf.sql |
| Students can view own results | SELECT | public | `(student_user_id = auth.uid()) OR is_admin(auth.uid()) OR is_faculty(auth.uid())` | `—` | 20260323100951_d1e3ae60-e104-4504-8976-9f6556df66bf.sql |

## `public.exams`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Active users can view exams | SELECT | public | `is_super_admin(auth.uid()) OR (is_active_user(auth.uid()) AND is_active = true AND college_id = get_my_college_id())` | `—` | 20260811060933_c9037cd5-fbc7-4de0-aa6b-76c8a1a0c42d.sql |
| Admins and faculty can manage exams | ALL | public | `is_super_admin(auth.uid()) OR ((is_admin(auth.uid()) OR is_faculty(auth.uid())) AND college_id = get_my_college_id())` | `is_super_admin(auth.uid()) OR ((is_admin(auth.uid()) OR is_faculty(auth.uid())) AND college_id = get_my_college_id())` | 20260811060933_c9037cd5-fbc7-4de0-aa6b-76c8a1a0c42d.sql |

## `public.feedback`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Admins can update feedback status | UPDATE | public | `is_admin(auth.uid()) OR is_super_admin(auth.uid())` | `—` | 20260308094035_f6d8db3a-fc4d-4b4c-9c1b-1f67bbce37cd.sql |
| Users can submit own feedback | INSERT | public | `—` | `user_id = auth.uid()` | 20260308094035_f6d8db3a-fc4d-4b4c-9c1b-1f67bbce37cd.sql |
| Users can view own feedback | SELECT | public | `(user_id = auth.uid()) OR is_admin(auth.uid()) OR is_super_admin(auth.uid())` | `—` | 20260308094035_f6d8db3a-fc4d-4b4c-9c1b-1f67bbce37cd.sql |

## `public.institution_partners`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Public can read active partners | SELECT | public | `is_active = true OR public.is_super_admin(auth.uid())` | `—` | 20260707143609_df11bd8f-4d94-4b42-96d0-9abacf576716.sql |
| Super admins can delete partners | DELETE | authenticated | `public.is_super_admin(auth.uid())` | `—` | 20260707143609_df11bd8f-4d94-4b42-96d0-9abacf576716.sql |
| Super admins can insert partners | INSERT | authenticated | `—` | `public.is_super_admin(auth.uid())` | 20260707143609_df11bd8f-4d94-4b42-96d0-9abacf576716.sql |
| Super admins can update partners | UPDATE | authenticated | `public.is_super_admin(auth.uid())` | `public.is_super_admin(auth.uid())` | 20260707143609_df11bd8f-4d94-4b42-96d0-9abacf576716.sql |

## `public.leads`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Admins can view leads | SELECT | public | `is_admin(auth.uid())` | `—` | 20260401123711_37d36178-ef9c-41e9-ab02-a077bca8e6fb.sql |
| Anyone can insert leads | INSERT | public | `—` | `true` | 20260401123711_37d36178-ef9c-41e9-ab02-a077bca8e6fb.sql |
| Super admins can manage leads | ALL | public | `is_super_admin(auth.uid())` | `is_super_admin(auth.uid())` | 20260401123711_37d36178-ef9c-41e9-ab02-a077bca8e6fb.sql |

## `public.lecture_programme_tags`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Active users can view lecture tags | SELECT | public | `is_super_admin(auth.uid()) OR (is_active_user(auth.uid()) AND EXISTS ( SELECT 1 FROM public.lectures l WHERE l.id = lecture_programme_tags.lecture_id AND l.college_id = get_my_college_id()))` | `—` | 20260811060933_c9037cd5-fbc7-4de0-aa6b-76c8a1a0c42d.sql |
| Admins can manage lecture tags | ALL | public | `is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND EXISTS ( SELECT 1 FROM public.lectures l WHERE l.id = lecture_programme_tags.lecture_id AND l.college_id = get_my_college_id()))` | `is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND EXISTS ( SELECT 1 FROM public.lectures l WHERE l.id = lecture_programme_tags.lecture_id AND l.college_id = get_my_college_id()))` | 20260811060933_c9037cd5-fbc7-4de0-aa6b-76c8a1a0c42d.sql |

## `public.lectures`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Active users can view lectures | SELECT | public | `is_super_admin(auth.uid()) OR (is_active_user(auth.uid()) AND college_id = get_my_college_id())` | `—` | 20260811060933_c9037cd5-fbc7-4de0-aa6b-76c8a1a0c42d.sql |
| Faculty can view college lectures | SELECT | public | `is_faculty(auth.uid()) AND college_id = public.get_my_college_id()` | `—` | 20260318100801_e4c19a98-bb2f-4650-b1d8-958165fa2274.sql |
| Only admins can delete lectures | DELETE | public | `is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND college_id = get_my_college_id())` | `—` | 20260811060933_c9037cd5-fbc7-4de0-aa6b-76c8a1a0c42d.sql |
| Only admins can manage lectures | INSERT | public | `—` | `is_admin(auth.uid())` | 20260118133501_7006026d-550d-4f45-9a41-27992f889dbc.sql |
| Only admins can update lectures | UPDATE | public | `is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND college_id = get_my_college_id())` | `is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND college_id = get_my_college_id())` | 20260811060933_c9037cd5-fbc7-4de0-aa6b-76c8a1a0c42d.sql |

## `public.login_activity`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Users can insert own login activity | INSERT | public | `—` | `user_id = auth.uid()` | 20260308073227_db63dec0-4bd6-48c8-8d47-37769a7ce487.sql |
| login_activity_select | SELECT | public | `user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())` | `—` | 20260308072225_31edb08c-7350-483e-a579-296739749e84.sql |

## `public.messages`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Active users can send messages | INSERT | public | `—` | `sender_id = auth.uid() AND is_active_user(auth.uid())` | 20260317101232_9b9c4932-82a1-4757-9689-ceee6fd08909.sql |
| Admins can delete messages | DELETE | public | `is_admin(auth.uid())` | `—` | 20260317101232_9b9c4932-82a1-4757-9689-ceee6fd08909.sql |
| Users can update own messages | UPDATE | public | `sender_id = auth.uid() OR is_admin(auth.uid())` | `—` | 20260317101232_9b9c4932-82a1-4757-9689-ceee6fd08909.sql |
| Users can view their channel or DM messages | SELECT | authenticated | `is_deleted = false AND is_active_user(auth.uid()) AND ( sender_id = auth.uid() OR receiver_id = auth.uid() OR ( channel_id IS NOT NULL AND EXISTS ( SELECT 1 FROM public.channel_members cm WHERE cm.channel_id = messages.channel_id AND cm.user_id = auth.uid() ) ) OR is_admin(auth.uid()) )` | `—` | 20260602105308_e31b8363-704d-4bac-a594-2eadd5de8d54.sql |

## `public.notification_preferences`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Admins can view notification preferences | SELECT | public | `is_admin(auth.uid()) OR is_super_admin(auth.uid())` | `—` | 20260308150059_a015a3ed-a76e-4168-bd4a-fe1512976881.sql |
| Users can insert own notification preferences | INSERT | public | `—` | `user_id = auth.uid()` | 20260308150059_a015a3ed-a76e-4168-bd4a-fe1512976881.sql |
| Users can update own notification preferences | UPDATE | public | `user_id = auth.uid()` | `user_id = auth.uid()` | 20260308150059_a015a3ed-a76e-4168-bd4a-fe1512976881.sql |
| Users can view own notification preferences | SELECT | public | `user_id = auth.uid()` | `—` | 20260308150059_a015a3ed-a76e-4168-bd4a-fe1512976881.sql |

## `public.notification_recipients`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Admins and system can insert notification receipts | INSERT | public | `—` | `is_admin(auth.uid()) OR user_id = auth.uid()` | 20260118133522_f3cb953b-9047-4bf6-94b7-8ec886271cf2.sql |
| Users can update own notification read status | UPDATE | public | `user_id = auth.uid()` | `—` | 20260118133501_7006026d-550d-4f45-9a41-27992f889dbc.sql |
| Users can view own notification receipts | SELECT | public | `user_id = auth.uid() OR is_admin(auth.uid())` | `—` | 20260118133501_7006026d-550d-4f45-9a41-27992f889dbc.sql |
| notification_recipients_insert_admin | INSERT | public | `—` | `public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())` | 20260308072529_63bb7c2d-dc16-424c-965f-09be22ccb9c2.sql |

## `public.notifications`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Only admins can create notifications | INSERT | public | `—` | `is_admin(auth.uid())` | 20260118133501_7006026d-550d-4f45-9a41-27992f889dbc.sql |
| Only admins can delete notifications | DELETE | public | `is_admin(auth.uid())` | `—` | 20260118133501_7006026d-550d-4f45-9a41-27992f889dbc.sql |
| Only admins can update notifications | UPDATE | public | `is_admin(auth.uid())` | `—` | 20260118133501_7006026d-550d-4f45-9a41-27992f889dbc.sql |
| Users can view notifications they received, admins view all | SELECT | public | `is_admin(auth.uid()) OR EXISTS ( SELECT 1 FROM public.notification_recipients nr WHERE nr.notification_id = notifications.id AND nr.user_id = auth.uid() )` | `—` | 20260118135318_c40c1eca-2d5a-43c1-be47-4bff017e6bbc.sql |

## `public.permissions`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Admins can manage permissions | ALL | public | `is_admin(auth.uid())` | `is_admin(auth.uid())` | 20260327094005_7f179cfd-9ce9-465b-abf7-7fa233f5eda9.sql |
| Authenticated users can view permissions | SELECT | authenticated | `true` | `—` | 20260327094005_7f179cfd-9ce9-465b-abf7-7fa233f5eda9.sql |

## `public.platform_branding`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Admins can manage branding | ALL | public | `public.is_admin(auth.uid())` | `public.is_admin(auth.uid())` | 20260304040040_9dd609fd-1039-4b8d-8fa4-15fc9c55f723.sql |
| Anyone can read branding | SELECT | public | `true` | `—` | 20260304040040_9dd609fd-1039-4b8d-8fa4-15fc9c55f723.sql |

## `public.platform_settings`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Admins can manage platform settings | ALL | public | `public.is_admin(auth.uid())` | `—` | 20260301155728_51525fa2-000a-4736-9a44-be80c3602a94.sql |
| Admins can read all platform settings | SELECT | public | `is_admin(auth.uid()) OR is_super_admin(auth.uid())` | `—` | 20260811061045_44046aaf-a0d4-4cf2-b3f8-95e977ad297a.sql |
| Public client settings are readable | SELECT | public | `key IN ('landing_content', 'platform_mode', 'force_update', 'soft_update')` | `—` | 20260811061045_44046aaf-a0d4-4cf2-b3f8-95e977ad297a.sql |

## `public.point_claims`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Admins can delete college claims | DELETE | public | `is_admin(auth.uid()) AND college_id = get_my_college_id()` | `—` | 20260503082629_7943b569-578b-4bf9-8dca-23e3ef938663.sql |
| Admins can update college claims | UPDATE | public | `is_admin(auth.uid()) AND college_id = get_my_college_id()` | `is_admin(auth.uid()) AND college_id = get_my_college_id()` | 20260503082629_7943b569-578b-4bf9-8dca-23e3ef938663.sql |
| Admins can view college claims | SELECT | public | `is_admin(auth.uid()) AND college_id = get_my_college_id()` | `—` | 20260503082629_7943b569-578b-4bf9-8dca-23e3ef938663.sql |
| Super admins can view all claims | SELECT | public | `is_super_admin(auth.uid())` | `—` | 20260503082629_7943b569-578b-4bf9-8dca-23e3ef938663.sql |
| Users can create own claims | INSERT | public | `—` | `user_id = auth.uid() AND is_active_user(auth.uid())` | 20260503082629_7943b569-578b-4bf9-8dca-23e3ef938663.sql |
| Users can view own claims | SELECT | public | `user_id = auth.uid()` | `—` | 20260503082629_7943b569-578b-4bf9-8dca-23e3ef938663.sql |

## `public.points_ledger`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Admins can delete points | DELETE | public | `is_admin(auth.uid())` | `—` | 20260118133501_7006026d-550d-4f45-9a41-27992f889dbc.sql |
| Admins can update points | UPDATE | public | `is_admin(auth.uid())` | `—` | 20260118133501_7006026d-550d-4f45-9a41-27992f889dbc.sql |
| Users can view own points, admins view all | SELECT | public | `user_id = auth.uid() OR is_admin(auth.uid())` | `—` | 20260118133501_7006026d-550d-4f45-9a41-27992f889dbc.sql |
| points_ledger_select | SELECT | public | `user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())` | `—` | 20260308072204_4b979724-5e06-4499-a0d2-ea05b7831e5b.sql |

## `public.points_rules`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Active users can view points rules | SELECT | public | `is_active_user(auth.uid()) OR is_admin(auth.uid())` | `—` | 20260118161949_00903402-8019-4568-a984-1bb7415af364.sql |
| Admins can delete points rules | DELETE | public | `is_admin(auth.uid())` | `—` | 20260118161949_00903402-8019-4568-a984-1bb7415af364.sql |
| Admins can insert points rules | INSERT | public | `—` | `is_admin(auth.uid())` | 20260118161949_00903402-8019-4568-a984-1bb7415af364.sql |
| Admins can update points rules | UPDATE | public | `is_admin(auth.uid())` | `is_admin(auth.uid())` | 20260118161949_00903402-8019-4568-a984-1bb7415af364.sql |

## `public.poll_votes`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Users can cast own vote | INSERT | public | `—` | `auth.uid() = user_id AND is_active_user(auth.uid())` | 20260212002157_ead3ee5c-90ac-432b-beb5-76636c4025bd.sql |
| Users can view votes | SELECT | public | `is_active_user(auth.uid())` | `—` | 20260212002157_ead3ee5c-90ac-432b-beb5-76636c4025bd.sql |
| Voters and admins see own votes | SELECT | authenticated | `user_id = auth.uid() OR public.is_admin(auth.uid())` | `—` | 20260627091619_c213b242-dccb-43b7-a061-6a70c8f0eddc.sql |

## `public.polls`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Active users can view polls | SELECT | public | `is_super_admin(auth.uid()) OR (is_active_user(auth.uid()) AND EXISTS ( SELECT 1 FROM public.profiles pr WHERE pr.user_id = polls.created_by AND pr.college_id = get_my_college_id()))` | `—` | 20260811060933_c9037cd5-fbc7-4de0-aa6b-76c8a1a0c42d.sql |
| Admins can manage polls | ALL | public | `is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND EXISTS ( SELECT 1 FROM public.profiles pr WHERE pr.user_id = polls.created_by AND pr.college_id = get_my_college_id()))` | `is_super_admin(auth.uid()) OR is_admin(auth.uid())` | 20260811060933_c9037cd5-fbc7-4de0-aa6b-76c8a1a0c42d.sql |

## `public.profiles`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Admins can delete profiles | DELETE | public | `is_admin(auth.uid())` | `—` | 20260118133501_7006026d-550d-4f45-9a41-27992f889dbc.sql |
| Faculty can view college profiles | SELECT | public | `is_faculty(auth.uid()) AND college_id = public.get_my_college_id()` | `—` | 20260318100801_e4c19a98-bb2f-4650-b1d8-958165fa2274.sql |
| Users can insert own profile | INSERT | public | `—` | `user_id = auth.uid()` | 20260118133501_7006026d-550d-4f45-9a41-27992f889dbc.sql |
| Users can update own profile | UPDATE | public | `user_id = auth.uid() OR is_admin(auth.uid())` | `—` | 20260118133501_7006026d-550d-4f45-9a41-27992f889dbc.sql |
| profiles_select_own_or_admin | SELECT | public | `user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())` | `—` | 20260308072204_4b979724-5e06-4499-a0d2-ea05b7831e5b.sql |

## `public.programmes`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Active users can view programmes | SELECT | public | `is_super_admin(auth.uid()) OR (is_active_user(auth.uid()) AND is_active = true AND college_id = get_my_college_id())` | `—` | 20260811060933_c9037cd5-fbc7-4de0-aa6b-76c8a1a0c42d.sql |
| Admins can manage programmes | ALL | public | `is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND college_id = get_my_college_id())` | `is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND college_id = get_my_college_id())` | 20260811060933_c9037cd5-fbc7-4de0-aa6b-76c8a1a0c42d.sql |

## `public.push_subscriptions`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Admins can read push subscriptions | SELECT | public | `is_admin(auth.uid()) OR is_super_admin(auth.uid())` | `—` | 20260308131721_5d12477c-0bea-4f36-a7e1-13a8935e20df.sql |
| Users manage own push subscriptions | ALL | public | `user_id = auth.uid()` | `user_id = auth.uid()` | 20260308131721_5d12477c-0bea-4f36-a7e1-13a8935e20df.sql |

## `public.security_alerts`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Admins can insert security alerts | INSERT | public | `—` | `is_admin(auth.uid()) OR is_super_admin(auth.uid())` | 20260308073227_db63dec0-4bd6-48c8-8d47-37769a7ce487.sql |
| security_alerts_select | SELECT | public | `public.is_super_admin(auth.uid()) OR public.is_admin(auth.uid())` | `—` | 20260308072225_31edb08c-7350-483e-a579-296739749e84.sql |

## `public.stall_registrations`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Admins can delete college stalls | DELETE | public | `is_admin(auth.uid()) AND college_id = get_my_college_id()` | `—` | 20260503082629_7943b569-578b-4bf9-8dca-23e3ef938663.sql |
| Admins can update college stalls | UPDATE | public | `is_admin(auth.uid()) AND college_id = get_my_college_id()` | `is_admin(auth.uid()) AND college_id = get_my_college_id()` | 20260503082629_7943b569-578b-4bf9-8dca-23e3ef938663.sql |
| Admins can view college stalls | SELECT | public | `is_admin(auth.uid()) AND college_id = get_my_college_id()` | `—` | 20260503082629_7943b569-578b-4bf9-8dca-23e3ef938663.sql |
| Super admins view all stalls | SELECT | public | `is_super_admin(auth.uid())` | `—` | 20260503082629_7943b569-578b-4bf9-8dca-23e3ef938663.sql |
| Users can cancel own pending stall | DELETE | public | `user_id = auth.uid() AND status = 'pending'` | `—` | 20260503082629_7943b569-578b-4bf9-8dca-23e3ef938663.sql |
| Users can create own stall registration | INSERT | public | `—` | `user_id = auth.uid() AND is_active_user(auth.uid())` | 20260503082629_7943b569-578b-4bf9-8dca-23e3ef938663.sql |
| Users can view own stalls | SELECT | public | `user_id = auth.uid()` | `—` | 20260503082629_7943b569-578b-4bf9-8dca-23e3ef938663.sql |

## `public.student_achievements`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Users can view own achievements, admins view all | SELECT | authenticated | `user_id = auth.uid() OR public.is_admin(auth.uid())` | `—` | 20260219113857_cd588ae8-dac3-4d53-8c3e-46045064e734.sql |

## `public.student_flags`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Students view own flags | SELECT | public | `user_id = auth.uid() OR is_admin(auth.uid())` | `—` | 20260214012033_e9efc281-0f6a-4daa-8792-6893d067f1af.sql |
| System can manage flags | ALL | public | `is_admin(auth.uid())` | `—` | 20260214012033_e9efc281-0f6a-4daa-8792-6893d067f1af.sql |

## `public.student_goals`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Admins can view goals | SELECT | public | `is_admin(auth.uid())` | `—` | 20260308094455_d1f60491-a601-4e48-aa65-66d8d11ee0ba.sql |
| Users manage own goals | ALL | public | `user_id = auth.uid()` | `user_id = auth.uid()` | 20260308094455_d1f60491-a601-4e48-aa65-66d8d11ee0ba.sql |

## `public.student_intelligence`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Students view own intelligence | SELECT | public | `user_id = auth.uid() OR is_admin(auth.uid())` | `—` | 20260214012033_e9efc281-0f6a-4daa-8792-6893d067f1af.sql |
| System can upsert intelligence | ALL | public | `is_admin(auth.uid())` | `—` | 20260214012033_e9efc281-0f6a-4daa-8792-6893d067f1af.sql |

## `public.student_programme_allotments`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Admins can manage allotments | ALL | public | `is_admin(auth.uid())` | `—` | 20260209075312_026f55f0-dbc0-45ac-843a-ba151d71b86f.sql |
| Students can view own allotments | SELECT | public | `student_user_id = auth.uid() OR is_admin(auth.uid())` | `—` | 20260209075312_026f55f0-dbc0-45ac-843a-ba151d71b86f.sql |

## `public.student_streaks`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Users can view own streak, admins view all | SELECT | authenticated | `user_id = auth.uid() OR public.is_admin(auth.uid())` | `—` | 20260219113857_cd588ae8-dac3-4d53-8c3e-46045064e734.sql |

## `public.submissions`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Faculty and admins can update submissions | UPDATE | public | `is_admin(auth.uid()) OR is_faculty(auth.uid())` | `—` | 20260321043930_6a482c21-ac81-454a-91fa-512c1ec59353.sql |
| Faculty and admins can view submissions | SELECT | public | `is_admin(auth.uid()) OR is_faculty(auth.uid())` | `—` | 20260321043930_6a482c21-ac81-454a-91fa-512c1ec59353.sql |
| Students can manage own submissions | ALL | public | `student_user_id = auth.uid()` | `student_user_id = auth.uid()` | 20260321043930_6a482c21-ac81-454a-91fa-512c1ec59353.sql |

## `public.support_tickets`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| tickets_owner_insert | INSERT | authenticated | `—` | `created_by = auth.uid()` | 20260618044310_cada27ed-46ac-4af3-8ad0-f845a79d5a02.sql |
| tickets_owner_select | SELECT | authenticated | `created_by = auth.uid()` | `—` | 20260618044310_cada27ed-46ac-4af3-8ad0-f845a79d5a02.sql |
| tickets_owner_update | UPDATE | authenticated | `created_by = auth.uid() AND status <> 'closed'` | `created_by = auth.uid()` | 20260618044310_cada27ed-46ac-4af3-8ad0-f845a79d5a02.sql |
| tickets_staff_select | SELECT | authenticated | `(public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())) AND (public.is_super_admin(auth.uid()) OR college_id = public.get_my_college_id())` | `—` | 20260618044310_cada27ed-46ac-4af3-8ad0-f845a79d5a02.sql |
| tickets_staff_update | UPDATE | authenticated | `(public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())) AND (public.is_super_admin(auth.uid()) OR college_id = public.get_my_college_id())` | `—` | 20260618044310_cada27ed-46ac-4af3-8ad0-f845a79d5a02.sql |

## `public.ticket_messages`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| ticket_msg_insert | INSERT | authenticated | `—` | `author_id = auth.uid() AND EXISTS ( SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND ( t.created_by = auth.uid() OR ( (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())) AND (public.is_super_admin(auth.uid()) OR t.college_id = public.get_my_college_id()) ) ) )` | 20260618044310_cada27ed-46ac-4af3-8ad0-f845a79d5a02.sql |
| ticket_msg_select | SELECT | authenticated | `EXISTS ( SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND ( t.created_by = auth.uid() OR ( (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())) AND (public.is_super_admin(auth.uid()) OR t.college_id = public.get_my_college_id()) ) ) )` | `—` | 20260618044310_cada27ed-46ac-4af3-8ad0-f845a79d5a02.sql |

## `public.timetable_slots`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Active users can view timetable | SELECT | public | `is_super_admin(auth.uid()) OR (is_active_user(auth.uid()) AND college_id = get_my_college_id())` | `—` | 20260811060933_c9037cd5-fbc7-4de0-aa6b-76c8a1a0c42d.sql |
| Admins can manage timetable | ALL | public | `is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND college_id = get_my_college_id())` | `is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND college_id = get_my_college_id())` | 20260811060933_c9037cd5-fbc7-4de0-aa6b-76c8a1a0c42d.sql |

## `public.user_roles`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Only admins can manage roles | ALL | public | `is_admin(auth.uid())` | `—` | 20260118133501_7006026d-550d-4f45-9a41-27992f889dbc.sql |
| Users can view own role, admins view all | SELECT | public | `user_id = auth.uid() OR is_admin(auth.uid())` | `—` | 20260118133501_7006026d-550d-4f45-9a41-27992f889dbc.sql |

## `public.verify_documents`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Admins can delete documents | DELETE | authenticated | `public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())` | `—` | 20260713093558_7cfeb33b-7a77-43cf-b4fb-a14a6e708cfc.sql |
| Admins can insert documents | INSERT | authenticated | `—` | `public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())` | 20260713093558_7cfeb33b-7a77-43cf-b4fb-a14a6e708cfc.sql |
| Admins can update documents | UPDATE | authenticated | `public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())` | `public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())` | 20260713093558_7cfeb33b-7a77-43cf-b4fb-a14a6e708cfc.sql |
| Admins can view documents | SELECT | authenticated | `public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())` | `—` | 20260713093558_7cfeb33b-7a77-43cf-b4fb-a14a6e708cfc.sql |

## `storage.objects`

| Policy | Action | Roles | USING | WITH CHECK | Defined in |
|---|---|---|---|---|---|
| Admins can delete lecture flyers | DELETE | public | `bucket_id = 'lecture-flyers' AND is_admin(auth.uid())` | `—` | 20260118133501_7006026d-550d-4f45-9a41-27992f889dbc.sql |
| Admins can delete team photos | DELETE | public | `bucket_id = 'team-photos' AND public.is_admin(auth.uid())` | `—` | 20260304040040_9dd609fd-1039-4b8d-8fa4-15fc9c55f723.sql |
| Admins can delete verify-documents | DELETE | authenticated | `bucket_id = 'verify-documents' AND (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()))` | `—` | 20260713093619_2fceb566-b1c0-4267-b49a-6e1a0537af81.sql |
| Admins can read verify-documents | SELECT | authenticated | `bucket_id = 'verify-documents' AND (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()))` | `—` | 20260713093619_2fceb566-b1c0-4267-b49a-6e1a0537af81.sql |
| Admins can update lecture flyers | UPDATE | public | `bucket_id = 'lecture-flyers' AND is_admin(auth.uid())` | `—` | 20260118133501_7006026d-550d-4f45-9a41-27992f889dbc.sql |
| Admins can update team photos | UPDATE | public | `bucket_id = 'team-photos' AND public.is_admin(auth.uid())` | `—` | 20260304040040_9dd609fd-1039-4b8d-8fa4-15fc9c55f723.sql |
| Admins can update verify-documents | UPDATE | authenticated | `bucket_id = 'verify-documents' AND (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()))` | `—` | 20260713093619_2fceb566-b1c0-4267-b49a-6e1a0537af81.sql |
| Admins can upload lecture flyers | INSERT | public | `—` | `bucket_id = 'lecture-flyers' AND is_admin(auth.uid())` | 20260118133501_7006026d-550d-4f45-9a41-27992f889dbc.sql |
| Admins can upload team photos | INSERT | public | `—` | `bucket_id = 'team-photos' AND public.is_admin(auth.uid())` | 20260304040040_9dd609fd-1039-4b8d-8fa4-15fc9c55f723.sql |
| Admins can upload verify-documents | INSERT | authenticated | `—` | `bucket_id = 'verify-documents' AND (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()))` | 20260713093619_2fceb566-b1c0-4267-b49a-6e1a0537af81.sql |
| Authenticated users can upload assignment files | INSERT | public | `—` | `bucket_id = 'assignments' AND auth.role() = 'authenticated'` | 20260321043930_6a482c21-ac81-454a-91fa-512c1ec59353.sql |
| Authenticated users can upload message attachments | INSERT | public | `—` | `bucket_id = 'message-attachments' AND auth.role() = 'authenticated'` | 20260317101232_9b9c4932-82a1-4757-9689-ceee6fd08909.sql |
| Authenticated users can view assignment files | SELECT | public | `bucket_id = 'assignments' AND auth.role() = 'authenticated'` | `—` | 20260321043930_6a482c21-ac81-454a-91fa-512c1ec59353.sql |
| Authenticated users can view own message attachments | SELECT | authenticated | `bucket_id = 'message-attachments' AND ( (auth.uid())::text = (storage.foldername(name))[1] OR is_admin(auth.uid()) )` | `—` | 20260602105308_e31b8363-704d-4bac-a594-2eadd5de8d54.sql |
| Avatar images are publicly accessible | SELECT | public | `bucket_id = 'avatars'` | `—` | 20260118161949_00903402-8019-4568-a984-1bb7415af364.sql |
| Faculty can view submission files | SELECT | public | `bucket_id = 'submissions' AND (is_admin(auth.uid()) OR is_faculty(auth.uid()))` | `—` | 20260321043930_6a482c21-ac81-454a-91fa-512c1ec59353.sql |
| Public can view lecture flyers | SELECT | public | `bucket_id = 'lecture-flyers'` | `—` | 20260118133501_7006026d-550d-4f45-9a41-27992f889dbc.sql |
| Students can upload submission files | INSERT | public | `—` | `bucket_id = 'submissions' AND auth.uid()::text = (storage.foldername(name))[1]` | 20260321043930_6a482c21-ac81-454a-91fa-512c1ec59353.sql |
| Students can view own submission files | SELECT | public | `bucket_id = 'submissions' AND auth.uid()::text = (storage.foldername(name))[1]` | `—` | 20260321043930_6a482c21-ac81-454a-91fa-512c1ec59353.sql |
| Team photos publicly readable | SELECT | public | `bucket_id = 'team-photos'` | `—` | 20260304040040_9dd609fd-1039-4b8d-8fa4-15fc9c55f723.sql |
| Users can delete own message attachments | DELETE | public | `bucket_id = 'message-attachments' AND auth.uid()::text = (storage.foldername(name))[1]` | `—` | 20260317101232_9b9c4932-82a1-4757-9689-ceee6fd08909.sql |
| Users can delete their own avatar | DELETE | public | `bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]` | `—` | 20260118161949_00903402-8019-4568-a984-1bb7415af364.sql |
| Users can update their own avatar | UPDATE | public | `bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]` | `—` | 20260118161949_00903402-8019-4568-a984-1bb7415af364.sql |
| Users can upload their own avatar | INSERT | public | `—` | `bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]` | 20260118161949_00903402-8019-4568-a984-1bb7415af364.sql |
| Users can view own documents or admins | SELECT | authenticated | `bucket_id = 'documents' AND ( (auth.uid())::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid()) )` | `—` | 20260627091619_c213b242-dccb-43b7-a061-6a70c8f0eddc.sql |
| super_admin manage landing-assets | ALL | authenticated | `bucket_id = 'lecture-flyers' AND (storage.foldername(name))[1] = 'landing' AND public.is_super_admin(auth.uid())` | `bucket_id = 'lecture-flyers' AND (storage.foldername(name))[1] = 'landing' AND public.is_super_admin(auth.uid())` | 20260611134223_5ab5a570-b28e-45e2-a557-d096afd1613b.sql |

