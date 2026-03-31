import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import { Button } from "@/components/ui/button";

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    description: "For small institutions getting started",
    features: ["Up to 100 students", "Attendance tracking", "Basic analytics", "Student app"],
    cta: "Get Started",
    highlight: false,
  },
  {
    name: "Professional",
    price: "Contact Us",
    description: "For growing colleges and universities",
    features: ["Unlimited students", "Full ERP suite", "Faculty dashboard", "Advanced analytics", "Priority support"],
    cta: "Book Demo",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "Multi-campus, white-label deployments",
    features: ["Multi-college support", "Custom branding", "API access", "Dedicated support", "SLA guarantee"],
    cta: "Contact Sales",
    highlight: false,
  },
] as const;

export default function LandingPricing() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.2 }}
      className="space-y-3"
    >
      <div className="space-y-1.5 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">Pricing</p>
        <h2 className="text-xl font-black tracking-tight text-foreground">Simple, Transparent Pricing</h2>
      </div>

      <div className="space-y-3 md:grid md:grid-cols-3 md:gap-3 md:space-y-0">
        {PLANS.map((plan) => (
          <GlassCard
            key={plan.name}
            padding="lg"
            className={`space-y-4 h-full ${plan.highlight ? "border-primary/40 ring-1 ring-primary/20" : ""}`}
            hover
          >
            {plan.highlight && (
              <span className="inline-block rounded-full border border-primary/30 bg-primary/12 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Most Popular
              </span>
            )}
            <div>
              <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
              <p className="text-2xl font-black text-foreground mt-1">{plan.price}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{plan.description}</p>
            </div>
            <ul className="space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link to={plan.highlight ? "/book-demo" : "/auth"} className="block">
              {plan.highlight ? (
                <GlowButton className="w-full h-10 text-xs">{plan.cta}</GlowButton>
              ) : (
                <Button variant="outline" className="w-full h-10 text-xs">{plan.cta}</Button>
              )}
            </Link>
          </GlassCard>
        ))}
      </div>
    </motion.section>
  );
}
