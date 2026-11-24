"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { adminPortal } from "@/content/portal";
import { adminApi, type AdminMedia } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { dangerButton, primaryButton, secondaryButton } from "@/lib/styles";
import { actionError } from "@/lib/errors";
import { useApi } from "@/lib/useApi";
import { AsyncView } from "./AsyncView";
import { EmptyState } from "./EmptyState";

const copy = adminPortal.gallery;
type Tab = "pending" | "approved";

function Preview({ item }: { item: AdminMedia }) {
  if (item.kind === "photo") {
    return <Image src={item.url} alt={item.alt_text} fill sizes="(min-width: 1024px) 352px, (min-width: 640px) 50vw, 100vw" className="object-cover" />;
  }
  if (item.youtube_id) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${item.youtube_id}?rel=0`}
        title={item.alt_text || item.title}
        loading="lazy"
        allow="encrypted-media; picture-in-picture; fullscreen"
        className="absolute inset-0 h-full w-full border-0"
      />
    );
  }
  return (
    <video className="absolute inset-0 h-full w-full object-cover" src={item.url} poster={item.poster_url || undefined}
      aria-label={item.alt_text} controls muted playsInline preload="none" />
  );
}

export function AdminGallery() {
  const [tab, setTab] = useState<Tab>("pending");
  const load = useCallback(() => adminApi.media(tab), [tab]);
  const state = useApi(load);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      state.reload();
    } catch (err) {
      setError(actionError(err, copy.failed));
    }
  }

  return (
    <>
      <div role="tablist" aria-label={copy.title} className="flex gap-2">
        {(["pending", "approved"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-full px-5 py-2 font-bold ${tab === t ? "bg-primary-800 text-ink-inverse" : "bg-surface-muted text-primary-800 hover:bg-primary-50"}`}
          >
            {copy[t]}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm text-ink-muted">{copy.addHint}</p>
      {error && <p role="alert" className="mt-4 font-semibold text-accent-800">{error}</p>}
      <div role="tabpanel" className="mt-6">
        <AsyncView state={state} reload={state.reload}>
          {(items) =>
            items.length === 0 ? (
              <EmptyState>{tab === "pending" ? copy.emptyPending : copy.emptyApproved}</EmptyState>
            ) : (
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <li key={item.id} className="flex flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface">
                    <div className="relative aspect-[4/3] bg-surface-muted">
                      <Preview item={item} />
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-accent-700">
                        {item.kind} · {formatDate(item.created_at)}
                      </p>
                      <h3 className="mt-1 font-bold text-primary-900">{item.title}</h3>
                      {item.caption && <p className="text-sm text-ink-muted">{item.caption}</p>}
                      <p className="mt-1 text-sm text-ink-muted"><span className="font-semibold">Alt:</span> {item.alt_text}</p>
                      {item.is_approved && item.approved_by_name && (
                        <p className="mt-1 text-sm text-ink-muted">{copy.approvedBy} {item.approved_by_name}</p>
                      )}
                      <div className="mt-auto flex flex-wrap gap-2 pt-4">
                        {item.is_approved ? (
                          <button type="button" onClick={() => void run(() => adminApi.setMediaApproved(item.id, false))} className={secondaryButton}>
                            {copy.unapprove}<span className="sr-only">: {item.title}</span>
                          </button>
                        ) : (
                          <button type="button" onClick={() => void run(() => adminApi.setMediaApproved(item.id, true))} className={`${primaryButton} !px-4 !py-1.5 text-sm`}>
                            {copy.approve}<span className="sr-only">: {item.title}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(copy.confirmDelete)) void run(() => adminApi.deleteMedia(item.id));
                          }}
                          className={dangerButton}
                        >
                          {copy.delete}<span className="sr-only">: {item.title}</span>
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )
          }
        </AsyncView>
      </div>
    </>
  );
}
