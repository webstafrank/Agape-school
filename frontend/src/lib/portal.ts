import type { Role } from "@/lib/api";

/** Each role's home inside the portal. */
export function portalPath(role: Role): string {
  return `/portal/${role}`;
}

/**
 * Where to send a user after sign-in. A `next` path is honoured only if it is
 * inside the user's own portal — never another role's portal or an outside URL.
 */
export function afterLoginPath(role: Role, next: string | null | undefined): string {
  const home = portalPath(role);
  if (next && next.startsWith("/") && !next.startsWith("//") && (next === home || next.startsWith(`${home}/`))) {
    return next;
  }
  return home;
}
