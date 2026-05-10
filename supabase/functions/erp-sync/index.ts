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

function defaultPassword(enr: string) {
  return `${enr}@123`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // verify admin role
    const { data: roles, error: roleErr } = await admin
      .from("user_roles")
      .select("role, college_id")
      .eq("user_id", userId);
    if (roleErr) return json({ error: roleErr.message }, 500);
    const adminRole = roles?.find((r) => r.role === "admin" || r.role === "super_admin");
    if (!adminRole) return json({ error: "Admin role required" }, 403);
    const collegeId = adminRole.college_id;
    if (!collegeId) return json({ error: "Admin has no college assignment" }, 400);

    const body = await req.json();
    const step = body.step as "start" | "commit";

    if (step === "start") {
      const { data: batch, error } = await admin
        .from("erp_import_batches")
        .insert({
          college_id: collegeId,
          admin_id: userId,
          filename: body.filename ?? null,
          status: "pending",
        })
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({ batch });
    }

    if (step === "commit") {
      const batchId = body.batch_id as string;
      const rows = (body.rows ?? []) as IncomingRow[];
      const fullReplacement = body.full_replacement !== false;

      if (!batchId) return json({ error: "batch_id required" }, 400);
      if (!Array.isArray(rows)) return json({ error: "rows must be array" }, 400);

      await admin.from("erp_import_batches").update({
        status: "committing",
        total_records: rows.length,
        full_replacement: fullReplacement,
      }).eq("id", batchId);

      const validRows = rows.filter((r) => r.errors.length === 0);
      const invalidRows = rows.filter((r) => r.errors.length > 0);

      // dedup within file by enrollment_no
      const seenEnr = new Set<string>();
      const dupRows: IncomingRow[] = [];
      const uniqueRows: IncomingRow[] = [];
      for (const r of validRows) {
        const key = r.enrollment_no.trim().toLowerCase();
        if (seenEnr.has(key)) {
          dupRows.push(r);
        } else {
          seenEnr.add(key);
          uniqueRows.push(r);
        }
      }

      // log invalid + dup errors
      const errInserts = [
        ...invalidRows.map((r) => ({
          batch_id: batchId,
          college_id: collegeId,
          row_number: r.row_number,
          reason: r.errors.join("; "),
          raw_data: r as unknown as Record<string, unknown>,
        })),
        ...dupRows.map((r) => ({
          batch_id: batchId,
          college_id: collegeId,
          row_number: r.row_number,
          reason: "Duplicate enrollment_no in file",
          raw_data: r as unknown as Record<string, unknown>,
        })),
      ];
      if (errInserts.length > 0) {
        await admin.from("erp_import_errors").insert(errInserts);
      }

      // ============ DEPARTMENTS ============
      const deptNames = Array.from(
        new Set(uniqueRows.map((r) => r.department_name).filter((x): x is string => !!x))
      );
      const deptMap = new Map<string, string>(); // normalized -> id
      if (deptNames.length > 0) {
        const { data: existingDepts } = await admin
          .from("departments")
          .select("id, normalized_name")
          .eq("college_id", collegeId);
        existingDepts?.forEach((d) => deptMap.set(d.normalized_name, d.id));

        const toInsert = deptNames
          .filter((n) => !deptMap.has(norm(n)))
          .map((n) => ({ college_id: collegeId, name: n, normalized_name: norm(n) }));

        if (toInsert.length > 0) {
          const { data: ins, error: dErr } = await admin
            .from("departments")
            .insert(toInsert)
            .select("id, normalized_name");
          if (dErr) return json({ error: `dept insert: ${dErr.message}` }, 500);
          ins?.forEach((d) => deptMap.set(d.normalized_name, d.id));
        }
      }

      // ============ PROGRAMMES ============
      const programmeKeys = new Map<string, { code: string; name: string; deptId: string | null }>();
      uniqueRows.forEach((r) => {
        if (!r.programme_code) return;
        const key = r.programme_code.trim();
        if (programmeKeys.has(key)) return;
        const deptId = r.department_name ? deptMap.get(norm(r.department_name)) ?? null : null;
        programmeKeys.set(key, {
          code: key,
          name: r.programme_name ?? key,
          deptId,
        });
      });

      const progMap = new Map<string, string>(); // code -> id
      if (programmeKeys.size > 0) {
        const codes = Array.from(programmeKeys.keys());
        const { data: existingProgs } = await admin
          .from("programmes")
          .select("id, programme_code")
          .eq("college_id", collegeId)
          .in("programme_code", codes);
        existingProgs?.forEach((p) => p.programme_code && progMap.set(p.programme_code, p.id));

        const toInsert = Array.from(programmeKeys.values())
          .filter((p) => !progMap.has(p.code))
          .map((p) => ({
            college_id: collegeId,
            department_id: p.deptId,
            programme_code: p.code,
            name: p.name,
            is_active: true,
            created_by: userId,
          }));
        if (toInsert.length > 0) {
          const { data: ins, error: pErr } = await admin
            .from("programmes")
            .insert(toInsert)
            .select("id, programme_code");
          if (pErr) return json({ error: `prog insert: ${pErr.message}` }, 500);
          ins?.forEach((p) => p.programme_code && progMap.set(p.programme_code, p.id));
        }
      }

      // ============ EXISTING STUDENTS ============
      const { data: existing } = await admin
        .from("profiles")
        .select("user_id, enrollment_no, email")
        .eq("college_id", collegeId)
        .not("enrollment_no", "is", null);

      const existingByEnr = new Map<string, { user_id: string; email: string | null }>();
      existing?.forEach((p) => {
        if (p.enrollment_no) existingByEnr.set(p.enrollment_no.trim().toLowerCase(), p);
      });

      let createdCount = 0;
      let updatedCount = 0;
      let failedCount = 0;
      const errorPayload: Array<{ row_number: number; reason: string; raw: IncomingRow }> = [];
      const seenEnrInBatch = new Set<string>();

      for (const r of uniqueRows) {
        const enrKey = r.enrollment_no.trim().toLowerCase();
        seenEnrInBatch.add(enrKey);
        const existingProfile = existingByEnr.get(enrKey);
        const programmeId = r.programme_code ? progMap.get(r.programme_code.trim()) ?? null : null;
        const departmentId = r.department_name ? deptMap.get(norm(r.department_name)) ?? null : null;

        const baseFields = {
          college_id: collegeId,
          name: r.full_name,
          email: r.email,
          phone: r.mobile,
          mobile: r.mobile,
          student_id: r.enrollment_no,
          enrollment_no: r.enrollment_no,
          roll_no: r.roll_no,
          admission_no: r.admission_no,
          erp_student_id: r.erp_student_id,
          gender: r.gender,
          guardian_name: r.guardian_name,
          category: r.category,
          enrollment_status: r.enrollment_status,
          validity_start: r.validity_start,
          validity_end: r.validity_end,
          department: r.department_name,
          department_id: departmentId,
          programme_id: programmeId,
          is_active: true,
          archived_at: null as string | null,
        };

        try {
          if (existingProfile) {
            const { error: upErr } = await admin
              .from("profiles")
              .update(baseFields)
              .eq("user_id", existingProfile.user_id);
            if (upErr) throw upErr;
            updatedCount++;
          } else {
            // create auth user
            const { data: created, error: createErr } = await admin.auth.admin.createUser({
              email: r.email,
              password: defaultPassword(r.enrollment_no),
              email_confirm: true,
              user_metadata: { name: r.full_name, enrollment_no: r.enrollment_no, source: "erp" },
            });
            if (createErr || !created.user) throw createErr ?? new Error("auth create failed");

            const newUserId = created.user.id;

            const { error: profErr } = await admin.from("profiles").insert({
              user_id: newUserId,
              ...baseFields,
              must_change_password: true,
              onboarding_completed: false,
              profile_completed: false,
            });
            if (profErr) {
              await admin.auth.admin.deleteUser(newUserId).catch(() => {});
              throw profErr;
            }

            await admin.from("user_roles").insert({
              user_id: newUserId,
              role: "student",
              college_id: collegeId,
            });

            if (programmeId) {
              await admin.from("student_programme_allotments").insert({
                student_user_id: newUserId,
                programme_id: programmeId,
                allotted_by: userId,
              });
            }
            createdCount++;
          }
        } catch (err) {
          failedCount++;
          const reason = err instanceof Error ? err.message : "unknown error";
          errorPayload.push({ row_number: r.row_number, reason, raw: r });
        }
      }

      if (errorPayload.length > 0) {
        await admin.from("erp_import_errors").insert(
          errorPayload.map((e) => ({
            batch_id: batchId,
            college_id: collegeId,
            row_number: e.row_number,
            reason: e.reason,
            raw_data: e.raw as unknown as Record<string, unknown>,
          }))
        );
      }

      // ============ ARCHIVE missing ============
      let archivedCount = 0;
      if (fullReplacement) {
        const toArchive = Array.from(existingByEnr.entries())
          .filter(([key]) => !seenEnrInBatch.has(key))
          .map(([, v]) => v.user_id);

        if (toArchive.length > 0) {
          const { error: arErr, count } = await admin
            .from("profiles")
            .update({ is_active: false, archived_at: new Date().toISOString() })
            .in("user_id", toArchive)
            .select("user_id", { count: "exact", head: true });
          if (!arErr) archivedCount = count ?? toArchive.length;
        }
      }

      const summary = {
        total_records: rows.length,
        valid_count: validRows.length,
        invalid_count: invalidRows.length,
        duplicate_count: dupRows.length,
        created_count: createdCount,
        updated_count: updatedCount,
        archived_count: archivedCount,
        failed_count: failedCount,
        status: "completed" as const,
        completed_at: new Date().toISOString(),
      };

      await admin.from("erp_import_batches").update(summary).eq("id", batchId);

      return json({ summary });
    }

    return json({ error: "unknown step" }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
