import Image from "next/image";
import type { Slide } from "@/content/slides";

const placeholderTone: Record<"primary" | "accent" | "deep", string> = {
  primary: "from-primary-700 via-primary-600 to-primary-400",
  accent: "from-accent-600 via-accent-500 to-accent-300",
  deep: "from-primary-950 via-primary-800 to-accent-700",
};

/** Renders one slide's media, filling its (relatively positioned) parent. */
export function SlideMedia({ slide }: { slide: Slide }) {
  if (slide.kind === "image") {
    return (
      <Image
        src={slide.src}
        alt={slide.alt}
        fill
        // Slider spans the content width (max 72rem) with side padding.
        sizes="(min-width: 1200px) 1104px, calc(100vw - 2rem)"
        loading="lazy"
        draggable={false}
        className="object-cover"
      />
    );
  }

  if (slide.kind === "video") {
    // Lazy (preload="none"), never autoplays, muted by default.
    return (
      <video
        className="h-full w-full bg-primary-950 object-cover"
        src={slide.src}
        poster={slide.poster}
        aria-label={slide.alt}
        controls
        muted
        playsInline
        preload="none"
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${placeholderTone[slide.tone]}`}
    >
      <svg viewBox="0 0 24 24" className="h-16 w-16 text-ink-inverse/40 sm:h-24 sm:w-24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="10" r="2" />
        <path d="M21 16l-5-5-8 8" />
      </svg>
      <span className="absolute right-3 top-3 rounded-full bg-primary-950/50 px-3 py-1 text-xs font-semibold text-ink-inverse">
        Photo coming soon
      </span>
    </div>
  );
}
