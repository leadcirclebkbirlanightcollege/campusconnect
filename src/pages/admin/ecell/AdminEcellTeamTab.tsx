/**
 * AdminEcellTeamTab — Dynamic Core Member Management
 *
 * Provides complete administrative control over E-Cell leadership:
 * - Create Core Member (with option to pick existing Campus Connect user)
 * - Edit Member details (Name, Designation, Department/Class, Photo, Order)
 * - Delete Member (with confirmation dialog)
 * - Reorder Priority (instant Move Up / Move Down buttons)
 * - Visibility Toggle (instant active/inactive switch)
 * - Photo upload to `team-photos` storage bucket or avatar linkage
 */

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Search,
  CheckCircle2,
  XCircle,
  Upload,
  UserRound,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from "@/components/icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CoreMember {
  id: string;
  name: string;
  designation: string | null;
  class: string | null;
  photo_url: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

interface ProfileOption {
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  department: string | null;
  class_name: string | null;
}

export function AdminEcellTeamTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<CoreMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<CoreMember | null>(null);

  // Form state for add / edit
  const [formData, setFormData] = useState({
    name: "",
    designation: "",
    class: "",
    photo_url: "",
    order_index: 0,
    is_active: true,
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  // User search picker state
  const [userSearch, setUserSearch] = useState("");

  /* ── 1. Fetch All Core Members ────────────────────────────────── */
  const teamQuery = useQuery({
    queryKey: ["admin", "ecell-team"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("core_team_members")
        .select("id,name,designation,class,photo_url,order_index,is_active,created_at")
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as CoreMember[];
    },
  });

  /* ── 2. Fetch Profiles for Optional User Linkage ──────────────── */
  const profilesQuery = useQuery({
    queryKey: ["admin", "profiles-list", userSearch],
    enabled: addDialogOpen && userSearch.trim().length > 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id,name,email,avatar_url,department,class_name")
        .or(`name.ilike.%${userSearch}%,email.ilike.%${userSearch}%`)
        .limit(8);

      if (error) return [] as ProfileOption[];
      return (data ?? []) as ProfileOption[];
    },
    staleTime: 30_000,
  });

  /* ── 3. Save (Create or Update) Mutation ───────────────────────── */
  const saveMutation = useMutation({
    mutationFn: async (memberId?: string) => {
      if (!formData.name.trim()) throw new Error("Member name is required");

      const payload = {
        name: formData.name.trim(),
        designation: formData.designation.trim() || null,
        class: formData.class.trim() || null,
        photo_url: formData.photo_url.trim() || null,
        order_index: Number(formData.order_index) || 0,
        is_active: formData.is_active,
      };

      if (memberId) {
        const { error } = await supabase
          .from("core_team_members")
          .update(payload)
          .eq("id", memberId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("core_team_members")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, memberId) => {
      toast.success(memberId ? "Core Member updated" : "Core Member added to E-Cell");
      setAddDialogOpen(false);
      setEditingMember(null);
      resetForm();
      qc.invalidateQueries({ queryKey: ["admin", "ecell-team"] });
      qc.invalidateQueries({ queryKey: ["ecell", "team"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to save core member");
    },
  });

  /* ── 4. Delete Mutation ───────────────────────────────────────── */
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("core_team_members")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Core Member removed from E-Cell");
      setDeletingMember(null);
      qc.invalidateQueries({ queryKey: ["admin", "ecell-team"] });
      qc.invalidateQueries({ queryKey: ["ecell", "team"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete member");
    },
  });

  /* ── 5. Quick Toggle Active Mutation ──────────────────────────── */
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("core_team_members")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.is_active ? "Member visible on E-Cell" : "Member hidden from E-Cell");
      qc.invalidateQueries({ queryKey: ["admin", "ecell-team"] });
      qc.invalidateQueries({ queryKey: ["ecell", "team"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    },
  });

  /* ── 6. Reorder (Swap) Mutation ───────────────────────────────── */
  const reorderMutation = useMutation({
    mutationFn: async ({
      memberA,
      memberB,
    }: {
      memberA: { id: string; order_index: number };
      memberB: { id: string; order_index: number };
    }) => {
      const { error: errA } = await supabase
        .from("core_team_members")
        .update({ order_index: memberB.order_index })
        .eq("id", memberA.id);
      if (errA) throw errA;

      const { error: errB } = await supabase
        .from("core_team_members")
        .update({ order_index: memberA.order_index })
        .eq("id", memberB.id);
      if (errB) throw errB;
    },
    onSuccess: () => {
      toast.success("Display order updated");
      qc.invalidateQueries({ queryKey: ["admin", "ecell-team"] });
      qc.invalidateQueries({ queryKey: ["ecell", "team"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to reorder");
    },
  });

  /* ── Helper Functions ─────────────────────────────────────────── */
  function resetForm(nextOrder = 0) {
    setFormData({
      name: "",
      designation: "",
      class: "",
      photo_url: "",
      order_index: nextOrder,
      is_active: true,
    });
    setUserSearch("");
  }

  function handleOpenAdd() {
    const currentMax = (teamQuery.data ?? []).reduce(
      (max, m) => Math.max(max, m.order_index),
      0
    );
    resetForm(currentMax + 1);
    setAddDialogOpen(true);
  }

  function handleOpenEdit(m: CoreMember) {
    setEditingMember(m);
    setFormData({
      name: m.name,
      designation: m.designation || "",
      class: m.class || "",
      photo_url: m.photo_url || "",
      order_index: m.order_index,
      is_active: m.is_active,
    });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (PNG/JPG/WEBP)");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image file must be under 3MB");
      return;
    }

    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `core-team-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("team-photos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("team-photos")
        .getPublicUrl(fileName);

      setFormData((prev) => ({ ...prev, photo_url: publicData.publicUrl }));
      toast.success("Photo uploaded successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploadingImage(false);
    }
  }

  function handleSelectProfile(p: ProfileOption) {
    setFormData((prev) => ({
      ...prev,
      name: p.name,
      class: p.department || p.class_name || prev.class,
      photo_url: p.avatar_url || prev.photo_url,
    }));
    setUserSearch("");
    toast.info(`Linked details from ${p.name}`);
  }

  // Filtered members
  const members = useMemo(() => {
    let list = teamQuery.data ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.designation?.toLowerCase().includes(q) ||
          m.class?.toLowerCase().includes(q)
      );
    }
    if (statusFilter === "active") list = list.filter((m) => m.is_active);
    if (statusFilter === "inactive") list = list.filter((m) => !m.is_active);
    return list;
  }, [teamQuery.data, search, statusFilter]);

  return (
    <div className="space-y-5">
      {/* ── Header & Primary Action ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Users className="h-5 w-5 text-[#C08634]" />
            E-Cell Leadership & Core Team
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage the executive members displayed dynamically on the public E-Cell portal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenAdd}
            className="gap-1.5 bg-[#FCE541] hover:bg-[#FAD943] text-[#000000] border border-[#C08634]/50 font-bold shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Add Core Member
          </Button>
        </div>
      </div>

      {/* ── Search & Filter Controls ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All Members ({(teamQuery.data ?? []).length})</option>
            <option value="active">Active Only</option>
            <option value="inactive">Hidden / Inactive</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => teamQuery.refetch()}
            disabled={teamQuery.isFetching}
            className="h-9 px-3"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", teamQuery.isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* ── Loading Skeleton ─────────────────────────────────────── */}
      {teamQuery.isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Error State ─────────────────────────────────────────── */}
      {teamQuery.isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
          <AlertCircle className="h-7 w-7 text-destructive mx-auto" />
          <p className="text-sm font-semibold text-foreground">
            {teamQuery.error instanceof Error ? teamQuery.error.message : "Failed to load team"}
          </p>
          <Button variant="outline" size="sm" onClick={() => teamQuery.refetch()}>
            Try Again
          </Button>
        </div>
      )}

      {/* ── Empty State ─────────────────────────────────────────── */}
      {!teamQuery.isLoading && !teamQuery.isError && members.length === 0 && (
        <div className="rounded-2xl border border-border-subtle bg-card p-8 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Users className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-foreground">No Core Members Found</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {search
                ? "No members matched your search criteria."
                : "No leadership team members have been added to E-Cell yet. Click below to add the first member."}
            </p>
          </div>
          {!search && (
            <Button
              onClick={handleOpenAdd}
              size="sm"
              className="bg-[#FCE541] hover:bg-[#FAD943] text-[#000000] font-bold border border-[#C08634]/50"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Core Member
            </Button>
          )}
        </div>
      )}

      {/* ── Members Table / List ─────────────────────────────────── */}
      {!teamQuery.isLoading && !teamQuery.isError && members.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">Order</th>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Department / Class</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {members.map((m, idx) => {
                  const canMoveUp = idx > 0;
                  const canMoveDown = idx < members.length - 1;

                  return (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      {/* Reorder Buttons & Priority Index */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            disabled={!canMoveUp || reorderMutation.isPending}
                            onClick={() =>
                              reorderMutation.mutate({
                                memberA: m,
                                memberB: members[idx - 1],
                              })
                            }
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20"
                            title="Move Up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <span className="text-xs font-bold text-muted-foreground w-5 text-center">
                            {m.order_index}
                          </span>
                          <button
                            type="button"
                            disabled={!canMoveDown || reorderMutation.isPending}
                            onClick={() =>
                              reorderMutation.mutate({
                                memberA: m,
                                memberB: members[idx + 1],
                              })
                            }
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20"
                            title="Move Down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Member Photo & Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full overflow-hidden border border-[#E8D98A] bg-muted shrink-0 flex items-center justify-center">
                            {m.photo_url ? (
                              <img
                                src={m.photo_url}
                                alt={m.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <UserRound className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground truncate">{m.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              Added {new Date(m.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Designation */}
                      <td className="py-3 px-4 font-semibold text-[#C08634] dark:text-[#FAD943]">
                        {m.designation || "—"}
                      </td>

                      {/* Department / Class */}
                      <td className="py-3 px-4 text-muted-foreground">
                        {m.class || "—"}
                      </td>

                      {/* Active Status Switch */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-2">
                          <Switch
                            checked={m.is_active}
                            onCheckedChange={(checked) =>
                              toggleActiveMutation.mutate({ id: m.id, is_active: checked })
                            }
                          />
                          <span
                            className={cn(
                              "text-[11px] font-bold",
                              m.is_active
                                ? "text-success"
                                : "text-muted-foreground"
                            )}
                          >
                            {m.is_active ? "Active" : "Hidden"}
                          </span>
                        </div>
                      </td>

                      {/* Edit / Delete Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(m)}
                            className="h-8 w-8 p-0"
                            title="Edit Core Member"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingMember(m)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete Core Member"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Dialog: Add / Edit Core Member ───────────────────────── */}
      <Dialog
        open={addDialogOpen || !!editingMember}
        onOpenChange={(open) => {
          if (!open) {
            setAddDialogOpen(false);
            setEditingMember(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMember ? "Edit Core Member" : "Add E-Cell Core Member"}
            </DialogTitle>
            <DialogDescription>
              Provide leadership profile details. Active members appear immediately on the public E-Cell portal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Optional Link with Existing Campus Connect User */}
            {!editingMember && (
              <div className="rounded-xl border border-[#E8D98A]/70 bg-[#FAF9F7]/80 dark:bg-[#1D1B17] p-3 space-y-2">
                <Label className="text-xs font-bold text-[#593018] dark:text-[#D8C7A5] flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#C08634]" />
                  Link Existing Campus Connect Profile (Optional)
                </Label>
                <Input
                  placeholder="Type student name or email to auto-fill..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="h-8 text-xs"
                />
                {profilesQuery.isFetching && (
                  <p className="text-[11px] text-muted-foreground animate-pulse">
                    Searching registered users...
                  </p>
                )}
                {profilesQuery.data && profilesQuery.data.length > 0 && (
                  <div className="divide-y divide-border/60 rounded-lg border border-border bg-card max-h-36 overflow-y-auto">
                    {profilesQuery.data.map((p) => (
                      <button
                        key={p.user_id}
                        type="button"
                        onClick={() => handleSelectProfile(p)}
                        className="w-full text-left p-2 text-xs flex items-center justify-between hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-semibold truncate">{p.name}</span>
                        <span className="text-[10.5px] text-muted-foreground truncate">
                          {p.department || p.email}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Member Full Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Full Name *</Label>
              <Input
                placeholder="e.g. Rahul Sharma"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            {/* Designation / Role */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Designation / Role *</Label>
              <Input
                placeholder="e.g. Student President, Tech Lead, Coordinator"
                value={formData.designation}
                onChange={(e) => setFormData((p) => ({ ...p, designation: e.target.value }))}
              />
            </div>

            {/* Department / Course / Year */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Department / Class</Label>
              <Input
                placeholder="e.g. TY BSc IT, SY B.Com"
                value={formData.class}
                onChange={(e) => setFormData((p) => ({ ...p, class: e.target.value }))}
              />
            </div>

            {/* Photo Upload or URL */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Profile Photo</Label>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full overflow-hidden border border-[#E8D98A] bg-muted shrink-0 flex items-center justify-center">
                  {formData.photo_url ? (
                    <img
                      src={formData.photo_url}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserRound className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-muted hover:bg-muted/80 text-foreground cursor-pointer border border-border">
                    <Upload className="h-3.5 w-3.5" />
                    {uploadingImage ? "Uploading..." : "Upload Photo"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10.5px] text-muted-foreground">
                    PNG, JPG, or WEBP up to 3MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Display Order & Active Toggle */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Display Order</Label>
                <Input
                  type="number"
                  value={formData.order_index}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, order_index: parseInt(e.target.value, 10) || 0 }))
                  }
                />
              </div>

              <div className="flex flex-col justify-center space-y-1.5">
                <Label className="text-xs font-semibold">Public Visibility</Label>
                <div className="flex items-center gap-2 pt-1">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData((p) => ({ ...p, is_active: checked }))
                    }
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    {formData.is_active ? "Visible" : "Hidden"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                setEditingMember(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate(editingMember?.id)}
              disabled={saveMutation.isPending || !formData.name.trim()}
              className="bg-[#FCE541] hover:bg-[#FAD943] text-[#000000] font-bold border border-[#C08634]/50"
            >
              {saveMutation.isPending
                ? "Saving..."
                : editingMember
                ? "Update Member"
                : "Save Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirm Deletion ─────────────────────────────── */}
      <Dialog
        open={!!deletingMember}
        onOpenChange={(open) => !open && setDeletingMember(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Remove Core Member
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <strong className="text-foreground">{deletingMember?.name}</strong> from the E-Cell
              Core Team? This will immediately remove them from the public roster.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeletingMember(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingMember && deleteMutation.mutate(deletingMember.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Removing..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
