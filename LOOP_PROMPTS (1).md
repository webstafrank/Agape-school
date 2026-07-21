# LOOP_PROMPTS.md — Agape Education Center

Prerequisites before the first loop (one-time manual setup — do these
yourself, don't leave them to the loop):
1. Create the GitHub repo and push this scaffold (CLAUDE.md, PLAN.md, .claude/).
2. Create the Vercel project (root: `frontend/`) and a Railway project with
   a PostgreSQL database (root: `backend/`), both linked to the repo.
3. Put env vars in Vercel/Railway dashboards (DATABASE_URL, SECRET_KEY,
   NEXT_PUBLIC_API_URL, storage keys). Never paste secrets into prompts.
4. Confirm command syntax at https://docs.claude.com/en/docs/claude-code/overview
   — loop features change fast.

## 1. Build loop — run per phase, not all at once

Phase 1 example (repeat with "Phase 2", "Phase 3" as each completes):

    /goal: Work through the unchecked Phase 1 items in PLAN.md one at a time,
    following CLAUDE.md and the verify-agape-change skill. Done when every
    Phase 1 item is checked off AND frontend `npm test`, `npm run typecheck`,
    `npm run lint`, `npm run build` and backend `pytest` all exit 0.
    Max 40 turns.

Why per-phase: you review the foundations before the loop builds three
portals on top of them. Cheaper to correct early.

## 2. Interval loop — steady background progress

    /loop 15m Read PLAN.md, complete the SINGLE topmost unchecked item
    following CLAUDE.md and the verify-agape-change skill, check it off,
    and commit. If the current phase is complete, reply PHASE DONE and
    make no changes.

## 3. Deploy loop — Phase 4 only, stay at your desk for this one

    /goal: Complete the Phase 4 deploy items in PLAN.md. Done when
    https://<backend-domain>/api/health/ returns 200, the production
    frontend homepage returns 200 and contains "Your future is here",
    and the seeded test student and test staff accounts can each log in
    and load their dashboards in production. Follow the deploy
    verification section of verify-agape-change after every deploy.
    If a production check fails twice, roll back and stop. Max 30 turns.

## 4. Maintenance loops — after launch

    /loop 10m Check the open PR for this branch. If CI failed, read the
    logs, fix, and push. If there are review comments, address each in a
    commit. If CI is green and nothing is pending, do nothing.

    /schedule every Monday at 8am: In frontend/ and backend/, run
    dependency audits (npm audit; pip list --outdated). Open a PR
    upgrading safe minor/patch versions, run both test suites in the PR,
    and summarize anything needing my attention.

## Guardrails (non-negotiable for a school site)

- Turn caps inside every /goal; spend ceiling set before walking away.
- Loops open PRs and deploy to preview; YOU approve production merges —
  especially anything touching student data, auth, or permissions.
- The loop must never seed real student names or paste secrets into code.
- If the same error survives 3 fix attempts, the loop stops and reports
  (enforced in the verify-agape-change skill).

## If you'd rather skip Django

To run 100% on Vercel: replace `backend/` with Next.js API routes + Prisma
against a hosted Postgres (Neon/Vercel Postgres). Update the Commands and
Architecture sections of CLAUDE.md and drop the backend items from PLAN.md.
The loop prompts themselves don't change.
