import type { Metadata } from "next";
import { AdminClasses } from "@/components/AdminClasses";
import { PortalFrame } from "@/components/PortalFrame";
import { PortalShell } from "@/components/PortalShell";
import { adminPortal } from "@/content/portal";

const copy = adminPortal.classes;

export const metadata: Metadata = { title: copy.title };

export default function AdminClassesPage() {
  return (
    <PortalShell role="admin">
      <PortalFrame eyebrow="Admin portal" nav={adminPortal.nav} title={copy.title} lead={copy.lead}>
        <AdminClasses />
      </PortalFrame>
    </PortalShell>
  );
}
