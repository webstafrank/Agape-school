import type { Metadata } from "next";
import { DraftNotice } from "@/components/DraftNotice";
import { PageHeader } from "@/components/PageHeader";
import { Reveal } from "@/components/Reveal";
import { about } from "@/content/about";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({ title: about.title, description: about.lead, path: "/about" });

export default function AboutPage() {
  return (
    <>
      <PageHeader title={about.title} lead={about.lead} eyebrow="Who we are" />
      {about.draft && <DraftNotice />}

      <section aria-labelledby="story-heading" className="mx-auto w-full max-w-content px-4 py-16 sm:px-6">
        <Reveal className="max-w-3xl">
          <h2 id="story-heading" className="text-3xl font-bold">{about.story.heading}</h2>
          {about.story.paragraphs.map((p) => (
            <p key={p} className="mt-4 text-lg leading-relaxed text-ink-muted">{p}</p>
          ))}
        </Reveal>
      </section>

      <section aria-label="Mission and vision" className="bg-surface-muted py-16">
        <div className="mx-auto grid max-w-content gap-6 px-4 sm:px-6 md:grid-cols-2">
          {[about.mission, about.vision].map((block, i) => (
            <Reveal key={block.heading} delay={i * 0.1} className="h-full">
              <div className="h-full rounded-2xl border-l-4 border-accent-400 bg-surface p-6 shadow-sm sm:p-8">
                <h2 className="text-2xl font-bold">{block.heading}</h2>
                <p className="mt-3 text-lg text-ink-muted">{block.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section aria-labelledby="values-heading" className="mx-auto w-full max-w-content px-4 py-16 sm:px-6">
        <Reveal>
          <h2 id="values-heading" className="text-3xl font-bold">{about.values.heading}</h2>
        </Reveal>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {about.values.items.map((value, i) => (
            <li key={value.name}>
              <Reveal delay={i * 0.06} className="h-full">
                <div className="h-full rounded-2xl border border-surface-border bg-surface-muted p-6">
                  <h3 className="text-xl font-bold">{value.name}</h3>
                  <p className="mt-2 text-ink-muted">{value.text}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="welcome-heading" className="bg-primary-900 py-16 text-ink-inverse">
        <Reveal className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 id="welcome-heading" className="text-3xl font-bold text-ink-inverse">{about.welcome.heading}</h2>
          <blockquote className="mt-6 border-l-4 border-accent-400 pl-5 font-display text-xl leading-relaxed text-primary-50">
            {about.welcome.text}
          </blockquote>
          <p className="mt-4 font-bold text-accent-300">— {about.welcome.signature}</p>
        </Reveal>
      </section>
    </>
  );
}
