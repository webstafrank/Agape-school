"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import Link from "next/link";
import { homeHero } from "@/content/home";
import { site } from "@/content/site";

// The "hidden" state is the same in both modes so server and client markup
// match; reduced motion only changes timing (instant, no stagger).
function variantsFor(reduce: boolean): { container: Variants; item: Variants } {
  return {
    container: {
      hidden: {},
      show: { transition: reduce ? {} : { staggerChildren: 0.15, delayChildren: 0.1 } },
    },
    item: {
      hidden: { opacity: 0, y: 28 },
      show: { opacity: 1, y: 0, transition: reduce ? { duration: 0 } : { duration: 0.7, ease: "easeOut" } },
    },
  };
}

export function Hero() {
  const reduce = useReducedMotion() ?? false;
  const { container, item: child } = variantsFor(reduce);

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate overflow-hidden bg-gradient-to-br from-primary-950 via-primary-900 to-primary-700 text-ink-inverse"
    >
      {/* Decorative warm glows; drift slowly unless reduced motion is requested. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-accent-400/25 blur-3xl sm:h-96 sm:w-96"
        animate={reduce ? undefined : { x: [0, -30, 0], y: [0, 20, 0] }}
        transition={reduce ? undefined : { duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-20 -z-10 h-72 w-72 rounded-full bg-primary-400/30 blur-3xl sm:h-96 sm:w-96"
        animate={reduce ? undefined : { x: [0, 25, 0], y: [0, -15, 0] }}
        transition={reduce ? undefined : { duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="mx-auto flex max-w-content flex-col items-start px-4 py-20 sm:px-6 sm:py-28 lg:py-36"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.p
          variants={child}
          className="text-sm font-bold uppercase tracking-widest text-accent-300"
        >
          {homeHero.eyebrow}
        </motion.p>

        <motion.h1
          id="hero-heading"
          variants={child}
          className="mt-4 max-w-3xl text-5xl font-bold leading-tight text-ink-inverse sm:text-6xl lg:text-7xl"
        >
          {site.motto}
        </motion.h1>

        <motion.p variants={child} className="mt-6 max-w-2xl text-lg text-primary-100 sm:text-xl">
          {homeHero.lead}
        </motion.p>

        <motion.div variants={child} className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link
            href={homeHero.primaryCta.href}
            className="rounded-full bg-accent-400 px-7 py-3 text-center text-base font-bold text-primary-950 shadow-lg transition-colors hover:bg-accent-300"
          >
            {homeHero.primaryCta.label}
          </Link>
          <Link
            href={homeHero.secondaryCta.href}
            className="rounded-full border-2 border-primary-200/60 px-7 py-3 text-center text-base font-bold text-ink-inverse transition-colors hover:border-ink-inverse hover:bg-primary-800"
          >
            {homeHero.secondaryCta.label}
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
