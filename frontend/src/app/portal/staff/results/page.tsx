import type { Metadata } from "next";
import { Suspense } from "react";
import { PortalFrame } from "@/components/PortalFrame";
import { PortalShell } from "@/components/PortalShell";
import { StaffResults } from "@/components/StaffResults";
import { staffPortal } from "@/content/portal";

const copy = staffPortal.results;

export const metadata: Metadata = { title: copy.title };

export default function StaffResultsPage() {
  return (
    <PortalShell role="staff">
      <PortalFrame eyebrow="Staff portal" nav={staffPortal.nav} title={copy.title} lead={copy.lead}>
        {/* StaffResults reads ?class=&subject=&term= via useSearchParams. */}
        <Suspense>
          <StaffResults />
        </Suspense>
      </PortalFrame>
    </PortalShell>
  );
}
