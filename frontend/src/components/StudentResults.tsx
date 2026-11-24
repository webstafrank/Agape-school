"use client";

import { useState } from "react";
import { studentPortal } from "@/content/portal";
import { getResults } from "@/lib/api";
import { formatScore } from "@/lib/format";
import { groupByTerm } from "@/lib/results";
import { useApi } from "@/lib/useApi";
import { AsyncView } from "./AsyncView";
import { EmptyState } from "./EmptyState";
import { LevelBadge } from "./LevelBadge";

const copy = studentPortal.results;
const loadResults = () => getResults();

export function StudentResults() {
  const state = useApi(loadResults);
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <AsyncView state={state} reload={state.reload}>
      {(results) => {
        const terms = groupByTerm(results);
        if (terms.length === 0) return <EmptyState>{copy.empty}</EmptyState>;
        const current = terms.find((t) => t.term === selected) ?? terms[0];
        return (
          <section aria-labelledby="results-term-heading">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <label htmlFor="results-term" className="block text-sm font-bold text-primary-900">
                  {copy.termLabel}
                </label>
                <select
                  id="results-term"
                  value={current.term}
                  onChange={(e) => setSelected(Number(e.target.value))}
                  className="mt-1 rounded-lg border border-surface-border bg-surface px-3 py-2 text-ink shadow-sm"
                >
                  {terms.map((t) => (
                    <option key={t.term} value={t.term}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="rounded-xl bg-primary-50 px-4 py-2 text-primary-900">
                {copy.average}: <strong className="text-xl">{current.average}</strong>
              </p>
            </div>

            <h2 id="results-term-heading" className="mt-8 text-2xl font-bold">{current.label}</h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-surface-border">
              <table className="w-full text-left">
                <thead className="bg-surface-muted text-sm text-primary-900">
                  <tr>
                    <th scope="col" className="px-4 py-3">{copy.subject}</th>
                    <th scope="col" className="px-4 py-3 text-right">{copy.score}</th>
                    <th scope="col" className="px-4 py-3 text-right">{copy.level}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border bg-surface">
                  {current.results.map((r) => (
                    <tr key={r.id}>
                      <th scope="row" className="px-4 py-3 font-semibold text-primary-900">
                        {r.subject_name}
                        {r.comment && (
                          <span className="mt-1 block text-sm font-normal text-ink-muted">
                            <span className="sr-only">{copy.comment}: </span>
                            {r.comment}
                          </span>
                        )}
                      </th>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">{formatScore(r.score)}</td>
                      <td className="px-4 py-3 text-right">
                        <LevelBadge level={r.level} label={r.level_label} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      }}
    </AsyncView>
  );
}
