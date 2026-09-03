/**
 * ECellTeamSection — Official E-Cell Leadership & Core Team
 *
 * Dynamically queries active members from `core_team_members`
 * sorted by `order_index ASC`.
 *
 * Includes:
 * - Professional empty state: "Core team information will be updated soon."
 * - Section-level error boundary with working retry button
 * - Initial-based avatar fallback when photo is null
 * - Responsive 1/2-col mobile, 3-col tablet, 4-col desktop layout
 */
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, AlertCircle, RefreshCw, UserCheck } from "@/components/icons";
import { ECellSectionHeader } from "./ECellSectionHeader";
import { cn } from "@/lib/utils";

interface TeamMember {
  id: string;
  name: string;
  class: string | null;
  designation: string | null;
  photo_url: string | null;
  order_index: number;
  is_active: boolean;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ECellTeamSection() {
  const teamQuery = useQuery({
    queryKey: ["ecell", "team", "active-v2"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("core_team_members")
        .select("id,name,class,designation,photo_url,order_index,is_active")
        .eq("is_active", true)
        .order("order_index", { ascending: true });

      if (error) throw new Error(error.message);
      return (data ?? []) as TeamMember[];
    },
    staleTime: 60_000,
    retry: 2,
  });

  const { data, isLoading, isError, error, refetch, isFetching } = teamQuery;
  const members = data ?? [];

  return (
    <section className="space-y-4">
      <ECellSectionHeader
        title="Leadership & Core Team"
        subtitle="Executive committee driving entrepreneurship initiatives at BKBNC"
        badge={members.length > 0 ? `${members.length} Members` : undefined}
        icon={Users}
      />

      {/* ── Loading State ────────────────────────────────────────── */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex flex-col items-center rounded-2xl border border-[#E8D98A]/40 bg-card p-5 space-y-3 animate-pulse"
            >
              <div className="h-20 w-20 rounded-full bg-[#FAF9F7] dark:bg-muted" />
              <div className="h-3.5 w-24 rounded bg-[#FAF9F7] dark:bg-muted" />
              <div className="h-2.5 w-16 rounded bg-[#FAF9F7] dark:bg-muted" />
            </div>
          ))}
        </div>
      )}

      {/* ── Error State with Functional Retry ───────────────────── */}
      {isError && !isLoading && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
          <AlertCircle className="h-7 w-7 text-destructive mx-auto" />
          <div className="space-y-1 max-w-sm mx-auto">
            <h4 className="text-[14px] font-bold text-foreground">
              Unable to load the Core Team
            </h4>
            <p className="text-[12px] text-muted-foreground">
              {error instanceof Error ? error.message : "Network error loading leadership directory."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-[#000000]",
              "bg-[#FCE541] hover:bg-[#FAD943] border border-[#C08634]/50 shadow-xs transition-all active:scale-95"
            )}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* ── Professional Empty State ────────────────────────────── */}
      {!isLoading && !isError && members.length === 0 && (
        <div className="rounded-2xl border border-[#E8D98A]/60 dark:border-[#3D3523] bg-card p-7 sm:p-9 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FCE541]/20 text-[#C08634] border border-[#E8D98A]">
            <UserCheck className="h-6 w-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="text-[15px] font-bold text-[#000000] dark:text-white">
              Core team information will be updated soon.
            </h4>
            <p className="text-[12.5px] text-[#593018]/85 dark:text-muted-foreground leading-relaxed">
              The Entrepreneurship Cell leadership committee appointments for the current session are being finalized by college administration.
            </p>
          </div>
        </div>
      )}

      {/* ── Real Core Team Directory ────────────────────────────── */}
      {!isLoading && !isError && members.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {members.map((m) => {
            const initials = getInitials(m.name);
            return (
              <div
                key={m.id}
                className={cn(
                  "group relative flex flex-col items-center text-center rounded-2xl border border-[#E8D98A]/60 dark:border-[#3D3523] bg-card p-4 sm:p-5",
                  "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[#C08634]"
                )}
                style={{
                  boxShadow: "0 2px 12px -2px rgba(192, 134, 52, 0.06)",
                }}
              >
                {/* Profile Photo / Initials Fallback */}
                <div className="relative mb-3">
                  <div className="h-20 w-20 sm:h-22 sm:w-22 rounded-full overflow-hidden border-2 border-[#E8D98A] dark:border-[#C08634] p-0.5 bg-white dark:bg-[#1D1B17] shadow-xs">
                    {m.photo_url ? (
                      <img
                        src={m.photo_url}
                        alt={m.name}
                        className="h-full w-full object-cover rounded-full"
                        loading="lazy"
                        onError={(e) => {
                          // Image failed to load, fallback gracefully to initials
                          (e.currentTarget as HTMLElement).style.display = "none";
                          const fallback = e.currentTarget.parentElement?.querySelector(".avatar-fallback");
                          if (fallback) (fallback as HTMLElement).style.display = "flex";
                        }}
                      />
                    ) : null}

                    <div
                      className={cn(
                        "avatar-fallback h-full w-full items-center justify-center rounded-full bg-[#FAF9F7] dark:bg-[#23201B] text-[#000000] dark:text-[#FCE541] font-black text-[14px]",
                        m.photo_url ? "hidden" : "flex"
                      )}
                    >
                      {initials}
                    </div>
                  </div>

                  {/* Golden Active Indicator Node */}
                  <span
                    title="Active Executive Member"
                    className="absolute bottom-0 right-1 h-3.5 w-3.5 rounded-full bg-[#FCE541] border-2 border-white dark:border-[#1D1B17] shadow-xs"
                  />
                </div>

                {/* Member Details */}
                <h4 className="text-[14px] sm:text-[15px] font-bold text-[#000000] dark:text-white truncate max-w-full leading-snug">
                  {m.name}
                </h4>

                {m.designation && (
                  <p className="text-[11px] sm:text-[12px] font-bold text-[#C08634] dark:text-[#FAD943] mt-0.5 truncate max-w-full">
                    {m.designation}
                  </p>
                )}

                {m.class && (
                  <p className="text-[10.5px] text-[#593018]/85 dark:text-muted-foreground mt-0.5 truncate max-w-full">
                    {m.class}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
