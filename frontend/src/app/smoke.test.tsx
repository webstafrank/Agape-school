import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

// Scaffold smoke test: verifies the Vitest + Testing Library + jsdom stack works.
function Motto() {
  return <p>Your future is here</p>;
}

describe("frontend test harness", () => {
  it("renders a component and queries the DOM", () => {
    render(<Motto />);
    expect(screen.getByText("Your future is here")).toBeInTheDocument();
  });
});
