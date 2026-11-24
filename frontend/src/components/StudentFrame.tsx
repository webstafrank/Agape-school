import type { ReactNode } from "react";
import { studentPortal } from "@/content/portal";
import { PageHeader } from "./PageHeader";
import { PortalNav } from "./PortalNav";

/** Header + tabs + content area shared by the student portal pages. */
export function StudentFrame({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <>
      <PageHeader title={title} lead={lead} eyebrow="Student portal" />
      <PortalNav links={studentPortal.nav} label="Student portal" />
      <div className="mx-auto w-full max-w-content px-4 py-10 sm:px-6 sm:py-12">{children}</div>
    </>
  );
}
