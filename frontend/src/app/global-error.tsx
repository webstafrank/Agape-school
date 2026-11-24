"use client";

import { errorPages } from "@/content/errors";
import { site } from "@/content/site";
import "./globals.css";

const copy = errorPages.serverError;

/** Last resort when the root layout itself fails: must render its own <html>/<body>. */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
        <title>{`${copy.title} | ${site.name}`}</title>
        <main className="max-w-xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-accent-700">{site.name}</p>
          <h1 className="mt-3 text-4xl font-bold">{copy.title}</h1>
          <p className="mt-4 text-lg text-ink-muted">{copy.lead}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => unstable_retry()}
              className="rounded-full bg-primary-800 px-7 py-3 font-bold text-ink-inverse hover:bg-primary-700"
            >
              {copy.retry}
            </button>
            {/* Plain <a> on purpose: a full reload is the safest exit when the app shell itself failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="rounded-full border border-primary-300 px-7 py-3 font-bold text-primary-800">
              {copy.home}
            </a>
          </div>
          {error.digest && (
            <p className="mt-6 text-sm text-ink-muted">
              {copy.reference}: <code className="font-mono">{error.digest}</code>
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
