"use client";

import Link from "next/link";
import { adminPortal, portals } from "@/content/portal";
import { API_BASE_URL, adminApi } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { AsyncView } from "./AsyncView";
import { PortalNav } from "./PortalNav";
import { usePortalUser } from "./PortalShell";

const copy = adminPortal.overview;
const load = () => adminApi.overview();

function Stat({ label, value, href, attention }: { label: string; value: number; href?: string; attention?: boolean }) {
  const body = (
    <>
      <span className={`block font-display text-4xl font-bold ${attention ? "text-accent-800" : "text-primary-900"}`}>{value}</span>
      <span className="mt-1 block text-sm font-semibold text-ink-muted">{label}</span>
      {href && attention && (
        <span className="mt-2 block text-sm font-bold text-primary-700">
          {copy.review} <span aria-hidden="true">→</span>
        </span>
      )}
    </>
  );
  const cls = `block h-full rounded-2xl p-5 ${attention ? "bg-accent-100" : "bg-surface-muted"}`;
  return href ? (
    <Link href={href} className={`${cls} transition-shadow hover:shadow-md`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function AdminOverview() {
  const user = usePortalUser();
  const state = useApi(load);
  return (
    <>
      <header className="bg-gradient-to-br from-primary-950 via-primary-900 to-primary-700 text-ink-inverse">
        <div className="mx-auto max-w-content px-4 py-12 sm:px-6 sm:py-14">
          <p className="text-sm font-bold uppercase tracking-widest text-accent-300">{portals.admin.title}</p>
          <h1 className="mt-2 text-4xl font-bold text-ink-inverse sm:text-5xl">Welcome, {user.first_name || user.username}</h1>
          <p className="mt-4 text-lg text-primary-100">{portals.admin.lead}</p>
        </div>
      </header>
      <PortalNav links={adminPortal.nav} label="Admin portal" />
      <div className="mx-auto w-full max-w-content px-4 py-10 sm:px-6">
        <AsyncView state={state} reload={state.reload}>
          {(o) => (
            <>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <li><Stat label={copy.pendingMedia} value={o.pending_media} href="/portal/admin/gallery" attention={o.pending_media > 0} /></li>
                <li><Stat label={copy.newEnquiries} value={o.new_enquiries} href="/portal/admin/enquiries" attention={o.new_enquiries > 0} /></li>
                <li><Stat label={copy.unplaced} value={o.unplaced_students} href="/portal/admin/users?role=student" attention={o.unplaced_students > 0} /></li>
                <li><Stat label={copy.students} value={o.students} href="/portal/admin/users?role=student" /></li>
                <li><Stat label={copy.staff} value={o.staff} href="/portal/admin/users?role=staff" /></li>
                <li><Stat label={copy.classes} value={o.classes} href="/portal/admin/classes" /></li>
              </ul>
              <section aria-labelledby="term-heading" className="mt-8 rounded-2xl border border-surface-border p-6">
                <h2 id="term-heading" className="text-xl font-bold">{copy.currentTerm}</h2>
                {o.current_term ? (
                  <p className="mt-2 text-ink-muted">
                    <strong className="text-primary-900">{o.current_term.label}</strong> ·{" "}
                    {o.current_term.results_published ? copy.published : copy.notPublished} ·{" "}
                    <Link href="/portal/admin/terms" className="font-bold text-primary-700 hover:underline">{adminPortal.terms.title}</Link>
                  </p>
                ) : (
                  <p className="mt-2 text-ink-muted">
                    {copy.noCurrentTerm}{" "}
                    <Link href="/portal/admin/terms" className="font-bold text-primary-700 hover:underline">{adminPortal.terms.title}</Link>
                  </p>
                )}
              </section>
            </>
          )}
        </AsyncView>
        <p className="mt-8 text-ink-muted">
          {adminPortal.djangoAdmin.text}{" "}
          <a href={`${API_BASE_URL}/admin/`} target="_blank" rel="noopener noreferrer" className="font-bold text-primary-700 hover:underline">
            {adminPortal.djangoAdmin.link} <span aria-hidden="true">↗</span>
          </a>
        </p>
      </div>
    </>
  );
}
