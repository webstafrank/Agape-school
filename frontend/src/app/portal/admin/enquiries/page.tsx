import type { Metadata } from "next";
import { AdminEnquiries } from "@/components/AdminEnquiries";
import { PortalFrame } from "@/components/PortalFrame";
import { PortalShell } from "@/components/PortalShell";
import { adminPortal } from "@/content/portal";

const copy = adminPortal.enquiries;

export const metadata: Metadata = { title: copy.title };

export default function AdminEnquiriesPage() {
  return (
    <PortalShell role="admin">
      <PortalFrame eyebrow="Admin portal" nav={adminPortal.nav} title={copy.title} lead={copy.lead}>
        <AdminEnquiries />
      </PortalFrame>
    </PortalShell>
  );
}
