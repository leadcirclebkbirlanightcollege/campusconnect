/**
 * InstitutionPartnersMarquee — infinite auto-scroll strip of partner colleges.
 * Data is CMS-managed via the `institution_partners` table.
 */
import { useQuery } from "@tanstack/react-query";
import { Landmark, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  badge: string | null;
}

function useActivePartners() {
  return useQuery({
    queryKey: ["landing", "institution_partners"],
    queryFn: async (): Promise<Partner[]> => {
      const { data, error } = await (supabase as any)
        .from("institution_partners")
        .select("id,name,logo_url,website,city,state,badge")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Partner[];
    },
    staleTime: 5 * 60_000,
  });
}

function PartnerCard({ partner, className }: { partner: Partner; className?: string }) {
  const inner = (
    <GlassCard
      padding="md"
      hover
      className={cn(
        "flex items-center gap-4 min-w-[280px] md:min-w-[340px] shrink-0",
        className,
      )}
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface-2 overflow-hidden">
        {partner.logo_url ? (
          <img
            src={partner.logo_url}
            alt={`${partner.name} logo`}
            loading="lazy"
            className="h-full w-full object-contain p-1"
          />
        ) : (
          <Landmark className="h-6 w-6 text-primary" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-foreground leading-tight">
          {partner.name}
        </p>
        {(partner.city || partner.state) && (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {[partner.city, partner.state].filter(Boolean).join(", ")}
          </p>
        )}
        {partner.badge && (
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            <Sparkles className="h-2.5 w-2.5" />
            {partner.badge}
          </span>
        )}
      </div>
    </GlassCard>
  );

  return partner.website ? (
    <a
      href={partner.website}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={partner.name}
      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
    >
      {inner}
    </a>
  ) : (
    inner
  );
}

export default function InstitutionPartnersMarquee() {
  const { data: partners = [], isLoading } = useActivePartners();

  // Duplicate list for seamless infinite scroll. Repeat more if list is tiny.
  const REPEAT = partners.length <= 2 ? 6 : partners.length <= 4 ? 3 : 2;
  const loop = Array.from({ length: REPEAT }).flatMap(() => partners);

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/80">
          Trusted by
        </p>
        <h2 className="text-[26px] md:text-[34px] font-black tracking-tight text-foreground">
          Institution Partners
        </h2>
        <p className="mx-auto max-w-xl text-[13px] md:text-sm text-muted-foreground leading-relaxed">
          Campus Connect is being developed in collaboration with educational institutions
          to create a smarter, more connected campus experience.
        </p>
      </div>

      {/* Marquee */}
      {isLoading ? (
        <div className="h-[110px] rounded-2xl border border-border-subtle bg-surface-1 animate-pulse" />
      ) : partners.length === 0 ? (
        <GlassCard padding="lg" className="text-center">
          <p className="text-sm text-muted-foreground">More institutional partners coming soon.</p>
        </GlassCard>
      ) : (
        <div className="relative overflow-hidden group">
          {/* Edge gradient masks */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 md:w-32 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 md:w-32 bg-gradient-to-l from-background to-transparent" />

          <div
            className="flex gap-4 md:gap-6 py-2 marquee-track motion-reduce:animate-none"
            style={{ animationDuration: `${Math.max(24, loop.length * 6)}s` }}
          >
            {loop.map((p, i) => (
              <PartnerCard key={`${p.id}-${i}`} partner={p} />
            ))}
          </div>
        </div>
      )}

      {/* Footer note when only one partner */}
      {partners.length > 0 && partners.length <= 1 && (
        <p className="text-center text-[12px] text-muted-foreground">
          More institutional partners coming soon.
        </p>
      )}
    </section>
  );
}
