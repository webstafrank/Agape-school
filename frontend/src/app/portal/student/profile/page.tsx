import type { Metadata } from "next";
import { PortalShell } from "@/components/PortalShell";
import { ProfileView } from "@/components/ProfileView";
import { StudentFrame } from "@/components/StudentFrame";
import { profilePage } from "@/content/portal";

export const metadata: Metadata = { title: profilePage.title };

export default function StudentProfilePage() {
  return (
    <PortalShell role="student">
      <StudentFrame title={profilePage.title} lead={profilePage.studentLead}>
        <ProfileView />
      </StudentFrame>
    </PortalShell>
  );
}
