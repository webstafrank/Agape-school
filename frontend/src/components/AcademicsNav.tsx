import Link from "next/link";
import { academicSections } from "@/content/academics";

/** Tabs linking the Academics overview and each section's page. */
export function AcademicsNav({ current }: { current?: string }) {
  const links = [
    { href: "/academics", label: "Overview", key: undefined as string | undefined },
    ...academicSections.map((s) => ({ href: `/academics/${s.slug}`, label: s.name, key: s.slug as string | undefined })),
  ];

  return (
    <nav aria-label="Academics sections" className="border-b border-surface-border bg-surface">
      <ul className="mx-auto flex max-w-content gap-1 overflow-x-auto px-4 sm:px-6">
        {links.map((link) => {
          const active = link.key === current;
          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`block border-b-4 px-3 py-4 text-sm font-bold transition-colors sm:px-4 ${
                  active
                    ? "border-accent-400 text-primary-900"
                    : "border-transparent text-ink-muted hover:border-primary-200 hover:text-primary-800"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
