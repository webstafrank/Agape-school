/**
 * The ONLY place the frontend talks to the backend API.
 * Components import functions from here — never call fetch directly.
 */

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");

export type Role = "student" | "staff" | "admin";

export type User = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
};

export type Tokens = { access: string; refresh: string };

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly data: unknown,
  ) {
    super(`API request failed with status ${status}`);
    this.name = "ApiError";
  }
}

// --- Token storage -----------------------------------------------------------

const ACCESS_KEY = "agape.access";
const REFRESH_KEY = "agape.refresh";

/** Browser-only token store; safe to call during SSR (returns null / no-ops). */
export const tokenStore = {
  get(): Tokens | null {
    try {
      if (typeof window === "undefined") return null;
      const access = window.localStorage.getItem(ACCESS_KEY);
      const refresh = window.localStorage.getItem(REFRESH_KEY);
      return access && refresh ? { access, refresh } : null;
    } catch {
      return null;
    }
  },
  set(tokens: Tokens): void {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(ACCESS_KEY, tokens.access);
      window.localStorage.setItem(REFRESH_KEY, tokens.refresh);
    } catch {
      // Storage unavailable (private mode, blocked) — session won't persist.
    }
  },
  clear(): void {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(ACCESS_KEY);
      window.localStorage.removeItem(REFRESH_KEY);
    } catch {
      // ignore
    }
  },
};

// --- Core request ------------------------------------------------------------

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Attach the access token and refresh it on 401. Default: true. */
  auth?: boolean;
  /**
   * Server-side only: cache the response in Next's data cache for this many
   * seconds (incremental static regeneration). Use only for public data.
   */
  revalidate?: number;
};

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function send(path: string, { method = "GET", body, revalidate }: RequestOptions, accessToken?: string) {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    ...(revalidate === undefined ? {} : { next: { revalidate } }),
  });
}

