import type { Metadata } from "next";
import { AdminTerms } from "@/components/AdminTerms";
import { PortalFrame } from "@/components/PortalFrame";
import { PortalShell } from "@/components/PortalShell";
import { adminPortal } from "@/content/portal";

const copy = adminPortal.terms;

export const metadata: Metadata = { title: copy.title };

export default function AdminTermsPage() {
  return (
    <PortalShell role="admin">
      <PortalFrame eyebrow="Admin portal" nav={adminPortal.nav} title={copy.title} lead={copy.lead}>
        <AdminTerms />
      </PortalFrame>
    </PortalShell>
  );
}
