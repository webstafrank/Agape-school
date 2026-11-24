"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { apiErrors } from "@/content/errors";
import { studentPortal as copy } from "@/content/portal";
import { describeError } from "@/lib/errors";
import type { ApiState } from "@/lib/useApi";

/** Loading and error states for a useApi() result, or the content once ready. */
export function AsyncView<T>({
  state,
  reload,
  children,
}: {
  state: ApiState<T>;
  reload: () => void;
  children: (data: T) => ReactNode;
}) {
  const pathname = usePathname() ?? "/";

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
    const { kind, message, canRetry } = describeError(state.error);
    return (
      <div role="alert" className="rounded-xl border border-accent-300 bg-accent-50 px-4 py-4 text-accent-900">
        <p className="font-semibold">{message}</p>
        {kind === "session" && (
          <Link
            href={`/login?next=${encodeURIComponent(pathname)}&reason=expired`}
            className="mt-2 inline-block font-bold text-primary-800 underline"
          >
            {apiErrors.signIn}
          </Link>
        )}
        {canRetry && (
          <button type="button" onClick={reload} className="mt-2 font-bold text-primary-800 underline">
            {apiErrors.retry}
          </button>
        )}
      </div>
    );
  }
  return <>{children(state.data)}</>;
}
