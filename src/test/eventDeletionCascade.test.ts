import { describe, it, expect, vi } from "vitest";
import { extractEventStoragePath } from "@/pages/admin/events/AdminEventsTab";
import * as fs from "fs";
import * as path from "path";

describe("Event Deletion Lifecycle & Cascade Verification", () => {
  describe("1. Database Migration Audit Verification", () => {
    it("migration enforces ON DELETE CASCADE for stall_registrations.event_id", () => {
      const migrationPath = path.resolve(
        __dirname,
        "../../supabase/migrations/20260906010000_event_deletion_cascade_cleanup.sql"
      );
      expect(fs.existsSync(migrationPath)).toBe(true);

      const migrationContent = fs.readFileSync(migrationPath, "utf-8");

      // Verify foreign key cascade constraint on stall_registrations
      expect(migrationContent).toContain("stall_registrations_event_id_fkey");
      expect(migrationContent).toMatch(
        /FOREIGN\s+KEY\s*\(\s*event_id\s*\)\s*REFERENCES\s+public\.events\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i
      );

      // Verify audit documentation for Category A vs Category B
      expect(migrationContent).toContain("Category A (Event-owned child data)");
      expect(migrationContent).toContain("Category B (Shared / Student-owned history)");
      expect(migrationContent).toContain("point_claims.event_id");

      // Verify index creation for cascade performance
      expect(migrationContent).toContain("idx_stall_registrations_event_id");
    });

    it("migration provides secure delete_event_cascade function with admin authorization", () => {
      const migrationPath = path.resolve(
        __dirname,
        "../../supabase/migrations/20260906010000_event_deletion_cascade_cleanup.sql"
      );
      const migrationContent = fs.readFileSync(migrationPath, "utf-8");

      // Verifies security definer and search_path
      expect(migrationContent).toContain("CREATE OR REPLACE FUNCTION public.delete_event_cascade");
      expect(migrationContent).toContain("SECURITY DEFINER");
      expect(migrationContent).toContain("SET search_path = public");

      // Verifies admin / super admin privilege check
      expect(migrationContent).toContain("public.is_super_admin(v_caller)");
      expect(migrationContent).toContain("public.is_admin(v_caller)");
      expect(migrationContent).toContain("Unauthorized: Only administrators may delete events.");

      // Verifies flyer URLs collection for safe storage cleanup
      expect(migrationContent).toContain("v_flyer_urls");
      expect(migrationContent).toContain("deleted_stalls_count");
    });
  });

  describe("2. Safe Event-Owned Storage Cleanup", () => {
    it("extracts valid event storage paths accurately", () => {
      const validUrl1 =
        "https://xyz.supabase.co/storage/v1/object/public/lecture-flyers/events/174123456-uuid1.webp";
      expect(extractEventStoragePath(validUrl1)).toBe("events/174123456-uuid1.webp");

      const validUrl2 =
        "/storage/v1/object/public/lecture-flyers/events/banner-2026.png?v=123#hash";
      expect(extractEventStoragePath(validUrl2)).toBe("events/banner-2026.png");
    });

    it("rejects URLs from other buckets or folders to protect shared assets", () => {
      // Must not delete files from other buckets
      expect(
        extractEventStoragePath("https://xyz.supabase.co/storage/v1/object/public/profile-avatars/user1.jpg")
      ).toBeNull();

      // Must not delete files outside the events/ subfolder in lecture-flyers
      expect(
        extractEventStoragePath("https://xyz.supabase.co/storage/v1/object/public/lecture-flyers/lectures/notes.pdf")
      ).toBeNull();

      // Directory traversal protection
      expect(
        extractEventStoragePath("https://xyz.supabase.co/storage/v1/object/public/lecture-flyers/events/../root.key")
      ).toBeNull();

      // Null, undefined, empty inputs
      expect(extractEventStoragePath(null)).toBeNull();
      expect(extractEventStoragePath(undefined)).toBeNull();
      expect(extractEventStoragePath("   ")).toBeNull();
    });
  });

  describe("3. Admin Delete Confirmation Dialog Requirements", () => {
    it("AdminEventsTab has explicit confirmation dialog with required deletion details", () => {
      const adminEventsPath = path.resolve(
        __dirname,
        "../pages/admin/events/AdminEventsTab.tsx"
      );
      const content = fs.readFileSync(adminEventsPath, "utf-8");

      // Verify AlertDialog usage instead of silent deletion or browser confirm
      expect(content).toContain("<AlertDialog");
      expect(content).toContain("Delete Event?");
      expect(content).toContain("will permanently remove:");
      expect(content).toContain("Event details & public page");
      expect(content).toContain("All stall registrations & student team submissions");
      expect(content).toContain("Event flyer and banner files");
      expect(content).toContain("This action cannot be undone");
      expect(content).toContain("Cancel");
      expect(content).toContain("Delete Event");
    });

    it("AdminEventsTab invalidates all related caches on event deletion", () => {
      const adminEventsPath = path.resolve(
        __dirname,
        "../pages/admin/events/AdminEventsTab.tsx"
      );
      const content = fs.readFileSync(adminEventsPath, "utf-8");

      // Ensure cache keys are invalidated
      expect(content).toContain('qc.invalidateQueries({ queryKey: ["admin", "events"] });');
      expect(content).toContain('qc.invalidateQueries({ queryKey: ["admin", "stalls"] });');
      expect(content).toContain('qc.invalidateQueries({ queryKey: ["student", "events"] });');
      expect(content).toContain('qc.invalidateQueries({ queryKey: ["event", "detail"] });');
      expect(content).toContain('qc.invalidateQueries({ queryKey: ["ecell", "user_stalls"] });');
      expect(content).toContain('qc.removeQueries({ queryKey: ["event", "detail", target.id] });');
    });
  });

  describe("4. Deep Links After Event Deletion", () => {
    it("EventDetailPage renders PremiumEmpty Event Not Found when event is null/deleted", () => {
      const detailPagePath = path.resolve(
        __dirname,
        "../pages/events/EventDetailPage.tsx"
      );
      const content = fs.readFileSync(detailPagePath, "utf-8");

      expect(content).toContain("Event Not Found");
      expect(content).toContain(
        "This event may have been removed or the link might be incorrect."
      );
      expect(content).toContain("Browse Campus Events");
    });
  });
});
