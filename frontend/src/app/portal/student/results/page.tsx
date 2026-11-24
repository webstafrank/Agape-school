import type { Metadata } from "next";
import { PortalShell } from "@/components/PortalShell";
import { StudentResults } from "@/components/StudentResults";
import { StudentFrame } from "@/components/StudentFrame";
import { studentPortal } from "@/content/portal";

const copy = studentPortal.results;

export const metadata: Metadata = { title: copy.title };

export default function StudentResultsPage() {
  return (
    <PortalShell role="student">
      <StudentFrame title={copy.title} lead={copy.lead}>
        <StudentResults />
      </StudentFrame>
    </PortalShell>
  );
}
