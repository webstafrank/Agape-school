"use client";

import { useState, type FormEvent } from "react";
import { adminPortal } from "@/content/portal";
import { ApiError, adminApi, type Term } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { fieldClass, labelClass, panelClass, primaryButton, secondaryButton } from "@/lib/styles";
import { useApi } from "@/lib/useApi";
import { AsyncView } from "./AsyncView";
import { EmptyState } from "./EmptyState";

const copy = adminPortal.terms;
const load = () => adminApi.terms();

function errorText(err: unknown) {
  if (err instanceof ApiError && err.data && typeof err.data === "object") {
    const msgs = Object.values(err.data as Record<string, string[] | string>).flat();
    if (msgs.length) return msgs.join(" ");
  }
  return copy.failed;
}

export function AdminTerms() {
  const state = useApi(load);
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
      setMessage(null);
      state.reload();
    } catch (err) {
      setMessage(errorText(err));
    }
  }

  function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    void run(async () => {
      await adminApi.createTerm({
        year: Number(fd.get("year")),
        name: String(fd.get("name")),
        start_date: String(fd.get("start_date")),
        end_date: String(fd.get("end_date")),
        is_current: fd.get("is_current") === "on",
      });
      form.reset();
    });
  }

  function togglePublish(t: Term) {
    if (window.confirm(t.results_published ? copy.confirmUnpublish : copy.confirmPublish)) {
      void run(() => adminApi.updateTerm(t.id, { results_published: !t.results_published }));
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <section aria-labelledby="add-term-heading" className={`${panelClass} h-fit`}>
        <h2 id="add-term-heading" className="text-2xl font-bold">{copy.addTitle}</h2>
        <form onSubmit={onCreate} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="term-year" className={labelClass}>{copy.year}</label>
              <input id="term-year" name="year" type="number" required min={2000} max={2100} defaultValue={new Date().getFullYear()} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="term-name" className={labelClass}>{copy.name}</label>
              <select id="term-name" name="name" className={fieldClass}>
                {Object.entries(copy.termNames).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="term-start" className={labelClass}>{copy.start}</label>
              <input id="term-start" name="start_date" type="date" required className={fieldClass} />
            </div>
            <div>
              <label htmlFor="term-end" className={labelClass}>{copy.end}</label>
              <input id="term-end" name="end_date" type="date" required className={fieldClass} />
            </div>
          </div>
          <label className="flex items-center gap-2 font-semibold text-primary-900">
            <input type="checkbox" name="is_current" className="h-4 w-4" /> {copy.makeCurrent}
          </label>
          <button type="submit" className={primaryButton}>{copy.create}</button>
        </form>
      </section>

      <section aria-label={copy.title}>
        {message && <p role="alert" className="mb-4 font-semibold text-accent-800">{message}</p>}
        <AsyncView state={state} reload={state.reload}>
          {(terms) =>
            terms.length === 0 ? (
              <EmptyState>{copy.empty}</EmptyState>
            ) : (
              <ul className="space-y-4">
                {terms.map((t) => (
                  <li key={t.id} className={`rounded-2xl border bg-surface p-5 ${t.is_current ? "border-accent-400 ring-1 ring-accent-400" : "border-surface-border"}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-lg font-bold">{t.label}</h3>
                      {t.is_current && (
                        <span className="rounded-full bg-accent-400 px-3 py-0.5 text-xs font-bold text-primary-950">{copy.current}</span>
                      )}
                    </div>
                    <p className="text-sm text-ink-muted">{formatDate(t.start_date)} – {formatDate(t.end_date)}</p>
                    <p className={`mt-2 text-sm font-semibold ${t.results_published ? "text-primary-800" : "text-accent-800"}`}>
                      {t.results_published ? copy.published : copy.notPublished}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => togglePublish(t)} className={secondaryButton}>
                        {t.results_published ? copy.unpublish : copy.publish}<span className="sr-only">: {t.label}</span>
                      </button>
                      {!t.is_current && (
                        <button type="button" onClick={() => void run(() => adminApi.updateTerm(t.id, { is_current: true }))} className={secondaryButton}>
                          {copy.setCurrent}<span className="sr-only">: {t.label}</span>
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )
          }
        </AsyncView>
      </section>
    </div>
  );
}
