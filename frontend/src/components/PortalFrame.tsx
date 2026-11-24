import type { ReactNode } from "react";
import type { NavLink } from "@/content/site";
import { PageHeader } from "./PageHeader";
import { PortalNav } from "./PortalNav";

/** Header + tabs + content area shared by portal sub-pages. */
export function PortalFrame({
  eyebrow,
  nav,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  nav: NavLink[];
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <>
      <PageHeader title={title} lead={lead} eyebrow={eyebrow} />
      <PortalNav links={nav} label={eyebrow} />
      <div className="mx-auto w-full max-w-content px-4 py-10 sm:px-6 sm:py-12">{children}</div>
    </>
  );
}
