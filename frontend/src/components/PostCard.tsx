import Image from "next/image";
import Link from "next/link";
import type { PostSummary } from "@/lib/api";
import { formatDate } from "@/lib/format";

/** Card for one news post or event on the listing page. */
export function PostCard({ post }: { post: PostSummary }) {
  return (
    <Link
      href={`/news/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-sm transition-shadow hover:shadow-lg focus-visible:shadow-lg"
    >
      {post.cover_image_url && (
        <div className="relative aspect-[16/9] bg-surface-muted">
          <Image
            src={post.cover_image_url}
            alt={post.cover_image_alt}
            fill
            sizes="(min-width: 1024px) 352px, (min-width: 640px) calc(50vw - 2.5rem), calc(100vw - 2rem)"
            className="object-cover"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
        <p className="text-sm font-bold uppercase tracking-wide text-accent-700">
          {post.kind === "event" ? "Event" : "News"} ·{" "}
          <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
        </p>
        <h3 className="mt-2 text-xl font-bold group-hover:underline">{post.title}</h3>
        <p className="mt-2 flex-1 text-ink-muted">{post.summary}</p>
        <span className="mt-4 font-bold text-primary-700">
          Read more <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}
