"use client";

import { useCallback, useEffect, useState } from "react";

export type ApiState<T> =
  | { status: "loading" }
  | { status: "error"; error: unknown }
  | { status: "ready"; data: T };

/**
 * Loads data from an api.ts function in the browser (portal pages are
 * client-rendered because tokens live in localStorage). `load` must be stable
 * (a module-level function or useCallback).
 */
export function useApi<T>(load: () => Promise<T>): ApiState<T> & { reload: () => void } {
  const [state, setState] = useState<ApiState<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    load().then(
      (data) => !cancelled && setState({ status: "ready", data }),
      (error) => !cancelled && setState({ status: "error", error }),
    );
    return () => {
      cancelled = true;
    };
  }, [load, attempt]);

  // Refetch. Data already on screen stays visible while refreshing (no flash of
  // "Loading…" after every save); only a first load or a retry after an error
  // shows the loading state.
  const reload = useCallback(() => {
    setState((prev) => (prev.status === "ready" ? prev : { status: "loading" }));
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, reload };
}
