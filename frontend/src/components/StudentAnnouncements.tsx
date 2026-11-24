"use client";

import { studentPortal } from "@/content/portal";
import { getAnnouncements, type Announcement } from "@/lib/api";
import { formatDate, toParagraphs } from "@/lib/format";
import { useApi } from "@/lib/useApi";
import { AsyncView } from "./AsyncView";
import { EmptyState } from "./EmptyState";

const copy = studentPortal.announcements;
const loadAnnouncements = () => getAnnouncements();

export function AnnouncementMeta({ a }: { a: Announcement }) {
  return (
    <p className="text-sm font-semibold text-accent-700">
      {a.class_name ?? copy.wholeSchool} · <time dateTime={a.published_at}>{formatDate(a.published_at)}</time>
      {a.author_name && <span className="font-normal text-ink-muted"> · {a.author_name}</span>}
    </p>
  );
}

export function StudentAnnouncements() {
  const state = useApi(loadAnnouncements);
  return (
    <AsyncView state={state} reload={state.reload}>
      {(items) =>
        items.length === 0 ? (
          <EmptyState>{copy.empty}</EmptyState>
        ) : (
          <ul className="space-y-4">
            {items.map((a) => (
              <li key={a.id}>
                <article className="rounded-2xl border border-surface-border bg-surface p-6 shadow-sm">
                  <AnnouncementMeta a={a} />
                  <h2 className="mt-1 text-xl font-bold">{a.title}</h2>
                  {toParagraphs(a.body).map((p, i) => (
                    <p key={i} className="mt-3 text-ink">{p}</p>
                  ))}
                </article>
              </li>
            ))}
          </ul>
        )
      }
    </AsyncView>
  );
}
