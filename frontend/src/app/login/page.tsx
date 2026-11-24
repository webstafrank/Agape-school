import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { login } from "@/content/portal";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: login.title,
  description: login.lead,
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <section className="flex flex-1 items-center bg-gradient-to-br from-primary-950 via-primary-900 to-primary-700 px-4 py-12 sm:py-20">
      <div className="mx-auto w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl sm:p-10">
        <p className="text-sm font-bold uppercase tracking-widest text-accent-700">{site.name}</p>
        <h1 className="mt-2 text-3xl font-bold">{login.title}</h1>
        <p className="mt-2 text-ink-muted">{login.lead}</p>
        <div className="mt-8">
          {/* LoginForm reads ?next= via useSearchParams, which needs a Suspense boundary. */}
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
