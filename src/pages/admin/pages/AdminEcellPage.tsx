/**
 * AdminEcellPage — E-Cell Admin Management Center
 *
 * Tabbed interface for:
 * 1. Core Team (Leadership directory, order, visibility, CRUD)
 * 2. Stall Requests (Review & approve vendor registrations)
 * 3. Events & Initiatives (Create & manage E-Cell flag events)
 */

import React, { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Users, Store, CalendarDays, Rocket, ArrowRight } from "@/components/icons";
import { AdminEcellTeamTab } from "@/pages/admin/ecell/AdminEcellTeamTab";
import AdminStallRegistrationsTab from "@/pages/admin/stalls/AdminStallRegistrationsTab";
import { cn } from "@/lib/utils";

export default function AdminEcellPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab") || "committee";
  const activeTab = rawTab === "team" ? "committee" : rawTab;

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* ── Header Ribbon ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FCE541] text-[#000000] border border-[#C08634]/50">
              <Rocket className="h-4 w-4" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              E-Cell Management Center
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            B. K. Birla Night College, Kalyan • Vision to Venture Administration
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/app/ecell"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#FAF9F7] dark:bg-card hover:bg-[#FCE541] hover:text-[#000000] text-foreground border border-[#E8D98A] shadow-xs transition-all"
          >
            <span>Preview Student Portal</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ── Navigation Tabs ──────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 border-b border-border pb-px overflow-x-auto">
        <button
          type="button"
          onClick={() => setTab("committee")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all whitespace-nowrap",
            activeTab === "committee"
              ? "border-[#C08634] text-[#C08634] dark:text-[#FAD943]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Users className="h-4 w-4" />
          <span>Committee</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("stalls")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all whitespace-nowrap",
            activeTab === "stalls"
              ? "border-[#C08634] text-[#C08634] dark:text-[#FAD943]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Store className="h-4 w-4" />
          <span>Stall Applications</span>
        </button>

        <Link
          to="/platform/admin/events?ecell=1"
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-all whitespace-nowrap"
        >
          <CalendarDays className="h-4 w-4" />
          <span>E-Cell Events</span>
        </Link>
      </div>

      {/* ── Tab Content ──────────────────────────────────────────── */}
      {activeTab === "committee" && <AdminEcellTeamTab />}
      {activeTab === "stalls" && <AdminStallRegistrationsTab />}
    </div>
  );
}
