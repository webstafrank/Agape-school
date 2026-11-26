"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useState, type FormEvent } from "react";
import { adminPortal } from "@/content/portal";
import { adminApi, type AdminClass, type AdminUser, type Role } from "@/lib/api";
import { fieldClass, labelClass, panelClass, primaryButton, secondaryButton } from "@/lib/styles";
import { actionError } from "@/lib/errors";
import { useApi } from "@/lib/useApi";
import { AdminProfileFields, detailsFromForm } from "./AdminProfileFields";
import { AsyncView } from "./AsyncView";
import { EmptyState } from "./EmptyState";
import { OneTimePassword } from "./OneTimePassword";
import { usePortalUser } from "./PortalShell";

const copy = adminPortal.users;
const ROLES: Role[] = ["student", "staff", "admin"];
const loadClasses = () => adminApi.classes();


export function AdminUsers() {
  const params = useSearchParams();
  const [role, setRole] = useState(params.get("role") ?? "");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const loadUsers = useCallback(() => adminApi.users({ role, q: query }), [role, query]);
  const users = useApi(loadUsers);
  const classes = useApi(loadClasses);
  const [adding, setAdding] = useState(false);
  const [password, setPassword] = useState<{ username: string; password: string } | null>(null);

  const classList = classes.status === "ready" ? classes.data : [];

  return (
    <div className="space-y-8">
      {password && <OneTimePassword {...password} onDone={() => setPassword(null)} />}

      {adding ? (
        <AddUserForm
          classes={classList}
          onCancel={() => setAdding(false)}
          onCreated={(u) => {
            setAdding(false);
            setPassword({ username: u.username, password: u.password });
            users.reload();
          }}
        />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={primaryButton}>
          {copy.add}
        </button>
      )}

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(q.trim());
        }}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="sm:w-48">
          <label htmlFor="user-role" className={labelClass}>{copy.filterRole}</label>
          <select id="user-role" value={role} onChange={(e) => setRole(e.target.value)} className={fieldClass}>
            <option value="">{copy.allRoles}</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{copy.roles[r]}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="user-q" className={labelClass}>{copy.search}</label>
          <input id="user-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} className={fieldClass} />
        </div>
      </form>

      <AsyncView state={users} reload={users.reload}>
        {(list) =>
          list.length === 0 ? (
            <EmptyState>{copy.empty}</EmptyState>
          ) : (
            <ul className="divide-y divide-surface-border rounded-2xl border border-surface-border bg-surface">
              {list.map((u) => (
                <UserRow key={u.id} user={u} classes={classList} onPassword={setPassword} onSaved={users.reload} />
              ))}
            </ul>
          )
        }
      </AsyncView>
    </div>
  );
}

function AddUserForm({
  classes,
  onCancel,
  onCreated,
}: {
  classes: AdminClass[];
  onCancel: () => void;
  onCreated: (u: AdminUser & { password: string }) => void;
}) {
  const [role, setRole] = useState<Role>("student");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    setBusy(true);
    setError(null);
    try {
      const created = await adminApi.createUser({
        username: get("username"),
        first_name: get("first_name"),
        last_name: get("last_name"),
        email: get("email"),
        role,
        school_class: role === "student" && get("school_class") ? Number(get("school_class")) : null,
        ...detailsFromForm(fd, role),
      });
      onCreated(created);
    } catch (err) {
      setError(actionError(err, copy.failed));
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="add-user-heading" className={panelClass}>
      <h2 id="add-user-heading" className="text-2xl font-bold">{copy.addTitle}</h2>
      <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
        {error && (
          <p role="alert" className="rounded-lg border border-accent-300 bg-accent-50 px-4 py-3 font-semibold text-accent-900 sm:col-span-2">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="new-role" className={labelClass}>{copy.role}</label>
          <select id="new-role" value={role} onChange={(e) => setRole(e.target.value as Role)} className={fieldClass}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{copy.roles[r]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="new-username" className={labelClass}>{copy.username}</label>
          <input id="new-username" name="username" required maxLength={150} autoComplete="off" aria-describedby="new-username-hint" className={fieldClass} />
          <p id="new-username-hint" className="mt-1 text-sm text-ink-muted">{copy.usernameHint}</p>
        </div>
        <div>
          <label htmlFor="new-first" className={labelClass}>{copy.firstName}</label>
          <input id="new-first" name="first_name" required maxLength={150} autoComplete="off" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="new-last" className={labelClass}>{copy.lastName}</label>
          <input id="new-last" name="last_name" maxLength={150} autoComplete="off" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="new-email" className={labelClass}>{copy.email}</label>
          <input id="new-email" name="email" type="email" maxLength={254} autoComplete="off" className={fieldClass} />
        </div>
        {role === "student" && (
          <div>
            <label htmlFor="new-class" className={labelClass}>{copy.schoolClass}</label>
            <select id="new-class" name="school_class" defaultValue="" className={fieldClass}>
              <option value="">{copy.noClass}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.year})</option>
              ))}
            </select>
          </div>
        )}
        <AdminProfileFields idPrefix="new" role={role} />
        <div className="flex gap-3 sm:col-span-2">
          <button type="submit" disabled={busy} className={primaryButton}>{busy ? copy.creating : copy.create}</button>
          <button type="button" onClick={onCancel} className="rounded-full px-6 py-2.5 font-bold text-primary-800 hover:bg-primary-50">
            {copy.cancel}
          </button>
        </div>
      </form>
    </section>
  );
}

