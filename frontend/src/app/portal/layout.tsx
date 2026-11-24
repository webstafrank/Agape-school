import type { Metadata } from "next";

// Portal pages are private: keep them out of search engines.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
