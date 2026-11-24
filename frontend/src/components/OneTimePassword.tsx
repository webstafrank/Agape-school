"use client";

import { useState } from "react";
import { adminPortal } from "@/content/portal";

const copy = adminPortal.users;

/** Shows a generated password exactly once, with a copy button. */
export function OneTimePassword({ username, password, onDone }: { username: string; password: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div role="alert" className="rounded-2xl border-2 border-accent-400 bg-accent-50 p-5">
      <p className="font-bold text-accent-900">
        {copy.passwordTitle} — {username}
      </p>
      <p className="mt-3 flex flex-wrap items-center gap-3">
        <code className="rounded-lg bg-surface px-4 py-2 font-mono text-2xl tracking-wider text-primary-950">{password}</code>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(password).then(() => setCopied(true), () => undefined);
          }}
          className="rounded-full border border-primary-300 px-4 py-1.5 text-sm font-bold text-primary-800 hover:bg-primary-50"
        >
          {copied ? copy.copied : copy.copy}
        </button>
      </p>
      <p className="mt-3 text-sm text-accent-900">{copy.passwordHelp}</p>
      <button type="button" onClick={onDone} className="mt-3 text-sm font-bold text-primary-800 underline">
        {copy.done}
      </button>
    </div>
  );
}
