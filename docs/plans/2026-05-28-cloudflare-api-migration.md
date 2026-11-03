# Cloudflare API Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the Haven Space PHP API into a TypeScript Cloudflare Workers API in small, testable slices.

**Architecture:** Use `workers/api/` as the active backend with Hono, Wrangler, Worker-native `fetch`, and explicit route modules. The former PHP backend has been removed by request; payments and messages are deferred TODO route groups.

**Tech Stack:** Cloudflare Workers, Wrangler, TypeScript, Hono, Bun test runner.

---

## Migration Checklist

- [x] Phase 0: Scaffold a Worker API without touching PHP routes.
- [x] Phase 0: Port the current router smoke endpoint: `GET /api/test` and `GET /test`.
- [x] Phase 1: Add shared Worker utilities for JSON responses, auth headers, and request validation.
- [x] Phase 2: Port authentication endpoints from the former PHP auth API.
- [x] Phase 2a: Port `/auth/check-email` to a D1-backed Worker route.
- [x] Phase 3: Port planned public room/listing endpoints from `functions/api/rooms/` and `functions/api/properties/`.
- [x] Phase 3a: Port `/api/rooms/popular-locations` to a D1-backed Worker route.
- [x] Phase 3b: Port `/api/rooms/public` to a D1-backed Worker route.
- [x] Phase 3c: Port `/api/rooms/detail` to a D1-backed Worker route.
- [x] Phase 3d: Port `/api/rooms/similar` to a D1-backed Worker route.
- [x] Phase 3e: Port `/api/properties/all` to a D1-backed Worker route.
- [x] Phase 4: Port boarder application and saved-listing routes from `functions/src/Modules/Application` and legacy boarder endpoints.
- [x] Phase 4a: Port saved-listing read endpoints: `GET /api/boarder/saved-listings` and saved status checks.
- [x] Phase 4b: Port saved-listing write endpoints: `POST /api/boarder/saved-listings` and `DELETE /api/boarder/saved-listings`.
- [x] Phase 4c: Port application read endpoints for boarders and landlords.
- [x] Phase 4d: Port boarder application creation endpoint: `POST /api/boarder/applications`.
- [x] Phase 4e: Port boarder application deletion endpoint: `DELETE /api/boarder/applications/:id`.
- [x] Phase 4f: Port boarder booking confirmation endpoint: `POST /api/boarder/applications/:id/confirm`.
- [x] Phase 4g: Port landlord application status endpoint: `PATCH /api/landlord/applications/:id/status`.
- [ ] Phase 5: Port landlord property, room, boarder, announcement, calendar, and welcome-setting routes.
- [x] Phase 5a: Port landlord property read endpoints: `GET /api/landlord/properties` and `` aliases.
- [x] Phase 5b: Port landlord listing creation endpoint: `POST /api/landlord/listings`.
- [x] Phase 5c: Port landlord property soft delete endpoints: `DELETE /api/landlord/properties` and `` alias.
- [x] Phase 5d: Port landlord listing update endpoint: `PUT /api/landlord/listings/:id`.
- [x] Phase 5e: Port landlord room CRUD/status endpoints: `/api/landlord/rooms` and `` aliases.
- [x] Phase 5f: Use UploadThing and port property photo upload endpoint: `POST /api/landlord/listings/:id/photos`.
- [x] Phase 5g: Use UploadThing and port room photo upload endpoint: `POST /api/landlord/rooms/:id/photos`.
- [x] Phase 5h: Port room photo cover/delete endpoints: `PATCH` and `DELETE /api/landlord/rooms/:id/photos`.
- [x] Phase 5i: Port temporary property photo upload and listing photo reconciliation for edit flows.
- [x] Phase 5j: Port draft publish property alias: `POST /api/landlord/properties`.
- [x] Phase 5k: Port landlord dashboard stats: `GET /api/landlord/dashboard-stats`.
- [x] Phase 5l: Port landlord boarder read endpoints: `GET /api/landlord/boarders` and clean alias.
- [x] Phase 5m: Port landlord boarder write endpoints: `POST`, `PUT`, and `DELETE /api/landlord/boarders`.
- [x] Phase 7a: Add guarded frontend Worker API override and flow-critical Worker auth/admin support.
- [ ] Phase 6: Port payments, messages, and remaining optional integrations. Payments and messages are explicit Worker TODO stubs for now.
- [x] Phase 7: Switch frontend API base URL from PHP to the Worker.
- [x] Phase 8: Remove PHP endpoints. Browser/prod smoke was skipped by request.

## Files

