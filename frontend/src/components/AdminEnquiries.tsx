"use client";

import { useCallback, useState } from "react";
import { adminPortal } from "@/content/portal";
import { adminApi, type AdminEnquiry, type EnquiryStatus } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { fieldClass, labelClass } from "@/lib/styles";
import { actionError } from "@/lib/errors";
import { useApi } from "@/lib/useApi";
import { AsyncView } from "./AsyncView";
import { EmptyState } from "./EmptyState";

const copy = adminPortal.enquiries;
const STATUSES: EnquiryStatus[] = ["new", "contacted", "closed"];

export function AdminEnquiries() {
  const [filter, setFilter] = useState<EnquiryStatus | "">("new");
  const load = useCallback(() => adminApi.enquiries(filter || undefined), [filter]);
  const state = useApi(load);
  const [message, setMessage] = useState<string | null>(null);

  async function setStatus(e: AdminEnquiry, status: EnquiryStatus) {
    try {
      await adminApi.setEnquiryStatus(e.id, status);
      setMessage(`${copy.saved} (${e.parent_name}: ${copy.statuses[status]})`);
      state.reload();
    } catch (err) {
      setMessage(actionError(err, copy.failed));
    }
  }

  return (
    <>
      <div className="max-w-xs">
        <label htmlFor="enq-filter" className={labelClass}>{copy.status}</label>
        <select id="enq-filter" value={filter} onChange={(e) => setFilter(e.target.value as EnquiryStatus | "")} className={fieldClass}>
          <option value="">{copy.all}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{copy.statuses[s]}</option>
          ))}
        </select>
      </div>
      <p role="status" aria-live="polite" className="mt-4 min-h-6 font-semibold text-primary-800">{message}</p>
      <div className="mt-2">
        <AsyncView state={state} reload={state.reload}>
          {(items) =>
            items.length === 0 ? (
              <EmptyState>{copy.empty}</EmptyState>
            ) : (
              <ul className="space-y-4">
                {items.map((e) => (
                  <li key={e.id} className="rounded-2xl border border-surface-border bg-surface p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="text-lg font-bold">{e.parent_name}</h2>
                        <p className="mt-1 flex flex-wrap gap-x-4 text-sm">
                          <a href={`tel:${e.phone.replace(/\s/g, "")}`} className="font-semibold text-primary-700 hover:underline">{e.phone}</a>
                          {e.email && <a href={`mailto:${e.email}`} className="break-all font-semibold text-primary-700 hover:underline">{e.email}</a>}
                        </p>
                      </div>
                      <div className="w-40">
                        <label htmlFor={`enq-${e.id}`} className="sr-only">{copy.status}: {e.parent_name}</label>
                        <select
                          id={`enq-${e.id}`}
                          value={e.status}
                          onChange={(ev) => void setStatus(e, ev.target.value as EnquiryStatus)}
                          className={`${fieldClass} !mt-0`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>{copy.statuses[s]}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                      <div><dt className="font-bold text-ink-muted">{copy.child}</dt><dd>{e.child_first_name}</dd></div>
                      <div><dt className="font-bold text-ink-muted">{copy.grade}</dt><dd>{e.grade_label}</dd></div>
                      <div><dt className="font-bold text-ink-muted">{copy.start}</dt><dd>{e.start_term || "—"}</dd></div>
                      <div><dt className="font-bold text-ink-muted">{copy.received}</dt><dd>{formatDate(e.created_at)}</dd></div>
                    </dl>
                    {e.message && <p className="mt-3 whitespace-pre-line rounded-lg bg-surface-muted p-3 text-ink">{e.message}</p>}
                  </li>
                ))}
              </ul>
            )
          }
        </AsyncView>
      </div>
    </>
  );
}
