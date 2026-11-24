import type { Metadata } from "next";
import { PortalShell } from "@/components/PortalShell";
import { StudentAnnouncements } from "@/components/StudentAnnouncements";
import { StudentFrame } from "@/components/StudentFrame";
import { studentPortal } from "@/content/portal";

const copy = studentPortal.announcements;

export const metadata: Metadata = { title: copy.title };

export default function StudentAnnouncementsPage() {
  return (
    <PortalShell role="student">
      <StudentFrame title={copy.title} lead={copy.lead}>
        <StudentAnnouncements />
      </StudentFrame>
    </PortalShell>
  );
}
