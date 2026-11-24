"use client";

import { studentPortal } from "@/content/portal";
import { getFees, type FeeRecord } from "@/lib/api";
import { formatKes } from "@/lib/format";
import { useApi } from "@/lib/useApi";
import { AsyncView } from "./AsyncView";
import { EmptyState } from "./EmptyState";

const copy = studentPortal.fees;
const loadFees = () => getFees();

export function FeeSummary({ fee }: { fee: FeeRecord }) {
  const paidUp = Number(fee.balance) <= 0;
  return (
    <dl className="grid grid-cols-3 gap-3 text-center">
      <div className="rounded-xl bg-surface px-2 py-3">
        <dt className="text-xs font-bold uppercase tracking-wide text-ink-muted">{copy.due}</dt>
        <dd className="mt-1 font-bold tabular-nums text-primary-900">{formatKes(fee.amount_due)}</dd>
      </div>
      <div className="rounded-xl bg-surface px-2 py-3">
        <dt className="text-xs font-bold uppercase tracking-wide text-ink-muted">{copy.paid}</dt>
        <dd className="mt-1 font-bold tabular-nums text-primary-900">{formatKes(fee.amount_paid)}</dd>
      </div>
      <div className={`rounded-xl px-2 py-3 ${paidUp ? "bg-primary-50" : "bg-accent-100"}`}>
        <dt className="text-xs font-bold uppercase tracking-wide text-ink-muted">{copy.balance}</dt>
        <dd className={`mt-1 font-bold tabular-nums ${paidUp ? "text-primary-900" : "text-accent-900"}`}>
          {formatKes(fee.balance)}
        </dd>
      </div>
    </dl>
  );
}

export function StudentFees() {
  const state = useApi(loadFees);
  return (
    <AsyncView state={state} reload={state.reload}>
      {(fees) =>
        fees.length === 0 ? (
          <EmptyState>{copy.empty}</EmptyState>
        ) : (
          <>
            <ul className="grid gap-6 md:grid-cols-2">
              {fees.map((fee) => (
                <li key={fee.id} className="rounded-2xl bg-surface-muted p-5">
                  <h2 className="mb-4 text-xl font-bold">{fee.term_label}</h2>
                  <FeeSummary fee={fee} />
                  {Number(fee.balance) <= 0 && <p className="mt-3 font-semibold text-primary-800">{copy.fullyPaid}</p>}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-ink-muted">{copy.note}</p>
          </>
        )
      }
    </AsyncView>
  );
}
