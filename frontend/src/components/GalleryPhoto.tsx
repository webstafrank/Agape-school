import Image from "next/image";
import type { GalleryItem } from "@/lib/api";

/** One photo tile in the gallery grid, with an optional caption. */
export function GalleryPhoto({ photo }: { photo: GalleryItem }) {
  return (
    <figure className="group h-full overflow-hidden rounded-2xl bg-surface shadow-sm">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-muted">
        <Image
          src={photo.url}
          alt={photo.alt_text}
          fill
          sizes="(min-width: 1024px) 352px, (min-width: 640px) calc(50vw - 2.5rem), calc(100vw - 2rem)"
          className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </div>
      <figcaption className="p-4">
        <span className="font-bold text-primary-900">{photo.title}</span>
        {photo.caption && <span className="mt-1 block text-sm text-ink-muted">{photo.caption}</span>}
      </figcaption>
    </figure>
  );
}
