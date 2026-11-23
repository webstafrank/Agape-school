"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Seconds to wait before animating (for staggering siblings). */
  delay?: number;
};

const variants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Fades + slides content up when it scrolls into view.
 *
 * Reduced-motion variant: content is shown immediately with no movement.
 * The rendered markup is identical either way (the server can't know the
 * user's preference), so only the animation timing changes — swapping the
 * markup would cause a hydration mismatch that leaves content invisible.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const reduce = useReducedMotion() ?? false;

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      {...(reduce
        ? { animate: "visible", transition: { duration: 0 } }
        : {
            whileInView: "visible",
            viewport: { once: true, amount: 0.2 },
            transition: { duration: 0.6, ease: "easeOut", delay },
          })}
    >
      {children}
    </motion.div>
  );
}
