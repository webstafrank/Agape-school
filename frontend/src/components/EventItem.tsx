import Link from "next/link";
import type { PostSummary } from "@/lib/api";
import { dateBadge, formatEventWhen } from "@/lib/format";

/** Upcoming event row with a calendar-style date badge. */
export function EventItem({ event }: { event: PostSummary & { event_start: string } }) {
  const badge = dateBadge(event.event_start);
  return (
    <Link
      href={`/news/${event.slug}`}
      className="group flex gap-4 rounded-2xl bg-surface p-5 shadow-sm transition-shadow hover:shadow-lg sm:gap-6 sm:p-6"
    >
      <time
        dateTime={event.event_start}
        className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-800 text-ink-inverse"
      >
        <span className="font-display text-2xl font-bold leading-none">{badge.day}</span>
        <span className="mt-1 text-xs font-bold uppercase tracking-wide text-accent-300">{badge.month}</span>
      </time>
      <div className="min-w-0">
        <h3 className="text-xl font-bold group-hover:underline">{event.title}</h3>
        <p className="mt-1 text-sm font-semibold text-primary-700">
          {formatEventWhen(event.event_start, event.event_end)}
          {event.event_location && ` · ${event.event_location}`}
        </p>
        <p className="mt-2 text-ink-muted">{event.summary}</p>
      </div>
    </Link>
  );
}
