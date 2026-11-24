import type { Metadata } from "next";
import { PortalRedirect } from "@/components/PortalRedirect";

export const metadata: Metadata = { title: "Portal" };

export default function PortalIndexPage() {
  return <PortalRedirect />;
}
