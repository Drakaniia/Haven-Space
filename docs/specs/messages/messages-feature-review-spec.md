# Spec — Messages feature review and build plan (landlord ↔ boarder threads)

**Status:** **Shipped.** The build followed this plan in the same session; everything in §4–§9 is
implemented, the five project checks are green, and deviations are recorded in §12 "As shipped".
D27 ("spec only") described the review pass that produced the plan, not the end state.
**Short name:** `messages-feature-review`
**Date:** 2026-10-08
**Owner request (verbatim):**

> review the messages feature

The request produced a two-part deliverable, because the feature does not exist yet: **§3 is the review**
(what is actually there, what is stale, what is a dead end), and **§4–§9 are the build plan** that review
implies.

**Relationship to existing work:**

- `docs/qa/specs/qa-spec.md` (S30/S31) and `docs/qa/specs/qa-spec-audit.md` assert that payments and messages return a
  graceful `501 FEATURE_DEFERRED`. **No such code path exists in the Worker** (verified: zero matches for
  `FEATURE_DEFERRED` under `workers/api`). Finding **F2**.
- `docs/reference/schema.md` documents a legacy `messages` table (`sender_id`, `receiver_id`, `body`,
  `is_read`, `created_at`) from the PHP-era design. No D1 migration ever created it. Finding **F3**.
- `docs/plans/2026-05-28-cloudflare-api-migration.md` lists messages as a deferred TODO route
  group ("Phase 6"), which is where the placeholder copy came from.
- `pre-tenancy-boarder-nav-spec.md` defines the limited boarder nav, which deliberately excludes Messages;
  that decision is what makes the listing CTA's destination unreachable for a brand-new boarder. Finding
  **F4**.
