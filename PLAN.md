# PLAN.md — Agape Education Center build checklist

One item per loop iteration, top to bottom. Each item must end fully verified
per CLAUDE.md before being checked off.

## Phase 1 — Foundations

- [x] Scaffold monorepo: `frontend/` (create-next-app, TS, Tailwind, App Router)
      and `backend/` (Django project + DRF + psycopg + pytest), shared README
      — frontend typecheck/lint/test/build green; backend pytest/migrations/deploy-check green
- [ ] Backend: `/api/health/` endpoint + custom User model with role field
      (student/staff/admin) + JWT auth endpoints, with tests
- [ ] Frontend: design tokens in tailwind.config.ts, next/font setup, base
      layout with header/nav/footer (motto in footer), responsive at 375/768/1280
- [ ] Frontend: `src/lib/api.ts` client with auth token handling + one test

## Phase 2 — Public website

- [ ] Home page: animated hero with motto "Your future is here", intro to the
      three sections (Kindergarten / Primary / Junior Secondary), CTA to Admissions
- [ ] Photo/video slider component (framer-motion, swipe on mobile, lazy media,
      reduced-motion variant) used on the Home page
- [ ] About page + Academics section with subpages for Kindergarten, Primary,
      and Junior Secondary (content from `src/content/`)
- [ ] Admissions page with an enquiry form → backend endpoint + admin-visible
      list, with spam protection and tests
- [ ] News & Events: backend model + API, frontend listing and detail pages
- [ ] Gallery: backend media model with admin approval flag; frontend photo
      grid + video section; unapproved media must never render publicly (test this)
- [ ] Contact page with map, phone, email; global SEO metadata + Open Graph
      images for all public pages

## Phase 3 — Portals

- [ ] Login page + role-based routing: students → /portal/student,
      staff → /portal/staff, admin → /portal/admin; logged-out users redirected
- [ ] Backend: Class, Subject, Term, Result, Announcement, Timetable models,
      migrations, and role-scoped API endpoints with object-level permission tests
      (student A must get 403/404 on student B's results)
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
