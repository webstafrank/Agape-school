# PLAN.md — Agape Education Center build checklist

One item per loop iteration, top to bottom. Each item must end fully verified
per CLAUDE.md before being checked off.

## Phase 1 — Foundations

- [x] Scaffold monorepo: `frontend/` (create-next-app, TS, Tailwind, App Router)
      and `backend/` (Django project + DRF + psycopg + pytest), shared README
      — frontend typecheck/lint/test/build green; backend pytest/migrations/deploy-check green
- [x] Backend: `/api/health/` endpoint + custom User model with role field
      (student/staff/admin) + JWT auth endpoints, with tests
      — accounts.User (AUTH_USER_MODEL) + JWT (simplejwt, role in claims); 9 tests green
- [x] Frontend: design tokens in tailwind.config.ts, next/font setup, base
      layout with header/nav/footer (motto in footer), responsive at 375/768/1280
      — tokens via Tailwind v4 @config; Fraunces + Nunito Sans; SiteHeader/SiteFooter + src/content/site.ts; 6 tests green
- [x] Frontend: `src/lib/api.ts` client with auth token handling + one test
      — JWT login/logout/me/health, bearer header, single-flight refresh-and-retry on 401; 6 tests

## Phase 2 — Public website

- [x] Home page: animated hero with motto "Your future is here", intro to the
      three sections (Kindergarten / Primary / Junior Secondary), CTA to Admissions
      — framer-motion 14.9.1 (pinned); Hero/SectionsIntro/AdmissionsCta/Reveal; reduced-motion + SSR-markup tests
- [x] Photo/video slider component (framer-motion, swipe on mobile, lazy media,
      reduced-motion variant) used on the Home page
      — MediaSlider + "Life at Agape" section; placeholder slides until real photos (src/content/slides.ts); 10 tests
- [x] About page + Academics section with subpages for Kindergarten, Primary,
      and Junior Secondary (content from `src/content/`)
      — DRAFT copy (CBC-based) in about.ts/academics.ts with visible Draft notice; static /academics/[section], unknown → 404; 11 tests
- [x] Admissions page with an enquiry form → backend endpoint + admin-visible
      list, with spam protection and tests
      — admissions.Enquiry (create-only API, Django admin list); honeypot + per-IP throttle; CORS via django-cors-headers; 25 backend + 6 frontend tests; browser E2E verified
- [x] News & Events: backend model + API, frontend listing and detail pages
      — news.Post (news/event, publish gate + scheduling, admin-managed); public read-only API; /news + /news/[slug] ISR 60s with empty/unavailable states; seed_demo_content; TZ Africa/Nairobi; 13 backend + 7 frontend tests
- [x] Gallery: backend media model with admin approval flag; frontend photo
      grid + video section; unapproved media must never render publicly (test this)
      — gallery.MediaItem by hosted URL (photos from MEDIA_IMAGE_HOSTS, YouTube no-cookie or https video), unapproved by default, admin approve/unapprove actions record approver; public API approved-only; /gallery ISR 60s; 17 backend + 4 frontend tests
- [x] Contact page with map, phone, email; global SEO metadata + Open Graph
      images for all public pages
      — DRAFT contact.ts (hours, map query) + Google Maps lazy embed; pageMetadata helper (canonical, OG/Twitter incl. image) on every public page; generated OG card from brand tokens; robots (portals disallowed) + sitemap; NEXT_PUBLIC_SITE_URL; 23 new frontend tests

## Phase 3 — Portals

- [x] Login page + role-based routing: students → /portal/student,
      staff → /portal/staff, admin → /portal/admin; logged-out users redirected
      — /login (admission no./staff ID, office-reset message), PortalShell client guard (signed-out → /login?next=, wrong role → own portal, expired → re-login), placeholder dashboards; login throttle 10/min; superusers default to admin (+ data migration); 4 backend + 21 frontend tests; CDP browser E2E 10/10
- [x] Backend: Class, Subject, Term, Result, Announcement, Timetable models,
      migrations, and role-scoped API endpoints with object-level permission tests
      (student A must get 403/404 on student B's results)
      — school app (+ StudentProfile, TeachingAssignment, FeeRecord); score 0–100 → CBC level (4-level / JSS 8-level, school/grading.py); results hidden until term published; /api/school/* querysets scoped per role (404 outside scope); 60 tests, mutation-checked
- [ ] Student portal: dashboard with own profile, results by term, timetable,
      announcements, fee status
- [ ] Staff portal: assigned classes, results entry/edit for own classes only,
      class announcements
- [ ] Admin portal: manage users, classes, terms; approve gallery media;
      global announcements; edit admissions enquiries status

## Phase 4 — Polish and deploy

- [ ] Loading, empty, and error states for every portal page; friendly 404/500
- [ ] Accessibility pass: keyboard nav, focus states, contrast, alt text,
      reduced-motion honored everywhere
- [ ] Performance pass: next/image everywhere, route-level code splitting,
      Lighthouse ≥ 90 on Home for performance and accessibility
- [ ] Deploy backend to Railway with production Postgres, env vars, DEBUG=False,
      migrations run; `/api/health/` returns 200 in production
- [ ] Deploy frontend to Vercel with production env vars pointing at the API;
      production homepage returns 200 and contains "Your future is here"
- [ ] End-to-end smoke test against production: login as seeded test student
      and staff, load each portal dashboard, then document the URLs in README