- Create: `workers/api/package.json` for Worker-local dependencies and scripts.
- Create: `workers/api/wrangler.jsonc` for Cloudflare deployment configuration.
- Create: `workers/api/tsconfig.json` for strict TypeScript checking.
- Create: `workers/api/.dev.vars.example` for local non-secret configuration examples.
- Create: `workers/api/src/env.ts` for Worker binding types.
- Create: `workers/api/src/lib/http.ts` for shared JSON and error responses.
- Create: `workers/api/src/lib/auth.ts` for bearer token helpers, JWT verification, and role authorization.
- Create: `workers/api/src/lib/validation.ts` for JSON body and field validation helpers.
- Create: `workers/api/src/lib/d1.ts` for requiring the D1 binding.
- Create: `workers/api/src/repositories/users.ts` for auth-related user lookups.
- Create: `workers/api/src/repositories/locations.ts` for public location/listing lookups.
- Create: `workers/api/src/repositories/listings.ts` for public listing queries and related photos/rooms/amenities.
- Create: `workers/api/src/routes/auth.ts` for TypeScript auth endpoints.
- Create: `workers/api/src/routes/rooms.ts` for public room/listing endpoints.
- Create: `workers/api/migrations/0001_users_auth.sql` for auth-relevant D1 user columns.
- Create: `workers/api/migrations/0002_public_listings.sql` for public listing tables.
- Create: `workers/api/migrations/0003_public_room_listings.sql` for rooms, amenities, and listing photo tables.
- Create: `workers/api/migrations/0004_landlord_profiles.sql` for landlord display names used by map property pins.
- Create: `workers/api/migrations/0005_saved_listings.sql` for boarder saved property records.
- Create: `workers/api/migrations/0006_applications.sql` for rental applications.
- Create: `workers/api/migrations/0007_user_boarder_status.sql` for boarder status updates during booking confirmation.
- Create: `workers/api/src/repositories/applications.ts` for application list/detail reads.
- Create: `workers/api/src/repositories/saved-listings.ts` for saved listing reads.
- Create: `workers/api/src/routes/applications.ts` for boarder/landlord application endpoints.
- Create: `workers/api/src/routes/boarder.ts` for boarder-owned endpoints.
- Create: `workers/api/src/repositories/landlord-properties.ts` for landlord-owned property reads.
- Create: `workers/api/src/routes/landlord.ts` for landlord-owned endpoints.
- Create: `workers/api/src/routes/system.ts` for smoke and health routes.
- Create: `workers/api/src/index.ts` for the Hono application entrypoint.
- Create: `workers/api/test/system.test.ts` for parity tests.
- Create: `workers/api/test/boarder.test.ts` for boarder saved-listing route tests.
- Create: `workers/api/test/applications.test.ts` for application read route tests.
- Modify: `package.json` to expose root-level Cloudflare API commands.

## Task 1: Worker Scaffold

- [x] **Step 1: Create the Worker package**

Create `workers/api/package.json` with scripts for local dev, deploy, typecheck, and tests.

- [x] **Step 2: Add Wrangler config**

Create `workers/api/wrangler.jsonc` with `main` set to `src/index.ts`, `compatibility_date` set to `2026-05-28`, and `workers_dev` enabled for the first deployment.

- [x] **Step 3: Add TypeScript config**

Create `workers/api/tsconfig.json` with strict checking and Cloudflare Worker types.

- [x] **Step 4: Add local env example**

Create `workers/api/.dev.vars.example`.

## Task 2: Smoke Endpoint Parity

- [x] **Step 1: Add binding types**

Create `workers/api/src/env.ts` with public configuration bindings used by the Worker.

- [x] **Step 2: Add system routes**

Create `workers/api/src/routes/system.ts` with `GET /api/test`, `GET /test`, and `GET /api/health`.

- [x] **Step 3: Add Worker entrypoint**

Create `workers/api/src/index.ts`, mount the system routes, configure CORS, and return JSON for 404 and unhandled errors.

- [x] **Step 4: Add tests**

Create `workers/api/test/system.test.ts` and assert that `/api/test` keeps the existing PHP smoke response shape.

- [x] **Step 5: Verify**

Run:

```bash
cd workers/api
bun install
cd ../..
bun run cf:api:typecheck
bun run cf:api:test
```

Expected: TypeScript check passes and the system route tests pass.

## Task 2.5: Shared Worker Utilities

- [x] **Step 1: Add JSON response helpers**

Create `workers/api/src/lib/http.ts` with `jsonResponse`, `errorResponse`, `responseFromError`, and `HttpError`.

- [x] **Step 2: Add auth header helpers**

Create `workers/api/src/lib/auth.ts` with `bearerToken`, `requireBearerToken`, and `authorizationHeaders`.

- [x] **Step 3: Add request validation helpers**

Create `workers/api/src/lib/validation.ts` with `readJsonObject`, `requiredString`, `optionalString`, `requiredEmail`, and `requiredStringFields`.

