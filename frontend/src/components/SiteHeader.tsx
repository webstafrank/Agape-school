"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { mainNav, portalLink, site } from "@/content/site";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);

  const linkClass = (href: string) =>
    `rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
      isActive(pathname, href)
        ? "text-accent-300"
        : "text-primary-50 hover:bg-primary-800 hover:text-ink-inverse"
    }`;

  return (
    <header className="sticky top-0 z-40 bg-primary-900 text-ink-inverse shadow-md">
      <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="font-display text-lg font-bold leading-tight text-ink-inverse sm:text-xl"
          onClick={() => setOpen(false)}
        >
          {site.name}
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {mainNav.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={linkClass(link.href)}
                  aria-current={isActive(pathname, link.href) ? "page" : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="ml-2">
              <Link
                href={portalLink.href}
                className="rounded-full bg-accent-400 px-4 py-2 text-sm font-bold text-primary-950 transition-colors hover:bg-accent-300"
              >
                {portalLink.label}
              </Link>
            </li>
          </ul>
        </nav>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md p-2 text-ink-inverse hover:bg-primary-800 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          >
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="border-t border-primary-800 lg:hidden"
        >
          <ul className="mx-auto flex max-w-content flex-col gap-1 px-4 py-3 sm:px-6">
            {mainNav.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`block ${linkClass(link.href)} text-base`}
                  aria-current={isActive(pathname, link.href) ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="pt-2">
              <Link
                href={portalLink.href}
                className="block rounded-full bg-accent-400 px-4 py-2 text-center text-base font-bold text-primary-950 hover:bg-accent-300"
                onClick={() => setOpen(false)}
              >
                {portalLink.label}
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
