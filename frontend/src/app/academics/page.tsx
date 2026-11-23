import type { Metadata } from "next";
import { AcademicsNav } from "@/components/AcademicsNav";
import { DraftNotice } from "@/components/DraftNotice";
import { PageHeader } from "@/components/PageHeader";
import { Reveal } from "@/components/Reveal";
import { SectionCard } from "@/components/SectionCard";
import { academicSections, academicsOverview } from "@/content/academics";

export const metadata: Metadata = {
  title: academicsOverview.title,
  description: academicsOverview.lead,
};

export default function AcademicsPage() {
  return (
    <>
      <PageHeader title={academicsOverview.title} lead={academicsOverview.lead} eyebrow="Learning at Agape" />
      <AcademicsNav />
      {academicsOverview.draft && <DraftNotice />}

      <section aria-labelledby="sections-list-heading" className="mx-auto w-full max-w-content px-4 py-16 sm:px-6">
        <h2 id="sections-list-heading" className="text-3xl font-bold">Our three sections</h2>
        <ul className="mt-8 grid gap-6 md:grid-cols-3">
          {academicSections.map((section, i) => (
            <li key={section.slug}>
              <Reveal delay={i * 0.1} className="h-full">
                <SectionCard section={section} />
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="curriculum-heading" className="bg-surface-muted py-16">
        <div className="mx-auto grid max-w-content gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <Reveal>
            <h2 id="curriculum-heading" className="text-3xl font-bold">{academicsOverview.curriculum.heading}</h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-muted">{academicsOverview.curriculum.text}</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="text-3xl font-bold">{academicsOverview.approach.heading}</h2>
            <ul className="mt-4 space-y-4">
              {academicsOverview.approach.items.map((item) => (
                <li key={item.title} className="rounded-xl bg-surface p-5 shadow-sm">
                  <h3 className="text-lg font-bold">{item.title}</h3>
                  <p className="mt-1 text-ink-muted">{item.text}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>
    </>
  );
}
