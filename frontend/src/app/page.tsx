import { site } from "@/content/site";

// Placeholder home — the animated hero and slider arrive in Phase 2.
export default function Home() {
  return (
    <section className="mx-auto flex w-full max-w-content flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold sm:text-5xl">{site.name}</h1>
      <p className="mt-4 font-display text-2xl italic text-accent-600">{site.motto}</p>
      <p className="mt-6 max-w-prose text-lg text-ink-muted">{site.sections.join(" · ")}</p>
    </section>
  );
}
