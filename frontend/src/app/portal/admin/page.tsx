import type { Metadata } from "next";
import { AdminOverview } from "@/components/AdminOverview";
import { PortalShell } from "@/components/PortalShell";
import { portals } from "@/content/portal";

export const metadata: Metadata = { title: portals.admin.title };

export default function AdminPortalPage() {
  return (
    <PortalShell role="admin">
      <AdminOverview />
    </PortalShell>
  );
}
