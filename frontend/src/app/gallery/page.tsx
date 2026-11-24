import type { Metadata } from "next";
import { EmptyState } from "@/components/EmptyState";
import { GalleryPhoto } from "@/components/GalleryPhoto";
import { GalleryVideo } from "@/components/GalleryVideo";
import { PageHeader } from "@/components/PageHeader";
import { Reveal } from "@/components/Reveal";
import { gallery } from "@/content/gallery";
import { getGallery, type GalleryItem } from "@/lib/api";

export const metadata: Metadata = {
  title: gallery.title,
  description: gallery.lead,
};

// Newly approved media appears within a minute, without a redeploy.
export const revalidate = 60;

async function loadGallery(): Promise<GalleryItem[] | null> {
  try {
    return await getGallery();
  } catch {
    return null;
  }
}

export default async function GalleryPage() {
  const items = await loadGallery();

  return (
    <>
      <PageHeader title={gallery.title} lead={gallery.lead} eyebrow="Life at Agape" />
      {items === null ? (
        <section className="mx-auto w-full max-w-content px-4 py-16 sm:px-6">
          <EmptyState role="alert">{gallery.unavailable}</EmptyState>
        </section>
      ) : (
        <GallerySections items={items} />
      )}
    </>
  );
}

function GallerySections({ items }: { items: GalleryItem[] }) {
  const photos = items.filter((i) => i.kind === "photo");
  const videos = items.filter((i) => i.kind === "video");

  return (
    <>
      <section aria-labelledby="photos-heading" className="mx-auto w-full max-w-content px-4 py-16 sm:px-6">
        <h2 id="photos-heading" className="text-3xl font-bold">{gallery.photos.heading}</h2>
        {photos.length === 0 ? (
          <div className="mt-8">
            <EmptyState>{gallery.photos.empty}</EmptyState>
          </div>
        ) : (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo, i) => (
              <li key={photo.id}>
                <Reveal delay={(i % 3) * 0.08} className="h-full">
                  <GalleryPhoto photo={photo} />
                </Reveal>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="videos-heading" className="bg-surface-muted py-16">
        <div className="mx-auto max-w-content px-4 sm:px-6">
          <h2 id="videos-heading" className="text-3xl font-bold">{gallery.videos.heading}</h2>
          {videos.length === 0 ? (
            <div className="mt-8">
              <EmptyState>{gallery.videos.empty}</EmptyState>
            </div>
          ) : (
            <ul className="mt-8 grid gap-6 md:grid-cols-2">
              {videos.map((video, i) => (
                <li key={video.id}>
                  <Reveal delay={(i % 2) * 0.08} className="h-full">
                    <GalleryVideo video={video} />
                  </Reveal>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
