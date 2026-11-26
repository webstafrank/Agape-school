"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef } from "react";
import { staffPortal } from "@/content/portal";
import { getClass, getResultGrid, getResults, getSchoolProfile, getTerms } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { AsyncView } from "./AsyncView";
import { EmptyState } from "./EmptyState";
import { MarkSheet } from "./MarkSheet";
import { ResultsGrid } from "./ResultsGrid";

const copy = staffPortal.results;
const gridCopy = staffPortal.grid;
const loadSetup = () => Promise.all([getSchoolProfile(), getTerms()]);

const selectClass =
  "mt-1 min-h-11 w-full rounded-lg border border-surface-border bg-surface px-3 py-2.5 text-ink shadow-sm sm:w-auto";

type Assignments = NonNullable<Awaited<ReturnType<typeof getSchoolProfile>>["assignments"]>;
type Terms = Awaited<ReturnType<typeof getTerms>>;
type View = "table" | "comments";

/**
 * Staff results: the class results table by default (?view=table&class=&term=),
 * or the per-subject mark sheet with comments (?view=comments&class=&subject=&term=).
 */
export function StaffResults() {
  const setup = useApi(loadSetup);
  return (
    <AsyncView state={setup} reload={setup.reload}>
      {([profile, terms]) => <ResultsPicker assignments={profile.assignments ?? []} terms={terms} />}
    </AsyncView>
  );
}

function ResultsPicker({ assignments, terms }: { assignments: Assignments; terms: Terms }) {
  const router = useRouter();
  const params = useSearchParams();
  // Set by the table and the comments sheet; checked before anything that would throw typed work away.
  const dirty = useRef(false);
  const onDirtyChange = useCallback((d: boolean) => {
    dirty.current = d;
  }, []);

  if (assignments.length === 0 || terms.length === 0) return <EmptyState>{copy.noAssignments}</EmptyState>;

  const view: View = params.get("view") === "comments" ? "comments" : "table";
  const classes = [...new Map(assignments.map((a) => [a.school_class, a.class_name])).entries()].map(([id, name]) => ({ id, name }));
  const cls = classes.find((c) => String(c.id) === params.get("class")) ?? classes[0];
  const classAssignments = assignments.filter((a) => a.school_class === cls.id);
  const assignment = classAssignments.find((a) => String(a.subject) === params.get("subject")) ?? classAssignments[0];
  const term = terms.find((t) => String(t.id) === params.get("term")) ?? terms.find((t) => t.is_current) ?? terms[0];

  function choose(next: { view?: View; class?: number; subject?: number; term?: number }) {
    if (dirty.current && !window.confirm(gridCopy.confirmLeave)) return;
    const v = next.view ?? view;
    const classId = next.class ?? cls.id;
    const q = new URLSearchParams({ view: v, class: String(classId) });
    if (v === "comments") {
      const subject = next.subject ?? (classId === assignment.school_class ? assignment.subject : undefined);
      const a = assignments.find((x) => x.school_class === classId && x.subject === subject) ?? assignments.find((x) => x.school_class === classId)!;
      q.set("subject", String(a.subject));
    }
    q.set("term", String(next.term ?? term.id));
    router.replace(`/portal/staff/results?${q}`);
  }

  const termPicker = (
    <div>
      <label htmlFor="sheet-term" className="block text-sm font-bold text-primary-900">
        {copy.term}
      </label>
      <select id="sheet-term" value={term.id} onChange={(e) => choose({ term: Number(e.target.value) })} className={selectClass}>
        {terms.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
            {t.is_current ? ` (${copy.current})` : ""}
          </option>
        ))}
      </select>
    </div>
  );

  const tab = (v: View, label: string) => (
    <button
      type="button"
      aria-pressed={view === v}
      onClick={() => view !== v && choose({ view: v })}
      className={`min-h-11 rounded-full px-5 py-2 text-sm font-bold transition-colors motion-reduce:transition-none ${
        view === v ? "bg-primary-800 text-ink-inverse" : "text-primary-800 hover:bg-primary-50"
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      <div
        role="group"
        aria-label={gridCopy.viewLabel}
        className="mb-6 inline-flex flex-wrap gap-1 rounded-full border border-surface-border bg-surface p-1"
      >
        {tab("table", gridCopy.tableView)}
        {tab("comments", gridCopy.commentsView)}
      </div>

      {view === "table" ? (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div>
              <label htmlFor="grid-class" className="block text-sm font-bold text-primary-900">
                {gridCopy.classLabel}
              </label>
              <select id="grid-class" value={cls.id} onChange={(e) => choose({ class: Number(e.target.value) })} className={selectClass}>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {termPicker}
          </div>
          <div className="mt-8">
            {/* Remount when the selection changes so the table starts from fresh data. */}
            <GridLoader key={`${cls.id}-${term.id}`} classId={cls.id} termId={term.id} onDirtyChange={onDirtyChange} />
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div>
              <label htmlFor="sheet-assignment" className="block text-sm font-bold text-primary-900">
                {copy.classSubject}
              </label>
              <select
                id="sheet-assignment"
                value={assignment.id}
                onChange={(e) => {
                  const a = assignments.find((x) => x.id === Number(e.target.value))!;
                  choose({ class: a.school_class, subject: a.subject });
                }}
                className={selectClass}
              >
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.class_name} — {a.subject_name}
                  </option>
                ))}
              </select>
            </div>
            {termPicker}
          </div>
          <h2 className="mt-8 text-2xl font-bold">
            {assignment.class_name} · {assignment.subject_name} · {term.label}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{gridCopy.commentsHint}</p>
          <div className="mt-4">
            <SheetLoader
              key={`${assignment.id}-${term.id}`}
              classId={assignment.school_class}
              subject={assignment.subject}
              term={term}
              onDirtyChange={onDirtyChange}
            />
          </div>
        </>
      )}
    </>
  );
}

function GridLoader({ classId, termId, onDirtyChange }: { classId: number; termId: number; onDirtyChange: (dirty: boolean) => void }) {
  const load = useCallback(() => getResultGrid(classId, termId), [classId, termId]);
  const state = useApi(load);
  return (
    <AsyncView state={state} reload={state.reload}>
      {(grid) => <ResultsGrid grid={grid} onDirtyChange={onDirtyChange} />}
    </AsyncView>
  );
}

function SheetLoader({
  classId,
  subject,
  term,
  onDirtyChange,
}: {
  classId: number;
  subject: number;
  term: Terms[number];
  onDirtyChange: (dirty: boolean) => void;
}) {
  const load = useCallback(
    () => Promise.all([getClass(classId), getResults({ school_class: classId, subject, term: term.id })]),
    [classId, subject, term.id],
  );
  const state = useApi(load);
  return (
    <AsyncView state={state} reload={state.reload}>
      {([cls, results]) => (
        <MarkSheet cls={cls} subject={subject} term={term} initialResults={results} onDirtyChange={onDirtyChange} />
      )}
    </AsyncView>
  );
}
