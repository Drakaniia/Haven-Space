# Spec — Landlord Calendar (unified read-only operations calendar)

**Status:** **Implemented (Phase 1)** (2026-10-12) — 331 API tests pass (30 files, +15 new), 288 web
tests pass (27 files, +21 new), `cf:api:typecheck` clean, `web:build` clean, and the page was walked
through in a browser at 1440px and 390px against the local API. See §18 for what shipped, the five
deviations and what could not be verified.
*Spec written 2026-10-11 from a six-round interview; §1 is the binding decision list, §14 collects the
choices the interview left open (overturnable), and §16 records the data gaps research turned up.*
**Short name:** `landlord-calendar`
**Date:** 2026-10-11
**Surface:** `http://localhost:3000/landlord/calendar` — one page, plus one new API resource.
**Owner request (verbatim):**

> in Calendar help me gather the use feature here

**How that was read.** `/landlord/calendar` is a 15-line stub that renders `PlaceholderPage` with the
copy *"A full event calendar will be available here once the landlord calendar feature is finalized."*
Nothing in the database stores an appointment, an event, or a booking. "Gather the use feature"
therefore means: **find every date the platform already knows about, decide which of them a landlord
would want to see on one calendar, and specify the page that shows them.** The interview resolved
each of those (D1, D5, D14).

**Relationship to existing specs**

- Follows `payments-feature-spec.md` for the charge model, the *derived* `overdue` rule, the
  per-property `late_fee_grace_days` grace period, and Manila-time "today" (§8.2 of that spec). The
  calendar **reuses** those helpers rather than re-deriving them (§3.4).
- Follows `landlord-property-detail-page-spec.md` and `landlord-rooms-grid-spec.md` for page
  composition: `RoleShell` + `PageHeader`, `Card` surfaces, `StatusBadge` pills, `EmptyState`/
  `Skeleton`/`ErrorState` states, "title only, no redundant subtitle" copy (D18).
- Follows `admin-apple-ui-restructure-spec.md` for the pill primitive and the "real controls, not
  bare glyphs" rule, and `landlord-rooms-grid-spec.md` D35 for "existing tokens only".
- Follows `qa-full-system-review-spec.md` / `qa-spec-audit.md` for the QA walkthrough requirement
  (D17) — the audit's Calendar row is amended by this spec (D19).
- **Does not touch** the dashboard's stat cards, the payments ledger, the applications page, the
  boarders page, the announcements page or any nav list (D28).

---

## 1. Interview decisions (as answered by the requestor)

Collected in **six rounds** of `ask_user`. Rows marked **(agent default)** are choices the interview
left open and this spec fixes; they are restated in §14 so review can overturn them cheaply.

