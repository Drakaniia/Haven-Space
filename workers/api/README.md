# Haven Space Cloudflare API

TypeScript Cloudflare Worker replacement for the existing PHP API.

This package is now the active backend. The former PHP `functions/` backend has been removed; payment and message route groups are intentionally deferred and are not registered, so they fall through to the standard `404`.

## Commands

Run from the repo root:

```bash
bun run cf:api:typecheck
bun run cf:api:test
bun run cf:api:dev
```

Run a Cloudflare bundle validation from this directory:

```bash
bunx wrangler deploy --dry-run --env=""
```

Deploy production after Cloudflare authentication is configured:

```bash
bun run cf:api:deploy
```

Production CORS is configured for the TanStack Start frontend Worker at
`https://haven-space-web.<account>.workers.dev`. If the frontend gets a custom
domain later, add that origin to `APP_ORIGIN` in `wrangler.jsonc` and redeploy
the Worker. During local development, `http://localhost:3000` must be allowed.

## Secrets

Copy `.dev.vars.example` to `.dev.vars` for local values. Keep real secrets out of git.

Protected routes require `JWT_SECRET` for Worker-issued JWTs:

```bash
bunx wrangler secret put JWT_SECRET --env=""
```

Photo upload routes require an UploadThing token:

```bash
bunx wrangler secret put UPLOADTHING_TOKEN --env=""
```

Google sign-in/sign-up routes require OAuth credentials from Google Cloud. Set
the production redirect URI in Google Cloud to the Worker callback URL, for
example `https://haven-space-api.ovpcasss.workers.dev/api/auth/google/callback`.

```bash
bunx wrangler secret put GOOGLE_CLIENT_ID --env=""
bunx wrangler secret put GOOGLE_CLIENT_SECRET --env=""
# Optional when the default callback URL is not the one registered in Google Cloud.
bunx wrangler secret put GOOGLE_REDIRECT_URI --env=""
```

## Current Routes

The clean routes below are the canonical Worker API. Some legacy `` URL
aliases are still handled by the TypeScript Worker for backwards compatibility;
they are not PHP files and do not require a PHP runtime.

