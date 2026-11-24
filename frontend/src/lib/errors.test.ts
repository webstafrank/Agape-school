import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import { actionError, describeError } from "./errors";

describe("describeError", () => {
  it.each([
    [new ApiError(401, {}), "session", false],
    [new ApiError(403, {}), "forbidden", false],
    [new ApiError(500, {}), "server", true],
    [new ApiError(503, {}), "server", true],
    [new ApiError(404, {}), "other", true],
    [new TypeError("fetch failed"), "offline", true],
    [new Error("weird"), "other", true],
  ] as const)("%s → %s", (err, kind, canRetry) => {
    expect(describeError(err)).toMatchObject({ kind, canRetry });
  });
});

describe("actionError", () => {
  it("prefers the server's own explanation for validation and permission errors", () => {
    expect(actionError(new ApiError(400, { username: ["That username is already taken."] }), "x")).toBe(
      "That username is already taken.",
    );
    expect(actionError(new ApiError(403, { detail: "Only administrators can post school-wide." }), "x")).toBe(
      "Only administrators can post school-wide.",
    );
  });

  it("explains session, offline, and server problems in plain words", () => {
    expect(actionError(new ApiError(401, { detail: "Token is invalid" }), "x")).toBe("Your session has ended.");
    expect(actionError(new TypeError("fetch failed"), "x")).toMatch(/couldn't reach the school server/);
    expect(actionError(new ApiError(500, { detail: "Something went wrong on our side." }), "x")).toBe(
      "Something went wrong on our side.",
    );
  });

  it("falls back when there is nothing better to say", () => {
    expect(actionError(new ApiError(400, null), "That didn't work.")).toBe("That didn't work.");
    expect(actionError(new Error("?"), "That didn't work.")).toBe("That didn't work.");
  });
});
