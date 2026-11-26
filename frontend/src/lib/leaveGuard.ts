/**
 * Page-wide "you have unsaved work" guard for actions that leave the page
 * without a link or a page unload (e.g. Log out, which navigates client-side,
 * so `beforeunload` never fires). Editors register a check while mounted.
 */
import { portalShell } from "@/content/portal";

const checks = new Set<() => boolean>();

/** Register a "do I have unsaved work?" check; returns the unregister function. */
export function registerUnsavedWork(check: () => boolean): () => void {
  checks.add(check);
  return () => {
    checks.delete(check);
  };
}

export function hasUnsavedWork(): boolean {
  for (const check of checks) if (check()) return true;
  return false;
}

/** True if it's fine to leave: nothing unsaved, or the person confirmed. */
export function confirmLeave(message: string = portalShell.leaveUnsaved): boolean {
  return !hasUnsavedWork() || window.confirm(message);
}
