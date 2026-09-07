import { describe, it, expect, vi } from "vitest";
import { fetchApprovedStudentCount, invalidateStudentQueries } from "@/lib/student-queries";

describe("Student count and dashboard queries", () => {
  it("fetches approved student count via get_approved_student_count RPC when available", async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: 5, error: null });
    const mockSupabase = {
      rpc: mockRpc,
    } as any;

    const count = await fetchApprovedStudentCount(mockSupabase, "college-123");
    expect(count).toBe(5);
    expect(mockRpc).toHaveBeenCalledWith("get_approved_student_count", {
      p_college_id: "college-123",
    });
  });

  it("falls back to 2-stage query when RPC fails", async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: { message: "RPC error" } });

    const mockSelectProfiles = vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
        }),
      }),
    });

    const mockSelectRoles = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ user_id: "u1" }, { user_id: "u2" }, { user_id: "u3" }],
          error: null,
        }),
      }),
    });

    const mockSupabase = {
      rpc: mockRpc,
      from: vi.fn((table: string) => {
        if (table === "user_roles") {
          return { select: mockSelectRoles };
        }
        if (table === "profiles") {
          return { select: mockSelectProfiles };
        }
        return {};
      }),
    } as any;

    const count = await fetchApprovedStudentCount(mockSupabase, "college-123");
    expect(count).toBe(3);
  });

  it("returns 0 when no students exist", async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: 0, error: null });
    const mockSupabase = {
      rpc: mockRpc,
    } as any;

    const count = await fetchApprovedStudentCount(mockSupabase, "college-123");
    expect(count).toBe(0);
  });

  it("invalidates all student-related and dashboard queries", async () => {
    const mockInvalidateQueries = vi.fn().mockResolvedValue(undefined);
    const mockQc = {
      invalidateQueries: mockInvalidateQueries,
    } as any;

    await invalidateStudentQueries(mockQc);

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin", "students"] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin", "cc", "metrics"] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin", "student_count"] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["verification"] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin_overview"] });
  });
});
