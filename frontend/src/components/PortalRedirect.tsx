"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { portalShell as copy } from "@/content/portal";
import { getMe, isLoggedIn, logout } from "@/lib/api";
import { portalPath } from "@/lib/portal";

/** /portal: send the user to their own portal, or to sign in. */
export function PortalRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    getMe()
      .then((me) => router.replace(portalPath(me.role)))
      .catch(() => {
        logout();
        router.replace("/login");
      });
  }, [router]);

  return (
    <p role="status" className="mx-auto w-full max-w-content px-4 py-24 text-center text-lg text-ink-muted sm:px-6">
      {copy.checking}
    </p>
  );
}