- [x] **Step 4: Add focused tests**

Create tests under `workers/api/test/lib/` for HTTP responses, bearer token parsing, and JSON validation.

- [x] **Step 5: Verify**

Run:

```bash
bun run cf:api:typecheck
bun run cf:api:test
```

Expected: TypeScript check passes and all Worker tests pass.

## Data Layer Decision

Choose the Cloudflare data layer before porting database-backed endpoints:

- D1 for relational data currently represented by SQL migrations.
- UploadThing for uploaded files and room/property media.
- KV only for low-write cache/config data, not primary records.

## Task 3: Auth Migration

- [x] **Step 1: Inventory PHP auth behavior**

Read these files before editing TypeScript:

```bash
rg --files functions/api/auth | rg "\$"
rg -n "localStorage\.setItem|Authorization|auth/me|refresh-token|login\|register\" client/js client/views
```

- [x] **Step 2: Create auth route module**

Create `workers/api/src/routes/auth.ts` and mount it from `workers/api/src/index.ts`. Keep existing route aliases where the frontend still calls ``URLs, including`/auth/login`and`/auth/register`.

- [x] **Step 3: Port `/auth/check-email`**

Create `workers/api/src/repositories/users.ts`, query `users.google_id` and `users.password_hash` by email, ignore rows where `deleted_at IS NOT NULL`, and preserve this PHP response shape:

```json
{ "exists": true, "is_google_account": false }
```

- [x] **Step 4: Add D1 migration for auth user columns**

Create `workers/api/migrations/0001_users_auth.sql` with the `users` columns needed by auth and an index on active email lookups.

- [x] **Step 5: Add parity tests**

Create `workers/api/test/auth.test.ts` for unregistered emails, password users, Google-only users, missing email, and invalid email.

- [ ] **Step 6: Port remaining auth endpoints one at a time**

Next endpoints: `/auth/login`, then `/auth/register`. Each endpoint needs a failing test before implementation and a parity check against the PHP response shape.

## Task 3.5: Public Room And Listing Migration

- [x] **Step 1: Inventory public room/listing endpoints**

Read:

```bash
Get-Content functions\api\rooms\popular-locations
Get-Content functions\api\rooms\public
Get-Content functions\api\rooms\detail
Get-Content functions\api\rooms\similar
Get-Content functions\api\properties\all
```

- [x] **Step 2: Port `/api/rooms/popular-locations`**

Create `workers/api/src/routes/rooms.ts` and `workers/api/src/repositories/locations.ts`. Preserve the PHP response shape:

```json
{
  "data": {
    "locations": [
      {
        "name": "Manila, Metro Manila",
        "search_value": "Manila, Metro Manila",
        "property_count": 8,
        "avg_price": 0,
        "min_price": 0,
        "max_price": 0,
        "price_range": "Various prices"
      }
    ]
  }
}
```

- [x] **Step 3: Add D1 migration for public listing tables**

Create `workers/api/migrations/0002_public_listings.sql` with `addresses` and `properties` columns needed by public listing endpoints.

- [x] **Step 4: Add route tests**

Create `workers/api/test/rooms.test.ts` for location name cleanup and max `limit` behavior.

- [ ] **Step 5: Port remaining public endpoints one at a time**

- [x] **Step 5: Port `/api/rooms/public`**

Create `workers/api/src/repositories/listings.ts` and extend `workers/api/src/routes/rooms.ts`. Preserve the PHP response envelope:

```json
{
  "data": {
    "properties": [],
    "total_count": 0,
    "limit": 20,
    "offset": 0
  }
}
```

Support `search`, `price_min`, `price_max`, `sort_by`, `limit`, and `offset`.

- [x] **Step 6: Add D1 migration for listing child tables**

Create `workers/api/migrations/0003_public_room_listings.sql` with `rooms`, `amenities`, `property_photos`, and `room_photos`.

- [x] **Step 7: Add route tests**

Extend `workers/api/test/rooms.test.ts` for `/api/rooms/public` response shape, room/photo/amenity enrichment, filters, pagination, and max `limit` behavior.

- [ ] **Step 8: Port remaining public endpoints one at a time**

- [x] **Step 8: Port `/api/rooms/detail`**

Extend `workers/api/src/repositories/listings.ts` and `workers/api/src/routes/rooms.ts`. Preserve PHP-compatible responses for success, missing `id`, and not found.

- [x] **Step 9: Add route tests**

Extend `workers/api/test/rooms.test.ts` for `/api/rooms/detail` response shape, room/photo/amenity enrichment, missing `id`, and not-found behavior.

- [x] **Step 10: Port `/api/rooms/similar`**

