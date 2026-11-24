import type { Metadata } from "next";
import { PortalShell } from "@/components/PortalShell";
import { StudentTimetable } from "@/components/StudentTimetable";
import { StudentFrame } from "@/components/StudentFrame";
import { studentPortal } from "@/content/portal";

const copy = studentPortal.timetable;

export const metadata: Metadata = { title: copy.title };

export default function StudentTimetablePage() {
  return (
    <PortalShell role="student">
      <StudentFrame title={copy.title} lead={copy.lead}>
        <StudentTimetable />
      </StudentFrame>
    </PortalShell>
  );
}
