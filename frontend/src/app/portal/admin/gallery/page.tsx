import type { Metadata } from "next";
import { AdminGallery } from "@/components/AdminGallery";
import { PortalFrame } from "@/components/PortalFrame";
import { PortalShell } from "@/components/PortalShell";
import { adminPortal } from "@/content/portal";

const copy = adminPortal.gallery;

export const metadata: Metadata = { title: copy.title };

export default function AdminGalleryPage() {
  return (
    <PortalShell role="admin">
      <PortalFrame eyebrow="Admin portal" nav={adminPortal.nav} title={copy.title} lead={copy.lead}>
        <AdminGallery />
      </PortalFrame>
    </PortalShell>
  );
}
