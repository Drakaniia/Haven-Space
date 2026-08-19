# Haven Space

Haven Space is a boarding house platform for boarders, landlords, and admins.

## Stack

| Layer    | Technology                                 |
| -------- | ------------------------------------------ |
| Frontend | TanStack Start (React) on Cloudflare Pages |
| API      | TypeScript Cloudflare Worker with Hono     |
| Database | Cloudflare D1                              |
| Uploads  | UploadThing                                |
| Tooling  | Bun, Wrangler, ESLint, Prettier            |

## Backend Status

The PHP `functions/` backend has been removed. The active API lives in [workers/api](./workers/api).

Payments and messages are intentionally deferred for now. The Worker returns `501 FEATURE_DEFERRED` for those route groups until they are implemented.

## Setup

Install dependencies:

```bash
bun install
bun install --cwd workers/api
bun install --cwd apps/web
```

> The root `bun install` only covers repo-level tooling; the app and API have their own
> lockfiles and dependencies.

Run the Worker API locally:

```bash
bun run cf:api:dev
```

The local API default is `http://localhost:8000`.

Run the TanStack Start frontend locally:

```bash
bun run web:dev
```

The local frontend URL is `http://localhost:3000`.

Apply D1 migrations:

```bash
cd workers/api
bunx wrangler d1 migrations apply haven-space --local
bunx wrangler d1 migrations apply haven-space --remote
```

Required Worker secrets:

```bash
cd workers/api
bunx wrangler secret put JWT_SECRET --env=""
bunx wrangler secret put GOOGLE_CLIENT_ID --env=""
bunx wrangler secret put GOOGLE_CLIENT_SECRET --env=""
bunx wrangler secret put UPLOADTHING_TOKEN --env=""
```

For Google auth, register both callback URLs as **Authorized redirect URIs** on the OAuth client
(`608119021847-prh01e77aid25pk175jd7o8pcm7ngequ.apps.googleusercontent.com`) in Google Cloud
Console → APIs & Services → Credentials:

```text
https://haven-space-api.floresaybaez574.workers.dev/api/auth/google/callback
http://localhost:8000/api/auth/google/callback
```

## Frontend API URL

The frontend defaults to:

- local: `http://localhost:8000`
- production: `https://haven-space-api.floresaybaez574.workers.dev` (set as the `API_BASE_URL` var in `apps/web/wrangler.jsonc`)

Override it without editing files:

```text
?apiBaseUrl=https://your-worker-url.example
```

The override is saved in `localStorage.havenSpaceApiBaseUrl`.

## CORS

The API Worker's `ALLOWED_ORIGINS` (or `APP_ORIGIN`) must include the frontend's origin so browser requests are accepted:

- local frontend: `http://localhost:3000`
- production frontend: `https://haven-space.pages.dev` (the `haven-space` Cloudflare Pages project)

## Legacy Design Reference

The legacy vanilla HTML/CSS/JS frontend previously in `client/` was removed in August 2026
(`client/` was git-ignored and deleted as part of the codebase audit — see `haven-space-audit.md`).
Design reference is now `apps/web` and `docs/assets/screenshot1.png`. The TanStack homepage and FAQ were rebuilt to match the legacy design.
## Scripts

| Command                    | Description                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------- |
| `bun run cf:api:dev`       | Run the Worker API locally                                                              |
| `bun run cf:api:test`      | Run Worker API tests                                                                    |
| `bun run cf:api:typecheck` | Typecheck Worker API code                                                               |
| `bun run cf:api:deploy`    | Deploy the production API Worker                                                        |
| `bun run web:dev`          | Run the TanStack Start frontend locally                                                 |
| `bun run web:test`         | Run frontend tests                                                                      |
| `bun run web:typecheck`    | Typecheck frontend code                                                                 |
| `bun run web:build`        | Build the frontend output                                                               |
| `bun run pages:build`      | Assemble the Cloudflare Pages bundle (`_worker.js` + assets) into `apps/web/dist/pages` |
| `bun run web:deploy`       | Build and deploy the frontend to Cloudflare Pages (`haven-space`)                       |
| `bun run deploy`           | Deploy API Worker and frontend to Cloudflare Pages                                      |
| `bun run format`           | Format files with Prettier                                                              |

## Production Deploy

Deploy the full Cloudflare stack:

```bash
bun run deploy
```

The frontend is built with Vite + `@cloudflare/vite-plugin` in Worker mode
(`apps/web/wrangler.jsonc`); `scripts/build/build-pages.mjs` then assembles a Cloudflare Pages
which is uploaded to the `haven-space` Pages project (production site:
`https://haven-space.pages.dev`). Run the pieces individually with
`bun run web:build` / `bun run pages:build` / `bun run web:deploy`.

The `haven-space` Pages project uses Cloudflare's **git integration** (connected to this GitHub
repo): every pull request gets a Cloudflare preview build — a bot comment + check with a unique
preview URL, just like Vercel — and every push to `main` deploys to production. The project's git
`bun install --cwd apps/web && bun run --cwd apps/web build && bun scripts/build/build-pages.mjs`,
output dir `apps/web/dist/pages`. Manual deploys (above) still work as a fallback. The GitHub
Actions workflow (`.github/workflows/deploy.yml`) runs the API tests and typechecks on every push
to `main`, then deploys only the `haven-space-api` Worker; it needs the `CLOUDFLARE_API_TOKEN`
and `CLOUDFLARE_ACCOUNT_ID` repository secrets.

Add the frontend origin to the API Worker's `ALLOWED_ORIGINS`/`APP_ORIGIN` as described under CORS above.

## Deferred Work

- Implement payments in the Worker.
- Implement messages in the Worker.
- Add production email delivery for password reset codes.
- Run a final browser/prod smoke pass when ready.
