import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, GraduationCap, Mail, MapPin, Phone, Send, User, Users } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/GlassCard";
import { BRANDING } from "@/config/branding";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(2, "Name is required").max(100),
  collegeName: z.string().min(2, "College name is required").max(200),
  phone: z.string().min(10, "Valid phone number required").max(15),
  email: z.string().email("Valid email required").max(255),
  city: z.string().min(2, "City is required").max(100),
  studentCount: z.string().min(1, "Student count is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function BookDemo() {
  const [form, setForm] = useState<FormData>({
    name: "",
    collegeName: "",
    phone: "",
    email: "",
    city: "",
    studentCount: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = formSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof FormData, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FormData;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    const message = encodeURIComponent(
      `Hi, I want to book a demo for Campus Connect.\n\nName: ${form.name}\nCollege: ${form.collegeName}\nStudents: ${form.studentCount}\nCity: ${form.city}\nEmail: ${form.email}\nPhone: ${form.phone}`
    );
    const whatsappUrl = `https://wa.me/919172782265?text=${message}`;

    toast.success("Redirecting to WhatsApp...");
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const fields: { key: keyof FormData; label: string; icon: React.ElementType; type?: string; placeholder: string }[] = [
    { key: "name", label: "Your Name", icon: User, placeholder: "John Doe" },
    { key: "collegeName", label: "College / Institution Name", icon: Building2, placeholder: "ABC University" },
    { key: "email", label: "Email Address", icon: Mail, type: "email", placeholder: "admin@college.edu" },
    { key: "phone", label: "Phone Number", icon: Phone, type: "tel", placeholder: "+91 9876543210" },
    { key: "city", label: "City", icon: MapPin, placeholder: "Mumbai" },
    { key: "studentCount", label: "Approximate Student Count", icon: Users, type: "number", placeholder: "500" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border-subtle/70 bg-background/90 backdrop-blur-xl safe-area-top">
        <div className="mx-auto flex h-16 w-full max-w-[420px] items-center gap-3 px-4 md:max-w-3xl md:px-6">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-xs">Back</span>
          </Link>
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
              <GraduationCap className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm font-semibold">{BRANDING.name}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[420px] space-y-6 px-4 py-8 md:max-w-3xl md:px-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="text-center space-y-2">
          <h1 className="text-2xl font-black tracking-tight md:text-4xl">Book a Demo</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            See how Campus Connect can transform your institution. Fill in the details and we'll connect with you on WhatsApp.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.06 }}>
          <GlassCard padding="lg" className="space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {fields.map(({ key, label, icon: Icon, type, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={key} className="text-xs font-medium flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {label}
                  </Label>
                  <Input
                    id={key}
                    type={type || "text"}
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className={errors[key] ? "border-destructive" : ""}
                  />
                  {errors[key] && <p className="text-[11px] text-destructive">{errors[key]}</p>}
                </div>
              ))}

              <Button type="submit" className="w-full h-12 gap-2 text-sm font-semibold">
                <Send className="h-4 w-4" />
                Book Demo via WhatsApp
              </Button>
            </form>

            <p className="text-[11px] text-center text-muted-foreground">
              By submitting, you agree to be contacted regarding Campus Connect. We respect your privacy.
            </p>
          </GlassCard>
        </motion.div>
      </main>
    </div>
  );
}
