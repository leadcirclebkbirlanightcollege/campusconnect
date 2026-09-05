/**
 * StudentEcellCommitteePage — Official E-Cell Core Committee Directory
 *
 * Dedicated page (/app/ecell/committee):
 * - Clean "← Back to E-Cell" header
 * - Title: E-Cell Committee
 * - Subtitle: Connect with the E-Cell team
 * - Dynamic cards fetched from `core_team_members` where `is_active = true`
 * - Contact action when `contact_enabled` is true
 * - Loading skeleton, Error retry, and exact Empty State
 */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  ChevronLeft,
  Mail,
  UserRound,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ShieldCheck,
} from "@/components/icons";

import { ECELL_ASSETS } from "./ecell-tokens";
import {
  ECellContactMemberModal,
  CommitteeContactTarget,
} from "./components/ECellContactMemberModal";
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

export default function StudentEcellCommitteePage() {
  const [contactTarget, setContactTarget] = useState<CommitteeContactTarget | null>(null);

  const committeeQuery = useQuery({
    queryKey: ["ecell", "committee-directory", "v1"],
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
    retry: 2,
  });

  const { data, isLoading, isError, error, refetch, isFetching } = committeeQuery;
  const members = data ?? [];

  return (
    <div className="min-h-screen bg-[#FAF9F7]/70 dark:bg-background pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
        {/* ── Navigation / Back Bar ───────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/app/ecell"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#593018] dark:text-muted-foreground hover:text-foreground bg-white dark:bg-[#1D1B17] border border-[#E8D98A]/70 shadow-xs transition-all active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to E-Cell</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[11px] font-bold text-[#C08634] uppercase tracking-wider">
              {ECELL_ASSETS.tagline}
            </span>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh Committee"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E8D98A] bg-card text-[#593018] hover:text-foreground transition-colors"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin text-[#C08634]")} />
            </button>
          </div>
        </div>

        {/* ── Header Banner ──────────────────────────────────────── */}
        <div className="rounded-2xl sm:rounded-3xl border border-[#E8D98A] dark:border-[#3D3523] bg-card p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#FCE541] text-[#000000] border border-[#C08634]/40">
                <Users className="h-3 w-3" /> Core Leadership
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#000000] dark:text-white tracking-tight">
                E-Cell Committee
              </h1>
              <p className="text-sm font-semibold text-[#593018] dark:text-[#D8C7A5]">
                Connect with the E-Cell team
              </p>
              <p className="text-xs text-muted-foreground max-w-lg leading-relaxed pt-1">
                The executive committee driving innovation, stall marketplaces, and startup initiatives at B. K. Birla Night College, Kalyan.
              </p>
            </div>

            <div className="hidden sm:flex h-20 w-20 rounded-full overflow-hidden border-2 border-[#E8D98A] bg-white p-1 shrink-0 shadow-sm items-center justify-center">
              <img
                src={ECELL_ASSETS.logo}
                alt="E-Cell Official Logo"
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* ── Loading Skeleton ─────────────────────────────────────── */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-[#E8D98A]/40 bg-card p-5 flex items-center gap-4 animate-pulse"
              >
                <div className="h-16 w-16 rounded-full bg-[#FAF9F7] dark:bg-muted shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-32 rounded bg-[#FAF9F7] dark:bg-muted" />
                  <div className="h-3 w-20 rounded bg-[#FAF9F7] dark:bg-muted" />
                  <div className="h-3 w-24 rounded bg-[#FAF9F7] dark:bg-muted" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Error State with Functional Retry ───────────────────── */}
        {isError && !isLoading && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-7 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-base font-bold text-foreground">
                Unable to load the E-Cell Committee.
              </h3>
              <p className="text-xs text-muted-foreground">
                {error instanceof Error ? error.message : "Failed to connect to the committee directory."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#000000]",
                "bg-[#FCE541] hover:bg-[#FAD943] border border-[#C08634]/50 shadow-xs transition-all active:scale-95"
              )}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
              <span>Try Again</span>
            </button>
          </div>
        )}

        {/* ── Empty State ─────────────────────────────────────────── */}
        {!isLoading && !isError && members.length === 0 && (
          <div className="rounded-2xl border border-[#E8D98A] dark:border-[#3D3523] bg-card p-8 sm:p-12 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FCE541]/20 text-[#C08634] border border-[#E8D98A]">
              <Users className="h-7 w-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h2 className="text-lg font-bold text-[#000000] dark:text-white">
                E-Cell Committee
              </h2>
              <p className="text-sm text-[#593018]/90 dark:text-muted-foreground">
                Committee information will be updated soon.
              </p>
            </div>
          </div>
        )}

        {/* ── Committee Member Cards ──────────────────────────────── */}
        {!isLoading && !isError && members.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {members.map((m) => {
              const initials = getInitials(m.name);
              const dept = m.department || m.class;

              return (
                <div
                  key={m.id}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-2xl border border-[#E8D98A]/60 dark:border-[#3D3523] bg-card p-4 sm:p-5",
                    "transition-all duration-200 hover:border-[#C08634] hover:shadow-md"
                  )}
                  style={{
                    boxShadow: "0 2px 10px -2px rgba(192, 134, 52, 0.06)",
                  }}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Member Avatar */}
                    <div className="relative shrink-0">
                      <div
                        className="h-16 w-16 sm:h-20 sm:w-20 rounded-full overflow-hidden border-2 border-[#E8D98A] dark:border-[#C08634] p-0.5 bg-white dark:bg-[#1D1B17] shadow-xs shrink-0 aspect-square"
                        style={{ width: "64px", height: "64px", minWidth: "64px", minHeight: "64px", maxWidth: "64px", maxHeight: "64px" }}
                      >
                        {m.photo_url ? (
                          <img
                            src={m.photo_url}
                            alt={m.name}
                            className="h-full w-full object-cover rounded-full aspect-square shrink-0 max-h-full max-w-full"
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
                            "avatar-fallback h-full w-full items-center justify-center rounded-full bg-[#FAF9F7] dark:bg-[#23201B] text-[#000000] dark:text-[#FCE541] font-black text-sm",
                            m.photo_url ? "hidden" : "flex"
                          )}
                        >
                          {initials}
                        </div>
                      </div>

                      <span
                        title="Active Committee Member"
                        className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-[#FCE541] border-2 border-white dark:border-[#1D1B17] shadow-xs"
                      />
                    </div>

                    {/* Member Info */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="text-base font-bold text-[#000000] dark:text-white truncate">
                        {m.name}
                      </h3>

                      <p className="text-xs font-bold text-[#C08634] dark:text-[#FAD943] truncate">
                        {m.designation || "Core Committee"}
                      </p>

                      {dept && (
                        <p className="text-[11.5px] text-[#593018]/85 dark:text-muted-foreground truncate">
                          {dept}
                        </p>
                      )}

                      {m.bio && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 pt-0.5 leading-relaxed">
                          {m.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Contact Action (Shown only if Admin enabled it) */}
                  {m.contact_enabled && (
                    <div className="mt-3.5 pt-3 border-t border-[#E8D98A]/40 flex items-center justify-between">
                      <span className="text-[10.5px] font-semibold text-[#593018]/70 dark:text-muted-foreground">
                        Available for Student Support
                      </span>
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
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#000000]",
                          "bg-[#FCE541] hover:bg-[#FAD943] active:bg-[#C08634] active:text-white",
                          "border border-[#C08634]/50 shadow-xs transition-all active:scale-95"
                        )}
                      >
                        <Mail className="h-3.5 w-3.5" />
                        <span>Contact</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Contact Inquiry Modal ─────────────────────────────────── */}
      <ECellContactMemberModal
        member={contactTarget}
        onClose={() => setContactTarget(null)}
      />
    </div>
  );
}