Extend `workers/api/src/repositories/listings.ts` and `workers/api/src/routes/rooms.ts`. Preserve the PHP response envelope:

```json
{ "data": [] }
```

Support `id` and `limit`, validate missing `id`, return `404` for unpublished or missing source properties, and clamp `limit` to `1..10`.

- [x] **Step 11: Add route tests**

Extend `workers/api/test/rooms.test.ts` for `/api/rooms/similar` response shape, price/location bind values, max `limit`, missing `id`, and not-found behavior.

- [ ] **Step 12: Port remaining public endpoints one at a time**

- [x] **Step 12: Port `/api/properties/all`**

Create `workers/api/src/routes/properties.ts` and extend `workers/api/src/repositories/listings.ts`. Preserve the PHP response envelope:

```json
{
  "data": {
    "properties": [],
    "total_count": 0
  }
}
```

Support both `/api/properties/all` and `/api/properties/all` while the existing frontend still calls the PHP-suffixed URL.

- [x] **Step 13: Add D1 migration for landlord profile names**

Create `workers/api/migrations/0004_landlord_profiles.sql` with the `landlord_profiles` columns needed by the map endpoint, especially `user_id` and `boarding_house_name`.

- [x] **Step 14: Add route tests**

Create `workers/api/test/properties.test.ts` for `/api/properties/all` and `/api/properties/all` response shape, amenities/photos enrichment, occupancy status, and empty map results.

- [x] **Step 15: Move to the next phase after remote migration is applied**

Next phase: boarder application and saved-listing routes.

## Task 4: Boarder Saved Listings And Applications

- [x] **Step 1: Inventory saved-listing and application behavior**

Read:

```bash
Get-Content functions\api\boarder\saved-listings
Get-Content functions\src\Modules\Application\Controllers\ApplicationController
Get-Content functions\src\Modules\Application\Repositories\ApplicationRepository
Get-Content functions\src\Modules\Application\Services\ApplicationService
```

- [x] **Step 2: Add protected-route auth context**

Extend `workers/api/src/lib/auth.ts` to support the PHP JWT `Authorization: Bearer <token>` flow, cookie `access_token` fallback, and the PHP development bypass via `X-User-ID` or `user_id`.

- [x] **Step 3: Add D1 migration for saved listings**

Create `workers/api/migrations/0005_saved_listings.sql` with `boarder_id`, `property_id`, optional `room_id`, `saved_at`, `deleted_at`, and the boarder/property uniqueness/indexes used by the PHP route.

- [x] **Step 4: Port saved-listing read paths**

Create `workers/api/src/repositories/saved-listings.ts` and `workers/api/src/routes/boarder.ts`. Preserve PHP-compatible responses for:

```json
{ "success": true, "data": [], "count": 0 }
```

and:

```json
{ "success": true, "is_saved": false, "saved_at": null }
```

- [x] **Step 5: Add route tests**

Create `workers/api/test/boarder.test.ts` for saved-listing list response shape, saved status checks, missing-token auth behavior, and boarder-only authorization.

- [x] **Step 6: Port saved-listing write paths**

Extend `workers/api/src/repositories/saved-listings.ts` and `workers/api/src/routes/boarder.ts` for `POST /api/boarder/saved-listings` and `DELETE /api/boarder/saved-listings`. Preserve PHP-compatible success and error responses for missing `property_id`, missing property, unavailable property, missing room, duplicate save, missing saved listing, and successful soft delete.

- [x] **Step 6a: Add saved-listing write tests**

Extend `workers/api/test/boarder.test.ts` for `POST` and `DELETE` saved-listing response shapes and validation errors.

- [x] **Step 7: Port application read paths**

Create `workers/api/migrations/0006_applications.sql`, `workers/api/src/repositories/applications.ts`, and `workers/api/src/routes/applications.ts`. Preserve PHP-compatible envelopes for:

```json
{ "data": [] }
```

and:

```json
{ "error": "Application not found" }
```

Port these endpoints:

- `GET /api/boarder/applications`
- `GET /api/boarder/applications/:id`
- `GET /api/landlord/applications`
- `GET /api/landlord/applications/:id`

- [x] **Step 7a: Add application read tests**

Create `workers/api/test/applications.test.ts` for boarder list, landlord list, detail ownership, not-found behavior, and user-bound D1 query parameters.

- [x] **Step 8: Port `POST /api/boarder/applications`**

Extend `workers/api/src/repositories/applications.ts` and `workers/api/src/routes/applications.ts`. Preserve PHP-compatible responses for successful creation, invalid JSON, missing required fields, missing rooms, duplicate active applications, and re-applying after a soft-deleted duplicate.

- [x] **Step 8a: Add application creation tests**

Extend `workers/api/test/applications.test.ts` for the `POST /api/boarder/applications` response shape, validation errors, D1 query parameters, duplicate checks, and soft-deleted duplicate cleanup.

