import { motion } from "framer-motion";
import { CalendarCheck, FolderKanban, Users, Wrench } from "lucide-react";

import { Container } from "@/components/ui/Container";
import { StatCard } from "@/components/media/StatCard";
import { useSiteStats } from "@/hooks/content";
import type { Stat } from "@/types";
import { fadeUpSm, staggerContainer, viewportOnce } from "@/lib/motion";

/**
 * Stats — navy band with the society's REAL numbers (Task 26): live
 * counts from GET /api/stats (archived members and cancelled events never
 * count). While the request is in flight the band renders skeletons, and
 * if the API is unreachable the band hides rather than showing invented
 * values — the numbers on the wall are always true.
 */

const STAT_DEFS: Array<{
  id: "members" | "events" | "workshops" | "projects";
  label: string;
  description: string;
  icon: typeof Users;
}> = [
  { id: "members", label: "Members", description: "Active student members", icon: Users },
  { id: "events", label: "Events", description: "Events hosted to date", icon: CalendarCheck },
  { id: "workshops", label: "Workshops", description: "Hands-on skill sessions", icon: Wrench },
  { id: "projects", label: "Projects", description: "Student-built products", icon: FolderKanban },
];

export function Stats() {
  const statsQuery = useSiteStats();
  const stats = statsQuery.data;

  return (
    <section
      aria-labelledby="stats-heading"
      className="relative border-y border-gold-500/20 bg-navy-900"
    >
      <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-50" />
      <h2 id="stats-heading" className="sr-only">
        Society statistics
      </h2>

      <Container className="relative py-12 lg:py-16">
        <motion.div
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6"
        >
          {stats
            ? STAT_DEFS.map(({ id, label, description, icon }) => {
                const stat: Stat = { id, value: stats[id], suffix: "", label, description, icon };
                return (
                  <motion.div key={id} variants={fadeUpSm} className="h-full">
                    <StatCard stat={stat} tone="dark" className="h-full" />
                  </motion.div>
                );
              })
            : Array.from({ length: STAT_DEFS.length }).map((_, index) => (
                <motion.div key={index} variants={fadeUpSm} className="h-full">
                  <div
                    aria-hidden="true"
                    className="h-[168px] animate-pulse rounded-xl border border-white/10 bg-white/5 lg:h-[176px]"
                  />
                </motion.div>
              ))}
        </motion.div>
      </Container>
    </section>
  );
}
