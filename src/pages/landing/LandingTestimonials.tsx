import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Star } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Dr. Priya Sharma",
    role: "Principal, ABC Institute",
    quote: "Campus Connect transformed how we manage attendance and student engagement. Our efficiency improved by 40%.",
    rating: 5,
  },
  {
    name: "Prof. Rajesh Kumar",
    role: "HOD, XYZ College",
    quote: "The gamification features keep students motivated. We've seen a significant improvement in lecture attendance.",
    rating: 5,
  },
  {
    name: "Ananya Deshmukh",
    role: "Student, DEF University",
    quote: "I love the leaderboard and achievement system. It makes college life so much more engaging and competitive.",
    rating: 5,
  },
] as const;

export default function LandingTestimonials() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.2 }}
      className="space-y-3"
    >
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">Testimonials</p>
        <h2 className="text-xl font-black tracking-tight text-foreground">What People Say</h2>
      </div>

      <div className="space-y-3 md:grid md:grid-cols-3 md:gap-3 md:space-y-0">
        {TESTIMONIALS.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.18, delay: i * 0.05 }}
          >
            <GlassCard padding="lg" className="space-y-3 h-full" hover>
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="h-3.5 w-3.5 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground italic">"{t.quote}"</p>
              <div>
                <p className="text-xs font-semibold text-foreground">{t.name}</p>
                <p className="text-[10px] text-muted-foreground">{t.role}</p>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
