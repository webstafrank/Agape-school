import type { Metadata } from "next";
import { PortalShell } from "@/components/PortalShell";
import { StudentFees } from "@/components/StudentFees";
import { StudentFrame } from "@/components/StudentFrame";
import { studentPortal } from "@/content/portal";

const copy = studentPortal.fees;

export const metadata: Metadata = { title: copy.title };

export default function StudentFeesPage() {
  return (
    <PortalShell role="student">
      <StudentFrame title={copy.title} lead={copy.lead}>
        <StudentFees />
      </StudentFrame>
    </PortalShell>
  );
}