- `admin-apple-ui-restructure-spec.md` introduced the shared `PlaceholderPage` these two screens use.
- Adjacent shipped channels this spec must not break: notifications (`0009_notifications.sql`, the bell in
  the topbar), announcements (`0012_announcements.sql`, landlord → all boarders broadcast), applications
  (`0006_applications.sql`, the boarder's one-way `message` and tour notes).
- `landlord-properties-card-layout-spec.md` (this session) set the verification-bar style this spec copies,
  and it is the reason the landlord surfaces now share `PropertyCard` primitives the inbox can echo.

---

## 1. Interview decisions (as answered by the requestor)

Answers were collected in **five rounds** of `ask_user`. Rows marked **(agent default)** are choices the
interview left open; they are restated in §11.

| #   | Topic | Decision |
| --- | ----- | -------- |
| D1  | What the spec is | **Review + build plan.** The audit findings come first, then the slice that fixes them. |
| D2  | Who can message whom | **Boarder ↔ their landlord once a tenancy is confirmed**, **prospective boarder → landlord** from a listing, and **boarder ↔ landlord during an application**. Landlord↔landlord, boarder↔boarder and admin↔anyone are **out of scope** for v1. |
| D3  | Conversation model | **One thread per (landlord, boarder) pair**, unique on that pair. |
| D4  | Delivery | **Polling through TanStack Query** (refetch interval + refetch on focus). No SSE, no Durable Objects, no WebSockets. |
| D5  | Who may start a thread | **Signed-in boarders only** (no guest messaging), with **a cap on new threads per day**. |
| D6  | Property context | **The thread records the listing that started it, and every message can carry a property chip** so a multi-property landlord knows what is being discussed. |
| D7  | Message payload | **Text + images**, uploaded through the existing UploadThing integration. |
| D8  | Unread state | **Per-thread unread counts, an unread total in the nav, and a `message` notification type in the existing bell.** No read receipts ("Seen"). |
| D9  | Admin access to content | **None — metadata only.** Admins never read bodies or images; no new admin console surface. |
| D10 | Safety controls | **Report a conversation + block the other party**, both in v1. |
| D11 | Retention | **Per-side delete** (soft delete, each participant hides their own copy) and **FK cascade on account deletion**. |
| D12 | The tenancy gate | **Drop `RequireTenancy` from the messages route**: any signed-in boarder gets the inbox. The limited nav stays as it is. |
| D13 | Limits | **2,000 characters · 4 images per message · 5 new threads per boarder per day.** |
| D14 | Layout | **Two-pane (thread list + open thread) at ≥1024px, list → dedicated thread route below that**, with deep-linkable thread URLs at every size. |
| D15 | Entry points | **All four:** the property page's existing *Contact Landlord*, the application detail on both sides, the landlord's Tenants page, and `message` notification rows in the bell. |
| D16 | Out-of-app notification | **In-app only.** No email, no push — the repo has no email sending wired up. |
| D17 | Application note vs thread | **Leave applications exactly as they are**; the application page just gains a Message link. No backfill, no seeding, no replacement. |
| D18 | Block semantics | **Messaging only, both directions, reversible.** Applications, listings and search are untouched. |
| D19 | After a tenancy ends | **Nothing changes.** The thread stays readable and writable (deposits, references, follow-ups). |
| D20 | Verification bar | All five project checks green; **new API tests** for the messaging rules; **new web tests** for the inbox; a **two-account manual walkthrough** at 390px and 1440px; **fix the stale `501 FEATURE_DEFERRED` claims** in `docs/qa/`; **reconcile `docs/reference/schema.md`** with what ships. |
| D21 | Thread ownership of context | **(agent default)** A thread may hold several properties' context over time; the *first* listing is remembered as the thread's origin and shown in the thread header. |
| D22 | Polling cadence | **(agent default)** Thread list 15s, open thread 5s, plus `refetchOnWindowFocus`; sending is optimistic. |
| D23 | Send rate inside a thread | **(agent default)** 30 messages per minute per thread, rejected with a 429 and a clear message; the daily cap (D13) governs only *new* threads. |
| D24 | Message ordering & paging | **(agent default)** Newest-last within a thread, 50 messages per page, "Load earlier" paging upward from the top. |
| D25 | Landlord-initiated threads | **(agent default)** Allowed (the Tenants entry point needs it) but **not** counted against the boarder's daily cap and **not** creatable from a listing the landlord does not own. |
| D26 | Report triage | **(agent default)** A report writes a row with `status='open'`; triage happens through the existing admin audit-log surface, not a new console section (D9 keeps admins out of content). |
| D27 | This pass | **Spec only.** No code, no migrations, no dependency changes. |
| D28 | Photos in messages | **(agent default)** Same UploadThing path as room photos: up to 4 per message with `accept="image/*"`, mirroring `RoomFormFields` + `MAX_ROOM_PHOTOS` (`lib/room-drafts.ts`). Note that precedent enforces **only a count** — it has no file-size or MIME check — so a per-file size ceiling and a server-side image check are new work here, not inherited behaviour (R13). |

---

## 2. Current state (verified 2026-10-08, read-only)

### 2.1 Frontend

| File | Lines | What it is |
| ---- | ----- | ---------- |
| `apps/web/src/routes/landlord/messages.tsx` | 21 | `Protected role="landlord"` → `RoleShell` → `PlaceholderPage` (icon `chat`, title "Messages", subtitle "Chat with your boarders.", notice "Messages coming soon", message "In-app messaging with boarders is on the roadmap."). |
| `apps/web/src/routes/boarder/messages.tsx` | 29 | Same shape with subtitle "Chat with your landlord.", additionally wrapped in `<RequireTenancy>` (`components/boarder/FeatureGate.tsx`), which renders an `EmptyState` + "Go to Applications" for any boarder whose `boarder_status !== 'confirmed'`. |
| `apps/web/src/components/rooms/RoomDetailView.tsx` | 836 | Line 134: `const contactHref = inBoarderFlow ? BOARDER_MESSAGES_PATH : authRedirect;` — the public/boarder listing page's **"Contact Landlord"** link (line 590-596, `chat` icon) points at the placeholder. |

Nav (`apps/web/src/lib/nav.ts`): `{ to: '/landlord/messages', label: 'Messages', icon: 'chat', group:
'Communication' }` and the boarder equivalent. `BOARDER_LIMITED_NAV` (pre-tenancy) contains only
Applications, Find a Room and Settings — **no Messages entry**. `NavItem` has no badge/count field.
`BOARDER_MESSAGES_PATH` is exported from `apps/web/src/lib/routes.ts`.

### 2.2 Backend

**There is no messages API.** `workers/api/src/index.ts` mounts system, auth, account, rooms, properties,
boarder, applications, landlord, admin, notifications, tenancy, announcements and ai route modules — no
messages module. No repository file mentions threads or conversations. `grep -rn "FEATURE_DEFERRED"
workers/api` returns nothing.

The nearest existing machinery:

- **Notifications:** `repositories/notifications.ts` — `listNotifications`/`countUnreadNotifications`/
  `markNotificationRead`/`markAllNotificationsRead`/`deleteNotification`, plus a **role allow-list**
  `roleVisibleTypes(role)`: landlord sees 9 types, boarder sees `['application_accepted', 'announcement']`,
  **admin sees `[]`**. Rows are inserted inline (`INSERT INTO notifications (user_id, type, title, message,
  metadata)`) from exactly four places: `repositories/announcements.ts:498`,
  `repositories/landlord-verification.ts:422`, `repositories/property-access/history.ts:172` and `:221`. The
  bell (`components/layout/NotificationBell.tsx`) reads `GET /api/notifications` +
  `/api/notifications/unread-count`.
- **Rate limiting precedent:** `routes/ai.ts` enforces Haven AI's daily quota with a **signed cookie
  counter** and answers `429` + `code: 'AI_LIMIT_REACHED'`. Nothing DB-backed exists; there is no shared
  limiter.
- **Uploads:** `lib/uploadthing.ts` exports `uploadFilesToUploadThing(...)`; `env.ts` carries
  `UPLOADTHING_TOKEN` plus `UPLOADTHING_UPLOAD_FILES`/`UPLOADTHING_DELETE_FILES` bindings. The client
  pattern is a `FormData` POST (`lib/api/landlord.ts:383` `uploadPropertyPhotos` → server uploads → URLs
  come back), with room photos capped at 4 (`create-listing-room-details` D3).
- **Auth:** `lib/auth.ts` — `authorizeUser(db, request, roles[], secret?)` throws `HttpError(403, ...)`;
  `routes/landlord/shared.ts` adds `requireLandlord(c)`.
- **Who is who:** `repositories/tenancy.ts` carries `landlord_id`/`boarder_id` for confirmed tenancies;
  application rows carry `landlord_id` + `boarder_id`. **`LandlordBoarderListItem`
  (`repositories/landlord-boarders.ts:22`) has no user id at all** — no `boarder_id`, no `user_id`.
- **Migrations:** `0001`–`0019` exist; the newest is `0019_room_occupancy_and_room_types.sql`. There is no
  `messages` table.

### 2.3 Docs

- `docs/qa/specs/qa-spec.md` S31 "Messages are deferred" (✅ PASS recorded) and `docs/qa/specs/qa-spec-audit.md` lines
  189/215/325/356 describe opening `/boarder/messages` or `/landlord/messages` and expecting a graceful
  `501 FEATURE_DEFERRED`. **Nothing in the current Worker can return that.**
- `docs/reference/schema.md` (~line 93) documents the legacy `messages` table as if it existed.
- `docs/plans/2026-05-28-cloudflare-api-migration.md` marks messages as an unported Phase 6
  group.

### 2.4 Test surface

Web: `bun test`, 19 files, `test/setup.ts` registers happy-dom; source-contract tests (`readFileSync` +
`toContain`) sit beside behavioural tests. API: 26 files, real in-memory `bun:sqlite` fixtures for
route-level tests (see `test/admin-dashboard.test.ts`) and sequence-mock envs elsewhere; migrations are run
by reading `workers/api/migrations/*.sql` (seed files skipped).

---

## 3. Review findings

Severity is "what breaks if this ships as-is", not effort.

| # | Finding | Severity | Evidence |
| - | ------- | -------- | -------- |
| F1 | **The product's "Contact Landlord" button is a dead end.** `RoomDetailView` links to `BOARDER_MESSAGES_PATH`, which is a "coming soon" placeholder — a prospective boarder tapping *Contact Landlord* lands on a page that tells them the feature does not exist. | **High** | `RoomDetailView.tsx:134`, `boarder/messages.tsx:11-19` |
| F2 | **QA documentation describes behaviour that does not exist.** Two QA docs assert a graceful `501 FEATURE_DEFERRED` for messages, and the audit records it as PASS. No such code path exists anywhere in the Worker, so those checks cannot have run against the current API. | **High (trust)** | `docs/qa/specs/qa-spec.md:332-334,467`, `qa-spec-audit.md:32,74,189,215,325`; zero `FEATURE_DEFERRED` matches |
| F3 | **The documented schema is fiction.** `docs/reference/schema.md` describes a `messages` table as the backbone of the platform's messaging; no migration creates it. Useful side effect: this is a **greenfield build with no legacy rows to migrate**. | Medium (doc) | `docs/reference/schema.md:93-105`; `workers/api/migrations/` |
| F4 | **The gate and the CTA contradict each other.** `/boarder/messages` is wrapped in `RequireTenancy` (confirmed tenancy only), while the listing CTA is reachable by a brand-new boarder who has never applied — and the limited nav hides the Messages item, so even the nav cannot get them back to a reply. | **High** | `boarder/messages.tsx:15`, `nav.ts` `BOARDER_LIMITED_NAV`, `RoomDetailView.tsx:131-134` |
| F5 | **No unread concept and no notification type.** `roleVisibleTypes` has no message type for either role, and nothing tracks read state for anything messaging-shaped; `is_read` exists only on the legacy design. | **High** | `repositories/notifications.ts:60-83` |
| F6 | **No abuse controls of any kind.** No report, no block, no send/rate cap. The only quota machinery in the codebase is the AI cookie counter, which is per-browser and unsuitable for inquiry limits. | **High** | `routes/ai.ts:470-504`; no matches for rate-limit helpers |
| F7 | ~~**The landlord's Tenants page cannot identify the boarder as a user.**~~ **CORRECTED — this finding was wrong.** `LandlordBoarderListItem.id` *is* the boarder's `users.id` (`u.id AS id` in the select, with the application's own id exposed separately as `application_id`), so the Tenants row could always name the counterpart. No API change was needed. | ~~Medium (blocker)~~ Resolved | `repositories/landlord-boarders.ts:22-42,125-140`; `routes/landlord/boarders.ts` (update/delete take that same `id`) |
| F8 | **Application-stage communication is one-way.** The boarder writes a note (and tour notes reuse the same field); the landlord can neither reply in context nor be replied to except by e-mail outside the app. | Medium | `0006_applications.sql`; `landlord-boarders.ts:34` (`application_message`); `find-a-room/$id/tour.tsx:82` ("A tour request creates an application") |
| F9 | **Admins are blind to messaging by design, but reports have no home.** D9 keeps admins out of content, which is defensible — but without a report row that an admin can see, an abuse report has nowhere to go. | Medium | `roleVisibleTypes('admin') === []` |
| F10 | **Notification inserts are copy-pasted four times.** A fifth inline `INSERT INTO notifications` for messages would make drift likelier (title/message/metadata shapes already differ per call site). | Low | `announcements.ts:498`, `landlord-verification.ts:422`, `property-access/history.ts:172,221` |
| F11 | **No badge infrastructure in the nav.** `NavItem` has no count field and the sidebar renders none, so an unread total in the nav (D8) requires touching the nav type + shell. | Low | `lib/nav.ts:5-17`, `components/layout` sidebar |
| F12 | **Placeholder copy promises different things per role** ("Chat with your boarders." vs "Chat with your landlord.") while both notices say the same "coming soon" — harmless, but the copy must be replaced rather than extended (both screens are deleted, not built on). | Low | the two route files |
| F13 | **Polling has one trap worth designing around:** a 5s refetch that re-renders the composer can wipe in-progress typing. The plan (§4.5) keeps the draft in component state and sends optimistically, so a refetch never touches it. | Low (design) | TanStack Query usage across the app |

**What the review says in one line:** messages are not "deferred" — they were never started in this
codebase; the affordances that point at them already ship, the docs that describe them are wrong, and the
smallest honest slice is: a pair-thread inbox with images, unread state, a daily inquiry cap, report/block,
and the four entry points already in the product.

---

## 4. Target design

### 4.1 Data model (migration `0020_messages.sql`)

```sql
CREATE TABLE IF NOT EXISTS message_threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  landlord_id INTEGER NOT NULL,
  boarder_id INTEGER NOT NULL,
  property_id INTEGER,                 -- the listing that started the thread (D6/D21)
  created_by INTEGER NOT NULL,         -- who opened it (landlord- vs boarder-initiated, D25)
  last_message_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  landlord_deleted_at TEXT,            -- per-side delete (D11)
  boarder_deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (boarder_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_threads_pair
  ON message_threads(landlord_id, boarder_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_landlord
  ON message_threads(landlord_id, last_message_at);
CREATE INDEX IF NOT EXISTS idx_message_threads_boarder
  ON message_threads(boarder_id, last_message_at);

-- As shipped this table is named `thread_messages`: migration 0011 already created a legacy
-- `messages` table (the write-only leave-request notice) and the two must not collide.
CREATE TABLE IF NOT EXISTS thread_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  property_id INTEGER,                 -- per-message context chip (D6)
  read_at TEXT,                        -- set when the counterpart opens the thread
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  FOREIGN KEY (thread_id) REFERENCES message_threads(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_thread
  ON messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON messages(thread_id, read_at);

CREATE TABLE IF NOT EXISTS message_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  file_key TEXT,                       -- UploadThing key, for cleanup (D28)
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS message_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL,
  blocked_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_at TEXT,
  FOREIGN KEY (thread_id) REFERENCES message_threads(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_blocks_active
  ON message_blocks(thread_id, blocked_by, removed_at);

CREATE TABLE IF NOT EXISTS message_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL,
  reported_by INTEGER NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open',  -- open | reviewed | dismissed
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT,
  reviewed_by INTEGER,
  FOREIGN KEY (thread_id) REFERENCES message_threads(id) ON DELETE CASCADE
);
```

Notes: unread means `messages.read_at IS NULL AND messages.sender_id <> me`; **no message body is ever
copied into a notification row** (D9 keeps content out of admin-visible surfaces, and the bell would
otherwise leak bodies); the daily cap counts `message_threads` created by that boarder in the last 24h
(index on `(boarder_id, created_at)` is covered by `idx_message_threads_boarder`).

### 4.2 API surface — `workers/api/src/routes/messages.ts` (+ `repositories/messages.ts`)

Mounted once in `index.ts` (`app.route('/', messagesRoutes)`), authorized with
`authorizeUser(db, c.req.raw, ['boarder', 'landlord'], env.JWT_SECRET)`; every handler re-checks that the
caller is a participant of the thread.

| Method & path | Purpose | Rules |
| ------------- | ------- | ----- |
| `GET /api/messages/threads` | The caller's inbox | Side-specific soft-delete filter; each row: counterpart id/name/avatar, property name (thread origin), last message preview + time, `unread_count` |
| `POST /api/messages/threads` | Open (or return) the pair thread | Body `{ counterpart_id, property_id? }`. Unique pair → idempotent. Boarder initiator: max 5 new threads/24h (D13) else `429`. Landlord initiator: allowed only for a boarder tied to one of their properties/applications (D25). Self-thread and non-participant ids are rejected |
| `GET /api/messages/threads/:id` | One thread + a page of messages | `?before=<message id>` for older pages (50/page, D24); returns `counterpart`, `blocked_by` (which side blocked), `property` context |
| `POST /api/messages/threads/:id/messages` | Send | Body `{ body, attachments?: [{ url, key }], property_id? }`; rejects blank/over-2,000-char bodies, >4 attachments, blocked threads (D18), 30 msg/min per thread (D23). Sets `read_at` for the sender's own messages only on read, bumps `last_message_at` |
| `POST /api/messages/threads/:id/read` | Mark the thread read | Sets `read_at` on the counterpart's unread messages; the only writer of read state |
| `DELETE /api/messages/threads/:id` | Per-side delete | Sets `landlord_deleted_at` or `boarder_deleted_at`; the other side is untouched (D11). Re-messaging revives the thread rather than creating a second one |
| `POST /api/messages/threads/:id/block` | Block/unblock | Body `{ blocked: boolean }`; writes/`removed_at`s a `message_blocks` row for the caller (D18) |
| `POST /api/messages/threads/:id/report` | Report | Body `{ reason, details? }`; one open report per reporter per thread; returns 201 |
| `GET /api/messages/unread-count` | Nav/inbox badge | Single integer, same visibility rules as the inbox |
| `POST /api/messages/attachments` | Image upload | `multipart/form-data`, ≤4 files, images only, reuses `uploadFilesToUploadThing` (D28); returns `[{ url, key }]`; nothing is persisted until the message is sent |

Side effects of a send: one `notifications` row for the recipient (`type: 'message'`, title "New message
from …", `metadata: { thread_id, sender_id }`, **no body**), and `'message'` added to
`roleVisibleTypes` for **both** landlord and boarder (admin stays `[]`, D9).

### 4.3 Frontend

| File | Role |
| ---- | ---- |
| `apps/web/src/routes/landlord/messages.tsx` | Rewritten: `Protected` → `RoleShell` → two-pane inbox; `?thread=<id>` selects a thread on desktop. |
| `apps/web/src/routes/landlord/messages/$threadId.tsx` | Deep link / mobile thread page (list → thread navigation below 1024px, D14). |
| `apps/web/src/routes/boarder/messages.tsx` | Same inbox, **without `RequireTenancy`** (D12), `BOARDER_NAV`/`useBoarderNav()` shell. |
| `apps/web/src/routes/boarder/messages/$threadId.tsx` | Boarder thread page. |
| `apps/web/src/components/messages/MessageInbox.tsx` | Query + state (`['message-threads']`), the pane layout, unread totals. |
| `apps/web/src/components/messages/ThreadList.tsx` | Rows: counterpart, preview, relative time, unread pill, block/report affordances in a `…` menu (same `CardMenu` pattern as `PropertyCard`). |
| `apps/web/src/components/messages/MessageThread.tsx` | Bubbles, image grid, property chip, day separators, "Load earlier", composer. Owns the draft in local state so polling never clears typing (F13). |
| `apps/web/src/components/messages/MessageComposer.tsx` | Textarea (2,000 chars + counter), image picker (≤4), optimistic send, disabled state while blocked. |
| `apps/web/src/lib/api/messages.ts` | New client module: threads, thread, send, read, delete, block, report, unread count, attachments. |
| `apps/web/src/lib/messages.ts` | Pure helpers (preview text, relative time grouping, unread totals) — unit-testable without a DOM. |
| `apps/web/src/lib/types.ts` | New response types (`MessageThread`, `ThreadMessage`, …). |
| `apps/web/src/lib/nav.ts` + sidebar | Optional `badge?: number` on `NavItem`, rendered as a pill; fed by the unread query (D8, F11). |

Polling (D22): inbox `refetchInterval: 15_000`, open thread `5_000`, both `refetchOnWindowFocus: true`.
The inbox query is invalidated on send/read/delete/block so the badge stays honest without a second poll.

### 4.4 Entry-point wiring (D15)

| Surface | Change |
| ------- | ------ |
| `RoomDetailView` "Contact Landlord" | Already points at the boarder inbox; it must now **carry the listing**: link to `/boarder/messages?compose=<propertyId>` so the inbox opens (or creates) the thread with that landlord and prefills "Hi, I'm interested in {listing title}…". Signed-out visitors keep the existing `authRedirect` flow. |
| Application detail (both roles) | A "Message" button that opens/creates the pair thread with the application's counterparts; boarder side uses the application's `landlord_id`, landlord side uses the application's `boarder_id`. |
| Landlord Tenants page | Row action that opens the thread with that boarder. **Requires** exposing the boarder's user id on `LandlordBoarderListItem` (F7) — additive key, same pattern as the admin enrichment in `landlord-properties-card-layout` D21. |
| Notification bell | A `message` row deep-links to the thread (`metadata.thread_id`). |

### 4.5 States and edges

Loading → skeleton thread rows (reuse `Skeleton`); empty inbox → `EmptyState` ("No conversations yet" +
"Browse rooms"); empty thread → the composer with a one-line hint; error → `ErrorState`; blocked → the
composer is replaced by a "You blocked this conversation" card with an unblock action (and the mirrored
message when *they* blocked); deleted (per-side) → thread disappears from that side's inbox only; no
avatars/photos → initials circle (reuse `Avatar`).

---

## 5. Requirements

- **R1** — One thread per (landlord, boarder) pair, enforced by a unique index; opening a thread twice
  returns the same thread.
- **R2** — Both roles see the same thread list, filtered by their own soft-delete column.
- **R3** — Messages are text-only-required: an empty body with attachments is valid; an empty body with no
  attachments is rejected.
- **R4** — Bodies are capped at 2,000 characters and images at 4 per message, both enforced server-side with
  clear errors.
- **R5** — A boarder may create at most 5 new threads per 24 hours; the 6th returns `429` with a readable
  message and no thread is created.
- **R6** — Blocking stops sends from **both** sides until unblocked; the block is visible to the blocked
  participant as "You can no longer message this person".
- **R7** — Reporting creates exactly one open report per reporter per thread and never blocks the reporter
  from leaving the conversation.
- **R8** — Unread state lives on `messages.read_at`; opening a thread is the only thing that clears it, and
  the sender's own messages are never counted as unread for them.
- **R9** — The nav shows an unread total; the bell gets a `message` type for both roles and never contains
  message bodies.
- **R10** — A send creates one notification row for the recipient and bumps the thread's `last_message_at`
  (which is what orders the inbox).
- **R11** — Deleting a thread hides it for the caller only; a new message from either side revives it.
- **R12** — Admins get no content access and no new console surface; the only admin-visible artefact is a
  report row's existence and count.
- **R13** — Attachments upload through `uploadFilesToUploadThing` behind the same auth as sending; a failed
  upload never creates a message.
- **R14** — The boarder inbox is reachable for any signed-in boarder (no `RequireTenancy`), and the listing
  CTA lands there with the property context.
- **R15** — Every message can carry a property chip; the thread header shows the origin property.
- **R16** — Deep links work: `/boarder/messages/{id}` and `/landlord/messages/{id}` open (and mark read)
  that thread, and a notification tap lands there.
- **R17** — All four entry points in §4.4 work, including the additive `boarder_id` on the landlord's
  tenant payload.
- **R18** — Polling refreshes the list and thread without disturbing a draft or stealing focus.
- **R19** — Optimistic send: the message appears immediately, and a failure restores the draft with an
  error toast.
- **R20** — No "coming soon" copy remains anywhere once this ships, and the doc corrections in D20
  (the stale `501` claims and the schema doc) land in the same pass — the review's F2/F3 stop being true
the moment the feature exists.

---

## 6. Edge cases

| Case | Expected |
| ---- | -------- |
| Boarder messages a landlord with no tenancy and no application | Allowed (D5) — this is the *Contact Landlord* path; the thread simply carries the property context. |
| Same boarder contacts two different landlords | Two threads, one per pair. |
| Same pair, second listing | Same thread, new property chip; the header keeps the origin listing. |
| Landlord replies to a boarder who deleted their side | Thread revives on the boarder's side with the new message (R11). |
| Blocked party sends | `403` with the block message; composer disabled; the block is visible to both. |
| Reported thread | One open report; the reporter and the reported can both still use the thread (report ≠ block). |
| Message sent to a suspended/banned account | Delivered and stored (readable if the account returns); no notification row is created for a `banned` recipient… **(open question Q4)** |
| Boarder's daily cap hit | `429` with "You've started 5 conversations today. Try again tomorrow." |
| Thread of a property that was deleted | Thread survives with `property_id` nulled; header falls back to the counterpart's name. |
| Application deleted/withdrawn | Thread survives (threads and applications are independent, D17). |
| Tenancy ends | Nothing changes (D19). |
| 2,000-char body pasted | Server rejects with the limit; the composer counter warns before submit. |
| 5 images | Upload rejects the 5th with the cap message. |
| Offline/failed send | Draft restored + error toast; no phantom message (R19). |
| Very long thread (500+ messages) | Paged 50 at a time; "Load earlier" preserves scroll position. |
| Two tabs open | Client poll keeps both lists fresh; read state follows whichever marked read first (idempotent). |

---

## 7. Accessibility

- Two-pane layout is a list + a region; the thread list is a `<ul>` with each row a link, the open thread
  labelled by the counterpart's name.
- The composer is a labelled `<textarea>` with the character counter wired via `aria-describedby`; sending
  is a real button (not Enter-only), and Enter inserts a newline as expected in a message box.
- Image attachments expose real `alt` text (the sender's file name is not used); the upload picker is a
  labelled `<input type="file" accept="image/*" multiple>` with a visible button.
- Unread counts are text, not colour-only; the nav badge carries an `aria-label`
  ("3 unread messages").
- New messages arriving by poll are announced in a polite live region once, not per refetch.
- Block/report live in the same `…` menu pattern already used on property cards (keyboard reachable,
  Escape closes, focus returns).
- Focus moves to the thread heading when a thread opens on mobile; the empty state keeps a single heading
  level, matching `PlaceholderPage`'s removal.
- Absolutely no time-based content: "2h ago" strings carry a `title` with the absolute timestamp.

---

## 8. Verification plan (D20)

**Commands** — all five must pass and be reported honestly:

```
bun run web:typecheck
bun run web:test
bun run web:build
bun run cf:api:typecheck
bun run cf:api:test
```

**New API tests** (`workers/api/test/messages.test.ts`, in-memory sqlite + migrations like
`admin-dashboard.test.ts`): thread creation and pair uniqueness/idempotency; the 5/day boarder cap (`429`);
block/unblock in both directions; unread counting and mark-read; per-side delete and revival; attachment
cap; body cap; the `message` notification type visible to both roles and invisible to admin; metadata-only
admin rule (no content endpoint exists); non-participant access rejected (`403`).

**New web tests** (`apps/web/test/messages-inbox.test.tsx`): pure helpers (`lib/messages.ts` — preview
truncation, day grouping, unread totals, composer validation) plus source-contract assertions that both
routes render the inbox, that the boarder route no longer imports `RequireTenancy`, that the composer caps
images at 4, and that `RoomDetailView` passes the property context into the CTA.

**Manual walkthrough** (dev server + local D1, two accounts): prospective boarder → *Contact Landlord* from
a listing (thread created with context) → landlord sees it in the bell + inbox → reply → boarder sees unread
badge → send images → block → unblock → report → per-side delete → confirmed-tenancy boarder repeats the
flow. At 390px and 1440px.

**Doc fixes:** remove or rewrite the `501 FEATURE_DEFERRED` claims in `docs/qa/specs/qa-spec.md` and
`docs/qa/specs/qa-spec-audit.md` (F2), and update `docs/reference/schema.md` to the tables in §4.1 (F3).

---

## 9. Rollout and scope

- **One pass**, no feature flag: the two placeholders are replaced, the CTA becomes real, and the docs move
  with them.
- **Deliberately not in v1:** email/push (D16), read receipts (D8), real-time WebSockets (D4), group or
  boarder↔boarder threads (D2), admin content moderation (D9), message search, typing indicators,
  attachments other than images (D7), and migrating any application note into threads (D17).
- **Migration safety:** no legacy rows exist (F3), so `0020` is additive; applying it to remote D1 needs the
  requestor's approval like every other migration in this repo.

---

## 12. As shipped (deviations from the plan above)

Everything in §4–§9 landed. These are the differences a reader of this spec would otherwise trip over:

1. **The message table is `thread_messages`, not `messages`.** Migration `0011_tenancy_leave_requests.sql`
   already created a `messages` table for the write-only leave-request notice, so the pair-thread model
   uses its own name. Indexes follow (`idx_thread_messages_*`). The rest of the plan's DDL is verbatim.
2. **F7 was wrong; no API change was needed for the Tenants entry point** (see the corrected row in §3).
   `LandlordBoarderListItem.id` is already the boarder's user id and is what the Message action sends as
   `counterpart_id`. `ApplicationSummary` already carried both ids for the application entry points.
3. **The nav badge is not a `NavItem` field.** The nav lists are shared constants and the badge has to
   survive on every page, so `Sidebar` reads one shared query (`useUnreadMessages`, key
   `['message-unread']`) and renders the count on the item whose path matches the role's messages route
   (`lib/messages.ts: messagesPath`). One request, one cache entry, no per-page wiring (R9).
4. **`POST /api/messages/threads` accepts `property_id` alone from a boarder.** The listing CTA knows the
   listing, not the landlord's user id, so the server resolves the counterpart from the listing
   (`?compose=<propertyId>` → thread → `?draft=<propertyId>` on the thread route). A landlord still has to
   name a linked boarder, so the shortcut cannot be abused to open threads with strangers (R14/D25).
5. **The thread payload carries `properties: { [id]: title }`** (origin listing + every listing a message
   references) and inbox rows carry `last_attachment_count`, so per-message property chips and image-only
   previews render with real labels instead of bare ids or an empty row.
6. **Doc corrections landed with the feature** (D20/F2/F3): `docs/qa/specs/qa-spec.md` S30/S31 rewritten,
   `docs/qa/specs/qa-spec-audit.md` rows + A22 + the API-surface list updated, `docs/reference/schema.md` now
   documents the five messaging tables, and `docs/guides/MANUAL.md`'s "payment and message routes are deferred"
   line is corrected. **S31 is recorded PASS (after fixes)** in the QA spec, citing the walkthrough below:
   its old "501 PASS" was not a verifiable result, so the check was rewritten and then actually run.
7. **The §8 manual walkthrough ran** (2026-10-09, local D1, two QA accounts — `qa.messages.landlord@haven.demo`
   id 13 / `qa.messages.boarder.284728@haven.demo` id 14, passwords reset to `QaMessages123!` in the walkthrough
   run). Verified by hand at 1440px and 390px: the listing CTA's inquiry (thread 1, origin property 9, the
   exact draft text), the bell row (title only, no body) and its deep link, the inbox row's origin chip and
   unread pill, read state clearing on open, per-message chips, the attachment grid and the image-only inbox
   preview, the block card + unblock in **both** directions (`403 thread_blocked` from either side), the
   report modal and its one-open-report-per-reporter rule, per-side delete followed by revival on the
   counterpart's next message, and the landlord's nav badge / UI send / bell pointer. Automated surface
   re-run after the fixes below: `workers/api/test/messages.test.ts` 15 tests,
   `apps/web/test/messages-inbox.test.tsx` 19 tests, both typechecks, the web build — all green.
8. **Four defects the walkthrough caught, all fixed in this pass:**
   - **UTC timestamps read as local time.** D1 writes `CURRENT_TIMESTAMP` as `YYYY-MM-DD HH:MM:SS` (UTC, no
     zone); V8 parses that shape as *local*, so a message sent seconds earlier read "8h ago" at UTC+8 and
     day separators could land a late-evening UTC message on the wrong day. `lib/messages.ts` now routes
     every parse through `parseTimestamp` (adds the missing `Z` for that shape) and the test file pins it.
   - **A stale bell pointer.** Reading a thread cleared `messages.read_at` but left its `message`
     notifications unread, so the bell kept claiming 1 unread about a conversation already read.
     `markThreadRead` now also marks that reader's unread `message` rows for the thread read (a new API test
     asserts it, and that the other side's bell is untouched).
   - **No way back below `lg`.** The list pane hides under 1024px and the thread route had no return control;
     the thread header now carries a `lg:hidden` "← All conversations" link to the role's inbox.
   - **The nav badge lagged the inbox.** `useUnreadMessages` polled once a minute while the inbox polls
     every 15s (D22), so a message arriving by poll showed "1 unread message" in the list with a badge that
     still read zero. The badge now shares the 15s cadence; the three surfaces (badge, header, bell) were
     re-checked against a live send and agree.
9. **Image upload could not be exercised end to end locally:** `.dev.vars` has no `UPLOADTHING_TOKEN`, so the
   picker's upload leg fails with the server's "UploadThing token is not configured" (verified — the composer
   shows that message, keeps the draft and the picked files, and creates no message, which is R13's failure
   path). The attachment *send* and *display* path was verified by sending a message whose `attachments`
   carried real URLs; the upload endpoint itself still needs a token to be signed off.
10. **Inherited, not fixed:** the role shell is a fixed-width (`w-72`) sidebar plus one content column, with
    no sub-`lg` rail, so at 390px every role page scrolls horizontally (`/boarder/applications` overflows
    identically) and the inbox card is squeezed into the leftover ~85px. That is a shell-level issue older
    than this feature; the messaging panes themselves stay within their container (list hidden, thread +
    composer shown below `lg`) and the spec's `lg` breakpoint intent (D14) is unaffected at ≥1024px.

## 10. Open questions

- **Q1 — Inquiry cap shape.** 5 *new threads* per day is the answered rule; whether a second message to the
  same landlord should also count as an "inquiry" is unspecified. Default: no.
- **Q2 — Notification for the first message only?** Every message currently means a bell row; a busy thread
  could flood the bell. Default: one row per message, collapsing is a follow-up.
- **Q3 — Landlord-side inquiry cap.** Only boarders are capped (D13). A landlord spamming unread boarders is
  unhandled. Default: rely on report/block, revisit if it ever happens.
- **Q4 — Suspended or banned counterpart.** Edge case in §6: default behaviour is to store and deliver, and
  to skip the notification row for a `banned` recipient.
- **Q5 — `property_id` on threads vs per-message only.** Both ship; the thread origin is display-only.
- **Q6 — Who counts as "their landlord"?** A boarder may have had several landlords; D2 says the pair model,
  so old landlords keep their threads forever (D19). If that is wrong, the fix is a thread-archival rule,
  not a schema change.

## 11. Agent defaults (restated from §1)

D21 thread origin, D22 poll cadence, D23 in-thread rate (30/min), D24 paging (50/page), D25
landlord-initiated threads, D26 report triage via the audit log, D28 attachment limits. Each is a one-line
change in the plan above if review disagrees.