// Share one in-flight refresh between concurrent 401s.
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const tokens = tokenStore.get();
  if (!tokens) return null;
  refreshing ??= (async () => {
    try {
      const res = await send("/api/auth/token/refresh/", { method: "POST", body: { refresh: tokens.refresh } });
      if (!res.ok) {
        tokenStore.clear();
        return null;
      }
      const data = (await parseBody(res)) as { access: string; refresh?: string };
      // simplejwt only returns a new refresh token when rotation is enabled.
      tokenStore.set({ access: data.access, refresh: data.refresh ?? tokens.refresh });
      return data.access;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const useAuth = options.auth ?? true;
  let res = await send(path, options, useAuth ? tokenStore.get()?.access : undefined);

  if (res.status === 401 && useAuth && tokenStore.get()) {
    const newAccess = await refreshAccessToken();
    if (newAccess) res = await send(path, options, newAccess);
  }

  const data = await parseBody(res);
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

// --- Endpoints ---------------------------------------------------------------

export function getHealth() {
  return apiFetch<{ status: string }>("/api/health/", { auth: false });
}

/** Logs in, stores the tokens, and returns the user's role for routing. */
export async function login(username: string, password: string): Promise<Role> {
  const data = await apiFetch<Tokens & { role: Role }>("/api/auth/token/", {
    method: "POST",
    body: { username, password },
    auth: false,
  });
  tokenStore.set({ access: data.access, refresh: data.refresh });
  return data.role;
}

export function logout(): void {
  tokenStore.clear();
}

export function isLoggedIn(): boolean {
  return tokenStore.get() !== null;
}

export function getMe() {
  return apiFetch<User>("/api/auth/me/");
}

// --- Admissions --------------------------------------------------------------

export type EnquiryInput = {
  parent_name: string;
  phone: string;
  email: string;
  child_first_name: string;
  grade: string;
  start_term: string;
  message: string;
  /** Honeypot — must stay empty; filled only by bots. */
  website: string;
};

/** Field-level errors from DRF, e.g. { phone: ["Enter a valid phone number…"] }. */
export type FieldErrors = Partial<Record<keyof EnquiryInput, string[]>>;

export function submitEnquiry(data: EnquiryInput) {
  return apiFetch<{ ok: true }>("/api/admissions/enquiries/", { method: "POST", body: data, auth: false });
}

// --- News & events -----------------------------------------------------------

/** How long public pages may serve cached news/gallery data, in seconds. */
export const PUBLIC_REVALIDATE_SECONDS = 60;

export type PostKind = "news" | "event";

export type PostSummary = {
  slug: string;
  kind: PostKind;
  title: string;
  summary: string;
  cover_image_url: string;
  cover_image_alt: string;
  /** ISO datetimes; null unless the post is an event. */
  event_start: string | null;
  event_end: string | null;
  event_location: string;
  published_at: string;
};

export type Post = PostSummary & {
  /** Plain text; paragraphs separated by blank lines. */
  body: string;
  updated_at: string;
};

/** Published news and events, newest first. */
export function getPosts(kind?: PostKind) {
  const query = kind ? `?kind=${kind}` : "";
  return apiFetch<PostSummary[]>(`/api/news/${query}`, { auth: false, revalidate: PUBLIC_REVALIDATE_SECONDS });
}

/** One published post, or null if it doesn't exist or isn't published. */
export async function getPost(slug: string): Promise<Post | null> {
  try {
    return await apiFetch<Post>(`/api/news/${encodeURIComponent(slug)}/`, {
      auth: false,
      revalidate: PUBLIC_REVALIDATE_SECONDS,
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// --- Gallery -----------------------------------------------------------------

export type GalleryItem = {
  id: number;
  kind: "photo" | "video";
  title: string;
  caption: string;
  alt_text: string;
  /** Hosted media URL (cloud storage or YouTube). */
  url: string;
  poster_url: string;
  width: number | null;
  height: number | null;
  /** Set for YouTube videos; rendered as a privacy-enhanced embed. */
  youtube_id: string | null;
};

/** Admin-approved gallery media only (the API never returns anything else). */
export function getGallery() {
  return apiFetch<GalleryItem[]>("/api/gallery/", { auth: false, revalidate: PUBLIC_REVALIDATE_SECONDS });
}

// --- School records (portals; always authenticated) ----------------------------

export type SchoolClassInfo = {
  id: number;
  name: string;
  grade: string;
  grade_label: string;
  section: string;
  year: number;
};

export type SchoolProfile = {
  id: number;
  username: string;
  name: string;
  role: Role;
  /** Students only; null if not yet placed in a class. */
  school_class?: SchoolClassInfo | null;
};

export type Term = {
  id: number;
  year: number;
  name: string;
  label: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  results_published: boolean;
};

export type Result = {
  id: number;
  student: number;
  student_name: string;
  school_class: number;
  subject: number;
  subject_name: string;
  term: number;
  term_label: string;
  /** Decimal as a string, e.g. "81.00". */
  score: string;
  level: string;
  level_label: string;
  comment: string;
  updated_at: string;
};

export type Announcement = {
  id: number;
  title: string;
  body: string;
  school_class: number | null;
  class_name: string | null;
  author_name: string | null;
  published_at: string;
  updated_at: string;
};

export type TimetableEntry = {
  id: number;
  school_class: number;
  class_name: string;
  subject: number;
  subject_name: string;
  teacher_name: string | null;
  /** 1 = Monday … 5 = Friday. */
  day: number;
  day_label: string;
  /** "HH:MM:SS" */
  start_time: string;
  end_time: string;
  room: string;
};

export type FeeRecord = {
  id: number;
  student: number;
  term: number;
  term_label: string;
  amount_due: string;
  amount_paid: string;
  balance: string;
  updated_at: string;
};

export function getSchoolProfile() {
  return apiFetch<SchoolProfile>("/api/school/me/");
}

export function getTerms() {
  return apiFetch<Term[]>("/api/school/terms/");
}

/** Students only ever receive their own results for published terms. */
export function getResults(params: { term?: number } = {}) {
  const query = params.term ? `?term=${params.term}` : "";
  return apiFetch<Result[]>(`/api/school/results/${query}`);
}

export function getAnnouncements() {
  return apiFetch<Announcement[]>("/api/school/announcements/");
}

export function getTimetable() {
  return apiFetch<TimetableEntry[]>("/api/school/timetable/");
}

export function getFees() {
  return apiFetch<FeeRecord[]>("/api/school/fees/");
}
