import Link from "next/link";
import { admissionsCta } from "@/content/home";
import { Reveal } from "./Reveal";

export function AdmissionsCta() {
  return (
    <section aria-labelledby="admissions-cta-heading" className="bg-accent-100 py-16">
      <Reveal className="mx-auto flex max-w-content flex-col items-start gap-6 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 id="admissions-cta-heading" className="text-3xl font-bold">
            {admissionsCta.heading}
          </h2>
          <p className="mt-2 text-lg text-ink-muted">{admissionsCta.body}</p>
        </div>
        <Link
          href={admissionsCta.cta.href}
          className="w-full shrink-0 whitespace-nowrap rounded-full bg-primary-800 px-7 py-3 text-center text-base font-bold text-ink-inverse transition-colors hover:bg-primary-700 md:w-auto"
        >
          {admissionsCta.cta.label}
        </Link>
      </Reveal>
    </section>
  );
}
