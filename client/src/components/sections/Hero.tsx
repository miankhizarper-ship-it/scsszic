import { motion } from "framer-motion";
import { ArrowRight, CalendarCheck, Users } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EVENTS } from "@/data/events";
import { STATS } from "@/data/stats";
import { ROUTES } from "@/routes/paths";
import { getUpcomingEvents } from "@/lib/eventSearch";
import { EASE_OUT_EXPO, fadeUp, fadeUpSm, scaleIn, staggerContainer } from "@/lib/motion";

const MEMBERS_STAT = STATS.find((stat) => stat.id === "members") ?? STATS[0];
const NEXT_EVENT = getUpcomingEvents(EVENTS)[0];

/**
 * Hero — the opening statement of the site.
 *
 * Deep navy surface, subtle technical grid, restrained gold accents, and a
 * code-editor visual that says "Computer Science" without stock photos.
 * Entrance animations run once on load (above the fold).
 */
export function Hero() {
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

          {/* ---------- Visual: code editor composition ---------- */}
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

            <div
              aria-hidden="true"
              className="relative overflow-hidden rounded-xl border border-white/10 bg-navy-900/90 shadow-2xl backdrop-blur"
            >
              {/* Editor chrome */}
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <span className="size-2.5 rounded-full bg-white/15" />
                <span className="size-2.5 rounded-full bg-white/15" />
                <span className="size-2.5 rounded-full bg-gold-500/60" />
                <span className="ml-3 font-mono text-xs text-slate-400">
                  scs-society.ts
                </span>
              </div>

              {/* Code body */}
              <pre className="overflow-x-auto px-5 py-5 font-mono text-[12.5px] leading-7 sm:text-[13px]">
                <code>
                  <span className="text-slate-500">{"// student community, in code"}</span>
                  {"\n"}
                  <span className="text-gold-300">const</span>{" "}
                  <span className="text-white">scs</span>{" "}
                  <span className="text-slate-400">=</span>{" "}
                  <span className="text-gold-300">new</span>{" "}
                  <span className="text-gold-200">Society</span>
                  <span className="text-slate-400">({"{"}</span>
                  {"\n  "}
                  <span className="text-navy-200">name</span>
                  <span className="text-slate-400">:</span>{" "}
                  <span className="text-navy-200">"Society of CS"</span>
                  <span className="text-slate-400">,</span>
                  {"\n  "}
                  <span className="text-navy-200">home</span>
                  <span className="text-slate-400">:</span>{" "}
                  <span className="text-navy-200">"SZIC · UoP"</span>
                  <span className="text-slate-400">,</span>
                  {"\n  "}
                  <span className="text-navy-200">members</span>
                  <span className="text-slate-400">:</span>{" "}
                  <span className="text-gold-200">150</span>
                  <span className="text-slate-400">,</span>
                  {"\n  "}
                  <span className="text-navy-200">focus</span>
                  <span className="text-slate-400">:</span>{" "}
                  <span className="text-slate-400">[</span>
                  <span className="text-navy-200">"learn"</span>
                  <span className="text-slate-400">,</span>{" "}
                  <span className="text-navy-200">"build"</span>
                  <span className="text-slate-400">,</span>{" "}
                  <span className="text-navy-200">"innovate"</span>
                  <span className="text-slate-400">],</span>
                  {"\n"}
                  <span className="text-slate-400">{"});"}</span>
                  {"\n\n"}
                  <span className="text-gold-300">while</span>{" "}
                  <span className="text-slate-400">(</span>
                  <span className="text-white">curious</span>
                  <span className="text-slate-400">) {"{"}</span>
                  {"\n  "}
                  <span className="text-white">scs</span>
                  <span className="text-slate-400">.</span>
                  <span className="text-gold-200">build</span>
                  <span className="text-slate-400">(</span>
                  <span className="text-navy-200">theFuture</span>
                  <span className="text-slate-400">);</span>
                  {"\n"}
                  <span className="text-slate-400">{"}"}</span>
                  {"\n"}
                  <span className="text-slate-500">{"// → community thriving"}</span>
                </code>
              </pre>

              {/* Editor status bar */}
              <div className="flex items-center justify-between border-t border-white/10 px-5 py-2.5 font-mono text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-success" />
                  main
                </span>
                <span>typescript · utf-8</span>
              </div>
            </div>

            {/* Floating stat chip — members */}
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
                  {MEMBERS_STAT.value}
                  {MEMBERS_STAT.suffix}
                </span>
                <span className="block text-[11px] text-slate-400">
                  {MEMBERS_STAT.description}
                </span>
              </span>
            </motion.div>

            {/* Floating chip — next event */}
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
                  {NEXT_EVENT?.title ?? "Announcing soon"}
                </span>
              </span>
            </motion.div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
