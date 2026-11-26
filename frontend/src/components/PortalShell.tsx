"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { portalShell as copy } from "@/content/portal";
import { ApiError, getMe, isLoggedIn, logout, type Role, type User } from "@/lib/api";
import { confirmLeave } from "@/lib/leaveGuard";
import { portalPath } from "@/lib/portal";

const PortalUserContext = createContext<User | null>(null);

/** The signed-in user, for components rendered inside a PortalShell. */
export function usePortalUser(): User {
  const user = useContext(PortalUserContext);
  if (!user) throw new Error("usePortalUser must be used inside <PortalShell>");
  return user;
}

type State = { kind: "checking" } | { kind: "ready"; user: User } | { kind: "unavailable" };

/**
 * Client-side gate for portal pages. Sends signed-out users to /login and
 * users with a different role to their own portal.
 *
 * This only controls what the browser shows — every portal API endpoint
 * enforces the same rules on the backend.
 */
export function PortalShell({ role, children }: { role: Role; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? portalPath(role);
  const [state, setState] = useState<State>({ kind: "checking" });

  const check = useCallback(async () => {
    if (!isLoggedIn()) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setState({ kind: "checking" });
    try {
      const me = await getMe();
      if (me.role !== role) {
        router.replace(portalPath(me.role));
        return;
      }
      setState({ kind: "ready", user: me });
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        logout();
        router.replace(`/login?next=${encodeURIComponent(pathname)}&reason=expired`);
      } else {
        setState({ kind: "unavailable" });
      }
    }
  }, [role, router, pathname]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- auth check must run in the browser (tokens live in localStorage)
    void check();
  }, [check]);

  if (state.kind === "unavailable") {
    return (
      <div className="mx-auto w-full max-w-content px-4 py-16 sm:px-6">
        <p role="alert" className="rounded-2xl border border-accent-300 bg-accent-50 px-6 py-6 font-semibold text-accent-900">
          {copy.unavailable}
        </p>
        <button
          type="button"
          onClick={() => void check()}
          className="mt-4 rounded-full bg-primary-800 px-6 py-2.5 font-bold text-ink-inverse hover:bg-primary-700"
        >
          {copy.retry}
        </button>
      </div>
    );
  }

  if (state.kind === "checking") {
    return (
      <div className="mx-auto flex w-full max-w-content flex-1 items-center justify-center px-4 py-24 sm:px-6">
        <p role="status" className="flex items-center gap-3 text-lg text-ink-muted">
          <span
            aria-hidden="true"
            className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-700 motion-reduce:animate-none"
          />
          {copy.checking}
        </p>
      </div>
    );
  }

  const { user } = state;
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;

  function onLogout() {
    // Signing out navigates client-side, so the browser's own unsaved-work prompt never shows.
    if (!confirmLeave()) return;
    logout();
    router.replace("/login");
  }

  return (
    <PortalUserContext.Provider value={user}>
      <div className="border-b border-surface-border bg-surface-muted">
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <p className="text-sm text-ink-muted">
            {copy.signedInAs} <strong className="text-primary-900">{displayName}</strong>
          </p>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-full border border-primary-300 px-4 py-1.5 text-sm font-bold text-primary-800 hover:bg-primary-50"
          >
            {copy.logout}
          </button>
        </div>
      </div>
      {children}
    </PortalUserContext.Provider>
  );
}
