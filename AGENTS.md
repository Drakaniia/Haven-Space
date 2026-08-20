# Haven Space Project Context

Haven Space is a boarding house platform connecting boarders and landlords, with an admin management layer. It is built as a modern serverless application leveraging the Cloudflare ecosystem.

## Project Overview

- **Frontend:** TanStack Start (React) with SSR, file-based routing, and Tailwind CSS, running on Cloudflare Pages (`haven-space` project, `https://haven-space.pages.dev`).
  - **Hosting:** Cloudflare Pages. The app builds in Worker mode (`apps/web/wrangler.jsonc`); `scripts/build/build-pages.mjs` assembles the Pages bundle (`apps/web/dist/pages`: `_worker.js` + assets + `_routes.json`).
  - **Architecture:** Server functions (`createServerFn`) for data fetching, React Query for client state, `Protected` + `RoleShell` for role-based shells.
- **Backend:** RESTful API built with TypeScript and [Hono](https://hono.dev/).
  - **Hosting:** Cloudflare Workers.
  - **Database:** Cloudflare D1 (Distributed SQL).
  - **Authentication:** JWT-based (stored in cookies/localStorage) with bcrypt password hashing and Google OAuth support.
- **Uploads:** Handled via [UploadThing](https://uploadthing.com/).
- **Tooling:** [Bun](https://bun.sh/) is the primary runtime, package manager, and test runner. [Wrangler](https://developers.cloudflare.com/workers/wrangler/) for Cloudflare development and deployment.

## Project Structure

- `/apps/web`: TanStack Start frontend.
  - `/src/routes`: File-based TanStack routes (public, auth, boarder, landlord, admin).
  - `/src/components`: React components (`ui/`, `layout/`, `rooms/`, `auth/`).
  - `/src/lib`: API clients (`api/`), types, auth context, nav config.
  - `/src/styles`: Single Tailwind CSS entry.
- `/workers/api`: Cloudflare Worker API.
  - `/src`: TypeScript source.
    - `/repositories`: Data access layer using D1.
    - `/routes`: Hono route definitions.
    - `/lib`: Shared utilities (auth, validation, HTTP helpers).
  - `/migrations`: D1 database migrations.
- `/scripts`: Build scripts (`build/build-pages.mjs` assembles the Cloudflare Pages bundle, `setup/` holds install helpers, `tools/` holds utilities).
- `/docs`: Detailed project documentation (design, schemas, manuals).
- `.github/workflows/deploy.yml`: CI — checks (typechecks + API tests) gate the API Worker production deploy on push to `main`. The web app is deployed by the Cloudflare Pages git integration (bot previews on pull requests, production on push to `main`).

## Key Commands

### Setup

```bash
bun install
bun install --cwd workers/api
bun install --cwd apps/web
```

### Development

- **Run Frontend:** `bun run web:dev` (TanStack Start dev server at `http://localhost:3000`)
- **Run API:** `bun run cf:api:dev` (Starts Worker local dev server at `http://localhost:8000`)
- **Database Migrations (Local):** `bun run --cwd workers/api migrate:local`

### Testing & Quality

- **Typecheck Frontend:** `bun run web:typecheck`
- **Test Frontend:** `bun run web:test`
- **Typecheck API:** `bun run cf:api:typecheck`
- **Test API:** `bun run cf:api:test`
- **Format Code:** `bun run format`

### Deployment

- **Full Deploy:** `bun run deploy` (Deploys both the API Worker and the frontend)
- **Deploy API:** `bun run cf:api:deploy`
- **Deploy Frontend:** `bun run web:deploy` (builds the app, runs `scripts/build/build-pages.mjs`, then `wrangler pages deploy` to the `haven-space` project)
- **Pages bundle only:** `bun run pages:build` (assemble `apps/web/dist/pages` from the Worker-mode build)

The `haven-space` Pages project uses Cloudflare's **git integration** (connected to this GitHub
repo): every pull request gets a Cloudflare preview build with a comment + check, and every push
to `main` deploys to production — no `wrangler pages deploy` in CI needed. The Pages project's
git build settings are: build command
`bun install --cwd apps/web && bun run --cwd apps/web build && bun scripts/build/build-pages.mjs`,
output dir `apps/web/dist/pages` (assembled by `scripts/build/build-pages.mjs`). CI requires the
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets for the API Worker deploy.

## Development Conventions

### Backend

- **Hono & TypeScript:** Use Hono for routing. Strictly type environment bindings and request/response payloads.
- **Repository Pattern:** Keep database logic in `workers/api/src/repositories`. Routes should call repository methods rather than D1 directly.
- **Error Handling:** Use `HttpError` and `jsonResponse`/`responseFromError` helpers from `lib/http` for consistent API responses.
- **Validation:** Validate incoming JSON using helpers in `lib/validation`.

### Frontend

- **File-based routes:** Add pages as `.tsx` files under `apps/web/src/routes`; regenerate the route tree with `bun run web:build`.
- **Server functions:** Fetch API data with `createServerFn` from `@tanstack/react-start`; keep mutations in `apps/web/src/lib/api/*`.
- **Role shells:** Wrap role pages in `<Protected role="...">` + `<RoleShell>`; configure nav in `apps/web/src/lib/nav.ts`.
- **UI primitives:** Reuse `components/ui/*` (Card, DataTable, Modal, Button, Field).

### General

- **Naming:** Use `camelCase` for JavaScript/TypeScript variables and functions, `snake_case` for database columns and API response fields (where matching DB schema).
- **Commits:** Follow conventional commit messages.
- **File-Router Nesting:** `apps/web/src/routes/` uses TanStack file-router directory-per-segment convention; nesting depth >4 there is intentional and exempt from the 4-level audit threshold. Enforce ≤4 only for non-routes trees (`components/`, `lib/`, `workers/api/src/`).