- [x] **Step 9: Port `DELETE /api/boarder/applications/:id`**

Extend `workers/api/src/repositories/applications.ts` and `workers/api/src/routes/applications.ts`. Preserve PHP-compatible responses for successful soft delete, missing applications, invalid IDs, and unauthorized boarders.

- [x] **Step 9a: Add application delete tests**

Extend `workers/api/test/applications.test.ts` for `DELETE /api/boarder/applications/:id` response shape, ownership checks, not-found behavior, invalid ID behavior, and D1 query parameters.

- [x] **Step 10: Port `POST /api/boarder/applications/:id/confirm`**

Create `workers/api/migrations/0007_user_boarder_status.sql` and extend `workers/api/src/repositories/applications.ts` plus `workers/api/src/routes/applications.ts`. Preserve PHP-compatible responses for required `payment_method`, missing applications, unauthorized boarders, non-accepted applications, successful confirmation, boarder status update, and cancellation of other active applications.

- [x] **Step 10a: Add application confirmation tests**

Extend `workers/api/test/applications.test.ts` for `POST /api/boarder/applications/:id/confirm` response shape, validation errors, status checks, ownership checks, and D1 query parameters.

- [x] **Step 11: Port `PATCH /api/landlord/applications/:id/status`**

Extend `workers/api/src/repositories/applications.ts` and `workers/api/src/routes/applications.ts`. Preserve PHP-compatible responses for verified-landlord authorization, required `status`, invalid statuses, missing applications, unauthorized landlords, already processed applications, successful status updates, and boarder email auto-verification when accepting an application.

- [x] **Step 11a: Add application status update tests**

Extend `workers/api/test/applications.test.ts` for `PATCH /api/landlord/applications/:id/status` response shape, validation errors, owner checks, processed-status checks, verified-landlord write gating, and D1 query parameters.

Next phase: landlord property, room, boarder, announcement, calendar, and welcome-setting routes.

## Task 4.5: Landlord Property, Room, Boarder, Announcement, Calendar, And Settings Migration

- [x] **Step 1: Inventory Phase 5 landlord routes**

Read `functions/api/landlord/*` and frontend usage under `client/js/views/landlord`. Prioritize route groups already used by multiple landlord pages.

- [x] **Step 2: Port landlord property read endpoints**

Create `workers/api/src/repositories/landlord-properties.ts` and `workers/api/src/routes/landlord.ts`. Preserve PHP-compatible response envelopes for:

```json
{
  "data": {
    "properties": [],
    "total_count": 0
  }
}
```

and:

```json
{
  "data": {
    "id": 10,
    "name": "Pine House"
  }
}
```

Port these aliases:

- `GET /api/landlord/properties`
- `GET /api/landlord/properties`
- `GET /api/landlord/properties?id=:id`
- `GET /api/landlord/properties?id=:id`

- [x] **Step 2a: Add landlord property read tests**

Create `workers/api/test/landlord.test.ts` for landlord property list/detail response shapes, `` alias behavior, empty lists, not-found behavior, photo URL normalization, and landlord-only authorization.

- [x] **Step 3: Port `POST /api/landlord/listings`**

Extend `workers/api/src/repositories/landlord-properties.ts` and `workers/api/src/routes/landlord.ts`. Preserve PHP-compatible responses for missing required fields, successful property creation, initial room creation, and amenity insertion. Return created room IDs so the existing frontend can upload room photos after property creation.

- [x] **Step 3a: Add landlord listing creation tests**

Extend `workers/api/test/landlord.test.ts` for `POST /api/landlord/listings` response shape, validation errors, custom room creation, fallback room creation, amenity inserts, and landlord-only authorization.

- [ ] **Step 4: Port remaining landlord property write paths one at a time**

Completed in Phase 5c:

- `DELETE /api/landlord/properties?id=:id`
- `DELETE /api/landlord/properties?id=:id`

Completed in Phase 5d:

- `PUT /api/landlord/listings/:id`
- Updates property fields, address fields, amenities, room count, and room capacity.
- Defers physical photo replacement/delete/move behavior until an UploadThing-backed media phase.

Completed in Phase 5e:

- `GET /api/landlord/rooms?propertyId=:id`
- `GET /api/landlord/rooms?propertyId=:id`
- `GET /api/landlord/rooms?propertyId=:id&id=:roomId`
- `GET /api/landlord/rooms?propertyId=:id&id=:roomId`
- `POST /api/landlord/rooms`
- `POST /api/landlord/rooms`
- `PUT /api/landlord/rooms?id=:roomId`
- `PUT /api/landlord/rooms?id=:roomId`
- `DELETE /api/landlord/rooms?id=:roomId`
- `DELETE /api/landlord/rooms?id=:roomId`
- Defers room photo upload, cover-photo update, and room-photo delete behavior until an UploadThing-backed media phase.

