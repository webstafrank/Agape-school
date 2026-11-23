"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { admissions, gradeOptions } from "@/content/admissions";
import { ApiError, submitEnquiry, type EnquiryInput, type FieldErrors } from "@/lib/api";

type Status = "idle" | "submitting" | "success";

const fieldClass =
  "mt-1 block w-full rounded-lg border border-surface-border bg-surface px-3 py-2.5 text-ink shadow-sm focus:border-primary-500 aria-[invalid=true]:border-accent-700";

function Field({
  name,
  label,
  required,
  error,
  children,
}: {
  name: keyof EnquiryInput;
  label: string;
  required?: boolean;
  error?: string[];
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={`enquiry-${name}`} className="block text-sm font-bold text-primary-900">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {children}
      {error && (
        <p id={`enquiry-${name}-error`} className="mt-1 text-sm font-semibold text-accent-800">
          {error.join(" ")}
        </p>
      )}
    </div>
  );
}

export function EnquiryForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const successRef = useRef<HTMLDivElement>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(
      (["parent_name", "phone", "email", "child_first_name", "grade", "start_term", "message", "website"] as const).map(
        (k) => [k, String(fd.get(k) ?? "").trim()],
      ),
    ) as EnquiryInput;

    setStatus("submitting");
    setErrors({});
    setFormError(null);
    try {
      await submitEnquiry(data);
      setStatus("success");
      requestAnimationFrame(() => successRef.current?.focus());
    } catch (err) {
      setStatus("idle");
      if (err instanceof ApiError && err.status === 400 && err.data && typeof err.data === "object") {
        setErrors(err.data as FieldErrors);
        setFormError("Please check the highlighted fields.");
      } else if (err instanceof ApiError && err.status === 429) {
        setFormError("We've received several enquiries from you recently. Please try again later, or call us.");
      } else {
        setFormError("Sorry, something went wrong sending your enquiry. Please try again, or call us.");
      }
    }
  }

  if (status === "success") {
    return (
      <div ref={successRef} tabIndex={-1} role="status" className="rounded-2xl bg-primary-50 p-8 text-center outline-none">
        <h3 className="text-2xl font-bold">{admissions.form.successHeading}</h3>
        <p className="mt-2 text-lg text-ink-muted">{admissions.form.successText}</p>
      </div>
    );
  }

  const aria = (name: keyof EnquiryInput) =>
    errors[name] ? { "aria-invalid": true as const, "aria-describedby": `enquiry-${name}-error` } : {};

  return (
    <form onSubmit={onSubmit} noValidate={false} aria-describedby="enquiry-intro" className="space-y-5">
      <p id="enquiry-intro" className="text-ink-muted">{admissions.form.intro}</p>

      {formError && (
        <p role="alert" className="rounded-lg border border-accent-300 bg-accent-50 px-4 py-3 font-semibold text-accent-900">
          {formError}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="parent_name" label="Parent / guardian name" required error={errors.parent_name}>
          <input id="enquiry-parent_name" name="parent_name" required maxLength={120} autoComplete="name" className={fieldClass} {...aria("parent_name")} />
        </Field>
        <Field name="phone" label="Phone number" required error={errors.phone}>
          <input id="enquiry-phone" name="phone" type="tel" required maxLength={30} autoComplete="tel" placeholder="+254 7XX XXX XXX" className={fieldClass} {...aria("phone")} />
        </Field>
        <Field name="email" label="Email" error={errors.email}>
          <input id="enquiry-email" name="email" type="email" maxLength={254} autoComplete="email" className={fieldClass} {...aria("email")} />
        </Field>
        <Field name="child_first_name" label="Child's first name" required error={errors.child_first_name}>
          <input id="enquiry-child_first_name" name="child_first_name" required maxLength={60} autoComplete="off" className={fieldClass} {...aria("child_first_name")} />
        </Field>
        <Field name="grade" label="Grade applying for" required error={errors.grade}>
          <select id="enquiry-grade" name="grade" required defaultValue="" className={fieldClass} {...aria("grade")}>
            <option value="" disabled>
              Select a grade
            </option>
            {gradeOptions.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>
        <Field name="start_term" label="Preferred start" error={errors.start_term}>
          <input id="enquiry-start_term" name="start_term" maxLength={60} placeholder="e.g. January 2027" className={fieldClass} {...aria("start_term")} />
        </Field>
      </div>

      <Field name="message" label="Message" error={errors.message}>
        <textarea id="enquiry-message" name="message" rows={4} maxLength={2000} className={fieldClass} {...aria("message")} />
      </Field>

      {/* Honeypot: invisible to people and screen readers; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="enquiry-website">Leave this field empty</label>
        <input id="enquiry-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-muted">{admissions.form.privacy}</p>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="rounded-full bg-primary-800 px-8 py-3 font-bold text-ink-inverse transition-colors hover:bg-primary-700 disabled:cursor-wait disabled:opacity-70"
        >
          {status === "submitting" ? "Sending…" : "Send enquiry"}
        </button>
      </div>
    </form>
  );
}
