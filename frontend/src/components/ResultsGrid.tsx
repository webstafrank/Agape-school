"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { staffPortal } from "@/content/portal";
import { ApiError, saveResultGrid, type GridCell, type GridResult, type ResultGrid as Grid } from "@/lib/api";
import { actionError, describeError } from "@/lib/errors";
import { LevelBadge } from "./LevelBadge";

const copy = staffPortal.grid;

type Values = Record<string, string>;
type Status = { kind: "idle" | "saving" | "saved" | "error"; message?: string };

const cellKey = (student: number, subject: number) => `${student}:${subject}`;

function valuesFrom(grid: Grid): Values {
  const values: Values = {};
  for (const st of grid.students) for (const sub of grid.subjects) values[cellKey(st.id, sub.id)] = "";
  // "81.00" -> "81", "77.50" -> "77.5"
  for (const r of grid.results) values[cellKey(r.student, r.subject)] = String(Number(r.score));
  return values;
}

const SCORE = /^(\d{1,3}(\.\d{0,2})?|\.\d{1,2})$/;

/** null = blank (no result), undefined = not a valid score. */
function parseScore(value: string): number | null | undefined {
  const t = value.trim();
  if (t === "") return null;
  if (!SCORE.test(t)) return undefined;
  const n = Number(t);
  return n <= 100 ? n : undefined;
}

/** So "81", "81.0" and " 81 " all count as the saved "81". */
function normalise(value: string): string {
  const n = parseScore(value);
  return n === null ? "" : n === undefined ? value.trim() : String(n);
}

/** Mean to 1 decimal place, or blank when nothing is filled in. */
function average(scores: number[]): string {
  if (scores.length === 0) return "";
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  return (Math.round(mean * 10) / 10).toFixed(1);
}

/**
 * Spreadsheet-style score entry for one class and term: students down the
 * side, the teacher's subjects across the top. Keyboard first (Enter goes
 * down a column, arrows move between cells), and sends only the cells that
 * changed, all-or-nothing, in one save.
 */
