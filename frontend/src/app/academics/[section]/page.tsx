import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AcademicsNav } from "@/components/AcademicsNav";
import { DraftNotice } from "@/components/DraftNotice";
import { PageHeader } from "@/components/PageHeader";
import { Reveal } from "@/components/Reveal";
import { academicSections, academicsOverview, getAcademicSection } from "@/content/academics";

type Props = { params: Promise<{ section: string }> };

// Only the three known sections exist; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return academicSections.map((s) => ({ section: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const section = getAcademicSection((await params).section);
  if (!section) return {};
  return { title: `${section.name} — Academics`, description: section.summary };
}

export default async function AcademicSectionPage({ params }: Props) {
  const section = getAcademicSection((await params).section);
  if (!section) notFound();

  return (
    <>
      <PageHeader title={section.name} lead={section.summary} eyebrow={`${section.levels} · ${section.ages}`} />
      <AcademicsNav current={section.slug} />
      {academicsOverview.draft && <DraftNotice />}

      <section aria-label="Introduction" className="mx-auto w-full max-w-content px-4 py-16 sm:px-6">
        <Reveal className="max-w-3xl">
          <p className="text-xl leading-relaxed text-ink">{section.intro}</p>
        </Reveal>
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {section.highlights.map((h, i) => (
            <li key={h.title}>
              <Reveal delay={i * 0.08} className="h-full">
                <div className="h-full rounded-2xl border-t-4 border-accent-400 bg-surface-muted p-6 shadow-sm">
                  <h2 className="text-xl font-bold">{h.title}</h2>
                  <p className="mt-2 text-ink-muted">{h.text}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="areas-heading" className="bg-surface-muted py-16">
        <div className="mx-auto grid max-w-content gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <Reveal>
            <h2 id="areas-heading" className="text-3xl font-bold">Learning areas</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {section.learningAreas.map((area) => (
                <li key={area} className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3 shadow-sm">
                  <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent-400" />
                  <span className="font-semibold text-primary-900">{area}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="text-3xl font-bold">A day at school</h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-muted">{section.dayAtSchool}</p>
            <h2 className="mt-10 text-3xl font-bold">Beyond the classroom</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {section.activities.map((a) => (
                <li key={a} className="rounded-full border border-primary-200 bg-surface px-4 py-2 text-sm font-semibold text-primary-800">
                  {a}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto w-full max-w-content px-4 py-16 text-center sm:px-6">
        <h2 className="text-3xl font-bold">Interested in {section.name}?</h2>
        <p className="mt-3 text-lg text-ink-muted">Book a visit or start an application today.</p>
        <Link
          href="/admissions"
          className="mt-6 inline-block rounded-full bg-primary-800 px-7 py-3 font-bold text-ink-inverse transition-colors hover:bg-primary-700"
        >
          Admissions
        </Link>
      </section>
    </>
  );
}
