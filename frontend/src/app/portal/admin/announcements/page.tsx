import type { Metadata } from "next";
import { AnnouncementManager } from "@/components/AnnouncementManager";
import { PortalFrame } from "@/components/PortalFrame";
import { PortalShell } from "@/components/PortalShell";
import { adminPortal } from "@/content/portal";

const copy = adminPortal.announcements;

export const metadata: Metadata = { title: copy.title };

export default function AdminAnnouncementsPage() {
  return (
    <PortalShell role="admin">
      <PortalFrame eyebrow="Admin portal" nav={adminPortal.nav} title={copy.title} lead={copy.lead}>
        <AnnouncementManager schoolWide manageAll />
      </PortalFrame>
    </PortalShell>
  );
}
