"use client";

import { studentPortal } from "@/content/portal";
import { getTimetable, type TimetableEntry } from "@/lib/api";
import { formatClock, schoolWeekday } from "@/lib/format";
import { useApi } from "@/lib/useApi";
import { AsyncView } from "./AsyncView";
import { EmptyState } from "./EmptyState";

const copy = studentPortal.timetable;
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const loadTimetable = () => getTimetable();

/** Lessons in time order. Shows teacher + room, or class + room for staff. */
export function LessonList({ lessons, showClass = false }: { lessons: TimetableEntry[]; showClass?: boolean }) {
  return (
    <ol className="space-y-2">
      {lessons.map((l) => (
        <li key={l.id} className="rounded-xl bg-surface px-4 py-3 shadow-sm">
          <p className="text-sm font-semibold text-accent-700">
            <time dateTime={l.start_time}>{formatClock(l.start_time)}</time> –{" "}
            <time dateTime={l.end_time}>{formatClock(l.end_time)}</time>
          </p>
          <p className="font-bold text-primary-900">{l.subject_name}</p>
          {(showClass || l.teacher_name || l.room) && (
            <p className="flex flex-wrap gap-x-2 text-sm text-ink-muted">
              {[showClass ? l.class_name : l.teacher_name, l.room].filter(Boolean).map((part) => (
                <span key={part} className="whitespace-nowrap">{part}</span>
              ))}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

export function StudentTimetable() {
  const state = useApi(loadTimetable);
  const today = schoolWeekday();

  return (
    <AsyncView state={state} reload={state.reload}>
      {(entries) => {
        if (entries.length === 0) return <EmptyState>{copy.empty}</EmptyState>;
        return (
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {DAYS.map((name, i) => {
              const day = i + 1;
              const lessons = entries.filter((e) => e.day === day);
              const isToday = day === today;
              return (
                <li
                  key={name}
                  aria-current={isToday ? "date" : undefined}
                  className={`rounded-2xl p-4 ${isToday ? "bg-primary-50 ring-2 ring-accent-400" : "bg-surface-muted"}`}
                >
                  <h2 className="mb-3 flex items-center justify-between text-lg font-bold">
                    {name}
                    {isToday && (
                      <span className="rounded-full bg-accent-400 px-2 py-0.5 text-xs font-bold text-primary-950">
                        {copy.today}
                      </span>
                    )}
                  </h2>
                  {lessons.length ? <LessonList lessons={lessons} /> : <p className="text-sm text-ink-muted">—</p>}
                </li>
              );
            })}
          </ul>
        );
      }}
    </AsyncView>
  );
}
