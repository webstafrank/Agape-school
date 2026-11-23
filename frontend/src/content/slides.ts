/**
 * Home page "Life at Agape" slider content.
 *
 * Media files never live in the repo — `src` must be a hosted URL
 * (e.g. Cloudinary). Only use admin-approved photos; no identifiable
 * children without parental consent.
 */

export type ImageSlide = {
  kind: "image";
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
};

export type VideoSlide = {
  kind: "video";
  src: string;
  poster?: string;
  /** Describes the video for screen readers. */
  alt: string;
  caption: string;
};

/** Brand-colored stand-in until real photos are uploaded. */
export type PlaceholderSlide = {
  kind: "placeholder";
  caption: string;
  tone: "primary" | "accent" | "deep";
};

export type Slide = ImageSlide | VideoSlide | PlaceholderSlide;

export const lifeAtAgape = {
  heading: "Life at Agape",
  lead: "A glimpse of learning, play, and community across our three sections.",
  // TODO: replace placeholders with approved, hosted photos/videos.
  slides: [
    { kind: "placeholder", caption: "Joyful early learning in Kindergarten", tone: "accent" },
    { kind: "placeholder", caption: "Bright classrooms that inspire curiosity", tone: "primary" },
    { kind: "placeholder", caption: "Sports, games, and teamwork", tone: "deep" },
    { kind: "placeholder", caption: "Creative arts and music", tone: "accent" },
    { kind: "placeholder", caption: "A caring school community", tone: "primary" },
  ] satisfies Slide[] as Slide[],
};
