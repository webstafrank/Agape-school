import type { Metadata } from "next";
import { EmptyState } from "@/components/EmptyState";
import { EventItem } from "@/components/EventItem";
import { PageHeader } from "@/components/PageHeader";
import { PostCard } from "@/components/PostCard";
import { Reveal } from "@/components/Reveal";
import { news } from "@/content/news";
import { getPosts, type PostSummary } from "@/lib/api";

export const metadata: Metadata = {
  title: news.title,
  description: news.lead,
};

// Regenerate at most once a minute so new posts appear without a redeploy.
export const revalidate = 60;

type UpcomingEvent = PostSummary & { event_start: string };

function splitPosts(posts: PostSummary[], now: number) {
  const upcoming = posts
    .filter((p): p is UpcomingEvent => p.kind === "event" && p.event_start !== null)
    .filter((p) => new Date(p.event_end ?? p.event_start).getTime() >= now)
    .sort((a, b) => a.event_start.localeCompare(b.event_start));
  const upcomingSlugs = new Set(upcoming.map((p) => p.slug));
  const latest = posts.filter((p) => !upcomingSlugs.has(p.slug));
  return { upcoming, latest };
}

/** Fetches and groups posts; null if the API is unreachable. */
async function loadNews() {
  try {
    return splitPosts(await getPosts(), Date.now());
  } catch {
    // Backend unreachable: show a friendly message instead of failing the page.
    return null;
  }
}

export default async function NewsPage() {
  const sections = await loadNews();

  return (
    <>
      <PageHeader title={news.title} lead={news.lead} eyebrow="Stay in touch" />

      {sections === null ? (
        <section className="mx-auto w-full max-w-content px-4 py-16 sm:px-6">
          <EmptyState role="alert">{news.unavailable}</EmptyState>
        </section>
      ) : (
        <NewsSections {...sections} />
      )}
    </>
  );
}

function NewsSections({ upcoming, latest }: ReturnType<typeof splitPosts>) {
  return (
    <>
      <section aria-labelledby="upcoming-heading" className="bg-surface-muted py-16">
        <div className="mx-auto max-w-content px-4 sm:px-6">
          <h2 id="upcoming-heading" className="text-3xl font-bold">{news.upcoming.heading}</h2>
          {upcoming.length === 0 ? (
            <div className="mt-8">
              <EmptyState>{news.upcoming.empty}</EmptyState>
            </div>
          ) : (
            <ul className="mt-8 grid gap-4 lg:grid-cols-2">
              {upcoming.map((event, i) => (
                <li key={event.slug}>
                  <Reveal delay={i * 0.06} className="h-full">
                    <EventItem event={event} />
                  </Reveal>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section aria-labelledby="latest-heading" className="mx-auto w-full max-w-content px-4 py-16 sm:px-6">
        <h2 id="latest-heading" className="text-3xl font-bold">{news.latest.heading}</h2>
        {latest.length === 0 ? (
          <div className="mt-8">
            <EmptyState>{news.latest.empty}</EmptyState>
          </div>
        ) : (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((post, i) => (
              <li key={post.slug}>
                <Reveal delay={(i % 3) * 0.08} className="h-full">
                  <PostCard post={post} />
                </Reveal>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
