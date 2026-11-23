"use client";

import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { useCallback, useEffect, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import type { Slide } from "@/content/slides";
import { SlideMedia } from "./SlideMedia";

const SWIPE_DISTANCE = 60; // px
const SWIPE_VELOCITY = 400; // px/s

/** Decides what a horizontal drag means: -1 = previous, 1 = next, 0 = stay. */
export function swipeDirection(offsetX: number, velocityX: number): -1 | 0 | 1 {
  if (offsetX < -SWIPE_DISTANCE || velocityX < -SWIPE_VELOCITY) return 1;
  if (offsetX > SWIPE_DISTANCE || velocityX > SWIPE_VELOCITY) return -1;
  return 0;
}

type MediaSliderProps = {
  slides: Slide[];
  label: string;
  /** Auto-advance interval. Default 6000ms. */
  intervalMs?: number;
};

type PlayMode = "auto" | "playing" | "paused";

const noopSubscribe = () => () => {};

/** false during SSR and hydration, true afterwards — keeps first render identical to the server's. */
function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function MediaSlider({ slides, label, intervalMs = 6000 }: MediaSliderProps) {
  // The server can't know the motion preference, so ignore it until hydrated.
  const hydrated = useHydrated();
  const prefersReduced = useReducedMotion() ?? false;
  const reduce = hydrated && prefersReduced;
  const [[index, direction], setPosition] = useState<[number, number]>([0, 0]);
  // "auto" = play unless the user prefers reduced motion; buttons override it.
  const [mode, setMode] = useState<PlayMode>("auto");
  const [held, setHeld] = useState(false); // hover / focus / touch

  const count = slides.length;
  const autoplay = count > 1 && (mode === "playing" || (mode === "auto" && !reduce));
  const advancing = autoplay && !held;

  const go = useCallback(
    (step: number) => setPosition(([i]) => [(i + step + count) % count, step]),
    [count],
  );
  const goTo = (target: number) => setPosition(([i]) => [target, target > i ? 1 : -1]);

  useEffect(() => {
    if (!advancing) return;
    const id = window.setInterval(() => go(1), intervalMs);
    return () => window.clearInterval(id);
  }, [advancing, go, intervalMs, index]);

  if (count === 0) return null;
  const slide = slides[index];

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
    else return;
    e.preventDefault();
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const step = swipeDirection(info.offset.x, info.velocity.x);
    if (step) go(step);
  };

  // Reduced motion: plain crossfade, no sliding.
  const offset = reduce ? 0 : 60;
  const variants = {
    enter: (dir: number) => ({ x: dir * offset, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir * -offset, opacity: 0 }),
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      className="relative"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false);
      }}
      onTouchStart={() => setHeld(true)}
      onTouchEnd={() => setHeld(false)}
      onKeyDown={onKeyDown}
    >
      <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-primary-950 shadow-xl sm:aspect-video lg:aspect-21/9">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={index}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${count}`}
            className="absolute inset-0 touch-pan-y"
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={reduce ? { duration: 0.2 } : { duration: 0.5, ease: "easeOut" }}
            drag={count > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={onDragEnd}
          >
            <SlideMedia slide={slide} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary-950/85 to-transparent px-5 pb-5 pt-16 sm:px-8 sm:pb-7">
              <p className="font-display text-xl font-semibold text-ink-inverse sm:text-2xl">{slide.caption}</p>
            </div>
          </motion.div>
        </AnimatePresence>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous slide"
              className="absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-surface/85 p-2 text-primary-900 shadow hover:bg-surface sm:block"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next slide"
              className="absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-surface/85 p-2 text-primary-900 shadow hover:bg-surface sm:block"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setMode(autoplay ? "paused" : "playing")}
            aria-label={autoplay ? "Pause slideshow" : "Play slideshow"}
            className="rounded-full border border-surface-border p-2 text-primary-800 hover:bg-surface-muted"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              {autoplay ? <path d="M7 5h3v14H7zM14 5h3v14h-3z" /> : <path d="M8 5v14l11-7z" />}
            </svg>
          </button>
          <ul className="flex items-center gap-1">
            {slides.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}: ${s.caption}`}
                  aria-current={i === index ? "true" : undefined}
                  className="flex h-8 w-8 items-center justify-center"
                >
                  <span
                    className={`block h-2.5 rounded-full transition-all ${
                      i === index ? "w-6 bg-primary-700" : "w-2.5 bg-surface-border hover:bg-primary-300"
                    }`}
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Announce changes only when the user drives them (WAI carousel pattern). */}
      <p className="sr-only" aria-live={advancing ? "off" : "polite"} aria-atomic="true" data-testid="slide-status">
        Slide {index + 1} of {count}: {slide.caption}
      </p>
    </section>
  );
}
