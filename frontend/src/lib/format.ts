import { site } from "@/content/site";

const dateFmt = new Intl.DateTimeFormat(site.locale, {
  timeZone: site.timeZone,
  day: "numeric",
  month: "long",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat(site.locale, {
  timeZone: site.timeZone,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const dayFmt = new Intl.DateTimeFormat(site.locale, { timeZone: site.timeZone, day: "numeric" });
const monthFmt = new Intl.DateTimeFormat(site.locale, { timeZone: site.timeZone, month: "short" });

/** e.g. "24 November 2026" in the school's time zone. */
export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

/** e.g. "9:00 am" in the school's time zone. */
export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

/** Day number and short month, for calendar-style date badges. */
export function dateBadge(iso: string): { day: string; month: string } {
  const d = new Date(iso);
  return { day: dayFmt.format(d), month: monthFmt.format(d) };
}

/** "24 November 2026, 9:00 am – 1:00 pm" (end time optional). */
export function formatEventWhen(start: string, end?: string | null): string {
  const base = `${formatDate(start)}, ${formatTime(start)}`;
  if (!end) return base;
  return formatDate(end) === formatDate(start)
    ? `${base} – ${formatTime(end)}`
    : `${base} – ${formatDate(end)}, ${formatTime(end)}`;
}

/** Splits plain text on blank lines into paragraphs. */
export function toParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
