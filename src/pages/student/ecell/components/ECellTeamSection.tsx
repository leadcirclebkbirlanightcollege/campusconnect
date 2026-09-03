import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UserRound, Users, Sparkles, Mail, LifeBuoy } from "@/components/icons";
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

export function ECellTeamSection() {
  const teamQuery = useQuery({
    queryKey: ["ecell", "team", "v1"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("core_team_members")
        .select("id,name,class,designation,photo_url,order_index,is_active")
        .eq("is_active", true)
        .order("order_index", { ascending: true });
      if (error) {
        // Non-fatal if table not populated
        return [] as TeamMember[];
      }
      return (data ?? []) as TeamMember[];
    },
    staleTime: 120_000,
  });

  const members = teamQuery.data ?? [];

  if (teamQuery.isLoading) {
    return (
      <div className="space-y-3">
        <ECellSectionHeader
          title="Leadership & Core Team"
          subtitle="The team driving entrepreneurial initiatives at BKBNC"
          icon={Users}
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-card border border-[#E8D98A]/30 animate-pulse p-4" />
          ))}
        </div>
      </div>
    );
  }

  // Gracefully show an encouraging invitation if no core team members are seeded
  if (members.length === 0) {
    return (
      <div className="space-y-3">
        <ECellSectionHeader
          title="Leadership & Core Team"
          subtitle="The team driving entrepreneurial initiatives at BKBNC"
          icon={Users}
        />
        <div className="rounded-2xl border border-[#E8D98A]/50 bg-white dark:bg-[#191713] p-6 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FCE541]/20 text-[#C08634] border border-[#E8D98A]">
            <Users className="h-6 w-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-[15px] font-bold text-foreground">
              Core Committee Session 2026
            </h3>
            <p className="text-[12.5px] text-[#593018]/85 dark:text-muted-foreground leading-relaxed">
              E-Cell executive council appointments for the current session are being finalized by college administration.
              Interested in joining the student entrepreneurship team?
            </p>
          </div>
          <Link
            to="/app/support"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold bg-[#FCE541] text-[#000000] border border-[#C08634]/50 hover:bg-[#FAD943] transition-all shadow-sm active:scale-95"
          >
            <LifeBuoy className="h-3.5 w-3.5" />
            Contact E-Cell / Volunteer
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <ECellSectionHeader
        title="Leadership & Core Team"
        subtitle="The team driving entrepreneurial initiatives at BKBNC"
        badge={`${members.length} Members`}
        icon={Users}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {members.map((m) => (
          <div
            key={m.id}
            className={cn(
              "group relative flex flex-col items-center text-center rounded-2xl border border-[#E8D98A]/50 dark:border-[#3D3523] bg-card p-4 sm:p-5",
              "transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-[#C08634]"
            )}
            style={{
              boxShadow: "0 4px 14px -4px rgba(192, 134, 52, 0.08)",
            }}
          >
            {/* Circular Avatar */}
            <div className="relative mb-3">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden border-2 border-[#E8D98A] dark:border-[#C08634] p-0.5 bg-white dark:bg-[#1D1B17] shadow-sm">
                {m.photo_url ? (
                  <img
                    src={m.photo_url}
                    alt={m.name}
                    className="h-full w-full object-cover rounded-full"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-[#FAF9F7] dark:bg-[#23201B] text-[#C08634]">
                    <UserRound className="h-9 w-9 opacity-75" />
                  </div>
                )}
              </div>
              <span className="absolute bottom-0 right-1 h-3.5 w-3.5 rounded-full bg-[#FCE541] border-2 border-white dark:border-[#1D1B17]" />
            </div>

            {/* Member Details */}
            <h4 className="text-[14px] sm:text-[15px] font-bold text-[#000000] dark:text-white truncate max-w-full">
              {m.name}
            </h4>

            {m.designation && (
              <p className="text-[11.5px] sm:text-[12px] font-semibold text-[#C08634] dark:text-[#FAD943] mt-0.5 truncate max-w-full">
                {m.designation}
              </p>
            )}

            {m.class && (
              <p className="text-[10.5px] text-[#593018]/80 dark:text-muted-foreground mt-0.5 truncate max-w-full">
                {m.class}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
