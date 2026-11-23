import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Slide } from "@/content/slides";
import { MediaSlider, swipeDirection } from "./MediaSlider";

const motion = vi.hoisted(() => ({ reduce: false }));
vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: () => motion.reduce };
});

afterEach(() => {
  motion.reduce = false;
});

const slides: Slide[] = [
  { kind: "placeholder", caption: "First", tone: "primary" },
  { kind: "placeholder", caption: "Second", tone: "accent" },
  { kind: "placeholder", caption: "Third", tone: "deep" },
];

const status = () => screen.getByTestId("slide-status");
const sleep = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)));

describe("MediaSlider", () => {
  it("shows the first slide as a labelled carousel", () => {
    render(<MediaSlider slides={slides} label="Life at Agape" />);
    expect(screen.getByRole("region", { name: "Life at Agape" })).toHaveAttribute("aria-roledescription", "carousel");
    expect(status()).toHaveTextContent("Slide 1 of 3: First");
    expect(screen.getByRole("group", { name: "1 of 3" })).toBeInTheDocument();
  });

  it("moves with next/previous buttons and wraps around", async () => {
    const user = userEvent.setup();
    render(<MediaSlider slides={slides} label="Life" />);
    await user.click(screen.getByRole("button", { name: "Next slide" }));
    expect(status()).toHaveTextContent("Slide 2 of 3: Second");
    await user.click(screen.getByRole("button", { name: "Previous slide" }));
    await user.click(screen.getByRole("button", { name: "Previous slide" }));
    expect(status()).toHaveTextContent("Slide 3 of 3: Third");
  });

  it("jumps to a slide from its dot and marks it current", async () => {
    const user = userEvent.setup();
    render(<MediaSlider slides={slides} label="Life" />);
    const dot = screen.getByRole("button", { name: "Go to slide 3: Third" });
    await user.click(dot);
    expect(status()).toHaveTextContent("Slide 3 of 3");
    expect(dot).toHaveAttribute("aria-current", "true");
  });

  it("supports arrow keys", () => {
    render(<MediaSlider slides={slides} label="Life" />);
    fireEvent.keyDown(screen.getByRole("region"), { key: "ArrowRight" });
    expect(status()).toHaveTextContent("Slide 2 of 3");
    fireEvent.keyDown(screen.getByRole("region"), { key: "ArrowLeft" });
    expect(status()).toHaveTextContent("Slide 1 of 3");
  });

  it("auto-advances, and stops when paused", async () => {
    const user = userEvent.setup();
    render(<MediaSlider slides={slides} label="Life" intervalMs={60} />);
    await waitFor(() => expect(status()).toHaveTextContent("Slide 2 of 3"));

    // Pausing via the button (move pointer away so hover doesn't mask the test).
    await user.click(screen.getByRole("button", { name: "Pause slideshow" }));
    fireEvent.mouseLeave(screen.getByRole("region"));
    fireEvent.blur(screen.getByRole("button", { name: "Play slideshow" }));
    const frozen = status().textContent;
    await sleep(250);
    expect(status().textContent).toBe(frozen);
    expect(status()).toHaveAttribute("aria-live", "polite");
  });

  it("pauses while hovered", async () => {
    render(<MediaSlider slides={slides} label="Life" intervalMs={60} />);
    fireEvent.mouseEnter(screen.getByRole("region"));
    await sleep(250);
    expect(status()).toHaveTextContent("Slide 1 of 3");
  });

  it("does not auto-advance under reduced motion until the user presses play", async () => {
    motion.reduce = true;
    const user = userEvent.setup();
    render(<MediaSlider slides={slides} label="Life" intervalMs={60} />);
    await sleep(250);
    expect(status()).toHaveTextContent("Slide 1 of 3");

    await user.click(screen.getByRole("button", { name: "Play slideshow" }));
    fireEvent.mouseLeave(screen.getByRole("region"));
    fireEvent.blur(screen.getByRole("button", { name: "Pause slideshow" }));
    await waitFor(() => expect(status()).not.toHaveTextContent("Slide 1 of 3"));
  });

  it("renders images lazily via next/image and videos muted without autoplay", async () => {
    const user = userEvent.setup();
    render(
      <MediaSlider
        label="Media"
        slides={[
          { kind: "image", src: "/photo.jpg", alt: "Pupils reading", caption: "Library", width: 1600, height: 900 },
          { kind: "video", src: "/clip.mp4", alt: "Sports day video", caption: "Sports day" },
        ]}
      />,
    );
    const img = screen.getByRole("img", { name: "Pupils reading" });
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("sizes");

    await user.click(screen.getByRole("button", { name: "Next slide" }));
    const video = await screen.findByLabelText("Sports day video");
    expect(video.tagName).toBe("VIDEO");
    expect((video as HTMLVideoElement).muted).toBe(true);
    expect(video).not.toHaveAttribute("autoplay");
    expect(video).toHaveAttribute("preload", "none");
  });

  it("hides controls for a single slide", () => {
    render(<MediaSlider slides={[slides[0]]} label="Life" />);
    expect(screen.queryByRole("button", { name: "Next slide" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /slideshow/ })).not.toBeInTheDocument();
  });
});

describe("swipeDirection", () => {
  it("maps drags to slide steps", () => {
    expect(swipeDirection(-100, 0)).toBe(1);
    expect(swipeDirection(100, 0)).toBe(-1);
    expect(swipeDirection(-10, -800)).toBe(1);
    expect(swipeDirection(10, 800)).toBe(-1);
    expect(swipeDirection(20, 50)).toBe(0);
  });
});
