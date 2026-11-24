import type { ReactNode } from "react";
import { studentPortal } from "@/content/portal";
import { PortalFrame } from "./PortalFrame";

/** Header + tabs + content area shared by the student portal pages. */
export function StudentFrame({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <PortalFrame eyebrow="Student portal" nav={studentPortal.nav} title={title} lead={lead}>
      {children}
    </PortalFrame>
  );
}