function UserRow({
  user,
  classes,
  onPassword,
  onSaved,
}: {
  user: AdminUser;
  classes: AdminClass[];
  onPassword: (p: { username: string; password: string }) => void;
  onSaved: () => void;
}) {
  const me = usePortalUser();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    setBusy(true);
    try {
      await adminApi.updateUser(user.id, {
        first_name: get("first_name"),
        last_name: get("last_name"),
        email: get("email"),
        // Your own box is disabled (and so absent from the form): don't send it.
        ...(user.id === me.id ? {} : { is_active: fd.get("is_active") === "on" }),
        ...(user.role === "student" ? { school_class: get("school_class") ? Number(get("school_class")) : null } : {}),
        ...detailsFromForm(fd, user.role),
      });
      setEditing(false);
      setMessage(copy.saved);
      onSaved();
    } catch (err) {
      setMessage(actionError(err, copy.failed));
    } finally {
      setBusy(false);
    }
  }

  async function onReset() {
    if (!window.confirm(copy.confirmReset)) return;
    try {
      const { password } = await adminApi.resetPassword(user.id);
      onPassword({ username: user.username, password });
    } catch (err) {
      setMessage(actionError(err, copy.failed));
    }
  }

  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-primary-900">
            {name}{" "}
            {!user.is_active && (
              <span className="ml-1 rounded-full bg-accent-100 px-2 py-0.5 text-xs font-bold text-accent-900">{copy.inactive}</span>
            )}
          </p>
          <p className="text-sm text-ink-muted">
            {user.username} · {copy.roles[user.role]}
            {user.role === "student" && ` · ${user.class_name ?? copy.noClass}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setEditing((v) => !v)} className={secondaryButton} aria-expanded={editing}>
            {copy.edit}<span className="sr-only">: {name}</span>
          </button>
          <button type="button" onClick={() => void onReset()} className={secondaryButton}>
            {copy.resetPassword}<span className="sr-only">: {name}</span>
          </button>
        </div>
      </div>
      {message && <p role="status" className="mt-2 text-sm font-semibold text-primary-800">{message}</p>}
      {editing && (
        <form onSubmit={onSubmit} className="mt-4 grid gap-4 rounded-xl bg-surface-muted p-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`u${user.id}-first`} className={labelClass}>{copy.firstName}</label>
            <input id={`u${user.id}-first`} name="first_name" defaultValue={user.first_name} className={fieldClass} />
          </div>
          <div>
            <label htmlFor={`u${user.id}-last`} className={labelClass}>{copy.lastName}</label>
            <input id={`u${user.id}-last`} name="last_name" defaultValue={user.last_name} className={fieldClass} />
          </div>
          <div>
            <label htmlFor={`u${user.id}-email`} className={labelClass}>{copy.email}</label>
            <input id={`u${user.id}-email`} name="email" type="email" defaultValue={user.email} className={fieldClass} />
          </div>
          {user.role === "student" && (
            <div>
              <label htmlFor={`u${user.id}-class`} className={labelClass}>{copy.schoolClass}</label>
              <select id={`u${user.id}-class`} name="school_class" defaultValue={user.school_class ?? ""} className={fieldClass}>
                <option value="">{copy.noClass}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.year})</option>
                ))}
              </select>
            </div>
          )}
          <AdminProfileFields idPrefix={`u${user.id}`} role={user.role} user={user} />
          <label className="flex items-center gap-2 font-semibold text-primary-900 sm:col-span-2">
            <input type="checkbox" name="is_active" defaultChecked={user.is_active} disabled={user.id === me.id} className="h-4 w-4" />
            {copy.active}
          </label>
          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" disabled={busy} className={primaryButton}>{copy.save}</button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-full px-6 py-2.5 font-bold text-primary-800 hover:bg-primary-50">
              {copy.cancel}
            </button>
          </div>
        </form>
      )}
    </li>
  );
}
