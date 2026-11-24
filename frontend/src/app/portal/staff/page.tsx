import type { Metadata } from "next";
import { PortalDashboard } from "@/components/PortalDashboard";
import { PortalShell } from "@/components/PortalShell";
import { portals } from "@/content/portal";

export const metadata: Metadata = { title: portals.staff.title };

export default function StaffPortalPage() {
  return (
    <PortalShell role="staff">
      <PortalDashboard role="staff" />
    </PortalShell>
  );
}
