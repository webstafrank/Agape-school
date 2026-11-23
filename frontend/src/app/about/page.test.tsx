import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { about } from "@/content/about";
import AboutPage from "./page";

describe("About page", () => {
  it("renders the page title as the only h1", () => {
    render(<AboutPage />);
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(about.title);
  });

  it("shows story, mission, vision, values, and welcome from the content layer", () => {
    render(<AboutPage />);
    for (const heading of [about.story.heading, about.mission.heading, about.vision.heading, about.values.heading, about.welcome.heading]) {
      expect(screen.getByRole("heading", { level: 2, name: heading })).toBeInTheDocument();
    }
    expect(screen.getByText(about.mission.text)).toBeInTheDocument();
    for (const value of about.values.items) {
      expect(screen.getByRole("heading", { level: 3, name: value.name })).toBeInTheDocument();
    }
  });

  it("flags draft copy with a visible notice", () => {
    render(<AboutPage />);
    expect(screen.getByRole("note")).toHaveTextContent(/draft/i);
  });
});
