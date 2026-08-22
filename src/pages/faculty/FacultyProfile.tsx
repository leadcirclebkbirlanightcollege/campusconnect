import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { UserCircle, Mail, Phone, Building2 } from "@/components/icons";

export default function FacultyProfile() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["faculty", "profile", user?.id],
    enabled: !!user,
    staleTime: 120_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name,email,phone,department,college_id,avatar_url,colleges(college_name)")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  return (
    <div className="max-w-md space-y-5">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/80 p-6 text-primary-foreground shadow-lg text-center">
        <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_20%_10%,white,transparent_55%)]" aria-hidden />
        <div className="relative flex flex-col items-center gap-3">
          <div className="h-24 w-24 rounded-full bg-white/15 ring-4 ring-white/30 flex items-center justify-center overflow-hidden">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} className="h-24 w-24 rounded-full object-cover" alt={profile?.name ? `${profile.name}'s profile photo` : "Faculty profile photo"} />
              : <UserCircle className="h-12 w-12 text-white" />
            }
          </div>
          <div>
            <p className="font-heading text-[20px] font-black">{profile?.name ?? "—"}</p>
            <p className="text-[12px] opacity-85 mt-0.5">Faculty Member</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card divide-y divide-border/30">
        {[
          { icon: Mail,      label: "Email",      value: profile?.email },
          { icon: Phone,     label: "Phone",      value: profile?.phone ?? "Not set" },
          { icon: Building2, label: "Department", value: profile?.department ?? "Not set" },
          { icon: Building2, label: "College",    value: (profile as any)?.colleges?.college_name ?? "Not set" },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3.5">
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
              <p className="text-[13px] text-foreground truncate">{value ?? "—"}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
