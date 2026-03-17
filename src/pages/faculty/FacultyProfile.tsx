import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { UserCircle, Mail, Phone, Building2 } from "lucide-react";

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
      <h1 className="text-[20px] font-bold text-foreground">My Profile</h1>

      <div className="rounded-xl border border-border/50 bg-card p-5 flex flex-col items-center gap-4 text-center">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} className="h-20 w-20 rounded-full object-cover" alt="avatar" />
            : <UserCircle className="h-10 w-10 text-primary" />
          }
        </div>
        <div>
          <p className="text-[18px] font-bold text-foreground">{profile?.name ?? "—"}</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">Faculty Member</p>
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
