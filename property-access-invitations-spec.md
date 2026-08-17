# Haven Space — Multi-Landlord Property Access & Invitation Feature Spec

**Status:** Implemented — this spec describes the shipped multi-landlord property access feature (PR #87).
**Scope:** Backend API (`workers/api`) + Frontend (`apps/web`) + Database migrations

---

## 1. Overview

Haven Space currently ties every property to exactly one landlord: the `properties.landlord_id`
column is the sole owner, and every landlord-scoped query in the API filters by
`landlord_id = <current user>`. This feature lets the **Admin** grant additional landlord
accounts access to an existing property, so multiple landlords can view and manage the same
property record, rooms, tenants, payments, and announcements — without duplicating the property
or transferring ownership.

### Example scenario

1. Landlord 1 creates an account and property "Haven Space Boarding House" (Primary Owner).
2. Landlord 2 creates an account, does not create a property.
3. Admin logs in, selects Landlord 2, selects Landlord 1's property, sends an invitation.
4. Landlord 2 receives an in-app notification + sees the invitation in a new **Invitations**
   section of the landlord dashboard.
5. Landlord 2 accepts → gains access. Both Landlord 1 and Landlord 2 now see the same property,
   rooms, tenants, and payments.
6. Property still belongs to Landlord 1. Landlord 2 is an **Authorized Landlord** (shared access).
7. Only the Admin can remove access. Landlord 1 cannot remove Landlord 2; if Landlord 1 wants
   Landlord 2 removed, they contact the Admin.

### Goals

- Admin-only invitation workflow (invite, revoke pending invite, remove active access).
- Many-to-many: one landlord can be authorized on multiple properties; one property can have
  multiple authorized landlords (in addition to the single primary owner).
- Full management parity for authorized landlords — everything the primary owner can do,
  **except** removing access and deleting the property.
- Clear ownership distinction surfaced in the UI (Owned vs. Shared badges).
- Full invitation audit history for the Admin.
- Invitation lifecycle statuses: `pending`, `accepted`, `rejected`, `revoked`.

### Non-goals (decisions from interview)

- **No email delivery.** Invitations are surfaced in-app only (notification + dashboard section).
- **No auto-expiry.** Invitations never expire; the `expired` status from the original request
  is **dropped** from the enum (reserved for possible future use, not implemented now).
- **Admin is the only inviter.** The primary landlord cannot invite other landlords.
- **No notifications to the primary owner.** Only the invitee is notified (on invite, and on
  removal of their access).

---

## 2. Decisions (from clarifying interview)

| #   | Question                 | Decision                                                                                                                                                                         |
| --- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Invitee rights           | **Full management parity** — rooms, tenants, payments, announcements, property edits, publishing. Exceptions: cannot remove other landlords' access, cannot delete the property. |
| 2   | Multi-property           | **Many-to-many** — a landlord can be authorized on multiple properties.                                                                                                          |
| 3   | Inviter                  | **Admin only.**                                                                                                                                                                  |
| 4   | Delivery                 | **In-app notification only** (no email).                                                                                                                                         |
| 5   | Expiry                   | **None** — stays `pending` until accepted, rejected, or revoked. `expired` status dropped.                                                                                       |
| 6   | Notifications            | **Invitee only** — notified when invited and when their access is removed. No owner notifications.                                                                               |
| 7   | Orphaned data on removal | **Warn before removal** — Admin sees a warning listing data created by that landlord (rooms/tenants/payments counts) and confirms; data always stays with the property.          |
| 8   | Eligibility              | **Verified landlords only** — invitees must be `role = 'landlord'`, `is_verified = 1`, `account_status = 'active'`.                                                              |
| 9   | Landlord UI              | **Merged with role badges** — shared properties appear in "My Properties" alongside owned ones, with an `Owned` / `Shared` badge. Plus a separate **Invitations** section.       |
| 10  | Owner visibility         | **Yes, read-only** — the primary owner sees an "Authorized Landlords" list on the property detail page but cannot modify it.                                                     |
| 11  | Admin UI                 | **New "Property Access" tab** in the Admin Dashboard.                                                                                                                            |
| 12  | Audit trail              | **Yes, full history** — chronological list of every invitation + status transition, per property and per landlord.                                                               |
| 13  | Re-invites               | **Allowed** after rejection or removal (new invitation row; history preserved).                                                                                                  |
| 14  | Suspension/ban           | **Auto-revokes** — suspending or banning a landlord ends their pending invitations and active access.                                                                            |
| 15  | Invitee UI location      | **New "Invitations" nav item** in `LANDLORD_NAV`.                                                                                                                                |
| 16  | Property deletion        | **Auto-revokes everything** — all pending invitations revoked and active access removed for that property.                                                                       |
| 17  | Accept/reject UX         | **Actions in the notification too** — Accept/Reject buttons on the in-app notification itself, in addition to the Invitations section.                                           |

---

## 3. Current State (relevant code)

### Data model

- **`users`** — `role` in (`boarder`, `landlord`, `admin`), `is_verified`, `account_status`,
  `deleted_at`. (migration `0001_users_auth.sql`)
- **`properties`** — single owner via `landlord_id`, plus `title`, `address_id`, `price`,
  `status`, `listing_moderation_status`, `deleted_at`. (migration `0002_public_listings.sql`)
- **`rooms`** — `property_id`, **`landlord_id` (creating landlord)**, `room_number`, `status`,
  `deleted_at`. Note: rooms carry their own `landlord_id`, which is the _creator_, not the owner.
- **`applications`** — `boarder_id`, `landlord_id`, `room_id`, `status`, `deleted_at`.
  **No `property_id` column** — the property is reached via `room_id → rooms.property_id`.
- **`payments`** (migration 0011) — `boarder_id`, `landlord_id`, `room_id`, `property_id`,
  `status`; **no `deleted_at`** (no soft delete).
- **`announcements`** (migration 0012) — `landlord_id` + a `announcement_properties` join table
  (announcement_id, property_id).
- **`notifications`** — `user_id`, `type`, `title`, `message`, `metadata` (JSON), `is_read`.
  Role-based type filtering in `listNotifications` via `roleVisibleTypes()`:
  - landlord: `new_application`, `application_accepted`, `application_rejected`, `booking_confirmed`
  - boarder: `application_accepted`, `announcement`

### Access enforcement (everywhere)

All landlord endpoints authenticate with `requireLandlord` (role check) and then pass
`user.user_id` into repository functions that filter by `landlord_id = ?`:

- `workers/api/src/repositories/landlord-properties.ts` — `listLandlordProperties`,
  `getLandlordPropertyDetail`, `findLandlordPropertyForUpdate`, `findLandlordPropertyIdentity`
- `workers/api/src/repositories/landlord-rooms.ts` — `findLandlordRoomProperty`,
  `listLandlordManagedRooms`, `getLandlordManagedRoom`, `findLandlordManagedRoomIdentity`
- `workers/api/src/repositories/landlord-boarders.ts`, `landlord-dashboard.ts`,
  `announcements.ts`, `applications.ts`, `tenancy.ts` — same pattern (`app.landlord_id = ?`,
  `p.landlord_id = ?`, etc.)
- Property deletion (`softDeleteLandlordProperty`) is guarded by `landlord_id = ?` — i.e.,
  owner-only today; must **stay owner-only**.

### Admin dashboard

Single tabbed page `apps/web/src/routes/admin/index.tsx` with tabs: Users, Properties,
Applications, Landlords, Settings. Backed by `workers/api/src/routes/admin.ts` +
`repositories/admin-dashboard.ts` + `repositories/admin-landlords.ts`.

### Frontend nav

`apps/web/src/lib/nav.ts` exports `LANDLORD_NAV` (Dashboard, My Listings, Properties, Map View,
Applications, Tenants, Messages, Payments, Announcements, Calendar, Activity, Pricing, Settings)
and `ADMIN_NAV` (Overview only).

### Migrations

Latest migration is `0013_landlord_profile_city_province.sql`; the next one is **`0014_*`**.

---

## 4. Data Model Changes

New migration `workers/api/migrations/0014_property_access.sql`:

### 4.1 `property_invitations`

Tracks every invitation the Admin sends (full audit history is kept — rows are never deleted).

```sql
CREATE TABLE IF NOT EXISTS property_invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  invitee_id INTEGER NOT NULL,          -- landlord receiving access
  invited_by INTEGER NOT NULL,          -- admin who sent it
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'revoked')),
  accepted_at TEXT,
  rejected_at TEXT,
  revoked_at TEXT,
  revoked_by INTEGER,           -- admin who revoked (for audit)
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (invitee_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE SET NULL
);

-- One pending invitation per (property, invitee)
CREATE UNIQUE INDEX IF NOT EXISTS ux_property_invitations_pending
  ON property_invitations(property_id, invitee_id)
  WHERE status = 'pending' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_property_invitations_invitee
  ON property_invitations(invitee_id, status, deleted_at);

CREATE INDEX IF NOT EXISTS idx_property_invitations_property
  ON property_invitations(property_id, status, deleted_at);
```

Status semantics:

- `pending` — sent by Admin, not yet acted on.
- `accepted` — invitee accepted; this **creates** a row in `property_access` (see below).
- `rejected` — invitee declined.
- `revoked` — Admin cancelled a pending invitation (before acceptance).
- There is **no `expired`** status (interview decision #5).

Accepting an invitation does not mutate its status afterwards — i.e., a later removal of access
leaves the invitation row as `accepted` (that is history), and the removal is recorded on the
`property_access` row (`removed_at`, `removed_by`). Re-inviting creates a **new** invitation row.

### 4.2 `property_access`

The active-access join table: one row per (property, authorized landlord) while access is live.
Removal is a soft delete (`removed_at`) so the audit trail survives.

```sql
CREATE TABLE IF NOT EXISTS property_access (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  landlord_id INTEGER NOT NULL,         -- authorized (non-owner) landlord
  granted_by INTEGER NOT NULL,          -- admin who granted
  invitation_id INTEGER,                -- invitation that created this access (audit link)
  granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_at TEXT,
  removed_by INTEGER,                   -- admin who removed
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id),
  FOREIGN KEY (removed_by) REFERENCES users(id),
  FOREIGN KEY (invitation_id) REFERENCES property_invitations(id)
);

-- One active access row per (property, landlord)
CREATE UNIQUE INDEX IF NOT EXISTS ux_property_access_active
  ON property_access(property_id, landlord_id)
  WHERE removed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_property_access_landlord
  ON property_access(landlord_id, removed_at);

CREATE INDEX IF NOT EXISTS idx_property_access_property
  ON property_access(property_id, removed_at);
```

Ownership remains expressed by `properties.landlord_id` — there is no access row for the owner.

### 4.3 Notification types

No schema change needed; two new `notifications.type` values are added and surfaced to
landlords:

- `property_invitation` — sent to the invitee when an Admin sends an invitation. `metadata`:
  `{ invitation_id, property_id, property_name, invited_by_name }`. The notification UI renders
  Accept / Reject buttons.
- `property_access_removed` — sent to a landlord when their active access is removed
  (or auto-revoked). `metadata`: `{ property_id, property_name }`.

Update `roleVisibleTypes()` in `workers/api/src/repositories/notifications.ts` so landlord
notifications include these two types.

---

## 5. Backend API Design

Follow existing conventions: Hono routes in `workers/api/src/routes/`, repository methods in
`workers/api/src/repositories/`, `requireD1`, `jsonResponse` / `errorResponse` from
`lib/http`, JSON validation via `lib/validation`.

New repository module: `workers/api/src/repositories/property-access.ts`.

### 5.1 Admin endpoints (`workers/api/src/routes/admin.ts`)

All require `role = 'admin'` (existing `requireAdmin` pattern).

| Method | Path                                                   | Purpose                                                                                                                                                                                                                                                                      |
| ------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/admin/property-access`                           | List all non-deleted properties, each with: owner info, authorized landlords (name, email, granted_at), pending invitations (invitee, invited_by, created_at). Optional `?propertyId=` to fetch one.                                                                         |
| POST   | `/api/admin/property-access/invitations`               | Body `{ landlordId, propertyId }`. Creates a `pending` invitation + `property_invitation` notification to the invitee. Validations below.                                                                                                                                    |
| POST   | `/api/admin/property-access/invitations/:id/revoke`    | Revoke a `pending` invitation (status → `revoked`, set `revoked_at`). 404 if not pending. Also soft-delete/flag the invitee's notification as handled.                                                                                                                       |
| POST   | `/api/admin/property-access/remove`                    | Body `{ propertyId, landlordId }`. Removes active access (set `removed_at`/`removed_by`). Before removal the response must expose the warning data (see 5.3); the frontend confirms, then calls this endpoint. Sends `property_access_removed` notification to the landlord. |
| GET    | `/api/admin/property-access/history`                   | Query params `?propertyId=` and/or `?landlordId=`. Chronological audit trail joining `property_invitations` + `property_access`: every invitation (status, actor, timestamps) and every grant/removal.                                                                       |
| GET    | `/api/admin/property-access/:propertyId/landlord-data` | Counts of rows created by a specific landlord in a property (rooms, applications/tenants, payments, announcements) for the pre-removal warning. Query param `?landlordId=`.                                                                                                  |

**Invitation validation (POST invitations):**

- `landlordId` and `propertyId` must be positive integers (400 otherwise).
- Property must exist and not be soft-deleted (404).
- Invitee must exist, `role = 'landlord'`, `is_verified = 1`, `account_status = 'active'`,
  not soft-deleted (400/422 with a clear message otherwise — mirrors the "verified landlords
  only" decision).
- Invitee must **not** be the property owner (400 — "This landlord already owns this property").
- No duplicate **pending** invitation for the same (property, invitee) (409).
- No **active** `property_access` row for the same (property, invitee) (409 — already has access).
- The primary owner is never an invitee; the admin cannot invite themselves if they somehow have
  a landlord role (defensive check).

**Remove access validations:**

- `propertyId` + `landlordId` must reference an **active** `property_access` row (404/409 if not).
- Owner removal is impossible by construction (owners have no access row).
- After removal, the access row keeps `removed_at`/`removed_by` for audit; the landlord's rooms,
  tenants, and payment records **remain** with the property (decision #7).

### 5.2 Landlord endpoints

New route file `workers/api/src/routes/landlord/invitations.ts`, mounted in
`workers/api/src/routes/landlord/index.ts` with `landlordRoutes.route('/api/landlord', invitationsRoutes)`
(mirrors how `rooms.ts` / `properties.ts` are mounted). Reuse `requireLandlord` from
`./shared`, and `requireVerifiedLandlordWrite` on accept (writes). All endpoints require
`role = 'landlord'`.

| Method | Path                                   | Purpose                                                                                                                                                                                                                                                                                                                                                                  |
| ------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/api/landlord/invitations`            | List the caller's invitations (all statuses, newest first). Pending ones drive the Invitations page.                                                                                                                                                                                                                                                                     |
| POST   | `/api/landlord/invitations/:id/accept` | Accept a `pending` invitation addressed to the caller. Validations: exists, is the caller's, status `pending`, property not deleted, invitee still verified/active. On success: set status → `accepted` + `accepted_at`, insert `property_access` row (`granted_by` = admin who sent the invite, `invitation_id` = this invitation). Mark the related notification read. |
| POST   | `/api/landlord/invitations/:id/reject` | Reject a `pending` invitation (status → `rejected`, `rejected_at`). Mark the related notification read.                                                                                                                                                                                                                                                                  |

**Accept/reject guard:** the invitation must belong to the authenticated landlord — a landlord can
only accept/reject invitations addressed to them (404 otherwise).

### 5.3 Pre-removal warning data (Admin)

`GET /api/admin/property-access/:propertyId/landlord-data?landlordId=X` returns counts:

```json
{
  "data": {
    "landlord_id": 4,
    "landlord_name": "Landlord Two",
    "property_id": 10,
    "property_name": "Haven Space Boarding House",
    "created": {
      "rooms": 2,
      "tenants": 3,
      "payments": 5,
      "announcements": 1
    }
  }
}
```

Definition of "created by": `rooms.landlord_id = X` (room creator), applications and payments
where `landlord_id = X`, announcements where `landlord_id = X` — all scoped to the property.
Exclude soft-deleted rows where the table supports it (rooms/applications/announcements have
`deleted_at`; **`payments` has no `deleted_at`** — count all payment rows for the landlord in
the property). The Admin UI shows these counts in a confirm dialog with
copy like: _"Removing access does not delete this data. It stays with the property."_

### 5.4 Access-aware queries (the core change)

Every landlord-scoped repository query must treat "has access" as:
`landlord_id = ?` (owner) **OR** property is in the caller's active `property_access` set.

Introduce a shared SQL fragment / helper, e.g.:

```sql
-- property is accessible when:
p.landlord_id = ?1
OR p.id IN (
  SELECT pa.property_id FROM property_access pa
  WHERE pa.landlord_id = ?1 AND pa.removed_at IS NULL
)
```

Files and functions to update (each `landlord_id = ?` filter becomes access-aware):

| Repository                      | Functions                                                                                                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `landlord-properties.ts`        | `listLandlordProperties` (add `role` = `owner`/`shared` to each row), `getLandlordPropertyDetail`, `findLandlordPropertyForUpdate`, `findLandlordPropertyIdentity`          |
| `landlord-rooms.ts`             | `findLandlordRoomProperty`, `listLandlordManagedRooms` (scope by property access, **not** `rooms.landlord_id`), `getLandlordManagedRoom`, `findLandlordManagedRoomIdentity` |
| `landlord-boarders.ts`          | boarder list/create/update/delete lookups (`app.landlord_id = ?` → property-access scoped)                                                                                  |
| `landlord-dashboard.ts`         | `getLandlordDashboardStats` — stats must aggregate **owned + shared** properties                                                                                            |
| `announcements.ts`              | list/create/update/delete scoped by property access                                                                                                                         |
| `applications.ts`, `tenancy.ts` | landlord-side application/tenancy queries scoped by property access                                                                                                         |

**Critical semantic note:** `rooms.landlord_id` is the _creator_ of the room, not the owner.
With full parity (decision #1), an authorized landlord must see and manage rooms created by the
owner (and vice versa). Room-scoped queries must therefore filter by **property access** and stop
requiring `rooms.landlord_id = <caller>`. `landlord_id` on rooms is kept as "created_by" for
audit (and for the removal warning in 5.3). The same principle applies to applications/payments:
they are property-scoped for visibility, while `landlord_id` records who acted.

**Owner-only operations stay owner-only:**

- `softDeleteLandlordProperty` (delete property, guarded by `properties.landlord_id = ?` in
  `routes/landlord/properties.ts` → `handleDeleteLandlordProperty`) — keep the guard.
- No new endpoint lets a landlord remove another landlord's access (there is no such endpoint at
  all; Admin owns removal).

**Implementation notes (specific touch points):**

- `applications` has **no `property_id` column** — the property is reached via
  `room_id → rooms.property_id`. `listLandlordApplications`
  (`repositories/applications.ts`, filters `app.landlord_id = ?`) and `canAccessApplication`
  (`routes/applications.ts`, checks `application.landlord_id === user.user_id` for landlords)
  must become property-access-aware via the room join.
- `rooms.landlord_id` is **nullable** (`ON DELETE SET NULL`) — treat as "created_by" only; the
  room list/detail/identity functions (`listLandlordManagedRooms`, `getLandlordManagedRoom`,
  `findLandlordManagedRoomIdentity` in `repositories/landlord-rooms.ts`) must scope by **property
  access**, not `rooms.landlord_id`. For `roomId`-only lookups (photo upload/cover/delete in
  `routes/landlord/rooms.ts`), resolve the room's `property_id` first and check property access.
- Announcements: `listLandlordAnnouncements` (`repositories/announcements.ts`) filters by
  `landlord_id = ?` and `listOwnedPropertyIds` restricts announcement targets to **owned**
  properties — both must become owned-or-shared for full parity.
- Landlord routes live in `routes/landlord/*` (`index`, `shared`, `listings`, `properties`,
  `rooms`, `boarders`, `dashboard`); helpers like `requireLandlord` are in
  `routes/landlord/shared.ts` — no monolithic `routes/landlord.ts` exists.

### 5.5 Auto-revocation hooks

- **User suspension/ban:** in `handleUpdateAdminUser` (`routes/admin.ts`, backed by
  `updateAdminUserStatus` in `repositories/admin-dashboard.ts`), when a user's `account_status`
  changes to `suspended` or `banned`: revoke their pending invitations (status → `revoked`) and
  set `removed_at`/`removed_by` on their active `property_access` rows. (Decision #14.)
- **Property soft-delete:** in `handleDeleteLandlordProperty`
  (`routes/landlord/properties.ts`, owner-only), before/after `softDeleteLandlordProperty`, also
  revoke all pending invitations for that property and remove all active `property_access` rows
  for it. (Decision #16.)

---

## 6. Frontend Design

### 6.1 Landlord

**Nav** (`apps/web/src/lib/nav.ts`): add to `LANDLORD_NAV`:

```ts
{ to: '/landlord/invitations', label: 'Invitations', icon: 'envelope', group: 'Main' },
```

**New route `apps/web/src/routes/landlord/invitations.tsx`** (`<Protected role="landlord">` +
`<RoleShell>`): lists the caller's invitations via `GET /api/landlord/invitations`.
Pending invitations render a Card with:

- Property name, owner name, date sent.
- **Accept** / **Reject** buttons (mutation + React Query invalidation, mirroring existing
  landlord pages' mutation pattern).

Accepted/rejected/revoked invitations show a status badge (reuse `StatusBadge`).

**Notifications**: the notification dropdown is `apps/web/src/components/layout/NotificationBell.tsx`
(renders title, message, mark-read, delete — no per-type actions today). Extend it so
`type = 'property_invitation'` renders Accept/Reject buttons inline (metadata carries
`invitation_id`); accepting/rejecting calls the same landlord endpoints and marks the
notification read. `property_access_removed` notifications render read-only with the property
name. This requires the `NotificationItem` type (`apps/web/src/lib/types.ts`) to keep exposing
`metadata` (it already does, as `unknown`).

**My Properties** (`apps/web/src/routes/landlord/properties.tsx` + `listings.tsx`): the
`getProperties` API now returns a `role` field per property (`owner` | `shared`). Render an
`Owned` / `Shared` badge (reuse `StatusBadge` or a small inline badge) next to each property.
Shared properties are visually identical otherwise (full parity).

**Property detail** (`landlord/listings/$id/edit.tsx` and any property detail view): when the
caller is the **owner**, show a read-only **"Authorized Landlords"** card (names, emails,
granted dates, from `GET /api/admin`-style data exposed to the owner — see 6.3). No remove
actions, plus a hint: _"To change who has access, contact the Haven Space Admin."_

### 6.2 Admin

**Admin Dashboard** (`apps/web/src/routes/admin/index.tsx`): add a **"Property Access"** tab
(icon, e.g., `key` or `users`). The tab contains:

1. **Invite form**: landlord select (from `GET /api/admin/landlords?status=verified` so only
   verified landlords are selectable — `listAdminLandlords` already supports the `status`
   filter, though the current frontend `getLandlords` calls without it) → property select (from
   `GET /api/admin/properties?moderation=all`, returns up to 100 properties) → Send invitation.
   Surface API validation errors (e.g., "already has access", "must be a verified landlord").
2. **Property list**: each property expandable to show authorized landlords + pending
   invitations. Actions per row: **Revoke** (pending invite), **Remove access** (active access).
3. **Remove flow**: click Remove → dialog fetches
   `GET /api/admin/property-access/:propertyId/landlord-data?landlordId=` → shows counts of
   rooms/tenants/payments/announcements created by that landlord + copy that data stays with the
   property → **Confirm remove** calls `POST /api/admin/property-access/remove`.
4. **History**: a "History" view (per property or per landlord) rendering
   `GET /api/admin/property-access/history` — chronological rows of sent/accepted/rejected/
   revoked invitations and grants/removals.

### 6.3 Owner visibility of authorized landlords

**Decision: option (a)** — include an `authorized_landlords` array in the existing
`GET /api/landlord/properties?id=X` detail response, **only** when the caller is the owner
(`properties.landlord_id = caller`). Authorized landlords receive `authorized_landlords: []`
(or the field is omitted) so they cannot enumerate who else shares the property.

```json
{
  "data": {
    "id": 10,
    "name": "Haven Space Boarding House",
    "role": "owner",
    "authorized_landlords": [
      {
        "id": 4,
        "first_name": "Landlord",
        "last_name": "Two",
        "email": "l2@example.com",
        "granted_at": "2026-08-16 10:00:00"
      }
    ]
  }
}
```

The same detail response adds `role` (`owner` | `shared`) for every caller, mirroring the list
endpoint. No extra round-trip endpoint is needed.

Owner-only check: `properties.landlord_id = caller`. Authorized landlords never see the list.

### 6.4 Types & API client

- Extend `apps/web/src/lib/types.ts`: `PropertyInvitation`, `PropertyAccessRow`,
  `AuthorizedLandlord`, `PropertyRole = 'owner' | 'shared'` (add `role` to `LandlordProperty`).
- Extend `apps/web/src/lib/api/landlord.ts` and `apps/web/src/lib/api/admin.ts` with typed
  functions for the endpoints in section 5.

---

## 7. Edge Cases & Rules Summary

| #   | Case                                                           | Behavior                                                                                                                              |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Admin invites the primary owner                                | Rejected (400) — owners don't need invitations.                                                                                       |
| 2   | Admin invites an unverified / suspended / banned landlord      | Rejected (400/422) — verified, active landlords only.                                                                                 |
| 3   | Duplicate pending invite to same (property, landlord)          | 409 conflict.                                                                                                                         |
| 4   | Invite a landlord who already has active access                | 409 conflict.                                                                                                                         |
| 5   | Re-invite after rejection or removal                           | Allowed — new invitation row; old rows preserved for audit.                                                                           |
| 6   | Accept an already-accepted/rejected/revoked invite             | 409/404 — only `pending` invitations are actionable.                                                                                  |
| 7   | Landlord accepts, then Admin removes access                    | Access row gets `removed_at`; invitation stays `accepted` (history); landlord notified; their created data remains with the property. |
| 8   | Landlord with access creates rooms/tenants/payments            | Visible to all landlords with access (property-scoped queries). `landlord_id` on those rows = creator for audit + removal warning.    |
| 9   | Admin suspends/bans a landlord                                 | Pending invitations revoked; active access removed (auto).                                                                            |
| 10  | Primary owner deletes the property (soft delete)               | All pending invitations revoked; all active access rows removed.                                                                      |
| 11  | Landlord with no own property is invited                       | Works — they manage the shared property only; "My Properties" shows it with a `Shared` badge.                                         |
| 12  | Authorized landlord tries to delete the property               | Denied — delete stays owner-only (`landlord_id` guard).                                                                               |
| 13  | Authorized landlord tries to remove another landlord           | No such endpoint exists; UI shows no remove actions for them.                                                                         |
| 14  | Invited landlord's account is later suspended before accepting | Pending invitation revoked (auto).                                                                                                    |
| 15  | Property has multiple shared landlords (e.g., L2 + L3)         | Each is a separate invitation + access row; all can manage simultaneously.                                                            |

---

## 8. Implementation Plan (suggested order)

1. **Migration** `workers/api/migrations/0014_property_access.sql` (tables + indexes above).
2. **Repository** `workers/api/src/repositories/property-access.ts` — invitation CRUD, access
   grant/remove, history, landlord-data counts, auto-revoke helpers.
3. **Notification wiring** — new types + `roleVisibleTypes` update + create/read-mark helpers.
4. **Admin routes** — endpoints from 5.1 + auto-revoke hooks in `handleUpdateAdminUser`.
5. **Landlord routes** — `property-access.ts` with invitations accept/reject.
6. **Access-aware query refactor** — the repository sweep in 5.4 (largest chunk; run API tests
   after each repository group: properties → rooms → boarders/dashboard → announcements/
   applications/tenancy).
7. **Frontend** — types, API clients, `LANDLORD_NAV` entry, Invitations page, notification
   actions, Property Access admin tab, Owned/Shared badges, owner's read-only authorized list.
8. **Tests & QA** — see section 9.

---

## 9. Testing & Verification

### API tests (`workers/api/test/`, run with `bun run cf:api:test`)

New test file `workers/api/test/property-access.test.ts` covering:

- Admin sends invitation → `pending` + notification created for invitee.
- Validation rejects: owner as invitee, unverified invitee, duplicate pending, existing access.
- Invitee accepts → `accepted`, `property_access` row created, notification readable.
- Invitee rejects → `rejected`, no access row.
- Admin revokes pending → `revoked`.
- Admin removes access → `removed_at` set, `property_access_removed` notification, landlord's
  created rows still present and visible to owner.
- Access-aware queries: shared landlord can list/manage rooms, boarders, payments, dashboard
  stats of the shared property; owner still sees everything.
- Owner-only guards: shared landlord cannot delete property; shared landlord cannot see the
  authorized-landlords list.
- Auto-revoke on suspend/ban and on property delete.
- Invitations history endpoint returns chronological audit trail.

### Typechecks & builds

- `bun run cf:api:typecheck`
- `bun run web:typecheck`

### Manual QA (via `bun run web:dev` + `bun run cf:api:dev`)

Walk the exact example scenario from section 1: Landlord 1 creates property → Admin invites
Landlord 2 → Landlord 2 accepts via notification → both manage the property → Admin removes
Landlord 2 (with warning) → Landlord 2 loses access, property intact.

---

## 10. Out of Scope / Future

- Email delivery of invitations.
- Invitation expiry (`expired` status) — dropped per interview; can be added later via a
  scheduled sweep if desired.
- Primary-landlord-initiated invitations or removals.
- Notifications to the primary owner about access changes.
- Role tiers beyond owner/shared (e.g., read-only invitees) — schema reserves room for a `role`
  column on `property_access` if ever needed.

---

## 11. API Contract Examples

Conventions (existing): success bodies wrap data in `{ "data": ... }` via `jsonResponse`;
errors use `errorResponse(status, message)` which produces **`{ "error": <message> }`** — there is no
`message` key (an optional `code`/`details` may be added). Field naming follows the codebase's
snake_case API style for DB-backed fields.

### 11.1 POST `/api/admin/property-access/invitations` — send invitation

Request:

```json
{ "landlordId": 4, "propertyId": 10 }
```

Response `201 Created`:

```json
{
  "message": "Invitation sent",
  "data": {
    "invitation": {
      "id": 21,
      "property_id": 10,
      "property_name": "Haven Space Boarding House",
      "invitee_id": 4,
      "invitee_name": "Landlord Two",
      "invited_by": 1,
      "status": "pending",
      "created_at": "2026-08-16 10:00:00"
    }
  }
}
```

Error examples (all `400`/`409`, shape `{ "error": ... }`):

```json
{ "error": "Landlord must be verified and active to receive property access." }
{ "error": "This landlord already has a pending invitation to this property." }
{ "error": "This landlord already has access to this property." }
{ "error": "This landlord already owns this property." }
```

### 11.2 GET `/api/landlord/invitations` — invitee's invitations

Response `200`:

```json
{
  "data": {
    "invitations": [
      {
        "id": 21,
        "property_id": 10,
        "property_name": "Haven Space Boarding House",
        "owner_name": "Landlord One",
        "invited_by": 1,
        "status": "pending",
        "created_at": "2026-08-16 10:00:00"
      }
    ]
  }
}
```

### 11.3 POST `/api/landlord/invitations/:id/accept` — accept invitation

Response `200`:

```json
{
  "message": "Invitation accepted",
  "data": {
    "access": {
      "property_id": 10,
      "property_name": "Haven Space Boarding House",
      "role": "shared"
    }
  }
}
```

Errors: `404` if not found / not addressed to caller; `409` `{ "error": "Invitation not pending" }`.

### 11.4 POST `/api/landlord/invitations/:id/reject` — reject invitation

Response `200`:

```json
{ "message": "Invitation rejected" }
```

### 11.5 GET `/api/admin/property-access` — properties with access state

Response `200`:

```json
{
  "data": {
    "properties": [
      {
        "id": 10,
        "title": "Haven Space Boarding House",
        "owner": { "id": 3, "name": "Landlord One" },
        "authorized_landlords": [
          {
            "id": 4,
            "first_name": "Landlord",
            "last_name": "Two",
            "email": "l2@example.com",
            "granted_at": "2026-08-16 10:00:00"
          }
        ],
        "pending_invitations": [
          {
            "id": 22,
            "invitee_id": 5,
            "invitee_name": "Landlord Three",
            "invited_by": 1,
            "created_at": "2026-08-16 11:00:00"
          }
        ]
      }
    ]
  }
}
```

### 11.6 POST `/api/admin/property-access/invitations/:id/revoke` — revoke pending invite

Response `200`:

```json
{ "message": "Invitation revoked" }
```

Error: `404` `{ "error": "No pending invitation with this id." }`

### 11.7 GET `/api/admin/property-access/:propertyId/landlord-data?landlordId=4` — removal warning

Response `200` (shape per section 5.3):

```json
{
  "data": {
    "landlord_id": 4,
    "landlord_name": "Landlord Two",
    "property_id": 10,
    "property_name": "Haven Space Boarding House",
    "created": { "rooms": 2, "tenants": 3, "payments": 5, "announcements": 1 }
  }
}
```

### 11.8 POST `/api/admin/property-access/remove` — remove active access

Request:

```json
{ "propertyId": 10, "landlordId": 4 }
```

Response `200`:

```json
{ "message": "Access removed", "data": { "property_id": 10, "landlord_id": 4 } }
```

Error: `409` `{ "error": "This landlord does not have active access to this property." }`

### 11.9 GET `/api/admin/property-access/history?propertyId=10&landlordId=4` — audit trail

Response `200`:

```json
{
  "data": {
    "events": [
      {
        "type": "invitation_sent",
        "invitation_id": 21,
        "property_id": 10,
        "property_name": "Haven Space Boarding House",
        "invitee": { "id": 4, "name": "Landlord Two" },
        "actor": { "id": 1, "name": "Admin" },
        "status": "pending",
        "at": "2026-08-16 10:00:00"
      },
      {
        "type": "invitation_accepted",
        "invitation_id": 21,
        "property_id": 10,
        "invitee": { "id": 4, "name": "Landlord Two" },
        "status": "accepted",
        "at": "2026-08-16 10:05:00"
      },
      {
        "type": "access_granted",
        "property_id": 10,
        "landlord_id": 4,
        "granted_by": 1,
        "at": "2026-08-16 10:05:00"
      },
      {
        "type": "access_removed",
        "property_id": 10,
        "landlord_id": 4,
        "removed_by": 1,
        "at": "2026-08-18 09:00:00"
      }
    ]
  }
}
```

`events` are ordered oldest → newest; filters are optional (either or both).

### 11.10 Updated list/detail payloads (access-aware)

`GET /api/landlord/properties` — each item gains `role`:

```json
{
  "data": {
    "properties": [
      {
        "id": 10,
        "name": "Haven Space Boarding House",
        "role": "owner",
        "total_rooms": 3,
        "occupied_rooms": 2,
        "status": "active"
      },
      {
        "id": 12,
        "name": "Sunrise Dormitory",
        "role": "shared",
        "total_rooms": 5,
        "occupied_rooms": 4,
        "status": "full"
      }
    ],
    "total_count": 2
  }
}
```

`GET /api/landlord/properties?id=10` — detail gains `role` (+ `authorized_landlords` when owner;
see 6.3). Dashboard stats (`GET /api/landlord/dashboard-stats` — the path the frontend client
uses; the server also registers `/api/landlord/dashboard/stats`) aggregate owned + shared
properties with no shape change.

---

## 12. Review Notes (verified against the current codebase)

Record of the pre-implementation review — every claim in this spec was checked against the
actual source. Corrections already applied above are marked _(fixed)_.

### Verified correct

- `properties.landlord_id` is the single owner; all landlord queries filter by
  `landlord_id = ?` (repos: `landlord-properties`, `landlord-rooms`, `landlord-boarders`,
  `landlord-dashboard`, `applications`, `announcements`, `tenancy`).
- `rooms.landlord_id` exists and is **nullable** (`ON DELETE SET NULL`) — treated as creator.
- Notifications: `roleVisibleTypes()` in `repositories/notifications.ts` role-filters types;
  `metadata` is JSON and already exposed to the frontend.
- `errorResponse(status, message)` returns `{ "error": message }` (no `message` key) —
  contract examples corrected to match. _(fixed)_
- Landlord routes live in `routes/landlord/*` with `shared.ts` helpers; the frontend client
  calls `/api/landlord/dashboard-stats` (server also registers `/dashboard/stats`).
  _(fixed — no monolithic `routes/landlord.ts`)_
- Next migration number is **0014** (0013 already exists). _(fixed)_
- `NotificationBell.tsx` renders title/message/read/delete — no per-type actions yet.
- Admin API clients/functions exist for users, landlords, properties, applications, settings.

### Open considerations (not blocking)

- **Admin applications view shows the owner, not the acting landlord**: `getAdminApplications`
  joins `users lf ON p.landlord_id = lf.id`, so an application processed by an authorized
  landlord is displayed under the property owner's name. Optional follow-up: join on
  `a.landlord_id` instead (or show both).
- **`listAdminLandlords` omits `account_status`** — the invite form relies on
  `?status=verified`; consider adding `account_status` to the row if the UI needs it.
- **`payments` has no soft delete** — removal-warning counts include all payment rows
  (noted in 5.3).
- **Admin notifications**: `roleVisibleTypes('admin')` returns `[]`, so admins have no
  notification feed — no admin notifications are needed for this feature.
- **Messaging/conversations** are out of scope; `conversations.created_by` semantics were not
  changed. If shared landlords should message property tenants later, treat as a follow-up.

---

## 13. Acceptance Criteria (Gherkin)

### AC-1 — Admin sends an invitation

```gherkin
Given Landlord 1 owns property "Haven Space Boarding House"
And Landlord 2 is a verified, active landlord without access to it
When the Admin sends an invitation for Landlord 2 to that property
Then the invitation is created with status "pending"
And Landlord 2 receives a "property_invitation" notification
```

### AC-2 — Invitation validation

```gherkin
Scenario: invite the owner
Given Landlord 1 owns property "Haven Space Boarding House"
When the Admin tries to invite Landlord 1 to their own property
Then the request is rejected with a 400 error and the message "already owns this property"

Scenario: duplicate pending invitation
Given a pending invitation exists for Landlord 2 on property 10
When the Admin sends another invitation for Landlord 2 on property 10
Then the request is rejected with a 409 error

Scenario: invite an unverified landlord
Given Landlord 3 has is_verified = 0
When the Admin tries to invite Landlord 3 to property 10
Then the request is rejected with a 400/422 error and a verification message
```

### AC-3 — Invitee accepts via notification

```gherkin
Given Landlord 2 has a pending invitation on property 10
When Landlord 2 taps "Accept" on the invitation notification
Then the invitation status becomes "accepted"
And an active property_access row is created for (10, Landlord 2)
And the notification is marked read
And property 10 now appears in Landlord 2's "My Properties" with role "shared"
```

### AC-4 — Shared landlord has full management parity

```gherkin
Given Landlord 2 has active access to property 10 owned by Landlord 1
When Landlord 2 lists rooms, tenants, payments, or dashboard stats for property 10
Then they see the same rows Landlord 1 sees (same property record, no duplication)
When Landlord 2 creates a room, adds a tenant, records a payment, or posts an announcement on property 10
Then the change is immediately visible to Landlord 1
```

### AC-5 — Owner cannot remove access

```gherkin
Given Landlord 2 has active access to Landlord 1's property 10
When Landlord 1 views the property detail
Then they see a read-only "Authorized Landlords" list with no remove actions
And no API endpoint allows Landlord 1 to remove Landlord 2's access
```

### AC-6 — Admin removal warns about created data

```gherkin
Given Landlord 2 has created 2 rooms and 3 tenants on property 10 before access is removed
When the Admin clicks "Remove access" for Landlord 2 on property 10
Then the Admin sees a warning listing rooms: 2, tenants: 3, payments: 5, announcements: 1
And the warning states the data stays with the property
When the Admin confirms
Then Landlord 2's access row gets removed_at/removed_by
And Landlord 2 receives a "property_access_removed" notification
And the created rooms and tenants remain visible to Landlord 1
And Landlord 2 can no longer list property 10
```

### AC-7 — Suspension / ban auto-revokes

```gherkin
Given Landlord 2 has a pending invitation and active access on property 10
When the Admin suspends (or bans) Landlord 2
Then all pending invitations for Landlord 2 are revoked
And all active property_access rows for Landlord 2 are removed
```

### AC-8 — Property deletion auto-revokes

```gherkin
Given property 10 has 1 pending invitation and 2 active access rows
When Landlord 1 (the owner) deletes property 10
Then the pending invitation becomes "revoked"
And the active access rows are removed
```

### AC-9 — Re-invitation after rejection/removal

```gherkin
Given Landlord 2 rejected (or was removed from) property 10 previously
When the Admin sends a new invitation for Landlord 2 on property 10
Then the invitation is created with status "pending"
And the previous invitation/access rows remain in the audit history
```

### AC-10 — Audit history

```gherkin
Given invitations were sent, accepted, rejected, and revoked on property 10
When the Admin opens the history for property 10 (or a landlord)
Then a chronological list of all events with actor, status, and timestamps is shown
```
