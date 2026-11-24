"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { login as copy } from "@/content/portal";
import { ApiError, getMe, isLoggedIn, login, logout } from "@/lib/api";
import { afterLoginPath } from "@/lib/portal";

const fieldClass =
  "mt-1 block w-full rounded-lg border border-surface-border bg-surface px-3 py-2.5 text-ink shadow-sm focus:border-primary-500 aria-[invalid=true]:border-accent-700";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 400) return copy.errors.invalid;
    if (err.status === 429) return copy.errors.throttled;
    return copy.errors.unknown;
  }
  return copy.errors.network;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const expired = params.get("reason") === "expired";

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in? Skip the form and go straight to the portal.
  useEffect(() => {
    if (!isLoggedIn()) return;
    let cancelled = false;
    getMe()
      .then((me) => {
        if (!cancelled) router.replace(afterLoginPath(me.role, next));
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) logout();
      });
    return () => {
      cancelled = true;
    };
  }, [router, next]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const username = String(fd.get("username") ?? "").trim();
    const password = String(fd.get("password") ?? "");

    setSubmitting(true);
    setError(null);
    try {
      const role = await login(username, password);
      router.replace(afterLoginPath(role, next));
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {expired && !error && (
        <p role="status" className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 font-semibold text-primary-900">
          {copy.expired}
        </p>
      )}
      {error && (
        <p id="login-error" role="alert" className="rounded-lg border border-accent-300 bg-accent-50 px-4 py-3 font-semibold text-accent-900">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="login-username" className="block text-sm font-bold text-primary-900">
          {copy.usernameLabel}
        </label>
        <input
          id="login-username"
          name="username"
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          aria-describedby="login-username-hint"
          aria-invalid={error === copy.errors.invalid || undefined}
          className={fieldClass}
        />
        <p id="login-username-hint" className="mt-1 text-sm text-ink-muted">{copy.usernameHint}</p>
      </div>

      <div>
        <label htmlFor="login-password" className="block text-sm font-bold text-primary-900">
          {copy.passwordLabel}
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          aria-invalid={error === copy.errors.invalid || undefined}
          className={fieldClass}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-primary-800 px-8 py-3 font-bold text-ink-inverse transition-colors hover:bg-primary-700 disabled:cursor-wait disabled:opacity-70"
      >
        {submitting ? copy.submitting : copy.submit}
      </button>

      <p className="text-center text-sm text-ink-muted">{copy.forgot}</p>
    </form>
  );
}
