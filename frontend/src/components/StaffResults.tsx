"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { staffPortal } from "@/content/portal";
import { getClass, getResults, getSchoolProfile, getTerms } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { AsyncView } from "./AsyncView";
import { EmptyState } from "./EmptyState";
import { MarkSheet } from "./MarkSheet";

const copy = staffPortal.results;
const loadSetup = () => Promise.all([getSchoolProfile(), getTerms()]);

const selectClass =
  "mt-1 w-full rounded-lg border border-surface-border bg-surface px-3 py-2.5 text-ink shadow-sm sm:w-auto";

/** Picks class + subject + term (kept in the URL), then shows the mark sheet. */
export function StaffResults() {
  const setup = useApi(loadSetup);
  return (
    <AsyncView state={setup} reload={setup.reload}>
      {([profile, terms]) => <ResultsPicker assignments={profile.assignments ?? []} terms={terms} />}
    </AsyncView>
  );
}

function ResultsPicker({
  assignments,
  terms,
}: {
  assignments: NonNullable<Awaited<ReturnType<typeof getSchoolProfile>>["assignments"]>;
  terms: Awaited<ReturnType<typeof getTerms>>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  if (assignments.length === 0) return <EmptyState>{copy.noAssignments}</EmptyState>;
  if (terms.length === 0) return <EmptyState>{copy.noAssignments}</EmptyState>;

  const assignment =
    assignments.find((a) => String(a.school_class) === params.get("class") && String(a.subject) === params.get("subject")) ??
    assignments[0];
  const term =
    terms.find((t) => String(t.id) === params.get("term")) ?? terms.find((t) => t.is_current) ?? terms[0];

  function choose(next: { class?: number; subject?: number; term?: number }) {
    const q = new URLSearchParams({
      class: String(next.class ?? assignment.school_class),
      subject: String(next.subject ?? assignment.subject),
      term: String(next.term ?? term.id),
    });
    router.replace(`/portal/staff/results?${q}`);
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div>
          <label htmlFor="sheet-assignment" className="block text-sm font-bold text-primary-900">{copy.classSubject}</label>
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
        <div>
          <label htmlFor="sheet-term" className="block text-sm font-bold text-primary-900">{copy.term}</label>
          <select id="sheet-term" value={term.id} onChange={(e) => choose({ term: Number(e.target.value) })} className={selectClass}>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
                {t.is_current ? ` (${copy.current})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <h2 className="mt-8 text-2xl font-bold">
        {assignment.class_name} · {assignment.subject_name} · {term.label}
      </h2>
      <div className="mt-4">
        {/* Remount when the selection changes so the sheet starts from fresh data. */}
        <SheetLoader key={`${assignment.id}-${term.id}`} classId={assignment.school_class} subject={assignment.subject} term={term} />
      </div>
    </>
  );
}

function SheetLoader({ classId, subject, term }: { classId: number; subject: number; term: Awaited<ReturnType<typeof getTerms>>[number] }) {
  const load = useCallback(
    () => Promise.all([getClass(classId), getResults({ school_class: classId, subject, term: term.id })]),
    [classId, subject, term.id],
  );
  const state = useApi(load);
  return (
    <AsyncView state={state} reload={state.reload}>
      {([cls, results]) => <MarkSheet cls={cls} subject={subject} term={term} initialResults={results} />}
    </AsyncView>
  );
}
