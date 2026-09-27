import { motion } from "framer-motion";

import { fadeUp, viewportOnce } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Seconds to wait before the entrance starts. */
  delay?: number;
}

/**
 * Reveal — one-time fade-up entrance when the element scrolls into view.
 * The only sanctioned wrapper for section-level entrances; respects
 * prefers-reduced-motion via MotionConfig.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  return (
    <motion.div
      className={cn(className)}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}
