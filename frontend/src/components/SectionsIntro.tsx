import { academicSections } from "@/content/academics";
import { sectionsIntro } from "@/content/home";
import { Reveal } from "./Reveal";
import { SectionCard } from "./SectionCard";

export function SectionsIntro() {
  return (
    <section aria-labelledby="sections-heading" className="bg-surface py-16 sm:py-24">
      <div className="mx-auto max-w-content px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <h2 id="sections-heading" className="text-3xl font-bold sm:text-4xl">
            {sectionsIntro.heading}
          </h2>
          <p className="mt-4 text-lg text-ink-muted">{sectionsIntro.lead}</p>
        </Reveal>

        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          {academicSections.map((section, i) => (
            <li key={section.slug}>
              <Reveal delay={i * 0.12} className="h-full">
                <SectionCard section={section} />
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
