import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminUsers } from "@/components/AdminUsers";
import { PortalFrame } from "@/components/PortalFrame";
import { PortalShell } from "@/components/PortalShell";
import { adminPortal } from "@/content/portal";

const copy = adminPortal.users;

export const metadata: Metadata = { title: copy.title };

export default function AdminUsersPage() {
  return (
    <PortalShell role="admin">
      <PortalFrame eyebrow="Admin portal" nav={adminPortal.nav} title={copy.title} lead={copy.lead}>
        {/* Reads ?role= via useSearchParams. */}
        <Suspense>
          <AdminUsers />
        </Suspense>
      </PortalFrame>
    </PortalShell>
  );
}