| #   | Topic | Decision |
| --- | ----- | -------- |
| D1  | What the page becomes | **A unified operations calendar** that aggregates dates the database already holds (charges, tenancy dates, applications, announcement publish dates). **Read-only. No new tables, no event creation, no drag-drop** in this spec. |
| D2  | Roles in scope | **Landlord only.** `/landlord/calendar` and nothing else; the boarder and admin nav lists stay as they are. |
| D3  | Backend appetite | **One new aggregated endpoint + repository.** No migration is required (nothing new is stored). A migration may appear only in the deferred Phase 2 (D37). |
| D4  | Delivery shape | **Phased — read-only first.** Phase 1 (this spec) ships the aggregation and the read-only page. Phase 2 (deferred, §15) covers interaction and manual events. |
| D5  | Event families | **Money, tenancy lifecycle, and applications** (plus announcement publish dates, D9). Room/property-ops changes and boarder messages are **out**. |
| D6  | Overdue semantics | **Derived at read time** from `due_date` + the property's grace period, exactly as the ledger does. A charge past grace tints its due-date event in the alarm tone and earns an `overdue` label. **No separate overdue event row** is created. |
| D7  | Time model | **All-day, date-only, Asia/Manila.** Every event is a date; there is no time axis and no timed agenda. |
| D8  | Day-cell density | **Up to 3 chips per day, then `+N more`.** The `+N more` control selects that day in the detail panel. |
| D9  | Future-dated announcements | **Shown.** An announcement whose `publish_date` is in the future appears on that day as a scheduled item, so the calendar doubles as a publishing plan. |
| D10 | Default view | **Month grid + day panel** side by side (the panel stacks below the grid on narrow screens). The page opens on the current Manila month with **today selected**. |
| D11 | Property scoping | **All accessible properties aggregated**, with an `All properties` selector in the toolbar and type filters (`All · Money · Tenancy · Applications`), reusing the property access rules the rest of the landlord area uses. |
| D12 | Chip interaction | Clicking a chip opens a **small read-only popover** (type, boarder, room, property, amount, status) with a **`View record`** link that jumps to the source page. |
| D13 | Day panel contents | The day's events **plus a money summary** (₱ due, count overdue) **plus quick links** (`Record payment`, `Review application`). |
| D14 | Message activity | **Excluded.** Boarder-message activity never appears on the grid; the page stays an operations calendar of financial and tenancy dates. |
| D15 | API shape | **One aggregated endpoint:** `GET /api/landlord/calendar?from&to&propertyId`, returning a `{ success, data }` envelope (the repo's `jsonResponse` convention) with a discriminated event list. |
| D16 | Fetch strategy | **Per month, with adjacent-month prefetch**, cached per window (`['landlord-calendar', from, to, propertyId]`), previous data kept while loading. |
| D17 | Verification bar | New **API test** + one new **web test** + `web:typecheck` / `web:build` / `cf:api:typecheck` + both suites clean + a **manual 1440px / 390px browser walkthrough**. |
| D18 | Header copy | **Title only** (`PageHeader title="Calendar"`) — no subtitle, matching the repo's redundant-copy sweep. |
| D19 | Spec placement | This file at the repo root (`landlord-calendar-spec.md`, matching the other root specs) **plus an amended note on the Calendar row of `docs/qa/specs/qa-spec-audit.md`**, which still describes the page as "widget or graceful fallback". |
| D20 | What "today" is | **Server-side Asia/Manila**, using the existing `manilaToday()` helper — a landlord abroad sees the same billing day their boarders do. |
| D21 | Excluded records | Soft-deleted rows (`deleted_at`), `cancelled` charges, `rejected`/`cancelled` applications, and deleted announcements are **never rendered**. |
| D22 | Empty states | A full-page `EmptyState` when the landlord has **no accessible properties** (with a link toward listing creation) **and** a per-month inline "nothing scheduled this month" line, **plus** a loading skeleton for the grid. |
| D23 | High volume | No per-day cap beyond D8, and a **server-side cap on one window's payload** with an explicit "showing X of Y" notice when it is hit. |
| D24 | Boarder mirror | **Out of scope**, recorded as future work (§15) — `/boarder/tenancy` already covers a boarder's own due dates. |
| D25 | Week start | **Sunday** (Philippine convention). |
| D26 | Grid height | **Variable 5–6 rows** — exactly the weeks the month needs, so short months get taller cells. |
| D27 | Money totals | **Both levels:** a compact month strip above the grid (`₱ due · ₱ collected · N overdue`) and the day panel's own figures. |
| D28 | Dashboard tie-in | The `Upcoming renewals` card is **left numerically alone** (it still counts accepted/confirmed applications) but gains a **link into the calendar**, so the two surfaces are discoverable from each other. |

---

## 2. Current state (verified 2026-10-11, read-only)

### 2.1 The page

| File | Lines | What it is today |
| ---- | ----- | ---------------- |
| `apps/web/src/routes/landlord/calendar.tsx` | 15 | `createFileRoute('/landlord/calendar')` → `Protected role="landlord"` + `RoleShell nav={LANDLORD_NAV}` + `PlaceholderPage icon="calendar" title="Calendar" message="A full event calendar will be available here once the landlord calendar feature is finalized."` |
| `apps/web/src/lib/nav.ts` | 81 | `{ to: '/landlord/calendar', label: 'Calendar', icon: 'calendar', group: 'Management' }` — the entry already exists, so **no nav change is needed**. |
| `apps/web/src/routeTree.gen.ts` | 43/243/1179 | The route is already registered; nothing to regenerate. |
| `apps/web/src/components/ui/Topbar.tsx` | 27 | Already maps `calendar → 'Calendar'` for the topbar title. |

### 2.2 What the data can supply (this is the whole point of the feature)

Everything the calendar shows already exists. No new column, no new table, no backfill.

| Source | Date field(s) | Notes |
| ------ | ------------- | ----- |
| `payments` (charges, migration `0021_payments.sql`) | `due_date`, `paid_date`, `period_start`, `period_end`, `late_fee`, `charge_type`, `status` | `overdue` is **derived**, never trusted from the column (`docs/reference/schema.md` §Payments). `due_date` is a calendar date. The grace period is `property_billing_settings.late_fee_grace_days` (fallback `DEFAULT_GRACE_DAYS`). |
| `applications` (migration `0006`, `0011`) | `created_at`, `confirmed_at`, `updated_at`, `leave_request_date`, `intended_leave_date` | Status machine (`workers/api/src/lib/application-status.ts`): `pending → accepted | rejected | cancelled`, `accepted → confirmed | cancelled`, `confirmed → ended`. Only `confirmed_at` and `leave_request_date` are dedicated timestamps. |
| `announcements` (migration `0012`) | `publish_date` | `deleted_at` exists; `announcement_properties` links an announcement to properties. The landlord list already sorts by `publish_date DESC`; the boarder feed filters `publish_date <= date('now')`. |
| `properties` / `rooms` | `late_fee_grace_days`, `room_number`, `title`, `price` | Used only to label events and to compute overdue. |
| Property access | `accessiblePropertyClause()` (`repositories/property-access/helpers.ts`) | The scoping predicate the ledger, dashboard and property queries already share. Co-landlords must see the same rows they can already manage. |

### 2.3 What does **not** exist (and therefore cannot appear)

- **No appointments / events / viewings / tours table.** A boarder "tour" (`apps/web/src/routes/boarder/find-a-room/$id/tour.tsx`) submits a form but persists no scheduled date. Nothing to show.
- **No scheduled-message or reminder queue** beyond the two payment reminder timestamps (`reminder_sent_at`, `due_soon_reminded_at`), which are dispatch records rather than plan dates.
- **No tenancy end date** other than `applications.intended_leave_date` (a boarder's *intended* date, not a contract).
- **No landlord "task" concept**, so "assign a task to a date" is a Phase 2 idea at best (§15).

### 2.4 Reusable primitives (no new ones needed)

| Primitive | File | Use here |
| --------- | ---- | -------- |
| `PageHeader` | `components/ui/PageHeader.tsx` | Title only (D18). |
| `Card` | `components/ui/Card.tsx` | Month strip, grid surface, day panel. |
| `StatusBadge` | `components/ui/StatusBadge.tsx` | Event chips' pills — the tones `pending`, `due_soon`, `awaiting_verification`, `overdue`, `paid`, `accepted`, `confirmed`, `approved`, `rejected`, `published`, `cancelled`, `ended` **already exist**. |
| `Icon` | `components/ui/Icon.tsx` | `payment`, `application`, `users`, `announcement`, `document`, `calendar`, `calendarDays`, `chevronLeft`, `chevronRight`, `clock`, `check`, `close`, `history` all exist as keys — **no new SVG assets**. |
| `EmptyState`, `Skeleton`, `Spinner`, `ErrorState`, `Button`, `Field` | `components/ui/*` | The four page states and toolbar controls. |
| `manilaToday`, `effectiveStatus`, `isDueSoon`, `daysOverdue`, `formatMoney`, `monthKey`, `addDays` | `repositories/payments/helpers.ts` | All money/date math, **imported, not reimplemented**. |
| `listChargesForLandlord` | `repositories/payments/ledger.ts` | The charge query (already joins property/room/grace days and attaches submissions). |
| `jsonResponse`, `HttpError`, `responseFromError` | `lib/http.ts` | The `{ success: true, data }` envelope and error shape. |

---

## 3. Event catalogue

Eight event types across the three chosen families. Every event is **all-day** and carries its own
source ids so the popover and deep link need no second request.

### 3.1 The eight types

| `type` | Family | Source | Event date | Title (day panel / chip) | Status pill |
| ------ | ------ | ------ | ---------- | ------------------------ | ----------- |
| `charge_due` | money | `payments` where `cancelled` is excluded | `due_date` | `<charge_type label> · <boarder last name>` e.g. `Rent · Reyes` | derived: `pending` / `due_soon` / `awaiting_verification` / `overdue` (D6) |
| `payment_received` | money | `payments` where `paid_date IS NOT NULL` | `paid_date` | `Payment received · <boarder last name>` | `paid` |
| `application_received` | applications | `applications` with `status = 'pending'` | `date(created_at)` | `Application · <boarder last name>` | `pending` |
| `application_accepted` | applications | `applications` with `status IN ('accepted','confirmed','ended')` | **`date(updated_at)`** (see L2) | `Application accepted · <boarder last name>` | `accepted` |
| `application_confirmed` | applications | `applications` with `confirmed_at IS NOT NULL` | `date(confirmed_at)` | `Tenancy confirmed · <boarder last name>` | `confirmed` |
| `tenancy_move_in` | tenancy | `applications` with `status IN ('confirmed','ended')` | `date(COALESCE(confirmed_at, created_at))` | `Move-in · <boarder last name>` | `confirmed` / `ended` |
| `tenancy_move_out` | tenancy | `applications` with `intended_leave_date IS NOT NULL` | `intended_leave_date` | `Leaving · <boarder last name>` | `leave_request_status` (`pending` / `approved` / `rejected`), or `approved` when the application is `ended` |
| `leave_requested` | tenancy | `applications` with `leave_request_date IS NOT NULL` | `date(leave_request_date)` | `Leave requested · <boarder last name>` | `pending` / `approved` / `rejected` |
| `announcement_publish` | content | `announcements` (`deleted_at IS NULL`) | `publish_date` | The announcement `title` | `published` when `publish_date <= today`, `submitted` when scheduled (D9) |

Chip labels are truncated by CSS, never by string surgery; the day panel shows the full title.

### 3.2 Tenancy start date — which field wins (L1)

Three places disagree today: `landlord-boarders.ts` maps `app.created_at AS move_in_date`,
`tenancy.ts` uses `app.created_at as tenancy_start_date`, and the billing schedule
(`payments/schedule.ts`) uses `COALESCE(app.confirmed_at, app.created_at)`. This spec uses
**`COALESCE(confirmed_at, created_at)`** for `tenancy_move_in` (the billing schedule's rule, and the
only one that reflects a real confirmation), and lists the inconsistency in §16 as a known trap. It
does **not** fix the other two call sites.

### 3.3 Charge-type labels

`charge_type` is one of `rent` | `deposit` | `advance` | `utility` | `late_fee` (per `payments` D-spec
and `helpers.isChargeType`). Chip/panel label = title-cased type; `late_fee` charges are **their own
`charge_due` event on their own date**, not a mutation of the parent charge.

### 3.4 Server-side derivation rules (imported, not re-invented)

- `today = manilaToday()` (D20).
- `effective status = effectiveStatus(stored_status, due_date, graceDays, paymentsForWindow?)` — the
  ledger's own function, so the calendar and `/landlord/payments` never disagree about a charge.
- `due_soon` uses the existing `isDueSoon` helper.
- Money formatting uses `formatMoney` (₱ + thousands separators, centavos dropped per that helper).

---

## 4. Money semantics (D27)

| Figure | Definition |
| ------ | ---------- |
| Month strip `₱ due` | Sum of `amount + late_fee` for non-cancelled charges whose **`due_date`** falls in the visible month and window, after the property filter. |
| Month strip `₱ collected` | Sum of `amount` (+ any verified `late_fee`) for charges whose **`paid_date`** falls in the visible month. |
| Month strip `N overdue` | Count of charges whose **derived** status is `overdue` **as of the visible month's last day**, not merely "today". |
| Day panel `₱ due` | The same sum restricted to the selected day. |
| Day panel `overdue` | Count of that day's `charge_due` events whose derived status is `overdue`. |

Overdue **never appears twice**: a charge contributes one `charge_due` event (tinted) and, once paid,
one `payment_received` event on its `paid_date`. It is not removed from the past.

---

## 5. API contract

### 5.1 Route

```
GET /api/landlord/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD[&propertyId=<int>][&types=<csv>]
```

- New file `workers/api/src/routes/landlord/calendar.ts`, mounted in
  `workers/api/src/routes/landlord/index.ts` exactly like its siblings:
  `landlordRoutes.route('/api/landlord', calendarRoutes)` with
  `calendarRoutes.get('/api/landlord/calendar', …)`.
- Auth: the same `landlordUser(c)` guard the other landlord routes use. A non-landlord gets the
  existing 401/403 response unchanged (`responseFromError` / `HttpError`).
- Validation: `from` and `to` are required `YYYY-MM-DD`; `to` is **exclusive**; the window must be
  ≤ 62 days (any two adjacent months, so the prefetch in D16 always fits) — otherwise `400`.
  `propertyId` must be a positive int; an inaccessible property returns an **empty list**, not an
  error (matching the ledger's behaviour of scoping rather than 404-ing a co-landlord's row).
- `types` is optional; the frontend sends the family filter's types. The server always validates
  against the closed type list.

### 5.2 Response

```jsonc
{
  "success": true,
  "data": {
    "window": { "from": "2026-10-01", "to": "2026-11-01" },
    "today": "2026-10-11",            // manilaToday(), so the client never guesses (D20)
    "property_id": null,              // echo of the filter
    "counts": { "money": 6, "tenancy": 2, "applications": 3, "content": 1 },
    "total": 12,
    "truncated": false,               // true when the cap below was hit
    "summary": {
      "due_amount": 36000, "collected_amount": 18000,
      "overdue_count": 2, "overdue_amount": 12000
    },
    "events": [
      {
        "id": "charge:91",            // stable, `<source>:<row id>` — React key + popover identity
        "type": "charge_due",
        "family": "money",
        "date": "2026-10-15",
        "title": "Rent · Reyes",
        "status": "overdue",          // drives StatusBadge (D12/§2.4)
        "amount": 6000,
        "late_fee": 0,
        "charge_type": "rent",
        "period_start": "2026-10-01",
        "period_end": "2026-10-31",
        "reference_number": null,
        "boarder": { "id": 12, "name": "Ana Reyes" },
        "room": { "id": 7, "label": "Room 3" },
        "property": { "id": 1, "title": "Onda Boarding House" },
        "link": { "to": "/landlord/payments", "label": "View ledger" }
      }
    ]
  }
}
```

- `events` is sorted by `date ASC`, then by a fixed family order (money → tenancy → applications →
  content) so a day's chips are stable across refetches.
- `link.to` is always a **real existing route**: `/landlord/payments`,
  `/landlord/payments/record`, `/landlord/applications`, `/landlord/boarders`,
  `/landlord/announcements`. The client does not invent routes.
- Cap (D23): `MAX_CALENDAR_EVENTS = 500` per window. When exceeded, the server keeps the earliest 500
  by the sort above, sets `truncated: true`, and the page renders a "showing 500 of Y events" notice
  **above** the grid, never silently.

### 5.3 Repository

- New `workers/api/src/repositories/landlord-calendar.ts` exporting
  `listCalendarEvents(db, landlordId, { from, to, propertyId, types })`.
- It composes **existing** reads where they exist (`listChargesForLandlord`) and adds three small,
  individually-testable queries for applications, leave dates and announcements — each using
  `accessiblePropertyClause()` for scoping and `deleted_at IS NULL` where the column exists.
- Pure helpers (window/sort/cap/summary math) live in the same file and are exported so the API test
  can exercise them without D1 — mirroring `payments/reporting.ts` (`buildPaymentAlerts` etc.).

---

## 6. Frontend architecture

| Piece | Path | Responsibility |
| ----- | ---- | -------------- |
| Route | `apps/web/src/routes/landlord/calendar.tsx` | `Protected` + `RoleShell` + the page component; no data logic. |
| Page | `apps/web/src/components/calendar/LandlordCalendar.tsx` | Query, filters, month state, selection state, all four page states. |
| Month strip | `apps/web/src/components/calendar/CalendarMonthSummary.tsx` | `₱ due · ₱ collected · N overdue` + truncation notice. |
| Grid | `apps/web/src/components/calendar/CalendarMonthGrid.tsx` | Weekday header (Sun-first), 5–6 week rows, day cells, chips, `+N more`. |
| Day panel | `apps/web/src/components/calendar/CalendarDayPanel.tsx` | Selected day's events, money summary, quick links. |
| Chip popover | `apps/web/src/components/calendar/CalendarEventPopover.tsx` | Read-only detail + `View record`. |
| Pure helpers | `apps/web/src/components/calendar/calendar-helpers.ts` | Month matrix (first cell date, week count), chip packing (≤3 + N more), label formatting, family → icon/tone maps. Pure, unit-testable. |
| API client | `apps/web/src/lib/api/calendar.ts` | `getLandlordCalendar(token, { from, to, propertyId, types })` via `apiFetch`, typed with additions to `apps/web/src/lib/types.ts`. |

Nesting stays within the tree's own convention (new folder `components/calendar/`, three levels deep
from `src/`). **No `createServerFn` is added** — the codebase fetches with `apiFetch` + React Query in
the page component (`lib/api/payments.ts` is the precedent); `createServerFn` appears in only two
routes and is not the established pattern here.

### 6.1 Query & window

- Query key: `['landlord-calendar', from, to, propertyId]`; `staleTime` 60s; `keepPreviousData` so
  month paging never flashes empty (D16).
- Window = the **full week matrix** of the visible month (all cells rendered, §7.3), so
  `from` is the Sunday on or before the 1st and `to` the Monday after the last Saturday.
- After a month resolves, prefetch the previous and next month's windows for the same filter.
- Per-property billing settings, grace periods and derived statuses are **not** recomputed on the
  client — the API already did it (§3.4). The client renders strings and tones.
- Filters (property + family) refetch with the same window; changing them does not reset the month.

---

## 7. UI spec

### 7.1 Shell

`RoleShell` (unchanged) → `PageHeader title="Calendar"` (D18) → toolbar → month strip → grid + day
panel. Everything sits on existing surfaces (`Card`, `cream`/`mint`/`primary`/`ink`/`border` tokens);
no new colours, no new fonts, no new SVG assets (D35 inheritance from `landlord-rooms-grid` D35).

### 7.2 Toolbar

Left → right: month navigation (`‹` · `October 2026` · `›` · `Today`), then a family filter group
(`All · Money · Tenancy · Applications`) styled exactly like the rooms grid's filter pills, then the
`All properties` selector (`Field` + native `select`, same as the payments page's property control).
On narrow screens the toolbar stacks: month nav row, filter pills (wrapping), property select full
width.

### 7.3 Month grid

- Weekday header `Sun … Sat` (D25).
- **Variable 5–6 rows** (D26): only the weeks the month needs.
- Day cell: date number, a `Today` accent on the current Manila day, a muted treatment for
  adjacent-month days (their events **do** render, since they are inside the window), and up to
  **3 chips** (D8) each = type icon + truncated title + the `StatusBadge` tone as the chip's surface.
- `+N more` sits under the third chip and selects that day.
- No per-cell scrolling and no fixed row height; cells share the available height evenly.
- Clicking anywhere else in a cell selects the day (chips stop propagation and open the popover).

### 7.4 Day panel

Header: the day (`Tuesday, October 13`), the event count, and the money summary (D13). Then the
event list, one row per event: icon, title, `StatusBadge`, boarder/room/property line, amount where
present, and a `View record` link. Below the list, only the actions that suit the day: `Record
payment` → `/landlord/payments/record`, `Review application` → `/landlord/applications`, `Review
leave request` → `/landlord/boarders`; each is rendered only when that day has an event of the
matching family. If the day is empty: an inline "Nothing scheduled" line, not a full `EmptyState`.

### 7.5 Popover (D12)

Anchored to the clicked chip, dismissible with Escape / outside click, focus trapped while open
(reusing `Modal`'s dismissal primitives rather than a new one). Contents: type label, boarder name,
room label, property title, amount (with `late_fee` and period when it is a rent charge),
`reference_number` for received payments, the `StatusBadge`, and one primary `View record` action.

### 7.6 States (D22)

| State | Rendering |
| ----- | --------- |
| Loading (first load) | Grid skeleton — weekday header + 5 week rows of shimmering cells (`Skeleton`), month strip as plain placeholder blocks. |
| Loading (month change) | Previous month's data stays rendered at reduced emphasis; no layout shift. |
| No accessible properties | Full-page `EmptyState`: "No properties yet" + a link toward listing creation. |
| Month with no events | Grid renders normally (so the month is still navigable) + "Nothing scheduled this month" under the month strip. |
| API error | `ErrorState` with the server message and a retry that refetches the same window. |
| Truncated | Notice above the grid: "Showing 500 of N events this month" (D23). |

---

## 8. Filters (D11)

- **Property:** `All properties` (default) plus one option per accessible property. Selection filters
  both events and the money summary server-side via `propertyId`.
- **Family:** `All` (default) · `Money` · `Tenancy` · `Applications`. `Content` (announcements) is
  reachable only under `All` — the pill row keeps the three families the interview named (D5), and a
  `Content` pill is **not** added. Changing the family maps to the `types` parameter, not a client
  filter, so the counts and the cap stay honest.
- Both filters are **component state, not URL params** (agent default §14-3), matching the rooms grid.

---

## 9. Dates, timezone and formatting rules

| Rule | Detail |
| ---- | ------ |
| All-day | Events have no time. `payments.due_date`/`paid_date` are already calendar dates; timestamps are reduced with `date()` (no timezone shifting of a stored date). |
| Today | `manilaToday()` from the server → `data.today` (D20). The client never calls `new Date()` for the highlighted day. |
| Month arithmetic | Done on `YYYY-MM` strings, never via `Date` parsing of date-only strings (the repo's existing `monthKey`/`addDays`/`isoDate` helpers). |
| Week start | Sunday (D25). |
| Display format | `October 2026` for the month label; `Tue, Oct 13` in the panel; day numbers bare. |
| Money | `formatMoney` (₱, no centavos) — identical to the ledger. |
| Booleans | `truncated`, `paid` etc. are booleans in the payload; no string comparison in the UI. |

---

## 10. Edge cases

| Case | Behaviour |
| ---- | --------- |
| Charge paid late | `charge_due` stays on `due_date` (tone `paid` once settled) **and** a `payment_received` event appears on `paid_date`. |
| Charge paid early | Same — the pair lands on two different days. |
| `cancelled` charge | Excluded entirely (D21). |
| Deposit / advance / utility charges | Their own `charge_due` events on their own dates, labelled by `charge_type`. |
| Late-fee charge | Its own event (never merged into the parent rent event). |
| Application `rejected` / `cancelled` | Excluded (D21) — a rejected application is not an operations date. |
| Application `ended` | Retained: the past move-in and the approve-leave history stay visible. |
| `intended_leave_date` in the past with a `pending` leave request | Renders in the alarm tone so the landlord sees an overdue decision. |
| Announcement deleted | Off the grid (`deleted_at IS NULL`). |
| Announcement with a future `publish_date` | Scheduled chip (D9), `submitted` tone; the popover says "scheduled". |
| Two events of the same type, same day, same boarder | Both render; ids differ (`charge:91`, `charge:94`). |
| Boarder with two rooms / two properties | Each event is labelled by its own room and property. |
| Co-landlord (property access grant) | Sees exactly the accessible properties' events — the same scoping predicate as the ledger. |
| `from`/`to` crossing a DST boundary | Not possible: Asia/Manila has no DST; arithmetic stays date-only. |
| Window > 62 days | `400` from the server; the client only ever asks for two months. |
| Landlord with properties but zero rows in every source | Month renders with the "Nothing scheduled" line (D22). |
| Session expiry mid-page | The existing 401 handling in `apiFetch` applies; nothing calendar-specific. |

---

## 11. Accessibility

- Day cells are real `<button>`s with an `aria-label` such as
  `Tuesday, October 13 — 3 events: 2 rent due, 1 move-in`; the selected day carries
  `aria-selected`/`aria-current="date"` for today.
- Chips are buttons, not `<a>`s (they open a popover); the popover contains the only link.
- The grid is a `<table>` with `<th scope="col">` weekday headers — a real calendar is tabular data
  and the screen-reader announcement is better than a div soup.
- Month navigation buttons carry `aria-label`s (`Previous month`, `Next month`, `Go to today`).
- Filter pills follow the rooms grid's `aria-pressed` pattern.
- Color is never the only signal: every tone is paired with a pill label (§2.4).

---

## 12. Testing & verification bar (D17)

| Check | Requirement |
| ----- | ----------- |
| API tests | A new `workers/api/test/landlord-calendar.test.ts`: pure helpers (window/month matrix, sorting, cap + `truncated`, summary sums) plus route-level cases — scoping by `propertyId`, a co-landlord grant, the `overdue` derivation matching `effectiveStatus`, exclusion of cancelled/rejected/deleted rows, `400` on a bad or oversized window. |
| Web tests | One new `apps/web/test/landlord-calendar.test.tsx` in the repo's existing source-contract + pure-helper style: the month matrix (Sun-first, 5 vs 6 rows), chip packing (`3 + N more`), label/tone maps, and that the route file renders the page component (not `PlaceholderPage`). |
| Typechecks / build | `bun run web:typecheck`, `bun run web:build`, `bun run cf:api:typecheck` — all clean. |
| Existing suites | `bun run web:test` and `bun run cf:api:test` stay green (re-record the counts from that run in §13/§17-style notes rather than quoting last spec's numbers). |
| Manual walkthrough | 1440px and 390px: month paging (incl. a 5-week and a 6-week month), Today, both filters, chip popover, `+N more`, `View record` targets, the four states, and the truncation notice (can be forced by lowering the cap in a local build). |
| Not claimed | No screenshots/goldens, no visual-regression tooling, no load testing — this repo has none. |

---

## 13. Implementation checklist (Phase 1)

1. `workers/api/src/repositories/landlord-calendar.ts` — queries + pure helpers + `Application`/`Tenant`
   scoping via `accessiblePropertyClause()`.
2. `workers/api/src/routes/landlord/calendar.ts` + mount in `landlord/index.ts`.
3. `workers/api/test/landlord-calendar.test.ts`.
4. `apps/web/src/lib/types.ts` (event union) + `apps/web/src/lib/api/calendar.ts`.
5. `apps/web/src/components/calendar/` — helpers, grid, month summary, day panel, popover.
6. `apps/web/src/routes/landlord/calendar.tsx` — replace the placeholder; keep `Protected` +
   `RoleShell`.
7. `apps/web/test/landlord-calendar.test.tsx`.
8. Dashboard `Upcoming renewals` card gains a link to the calendar (D28) — a link only, no data change.
9. `docs/qa/specs/qa-spec-audit.md` — amend the Calendar row (D19).
10. Run the D17 verification bar; append an "Implemented" block to this spec's header like the other
    root specs do.

---

## 14. Agent defaults (not asked; cheap to overturn)

1. **Adjacent-month days render their events** (greyed), because the window covers full weeks.
2. **Family → tone/icon map:** money `payment`/`currencyDollar`, applications `application`,
   tenancy `users` (move-in) / `logout` (move-out) / `document` (leave), content `announcement`; all
   from the existing `Icon` key list.
3. **Filters live in component state, not URL params** (the rooms grid's rule), so a refresh returns
   to the current month with `All properties`.
4. **Chips truncate with CSS** (`truncate`), never with JS string slicing.
5. **No polling, no push, no refetch-on-focus flood** — `staleTime` 60s; a manual retry only after an
   error.
6. **`Content` gets no filter pill** (§8) — announcements ride along under `All`.
7. **The day panel is not a route**; selecting a day never changes the URL.
8. **Empty days are inert** — clicking them selects them but shows the inline "Nothing scheduled" line.
9. **The strip's "overdue" is measured against the visible month's end**, not today, so browsing
   history does not light up the strip.
10. **A `Today` button always exists**, even when the visible month already contains today.

---

## 15. Out of scope here (future work)

- **Manual landlord events and reminders** (create/edit/delete), drag-to-reschedule, and any
  `events` table + migration. This is the deferred Phase 2 (D4/D37 in the interview) and is the
  natural next spec.
- **A boarder-facing calendar** mirroring their own due dates and tenancy dates (D24) —
  `/boarder/tenancy` covers the essentials today.
- **An ICS subscription feed** (`.ics` endpoint) so the landlord can add it to Google/Apple Calendar.
- **An admin platform-wide calendar** across all landlords.
- **Room/property-ops events** (maintenance windows, listing moderation changes) and **boarder
  message activity** — explicitly declined in the interview (D5, D14).
- **Dashboard restructure** — the `Upcoming renewals` card keeps its current (application-counting)
  semantics; only a link is added (D28).
- **Fixing the three-way move-in-date disagreement** (§3.2/L1) — noted, not changed.

---

## 16. Limitations and data gaps found while researching (not fixed by this spec)

| # | Gap | Effect on this feature |
| - | --- | ---------------------- |
| L1 | Move-in date is `created_at` in `tenancy.ts` and `landlord-boarders.ts`, but `COALESCE(confirmed_at, created_at)` in `payments/schedule.ts`. | The calendar may show a move-in date a day/period earlier or later than `/boarder/tenancy` does. Documented in §3.2; fixing it is a separate change. |
| L2 | No timestamp exists for the `pending → accepted` transition; `updated_at` is the only proxy and it also moves on later edits. | `application_accepted` is labelled as approximate in the panel ("accepted (approx. date)") rather than silently pretending to be exact. |
| L3 | No timestamp exists for a leave request's **decision**; only `leave_request_date` (submission) and `leave_request_status`. | Only the submission gets a calendar event; the decision is visible as the status pill on the `tenancy_move_out` event. |
| L4 | `tenancy.ts` writes `leave_request_date = date('now')`, which is **UTC**, not Manila — unlike the rest of the payment dates. | A leave request submitted between 00:00 and 08:00 Manila can land on the previous day. Noted; the fix belongs with L1's cleanup. |
| L5 | No tenancy end date beyond a boarder's *intended* leave date. | `tenancy_move_out` is explicitly an intent, labelled as such. |
| L6 | No appointment/event storage at all. | Anything that is not a stored date cannot be on this calendar — the reason Phase 2 needs a migration. |

---

## 17. What the interview turn did

The spec file and the amendment in `docs/qa/specs/qa-spec-audit.md` (D19) — no code, per the original
request. The implementation followed in a later turn: see §18.

---

## 18. What shipped (2026-10-12)

Phase 1 of §13, in this order: the aggregation repository, its route, the API test, the web types and
API client, the five calendar components, the route swap, the web test, the dashboard link. No
migration, no schema change, no config change.

| File | Role |
| ---- | ---- |
| `workers/api/src/repositories/landlord-calendar.ts` | The eight event types, the window/reference-date/cap/summary helpers, three scoped queries |
| `workers/api/src/routes/landlord/calendar.ts` | `GET /api/landlord/calendar` + window and `types` validation |
| `workers/api/test/landlord-calendar.test.ts` | 15 tests: helpers, aggregation, exclusions, scoping, co-landlord grant, 400s, 403 |
| `apps/web/src/lib/api/calendar.ts` | `getLandlordCalendar` + `calendarQueryString` |
| `apps/web/src/components/calendar/*` | `LandlordCalendar`, `CalendarMonthGrid`, `CalendarMonthSummary`, `CalendarDayPanel`, `CalendarEventPopover`, `calendar-helpers` |
| `apps/web/src/routes/landlord/calendar.tsx` | The placeholder is gone; the route now renders the page |
| `apps/web/test/landlord-calendar.test.tsx` | 21 tests: month matrix, chip vocabulary, request shape, rendering, wiring |
| `apps/web/src/routes/landlord/index.tsx` | D28: `StatCard` gained an optional `to`/`action`, and the renewals card links here |
| `apps/web/src/components/ui/StatusBadge.tsx` | `statusTone()` exported so the day chips speak the pill vocabulary |
| `workers/api/src/repositories/announcements.ts` | `manageableAnnouncementClause` exported, so the calendar shows exactly the announcements the page lists |

### 18.1 Deviations from the spec as written (all five deliberate)

1. **The charge read is windowed, not `listChargesForLandlord`.** §5.3 imagined composing that
   existing read, but it filters by `YYYY-MM` at best and otherwise returns a landlord's whole ledger
   → so the calendar runs its own windowed query (`due_date` or `paid_date` inside the window) and
   reuses the ledger's **derivation** (`formatCharge`) instead. A landlord with years of history
   never loads it to render one month.
2. **`subject` + raw fields, not a pre-labelled `title`.** The payload carries the unlabelled subject
   (boarder name, or the announcement title) plus `charge_type`/`description`, and the web composes
   `Rent · Reyes` from the label map it already owns (`lib/payments.ts`). Labelling in the API would
   have duplicated that map server-side.
3. **Event ids are `<source>:<row id>:<type>`** (e.g. `charge:91:charge_due`), not `charge:91`: a
   paid-late charge produces two events from one row, so the row id alone is not unique.
4. **The day-number control carries the cell's accessible name** (`aria-label="Tuesday, October 13 —
   2 events, 1 overdue"`), not the whole cell: a button cannot contain the chip buttons, and §11's
   wording assumed it could. The grid is still a real `<table>` with `<th scope="col">`.
5. **The chip popover is not a tab trap.** It focuses the panel on open, restores focus to the chip on
   close, and closes on Escape/outside click, but Tab walks out of it (the panel sits directly after
   its chip, so the order is chip → panel → next chip). `Modal`'s trap is internal to that component;
   duplicating it would have been a second implementation of a shared behaviour.

### 18.2 Verified

- **API tests** — 15 new pass; the whole suite is **331 passing, 0 failing** (30 files). The money
  paths exercised there include the derived `overdue` tint, the due/received pair for a late payment,
  a charge sitting inside its grace period *on the window's last day* (proving the reference date is
  the window's end and not today), cancelled/rejected/deleted exclusions, property scoping, the
  co-landlord grant, an inaccessible `propertyId` returning an empty list, and the 400/403 cases.
- **Web tests** — 21 new pass; the whole suite is **288 passing, 2 failing** (see 18.4). They cover the
  Sunday-first month matrix (5 vs 6 rows), chip packing (3 + `+N more`), the chip/panel vocabulary,
  the request shape, chip → popover → Escape, the empty day, and the wiring of route and dashboard.
- **Builds** — `cf:api:typecheck` and `web:build` are clean; the build emits the page's own chunk.
- **Browser walkthrough (1440px and 390px, local API :8000, landlord `lina.santos@haven.demo`)** — the
  page renders the header, toolbar, month strip, grid and day panel; today is highlighted and selected
  on load; month navigation reaches September 2026 and December 2026; the network log confirms the
  week-matrix windows (`2026-09-27 → 2026-11-01` and friends) plus the adjacent-month prefetch; a
  four-event day shows three chips and `+1 more`, and `+1 more` moves the panel to that day; a chip
  opens the popover with its status and `View record` link, and Escape closes it; the property filter
  and the `Money` family filter both empty the month and show the inline line; the day panel lists all
  four events with pills, the `Accepted date is approximate` note and the conditional quick actions;
  at 390px the toolbar stacks and the panel moves below the grid (with the shell's sidebar collapsed,
  as the app intends on a phone) and the document does not overflow; no console or network error came
  from the calendar.

### 18.3 Not verified in the browser

The local dev database holds no charge rows for the test landlord, so the **money** half of the page —
₱ figures in the strip and the day panel, the `overdue` tint — was exercised by the API tests with a
seeded ledger rather than on screen. The truncation notice (D23) was not forced in the browser either;
its logic is covered by the `capCalendarEvents` test.

### 18.4 Checks that could not pass, and why

`web:typecheck` reports **four errors, all in `apps/web/src/routes/landlord/index.tsx`**, and all from
another in-flight change to this working tree: that file now reads
`payment_alerts.due_today` / `payment_alerts.in_grace`, while the API's dashboard repository still
returns `{ due_soon, overdue }` and `lib/types.ts` still types it that way. The calendar's own files
contribute no error, and the guard test asserting the renewals card still counts
`renewals.upcoming_count` passes. Those four are deliberately **not** patched here — they belong to
the payments-tracker work, and fixing them from this branch would edit someone else's unfinished
change.

`bun run web:test` also reports **two failures, both in `apps/web/test/payments-tracker.test.tsx`** —
an untracked, new test for the redesigned payments page which fails with "Found multiple elements"
on that page's own duplicated rows (`Room A1 · 2/4` and `In grace`). Nothing in that file references
the calendar, and the assertion that fails is about the tracker's table markup, so this is that
work-in-progress, not this feature.
