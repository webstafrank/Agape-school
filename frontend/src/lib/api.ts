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

export type StudentDetails = {
  /** ISO date or null if the office hasn't recorded it. */
  date_of_birth: string | null;
  guardian_name: string;
  guardian_phone: string;
};

export type StaffDetails = { staff_number: string; phone: string };

export type SchoolProfile = {
  id: number;
  username: string;
  name: string;
  role: Role;
  first_name?: string;
  last_name?: string;
  email?: string;
  date_joined?: string;
  last_login?: string | null;
  /** Students only; null if not yet placed in a class. */
  school_class?: (SchoolClassInfo & { class_teacher_name?: string | null }) | null;
  /** Staff only: the class + subject pairs they teach. */
  assignments?: TeachingAssignment[];
  /** Staff only: classes they are class teacher of. */
  class_teacher_of?: { id: number; name: string }[];
  /** Office details, read-only to the user (admins edit them). */
  details?: StudentDetails | StaffDetails;
};

export type TeachingAssignment = {
  id: number;
  school_class: number;
  class_name: string;
  subject: number;
  subject_name: string;
};

/** A class as staff see it (students are never shown to other students). */
export type StaffClass = SchoolClassInfo & {
  students: { id: number; username: string; name: string }[];
  my_subjects: { id: number; name: string; code: string }[];
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
  /** True if the signed-in user wrote it (and may edit it). */
  is_mine: boolean;
  published_at: string;
  updated_at: string;
};

