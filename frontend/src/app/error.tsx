"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ErrorPage } from "@/components/ErrorPage";
import { errorPages } from "@/content/errors";

const copy = errorPages.serverError;

/** Friendly 500: an unexpected error while rendering a page (the site header/footer stay). */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorPage eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead}>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="rounded-full bg-primary-800 px-7 py-3 font-bold text-ink-inverse hover:bg-primary-700"
        >
          {copy.retry}
        </button>
        <Link href="/" className="rounded-full border border-primary-300 px-7 py-3 font-bold text-primary-800 hover:bg-primary-50">
          {copy.home}
        </Link>
      </div>
      {/* Production hides the message (it could leak internals); the digest matches the server log. */}
      {error.digest && (
        <p className="mt-6 text-sm text-ink-muted">
          {copy.reference}: <code className="font-mono">{error.digest}</code>
        </p>
      )}
    </ErrorPage>
  );
}
