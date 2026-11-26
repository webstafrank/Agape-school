"use client";

import { useId, useState, type FormEvent } from "react";
import { profilePage } from "@/content/portal";
import { ApiError, changePassword } from "@/lib/api";
import { actionError } from "@/lib/errors";
import { fieldClass, labelClass } from "@/lib/styles";

const copy = profilePage.password;

type Field = "current" | "next" | "confirm";
type Errors = Partial<Record<Field, string>>;

function serverErrors(err: unknown): Errors | null {
  if (!(err instanceof ApiError) || err.status !== 400 || !err.data || typeof err.data !== "object") return null;
  const data = err.data as Record<string, string[] | undefined>;
  const out: Errors = {};
  if (data.current_password?.length) out.current = data.current_password.join(" ");
  if (data.new_password?.length) out.next = data.new_password.join(" ");
  return Object.keys(out).length ? out : null;
}

/**
 * Change your own password. The current password is required; nothing is kept after success.
 * The server signs out every other session and hands this one fresh tokens (see changePassword).
 */
export function ChangePasswordForm({ username }: { username: string }) {
  const id = useId();
  const [values, setValues] = useState<Record<Field, string>>({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "done" | "error"; message?: string }>({ kind: "idle" });

  function set(field: Field, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
    if (status.kind !== "saving") setStatus({ kind: "idle" });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const invalid: Errors = {};
    if (!values.current) invalid.current = copy.required;
    if (values.next.length < 8) invalid.next = copy.tooShort;
    else if (values.next !== values.confirm) invalid.confirm = copy.mismatch;
    setErrors(invalid);
    if (Object.keys(invalid).length) return;

    setStatus({ kind: "saving" });
    try {
      await changePassword({ current_password: values.current, new_password: values.next });
      setValues({ current: "", next: "", confirm: "" });
      setStatus({ kind: "done", message: copy.done });
    } catch (err) {
      const fields = serverErrors(err);
      if (fields) {
        setErrors(fields);
        setStatus({ kind: "idle" });
      } else {
        setStatus({ kind: "error", message: actionError(err, copy.failed) });
      }
    }
  }

  const field = (name: Field, label: string, autoComplete: string) => {
    const error = errors[name];
    const inputId = `${id}-${name}`;
    return (
      <div>
        <label htmlFor={inputId} className={labelClass}>
          {label}
        </label>
        <input
          id={inputId}
          name={name}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={values[name]}
          onChange={(e) => set(name, e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={fieldClass}
        />
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-sm font-semibold text-accent-800">
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    // method="post": a submit before hydration must never put passwords in the URL.
    <form onSubmit={onSubmit} method="post" noValidate aria-labelledby={`${id}-title`} className="space-y-5">
      <div>
        <h2 id={`${id}-title`} className="text-xl font-bold">{copy.title}</h2>
        <p className="mt-1 text-sm text-ink-muted">{copy.lead}</p>
      </div>
      {/* Lets password managers file the new password under the right account. */}
      <input type="text" name="username" autoComplete="username" value={username} readOnly hidden />

      {field("current", copy.current, "current-password")}
      {field("next", copy.next, "new-password")}
      {field("confirm", copy.confirm, "new-password")}
      <label className="flex items-center gap-2 text-sm font-semibold text-primary-900">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="h-6 w-6" />
        {copy.show}
      </label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={status.kind === "saving"}
          className="rounded-full bg-primary-800 px-8 py-3 font-bold text-ink-inverse transition-colors hover:bg-primary-700 disabled:cursor-wait disabled:opacity-70"
        >
          {status.kind === "saving" ? copy.submitting : copy.submit}
        </button>
        <p
          role="status"
          aria-live="polite"
          className={`font-semibold ${status.kind === "error" ? "text-accent-800" : "text-primary-800"}`}
        >
          {status.kind === "done" || status.kind === "error" ? status.message : ""}
        </p>
      </div>
    </form>
  );
}
