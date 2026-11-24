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

  const reload = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, reload };
}
