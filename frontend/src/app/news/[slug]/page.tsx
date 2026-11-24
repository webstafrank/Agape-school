import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { news } from "@/content/news";
import { getPost } from "@/lib/api";
import { formatDate, formatEventWhen, toParagraphs } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ slug: string }> };

// Posts are rendered on first request, then cached and refreshed every minute.
export const revalidate = 60;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return {};
  return pageMetadata({
    title: post.title,
    description: post.summary,
    path: `/news/${post.slug}`,
    type: "article",
    image: post.cover_image_url ? { url: post.cover_image_url, alt: post.cover_image_alt } : undefined,
  });
}

export default async function PostPage({ params }: Props) {
  const post = await getPost((await params).slug);
  if (!post) notFound();

  return (
    <>
      <PageHeader title={post.title} lead={post.summary} eyebrow={post.kind === "event" ? "Event" : "News"}>
        <p className="mt-6 text-sm text-primary-200">
          Posted <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
        </p>
      </PageHeader>

      <article className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        {post.kind === "event" && post.event_start && (
          <dl className="mb-10 grid gap-4 rounded-2xl border-l-4 border-accent-400 bg-surface-muted p-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-bold uppercase tracking-wide text-accent-700">When</dt>
              <dd className="mt-1 font-semibold text-primary-900">
                <time dateTime={post.event_start}>{formatEventWhen(post.event_start, post.event_end)}</time>
              </dd>
            </div>
            {post.event_location && (
              <div>
                <dt className="text-sm font-bold uppercase tracking-wide text-accent-700">Where</dt>
                <dd className="mt-1 font-semibold text-primary-900">{post.event_location}</dd>
              </div>
            )}
          </dl>
        )}

        {post.cover_image_url && (
          <div className="relative mb-10 aspect-[16/9] overflow-hidden rounded-2xl bg-surface-muted">
            <Image
              src={post.cover_image_url}
              alt={post.cover_image_alt}
              fill
              priority
              sizes="(min-width: 768px) 720px, calc(100vw - 2rem)"
              className="object-cover"
            />
          </div>
        )}

        {toParagraphs(post.body).map((p, i) => (
          <p key={i} className="mt-5 text-lg leading-relaxed text-ink first:mt-0">{p}</p>
        ))}

        <Link href="/news" className="mt-12 inline-block font-bold text-primary-700 hover:underline">
          <span aria-hidden="true">←</span> {news.backLink}
        </Link>
      </article>
    </>
  );
}
