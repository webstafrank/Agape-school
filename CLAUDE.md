# Project: Agape Education Center — school website + portals

Public website and role-based portals for Agape Education Center, a school with
three sections: Kindergarten, Primary, and Junior Secondary.
Motto: "Your future is here." (Use it in the hero, footer, and page metadata.)

## Architecture (monorepo)

- `frontend/` — Next.js 15 (App Router) + React + TypeScript + Tailwind CSS.
  Deploys to Vercel. Animations with framer-motion. Calls the backend API.
- `backend/` — Django 5 + Django REST Framework + PostgreSQL.
  Deploys to Railway (or Render). Handles auth (JWT), students, staff,
  classes, results, announcements, gallery media metadata.
- Media (photos/videos) uploads go to cloud storage (e.g. Cloudinary or S3);
  never commit media binaries to the repo.

## Commands (use these to verify your own work)

Frontend (run inside `frontend/`):
- `npm run dev` — dev server on http://localhost:3000
- `npm test` — unit tests (Vitest + React Testing Library). Must pass.
- `npm run typecheck` — tsc --noEmit. Must report 0 errors.
- `npm run lint` — ESLint. Must report 0 errors.
- `npm run build` — production build. Must succeed before any deploy.

Backend (run inside `backend/`, with the venv activated):
- `python manage.py runserver` — dev API on http://localhost:8000
- `pytest` — backend tests. Must pass.
- `python manage.py makemigrations --check --dry-run` — fails if models
  changed without a migration. Must be clean.
- `python manage.py check --deploy` — Django deploy checks. Fix warnings
  about SECRET_KEY, DEBUG, and ALLOWED_HOSTS before any deploy.

Deploy:
- Frontend: pushed to `main` auto-deploys via Vercel. Manual: `vercel --prod`.
- Backend: pushed to `main` auto-deploys via Railway. Run
  `python manage.py migrate` against production DB as part of deploy.
- After every deploy, verify: `GET https://<backend-domain>/api/health/`
  returns 200, and the production homepage returns 200 and contains
  "Your future is here".

## Definition of done

A change is complete only when ALL of the following are true:
1. All frontend checks pass (test, typecheck, lint, build).
2. All backend checks pass (pytest, migrations check, deploy check).
3. New behavior has at least one test covering it.
4. Pages work at mobile (375px), tablet (768px), and desktop (1280px) widths.
5. The verify-agape-change skill was followed.
6. No unrelated files were modified; no secrets in the diff.

Never "fix" a failing test by deleting or skipping it. If a test seems wrong,
stop and explain why instead.

## Roles and access rules (enforce on the BACKEND, not just the UI)

- `student` — sees own profile, results, timetable, announcements, fee status.
- `staff` — sees assigned classes, enters/edits results for own classes only,
  posts announcements to own classes.
- `admin` — manages users, classes, terms, site content, gallery, global
  announcements.
- Students must NEVER be able to read other students' results, even by
  guessing IDs. Every results endpoint needs an object-level permission test.
- This site involves children: no public listing of student names or photos.
  Gallery photos must be admin-approved before appearing publicly.

## Design conventions

- Brand: warm, trustworthy school feel. Define tokens in `tailwind.config.ts`
  (e.g. primary deep blue, accent warm gold/amber) and use ONLY tokens —
  no ad-hoc hex values in components.
- Typography: one display font for headings, one readable sans for body,
  loaded via next/font.
- Animations: framer-motion for hero, section reveals on scroll, and the
  photo/video slider. Respect `prefers-reduced-motion` — every animation
  must have a reduced variant.
- Components live in `frontend/src/components/`, one per file, named exports.
- API calls go through `frontend/src/lib/api.ts` only — no fetch calls
  scattered in components.
- Images via next/image with proper sizes; videos lazy-loaded, never autoplay
  with sound.

## Content structure (public site)

Sections: Home (hero with motto + slider), About, Academics (Kindergarten /
Primary / Junior Secondary subpages), Admissions, News & Events, Gallery
(photos + video section), Contact. Keep page copy in a content layer
(`frontend/src/content/`) so an admin can later edit it without code changes.

## Plan file workflow

Work is tracked in `PLAN.md`. When looping:
1. Read `PLAN.md`, take the topmost unchecked item ONLY.
2. Implement, then verify per "Definition of done".
3. Check the item off with a one-line note, commit as `feat: <item> (loop)`.
Never take more than one item per iteration.
