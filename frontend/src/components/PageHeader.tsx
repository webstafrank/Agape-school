import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  lead?: string;
  eyebrow?: string;
  children?: ReactNode;
};

/** Title banner at the top of inner pages. */
export function PageHeader({ title, lead, eyebrow, children }: PageHeaderProps) {
  return (
    <header className="bg-gradient-to-br from-primary-950 via-primary-900 to-primary-700 text-ink-inverse">
      <div className="mx-auto max-w-content px-4 py-14 sm:px-6 sm:py-20">
        {eyebrow && (
          <p className="text-sm font-bold uppercase tracking-widest text-accent-300">{eyebrow}</p>
        )}
        <h1 className="mt-2 text-4xl font-bold text-ink-inverse sm:text-5xl">{title}</h1>
        {lead && <p className="mt-4 max-w-2xl text-lg text-primary-100 sm:text-xl">{lead}</p>}
        {children}
      </div>
    </header>
  );
}
