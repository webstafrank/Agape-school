import type { GalleryItem } from "@/lib/api";

/**
 * One gallery video. Lazy-loaded and never autoplays: YouTube uses the
 * privacy-enhanced (no-cookie) embed; hosted files use <video> with
 * preload="none", muted by default.
 */
export function GalleryVideo({ video }: { video: GalleryItem }) {
  return (
    <figure className="h-full overflow-hidden rounded-2xl bg-surface shadow-sm">
      <div className="relative aspect-video bg-primary-950">
        {video.youtube_id ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.youtube_id}?rel=0`}
            title={video.alt_text || video.title}
            loading="lazy"
            allow="encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={video.url}
            poster={video.poster_url || undefined}
            aria-label={video.alt_text}
            controls
            muted
            playsInline
            preload="none"
          />
        )}
      </div>
      <figcaption className="p-4">
        <span className="font-bold text-primary-900">{video.title}</span>
        {video.caption && <span className="mt-1 block text-sm text-ink-muted">{video.caption}</span>}
      </figcaption>
    </figure>
  );
}