export type TimetableEntry = {
  id: number;
  school_class: number;
  class_name: string;
  subject: number;
  subject_name: string;
  teacher: number | null;
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

/**
 * Results visible to the signed-in user: students get only their own for
 * published terms; staff only for the classes and subjects they teach.
 */
export function getResults(params: { term?: number; school_class?: number; subject?: number } = {}) {
  const query = new URLSearchParams(
    Object.entries(params).flatMap(([k, v]) => (v ? [[k, String(v)]] : [])),
  ).toString();
  return apiFetch<Result[]>(`/api/school/results/${query ? `?${query}` : ""}`);
}

export type SheetEntry = { student: number; score: number | null; comment: string };

/** Saves a class mark sheet all-or-nothing. A null score removes that result. */
export function saveResultSheet(sheet: { school_class: number; subject: number; term: number; entries: SheetEntry[] }) {
  return apiFetch<Result[]>("/api/school/results/sheet/", { method: "POST", body: sheet });
}

// Results table: students down the side, the caller's subjects across the top.
export type GridResult = {
  student: number;
  subject: number;
  /** Decimal as a string, e.g. "81.00". */
  score: string;
  level: string;
  level_label: string;
  comment: string;
};

export type ResultGrid = {
  school_class: { id: number; name: string; grade: string; section: string };
  term: Term;
  /** True when staff can no longer change this term (results published). */
  locked: boolean;
  subjects: Subject[];
  students: { id: number; username: string; name: string }[];
  results: GridResult[];
};

export type GridCell = { student: number; subject: number; score: number | null };

/** Staff: only classes they teach (404 otherwise). Term defaults to the current term. */
export function getResultGrid(schoolClass: number, term?: number) {
  const q = new URLSearchParams({ school_class: String(schoolClass), ...(term ? { term: String(term) } : {}) });
  return apiFetch<ResultGrid>(`/api/school/results/grid/?${q}`);
}

/**
 * Saves changed cells all-or-nothing and returns the fresh table. A null score
 * removes that result; an existing comment is kept. On 400, `data.cells` holds
 * per-cell errors in the same order as `cells`.
 */
export function saveResultGrid(grid: { school_class: number; term: number; cells: GridCell[] }) {
  return apiFetch<ResultGrid>("/api/school/results/grid/", { method: "POST", body: grid });
}

/** Change your own password. On 400, field errors are under current_password / new_password. */
export function changePassword(data: { current_password: string; new_password: string }) {
  return apiFetch<{ detail: string }>("/api/auth/password/", { method: "POST", body: data });
}

/** Staff: the classes they teach or lead, with student lists. */
export function getClasses() {
  return apiFetch<StaffClass[]>("/api/school/classes/");
}

export function getClass(id: number) {
  return apiFetch<StaffClass>(`/api/school/classes/${id}/`);
}

export type AnnouncementInput = { title: string; body: string; school_class: number | null };

export function createAnnouncement(data: AnnouncementInput) {
  return apiFetch<Announcement>("/api/school/announcements/", { method: "POST", body: data });
}

export function updateAnnouncement(id: number, data: Partial<AnnouncementInput>) {
  return apiFetch<Announcement>(`/api/school/announcements/${id}/`, { method: "PATCH", body: data });
}

export function deleteAnnouncement(id: number) {
  return apiFetch<null>(`/api/school/announcements/${id}/`, { method: "DELETE" });
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

// --- Admin portal (role=admin only; the backend refuses everyone else) -------

export type AdminOverview = {
  students: number;
  staff: number;
  classes: number;
  pending_media: number;
  new_enquiries: number;
  unplaced_students: number;
  current_term: Term | null;
};

export type AdminUser = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  is_active: boolean;
  school_class: number | null;
  class_name: string | null;
  last_login: string | null;
  date_joined: string;
  /** Students only (blank/null otherwise). */
  date_of_birth: string | null;
  guardian_name: string;
  guardian_phone: string;
  /** Staff only (blank otherwise). */
  staff_number: string;
  phone: string;
};

export type AdminUserInput = {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  school_class: number | null;
  date_of_birth?: string | null;
  guardian_name?: string;
  guardian_phone?: string;
  staff_number?: string;
  phone?: string;
};

export type AdminClass = {
  id: number;
  name: string;
  grade: string;
  grade_label: string;
  year: number;
  class_teacher: number | null;
  class_teacher_name: string | null;
  student_count: number;
};

export type AdminAssignment = {
  id: number;
  teacher: number;
  teacher_name: string;
  school_class: number;
  class_name: string;
  subject: number;
  subject_name: string;
};

export type Subject = { id: number; name: string; code: string };

export type AdminMedia = {
  id: number;
  kind: "photo" | "video";
  title: string;
  caption: string;
  alt_text: string;
  url: string;
  poster_url: string;
  youtube_id: string | null;
  is_approved: boolean;
  approved_by_name: string | null;
  approved_at: string | null;
  created_at: string;
};

export type EnquiryStatus = "new" | "contacted" | "closed";

export type AdminEnquiry = {
  id: number;
  parent_name: string;
  phone: string;
  email: string;
  child_first_name: string;
  grade: string;
  grade_label: string;
  start_term: string;
  message: string;
  status: EnquiryStatus;
  created_at: string;
};

const qs = (params: Record<string, string | number | undefined>) => {
  const q = new URLSearchParams(Object.entries(params).flatMap(([k, v]) => (v === undefined || v === "" ? [] : [[k, String(v)]])));
  const s = q.toString();
  return s ? `?${s}` : "";
};

export const adminApi = {
  overview: () => apiFetch<AdminOverview>("/api/admin/overview/"),

  users: (params: { role?: string; q?: string; school_class?: number } = {}) =>
    apiFetch<AdminUser[]>(`/api/admin/users/${qs(params)}`),
  /** Returns the new user plus a one-time password to hand over. */
  createUser: (data: AdminUserInput) =>
    apiFetch<AdminUser & { password: string }>("/api/admin/users/", { method: "POST", body: data }),
  updateUser: (id: number, data: Partial<Omit<AdminUserInput, "username" | "role">> & { is_active?: boolean }) =>
    apiFetch<AdminUser>(`/api/admin/users/${id}/`, { method: "PATCH", body: data }),
  resetPassword: (id: number) =>
    apiFetch<{ password: string }>(`/api/admin/users/${id}/reset-password/`, { method: "POST" }),

  classes: () => apiFetch<AdminClass[]>("/api/admin/classes/"),
  createClass: (data: { name: string; grade: string; year: number; class_teacher: number | null }) =>
    apiFetch<AdminClass>("/api/admin/classes/", { method: "POST", body: data }),
  updateClass: (id: number, data: Partial<{ name: string; grade: string; year: number; class_teacher: number | null }>) =>
    apiFetch<AdminClass>(`/api/admin/classes/${id}/`, { method: "PATCH", body: data }),
  deleteClass: (id: number) => apiFetch<null>(`/api/admin/classes/${id}/`, { method: "DELETE" }),

  assignments: (school_class?: number) => apiFetch<AdminAssignment[]>(`/api/admin/assignments/${qs({ school_class })}`),
  createAssignment: (data: { teacher: number; school_class: number; subject: number }) =>
    apiFetch<AdminAssignment>("/api/admin/assignments/", { method: "POST", body: data }),
  deleteAssignment: (id: number) => apiFetch<null>(`/api/admin/assignments/${id}/`, { method: "DELETE" }),
  subjects: () => apiFetch<Subject[]>("/api/school/subjects/"),

  terms: () => apiFetch<Term[]>("/api/admin/terms/"),
  createTerm: (data: { year: number; name: string; start_date: string; end_date: string; is_current: boolean }) =>
    apiFetch<Term>("/api/admin/terms/", { method: "POST", body: data }),
  updateTerm: (id: number, data: Partial<{ is_current: boolean; results_published: boolean }>) =>
    apiFetch<Term>(`/api/admin/terms/${id}/`, { method: "PATCH", body: data }),

  media: (status?: "pending" | "approved") => apiFetch<AdminMedia[]>(`/api/admin/media/${qs({ status })}`),
  setMediaApproved: (id: number, is_approved: boolean) =>
    apiFetch<AdminMedia>(`/api/admin/media/${id}/`, { method: "PATCH", body: { is_approved } }),
  deleteMedia: (id: number) => apiFetch<null>(`/api/admin/media/${id}/`, { method: "DELETE" }),

  enquiries: (status?: EnquiryStatus) => apiFetch<AdminEnquiry[]>(`/api/admin/enquiries/${qs({ status })}`),
  setEnquiryStatus: (id: number, status: EnquiryStatus) =>
    apiFetch<AdminEnquiry>(`/api/admin/enquiries/${id}/`, { method: "PATCH", body: { status } }),
};
