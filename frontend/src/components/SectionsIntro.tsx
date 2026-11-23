import Link from "next/link";
import { sectionsIntro } from "@/content/home";
import { Reveal } from "./Reveal";

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
          {sectionsIntro.sections.map((section, i) => (
            <li key={section.name}>
              <Reveal delay={i * 0.12} className="h-full">
                <Link
                  href={section.href}
                  className="group flex h-full flex-col rounded-2xl border border-surface-border bg-surface-muted p-6 shadow-sm transition-shadow hover:shadow-lg"
                >
                  <span className="text-sm font-bold uppercase tracking-wide text-accent-700">
                    {section.levels}
                  </span>
                  <h3 className="mt-2 text-2xl font-bold">{section.name}</h3>
                  <p className="mt-3 flex-1 text-ink-muted">{section.summary}</p>
                  <span className="mt-6 font-bold text-primary-700 group-hover:underline">
                    Learn more <span aria-hidden="true">→</span>
                  </span>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
