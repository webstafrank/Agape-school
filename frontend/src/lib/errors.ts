import { apiErrors } from "@/content/errors";
import { ApiError } from "@/lib/api";

export type ErrorKind = "session" | "forbidden" | "offline" | "server" | "other";

/** Turns a failed API call into something a person can act on. */
export function describeError(err: unknown): { kind: ErrorKind; message: string; canRetry: boolean } {
  if (err instanceof ApiError) {
    if (err.status === 401) return { kind: "session", message: apiErrors.sessionEnded, canRetry: false };
    if (err.status === 403) return { kind: "forbidden", message: apiErrors.forbidden, canRetry: false };
    if (err.status >= 500) return { kind: "server", message: apiErrors.server, canRetry: true };
    return { kind: "other", message: apiErrors.generic, canRetry: true };
  }
  // fetch() rejects with a TypeError when the network is down or the server is unreachable.
  if (err instanceof TypeError) return { kind: "offline", message: apiErrors.offline, canRetry: true };
  return { kind: "other", message: apiErrors.generic, canRetry: true };
}

/**
 * Message for a failed action (save, post, approve…): the server's own
 * explanation when it gave one (validation / permission), otherwise what
 * went wrong in plain words, otherwise `fallback`.
 */
export function actionError(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.status < 500 && err.status !== 401 && err.data && typeof err.data === "object") {
    const msgs = Object.values(err.data as Record<string, unknown>)
      .flat()
      .filter((m): m is string => typeof m === "string");
    if (msgs.length) return msgs.join(" ");
  }
  const { kind, message } = describeError(err);
  return kind === "other" ? fallback : message;
}
