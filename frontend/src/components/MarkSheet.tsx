"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { staffPortal } from "@/content/portal";
import { ApiError, saveResultSheet, type Result, type SheetEntry, type StaffClass, type Term } from "@/lib/api";
import { actionError, describeError } from "@/lib/errors";
import { LevelBadge } from "./LevelBadge";

const copy = staffPortal.results;

type Row = { score: string; comment: string };
type RowErrors = Record<number, string>;

function rowsFrom(cls: StaffClass, results: Result[]): Record<number, Row> {
  const byStudent = new Map(results.map((r) => [r.student, r]));
  return Object.fromEntries(
    cls.students.map((s) => {
      const r = byStudent.get(s.id);
      return [s.id, { score: r ? String(Number(r.score)) : "", comment: r?.comment ?? "" }];
    }),
  );
}

function isValidScore(value: string): boolean {
  if (value.trim() === "") return true;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 100;
}

/**
 * One class's results for one subject and term. Saves only changed rows,
 * all-or-nothing, through the bulk sheet endpoint.
 */
export function MarkSheet({
  cls,
  subject,
  term,
  initialResults,
}: {
  cls: StaffClass;
  subject: number;
  term: Term;
  initialResults: Result[];
}) {
  const [saved, setSaved] = useState<Result[]>(initialResults);
  const original = useMemo(() => rowsFrom(cls, saved), [cls, saved]);
  const [rows, setRows] = useState<Record<number, Row>>(original);
  const [errors, setErrors] = useState<RowErrors>({});
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "saved" | "error"; message?: string }>({ kind: "idle" });

  const locked = term.results_published;
  const levels = new Map(saved.map((r) => [r.student, r]));
  const changed = cls.students.filter(
    (s) => rows[s.id].score.trim() !== original[s.id].score || rows[s.id].comment !== original[s.id].comment,
  );
  const dirty = changed.length > 0;

  // Warn before leaving the page with unsaved scores.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function update(student: number, patch: Partial<Row>) {
    setRows((prev) => ({ ...prev, [student]: { ...prev[student], ...patch } }));
    setStatus({ kind: "idle" });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const invalid: RowErrors = {};
    for (const s of changed) if (!isValidScore(rows[s.id].score)) invalid[s.id] = "Enter a score from 0 to 100.";
    setErrors(invalid);
    if (Object.keys(invalid).length) {
      setStatus({ kind: "error", message: copy.rowErrors });
      return;
    }

    const entries: SheetEntry[] = changed.map((s) => ({
      student: s.id,
      score: rows[s.id].score.trim() === "" ? null : Number(rows[s.id].score),
      comment: rows[s.id].comment.trim(),
    }));
    setStatus({ kind: "saving" });
    try {
      const result = await saveResultSheet({ school_class: cls.id, subject, term: term.id, entries });
      setSaved(result);
      setRows(rowsFrom(cls, result));
      setStatus({ kind: "saved", message: copy.saved });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const rowErrs = ((err.data as { entries?: Record<string, string[]>[] })?.entries ?? []);
        const mapped: RowErrors = {};
        rowErrs.forEach((fieldErrors, i) => {
          const msg = Object.values(fieldErrors ?? {}).flat().join(" ");
          if (msg) mapped[entries[i].student] = msg;
        });
        setErrors(mapped);
        setStatus({ kind: "error", message: copy.rowErrors });
      } else {
        const session = describeError(err).kind === "session";
        // Scores stay on screen either way; nothing typed is lost.
        setStatus({ kind: "error", message: session ? copy.sessionEnded : actionError(err, copy.saveFailed) });
      }
    }
  }

  if (cls.students.length === 0) return <p className="text-ink-muted">{copy.noStudents}</p>;

  return (
    // noValidate: our own per-row messages replace the browser's tooltips.
    <form onSubmit={onSubmit} noValidate aria-label={`${cls.name} results`}>
      {locked && (
        <p role="note" className="mb-6 rounded-xl border border-accent-300 bg-accent-50 px-4 py-3 font-semibold text-accent-900">
          {copy.locked}
        </p>
      )}
      {!locked && <p className="mb-4 text-sm text-ink-muted">{copy.blankHint}</p>}

      <div className="overflow-hidden rounded-2xl border border-surface-border">
        <div
          aria-hidden="true"
          className="hidden grid-cols-[minmax(0,1fr)_7rem_4rem_minmax(0,1.2fr)] gap-4 bg-surface-muted px-4 py-3 text-sm font-bold text-primary-900 md:grid"
        >
          <span>{copy.student}</span>
          <span>{copy.score}</span>
          <span>{copy.level}</span>
          <span>{copy.comment}</span>
        </div>
        <ul className="divide-y divide-surface-border bg-surface">
          {cls.students.map((s) => {
            const row = rows[s.id];
            const saved = levels.get(s.id);
            const error = errors[s.id];
            const isChanged = changed.includes(s);
            return (
              <li
                key={s.id}
                className={`grid grid-cols-[minmax(0,1fr)_6rem_3.5rem] items-center gap-x-3 gap-y-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_7rem_4rem_minmax(0,1.2fr)] md:gap-x-4 ${
                  error ? "bg-accent-50" : isChanged ? "bg-primary-50" : ""
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-primary-900">{s.name}</span>
                  <span className="block text-xs text-ink-muted">{s.username}</span>
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step={0.5}
                  value={row.score}
                  disabled={locked}
                  onChange={(e) => update(s.id, { score: e.target.value })}
                  aria-label={`Score for ${s.name}`}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `row-error-${s.id}` : undefined}
                  className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-right tabular-nums text-ink shadow-sm focus:border-primary-500 disabled:bg-surface-muted aria-[invalid=true]:border-accent-700"
                />
                <span className="text-center">
                  {saved && !isChanged ? <LevelBadge level={saved.level} label={saved.level_label} /> : <span aria-hidden="true">—</span>}
                </span>
                <input
                  type="text"
                  maxLength={300}
                  value={row.comment}
                  disabled={locked}
                  onChange={(e) => update(s.id, { comment: e.target.value })}
                  aria-label={`Comment for ${s.name}`}
                  placeholder={copy.comment}
                  className="col-span-3 w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-ink shadow-sm focus:border-primary-500 disabled:bg-surface-muted md:col-span-1"
                />
                {error && (
                  <p id={`row-error-${s.id}`} className="col-span-3 text-sm font-semibold text-accent-800 md:col-span-4">
                    {error}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {!locked && (
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p role="status" aria-live="polite" className={`font-semibold ${status.kind === "error" ? "text-accent-800" : "text-primary-800"}`}>
            {status.kind === "error" || status.kind === "saved" ? status.message : dirty ? copy.unsaved : ""}
          </p>
          <button
            type="submit"
            disabled={!dirty || status.kind === "saving"}
            className="rounded-full bg-primary-800 px-8 py-3 font-bold text-ink-inverse transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status.kind === "saving" ? copy.saving : copy.save}
          </button>
        </div>
      )}
    </form>
  );
}
