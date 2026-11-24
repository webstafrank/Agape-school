"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavLink } from "@/content/site";

/** Tabs between the pages of one portal. */
export function PortalNav({ links, label }: { links: NavLink[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="border-b border-surface-border bg-surface">
      <ul className="mx-auto flex max-w-content gap-1 overflow-x-auto px-4 sm:px-6">
        {links.map((link) => {
          const active = pathname === link.href;
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
