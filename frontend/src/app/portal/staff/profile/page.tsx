import type { Metadata } from "next";
import { PortalFrame } from "@/components/PortalFrame";
import { PortalShell } from "@/components/PortalShell";
import { ProfileView } from "@/components/ProfileView";
import { profilePage, staffPortal } from "@/content/portal";

export const metadata: Metadata = { title: profilePage.title };

export default function StaffProfilePage() {
  return (
    <PortalShell role="staff">
      <PortalFrame eyebrow="Staff portal" nav={staffPortal.nav} title={profilePage.title} lead={profilePage.staffLead}>
        <ProfileView />
      </PortalFrame>
    </PortalShell>
  );
}
