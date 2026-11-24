import type { Metadata } from "next";
import { PortalDashboard } from "@/components/PortalDashboard";
import { PortalShell } from "@/components/PortalShell";
import { portals } from "@/content/portal";

export const metadata: Metadata = { title: portals.student.title };

export default function StudentPortalPage() {
  return (
    <PortalShell role="student">
      <PortalDashboard role="student" />
    </PortalShell>
  );
}
