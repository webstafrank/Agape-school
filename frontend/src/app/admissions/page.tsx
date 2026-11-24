import type { Metadata } from "next";
import { DraftNotice } from "@/components/DraftNotice";
import { EnquiryForm } from "@/components/EnquiryForm";
import { PageHeader } from "@/components/PageHeader";
import { Reveal } from "@/components/Reveal";
import { admissions } from "@/content/admissions";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({ title: admissions.title, description: admissions.lead, path: "/admissions" });

export default function AdmissionsPage() {
  return (
    <>
      <PageHeader title={admissions.title} lead={admissions.lead} eyebrow="Join our community" />
      {admissions.draft && <DraftNotice />}

      <section aria-labelledby="steps-heading" className="mx-auto w-full max-w-content px-4 py-16 sm:px-6">
        <h2 id="steps-heading" className="text-3xl font-bold">{admissions.steps.heading}</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {admissions.steps.items.map((step, i) => (
            <li key={step.title}>
              <Reveal delay={i * 0.08} className="h-full">
                <div className="h-full rounded-2xl bg-surface-muted p-6">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-400 font-display text-lg font-bold text-primary-950"
                  >
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-xl font-bold">{step.title}</h3>
                  <p className="mt-2 text-ink-muted">{step.text}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="enquiry-heading" className="bg-surface-muted py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="rounded-2xl bg-surface p-6 shadow-lg sm:p-10">
            <h2 id="enquiry-heading" className="text-3xl font-bold">{admissions.form.heading}</h2>
            <div className="mt-6">
              <EnquiryForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
