/** Friendly message shown where a list has nothing to display. */
export function EmptyState({ children, role }: { children: React.ReactNode; role?: "status" | "alert" }) {
  return (
    <p role={role} className="rounded-2xl border border-dashed border-surface-border bg-surface-muted px-6 py-10 text-center text-ink-muted">
      {children}
    </p>
  );
}
