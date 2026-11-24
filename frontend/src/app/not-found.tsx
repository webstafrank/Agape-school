import type { Metadata } from "next";
import Link from "next/link";
import { ErrorPage } from "@/components/ErrorPage";
import { errorPages } from "@/content/errors";

const copy = errorPages.notFound;

export const metadata: Metadata = { title: "Page not found" };

/** 404 for unknown URLs and for notFound() (e.g. an unpublished news post). */
export default function NotFound() {
  return (
    <ErrorPage eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead}>
      <ul className="flex flex-wrap justify-center gap-3">
        {copy.links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="inline-block rounded-full border border-primary-300 bg-surface px-5 py-2.5 font-bold text-primary-800 hover:bg-primary-50"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </ErrorPage>
  );
}
