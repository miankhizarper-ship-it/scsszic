import type { Variants } from "framer-motion";

/**
 * Shared Framer Motion variants.
 *
 * House style: subtle, fast, purposeful (fade-up / slight scale / stagger).
 * Never apply these to every element — reserve for section entrances.
 * All animations respect `prefers-reduced-motion` via <MotionConfig reducedMotion="user" />.
 */

export const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

/** Primary entrance: fade + rise. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE_OUT_EXPO },
  },
};

/** Secondary entrance: smaller rise for dense groups. */
export const fadeUpSm: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE_OUT_EXPO },
  },
};

/** Slight scale-in for hero visuals. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: EASE_OUT_EXPO },
  },
};

/** Stagger container: children animate one after another. */
export const staggerContainer = (stagger = 0.08, delayChildren = 0): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren },
  },
});

/** Viewport config for whileInView reveals (fire once, slightly early). */
export const viewportOnce = { once: true, margin: "-64px" } as const;
