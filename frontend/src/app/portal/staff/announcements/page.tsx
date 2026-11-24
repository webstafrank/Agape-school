import type { Metadata } from "next";
import { PortalFrame } from "@/components/PortalFrame";
import { PortalShell } from "@/components/PortalShell";
import { AnnouncementManager } from "@/components/AnnouncementManager";
import { staffPortal } from "@/content/portal";

const copy = staffPortal.announcements;

export const metadata: Metadata = { title: copy.title };

export default function StaffAnnouncementsPage() {
  return (
    <PortalShell role="staff">
      <PortalFrame eyebrow="Staff portal" nav={staffPortal.nav} title={copy.title} lead={copy.lead}>
        <AnnouncementManager />
      </PortalFrame>
    </PortalShell>
  );
}
