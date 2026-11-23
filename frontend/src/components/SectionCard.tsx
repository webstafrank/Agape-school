import Link from "next/link";
import type { AcademicSection } from "@/content/academics";

export function SectionCard({ section }: { section: AcademicSection }) {
  return (
    <Link
      href={`/academics/${section.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-surface-border bg-surface-muted p-6 shadow-sm transition-shadow hover:shadow-lg"
    >
      <span className="text-sm font-bold uppercase tracking-wide text-accent-700">{section.levels}</span>
      <h3 className="mt-2 text-2xl font-bold">{section.name}</h3>
      <p className="mt-3 flex-1 text-ink-muted">{section.summary}</p>
      <span className="mt-6 font-bold text-primary-700 group-hover:underline">
        Learn more <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
