import { motion } from "framer-motion";
import { ArrowRight, CalendarCheck, Users } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/routes/paths";
import { useSiteSettings, useSiteStats, useUpcomingEvents } from "@/hooks/content";
import { EASE_OUT_EXPO, fadeUp, fadeUpSm, scaleIn, staggerContainer } from "@/lib/motion";

/**
 * Hero — the opening statement of the site.
 *
 * Deep navy surface, subtle technical grid, restrained gold accents, and a
 * REAL hero visual: the admin-editable image from site settings (Task 26),
 * falling back to a branded tile until an image is chosen. The floating
 * chips show the society's live numbers (member count) and its actual
 * next event — no more mock data.
 */
export function Hero() {
  const settingsQuery = useSiteSettings();
  const heroImage = settingsQuery.data?.heroImage ?? "";
  const statsQuery = useSiteStats();
  const members = statsQuery.data?.members;
  const nextEventQuery = useUpcomingEvents(1);
  const nextEvent = nextEventQuery.data?.[0];

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden bg-navy-950"
    >
      {/* Decorative layers */}
      <div aria-hidden="true" className="absolute inset-0 bg-grid-dark mask-fade-radial" />
      <div
        aria-hidden="true"
        className="absolute -top-40 right-[-12%] h-[520px] w-[520px] rounded-full bg-navy-600/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-[-25%] left-[-10%] h-[420px] w-[420px] rounded-full bg-gold-500/[0.06] blur-3xl"
      />

      <Container className="relative py-16 sm:py-20 lg:py-28">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 xl:gap-16">
          {/* ---------- Copy ---------- */}
          <motion.div
            variants={staggerContainer(0.09)}
            initial="hidden"
            animate="visible"
            className="min-w-0"
          >
            <motion.p
              variants={fadeUpSm}
              className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-gold-400"
            >
              <span aria-hidden="true" className="h-px w-10 bg-gold-500" />
              Society of Computer Science
            </motion.p>

            <motion.h1
              id="hero-heading"
              variants={fadeUp}
              className="mt-5 font-display text-4xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-5xl xl:text-[3.5rem]"
            >
              Building the Next Generation of{" "}
              <span className="bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500 bg-clip-text text-transparent">
                Computer Scientists
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUpSm}
              className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg"
            >
              A student-driven community at SZIC connecting aspiring developers,
              innovators, researchers, and technology enthusiasts through
              learning, collaboration, and real-world experiences.
            </motion.p>

            <motion.div
              variants={fadeUpSm}
              className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Button to={ROUTES.events} variant="gold" size="lg">
                Explore Events
                <ArrowRight size={18} aria-hidden="true" />
              </Button>
              <Button to={ROUTES.signup} variant="outlineLight" size="lg">
                Join the Community
              </Button>
            </motion.div>
          </motion.div>

          {/* ---------- Visual: the society's real hero image ---------- */}
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.25, duration: 0.6, ease: EASE_OUT_EXPO }}
            className="relative mx-auto w-full max-w-lg lg:max-w-none min-w-0"
          >
            {/* Soft glow behind the card */}
            <div
              aria-hidden="true"
              className="absolute -inset-5 rounded-2xl bg-gradient-to-br from-navy-600/50 via-transparent to-gold-500/10 blur-2xl"
            />

            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10 shadow-2xl backdrop-blur">
              {heroImage ? (
                <img
                  src={heroImage}
                  alt="The Society of Computer Science community"
                  className="size-full object-cover"
                  decoding="async"
                />
              ) : (
                /* Fallback tile until an image is chosen in Admin → Home */
                <div
                  aria-hidden="true"
                  className="relative grid size-full place-items-center overflow-hidden bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950"
                >
                  <div className="absolute inset-0 bg-grid-dark opacity-60" />
                  <div className="absolute -right-16 -top-16 size-56 rounded-full bg-gold-500/10 blur-3xl" />
                  <div className="relative text-center">
                    <span className="block font-display text-6xl font-extrabold tracking-tight text-white/95 sm:text-7xl">
                      SCS
                    </span>
                    <span className="mt-3 block text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-400/90">
                      SZIC · University of Peshawar
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Floating stat chip — live member count */}
            <motion.div
              aria-hidden="true"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-4 top-8 hidden items-center gap-3 rounded-xl border border-white/10 bg-navy-800/95 px-4 py-3 shadow-xl backdrop-blur lg:flex"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-gold-500/15 text-gold-300">
                <Users size={17} />
              </span>
              <span>
                <span className="block font-display text-sm font-bold text-white">
                  {members !== undefined ? members : "—"}
                </span>
                <span className="block text-[11px] text-slate-400">Student members</span>
              </span>
            </motion.div>

            {/* Floating chip — the actual next event */}
            <motion.div
              aria-hidden="true"
              animate={{ y: [0, 8, 0] }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
              className="absolute -right-3 bottom-10 hidden items-center gap-3 rounded-xl border border-white/10 bg-navy-800/95 px-4 py-3 shadow-xl backdrop-blur lg:flex"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-gold-500/15 text-gold-300">
                <CalendarCheck size={17} />
              </span>
              <span>
                <span className="block text-[11px] uppercase tracking-wider text-slate-400">
                  Next event
                </span>
                <span className="block max-w-[160px] truncate font-display text-sm font-semibold text-white">
                  {nextEvent?.title ?? "Announcing soon"}
                </span>
              </span>
            </motion.div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