export function ResultsGrid({ grid: initial, onDirtyChange }: { grid: Grid; onDirtyChange?: (dirty: boolean) => void }) {
  const [grid, setGrid] = useState(initial);
  const original = useMemo(() => valuesFrom(grid), [grid]);
  const [values, setValues] = useState<Values>(original);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const saveButton = useRef<HTMLButtonElement>(null);

  const { students, subjects, locked } = grid;
  const rows = students.length;
  const cols = subjects.length;
  const saving = status.kind === "saving";

  const saved = useMemo(() => new Map<string, GridResult>(grid.results.map((r) => [cellKey(r.student, r.subject), r])), [grid]);

  // Cells in reading order (row by row) that differ from what's saved.
  const changed: { student: number; subject: number; key: string }[] = [];
  const errors: Record<string, string> = {};
  for (const st of students) {
    for (const sub of subjects) {
      const key = cellKey(st.id, sub.id);
      if (normalise(values[key] ?? "") === original[key]) continue;
      changed.push({ student: st.id, subject: sub.id, key });
      if (parseScore(values[key]) === undefined) errors[key] = copy.invalidScore;
      else if (serverErrors[key]) errors[key] = serverErrors[key];
    }
  }
  const dirty = changed.length > 0;
  const errorKeys = Object.keys(errors);

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  // Warn before leaving the page with unsaved scores.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const filled = (key: string) => {
    const n = parseScore(values[key] ?? "");
    return typeof n === "number" ? n : undefined;
  };

  function focusCell(r: number, c: number) {
    const el = inputs.current[r * cols + c];
    if (!el) return;
    el.focus();
    el.select();
  }

  function focusKey(key: string) {
    const [student, subject] = key.split(":").map(Number);
    focusCell(
      students.findIndex((s) => s.id === student),
      subjects.findIndex((s) => s.id === subject),
    );
  }

  function update(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setServerErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (status.kind !== "idle") setStatus({ kind: "idle" });
  }

  function onCellKeyDown(e: KeyboardEvent<HTMLInputElement>, r: number, c: number, key: string) {
    const el = e.currentTarget;
    const len = el.value.length;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? len;
    const whole = start === 0 && end === len;
    switch (e.key) {
      case "Enter":
        // Never submit the form from a cell: Enter means "next student".
        e.preventDefault();
        if (e.shiftKey) {
          if (r > 0) focusCell(r - 1, c);
        } else if (r < rows - 1) focusCell(r + 1, c);
        else if (c < cols - 1) focusCell(0, c + 1);
        else saveButton.current?.focus();
        return;
      case "ArrowDown":
        if (r < rows - 1) {
          e.preventDefault();
          focusCell(r + 1, c);
        }
        return;
      case "ArrowUp":
        if (r > 0) {
          e.preventDefault();
          focusCell(r - 1, c);
        }
        return;
      case "ArrowLeft":
        if (c > 0 && (len === 0 || whole || end === 0)) {
          e.preventDefault();
          focusCell(r, c - 1);
        }
        return;
      case "ArrowRight":
        if (c < cols - 1 && (len === 0 || whole || start === len)) {
          e.preventDefault();
          focusCell(r, c + 1);
        }
        return;
      case "Escape":
        if (!locked && values[key] !== original[key]) {
          e.preventDefault();
          update(key, original[key]);
        }
        return;
    }
  }

  async function save() {
    if (saving || locked || !dirty) return;
    if (errorKeys.length) {
      setStatus({ kind: "error", message: copy.fixCount(errorKeys.length) });
      focusKey(errorKeys[0]);
      return;
    }
    const cells: GridCell[] = changed.map(({ student, subject, key }) => ({
      student,
      subject,
      score: parseScore(values[key]) as number | null,
    }));
    setStatus({ kind: "saving" });
    try {
      const fresh = await saveResultGrid({ school_class: grid.school_class.id, term: grid.term.id, cells });
      setGrid(fresh);
      setValues(valuesFrom(fresh));
      setServerErrors({});
      setStatus({ kind: "saved", message: copy.savedCount(cells.length) });
    } catch (err) {
      // Whatever went wrong, every typed score stays on screen.
      if (err instanceof ApiError && err.status === 400) {
        const cellErrors = (err.data as { cells?: (Record<string, string[] | string> | null)[] } | null)?.cells ?? [];
        const mapped: Record<string, string> = {};
        cellErrors.forEach((fieldErrors, i) => {
          const msg = Object.values(fieldErrors ?? {}).flat().join(" ");
          if (msg && changed[i]) mapped[changed[i].key] = msg;
        });
        setServerErrors(mapped);
        const n = Object.keys(mapped).length;
        setStatus({ kind: "error", message: n ? copy.fixCount(n) : actionError(err, copy.saveFailed) });
      } else {
        const session = describeError(err).kind === "session";
        setStatus({ kind: "error", message: session ? copy.sessionEnded : actionError(err, copy.saveFailed) });
      }
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void save();
  }

  function onFormKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      void save();
    }
  }

  const caption = copy.caption(grid.school_class.name, grid.term.label);
  if (rows === 0 || cols === 0) {
    return (
      <section aria-label={caption}>
        <h2 className="text-2xl font-bold">{caption}</h2>
        <p className="mt-4 text-ink-muted">{rows === 0 ? copy.noStudents : copy.noSubjects}</p>
      </section>
    );
  }

  const allScores: number[] = [];
  const subjectScores = subjects.map((sub) =>
    students.flatMap((st) => {
      const n = filled(cellKey(st.id, sub.id));
      if (n === undefined) return [];
      allScores.push(n);
      return [n];
    }),
  );

  let message = "";
  if (saving) message = copy.saving;
  else if (errorKeys.length) message = copy.fixCount(errorKeys.length);
  else if (status.kind === "error" || status.kind === "saved") message = status.message ?? "";
  else message = dirty ? copy.unsaved(changed.length) : copy.noChanges;
  const tone = errorKeys.length || status.kind === "error" ? "text-accent-800" : dirty ? "text-primary-800" : "text-ink-muted";
  const saveDisabled = !dirty || saving;

  return (
    // noValidate: our own per-cell messages replace the browser's tooltips.
    <form onSubmit={onSubmit} onKeyDown={onFormKeyDown} noValidate aria-label={caption}>
      {locked ? (
        <p role="note" className="mb-6 rounded-xl border border-accent-300 bg-accent-50 px-4 py-3 font-semibold text-accent-900">
          {copy.locked}
        </p>
      ) : (
        <div className="mb-4 space-y-3 text-sm text-ink-muted">
          <p>{copy.blankHint}</p>
          <ul aria-label={copy.keysTitle} className="flex flex-wrap gap-x-4 gap-y-1.5">
            {copy.keys.map(([k, what]) => (
              <li key={k}>
                <kbd className="rounded border border-surface-border bg-surface-muted px-1.5 py-0.5 font-sans text-xs font-bold text-ink">
                  {k}
                </kbd>{" "}
                {what}
              </li>
            ))}
          </ul>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label={copy.legendTitle}>
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="inline-block h-5 w-8 rounded border border-surface-border bg-surface" />
              {copy.legendSaved}
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="inline-block h-5 w-8 rounded border-2 border-dashed border-primary-500 bg-primary-50" />
              {copy.legendChanged}
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="inline-flex h-5 w-8 items-center justify-center rounded border-2 border-accent-700 bg-accent-50 text-xs font-bold text-accent-800">
                !
              </span>
              {copy.legendInvalid}
            </li>
          </ul>
        </div>
      )}

      {/* The table scrolls inside its own box, so the page never scrolls sideways on a phone. */}
      <div className="max-h-[70vh] max-w-full overflow-auto rounded-2xl border border-surface-border bg-surface">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <caption className="px-4 pt-4 pb-3 text-left font-display text-xl font-bold text-primary-900">{caption}</caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky top-0 left-0 z-30 border-b border-surface-border bg-surface-muted px-3 py-3 text-left font-bold text-primary-900"
              >
                {copy.student}
              </th>
              {subjects.map((sub, c) => (
                <th
                  key={sub.id}
                  scope="col"
                  className="sticky top-0 z-20 border-b border-surface-border bg-surface-muted px-2 py-3 text-center font-bold text-primary-900"
                >
                  {sub.name}
                  <span className="block text-xs font-normal text-ink-muted">{copy.entered(subjectScores[c].length, rows)}</span>
                </th>
              ))}
              <th
                scope="col"
                className="sticky top-0 z-20 border-b border-surface-border bg-surface-muted px-3 py-3 text-center font-bold text-primary-900"
              >
                {copy.average}
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((st, r) => {
              const rowScores: number[] = [];
              return (
                <tr key={st.id}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 max-w-40 border-b border-surface-border bg-surface px-3 py-2 text-left align-top sm:max-w-none"
                  >
                    <span className="block font-semibold text-primary-900">
                      <span aria-hidden="true" className="mr-1.5 inline-block w-5 text-right text-xs font-normal text-ink-muted tabular-nums">
                        {r + 1}
                      </span>
                      {st.name}
                    </span>
                    <span className="block pl-6.5 text-xs font-normal text-ink-muted">{st.username}</span>
                  </th>
                  {subjects.map((sub, c) => {
                    const key = cellKey(st.id, sub.id);
                    const value = values[key] ?? "";
                    const isChanged = normalise(value) !== original[key];
                    const error = errors[key];
                    const result = saved.get(key);
                    const n = filled(key);
                    if (n !== undefined) rowScores.push(n);
                    const noteId = `cell-note-${st.id}-${sub.id}`;
                    const state = error
                      ? "border-2 border-accent-700 bg-accent-50 font-bold text-accent-900"
                      : isChanged
                        ? "border-2 border-dashed border-primary-500 bg-primary-50 font-bold text-primary-900"
                        : locked
                          ? "border border-surface-border bg-surface-muted text-ink"
                          : "border border-surface-border bg-surface text-ink";
                    return (
                      <td key={sub.id} className="border-b border-surface-border px-2 py-2 align-top">
                        <div className="mx-auto flex w-28 flex-col items-center gap-1">
                          <input
                            ref={(el) => {
                              inputs.current[r * cols + c] = el;
                            }}
                            type="text"
                            inputMode="decimal"
                            enterKeyHint="next"
                            autoComplete="off"
                            spellCheck={false}
                            value={value}
                            readOnly={locked || saving}
                            aria-readonly={locked || undefined}
                            aria-label={copy.cellLabel(sub.name, st.name)}
                            aria-invalid={error ? true : undefined}
                            aria-describedby={error || isChanged ? noteId : undefined}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(e) => update(key, e.target.value)}
                            onKeyDown={(e) => onCellKeyDown(e, r, c, key)}
                            className={`min-h-11 w-full rounded-lg px-3 py-2 text-right text-base tabular-nums shadow-sm ${state}`}
                          />
                          {error ? (
                            <span id={noteId} className="text-center text-xs leading-snug font-semibold text-accent-800">
                              <span aria-hidden="true">! </span>
                              {error}
                            </span>
                          ) : isChanged ? (
                            <span id={noteId} className="text-xs font-semibold text-primary-700">
                              <span aria-hidden="true">✎ </span>
                              {copy.changedMark}
                            </span>
                          ) : result ? (
                            <LevelBadge level={result.level} label={result.level_label} />
                          ) : (
                            <span aria-hidden="true" className="text-xs text-ink-muted">
                              —
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="border-b border-surface-border px-3 py-2 text-center align-top">
                    <span className="inline-block min-h-11 py-2.5 text-base font-bold text-primary-900 tabular-nums">{average(rowScores)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-surface-muted">
              <th scope="row" className="sticky left-0 z-10 bg-surface-muted px-3 py-3 text-left font-bold text-primary-900">
                {copy.classAverage}
              </th>
              {subjectScores.map((scores, c) => (
                <td key={subjects[c].id} className="px-3 py-3 text-center text-base font-bold text-primary-900 tabular-nums">
                  {average(scores)}
                </td>
              ))}
              <td className="px-3 py-3 text-center text-base font-bold text-primary-900 tabular-nums">{average(allScores)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {!locked && errorKeys.length > 0 && (
        <div className="mt-4 rounded-xl border border-accent-300 bg-accent-50 px-4 py-3 text-sm text-accent-900">
          <p className="font-bold">{copy.fixListTitle}</p>
          <ul className="mt-1 space-y-1">
            {errorKeys.map((key) => {
              const [student, subject] = key.split(":").map(Number);
              const st = students.find((s) => s.id === student)!;
              const sub = subjects.find((s) => s.id === subject)!;
              return (
                <li key={key}>
                  <button type="button" onClick={() => focusKey(key)} className="text-left underline underline-offset-2 hover:text-accent-700">
                    {copy.cellLabel(sub.name, st.name)}
                  </button>
                  : {errors[key]}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!locked && (
        <div className="sticky bottom-0 z-30 mt-4 flex flex-col-reverse gap-3 rounded-xl border border-surface-border bg-surface px-4 py-3 shadow-md sm:flex-row sm:items-center sm:justify-between">
          <p role="status" aria-live="polite" className={`font-semibold ${tone}`}>
            {message}
          </p>
          <button
            ref={saveButton}
            type="submit"
            // aria-disabled (not disabled) so focus stays on the button after saving.
            aria-disabled={saveDisabled}
            className={`min-h-11 rounded-full bg-primary-800 px-8 py-2.5 font-bold text-ink-inverse transition-colors hover:bg-primary-700 ${
              saveDisabled ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            {saving ? copy.saving : copy.save}
          </button>
        </div>
      )}
    </form>
  );
}
