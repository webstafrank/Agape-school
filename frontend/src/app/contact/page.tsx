import type { Metadata } from "next";
import Link from "next/link";
import { DraftNotice } from "@/components/DraftNotice";
import { PageHeader } from "@/components/PageHeader";
import { Reveal } from "@/components/Reveal";
import { contact } from "@/content/contact";
import { site } from "@/content/site";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({ title: contact.title, description: contact.lead, path: "/contact" });

const mapQuery = encodeURIComponent(contact.map.query);
const mapEmbedUrl = `https://www.google.com/maps?q=${mapQuery}&output=embed`;
const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`;

const methods = [
  { label: "Call us", value: site.contact.phone, href: `tel:${site.contact.phone.replace(/\s/g, "")}` },
  { label: "Email us", value: site.contact.email, href: `mailto:${site.contact.email}` },
  { label: "Visit us", value: site.contact.address, href: directionsUrl, external: true },
];

export default function ContactPage() {
  return (
    <>
      <PageHeader title={contact.title} lead={contact.lead} eyebrow="Get in touch" />
      {contact.draft && <DraftNotice />}

      <section aria-label="Contact details" className="mx-auto w-full max-w-content px-4 py-16 sm:px-6">
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {methods.map((m, i) => (
            <li key={m.label}>
              <Reveal delay={i * 0.08} className="h-full">
                <a
                  href={m.href}
                  {...(m.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="group flex h-full flex-col rounded-2xl border-t-4 border-accent-400 bg-surface-muted p-6 shadow-sm transition-shadow hover:shadow-lg"
                >
                  <span className="text-sm font-bold uppercase tracking-wide text-accent-700">{m.label}</span>
                  <span className="mt-2 break-words text-xl font-bold text-primary-900 group-hover:underline">{m.value}</span>
                </a>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="map-heading" className="bg-surface-muted py-16">
        <div className="mx-auto grid max-w-content gap-10 px-4 sm:px-6 lg:grid-cols-3">
          <Reveal>
            <h2 className="text-3xl font-bold">{contact.hours.heading}</h2>
            <dl className="mt-6 space-y-4">
              {contact.hours.items.map((h) => (
                <div key={h.days} className="rounded-xl bg-surface px-4 py-3 shadow-sm">
                  <dt className="font-bold text-primary-900">{h.days}</dt>
                  <dd className="text-ink-muted">{h.time}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-8 text-lg text-ink-muted">{contact.admissionsPrompt.text}</p>
            <Link
              href="/admissions"
              className="mt-3 inline-block rounded-full bg-primary-800 px-6 py-3 font-bold text-ink-inverse transition-colors hover:bg-primary-700"
            >
              {contact.admissionsPrompt.linkLabel}
            </Link>
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-2">
            <h2 id="map-heading" className="text-3xl font-bold">{contact.map.heading}</h2>
            <div className="mt-6 aspect-[4/3] overflow-hidden rounded-2xl bg-surface shadow-sm sm:aspect-video">
              <iframe
                src={mapEmbedUrl}
                title={`Map showing ${site.name}`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-full w-full border-0"
              />
            </div>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block font-bold text-primary-700 hover:underline"
            >
              {contact.map.directionsLabel} <span aria-hidden="true">↗</span>
            </a>
          </Reveal>
        </div>
      </section>
    </>
  );
}
