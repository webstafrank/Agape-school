/** CBC performance level, e.g. "ME" with its full name for screen readers and tooltips. */
export function LevelBadge({ level, label }: { level: string; label: string }) {
  const tone = level.startsWith("EE")
    ? "bg-primary-800 text-ink-inverse"
    : level.startsWith("ME")
      ? "bg-primary-100 text-primary-900"
      : level.startsWith("AE")
        ? "bg-accent-100 text-accent-900"
        : "bg-accent-300 text-accent-900";
  return (
    <abbr title={label} className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold no-underline ${tone}`}>
      {level}
      <span className="sr-only"> — {label}</span>
    </abbr>
  );
}
