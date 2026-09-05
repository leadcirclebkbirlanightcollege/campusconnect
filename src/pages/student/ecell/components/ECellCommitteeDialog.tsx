/**
 * ECellCommitteeDialog — Instant In-Page Committee Sheet/Modal
 *
 * Opens directly when student clicks "Contact Volunteer" on the E-Cell hub.
 * Features the exact dynamic committee roster configured by Admin,
 * with contact triggers and a link to view the full page.
 */
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Users,
  Mail,
  UserRound,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from "@/components/icons";
import {
  ECellContactMemberModal,
  CommitteeContactTarget,
} from "./ECellContactMemberModal";
import { cn } from "@/lib/utils";

interface CommitteeMember {
  id: string;
  name: string;
  designation: string | null;
  department: string | null;
  class: string | null;
  bio: string | null;
  photo_url: string | null;
  contact_enabled: boolean;
  order_index: number;
  is_active: boolean;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ECellCommitteeDialog({ open, onOpenChange }: Props) {
  const [contactTarget, setContactTarget] = useState<CommitteeContactTarget | null>(null);

  const committeeQuery = useQuery({
    queryKey: ["ecell", "committee-dialog", "v1"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("core_team_members")
        .select(
          "id,name,designation,department,class,bio,photo_url,contact_enabled,order_index,is_active"
        )
        .eq("is_active", true)
        .order("order_index", { ascending: true });

      if (error) throw new Error(error.message);
      return (data ?? []) as CommitteeMember[];
    },
    staleTime: 60_000,
  });

  const members = committeeQuery.data ?? [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-[#E8D98A] dark:border-[#3D3523] p-5 sm:p-6">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3 pr-6">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FCE541] text-[#000000] border border-[#C08634]/50 shrink-0">
                  <Users className="h-5 w-5" />
                </span>
                <div>
                  <DialogTitle className="text-lg font-black text-foreground">
                    E-Cell Committee
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#593018] dark:text-[#D8C7A5] font-semibold">
                    Connect with the E-Cell team
                  </DialogDescription>
                </div>
              </div>

              <Link
                to="/app/ecell/committee"
                onClick={() => onOpenChange(false)}
                className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-[#C08634] hover:underline"
              >
                <span>Full Page</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </DialogHeader>

          {/* Loading */}
          {committeeQuery.isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-[#E8D98A]/40 bg-card p-4 flex items-center gap-3 animate-pulse"
                >
                  <div className="h-12 w-12 rounded-full bg-muted shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 w-24 rounded bg-muted" />
                    <div className="h-2.5 w-16 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {committeeQuery.isError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-2 my-2">
              <AlertCircle className="h-7 w-7 text-destructive mx-auto" />
              <p className="text-xs text-muted-foreground">Unable to load the E-Cell Committee.</p>
              <button
                type="button"
                onClick={() => committeeQuery.refetch()}
                className="text-xs font-bold text-[#C08634] underline"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty */}
          {!committeeQuery.isLoading && !committeeQuery.isError && members.length === 0 && (
            <div className="rounded-xl border border-[#E8D98A] bg-card p-7 text-center space-y-2 my-2">
              <h4 className="text-sm font-bold text-foreground">E-Cell Committee</h4>
              <p className="text-xs text-muted-foreground">Committee information will be updated soon.</p>
            </div>
          )}

          {/* Member List */}
          {!committeeQuery.isLoading && !committeeQuery.isError && members.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
              {members.map((m) => {
                const initials = getInitials(m.name);
                const dept = m.department || m.class;

                return (
                  <div
                    key={m.id}
                    className="flex flex-col justify-between rounded-xl border border-[#E8D98A]/60 dark:border-[#3D3523] bg-card p-3.5 hover:border-[#C08634] transition-all"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className="h-14 w-14 rounded-full overflow-hidden border-2 border-[#E8D98A] dark:border-[#C08634]/60 bg-white dark:bg-[#1D1B17] shrink-0 flex items-center justify-center aspect-square shadow-xs"
                        style={{ width: "56px", height: "56px", minWidth: "56px", minHeight: "56px", maxWidth: "56px", maxHeight: "56px" }}
                      >
                        {m.photo_url ? (
                          <img
                            src={m.photo_url}
                            alt={m.name}
                            className="h-full w-full object-cover rounded-full aspect-square shrink-0"
                            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "9999px" }}
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                              const fallback = e.currentTarget.parentElement?.querySelector(".avatar-fallback");
                              if (fallback) (fallback as HTMLElement).style.display = "flex";
                            }}
                          />
                        ) : null}
                        <div
                          className={cn(
                            "avatar-fallback h-full w-full items-center justify-center rounded-full bg-[#FAF9F7] dark:bg-[#23201B] text-[#000000] dark:text-[#FCE541] font-black text-xs select-none",
                            m.photo_url ? "hidden" : "flex"
                          )}
                          style={{ width: "100%", height: "100%" }}
                        >
                          {initials}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-sm font-bold text-foreground truncate">{m.name}</p>
                        <p className="text-xs font-semibold text-[#C08634] dark:text-[#FAD943] truncate">
                          {m.designation || "Executive Member"}
                        </p>
                        {dept && (
                          <p className="text-[11px] text-muted-foreground truncate">{dept}</p>
                        )}
                      </div>
                    </div>

                    {m.contact_enabled && (
                      <div className="mt-2.5 pt-2 border-t border-[#E8D98A]/30 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            setContactTarget({
                              id: m.id,
                              name: m.name,
                              designation: m.designation,
                              department: dept,
                              photo_url: m.photo_url,
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#FCE541] hover:bg-[#FAD943] text-[#000000] border border-[#C08634]/50 shadow-xs transition-all active:scale-95"
                        >
                          <Mail className="h-3 w-3" />
                          <span>Contact</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Contact Inquiry Modal */}
      <ECellContactMemberModal
        member={contactTarget}
        onClose={() => setContactTarget(null)}
      />
    </>
  );
}
