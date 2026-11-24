import type { Metadata } from "next";
import { PortalShell } from "@/components/PortalShell";
import { StaffDashboard } from "@/components/StaffDashboard";
import { portals } from "@/content/portal";

export const metadata: Metadata = { title: portals.staff.title };

export default function StaffPortalPage() {
  return (
    <PortalShell role="staff">
      <StaffDashboard />
    </PortalShell>
  );
}
