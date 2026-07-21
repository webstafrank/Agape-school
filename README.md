# Agape Education Center

Public website and role-based portals for **Agape Education Center**, a school
with three sections: Kindergarten, Primary, and Junior Secondary.

> Motto: **"Your future is here."**

## Monorepo layout

| Path        | Stack                                             | Deploys to |
|-------------|---------------------------------------------------|------------|
| `frontend/` | Next.js 16 (App Router) · TypeScript · Tailwind   | Vercel     |
| `backend/`  | Django 5 · Django REST Framework · PostgreSQL     | Railway    |

Project conventions live in [`CLAUDE.md`](./CLAUDE.md); the build checklist is
in [`PLAN.md`](./PLAN.md). Every change is verified with the
`verify-agape-change` skill (`.claude/skills/verify-agape-change/SKILL.md`).

## Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm test           # vitest run
npm run build      # production build
```

## Backend

The system Python lacks `ensurepip`, so pip is bootstrapped into the venv:

```bash
cd backend
python3 -m venv --without-pip .venv
curl -sS https://bootstrap.pypa.io/get-pip.py | .venv/bin/python
.venv/bin/pip install -r requirements.txt
.venv/bin/python manage.py migrate
.venv/bin/python manage.py runserver   # http://localhost:8000
.venv/bin/pytest                       # tests
```

### Configuration (environment variables)

| Variable        | Purpose                                    | Default (dev)             |
|-----------------|--------------------------------------------|---------------------------|
| `SECRET_KEY`    | Django secret key                          | insecure dev key          |
| `DEBUG`         | `True`/`False`                             | `True`                    |
| `ALLOWED_HOSTS` | comma-separated hosts                      | `localhost,127.0.0.1`     |
| `DATABASE_URL`  | Postgres URL (psycopg); sqlite if unset    | local `db.sqlite3`        |

Never commit secrets or real student data. Set production values in the
Vercel and Railway dashboards.

## Deploy

- **Frontend:** pushing to `main` auto-deploys via Vercel.
- **Backend:** pushing to `main` auto-deploys via Railway; run
  `python manage.py migrate` against the production database as part of deploy.
- After every deploy, `GET /api/health/` must return 200 and the production
  homepage must return 200 and contain "Your future is here".
