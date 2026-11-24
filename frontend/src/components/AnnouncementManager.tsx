"use client";

import { useState, type FormEvent } from "react";
import { adminPortal, staffPortal } from "@/content/portal";
import {
  ApiError,
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  getClasses,
  updateAnnouncement,
  type Announcement,
  type StaffClass,
} from "@/lib/api";
import { toParagraphs } from "@/lib/format";
import { useApi } from "@/lib/useApi";
import { AsyncView } from "./AsyncView";
import { EmptyState } from "./EmptyState";
import { AnnouncementMeta } from "./StudentAnnouncements";

const copy = staffPortal.announcements;
const fieldClass =
  "mt-1 block w-full rounded-lg border border-surface-border bg-surface px-3 py-2.5 text-ink shadow-sm focus:border-primary-500";
const loadClasses = () => getClasses();
const loadList = () => getAnnouncements();

/**
 * Post, edit and delete announcements.
 * Staff: own classes only, and only their own posts (the API enforces this).
 * Admin (`schoolWide`, `manageAll`): can also post to the whole school and manage every post.
 */
export function AnnouncementManager({ schoolWide = false, manageAll = false }: { schoolWide?: boolean; manageAll?: boolean }) {
  const classes = useApi(loadClasses);
  const list = useApi(loadList);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = (message: string) => {
    setNotice(message);
    setEditing(null);
    list.reload();
  };

  async function onDelete(a: Announcement) {
    if (!window.confirm(copy.confirmDelete)) return;
    try {
      await deleteAnnouncement(a.id);
      refresh(copy.deleted);
    } catch {
      setNotice(copy.failed);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <section aria-labelledby="compose-heading" className="h-fit rounded-2xl bg-surface-muted p-6">
        <h2 id="compose-heading" className="text-2xl font-bold">{editing ? copy.editTitle : copy.formTitle}</h2>
        <AsyncView state={classes} reload={classes.reload}>
          {(list) =>
            list.length === 0 && !schoolWide ? (
              <p className="mt-4 text-ink-muted">{copy.noClasses}</p>
            ) : (
              <ComposeForm
                key={editing?.id ?? "new"}
                classes={list}
                schoolWide={schoolWide}
                editing={editing}
                onCancel={() => setEditing(null)}
                onDone={refresh}
              />
            )
          }
        </AsyncView>
      </section>

      <section aria-labelledby="list-heading">
        <h2 id="list-heading" className="text-2xl font-bold">{copy.listTitle}</h2>
        <p role="status" aria-live="polite" className="mt-2 min-h-6 font-semibold text-primary-800">{notice}</p>
        <div className="mt-2">
          <AsyncView state={list} reload={list.reload}>
            {(items) =>
              items.length === 0 ? (
                <EmptyState>{copy.empty}</EmptyState>
              ) : (
                <ul className="space-y-4">
                  {items.map((a) => (
                    <li key={a.id}>
                      <article className={`rounded-2xl border bg-surface p-5 shadow-sm ${editing?.id === a.id ? "border-accent-400" : "border-surface-border"}`}>
                        <AnnouncementMeta a={a} />
                        <h3 className="mt-1 text-lg font-bold">{a.title}</h3>
                        {toParagraphs(a.body).map((p, i) => (
                          <p key={i} className="mt-2 text-ink">{p}</p>
                        ))}
                        {(a.is_mine || manageAll) && (
                          <div className="mt-4 flex gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setNotice(null);
                                setEditing(a);
                              }}
                              className="rounded-full border border-primary-300 px-4 py-1.5 text-sm font-bold text-primary-800 hover:bg-primary-50"
                            >
                              {copy.edit}<span className="sr-only">: {a.title}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => void onDelete(a)}
                              className="rounded-full border border-accent-300 px-4 py-1.5 text-sm font-bold text-accent-800 hover:bg-accent-50"
                            >
                              {copy.delete}<span className="sr-only">: {a.title}</span>
                            </button>
                          </div>
                        )}
                      </article>
                    </li>
                  ))}
                </ul>
              )
            }
          </AsyncView>
        </div>
      </section>
    </div>
  );
}

function ComposeForm({
  classes,
  schoolWide,
  editing,
  onCancel,
  onDone,
}: {
  classes: StaffClass[];
  schoolWide: boolean;
  editing: Announcement | null;
  onCancel: () => void;
  onDone: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const data = {
      title: String(fd.get("title") ?? "").trim(),
      body: String(fd.get("body") ?? "").trim(),
      // "" = whole school (admins only; the API refuses it for staff).
      school_class: fd.get("school_class") ? Number(fd.get("school_class")) : null,
    };
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        await updateAnnouncement(editing.id, data);
        onDone(copy.updated);
      } else {
        await createAnnouncement(data);
        form.reset();
        onDone(copy.posted);
      }
    } catch (err) {
      const detail = err instanceof ApiError ? (err.data as { detail?: string })?.detail : undefined;
      setError(detail ?? copy.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      {error && (
        <p role="alert" className="rounded-lg border border-accent-300 bg-accent-50 px-4 py-3 font-semibold text-accent-900">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="ann-class" className="block text-sm font-bold text-primary-900">{copy.classLabel}</label>
        <select
          id="ann-class"
          name="school_class"
          defaultValue={editing ? (editing.school_class ?? "") : schoolWide ? "" : classes[0].id}
          className={fieldClass}
        >
          {schoolWide && <option value="">{adminPortal.announcements.wholeSchool}</option>}
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="ann-title" className="block text-sm font-bold text-primary-900">{copy.titleLabel}</label>
        <input id="ann-title" name="title" required maxLength={160} defaultValue={editing?.title} className={fieldClass} />
      </div>
      <div>
        <label htmlFor="ann-body" className="block text-sm font-bold text-primary-900">{copy.bodyLabel}</label>
        <textarea id="ann-body" name="body" required rows={6} maxLength={5000} defaultValue={editing?.body} className={fieldClass} />
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-primary-800 px-6 py-2.5 font-bold text-ink-inverse hover:bg-primary-700 disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? copy.posting : editing ? copy.saveEdit : copy.post}
        </button>
        {editing && (
          <button type="button" onClick={onCancel} className="rounded-full px-6 py-2.5 font-bold text-primary-800 hover:bg-primary-50">
            {copy.cancel}
          </button>
        )}
      </div>
    </form>
  );
}
