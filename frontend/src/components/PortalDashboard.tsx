"use client";

import { portals, portalShell as copy } from "@/content/portal";
import { API_BASE_URL, type Role } from "@/lib/api";
import { usePortalUser } from "./PortalShell";

/** Dashboard landing page for a role: greeting plus feature tiles. */
export function PortalDashboard({ role }: { role: Role }) {
  const user = usePortalUser();
  const portal = portals[role];
  const greetingName = user.first_name || user.username;

  return (
    <>
      <header className="bg-gradient-to-br from-primary-950 via-primary-900 to-primary-700 text-ink-inverse">
        <div className="mx-auto max-w-content px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-sm font-bold uppercase tracking-widest text-accent-300">{portal.title}</p>
          <h1 className="mt-2 text-4xl font-bold text-ink-inverse sm:text-5xl">Welcome, {greetingName}</h1>
          <p className="mt-4 max-w-2xl text-lg text-primary-100">{portal.lead}</p>
        </div>
      </header>

      <section aria-label="Portal sections" className="mx-auto w-full max-w-content px-4 py-12 sm:px-6">
        <ul className="grid gap-6 sm:grid-cols-2">
          {portal.tiles.map((tile) => (
            <li key={tile.title} className="flex h-full flex-col rounded-2xl border border-surface-border bg-surface-muted p-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-bold">{tile.title}</h2>
                <span className="shrink-0 rounded-full bg-accent-100 px-3 py-1 text-xs font-bold text-accent-900">
                  {copy.comingSoon}
                </span>
              </div>
              <p className="mt-2 text-ink-muted">{tile.text}</p>
            </li>
          ))}
        </ul>

        {role === "admin" && (
          <p className="mt-10 text-ink-muted">
            {copy.adminTools}{" "}
            <a
              href={`${API_BASE_URL}/admin/`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-primary-700 hover:underline"
            >
              {copy.adminToolsLink} <span aria-hidden="true">↗</span>
            </a>
          </p>
        )}
      </section>
    </>
  );
}
