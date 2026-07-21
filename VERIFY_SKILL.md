---
name: verify-agape-change
description: Verify any change to the Agape Education Center project end-to-end before declaring it done. Always use this skill after implementing a feature, fixing a bug, or editing any frontend component, Django model, API endpoint, or config — even for small changes, and always before and after any deploy. This is the final gate of every loop iteration.
---

# Verify Agape Change

Never report a change as complete based on a successful edit alone. Run the
relevant sections below; only declare done when every applicable step passes.

## 1. Static checks (always)

Frontend (in `frontend/`):
```bash
npm run typecheck && npm run lint && npm test && npm run build
```

Backend (in `backend/`, if any backend file changed):
```bash
pytest
python manage.py makemigrations --check --dry-run
python manage.py check --deploy
```

All must exit 0. After 3 failed fix attempts on the same error, STOP and
report the error instead of thrashing.

## 2. Behavioral check (features and bug fixes)

- Write or update a test that fails without the change and passes with it.
- For API endpoints: test the happy path AND at least one forbidden path.

## 3. Security check (any portal or API change)

- Results, profiles, and fee data: confirm a test exists proving one student
  cannot access another student's data (expect 403/404, not 200).
- Staff results entry: confirm a test proves staff cannot edit results for
  classes they are not assigned to.
- Gallery: confirm unapproved media does not appear in any public API
  response or page.
- `git diff` must contain no secrets, keys, or real student data. Seed data
  uses obviously fake names only.

## 4. UI check (anything visual)

- Load the affected page at 375px, 768px, and 1280px widths; confirm no
  overflow, overlap, or broken layout.
- Animations: confirm a `prefers-reduced-motion` variant exists.
- Images use next/image; videos are lazy and muted by default.
- No console errors or React warnings in test output.

## 5. Deploy verification (only when a deploy happened)

```bash
curl -s -o /dev/null -w "%{http_code}" https://<backend-domain>/api/health/   # expect 200
curl -s https://<frontend-domain> | grep -c "Your future is here"             # expect >= 1
```

- Confirm production has DEBUG=False and migrations applied.
- Log in as the seeded test student and test staff account; confirm each
  dashboard loads. If either fails, ROLL BACK before doing anything else.

## 6. Scope check and report

```bash
git diff --stat
```
Only task-related files changed. Then end with a short summary: what changed,
which checks ran, results, and (if deployed) the live URLs checked. If any
step could not be completed, say so explicitly — do not mark the task done.
