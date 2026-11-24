import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_BASE_URL, ApiError, getHealth, getMe, getPost, getPosts, isLoggedIn, login, logout, tokenStore } from "./api";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const fetchMock = vi.fn<typeof fetch>();

function authHeader(call: number) {
  const init = fetchMock.mock.calls[call][1] as RequestInit;
  return (init.headers as Record<string, string>).Authorization;
}

beforeEach(() => {
  window.localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api client", () => {
  it("login stores tokens and returns the role", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { access: "a1", refresh: "r1", role: "student" }));

    await expect(login("pupil", "pw")).resolves.toBe("student");

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/auth/token/`,
      expect.objectContaining({ method: "POST", body: JSON.stringify({ username: "pupil", password: "pw" }) }),
    );
    expect(authHeader(0)).toBeUndefined();
    expect(tokenStore.get()).toEqual({ access: "a1", refresh: "r1" });
    expect(isLoggedIn()).toBe(true);

    logout();
    expect(isLoggedIn()).toBe(false);
  });

  it("does not send a token to public endpoints", async () => {
    tokenStore.set({ access: "a1", refresh: "r1" });
    fetchMock.mockResolvedValueOnce(json(200, { status: "ok" }));

    await expect(getHealth()).resolves.toEqual({ status: "ok" });
    expect(authHeader(0)).toBeUndefined();
  });

  it("attaches the bearer token to authenticated requests", async () => {
    tokenStore.set({ access: "a1", refresh: "r1" });
    fetchMock.mockResolvedValueOnce(json(200, { id: 1, username: "pupil", email: "", role: "student" }));

    await getMe();
    expect(authHeader(0)).toBe("Bearer a1");
  });

  it("refreshes an expired access token once and retries", async () => {
    tokenStore.set({ access: "old", refresh: "r1" });
    fetchMock
      .mockResolvedValueOnce(json(401, { detail: "Token is invalid or expired" }))
      .mockResolvedValueOnce(json(200, { access: "new" }))
      .mockResolvedValueOnce(json(200, { id: 1, username: "pupil", email: "", role: "student" }));

    await expect(getMe()).resolves.toMatchObject({ username: "pupil" });

    expect(fetchMock.mock.calls[1][0]).toBe(`${API_BASE_URL}/api/auth/token/refresh/`);
    expect(authHeader(2)).toBe("Bearer new");
    expect(tokenStore.get()).toEqual({ access: "new", refresh: "r1" });
  });

  it("clears tokens and throws when the refresh token is rejected", async () => {
    tokenStore.set({ access: "old", refresh: "expired" });
    fetchMock
      .mockResolvedValueOnce(json(401, { detail: "expired" }))
      .mockResolvedValueOnce(json(401, { detail: "Token is invalid or expired" }));

    const err = await getMe().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
    expect(tokenStore.get()).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("surfaces backend error bodies on failure", async () => {
    fetchMock.mockResolvedValueOnce(json(401, { detail: "No active account found" }));

    const err = (await login("pupil", "wrong").catch((e: unknown) => e)) as ApiError;
    expect(err.status).toBe(401);
    expect(err.data).toEqual({ detail: "No active account found" });
    expect(tokenStore.get()).toBeNull();
  });

  it("fetches public posts without a token and with ISR caching", async () => {
    tokenStore.set({ access: "a1", refresh: "r1" });
    fetchMock.mockResolvedValueOnce(json(200, []));

    await expect(getPosts("event")).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/news/?kind=event`,
      expect.objectContaining({ next: { revalidate: 60 } }),
    );
    expect(authHeader(0)).toBeUndefined();
  });

  it("getPost returns null for a missing post but rethrows other errors", async () => {
    fetchMock.mockResolvedValueOnce(json(404, { detail: "Not found." }));
    await expect(getPost("nope")).resolves.toBeNull();

    fetchMock.mockResolvedValueOnce(json(500, {}));
    await expect(getPost("boom")).rejects.toBeInstanceOf(ApiError);
  });
});
