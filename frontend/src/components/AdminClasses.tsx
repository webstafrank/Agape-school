"use client";

import { useCallback, useState, type FormEvent } from "react";
import { gradeOptions } from "@/content/admissions";
import { adminPortal } from "@/content/portal";
import { adminApi, type AdminClass, type AdminUser, type Subject } from "@/lib/api";
import { dangerButton, fieldClass, labelClass, panelClass, primaryButton, secondaryButton } from "@/lib/styles";
import { actionError } from "@/lib/errors";
import { useApi } from "@/lib/useApi";
import { AsyncView } from "./AsyncView";
import { EmptyState } from "./EmptyState";

const copy = adminPortal.classes;
const loadSetup = () => Promise.all([adminApi.classes(), adminApi.users({ role: "staff" }), adminApi.subjects()]);


const staffName = (u: AdminUser) => [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username;

export function AdminClasses() {
  const state = useApi(loadSetup);
  const [open, setOpen] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      await adminApi.createClass({
        name: String(fd.get("name")).trim(),
        grade: String(fd.get("grade")),
        year: Number(fd.get("year")),
        class_teacher: fd.get("class_teacher") ? Number(fd.get("class_teacher")) : null,
      });
      form.reset();
      setMessage(copy.saved);
      state.reload();
    } catch (err) {
      setMessage(actionError(err, copy.failed));
    }
  }

  return (
    <AsyncView state={state} reload={state.reload}>
      {([classes, staff, subjects]) => (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <section aria-labelledby="add-class-heading" className={`${panelClass} h-fit`}>
            <h2 id="add-class-heading" className="text-2xl font-bold">{copy.addTitle}</h2>
            <form onSubmit={onCreate} className="mt-4 space-y-4">
              <div>
                <label htmlFor="class-name" className={labelClass}>{copy.name}</label>
                <input id="class-name" name="name" required maxLength={40} placeholder={copy.namePlaceholder} className={fieldClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="class-grade" className={labelClass}>{copy.grade}</label>
                  <select id="class-grade" name="grade" required className={fieldClass}>
                    {gradeOptions.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="class-year" className={labelClass}>{copy.year}</label>
                  <input id="class-year" name="year" type="number" required min={2000} max={2100} defaultValue={new Date().getFullYear()} className={fieldClass} />
                </div>
              </div>
              <div>
                <label htmlFor="class-teacher" className={labelClass}>{copy.classTeacher}</label>
                <select id="class-teacher" name="class_teacher" defaultValue="" className={fieldClass}>
                  <option value="">{copy.none}</option>
                  {staff.map((u) => (
                    <option key={u.id} value={u.id}>{staffName(u)}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className={primaryButton}>{copy.create}</button>
            </form>
          </section>

          <section aria-label={copy.title}>
            <p role="status" aria-live="polite" className="min-h-6 font-semibold text-primary-800">{message}</p>
            {classes.length === 0 ? (
              <EmptyState>{copy.empty}</EmptyState>
            ) : (
              <ul className="space-y-4">
                {classes.map((c) => (
                  <li key={c.id} className="rounded-2xl border border-surface-border bg-surface p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold">{c.name} <span className="font-normal text-ink-muted">({c.year})</span></h3>
                        <p className="text-sm text-ink-muted">
                          {c.grade_label} · {copy.students(c.student_count)} · {copy.classTeacher}: {c.class_teacher_name ?? copy.none}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-expanded={open === c.id}
                        onClick={() => setOpen(open === c.id ? null : c.id)}
                        className={secondaryButton}
                      >
                        {open === c.id ? copy.close : copy.manage}<span className="sr-only">: {c.name}</span>
                      </button>
                    </div>
                    {open === c.id && (
                      <ClassDetail
                        cls={c}
                        staff={staff}
                        subjects={subjects}
                        onChanged={(msg) => {
                          setMessage(msg);
                          state.reload();
                        }}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </AsyncView>
  );
}

function ClassDetail({
  cls,
  staff,
  subjects,
  onChanged,
}: {
  cls: AdminClass;
  staff: AdminUser[];
  subjects: Subject[];
  onChanged: (message: string) => void;
}) {
  const load = useCallback(() => adminApi.assignments(cls.id), [cls.id]);
  const assignments = useApi(load);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>, after?: () => void) {
    setError(null);
    try {
      await action();
      after?.();
      assignments.reload();
      onChanged(copy.saved);
    } catch (err) {
      setError(actionError(err, copy.failed));
    }
  }

  return (
    <div className="mt-4 space-y-5 rounded-xl bg-surface-muted p-4">
      {error && <p role="alert" className="font-semibold text-accent-800">{error}</p>}
      <div className="max-w-sm">
        <label htmlFor={`ct-${cls.id}`} className={labelClass}>{copy.classTeacher}</label>
        <select
          id={`ct-${cls.id}`}
          defaultValue={cls.class_teacher ?? ""}
          onChange={(e) => void run(() => adminApi.updateClass(cls.id, { class_teacher: e.target.value ? Number(e.target.value) : null }))}
          className={fieldClass}
        >
          <option value="">{copy.none}</option>
          {staff.map((u) => (
            <option key={u.id} value={u.id}>{staffName(u)}</option>
          ))}
        </select>
      </div>

      <div>
        <h4 className="font-bold text-primary-900">{copy.teaching}</h4>
        <AsyncView state={assignments} reload={assignments.reload}>
          {(list) =>
            list.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">{copy.noTeaching}</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {list.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface px-3 py-2">
                    <span><strong>{a.subject_name}</strong> — {a.teacher_name}</span>
                    <button type="button" onClick={() => void run(() => adminApi.deleteAssignment(a.id))} className={dangerButton}>
                      {copy.remove}<span className="sr-only">: {a.subject_name}, {a.teacher_name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          }
        </AsyncView>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void run(() =>
              adminApi.createAssignment({ teacher: Number(fd.get("teacher")), school_class: cls.id, subject: Number(fd.get("subject")) }),
            );
          }}
          className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <div>
            <label htmlFor={`as-t-${cls.id}`} className={labelClass}>{copy.teacher}</label>
            <select id={`as-t-${cls.id}`} name="teacher" required className={fieldClass}>
              {staff.map((u) => (
                <option key={u.id} value={u.id}>{staffName(u)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`as-s-${cls.id}`} className={labelClass}>{copy.subject}</label>
            <select id={`as-s-${cls.id}`} name="subject" required className={fieldClass}>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={staff.length === 0 || subjects.length === 0} className={primaryButton}>
            {copy.assign}
          </button>
        </form>
      </div>

      <button
        type="button"
        onClick={() => {
          if (window.confirm(copy.confirmDelete)) void run(() => adminApi.deleteClass(cls.id));
        }}
        className={dangerButton}
      >
        {copy.deleteClass}
      </button>
    </div>
  );
}