Completed in Phase 5f:

- `POST /api/landlord/listings/:id/photos`
- Adds `UPLOADTHING_TOKEN` Worker secret support and an UploadThing server upload helper.
- Stores UploadThing CDN URLs in `property_photos`.
- Removes the R2 binding/config so D1 migrations no longer require R2 enablement.
- Defers room photo upload, cover-photo update, and room-photo delete behavior to the next UploadThing-backed media slice.

Completed in Phase 5g:

- `POST /api/landlord/rooms/:id/photos`
- Accepts `roomPhotos[]` and `roomPhotos` multipart fields.
- Stores UploadThing CDN URLs in `room_photos`.
- Makes the first uploaded room photo the cover when the room has no existing photos.
- Defers room cover-photo update and room-photo delete behavior to the next UploadThing-backed media slice.

Completed in Phase 5h:

- `PATCH /api/landlord/rooms/:id/photos`
- `DELETE /api/landlord/rooms/:id/photos`
- Preserves PHP-compatible `photo_id` validation, photo-not-found responses, cover promotion, and success messages.
- Deletes UploadThing files best-effort when the stored URL contains a parseable UploadThing key.

Completed in Phase 5i:

- `POST /api/landlord/upload-photos`
- `POST /api/landlord/upload-photos`
- Uses UploadThing for temporary property photo uploads and returns the PHP-compatible `{ data: { urls } }` shape.
- Updates `PUT /api/landlord/listings/:id` to reconcile submitted `photos` and `photos_to_delete` arrays against `property_photos`.
- Deletes UploadThing files best-effort for removed property photo URLs.

Completed in Phase 5j:

- `POST /api/landlord/properties`
- Preserves the PHP draft publish response shape: `{ success: true, data: { property_id, message } }`.
- Creates the address, property, and amenities without invoking the richer listing creation route.

Completed in Phase 5k:

- `GET /api/landlord/dashboard-stats`
- `GET /api/landlord/dashboard-stats`
- `GET /api/landlord/dashboard/stats`
- Preserves the PHP dashboard response envelope: `{ data: { occupancy, revenue, renewals, payment_alerts } }`.
- Uses current D1 room/application tables for occupancy, occupied-room revenue, and active accepted/confirmed application counts.
- Keeps payment-alert counts at zero until payment tables are migrated, avoiding fake overdue/due-soon notices from the old PHP placeholder values.

Completed in Phase 5l:

- `GET /api/landlord/boarders?propertyId=:id`
- `GET /api/landlord/boarders?propertyId=:id`
- Preserves the PHP response envelope: `{ success: true, data: { boarders, total_count } }`.
- Uses migrated D1 `applications`, `users`, `rooms`, and property ownership checks.
- Returns the PHP response keys for phone/avatar/leave-request/payment fields, with null/default values where the PHP source tables are not in D1 yet.
- Includes `accepted`, `approved`, and `confirmed` application statuses so confirmed Worker bookings still appear as active boarders.

Completed in Phase 5m:

- `POST /api/landlord/boarders`
- `POST /api/landlord/boarders`
- `PUT /api/landlord/boarders`
- `PUT /api/landlord/boarders`
- `DELETE /api/landlord/boarders?id=:id`
- `DELETE /api/landlord/boarders?id=:id`
- Preserves PHP success envelopes for manual add/update/remove boarder actions.
- Uses existing D1 `users`, `applications`, `rooms`, and property ownership checks; no new migration required.
- Creates placeholder boarder users with role `boarder` and creates accepted application records for manual add.
- Updates migrated user/application/room pricing fields on edit, but does not store `phone` because D1 has no `phone_number` column yet.
- Soft-removes `accepted`, `approved`, and `confirmed` boarder applications so visible Worker boarders can be removed.

- [x] **Step 4a: Add landlord property soft-delete tests**

Extend `workers/api/test/landlord.test.ts` for successful property and room soft deletion, missing property IDs, missing/unauthorized properties, `` alias behavior, and landlord-only authorization.

- [x] **Step 4b: Add landlord listing update tests**

Extend `workers/api/test/landlord.test.ts` for listing update response shape, path/body ID handling, address updates, amenity replacement, room expansion/shrink behavior, missing/inaccessible listings, and landlord-only authorization.

- [x] **Step 4c: Add landlord room CRUD/status tests**

Create `workers/api/test/landlord-rooms.test.ts` for room list/detail response shapes, `` alias behavior, create validation, duplicate room numbers, update/status changes, soft delete, and landlord-only authorization.

- [x] **Step 4d: Add property photo upload tests**

