import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GalleryItem } from "@/lib/api";
import GalleryPage from "./page";

const api = vi.hoisted(() => ({ getGallery: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  ...api,
}));

afterEach(() => api.getGallery.mockReset());

function item(overrides: Partial<GalleryItem>): GalleryItem {
  return {
    id: 1,
    kind: "photo",
    title: "Item",
    caption: "",
    alt_text: "Alt",
    url: "https://res.cloudinary.com/demo/image/upload/a.jpg",
    poster_url: "",
    width: null,
    height: null,
    youtube_id: null,
    ...overrides,
  };
}

describe("Gallery page", () => {
  it("shows photos with alt text and lazy, non-autoplaying videos", async () => {
    api.getGallery.mockResolvedValueOnce([
      item({ id: 1, title: "Reading corner", alt_text: "Books on a classroom shelf", caption: "Kindergarten" }),
      item({ id: 2, kind: "video", title: "Sports day", alt_text: "Relay race", url: "https://youtu.be/dQw4w9WgXcQ", youtube_id: "dQw4w9WgXcQ" }),
      item({ id: 3, kind: "video", title: "Choir", alt_text: "Choir singing", url: "https://res.cloudinary.com/demo/video/upload/choir.mp4" }),
    ]);
    const { container } = render(await GalleryPage());

    const photos = screen.getByRole("heading", { name: "Photos" }).closest("section")!;
    expect(within(photos).getByRole("img", { name: "Books on a classroom shelf" })).toBeInTheDocument();
    expect(within(photos).getByText("Kindergarten")).toBeInTheDocument();

    const iframe = screen.getByTitle("Relay race");
    expect(iframe).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0");
    expect(iframe).toHaveAttribute("loading", "lazy");
    expect(iframe.getAttribute("src")).not.toContain("autoplay");

    const video = container.querySelector("video")!;
    expect(video).toHaveAttribute("preload", "none");
    expect(video.muted).toBe(true);
    expect(video.autoplay).toBe(false);
  });

  it("renders exactly what the API returns (approved media only) and nothing else", async () => {
    api.getGallery.mockResolvedValueOnce([item({ id: 7, title: "Approved one" })]);
    render(await GalleryPage());
    expect(screen.getAllByRole("figure")).toHaveLength(1);
    expect(screen.getByText("Approved one")).toBeInTheDocument();
  });

  it("shows empty states when nothing is approved yet", async () => {
    api.getGallery.mockResolvedValueOnce([]);
    render(await GalleryPage());
    expect(screen.getByText("Photos are coming soon.")).toBeInTheDocument();
    expect(screen.getByText("Videos are coming soon.")).toBeInTheDocument();
  });

  it("shows a friendly message if the API is unreachable", async () => {
    api.getGallery.mockRejectedValueOnce(new TypeError("fetch failed"));
    render(await GalleryPage());
    expect(screen.getByRole("alert")).toHaveTextContent("couldn't load the gallery");
  });
});
