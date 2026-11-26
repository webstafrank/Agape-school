"use client";

import type { ReactNode } from "react";
import { profilePage as copy } from "@/content/portal";
import { getSchoolProfile, type SchoolProfile, type StaffDetails, type StudentDetails } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useApi } from "@/lib/useApi";
import { AsyncView } from "./AsyncView";
import { ChangePasswordForm } from "./ChangePasswordForm";

const loadProfile = () => getSchoolProfile();

function Card({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-surface-border bg-surface-muted p-6">
      <h2 id={id} className="text-xl font-bold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Label/value pairs; a missing value reads "Not recorded" rather than leaving a gap. */
function Details({ rows }: { rows: [label: string, value: ReactNode][] }) {
  return (
    <dl className="divide-y divide-surface-border">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4">
          <dt className="text-sm font-bold text-primary-900">{label}</dt>
          <dd className="break-words text-ink">
            {value === "" || value === null || value === undefined ? (
              <span className="text-ink-muted">{copy.notSet}</span>
            ) : (
              value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function StudentProfile({ profile }: { profile: SchoolProfile }) {
  const details = profile.details as StudentDetails | undefined;
  const cls = profile.school_class;
  return (
    <>
      <Card id="profile-personal" title={copy.personal.title}>
        <Details
          rows={[
            [copy.personal.name, profile.name],
            [copy.personal.admissionNo, profile.username],
            [copy.personal.dateOfBirth, details?.date_of_birth ? formatDate(details.date_of_birth) : ""],
          ]}
        />
      </Card>
      <Card id="profile-class" title={copy.school.title}>
        {cls ? (
          <Details
            rows={[
              [copy.school.className, cls.name],
              [copy.school.level, cls.grade_label],
              [copy.school.section, copy.school.sections[cls.section] ?? cls.section],
              [copy.school.classTeacher, cls.class_teacher_name ?? ""],
            ]}
          />
        ) : (
          <p className="text-ink-muted">{copy.school.noClass}</p>
        )}
      </Card>
      <Card id="profile-guardian" title={copy.guardian.title}>
        <Details
          rows={[
            [copy.guardian.name, details?.guardian_name ?? ""],
            [copy.guardian.phone, details?.guardian_phone ?? ""],
          ]}
        />
      </Card>
    </>
  );
}

function StaffProfile({ profile }: { profile: SchoolProfile }) {
  const details = profile.details as StaffDetails | undefined;
  const byClass = new Map<string, string[]>();
  for (const a of profile.assignments ?? []) byClass.set(a.class_name, [...(byClass.get(a.class_name) ?? []), a.subject_name]);
  const leads = profile.class_teacher_of ?? [];
  return (
    <>
      <Card id="profile-personal" title={copy.personal.title}>
        <Details
          rows={[
            [copy.personal.name, profile.name],
            [copy.personal.staffId, profile.username],
            [copy.personal.email, profile.email ?? ""],
          ]}
        />
      </Card>
      <Card id="profile-contact" title={copy.staff.title}>
        <Details
          rows={[
            [copy.staff.staffNumber, details?.staff_number ?? ""],
            [copy.staff.phone, details?.phone ?? ""],
          ]}
        />
      </Card>
      <div className="lg:col-span-2">
        <Card id="profile-teaching" title={copy.teaching.title}>
          {byClass.size === 0 && leads.length === 0 ? (
            <p className="text-ink-muted">{copy.teaching.none}</p>
          ) : (
            <>
              {leads.length > 0 && (
                <p className="mb-4">
                  <span className="font-bold text-primary-900">{copy.teaching.classTeacherOf}:</span>{" "}
                  {leads.map((c) => c.name).join(", ")}
                </p>
              )}
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[...byClass].map(([className, subjects]) => (
                  <li key={className} className="rounded-xl bg-surface p-4 shadow-sm">
                    <h3 className="font-bold">{className}</h3>
                    <p className="text-sm text-ink-muted">{subjects.join(", ")}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>
    </>
  );
}

/** The signed-in student's or staff member's own profile (read-only) plus a password change. */
export function ProfileView() {
  const profile = useApi(loadProfile);
  return (
    <AsyncView state={profile} reload={profile.reload}>
      {(p) => (
        <div className="grid gap-6 lg:grid-cols-2">
          {p.role === "staff" ? <StaffProfile profile={p} /> : <StudentProfile profile={p} />}
          <p role="note" className="rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-primary-900 lg:col-span-2">
            {copy.officeNote}
          </p>
          <div className="rounded-2xl border border-surface-border bg-surface p-6 lg:col-span-2 lg:max-w-xl">
            <ChangePasswordForm />
          </div>
        </div>
      )}
    </AsyncView>
  );
}
