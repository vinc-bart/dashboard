# Paris Ouverte

French-first civic dashboard on [opendata.paris.fr](https://opendata.paris.fr). Next.js 16, Better Auth, SQLite. Node 22 (what CI and the Docker image use).

**Live (app):** [dashboard.vvbb.fr](https://dashboard.vvbb.fr) — Next.js on Vercel, libSQL on Turso (`main`).

**Static demo:** [vvbb.fr/dashboard](https://vvbb.fr/dashboard/fr/) — export FTP on OVH (`demo` branch). Auth, admin, and e-mails are simulated in the browser; do not merge `demo` into `main`.

## Local

```bash
pnpm install
docker compose up -d mailpit
cp .env.example .env.local
```

Set `BETTER_AUTH_SECRET` in `.env.local` (`openssl rand -base64 32`). Keep `MAILER_PROVIDER=mailpit`, or set `MAILER_PROVIDER=console` to print mail in the dev terminal instead of starting Docker. For the map, paste the same free CARTO key into `NEXT_PUBLIC_CARTO_API_KEY` (see Production). Then:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Mailpit UI: [http://localhost:8025](http://localhost:8025).

`pnpm dev` keeps a footer under the logs. Press `p` for `/fr`, `l` for `/fr/login`, `d` for `/fr/dashboard`, and `q` to quit. The URLs stay put while the logs scroll, and they are clickable. `pnpm dev:raw` runs Next without the footer. When stdout is not a terminal, `pnpm dev` falls back to plain `next dev`.

SQLite lives in `data/` (gitignored) unless `TURSO_DATABASE_URL` is set, in which case the app uses Turso and does not migrate on boot. **Runtime** (`pnpm dev`, `pnpm start`, the Docker `CMD`) applies Drizzle migrations from `lib/db/migrations` to the local file (existing files are baselined, then any new SQL runs once). `pnpm build` / `next build` does **not** migrate — parallel build workers would race on the same file. After changing [`lib/db/schema.ts`](lib/db/schema.ts), run `pnpm db:generate` and commit the new files. Apply those files to Turso with `pnpm db:migrate` (needs `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`).

### First admin

Sign up through the normal flow (email verification + OTP), then promote in SQLite:

```bash
sqlite3 data/dashboard.sqlite "UPDATE user SET role = 'admin' WHERE email = 'you@example.com';"
```

The admin UI is at `/fr/dashboard/admin` (user list, stats, activity). Open a user for ban / unban, role changes, and session revoke. Optional break-glass: set `ADMIN_USER_IDS` to a comma-separated list of user ids in `.env.local` (and on Vercel). Prefer the `role` column over the env list for day-to-day admins.

To fill the admin UI with demo users, sessions, favorites, and activity (local SQLite only):

```bash
DATA_DIR=./data BETTER_AUTH_URL=http://localhost:3000 pnpm db:seed-demo
```

Use `pnpm db:seed-demo -- --reset` to remove `@seed.local` users and any `seed-*` demo rows, then reseed. Seed accounts are for admin viewing only (no login password).

To sign in from a browser without Mailpit, create one local user. Set `DEV_LOGIN_PASSWORD` in `.env.local` (8 to 128 characters, never commit it), then:

```bash
pnpm db:dev-login
```

The command refuses to run when `NODE_ENV=production`, when `TURSO_DATABASE_URL` is set, or when `BETTER_AUTH_URL` is not localhost. If `.env.local` points at Turso, empty that variable for this command only: `TURSO_DATABASE_URL= TURSO_AUTH_TOKEN= pnpm db:dev-login`. Sign in as `agent@localhost`. In development the one-time code is printed in the `pnpm dev` log as `[dev] Sign-in code for agent@localhost: …`, even with Mailpit configured. The dev server has to be using this same SQLite file.

`pnpm test` and `pnpm lint` before pushing. `pnpm test` is Vitest: helper unit tests, i18n key parity, the Open Data records API, favorite/profile actions against a temp SQLite file, and a few Testing Library checks. After `pnpm build`, `pnpm test:e2e` runs Playwright smokes (landing, locale switch, login error, seeded dashboard, Nature tabs, Vélib’ filter/favorites, profile save) plus axe on landing, login, and dashboard. First time locally: `pnpm exec playwright install --with-deps chromium`.

Dependabot opens weekly PRs for npm and GitHub Actions. CI runs `pnpm audit` as a warning (it does not fail the job). [`.github/workflows/uptime.yml`](.github/workflows/uptime.yml) curls [dashboard.vvbb.fr/fr](https://dashboard.vvbb.fr/fr) every hour; a failed run is the alert.

## Lighthouse

GitHub Actions runs Lighthouse without failing the job on scores. Category scores (median of the runs) appear on the Actions **job summary**. Full HTML reports are artifacts on the workflow run.

- **PRs** — [`.github/workflows/lighthouse-pr.yml`](.github/workflows/lighthouse-pr.yml) audits `/fr`, `/fr/login`, `/fr/signup`, then `/fr/dashboard` and `/fr/dashboard/velib` against a local build (seeded session cookie, no production login).
- **Production** — [`.github/workflows/lighthouse-production.yml`](.github/workflows/lighthouse-production.yml) audits [dashboard.vvbb.fr](https://dashboard.vvbb.fr) public pages every Monday at 08:00 UTC. Run it by hand from the Actions tab (`workflow_dispatch`).

## Static demo (OVH FTP)

When you want a free showcase on the mutualisé host, branch **`demo`** exports a static site under `/dashboard` and deploys only that folder by FTP. It is **not** meant to be merged into `main`.

| | `main` | `demo` |
| --- | --- | --- |
| URL | [dashboard.vvbb.fr](https://dashboard.vvbb.fr) | [vvbb.fr/dashboard](https://vvbb.fr/dashboard/fr/) |
| Host | Vercel + Turso | OVH mutualisé (`www/dashboard/` via FTP) |
| Auth / admin / mail | Better Auth + DB | `localStorage` simulation |
| Open Data | Server proxy `/api/opendata/*` | Snapshot at build + browser fetch to opendata.paris.fr |
| Deploy | Vercel on `main` | [`.github/workflows/deploy-demo.yml`](.github/workflows/deploy-demo.yml) on push to `demo` |

Deploy syncs `out/` → **`www/dashboard/`** only (same pattern as the portfolio’s `www/portfolio/`). It never cleans `www/`, the site root, or sibling folders.

GitHub Actions secrets (same values as the portfolio / under-construction FTP account):

| Secret | Role |
| --- | --- |
| `FTP_HOST` | OVH FTP host |
| `FTP_USERNAME` | FTP login |
| `FTP_PASSWORD` | FTP password |
| `NEXT_PUBLIC_CARTO_API_KEY` | same CARTO key as Vercel; inlined when the static demo is built |

Push to `demo` to rebuild and upload. Uptime and alert crons stay pointed at **dashboard.vvbb.fr**.

## Production (Vercel + Turso)

The full app is a Next.js server on [Vercel](https://vercel.com). Accounts, sessions, favorites, and alerts live in [Turso](https://turso.tech) (libSQL). That stack does not run on OVH mutualisé; use the **`demo`** branch above for a static mirror there.

Local, CI, and the Docker image still use a SQLite file. The image entrypoint `chown`s `$DATA_DIR`, then drops to the `node` user. Do not add a Docker `VOLUME` instruction. On Vercel, `output: "standalone"` is off so the platform can build its own output.

1. Create a Turso database and run `pnpm db:migrate` with `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` set. Boot does not migrate a remote database.
2. Import this GitHub repo in a Vercel project (Node 22).
3. Set variables (use a **new** `BETTER_AUTH_SECRET`, not the local one):

   | Variable | Value |
   | --- | --- |
   | `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
   | `BETTER_AUTH_URL` | `https://dashboard.vvbb.fr` (use the `*.vercel.app` URL while testing before DNS) |
   | `TURSO_DATABASE_URL` | Turso database URL |
   | `TURSO_AUTH_TOKEN` | Turso auth token |
   | `MAILER_PROVIDER` | `resend` |
   | `RESEND_API_KEY` | from Resend |
   | `EMAIL_FROM` | a sender Resend accepts, e.g. `Paris Ouverte <noreply@vvbb.fr>` |
   | `CONTACT_TO` | inbox for public contact form notifications |
   | `ADMIN_USER_IDS` | optional comma-separated break-glass admin user ids |
   | `CRON_SECRET` | shared secret for `/api/cron/alerts` (also set as GitHub Actions secret) |
   | `SENTRY_DSN` | optional; enables Sentry on the server when set (empty = off) |
   | `NEXT_PUBLIC_SENTRY_DSN` | optional; same DSN for the browser SDK (required for client errors) |
   | `SENTRY_AUTH_TOKEN` | optional build variable; uploads source maps when set with `SENTRY_ORG` / `SENTRY_PROJECT` |
   | `SENTRY_ORG` | optional; defaults to `self-bnv` for source maps |
   | `SENTRY_PROJECT` | optional; defaults to `paris-ouverte` for source maps |
   | `NEW_RELIC_LICENSE_KEY` | optional; leave empty on Vercel (the agent expects a long-lived process) |
   | `HEALTHCHECKS_PING_URL` | optional; healthchecks.io ping URL for the alerts cron |
   | `NEXT_PUBLIC_CARTO_API_KEY` | free CARTO basemap key ([request](https://carto.com/basemaps/apikey/)); same value as `.env.local`. Inlined at build time — redeploy after setting it |

   Empty observability variables leave each tool disabled. The app builds and runs without them. `DATA_DIR` is unused when `TURSO_DATABASE_URL` is set.

4. Add custom domain `dashboard.vvbb.fr` on the Vercel project.
5. At OVH (DNS zone `vvbb.fr`): `CNAME` name `dashboard` → `cname.vercel-dns.com`. Wait for SSL.
6. Add the same `CRON_SECRET` as a GitHub Actions repository secret so `.github/workflows/alerts-cron.yml` can POST every 10 minutes.
7. Optional monitoring:
   - **UptimeRobot:** HTTP(s) monitor on `https://dashboard.vvbb.fr/api/health` every 5 minutes (email on failure). No app secret.
   - **healthchecks.io:** create a check (period 10 minutes), set `HEALTHCHECKS_PING_URL` on Vercel to the check’s ping URL.
   - **SonarQube Cloud:** set GitHub secrets `SONAR_TOKEN` and `SONAR_ORGANIZATION`; the Sonar workflow skips until both exist.

Signup and 2FA emails need a verified Resend domain. Vélib’ alert e-mails use the same mailer.