- `GET /api/test`
- `GET /test`
- `GET /api/health`
- `POST /auth/check-email`
- `GET /auth/google/authorize`
- `GET /api/auth/google/authorize`
- `GET /auth/google/callback`
- `GET /api/auth/google/callback`
- `POST /auth/register`
- `POST /api/auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/change-password`
- `POST /auth/forgot-password`
- `POST /auth/verify-reset-code`
- `POST /auth/resend-reset-code`
- `POST /auth/reset-password`
- `POST /auth/refresh-token`
- `POST /auth/logout`
- `GET /api/users/profile`
- `PUT /api/users/profile`
- `PATCH /api/users/profile`
- `POST /api/users/avatar`
- `GET /api/rooms/popular-locations`
- `GET /api/rooms/public`
- `GET /api/rooms/detail`
- `GET /api/rooms/similar`
- `GET /api/properties/all`
- `GET /api/properties/all`
- `GET /api/boarder/saved-listings`
- `GET /api/boarder/saved-listings?property_id=...`
- `POST /api/boarder/saved-listings`
- `DELETE /api/boarder/saved-listings`
- `GET /api/boarder/onboarding-status`
- `POST /api/boarder/update-onboarding`
- `GET /api/boarder/tenancy`
- `POST /api/boarder/leave-request`
- `POST /api/boarder/leave-now`
- `GET /api/boarder/applications`
- `POST /api/boarder/applications`
- `GET /api/boarder/applications/:id`
- `DELETE /api/boarder/applications/:id`
- `POST /api/boarder/applications/:id/confirm`
- `GET /api/boarder/accepted-applications`
- `GET /api/boarder/has-accepted-applications`
- `GET /api/boarder/announcements`
- `POST /api/boarder/announcements/:id/view`
- `GET /api/notifications?limit=...&offset=...`
- `GET /api/notifications/unread-count`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`
- `DELETE /api/notifications/:id`
- `TODO /api/payments/*` not registered — returns `404`
- `TODO /api/messages/*` not registered — returns `404`
- `GET /api/landlord/applications`
- `GET /api/landlord/applications/:id`
- `PATCH /api/landlord/applications/:id/status`
- `GET /api/landlord/dashboard-stats`
- `GET /api/landlord/dashboard-stats`
- `GET /api/landlord/dashboard/stats`
- `GET /api/landlord/activity?from=...&to=...&propertyId=...&types=...&limit=...&offset=...`
- `GET /api/landlord/boarders?propertyId=...`
- `GET /api/landlord/boarders?propertyId=...`
- `POST /api/landlord/approve-leave-request`
- `GET /api/landlord/announcements`
- `POST /api/landlord/announcements`
- `PUT /api/landlord/announcements/:id`
- `DELETE /api/landlord/announcements/:id`
- `POST /api/landlord/boarders`
- `POST /api/landlord/boarders`
- `PUT /api/landlord/boarders`
- `PUT /api/landlord/boarders`
- `DELETE /api/landlord/boarders?id=...`
- `DELETE /api/landlord/boarders?id=...`
- `GET /api/landlord/properties`
- `GET /api/landlord/properties`
- `GET /api/landlord/properties?id=...`
- `GET /api/landlord/properties?id=...`
- `POST /api/landlord/properties`
- `DELETE /api/landlord/properties?id=...`
- `DELETE /api/landlord/properties?id=...`
- `POST /api/landlord/listings`
- `PUT /api/landlord/listings/:id`
- `POST /api/landlord/upload-photos`
- `POST /api/landlord/upload-photos`
- `POST /api/landlord/listings/:id/photos`
- `GET /api/landlord/rooms?propertyId=...`
- `GET /api/landlord/rooms?propertyId=...`
- `GET /api/landlord/rooms?propertyId=...&id=...`
- `GET /api/landlord/rooms?propertyId=...&id=...`
- `POST /api/landlord/rooms`
- `POST /api/landlord/rooms`
- `POST /api/landlord/rooms/:id/photos`
- `PATCH /api/landlord/rooms/:id/photos`
- `DELETE /api/landlord/rooms/:id/photos`
- `PUT /api/landlord/rooms?id=...`
- `PUT /api/landlord/rooms?id=...`
- `DELETE /api/landlord/rooms?id=...`
- `DELETE /api/landlord/rooms?id=...`
- `GET /api/landlord/verification`
- `POST /api/landlord/verification/documents`
- `DELETE /api/landlord/verification/documents/:documentType`
- `POST /api/landlord/verification/submit`
- `GET /api/admin/landlords?status=...`
- `GET /api/admin/landlords?status=...`
- `GET /api/admin/landlords?id=...`
- `POST /api/admin/landlords`
- `POST /api/admin/landlords`
- `GET /api/admin/summary`
- `GET /api/admin/summary`
- `GET /api/admin/users?limit=...&offset=...&q=...&role=...`
- `GET /api/admin/users?limit=...&offset=...&q=...&role=...`
- `PATCH /api/admin/users`
- `PATCH /api/admin/users`
- `GET /api/admin/properties?moderation=...`
- `GET /api/admin/properties?moderation=...`
- `POST /api/admin/properties`
- `POST /api/admin/properties`
- `GET /api/admin/applications`
- `GET /api/admin/applications`
- `GET /api/admin/settings`
- `GET /api/admin/settings`
- `PATCH /api/admin/settings`
- `PATCH /api/admin/settings`

## Shared Utilities

- `src/lib/http.ts` centralizes JSON responses and `HttpError` conversion.
- `src/lib/auth.ts` parses JWT auth, supports the PHP `X-User-ID` development bypass, and authorizes route roles.
- `src/lib/validation.ts` validates JSON request bodies and common string/email fields.
- `src/lib/d1.ts` requires the Cloudflare D1 `DB` binding for database-backed routes.

## D1 Setup

The auth route expects a Cloudflare D1 binding named `DB`.

Create the database and add the generated binding to `wrangler.jsonc`:

```bash
cd workers/api
bunx wrangler d1 create haven-space
```

After Wrangler prints the `d1_databases` block, add it to `wrangler.jsonc`, keeping `binding` as `DB`.

Apply migrations:

```bash
bunx wrangler d1 migrations apply haven-space --local
bunx wrangler d1 migrations apply haven-space --remote
```

Phase 8 adds `0008_platform_settings.sql`, `0009_notifications.sql`, `0010_account_basics.sql`, `0011_tenancy_leave_requests.sql`, and `0012_announcements.sql`; apply them before using the Worker-backed admin dashboard, notification, profile, avatar, password, onboarding, tenancy, leave-request, and announcement routes remotely.

Password reset routes currently persist and validate reset codes in D1. Outbound reset-code email delivery still needs a Worker-compatible transactional email provider before production password reset emails are complete.

## UploadThing Setup

Photo upload routes use UploadThing and store the returned CDN URLs in D1.

Set the Worker secret before deploying upload routes:

```bash
bunx wrangler secret put UPLOADTHING_TOKEN --env=""
```

## Frontend API Override

Point the TanStack Start frontend at a Worker API without editing files by opening any page with:

```text
?apiBaseUrl=http://localhost:8000
```

The value is saved to `localStorage.havenSpaceApiBaseUrl`. Clear that key to return to the default Worker API. See `apps/web/src/lib/config.ts`.
