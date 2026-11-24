"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { portals, studentPortal as copy } from "@/content/portal";
import { getAnnouncements, getFees, getResults, getSchoolProfile, getTimetable } from "@/lib/api";
import { formatScore, schoolWeekday } from "@/lib/format";
import { groupByTerm } from "@/lib/results";
import { useApi } from "@/lib/useApi";
import { AsyncView } from "./AsyncView";
import { LevelBadge } from "./LevelBadge";
import { PortalNav } from "./PortalNav";
import { usePortalUser } from "./PortalShell";
import { AnnouncementMeta } from "./StudentAnnouncements";
import { FeeSummary } from "./StudentFees";
import { LessonList } from "./StudentTimetable";

const loadProfile = () => getSchoolProfile();
const loadResults = () => getResults();
const loadTimetable = () => getTimetable();
const loadAnnouncements = () => getAnnouncements();
const loadFees = () => getFees();

function Card({ id, title, href, linkLabel, children }: {
  id: string; title: string; href: string; linkLabel: string; children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col rounded-2xl border border-surface-border bg-surface-muted p-6">
      <h2 id={id} className="text-xl font-bold">{title}</h2>
      <div className="mt-4 flex-1">{children}</div>
      <Link href={href} className="mt-5 self-start font-bold text-primary-700 hover:underline">
        {linkLabel} <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}

export function StudentDashboard() {
  const user = usePortalUser();
  const profile = useApi(loadProfile);
  const results = useApi(loadResults);
  const timetable = useApi(loadTimetable);
  const announcements = useApi(loadAnnouncements);
  const fees = useApi(loadFees);
  const today = schoolWeekday();

  const cls = profile.status === "ready" ? profile.data.school_class : undefined;

  return (
    <>
      <header className="bg-gradient-to-br from-primary-950 via-primary-900 to-primary-700 text-ink-inverse">
        <div className="mx-auto max-w-content px-4 py-12 sm:px-6 sm:py-14">
          <p className="text-sm font-bold uppercase tracking-widest text-accent-300">{portals.student.title}</p>
          <h1 className="mt-2 text-4xl font-bold text-ink-inverse sm:text-5xl">Welcome, {user.first_name || user.username}</h1>
          <p className="mt-4 text-lg text-primary-100">
            {cls ? `${cls.name} · ${cls.grade_label}` : cls === null ? copy.noClass : portals.student.lead}
          </p>
        </div>
      </header>
      <PortalNav links={copy.nav} label="Student portal" />

      <div className="mx-auto grid w-full max-w-content gap-6 px-4 py-10 sm:px-6 md:grid-cols-2">
        <Card id="card-results" title={copy.results.cardTitle} href="/portal/student/results" linkLabel={copy.results.viewAll}>
          <AsyncView state={results} reload={results.reload}>
            {(data) => {
              const latest = groupByTerm(data)[0];
              if (!latest) return <p className="text-ink-muted">{copy.results.empty}</p>;
              return (
                <>
                  <p className="text-ink-muted">
                    {latest.label} · {copy.results.average} <strong className="text-primary-900">{latest.average}</strong>
                  </p>
                  <ul className="mt-3 divide-y divide-surface-border">
                    {latest.results.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                        <span className="font-semibold text-primary-900">{r.subject_name}</span>
                        <span className="flex items-center gap-3">
                          <span className="font-bold tabular-nums">{formatScore(r.score)}</span>
                          <LevelBadge level={r.level} label={r.level_label} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              );
            }}
          </AsyncView>
        </Card>

        <Card id="card-today" title={copy.timetable.cardTitle} href="/portal/student/timetable" linkLabel={copy.timetable.viewAll}>
          <AsyncView state={timetable} reload={timetable.reload}>
            {(entries) => {
              if (entries.length === 0) return <p className="text-ink-muted">{copy.timetable.empty}</p>;
              if (today > 5) return <p className="text-ink-muted">{copy.timetable.weekend}</p>;
              const lessons = entries.filter((e) => e.day === today);
              return lessons.length ? <LessonList lessons={lessons} /> : <p className="text-ink-muted">{copy.timetable.noLessonsToday}</p>;
            }}
          </AsyncView>
        </Card>

        <Card id="card-announcements" title={copy.announcements.cardTitle} href="/portal/student/announcements" linkLabel={copy.announcements.viewAll}>
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

        <Card id="card-fees" title={copy.fees.cardTitle} href="/portal/student/fees" linkLabel={copy.fees.viewAll}>
          <AsyncView state={fees} reload={fees.reload}>
            {(records) => {
              const latest = records[0];
              if (!latest) return <p className="text-ink-muted">{copy.fees.empty}</p>;
              return (
                <>
                  <p className="mb-3 text-ink-muted">{latest.term_label}</p>
                  <FeeSummary fee={latest} />
                  {Number(latest.balance) <= 0 && <p className="mt-3 font-semibold text-primary-800">{copy.fees.fullyPaid}</p>}
                </>
              );
            }}
          </AsyncView>
        </Card>
      </div>
    </>
  );
}
