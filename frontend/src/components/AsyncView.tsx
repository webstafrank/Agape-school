"use client";

import type { ReactNode } from "react";
import { studentPortal as copy } from "@/content/portal";
import type { ApiState } from "@/lib/useApi";

/** Renders loading and error states for a useApi() result, or the content. */
export function AsyncView<T>({
  state,
  reload,
  children,
}: {
  state: ApiState<T>;
  reload: () => void;
  children: (data: T) => ReactNode;
}) {
  if (state.status === "loading") {
    return (
      <p role="status" className="flex items-center gap-3 py-6 text-ink-muted">
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-primary-200 border-t-primary-700 motion-reduce:animate-none"
        />
        {copy.loading}
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <div role="alert" className="rounded-xl border border-accent-300 bg-accent-50 px-4 py-4 text-accent-900">
        <p className="font-semibold">{copy.error}</p>
        <button type="button" onClick={reload} className="mt-2 font-bold text-primary-800 underline">
          {copy.retry}
        </button>
      </div>
    );
  }
  return <>{children(state.data)}</>;
}
