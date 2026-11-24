import type { Metadata } from "next";
import { PortalShell } from "@/components/PortalShell";
import { StudentDashboard } from "@/components/StudentDashboard";
import { portals } from "@/content/portal";

export const metadata: Metadata = { title: portals.student.title };

export default function StudentPortalPage() {
  return (
    <PortalShell role="student">
      <StudentDashboard />
    </PortalShell>
  );
}