Create `workers/api/test/landlord-photos.test.ts` for UploadThing upload behavior, returned CDN URLs, D1 `property_photos` inserts, validation errors, ownership checks, and UploadThing failure handling.

- [x] **Step 4e: Add room photo upload tests**

Extend `workers/api/test/landlord-rooms.test.ts` for UploadThing room photo upload behavior, returned CDN URLs, D1 `room_photos` inserts, validation errors, ownership checks, and UploadThing failure handling.

- [x] **Step 4f: Add room photo cover/delete tests**

Extend `workers/api/test/landlord-rooms.test.ts` for room photo cover selection, delete, cover promotion, missing `photo_id`, missing photo, and UploadThing file deletion key parsing.

- [x] **Step 4g: Add temporary property upload and listing photo reconciliation tests**

Extend `workers/api/test/landlord-photos.test.ts` for temporary UploadThing property uploads and validation errors. Extend `workers/api/test/landlord.test.ts` for `PUT /api/landlord/listings/:id` photo ordering, inserts, and deletions.

- [x] **Step 4h: Add draft publish property alias tests**

Extend `workers/api/test/landlord.test.ts` for `POST /api/landlord/properties` creation, response shape, D1 inserts, amenities, and PHP-compatible missing-field validation.

- [x] **Step 4i: Add landlord dashboard stats tests**

Create `workers/api/test/landlord-dashboard.test.ts` for `GET /api/landlord/dashboard-stats`, clean route aliases, empty-stat behavior, and landlord-only authorization.

- [x] **Step 4j: Add landlord boarder read tests**

Create `workers/api/test/landlord-boarders.test.ts` for `GET /api/landlord/boarders`, clean route alias, empty list behavior, missing `propertyId`, property ownership/not-found behavior, and landlord-only authorization.

- [x] **Step 4k: Add landlord boarder write tests**

Extend `workers/api/test/landlord-boarders.test.ts` for manual boarder creation, existing-user boarder application creation, create/update/delete validation errors, update D1 writes, soft remove, and PHP-compatible response envelopes.

Next endpoints: landlord announcement, settings, and payment/sidebar supporting routes.

## Task 5: Frontend Cutover

- [x] **Step 1: Add a configurable Worker API URL**

Modify `client/js/config.js` only after enough Worker endpoints exist for the page being tested. The Worker is now the default API; payments and messages remain explicit TODO stubs.

Completed in Phase 7a:

- `client/js/config.js` accepts `?apiBaseUrl=...`, `localStorage.havenSpaceApiBaseUrl`, or `window.HAVEN_SPACE_API_BASE_URL`.
- The default local/prod API remains unchanged so non-migrated routes still use PHP unless a Worker API is explicitly selected.
- Added flow-critical Worker routes:
  - `POST /auth/register`, `/auth/register`, `/api/auth/register`, `/api/auth/register`
  - `POST /auth/login`, `/auth/login`, `/api/auth/login`, `/api/auth/login`
  - `GET /auth/me`, `/auth/me`, `/api/auth/me`, `/api/auth/me`
  - `GET /api/admin/landlords`, `GET /api/admin/landlords`
  - `POST /api/admin/landlords`, `POST /api/admin/landlords`
- Added a stateful D1-backed smoke test for the requested flow:
  - landlord signup
  - blocked landlord listing write before approval
  - admin login and landlord approval
  - landlord creates a published listing
  - listing appears in public room search
  - boarder signup
  - boarder applies to the room
  - boarder applications dashboard API returns the submitted application
- The full frontend cannot be globally cut over yet because payment, notification, message, announcement, tenancy, and some boarder/landlord sidebar-supporting routes are still PHP-backed.

Completed in Phase 8a:

- Added `0008_platform_settings.sql` for the Worker-backed admin dashboard settings and summary routes.
- Migrated the remaining admin dashboard route group:
  - `GET /api/admin/summary`, `GET /api/admin/summary`
  - `GET /api/admin/users`, `GET /api/admin/users`
  - `PATCH /api/admin/users`, `PATCH /api/admin/users`
  - `GET /api/admin/properties`, `GET /api/admin/properties`
  - `POST /api/admin/properties`, `POST /api/admin/properties`
  - `GET /api/admin/applications`, `GET /api/admin/applications`
  - `GET /api/admin/settings`, `GET /api/admin/settings`
  - `PATCH /api/admin/settings`, `PATCH /api/admin/settings`
- Added D1-backed route tests covering admin overview, applications analytics, user status management, property moderation, platform settings, and admin-only access.
- Admin landlord verification from Phase 7a plus these Phase 8a routes means the admin dashboard no longer depends on `/functions/api/admin/*`, after applying the new D1 migration remotely.

