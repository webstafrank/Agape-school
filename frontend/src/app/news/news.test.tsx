import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Post, PostSummary } from "@/lib/api";
import PostPage, { generateMetadata } from "./[slug]/page";
import NewsPage from "./page";

const api = vi.hoisted(() => ({ getPosts: vi.fn(), getPost: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  ...api,
}));

const NOW = new Date("2026-11-24T09:00:00Z");

function post(overrides: Partial<PostSummary>): PostSummary {
  return {
    slug: "a-post",
    kind: "news",
    title: "A post",
    summary: "Summary text",
    cover_image_url: "",
    cover_image_alt: "",
    event_start: null,
    event_end: null,
    event_location: "",
    published_at: "2026-11-20T07:00:00Z",
    ...overrides,
  };
}

const params = (slug: string) => ({ params: Promise.resolve({ slug }) });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  api.getPosts.mockReset();
  api.getPost.mockReset();
});

describe("News & Events listing", () => {
  it("lists upcoming events soonest first and other posts under latest news", async () => {
    api.getPosts.mockResolvedValueOnce([
      post({ slug: "later", kind: "event", title: "Sports Day", event_start: "2026-12-20T06:00:00Z", event_location: "Field" }),
      post({ slug: "sooner", kind: "event", title: "Science Fair", event_start: "2026-12-01T06:00:00Z" }),
      post({ slug: "past", kind: "event", title: "Old Concert", event_start: "2026-10-01T06:00:00Z" }),
      post({ slug: "term", title: "Term starts" }),
    ]);
    render(await NewsPage());

    const upcoming = screen.getByRole("heading", { name: "Upcoming events" }).closest("section")!;
    expect(within(upcoming).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Science Fair",
      "Sports Day",
    ]);
    expect(within(upcoming).getByText(/1 December 2026, 9:00/)).toBeInTheDocument(); // Nairobi time (UTC+3)
    expect(within(upcoming).getByRole("link", { name: /Sports Day/ })).toHaveAttribute("href", "/news/later");

    const latest = screen.getByRole("heading", { name: "Latest news" }).closest("section")!;
    expect(within(latest).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Old Concert",
      "Term starts",
    ]);
  });

  it("shows empty states when nothing is published", async () => {
    api.getPosts.mockResolvedValueOnce([]);
    render(await NewsPage());
    expect(screen.getByText(/No upcoming events right now/)).toBeInTheDocument();
    expect(screen.getByText(/No news has been posted yet/)).toBeInTheDocument();
  });

  it("shows a friendly message if the API is unreachable", async () => {
    api.getPosts.mockRejectedValueOnce(new TypeError("fetch failed"));
    render(await NewsPage());
    expect(screen.getByRole("alert")).toHaveTextContent("couldn't load the latest news");
  });
});

describe("News post page", () => {
  const full: Post = {
    ...post({
      slug: "science-fair",
      kind: "event",
      title: "Science Fair",
      event_start: "2026-12-01T06:00:00Z",
      event_end: "2026-12-01T10:00:00Z",
      event_location: "School hall",
    }),
    body: "First paragraph.\n\nSecond paragraph.",
    updated_at: "2026-11-20T07:00:00Z",
  };

  it("renders the post with event details and paragraphs", async () => {
    api.getPost.mockResolvedValue(full);
    render(await PostPage(params("science-fair")));

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Science Fair");
    expect(screen.getByText("1 December 2026, 9:00 am – 1:00 pm")).toBeInTheDocument();
    expect(screen.getByText("School hall")).toBeInTheDocument();
    expect(screen.getByText("First paragraph.")).toBeInTheDocument();
    expect(screen.getByText("Second paragraph.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /All news & events/ })).toHaveAttribute("href", "/news");
    await expect(generateMetadata(params("science-fair"))).resolves.toMatchObject({
      title: "Science Fair",
      description: "Summary text",
      alternates: { canonical: "/news/science-fair" },
      openGraph: { type: "article", url: "/news/science-fair", images: [{ url: "/opengraph-image" }] },
    });
  });

  it("uses the cover photo as the share image when there is one", async () => {
    api.getPost.mockResolvedValue({ ...full, cover_image_url: "https://res.cloudinary.com/demo/a.jpg", cover_image_alt: "Hall" });
    await expect(generateMetadata(params("science-fair"))).resolves.toMatchObject({
      openGraph: { images: [{ url: "https://res.cloudinary.com/demo/a.jpg", alt: "Hall" }] },
    });
  });

  it("falls back to default metadata if the API is down (so error.tsx can render)", async () => {
    api.getPost.mockRejectedValue(new TypeError("fetch failed"));
    await expect(generateMetadata(params("any"))).resolves.toEqual({});
    await expect(PostPage(params("any"))).rejects.toThrow("fetch failed");
  });

  it("404s for an unknown or unpublished post", async () => {
    api.getPost.mockResolvedValue(null);
    await expect(PostPage(params("draft"))).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
    await expect(generateMetadata(params("draft"))).resolves.toEqual({});
  });
});
