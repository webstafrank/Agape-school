"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { portals, staffPortal as copy, studentPortal } from "@/content/portal";
import { getAnnouncements, getClasses, getTimetable } from "@/lib/api";
import { schoolWeekday } from "@/lib/format";
import { useApi } from "@/lib/useApi";
import { AsyncView } from "./AsyncView";
import { PortalNav } from "./PortalNav";
import { usePortalUser } from "./PortalShell";
import { AnnouncementMeta } from "./StudentAnnouncements";
import { LessonList } from "./StudentTimetable";

const loadClasses = () => getClasses();
const loadTimetable = () => getTimetable();
const loadAnnouncements = () => getAnnouncements();

function Card({ id, title, children, footer }: { id: string; title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col rounded-2xl border border-surface-border bg-surface-muted p-6">
      <h2 id={id} className="text-xl font-bold">{title}</h2>
      <div className="mt-4 flex-1">{children}</div>
      {footer}
    </section>
  );
}

export function StaffDashboard() {
  const user = usePortalUser();
  const classes = useApi(loadClasses);
  const timetable = useApi(loadTimetable);
  const announcements = useApi(loadAnnouncements);
  const today = schoolWeekday();

  return (
    <>
      <header className="bg-gradient-to-br from-primary-950 via-primary-900 to-primary-700 text-ink-inverse">
        <div className="mx-auto max-w-content px-4 py-12 sm:px-6 sm:py-14">
          <p className="text-sm font-bold uppercase tracking-widest text-accent-300">{portals.staff.title}</p>
          <h1 className="mt-2 text-4xl font-bold text-ink-inverse sm:text-5xl">Welcome, {user.first_name || user.username}</h1>
          <p className="mt-4 text-lg text-primary-100">{portals.staff.lead}</p>
        </div>
      </header>
      <PortalNav links={copy.nav} label="Staff portal" />

      <div className="mx-auto grid w-full max-w-content gap-6 px-4 py-10 sm:px-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <Card id="card-classes" title={copy.classes.cardTitle}>
            <AsyncView state={classes} reload={classes.reload}>
              {(list) =>
                list.length === 0 ? (
                  <p className="text-ink-muted">{copy.classes.empty}</p>
                ) : (
                  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((cls) => (
                      <li key={cls.id} className="rounded-xl bg-surface p-5 shadow-sm">
                        <h3 className="text-lg font-bold">{cls.name}</h3>
                        <p className="text-sm text-ink-muted">
                          {cls.grade_label} · {copy.classes.students(cls.students.length)}
                        </p>
                        {cls.my_subjects.length === 0 ? (
                          <p className="mt-3 text-sm font-semibold text-accent-700">{copy.classes.classTeacher}</p>
                        ) : (
                          <ul className="mt-3 space-y-1">
                            {cls.my_subjects.map((s) => (
                              <li key={s.id} className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-primary-900">{s.name}</span>
                                <Link
                                  href={`/portal/staff/results?class=${cls.id}&subject=${s.id}`}
                                  className="shrink-0 text-sm font-bold text-primary-700 hover:underline"
                                >
                                  {copy.classes.enterResults}{" "}
                                  <span className="sr-only">{`for ${s.name}, ${cls.name}`}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )
              }
            </AsyncView>
          </Card>
        </div>

        <Card id="card-today" title={copy.today.cardTitle}>
          <AsyncView state={timetable} reload={timetable.reload}>
            {(entries) => {
              if (today > 5) return <p className="text-ink-muted">{copy.today.weekend}</p>;
              const mine = entries.filter((e) => e.day === today && e.teacher === user.id);
              if (mine.length === 0) return <p className="text-ink-muted">{copy.today.none}</p>;
              return <LessonList lessons={mine} showClass />;
            }}
          </AsyncView>
        </Card>

        <Card
          id="card-announcements"
          title={studentPortal.announcements.cardTitle}
          footer={
            <Link href="/portal/staff/announcements" className="mt-5 self-start font-bold text-primary-700 hover:underline">
              {copy.announcements.title} <span aria-hidden="true">→</span>
            </Link>
          }
        >
          <AsyncView state={announcements} reload={announcements.reload}>
            {(items) =>
              items.length === 0 ? (
                <p className="text-ink-muted">{copy.announcements.empty}</p>
              ) : (
                <ul className="space-y-3">
                  {items.slice(0, 3).map((a) => (
                    <li key={a.id} className="rounded-xl bg-surface px-4 py-3">
                      <AnnouncementMeta a={a} />
                      <p className="mt-1 font-bold text-primary-900">{a.title}</p>
                    </li>
                  ))}
                </ul>
              )
            }
          </AsyncView>
        </Card>
      </div>
    </>
  );
}