Completed in Phase 8b:

- Added `0009_notifications.sql` for Worker-backed dashboard notification storage.
- Migrated notification and accepted-application helper routes:
  - `GET /api/notifications`
  - `GET /api/notifications/unread-count`
  - `PATCH /api/notifications/:id/read`
  - `PATCH /api/notifications/read-all`
  - `DELETE /api/notifications/:id`
  - `GET /api/boarder/accepted-applications`
  - `GET /api/boarder/has-accepted-applications`
- Kept accepted-application status compatible with both frontend call sites by returning top-level `has_accepted`/`property_ids` and a nested `data` object.
- Added D1-backed route tests for notification list/count/read/delete behavior, accepted application overlay data, and boarder-only authorization.

Completed in Phase 8c:

- Added `0010_account_basics.sql` for user phone/avatar fields, boarder onboarding profile state, and password reset request storage.
- Migrated account/profile/password/onboarding basics:
  - `GET /api/users/profile`
  - `PUT /api/users/profile`
  - `PATCH /api/users/profile`
  - `POST /api/users/avatar`
  - `POST /auth/change-password`, `POST /auth/change-password`
  - `POST /auth/forgot-password`, `POST /auth/forgot-password`
  - `POST /auth/verify-reset-code`, `POST /auth/verify-reset-code`
  - `POST /auth/resend-reset-code`, `POST /auth/resend-reset-code`
  - `POST /auth/reset-password`, `POST /auth/reset-password`
  - `POST /auth/refresh-token`, `POST /auth/refresh-token`
  - `POST /auth/logout`, `POST /auth/logout`
  - `GET /api/boarder/onboarding-status`
  - `POST /api/boarder/update-onboarding`
- Avatar uploads use UploadThing and store the returned avatar URL on the D1 `users` row.
- Added D1-backed route tests for profile load/update, avatar upload, authenticated password change, reset-code lifecycle, refresh/logout cookies, and boarder onboarding.
- Remaining production caveat: password reset routes now persist and validate reset codes, but outbound reset-code email delivery still needs a Worker-compatible transactional email provider before the PHP reset-email route can be retired.

Completed in Phase 8d:

- Added `0011_tenancy_leave_requests.sql` for application leave-request fields plus the minimal conversation, message, and payment tables touched by the leave-request flow.
- Migrated tenancy and leave-request routes:
  - `GET /api/boarder/tenancy`
  - `POST /api/boarder/leave-request`
  - `POST /api/landlord/approve-leave-request`
- `GET /api/boarder/tenancy` now returns active accepted or confirmed rental data for the boarder dashboard and tenancy page.
- `POST /api/boarder/leave-request` creates or reuses a direct landlord conversation, stores the automated leave message, cancels the active application, resets the boarder back to room-searching state, and cancels pending or overdue payments.
- Landlord boarder lists now read the persisted user phone/avatar and application leave-request fields instead of placeholder null values.
- Added D1-backed route tests for tenancy data, leave-request side effects, landlord leave approval, and PHP-compatible error responses.

Completed in Phase 8e:

- Added `0012_announcements.sql` for Worker-backed announcements and multi-property targeting.
- Migrated announcement routes:
  - `GET /api/landlord/announcements`
  - `POST /api/landlord/announcements`
  - `PUT /api/landlord/announcements/:id`
  - `DELETE /api/landlord/announcements/:id`
  - `GET /api/boarder/announcements`
  - `POST /api/boarder/announcements/:id/view`
- Announcement creation now writes notification rows for affected boarders using the D1 notification table from Phase 8b.
- Boarder announcement reads support all-property announcements and property-targeted announcements for accepted or confirmed applications.
- Added D1-backed route tests for landlord create/list/update/delete, boarder list/view-count behavior, notification side effects, and PHP-compatible validation/ownership errors.

Completed in Phase 8f cleanup:

- Removed the PHP `functions/` backend by request.
- Skipped payments and messages for now. Added Worker TODO stubs that return `501 FEATURE_DEFERRED` for `/api/payments/*`, `/api/landlord/payment*`, `/api/landlord/payments*`, `/api/landlord/send-reminder*`, `/api/boarder/landlord-payment-info`, and `/api/messages/*`.
- Switched default frontend API selection from the old PHP local API to the Worker defaults:
  - local: `http://localhost:8787`
  - production: `https://haven-space-api.floresaybaez574.workers.dev`
- Skipped final browser/prod smoke by request.

- [ ] **Step 2: Test page groups**

Move one frontend area at a time: public room browsing, auth, boarder dashboard, landlord dashboard, then admin.

- [ ] **Step 3: Remove PHP dependency**

Only remove PHP routes after the same route group passes Worker tests, local browser checks, and production Cloudflare smoke checks.
