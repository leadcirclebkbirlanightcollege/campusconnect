/**
 * InstitutionPartnersMarquee — Institutional Partnership Showcase.
 * Displays active partner institutions with verified branding and partnership context.
 */

import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap, Sparkles, MapPin, ExternalLink,
  ShieldCheck, CheckCircle2, Building2,
} from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import bkbncLogo from "@/assets/bkbnc-logo.png";

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  badge: string | null;
}

const DEFAULT_PARTNERS: Partner[] = [
  {
    id: "bkbnc-founding",
    name: "B. K. Birla Night Arts, Science & Commerce College",
    logo_url: bkbncLogo,
    website: "https://bkbirlacollegekalyan.com",
    city: "Kalyan",
    state: "Maharashtra",
    badge: "Founding Institution Partner",
  },
];

function useActivePartners() {
  return useQuery({
    queryKey: ["landing", "institution_partners"],
    queryFn: async (): Promise<Partner[]> => {
      const { data, error } = await (supabase as any)
        .from("institution_partners")
        .select("id,name,logo_url,website,city,state,badge")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error || !data || data.length === 0) {
        return DEFAULT_PARTNERS;
      }
      return data.map((p: any) => ({
        ...p,
        // Fallback if logo_url is null or points to deprecated proxy
        logo_url: p.logo_url && !p.logo_url.startsWith("/__l5e") ? p.logo_url : bkbncLogo,
      })) as Partner[];
    },
    staleTime: 5 * 60_000,
    placeholderData: DEFAULT_PARTNERS,
  });
}

function resolvePartnerLogo(logoUrl: string | null | undefined): string {
  if (!logoUrl || logoUrl.startsWith("/__l5e")) {
    return bkbncLogo;
  }
  return logoUrl;
}

export default function InstitutionPartnersMarquee() {
  const { data: partners = DEFAULT_PARTNERS, isLoading } = useActivePartners();

  const isSinglePartner = partners.length === 1;
  const partner = partners[0] || DEFAULT_PARTNERS[0];

  return (
    <div className="relative overflow-hidden py-14 sm:py-16 md:py-20 px-4 sm:px-6">
      {/* Ambient background decoration */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,hsl(var(--primary)/0.04),transparent)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-5xl space-y-8 sm:space-y-10">
        {/* ── Section Header ────────────────────────────────────────────── */}
        <div className="text-center space-y-2.5 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/8 text-primary text-[10.5px] font-bold uppercase tracking-[0.20em]">
            <Sparkles className="h-3 w-3" />
            Trusted By
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground">
            Institution Partners
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Campus Connect is being developed in collaboration with educational institutions
            to create a smarter, more connected campus experience.
          </p>
        </div>

        {/* ── Featured Partner Showcase ─────────────────────────────────── */}
        {isLoading && partners.length === 0 ? (
          <div className="max-w-3xl mx-auto h-48 rounded-2xl border border-border-subtle bg-surface-1 animate-pulse" />
        ) : isSinglePartner ? (
          <div className="max-w-3xl mx-auto">
            <div className="group relative rounded-2xl border border-border-subtle bg-surface-1/90 backdrop-blur-sm p-6 sm:p-8 shadow-xs hover:shadow-md hover:border-border-strong transition-all duration-300 overflow-hidden">
              {/* Subtle top-right accent glow */}
              <div
                className="pointer-events-none absolute -top-16 -right-16 h-36 w-36 rounded-full bg-primary/8 blur-2xl group-hover:bg-primary/12 transition-all duration-500"
                aria-hidden="true"
              />

              <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 text-center sm:text-left">
                {/* College Logo Emblem Frame */}
                <div className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-2xl border border-border-subtle bg-white p-2.5 shadow-xs flex items-center justify-center group-hover:scale-102 transition-transform duration-fast">
                  <img
                    src={resolvePartnerLogo(partner.logo_url)}
                    alt={`${partner.name} Crest Logo`}
                    onError={(e) => {
                      e.currentTarget.src = bkbncLogo;
                    }}
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                </div>

                {/* College Details */}
                <div className="flex-1 min-w-0 space-y-2.5">
                  {/* Badges Row */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                      <GraduationCap className="h-3 w-3" />
                      {partner.badge || "Founding Institution Partner"}
                    </span>
                    {(partner.city || partner.state) && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                        <MapPin className="h-3 w-3 text-muted-foreground/70" />
                        {[partner.city, partner.state].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </div>

                  {/* Institution Name */}
                  <h3 className="text-lg sm:text-xl font-bold text-foreground tracking-tight leading-snug">
                    {partner.name}
                  </h3>

                  {/* Institutional Partnership Summary */}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Collaborating on next-generation attendance workflows, automated lecture tracking,
                    and verified student credential systems for academic excellence.
                  </p>

                  {/* Website link if available */}
                  {partner.website && (
                    <div className="pt-1">
                      <a
                        href={partner.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                      >
                        Visit Institution Portal
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Multi-partner grid for when multiple institutions are onboarded */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {partners.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-border-subtle bg-surface-1 p-5 shadow-xs hover:border-border-strong transition-all flex items-center gap-4"
              >
                <div className="h-14 w-14 shrink-0 rounded-xl border border-border-subtle bg-white p-2 flex items-center justify-center">
                  <img
                    src={resolvePartnerLogo(p.logo_url)}
                    alt={`${p.name} logo`}
                    onError={(e) => {
                      e.currentTarget.src = bkbncLogo;
                    }}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{p.name}</p>
                  {(p.city || p.state) && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {[p.city, p.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {p.badge && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9.5px] font-semibold text-primary">
                      {p.badge}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Partnership Pillars & Context ─────────────────────────────── */}
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-xl border border-border-subtle bg-surface-1/60 text-center sm:text-left space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-foreground font-semibold text-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Verified Accreditation
            </div>
            <p className="text-[11px] text-muted-foreground leading-normal">
              Official collegiate partnership backing student verification and governance.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-border-subtle bg-surface-1/60 text-center sm:text-left space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-foreground font-semibold text-xs">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              Campus Operations
            </div>
            <p className="text-[11px] text-muted-foreground leading-normal">
              Multi-department lecture scheduling, attendance tracking, and digital IDs.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-border-subtle bg-surface-1/60 text-center sm:text-left space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-foreground font-semibold text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              Real-World Deployment
            </div>
            <p className="text-[11px] text-muted-foreground leading-normal">
              Active everyday deployment across thousands of students and faculty members.
            </p>
          </div>
        </div>

        {/* ── Future Partners Secondary Indicator ──────────────────────── */}
        <div className="text-center pt-1">
          <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-pulse" />
            More institutions joining the Campus Connect network soon.
          </p>
        </div>
      </div>
    </div>
  );
}
