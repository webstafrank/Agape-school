import { afterEach, describe, expect, it, vi } from "vitest";
import { confirmLeave, hasUnsavedWork, registerUnsavedWork } from "./leaveGuard";

afterEach(() => vi.restoreAllMocks());

describe("leaveGuard", () => {
  it("lets you leave without asking when nothing is registered or nothing is unsaved", () => {
    const confirm = vi.spyOn(window, "confirm");
    expect(confirmLeave()).toBe(true);
    const off = registerUnsavedWork(() => false);
    expect(confirmLeave()).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
    off();
  });

  it("asks while any editor has unsaved work, and respects the answer", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    let dirty = true;
    const off = registerUnsavedWork(() => dirty);
    expect(hasUnsavedWork()).toBe(true);
    expect(confirmLeave()).toBe(false);
    expect(confirmLeave()).toBe(true);
    expect(confirm).toHaveBeenCalledWith("Some changes on this page aren't saved yet. Leave anyway?");
    dirty = false;
    expect(hasUnsavedWork()).toBe(false);
    off();
  });

  it("forgets an editor once it unregisters (unmounts)", () => {
    const off = registerUnsavedWork(() => true);
    off();
    expect(hasUnsavedWork()).toBe(false);
  });
});
