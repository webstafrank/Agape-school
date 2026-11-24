import Link from "next/link";
import type { ReactNode } from "react";

/** Shared layout for the 404 and error pages. */
export function ErrorPage({ eyebrow, title, lead, children }: { eyebrow: string; title: string; lead: string; children: ReactNode }) {
  return (
    <section className="flex flex-1 items-center bg-surface-muted px-4 py-16 sm:py-24">
      <div className="mx-auto w-full max-w-2xl text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-accent-700">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-bold sm:text-5xl">{title}</h1>
        <p className="mt-4 text-lg text-ink-muted">{lead}</p>
        <div className="mt-8">{children}</div>
        <p className="mt-10 text-sm text-ink-muted">
          <Link href="/" className="font-display font-bold text-primary-800 hover:underline">
            Agape Education Center
          </Link>
        </p>
      </div>
    </section>
  );
}
