import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface IncomingRow {
  row_number: number;
  full_name: string;
  enrollment_no: string;
  programme_code: string | null;
  programme_name: string | null;
  college_name: string | null;
  gender: string | null;
  guardian_name: string | null;
  mobile: string | null;
  email: string;
  roll_no: string | null;
  admission_no: string | null;
  category: string | null;
  enrollment_status: string | null;
  erp_student_id: string | null;
  validity_start: string | null;
  validity_end: string | null;
  discipline_raw: string | null;
  department_name: string | null;
  errors: string[];
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const DEFAULT_STUDENT_PASSWORD = "student@123";
const defaultPassword = (_enr: string) => DEFAULT_STUDENT_PASSWORD;

function log(step: string, details?: unknown) {
  try {
    console.log(`[erp-sync] ${step}`, details !== undefined ? JSON.stringify(details) : "");
  } catch {
    console.log(`[erp-sync] ${step}`);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(step: string, message: string, extra: Record<string, unknown> = {}, status = 500) {
  log(`ERROR at ${step}`, { message, ...extra });
  return json({ success: false, step, error: message, ...extra }, status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let currentStep = "init";
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return errorResponse("auth", "Missing bearer token", {}, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    currentStep = "verify_auth";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return errorResponse("verify_auth", claimsErr?.message ?? "Invalid token", {}, 401);
    const userId = claimsData.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    currentStep = "check_role";
    const { data: roles, error: roleErr } = await admin
      .from("user_roles").select("role, college_id").eq("user_id", userId);
    if (roleErr) return errorResponse("check_role", roleErr.message);
    const adminRole = roles?.find((r) => r.role === "admin" || r.role === "super_admin");
    if (!adminRole) return errorResponse("check_role", "Admin role required", {}, 403);
    const collegeId = adminRole.college_id;
    if (!collegeId) return errorResponse("check_role", "Admin has no college assignment", {}, 400);

    const body = await req.json();
    const step = body.step as "start" | "commit_chunk" | "finalize" | "commit";
    log("STEP_RECEIVED", { step });

    // ============ START ============
    if (step === "start") {
      currentStep = "create_batch";
      const { data: batch, error } = await admin.from("erp_import_batches").insert({
        college_id: collegeId, admin_id: userId, filename: body.filename ?? null, status: "pending",
      }).select().single();
      if (error) return errorResponse("create_batch", error.message);
      log("STEP 1: batch created", { batch_id: batch.id });
      return json({ success: true, batch });
    }

    // ============ COMMIT_CHUNK ============
    if (step === "commit_chunk" || step === "commit") {
      const batchId = body.batch_id as string;
      const rows = (body.rows ?? []) as IncomingRow[];
      const isFirstChunk = body.is_first_chunk !== false;

      if (!batchId) return errorResponse("validate_input", "batch_id required", {}, 400);
      if (!Array.isArray(rows)) return errorResponse("validate_input", "rows must be array", {}, 400);
      if (rows.length === 0) return json({ success: true, summary: emptyChunkSummary() });

      log("STEP 2: chunk received", { batchId, count: rows.length, isFirstChunk });

      if (isFirstChunk) {
        await admin.from("erp_import_batches")
          .update({ status: "committing", full_replacement: body.full_replacement !== false })
          .eq("id", batchId);
      }

      // ============ STEP 3: dedup + validate within chunk ============
      currentStep = "validate_rows";
      const validRows: IncomingRow[] = [];
      const invalidRows: IncomingRow[] = [];
      const seenInChunk = new Set<string>();
      const dupRows: IncomingRow[] = [];
      for (const r of rows) {
        if (r.errors && r.errors.length > 0) { invalidRows.push(r); continue; }
        if (!r.enrollment_no || !r.email) {
          invalidRows.push({ ...r, errors: ["Missing enrollment_no or email"] });
          continue;
        }
        const k = r.enrollment_no.trim().toLowerCase();
        if (seenInChunk.has(k)) { dupRows.push(r); continue; }
        seenInChunk.add(k);
        validRows.push(r);
      }
      log("STEP 3: validated", { valid: validRows.length, invalid: invalidRows.length, duplicate: dupRows.length });

      // log invalid + dup
      const errInserts = [
        ...invalidRows.map((r) => ({
          batch_id: batchId, college_id: collegeId, row_number: r.row_number,
          reason: (r.errors ?? ["invalid"]).join("; "), raw_data: r as unknown as Record<string, unknown>,
        })),
        ...dupRows.map((r) => ({
          batch_id: batchId, college_id: collegeId, row_number: r.row_number,
          reason: "Duplicate enrollment_no in chunk", raw_data: r as unknown as Record<string, unknown>,
        })),
      ];
      if (errInserts.length > 0) {
        const { error: e } = await admin.from("erp_import_errors").insert(errInserts);
        if (e) log("WARN: error log insert failed", e.message);
      }

      // ============ STEP 4: departments ============
      currentStep = "departments";
      const deptNames = Array.from(new Set(
        validRows.map((r) => r.department_name).filter((x): x is string => !!x && x.trim().length > 0)
      ));
      const deptMap = new Map<string, string>();
      if (deptNames.length > 0) {
        const { data: existingDepts, error: dE } = await admin.from("departments")
          .select("id, normalized_name").eq("college_id", collegeId);
        if (dE) return errorResponse("departments_select", dE.message);
        existingDepts?.forEach((d) => deptMap.set(d.normalized_name, d.id));
        const toInsert = deptNames.filter((n) => !deptMap.has(norm(n)))
          .map((n) => ({ college_id: collegeId, name: n, normalized_name: norm(n) }));
        if (toInsert.length > 0) {
          const { data: ins, error: iE } = await admin.from("departments")
            .upsert(toInsert, { onConflict: "college_id,normalized_name", ignoreDuplicates: true })
            .select("id, normalized_name");
          if (iE) return errorResponse("departments_insert", iE.message);
          ins?.forEach((d) => deptMap.set(d.normalized_name, d.id));
          // re-read any that conflicted silently
          const { data: refetch } = await admin.from("departments")
            .select("id, normalized_name").eq("college_id", collegeId)
            .in("normalized_name", deptNames.map(norm));
          refetch?.forEach((d) => deptMap.set(d.normalized_name, d.id));
        }
      }
      log("STEP 4: departments ready", { count: deptMap.size });

      // ============ STEP 5: programmes ============
      currentStep = "programmes";
      const progKeys = new Map<string, { code: string; name: string; deptId: string | null }>();
      validRows.forEach((r) => {
        if (!r.programme_code) return;
        const key = r.programme_code.trim();
        if (progKeys.has(key)) return;
        const deptId = r.department_name ? deptMap.get(norm(r.department_name)) ?? null : null;
        progKeys.set(key, { code: key, name: r.programme_name ?? key, deptId });
      });
      const progMap = new Map<string, string>();
      if (progKeys.size > 0) {
        const codes = Array.from(progKeys.keys());
        const { data: existingProgs, error: pSE } = await admin.from("programmes")
          .select("id, programme_code").eq("college_id", collegeId).in("programme_code", codes);
        if (pSE) return errorResponse("programmes_select", pSE.message);
        existingProgs?.forEach((p) => p.programme_code && progMap.set(p.programme_code, p.id));
        const toInsert = Array.from(progKeys.values()).filter((p) => !progMap.has(p.code))
          .map((p) => ({
            college_id: collegeId, department_id: p.deptId, programme_code: p.code,
            name: p.name, is_active: true, created_by: userId,
          }));
        if (toInsert.length > 0) {
          const { data: ins, error: pIE } = await admin.from("programmes").insert(toInsert)
            .select("id, programme_code");
          if (pIE) {
            // refetch in case of race / existing
            const { data: refetch } = await admin.from("programmes")
              .select("id, programme_code").eq("college_id", collegeId).in("programme_code", codes);
            refetch?.forEach((p) => p.programme_code && progMap.set(p.programme_code, p.id));
            log("WARN: programmes insert partial", pIE.message);
          } else {
            ins?.forEach((p) => p.programme_code && progMap.set(p.programme_code, p.id));
          }
        }
      }
      log("STEP 5: programmes ready", { count: progMap.size });

      // ============ STEP 6: existing students by enrollment_no in this chunk ============
      currentStep = "existing_lookup";
      const enrList = validRows.map((r) => r.enrollment_no.trim());
      const { data: existing, error: exErr } = await admin.from("profiles")
        .select("user_id, enrollment_no, email")
        .eq("college_id", collegeId)
        .in("enrollment_no", enrList);
      if (exErr) return errorResponse("existing_lookup", exErr.message);
      const existingByEnr = new Map<string, { user_id: string; email: string | null }>();
      existing?.forEach((p) => p.enrollment_no && existingByEnr.set(p.enrollment_no.trim().toLowerCase(), p));

      // also map emails for fallback when auth user already exists for new enrollment_no
      const emailList = validRows.map((r) => r.email.trim().toLowerCase());
      const { data: byEmail } = await admin.from("profiles")
        .select("user_id, email").in("email", emailList);
      const existingByEmail = new Map<string, string>();
      byEmail?.forEach((p) => p.email && existingByEmail.set(p.email.trim().toLowerCase(), p.user_id));

      // ============ STEP 7: process students ============
      currentStep = "students";
      let createdCount = 0, updatedCount = 0, failedCount = 0;
      const seenEnrInChunk: string[] = [];
      const createdUserIds: string[] = [];
      const errorPayload: Array<{ row_number: number; reason: string; raw: IncomingRow }> = [];

      for (const r of validRows) {
        const enrKey = r.enrollment_no.trim().toLowerCase();
        seenEnrInChunk.push(enrKey);
        const programmeId = r.programme_code ? progMap.get(r.programme_code.trim()) ?? null : null;
        const departmentId = r.department_name ? deptMap.get(norm(r.department_name)) ?? null : null;

        const baseFields = {
          college_id: collegeId, name: r.full_name, email: r.email,
          phone: r.mobile, mobile: r.mobile, student_id: r.enrollment_no,
          enrollment_no: r.enrollment_no, roll_no: r.roll_no, admission_no: r.admission_no,
          erp_student_id: r.erp_student_id, gender: r.gender, guardian_name: r.guardian_name,
          category: r.category, enrollment_status: r.enrollment_status,
          validity_start: r.validity_start, validity_end: r.validity_end,
          department: r.department_name, department_id: departmentId, programme_id: programmeId,
          is_active: true, archived_at: null as string | null,
        };

        try {
          const existingUserId = existingByEnr.get(enrKey)?.user_id
            ?? existingByEmail.get(r.email.trim().toLowerCase())
            ?? null;

          if (existingUserId) {
            const { error: upErr } = await admin.from("profiles").update(baseFields).eq("user_id", existingUserId);
            if (upErr) throw upErr;
            updatedCount++;
          } else {
            const { data: created, error: createErr } = await admin.auth.admin.createUser({
              email: r.email,
              password: defaultPassword(r.enrollment_no),
              email_confirm: true,
              user_metadata: { name: r.full_name, enrollment_no: r.enrollment_no, source: "erp" },
            });

            let newUserId: string | null = created?.user?.id ?? null;
            let wasFreshCreate = !!created?.user?.id;
            if (createErr || !newUserId) {
              const msg = createErr?.message ?? "auth create failed";
              if (/registered|exists|already/i.test(msg)) {
                const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
                const found = list?.users?.find((u) => (u.email ?? "").toLowerCase() === r.email.trim().toLowerCase());
                if (found) { newUserId = found.id; wasFreshCreate = false; }
              }
              if (!newUserId) throw new Error(msg);
            }

            const { error: profErr } = await admin.from("profiles").upsert({
              user_id: newUserId, ...baseFields,
              must_change_password: true, onboarding_completed: false, profile_completed: false,
            }, { onConflict: "user_id" });
            if (profErr) throw profErr;

            await admin.from("user_roles").upsert(
              { user_id: newUserId, role: "student", college_id: collegeId },
              { onConflict: "user_id,role", ignoreDuplicates: true }
            );

            if (programmeId) {
              await admin.from("student_programme_allotments").upsert(
                { student_user_id: newUserId, programme_id: programmeId, allotted_by: userId },
                { onConflict: "student_user_id,programme_id", ignoreDuplicates: true }
              );
            }
            createdCount++;
            if (wasFreshCreate) createdUserIds.push(newUserId);
          }
        } catch (err) {
          failedCount++;
          const reason = err instanceof Error ? err.message : "unknown error";
          log("ROW_FAIL", { row: r.row_number, enr: r.enrollment_no, reason });
          errorPayload.push({ row_number: r.row_number, reason, raw: r });
        }
      }

      if (errorPayload.length > 0) {
        await admin.from("erp_import_errors").insert(errorPayload.map((e) => ({
          batch_id: batchId, college_id: collegeId, row_number: e.row_number,
          reason: e.reason, raw_data: e.raw as unknown as Record<string, unknown>,
        })));
      }

      // increment running tallies on the batch
      currentStep = "update_batch_tally";
      const { data: cur } = await admin.from("erp_import_batches")
        .select("total_records,valid_count,invalid_count,duplicate_count,created_count,updated_count,failed_count,seen_enrollments,created_user_ids")
        .eq("id", batchId).single();

      const prevSeen: string[] = (cur as { seen_enrollments?: string[] } | null)?.seen_enrollments ?? [];
      const nextSeen = Array.from(new Set([...prevSeen, ...seenEnrInChunk]));
      const prevCreated: string[] = (cur as { created_user_ids?: string[] } | null)?.created_user_ids ?? [];
      const nextCreated = Array.from(new Set([...prevCreated, ...createdUserIds]));

      await admin.from("erp_import_batches").update({
        total_records: (cur?.total_records ?? 0) + rows.length,
        valid_count: (cur?.valid_count ?? 0) + validRows.length,
        invalid_count: (cur?.invalid_count ?? 0) + invalidRows.length,
        duplicate_count: (cur?.duplicate_count ?? 0) + dupRows.length,
        created_count: (cur?.created_count ?? 0) + createdCount,
        updated_count: (cur?.updated_count ?? 0) + updatedCount,
        failed_count: (cur?.failed_count ?? 0) + failedCount,
        seen_enrollments: nextSeen,
        created_user_ids: nextCreated,
      }).eq("id", batchId);

      log("CHUNK_DONE", { createdCount, updatedCount, failedCount });

      const summary = {
        chunk_total: rows.length,
        valid_count: validRows.length,
        invalid_count: invalidRows.length,
        duplicate_count: dupRows.length,
        created_count: createdCount,
        updated_count: updatedCount,
        failed_count: failedCount,
      };

      // legacy "commit" path: also archive + finalize in same call (small files only)
      if (step === "commit") {
        const fin = await finalizeBatch(admin, batchId, collegeId, body.full_replacement !== false, nextSeen);
        return json({ success: true, summary: fin });
      }
      return json({ success: true, summary });
    }

    // ============ FINALIZE ============
    if (step === "finalize") {
      const batchId = body.batch_id as string;
      const fullReplacement = body.full_replacement !== false;
      if (!batchId) return errorResponse("validate_input", "batch_id required", {}, 400);
      const { data: cur } = await admin.from("erp_import_batches")
        .select("seen_enrollments").eq("id", batchId).single();
      const seen: string[] = (cur as { seen_enrollments?: string[] } | null)?.seen_enrollments ?? [];
      const fin = await finalizeBatch(admin, batchId, collegeId, fullReplacement, seen);
      return json({ success: true, summary: fin });
    }

    return errorResponse("unknown_step", `Unknown step: ${step}`, {}, 400);
  } catch (err) {
    const stack = err instanceof Error ? err.stack : undefined;
    return errorResponse(currentStep, err instanceof Error ? err.message : "unknown", { stack });
  }
});

function emptyChunkSummary() {
  return { chunk_total: 0, valid_count: 0, invalid_count: 0, duplicate_count: 0, created_count: 0, updated_count: 0, failed_count: 0 };
}

async function finalizeBatch(
  admin: ReturnType<typeof createClient>,
  batchId: string,
  collegeId: string,
  fullReplacement: boolean,
  seenEnrollments: string[],
) {
  log("STEP 8: finalize start", { batchId, fullReplacement, seenCount: seenEnrollments.length });
  let archivedCount = 0;
  if (fullReplacement) {
    const { data: allStudents, error: lE } = await admin.from("profiles")
      .select("user_id, enrollment_no")
      .eq("college_id", collegeId)
      .not("enrollment_no", "is", null)
      .eq("is_active", true);
    if (lE) {
      log("ERROR: archive lookup", lE.message);
    } else {
      const seenSet = new Set(seenEnrollments.map((e) => e.toLowerCase()));
      const toArchive = (allStudents ?? [])
        .filter((p) => p.enrollment_no && !seenSet.has(p.enrollment_no.trim().toLowerCase()))
        .map((p) => p.user_id);
      if (toArchive.length > 0) {
        // chunk archive updates
        const CHUNK = 200;
        for (let i = 0; i < toArchive.length; i += CHUNK) {
          const slice = toArchive.slice(i, i + CHUNK);
          const { error: aE } = await admin.from("profiles")
            .update({ is_active: false, archived_at: new Date().toISOString() })
            .in("user_id", slice);
          if (!aE) archivedCount += slice.length;
          else log("WARN: archive chunk failed", aE.message);
        }
      }
    }
  }

  const { data: cur } = await admin.from("erp_import_batches")
    .select("total_records,valid_count,invalid_count,duplicate_count,created_count,updated_count,failed_count")
    .eq("id", batchId).single();

  const summary = {
    total_records: cur?.total_records ?? 0,
    valid_count: cur?.valid_count ?? 0,
    invalid_count: cur?.invalid_count ?? 0,
    duplicate_count: cur?.duplicate_count ?? 0,
    created_count: cur?.created_count ?? 0,
    updated_count: cur?.updated_count ?? 0,
    archived_count: archivedCount,
    failed_count: cur?.failed_count ?? 0,
    status: "completed" as const,
    completed_at: new Date().toISOString(),
  };
  await admin.from("erp_import_batches").update(summary).eq("id", batchId);
  log("STEP 9: finalize complete", summary);
  return summary;
}
