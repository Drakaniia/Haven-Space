# Spec — Property card list (picture-matched layout) across landlord and admin property surfaces

**Status:** **Implemented and verified** (2026-10-08) — 164 web tests pass (19 files), 258 API tests pass
(26 files), `web:typecheck` / `cf:api:typecheck` / `web:build` all clean, and the three surfaces were
driven in a real browser at 1440px and 390px under both a landlord and an admin session. See §13 for what
shipped and where the implementation deviates from this spec.
**Short name:** `landlord-properties-card-layout`
**Date:** 2026-10-08
**Owner request (verbatim):**

> in http://localhost:3000/landlord/properties, can you change the layout like that, dont copy the image
> text , just the layout , like the picture the placing of the text etc.

Plus a reference screenshot (attached by the requestor, stored outside the repo): a vertical stack of
wide cards. Each card has a rounded photo thumbnail on the left with a small dot-and-label pill overlaid
on its top-left corner, and on the right: a bold title, a pin-icon + address line, then a row of five
bordered chips (icon + value). The card is white, thin-bordered, softly shadowed, generously padded.

Per D1 the screenshot is a **layout reference only** — its text (bed/bath/area/agent) is replaced with
Haven Space data.

**Relationship to existing work:**

- Follows the Apple-UI restructure specs: `admin-apple-ui-restructure-spec.md` established the pill
  language (`StatusBadge`, R20), the `Card` surface tokens and the "real controls, not bare glyphs" rule
  (R24). This spec reuses those; it invents no new surface style (D16).
- Follows `create-listing-room-details-spec.md`: the per-room model, the `Private / Shared / Dorm`
  vocabulary, and `LandlordRoomList` (the inline room manager this spec embeds in an accordion) all come
  from there. Its verification hook — `apps/web/test/create-listing-rooms.test.tsx` asserts
  `PropertiesSection.tsx` contains `getPropertyRooms`, `Slots free` and `roomTypeLabel` — is the one
  existing test this change must update (§10).
- Supersedes the table treatment of properties introduced by
  `docs/plans/2026-08-14-tanstack-start-full-rewrite.md` for these three surfaces only. The
  `DataTable` primitive itself stays; it is still the right surface for every other table in the app.
- Does **not** touch the tenant-facing browse cards (`FindARoomContent`) — the requestor explicitly
  excluded them (D2), and `create-listing-room-details-spec.md` D18 owns that layout.

---

## 1. Interview decisions (as answered by the requestor)

Answers were collected in **seven rounds** of `ask_user`. Rows marked **(agent default)** are the
implementation choices recorded because the interview left them open; they are listed again in §11.

| #   | Topic                             | Decision                                                                                                                                                                                                                                                      |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | What the picture contributes      | **Layout only.** "just copy the layout not the text, you can replace the text that are connected to the Haven Space details." No copy, labels, counts or units are taken from the screenshot verbatim; the text slots are filled from our API.                |
| D2  | Surfaces in scope                 | **Three surfaces:** `/landlord/properties`, `/landlord/listings`, and **Admin → Properties moderation**. Tenant browse `/find-a-room` is out.                                                                                                                 |
| D3  | What happens to the current table | **Fully replaced** by the card list on those three surfaces. No table/card toggle, no "table on desktop" split.                                                                                                                                               |
| D4  | The inline room manager           | **Accordion inside the card.** The existing room manager (`LandlordRoomList`) moves inside the card, revealed by a toggle.                                                                                                                                    |
| D5  | Card click target                 | **Whole card opens the listing edit page** (`/landlord/listings/$id/edit`).                                                                                                                                                                                   |
| D6  | Photo slot                        | **Cover photo, placeholder tile when empty** — a neutral tile with the property icon, so no card ever renders a broken/missing image and heights stay even.                                                                                                   |
| D7  | Overlay pill vocabulary           | **Per surface.** Landlord cards carry the listing status (`Available` / `Full` / `Inactive`); admin cards carry the moderation status (`Pending review` / `Published` / `Rejected`).                                                                          |
| D8  | Numeric facts to show             | **Monthly rent, occupancy, monthly revenue** (in addition to what the chip row already carries). `pending_applications` and amenity icons were explicitly **not** selected — they stay off the card.                                                          |
| D9  | Layout density                    | **Single column, full-width cards**, thumbnail on the left, exactly like the picture.                                                                                                                                                                         |
| D10 | Toolbar / sorting                 | **No toolbar.** The API order (newest first) stands; no search, filter or sort controls are added.                                                                                                                                                            |
| D11 | Admin bulk selection              | **Checkbox per card, visible only in Select mode**, driven by the existing Select toggle. Bulk bar and the 100-item cap are unchanged.                                                                                                                        |
| D12 | Accordion behaviour               | **Independent toggles, all collapsed by default.** No auto-open, no URL state, no first-card expansion.                                                                                                                                                       |
| D13 | Clickable-card pattern            | **Stretched link from the title**, with the card's real controls rendered above that layer (§8) — no nested interactive elements.                                                                                                                             |
| D14 | "…" overflow menu                 | **Exactly two items:** _Edit listing_ and _Delete property_, the latter guarded by the existing `ConfirmDialog`.                                                                                                                                              |
| D15 | Secondary text lines              | **Title + address only.** No property-type label, no description snippet.                                                                                                                                                                                     |
| D16 | Card styling                      | **Reuse the app's `Card` tokens** (`rounded-2xl`, `border-border`, `bg-surface`, `shadow-card`) — not the screenshot's tighter radius.                                                                                                                        |
| D17 | Shared-access signal              | **Small muted "Shared access" label beside the date**, on shared properties only. Owned properties show nothing extra; the Access column retires.                                                                                                             |
| D18 | The chip set                      | **Five chips: Rooms · Occupancy · Rent · Revenue · Date**, in that order — the picture's five slots, filled with our fields. The picture's leading count chip (rooms) and its date chip keep their positions.                                                 |
| D19 | Zero-room properties              | **"No rooms yet"** in the occupancy slot instead of a number; partially occupied properties read "3 of 5 rooms occupied".                                                                                                                                     |
| D20 | Admin rooms affordance            | **The same inline accordion, read-only** (rows from the existing `GET /api/admin/properties/rooms`). The admin rooms `Modal` retires from this section.                                                                                                       |
| D21 | Admin data gap                    | **Enrich `GET /api/admin/properties`** with the fields the card needs (rooms count, occupied rooms, address, created date, cover photo) — additive, no migration.                                                                                             |
| D22 | The near-duplicate landlord pages | **`/landlord/listings` and `/landlord/properties` become the identical card list**, one shared component. Both nav entries stay.                                                                                                                              |
| D23 | Verification bar                  | `web:typecheck` + `web:test` + `web:build` green; a **new web test** for the card list and rooms accordion; **existing tests that assert the old table updated**; a **manual browser walkthrough at 390px and 1440px**; an **admin bulk-select smoke check**. |
| D24 | Rollout                           | **One pass across all three surfaces** with one shared card component when implementation starts.                                                                                                                                                             |
| D25 | This pass                         | **Spec only.** No code changes, no migrations, no dependency changes.                                                                                                                                                                                         |
| D26 | Loading state                     | **(agent default)** Skeleton card list (3–5 placeholder cards built from the existing `Skeleton` primitive) instead of the bare spinner.                                                                                                                      |
| D27 | Long values                       | **(agent default)** Title wraps to **2 lines**, address **clamps to 1 line with ellipsis**; chips **wrap** to a second line below ~640px.                                                                                                                     |
| D28 | Mobile stacking                   | **(agent default)** Below ~480px the card becomes vertical — thumbnail on top, text below — instead of a cramped two-column row.                                                                                                                              |
| D29 | Empty state                       | **(agent default)** The existing `EmptyState` ("No properties yet" + create-listing action) is kept verbatim on the landlord pages.                                                                                                                           |
| D30 | Icon choice for the money chips   | **(agent default)** Two money facts sit side by side; rent uses `currencyDollar`, revenue uses `chartBar` so the two chips do not share one glyph (§4). Flagged as an open question in §11.                                                                   |

---

## 2. Current state (verified 2026-10-08, read-only)

### 2.1 The three surfaces

| File                                                           | Lines | What it is today                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/routes/landlord/properties.tsx`                  | 92    | `Protected role="landlord"` → `RoleShell` → `PageHeader` ("My properties", `+ Create listing`) → `DataTable<LandlordProperty>` with columns **Name / Address / Access / Status / Rooms** and `expandable={row => <LandlordRoomList token={token!} propertyId={row.id} />}`.                                                                                                                                                                                                                                |
| `apps/web/src/routes/landlord/listings/index.tsx`              | 91    | The same query (`getProperties`, key `['landlord-properties']`) rendered as a **thinner table**: Name / Address / Status / Rooms / Monthly revenue. It deliberately renders **no shell of its own**: `routes/landlord/listings.tsx` is a layout route that wraps every `/landlord/listings/*` child in `Protected` → `RoleShell` → `Outlet`. (An earlier draft of this spec read that as a missing wrapper and added one; the browser rendered two nested sidebars and topbars — corrected, §11 Q5 / §13.) |
| `apps/web/src/components/admin/sections/PropertiesSection.tsx` | 267   | `AdminSection` + `DataTable<AdminPropertyRow>`: Title / Price / Status / Landlord / Actions (`Rooms` → modal, `Publish`, `Reject`, `Flag`). `Select` toggle turns on `selectable` with the 100-item cap, `BulkActionBar` and `TableSkeleton` as the loading state. The `Rooms` button opens a **modal** with a read-only `DataTable<AdminPropertyRoom>` (Room/Type/Rent/Capacity/Occupied/Slots free/Photos/Status).                                                                                       |

### 2.2 The data

`GET /api/landlord/properties` (`workers/api/src/routes/landlord/properties.ts` →
`formatLandlordPropertyListItem`) returns per property:

```
id, name, type, description, address, latitude, longitude, city, province,
price, status (active | full | inactive), role (owner | shared),
total_rooms, occupied_rooms, monthly_revenue, created_at,
amenities[], photos[], pending_applications
```

`status` is computed: `rejected` moderation → `inactive`; `occupied_rooms >= total_rooms` (and rooms > 0)
→ `full`; otherwise `active`. `photos` is the full URL list from `property_photos`
(`listLandlordPhotos`, ordered by `display_order`, with `is_cover` on the row).

`GET /api/admin/properties` (`workers/api/src/repositories/admin-dashboard.ts` → `listAdminProperties`)
returns far less — this is the D21 gap:

```
id, title, price, listing_moderation_status, landlord_first, landlord_last, landlord_email
```

with **no** rooms count, occupancy, revenue, address, created date or photo, and `LIMIT 100`. The query is
written twice (filtered / unfiltered branches) with identical SELECT lists. The per-room endpoint
`GET /api/admin/properties/rooms?id=` already exists and is used by the modal being retired.

**There is no bathrooms field and no floor area anywhere in the schema** — which is why the picture's
bath and m² chips cannot be reproduced literally (D1/D18).

### 2.3 The primitives available

- `Card` — `rounded-2xl border border-border bg-surface p-5 shadow-card` (opaque by design).
- `StatusBadge` — tone map keyed by status string. Covers `active`, `pending`, `pending_review`,
  `published`, `rejected`, `flagged`, `owned`, `shared`, `inactive` (via fallback) — but **has no `full`
  tone**, so `full` currently falls through to the neutral fallback (bug-adjacent; this spec fixes it).
- `DataTable` — `columns`, `keyFor`, `expandable`, `selectable`, `selectedIds`, `onToggle`, `onToggleAll`.
  `expandable` stays in the codebase: `apps/web/src/components/admin/PropertyAccessTab.tsx` still uses it.
- `Skeleton`, `Spinner`, `EmptyState`, `ErrorState`, `ConfirmDialog`, `Modal`, `Button`, `ToastStack`,
  `PageHeader`, `Icon`.
- `Icon` is an asset map over `apps/web/public/assets/svg`. Relevant names: `buildingOffice` / `list`
  (`property.svg`), `location` / `pin`, `calendar` / `calendarDays`, `currencyDollar` / `banknotes`
  (both map to `currencyDollar.svg`), `chartBar` (`analytics.svg`), `users`, `home`, `grid`, `photo`.
  **There is no bed, bath, ruler or ellipsis icon** — the chips therefore use the icons above (D30) and
  the overflow menu uses an inline three-dot SVG, exactly as `DataTable`'s `AppleCheckbox` already
  hand-rolls its checkmark inline.
- `formatDate(value)` exists in three places: canonical in `apps/web/src/components/admin/sections.ts`,
  plus local copies in `apps/web/src/routes/boarder/applications/index.tsx` and
  `apps/web/src/components/admin/LandlordDocumentsModal.tsx`. Peso amounts are formatted inline as
  `` `₱${Number(x).toLocaleString()}` `` at every call site.

### 2.4 Test surface

`apps/web/test/` holds 19 files run with `bun test` (happy-dom registered in `test/setup.ts`). Two styles
are in use: behavioural unit tests (importing the module) and **source-contract tests** that
`readFileSync` a file and assert on its text — `create-listing-rooms.test.tsx` already asserts on
`create.tsx`, `LandlordRoomList.tsx` and `PropertiesSection.tsx` this way. This spec's new test follows
that convention (§10), which keeps it dependency-free.

`workers/api/test/source-references.test.ts` scans `apps/web/src` and `workers/api/src` for legacy
`.php`/`.js` references; new source files must keep passing it (no local `.js` import specifiers).

---

## 3. Target layout

One card, verbatim structure from the screenshot, mapped to our data:

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│  ┌──────────┐   High-Yield commercial property         ← title (15px, semibold)   │
│  │  photo   │   ● 4140 Parker Rd, Allentown            ← address (13px, muted)     │
│  │ (104px,  │                                                                     │
│  │ rounded) │   [▤ 4 rooms] [👥 2 of 4 rooms] [₱ 12,000/mo] [▦ ₱ 24,000] [📅 Oct   │
│  │  ● pill  │      18, 2026]   ← chips (12px, bordered, icon + value)              │
│  └──────────┘                                     ⌄ Rooms    ✎ Edit    ⋯           │
└───────────────────────────────────────────────────────────────────────────────────┘
        └── expanding: the existing room manager (LandlordRoomList) / read-only rows (admin)
```

- **Surface:** `Card` tokens — `rounded-2xl border border-border bg-surface shadow-card`; card padding
  tighter than `Card`'s default `p-5` (use `p-3 sm:p-4` with the thumbnail flush inside), so the list
  reads as a list and not as a stack of panels.
- **Thumbnail:** fixed footprint `h-[104px] w-[104px] shrink-0` on ≥480px, `aspect-[4/3] w-full` when
  stacked (D28). `rounded-xl object-cover`, `overflow-hidden`.
- **Overlay pill:** absolutely positioned `left-2 top-2`, translucent light material (`bg-white/85
backdrop-blur`) with a colored dot (`success` / `warning` / neutral) plus a 11px label — text **and**
  colour, never colour alone (§8).
- **Text column:** `min-w-0 flex-1` so truncation works; title `text-[15px] font-semibold` clamped to 2
  lines (`line-clamp-2`); address row `text-[13px] text-gray-ink` with a 14px pin icon tinted `info`,
  clamped to 1 line.
- **Chip row:** `flex flex-wrap gap-2`; each chip `inline-flex items-center gap-1.5 rounded-lg border
border-border px-2.5 py-1 text-xs text-gray-ink`, icon 13px.
- **Controls row:** right-aligned under the chips (or top-right on wide screens if the card grows tall):
  the rooms toggle (`aria-expanded`, chevron that rotates), `Edit` (`Button size="sm" variant="outline"`),
  and the `…` menu button. All of them sit **above** the stretched link layer (§8).
- **Gaps:** `gap-4` between thumbnail and text; `gap-2` inside the text column; `gap-3` between cards.

---

## 4. Screenshot element → Haven Space mapping

| Screenshot slot   | Ours (landlord surfaces)                                                                                                     | Ours (admin)                                                                                                 | Source field                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| Left thumbnail    | `photos[0]` (the list orders by `display_order`); placeholder tile with `buildingOffice` when `photos` is empty              | `cover_photo` (cover-first, D21); same placeholder                                                           | `photos[]` / `cover_photo`                             |
| Pill on the photo | `Available` / `Full` / `Inactive` + dot                                                                                      | `Pending review` / `Published` / `Rejected` + dot                                                            | landlord: `status`; admin: `listing_moderation_status` |
| Bold title        | Property name                                                                                                                | Property name                                                                                                | `name` / `title`                                       |
| Pin + address     | `"${address}, ${city}"` (province appended when it differs)                                                                  | address (new field, D21)                                                                                     | `address`, `city`, `province`                          |
| Chip 1 (bed 4)    | **Rooms** — the property's room count, e.g. `4 rooms`                                                                        | same                                                                                                         | `total_rooms` / `rooms_count`                          |
| Chip 2 (bath 3)   | **Occupancy** — `2 of 4 rooms occupied`, or **"No rooms yet"** when `total_rooms === 0` (D19)                                | same                                                                                                         | `occupied_rooms` + `total_rooms`                       |
| Chip 3 (area)     | **Rent** — `₱12,000/mo`                                                                                                      | same                                                                                                         | `price`                                                |
| Chip 4 (calendar) | **Revenue** — `₱24,000` monthly                                                                                              | same                                                                                                         | `monthly_revenue` (D21 for admin)                      |
| Chip 5 (agent)    | **Date** — created date, `toLocaleDateString()`; a muted **"Shared access"** label follows it when `role === 'shared'` (D17) | created date + landlord name (`landlord_first landlord_last`)                                                | `created_at` / `role`                                  |
| — (no equivalent) | `⌄ Rooms` toggle, `Edit`, `…`                                                                                                | moderation actions (`Publish` / `Reject` / `Flag`) + the same `⌄ Rooms` toggle; checkbox when in Select mode | —                                                      |

Chip icon map (D30): Rooms → `list`; Occupancy → `users`; Rent → `currencyDollar`; Revenue → `chartBar`;
Date → `calendarDays`.

---

## 5. Files

**New**

| File                                                           | Purpose                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/components/properties/PropertyCard.tsx`          | **Shipped.** The card, its `<ul>`/`<li>` list, the skeleton list (D26), the `…` menu, and every pure helper the surfaces share (`landlordFacts`, `adminFacts`, `listingPill`, `moderationPill`, `occupancyLabel`, `propertyAddress`, `formatPeso`, `formatCardDate`). Presentational + props only. |
| `apps/web/src/components/properties/LandlordPropertyCards.tsx` | **Shipped.** The shared landlord list both routes render (D22/R23): the query, the delete mutation + confirm, toasts, independent accordion state and the `LandlordRoomList` body.                                                                                                                 |
| `apps/web/test/properties-card-layout.test.tsx`                | **Shipped.** 15 tests: pure-helper facts, pill vocabularies, and the markup contracts (§10).                                                                                                                                                                                                       |

_Planned `PropertyCardList.tsx`, `PropertyRoomsAccordion.tsx` and `lib/format.ts` were collapsed into the
files above: the list and the helpers are a few lines each, the two accordion bodies are one line
(`<LandlordRoomList/>`) plus an admin-only component that stayed in `PropertiesSection.tsx` where its
query already lived, and the formatters are used by this card only._

**Changed**

| File                                                           | Change                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/routes/landlord/properties.tsx`                  | `DataTable` → `PropertyCardList`; keeps `Protected`, `RoleShell`, `PageHeader`, empty/error states and the `+ Create listing` action.                                                                                                                                                                                                                 |
| `apps/web/src/routes/landlord/listings/index.tsx`              | Same card list (D22). Renders **no shell** — its layout route already provides one (§2.1, §13).                                                                                                                                                                                                                                                       |
| `apps/web/src/components/admin/sections/PropertiesSection.tsx` | Cards for `AdminPropertyRow`; Select-mode checkbox; `Select all (first 100)` control replacing the table header checkbox; per-card `Publish`/`Reject`/`Flag`; the rooms `Modal` and `Column<AdminPropertyRoom>` table are removed, with the read-only per-room rows living on as `AdminPropertyRooms` in the same file (its query was already there). |
| `apps/web/src/components/ui/StatusBadge.tsx`                   | Add a `full` tone (warning tint) so the landlord pill is not a neutral fallback.                                                                                                                                                                                                                                                                      |
| `apps/web/src/lib/types.ts`                                    | `AdminPropertyRow` gains `rooms_count`, `occupied_rooms`, `monthly_revenue`, `address`, `city`, `province`, `created_at`, `cover_photo` (D21).                                                                                                                                                                                                        |
| `workers/api/src/repositories/admin-dashboard.ts`              | `listAdminProperties` SELECT gains those columns (one query shape, filtered/unfiltered branches kept) + a batched cover-photo lookup via the existing `listLandlordPhotos(db, ids)` helper — no per-row query.                                                                                                                                        |
| —                                                              | `workers/api/src/routes/admin.ts` needs **no change**: `handleAdminProperties` already returns `listAdminProperties(...)` rows verbatim, so the added keys flow through (additive; existing consumers unaffected).                                                                                                                                    |
| `workers/api/test/admin-dashboard.test.ts`                     | Assert the new keys for the enriched response.                                                                                                                                                                                                                                                                                                        |
| `apps/web/test/create-listing-rooms.test.tsx`                  | Update the assertion that `PropertiesSection.tsx` contains `Slots free` / `getPropertyRooms` / `roomTypeLabel` — after this change those live in `PropertyRoomsAccordion.tsx`.                                                                                                                                                                        |

**Untouched:** `DataTable` (still used by admin Users/Landlords/Applications/Audit, boarder pages and
`PropertyAccessTab`), `LandlordRoomList` (embedded, not rewritten), `FindARoomContent`, the landlord
create/edit routes, all D1 migrations, and the `photos`/`amenities` writing paths.

---

## 6. Requirements

**Card anatomy**

- **R1** — Each property renders as one full-width card: thumbnail left, text column right (single
  column at every breakpoint; D9).
- **R2** — The thumbnail shows the cover photo when one exists; otherwise a placeholder tile with the
  `buildingOffice` icon on `bg-subtle`/`bg-mint`, with `aria-hidden` and no alt duplication (the title is
  adjacent).
- **R3** — Below 480px the card stacks (thumbnail above text) rather than compressing (D28).
- **R4** — The status pill is overlaid on the thumbnail's top-left corner: colored dot + short label.
  Landlord surfaces read `Available` / `Full` / `Inactive`; admin reads `Pending review` / `Published` /
  `Rejected` (D7).
- **R5** — The title is a link to the property's listing edit route and stretches over the whole card
  (§8). It clamps to 2 lines.
- **R6** — The address line is clamped to 1 line with an ellipsis and carries the pin icon.
- **R7** — The chip row carries exactly five chips in this order: Rooms, Occupancy, Rent, Revenue, Date
  (D18). Chips wrap on narrow widths; they never scroll horizontally.
- **R8** — Occupancy reads `N of M rooms occupied`, or **"No rooms yet"** when the property has zero rooms
  (D19).
- **R9** — A muted `Shared access` label follows the Date chip on properties whose `role` is `shared`;
  owned properties show nothing (D17).
- **R10** — Amounts render as `₱` + `toLocaleString()`, with `/mo` on the rent chip only.
- **R11** — The date chip renders `formatDate(created_at)` and never raw ISO.

**Interaction**

- **R12** — Every card carries three controls: the rooms toggle (`⌄ Rooms`, `aria-expanded`), `Edit`
  (listing edit route), and a `…` menu with exactly _Edit listing_ and _Delete property_ (D14).
- **R13** — _Delete property_ opens the existing `ConfirmDialog` before
  `DELETE /api/landlord/properties?id=`; on success the list is invalidated and a success toast is shown.
- **R14** — Clicking the card body (not a control) opens the listing edit page (D5).
- **R15** — The rooms toggle expands the room manager inside the card; toggles are independent and all
  start collapsed (D12). Landlord surfaces show `LandlordRoomList` unchanged (add / edit / delete room
  all keep working); admin shows the same rows read-only (D20).
- **R16** — Expanding does not re-fetch on every toggle: the room query is keyed per property and cached
  (`landlord-rooms` / `admin property-rooms`), so a re-open is instant.
- **R17** — Admin cards keep `Publish`, `Reject`, `Flag` with their confirmation behaviour for the two
  negative actions, unchanged from today.

**Admin specifics**

- **R18** — In Select mode each card shows a checkbox; the bulk bar, its actions and the **100-item cap**
  behave exactly as before. Outside Select mode no checkbox is rendered.
- **R19** — Because the table header checkbox disappears, Select mode adds a `Select all (first 100)`
  control; selecting more than 100 is impossible (the existing cap message still applies).
- **R20** — The admin rooms `Modal` is no longer reachable from this section.

**States**

- **R21** — Loading renders a skeleton card list (3–5 cards, `Skeleton` primitive) instead of a spinner
  (D26).
- **R22** — Error renders the existing `ErrorState`; empty renders the existing `EmptyState` unchanged
  (D29).
- **R23** — Landlord pages render the same list component with the same behaviour (D22); the only
  differences between the two routes are the page header copy and the route's empty-state icon.

---

## 7. Admin API enrichment (D21)

Additive only — no migration, no new endpoint:

1. `listAdminProperties` SELECT gains: `p.created_at`, `a.address_line_1 AS address`, `a.city`,
   `a.province`, `COUNT(DISTINCT r.id) AS rooms_count`,
   `COALESCE(SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END), 0) AS occupied_rooms`,
   `COALESCE(SUM(CASE WHEN r.status = 'occupied' THEN r.price ELSE 0 END), 0) AS monthly_revenue`,
   with `LEFT JOIN addresses a ON p.address_id = a.id` and
   `LEFT JOIN rooms r ON p.id = r.property_id AND r.deleted_at IS NULL`, plus a `GROUP BY` mirroring the
   landlord list query pattern (`workers/api/src/repositories/landlord/properties-queries.ts`).
2. Cover photo comes from **one batched** query — **not** a correlated subquery per row. Reuse the
   property-photo query shape from `workers/api/src/repositories/landlord/properties-photos.ts`
   (`listLandlordPhotos(db, propertyIds)` already batches by ids and returns
   `Map<propertyId, string[]>`) with a cover-first order —
   `ORDER BY property_id ASC, is_cover DESC, display_order ASC, id ASC` — and take the first URL per
   property. This mirrors the cover semantics already used by `workers/api/src/routes/rooms.ts:155`,
   `workers/api/src/routes/landlord/rooms.ts:84` and `saved-listings.ts:61` (`is_cover` wins, else the
   first photo). Because the shared helper's current `ORDER BY` is `display_order` only, either add the
   order term in a sibling selector or extend the helper **without** changing its signature — do not
   reorder the existing helper's output, which the listing edit flows already consume.
3. The response keeps every existing key and adds the new ones (`cover_photo` may be `null`), so
   `apps/web/src/lib/api/admin.ts` and existing tests keep working; `AdminPropertyRow` in
   `apps/web/src/lib/types.ts` is extended to match.
4. While in this function: collapse the duplicated filtered/unfiltered SQL into one statement with a
   conditional `WHERE` clause. (Optional; only if it stays trivially readable.)

---

## 8. Accessibility and interaction contract

- **Stretched link (D13):** the card is `<li>` with `position: relative`. The title's `<a>` gets
  `after:absolute after:inset-0` (the stretched hit area); every other control (rooms toggle, Edit, `…`,
  checkbox, admin action buttons) is rendered with `relative z-10` so it sits above that layer. No
  interactive element nests inside another.
- **Focus:** the stretched link takes focus with a visible ring on the **card** (`focus-visible:ring` on
  the link, `focus-within:` styling on the card), then Tab continues to the rooms toggle → Edit → menu in
  DOM order.
- **Rooms toggle:** a real `<button>` with `aria-expanded` and `aria-controls` pointing at the accordion
  region's `id`; the chevron has `aria-hidden` and rotates with `motion-reduce:transition-none`
  (matching `DataTable`'s existing chevron treatment).
- **Menu:** `aria-haspopup="menu"` + `aria-expanded`; Escape closes and returns focus to the trigger;
  the same dismissal behaviour as the app's other popovers.
- **Delete confirm:** reuses `ConfirmDialog` (focus trap and labelling already handled).
- **Pill and dot:** the label is always rendered next to the dot — status is never colour-only.
- **Thumbnail:** decorative (`alt=""`) because the property name is the adjacent accessible text; the
  placeholder tile is `aria-hidden`.
- **Touch targets:** every control on the card is ≥44px in its smaller dimension (per
  `admin-apple-ui-restructure-spec.md` R24's "real controls" rule).
- **Lists:** the stack is a `<ul>`/`<li>` list; the chip row is a nested `<ul>` with the property name in
  its `aria-label` (e.g. `Facts for High-Yield commercial property`) so a screen reader user knows which
  card the facts belong to.
- **Motion:** no new animation beyond the existing 150ms `ease-settle` chevron/expand treatment, all
  reduced-motion aware.

---

## 9. Edge cases

| Case                                       | Expected                                                                                                                            |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `photos` empty                             | Placeholder tile (R2). Never a broken image, never a shorter card.                                                                  |
| `total_rooms === 0`                        | Occupancy chip reads **"No rooms yet"**; Rooms chip reads `0 rooms`; accordion still opens and offers `+ Add room` (landlord only). |
| `occupied_rooms >= total_rooms > 0`        | Pill reads `Full` (already computed by the API).                                                                                    |
| `listing_moderation_status === 'rejected'` | Pill reads `Inactive` on landlord surfaces (API maps it); admin sees `Rejected`.                                                    |
| `role === 'shared'`                        | Muted `Shared access` beside the date; no other visual difference.                                                                  |
| Long title / address                       | 2-line clamp / 1-line ellipsis; chips keep their row alignment (R6/R7).                                                             |
| Very large amounts                         | `₱1,250,000` etc. still fit; chips wrap rather than overflow.                                                                       |
| Many rooms in the accordion                | The accordion body scrolls with the page (no nested scroller); `LandlordRoomList`'s existing layout is unchanged.                   |
| Admin: >100 properties                     | Select mode caps at 100 with today's message; the API's `LIMIT 100` is unchanged.                                                   |
| Select mode + accordion                    | Independent: a card can be selected and expanded at the same time; deleting/expanding never clears the selection.                   |
| Bulk action failure                        | The failed ids stay selected (existing behaviour preserved).                                                                        |
| Empty list                                 | `EmptyState` as today (R22).                                                                                                        |
| Loading                                    | Skeleton cards, no layout jump when data arrives.                                                                                   |

---

## 10. Verification plan (D23)

**Commands** (must all pass, each reported honestly):

```
bun run web:typecheck
bun run web:test
bun run web:build
bun run cf:api:typecheck
bun run cf:api:test
```

**New test — `apps/web/test/properties-card-layout.test.tsx`**

1. Source contract: `PropertyCard.tsx` contains the stretched-link pattern (`after:absolute`), the five
   chip labels (`Rooms`, `Occupancy`, `Rent`, `Revenue`), and does **not** render a `<table>`.
2. Source contract: `routes/landlord/properties.tsx` and `routes/landlord/listings/index.tsx` both import
   `PropertyCardList` and neither imports `DataTable` any more.
3. Source contract: `PropertiesSection.tsx` no longer imports `Modal` and still contains `selectable`,
   the 100-cap message and `Publish` / `Reject` / `Flag`.
4. Pure helper tests for the card's fact builders — occupancy text (`No rooms yet`, `3 of 5 rooms
occupied`), the `Shared access` decision (`role === 'shared'`), the address join (`address, city`),
   and peso/date formatting.
5. Pill mapping: `active→Available`, `full→Full`, `inactive→Inactive`; admin
   `pending_review→Pending review`, `published→Published`, `rejected→Rejected`.

**Updated tests**

- `apps/web/test/create-listing-rooms.test.tsx` — the admin assertion moves from `PropertiesSection.tsx`
  to `PropertyRoomsAccordion.tsx` (it must still prove the per-room read-only view exists, keeps
  `roomTypeLabel`, and now shows the accordion instead of the modal).
- `workers/api/test/admin-dashboard.test.ts` — assert the enriched `GET /api/admin/properties` payload
  (rooms count, occupancy, revenue, address, created date, `cover_photo`), and that a property with no
  photos yields `cover_photo: null` without failing the request.

**Manual walkthrough** (dev server running, both roles seeded):

| Check                                                                                                                                                            | Where                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Card renders photo / placeholder / pill / 5 chips, single column                                                                                                 | `/landlord/properties` at 1440px      |
| Title + address clamps hold with a long name                                                                                                                     | same, temporary long-fixture property |
| Chips wrap, card stacks image-on-top                                                                                                                             | 390px                                 |
| Card click → edit page; Edit button → edit page; `…` → delete confirm → list updates + toast                                                                     | both breakpoints                      |
| Rooms accordion: expand, add room, delete room, collapse, re-expand (cached, no spinner)                                                                         | both breakpoints                      |
| Same card list on `/landlord/listings`                                                                                                                           | 1440px                                |
| Admin: pill shows moderation status; Select mode checkbox; `Select all (first 100)`; bulk Reject with confirm; 100-cap message; inline read-only rooms accordion | `/admin?section=properties`           |
| Loading skeletons and empty state (delete all properties on a scratch account)                                                                                   | both breakpoints                      |
| Keyboard-only pass: Tab order, Enter on the stretched link, Escape in the menu                                                                                   | 1440px                                |

---

## 11. Open questions and agent defaults

Defaults already chosen in §1/§4/§8 (D26–D30), restated so review can overturn them cheaply:

- **Q1 — Money chips.** Rent (`₱12,000/mo`) and Revenue (`₱24,000`) sit side by side with different
  icons (`currencyDollar` vs `chartBar`). If review finds that redundant, the alternative is one money
  chip plus a right-aligned revenue figure — a two-line change inside `PropertyCard.tsx`.
- **Q2 — Chip icons.** There is no bed/bath/ruler icon asset, so `list` / `users` / `currencyDollar` /
  `chartBar` / `calendarDays` stand in. If new SVGs are added to `public/assets/svg`, only the map in §4
  changes.
- **Q3 — `…` menu icon.** No ellipsis asset exists; the spec uses an inline three-dot SVG inside the
  `Button` primitive (precedent: `DataTable`'s inline checkmark). Adding a `more.svg` asset is the
  alternative.
- **Q4 — Formatters.** `formatDate`/`formatPeso` land in a new `lib/format.ts` for the card only; the
  three existing `formatDate` copies and the inline peso templates are deliberately left untouched to
  keep the diff small. Unifying them is a separate cleanup.
- **Q5 — `/landlord/listings` shell. Resolved: no wrapper.** `routes/landlord/listings.tsx` is a layout
  route (`Protected` → `RoleShell` → `Outlet`), so the page must stay shell-free. The first implementation
  wrapped it anyway and the browser showed two nested sidebars/topbars; that wrapper was removed and the
  page now renders heading + cards only.
- **Q6 — Sorting.** No toolbar is added (D10), so the list cannot be ordered by name/price/occupancy.
  If that hurts, a follow-up spec should add sorting to the card list rather than reinstating the table.
- **Q7 — Admin pill + action density.** Admin cards carry a pill, a chip row, three moderation buttons
  and an accordion. If reviews find the admin card too busy, the cheapest retreat is chips-only for
  admin with moderation actions behind the `…` menu — a change confined to `PropertiesSection.tsx`.
- **Q8 — Cover-first ordering on the landlord list.** `GET /api/landlord/properties` returns
  `photos[]` ordered by `display_order` only, so the card cannot honour the `is_cover` flag that every
  other cover selection site in the API does (`routes/rooms.ts`, `routes/landlord/rooms.ts`,
  `saved-listings.ts`). This spec keeps the landlord card on `photos[0]` and gives admin a cover-first
  batched lookup (D21). Making the landlord payload cover-first too (an `ORDER BY is_cover DESC` term in
  `listLandlordPhotos`) is a small follow-up with a real risk: the listing edit flow consumes the same
  helper, so it should be verified against the photo reorder behaviour first.

---

## 12. Out of scope

- Tenant-facing browse cards (`FindARoomContent`) and the public property detail page.
- Any change to `DataTable`, `Card`, `LandlordRoomList`, `ConfirmDialog` or `Modal` internals.
- Adding bathrooms or floor-area fields to properties (the picture's two unfillable chips — D1).
- The `pending_applications` and amenity strips (explicitly declined in D8).
- Sorting, search, filtering, pagination or URL state for the card lists (D10/D12).
- D1 schema changes or migrations of any kind (the admin enrichment rides on existing columns).
- Producing the artwork itself (no image was requested; the screenshot is only a layout reference).

---

## 13. What shipped (2026-10-08)

**New files**

| File                                                           | Lines | Role                                                                                                                      |
| -------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/components/properties/PropertyCard.tsx`          | ~370  | Card, list, skeleton list, `…` menu, and all pure card helpers (facts, pills, occupancy, address, money/date formatting). |
| `apps/web/src/components/properties/LandlordPropertyCards.tsx` | ~150  | The shared landlord list: query, delete + confirm, toasts, accordion state, `LandlordRoomList` body.                      |
| `apps/web/test/properties-card-layout.test.tsx`                | ~200  | 15 tests (helper facts, pill vocabularies, markup contracts).                                                             |

**Changed:** `routes/landlord/properties.tsx`, `routes/landlord/listings/index.tsx`,
`components/admin/sections/PropertiesSection.tsx`, `components/ui/StatusBadge.tsx` (new `full` tone),
`lib/types.ts` (`AdminPropertyRow` gains seven keys), `workers/api/src/repositories/admin-dashboard.ts`
(single enriched query + batched cover photos), `workers/api/src/repositories/landlord/properties-photos.ts`
(new `listPropertyCoverPhotos`), `workers/api/test/admin-dashboard.test.ts`,
`apps/web/test/create-listing-rooms.test.tsx` (admin assertion now proves the inline inspector and the
absent modal).

### 13.1 Deviations from the plan in §5

1. **Four planned new files → two.** `PropertyCardList` and the helpers folded into `PropertyCard.tsx`;
   the admin read-only rows stayed in `PropertiesSection.tsx` (where the query already was) instead of a
   `PropertyRoomsAccordion.tsx`; no `lib/format.ts` (two tiny helpers used by one component).
2. **`/landlord/listings` is not wrapped in `Protected`/`RoleShell`** — its layout route already does it
   (§11 Q5). The first implementation added the wrapper and rendered two nested shells; caught by the
   owner in the browser and fixed in the same session.
3. **`‹Slots free›` became lowercase inline copy** in the admin rows, so the
   `create-listing-rooms` assertion was updated to `free_slots` and strengthened with
   `not.toContain('<Modal')` rather than weakened.

### 13.2 Verification actually run

| Check                  | Command / method                                          | Result                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web typecheck          | `bun run web:typecheck`                                   | **pass** (exit 0)                                                                                                                                                                                                                                                                                                                                       |
| Web tests              | `bun run web:test`                                        | **164 pass / 0 fail** (19 files; +15 new)                                                                                                                                                                                                                                                                                                               |
| Web build              | `bun run web:build`                                       | **pass** (exit 0)                                                                                                                                                                                                                                                                                                                                       |
| API typecheck          | `bun run cf:api:typecheck`                                | **pass** (exit 0)                                                                                                                                                                                                                                                                                                                                       |
| API tests              | `bun run cf:api:test`                                     | **258 pass / 0 fail** (26 files)                                                                                                                                                                                                                                                                                                                        |
| Landlord cards, 1440px | real Chrome: `/landlord/listings`, `/landlord/properties` | Single shell; cards, pills, five chips, `Rooms` accordion (6 rooms with rent/slots/status), `…` menu with _Edit listing_ + _Delete property_, Escape closes it                                                                                                                                                                                          |
| Hit-target contract    | `document.elementFromPoint` at each control's centre      | Returns the control itself (`BUTTON`, `A` for the title) — the stretched link never steals a control click                                                                                                                                                                                                                                              |
| Mobile, 390px          | real Chrome, sidebar collapsed                            | Thumbnail stacks above the text, chips wrap onto three lines, address ellipsizes, no card overflow                                                                                                                                                                                                                                                      |
| Admin moderation       | real Chrome, admin session                                | 0 tables; moderation pill `Published`; chips `20 rooms` / `1 of 20 rooms occupied` / `₱600/mo` / `₱600` / `9/29/2026`; per-card `Publish`/`Reject`/`Flag`; `Select` → 7 checkboxes + `Select all (first 100)`; selecting one shows the bulk bar; the rooms accordion lists all 20 rooms with `slots free` and photo counts, with the row still selected |

**Not verified, and why**

1. **Delete confirm end-to-end.** The menu opens the confirm dialog path, but the mutation was not fired:
   it would destroy seeded demo data in the owner's local D1. The flow is the existing `ConfirmDialog`
   plus the already-tested `DELETE /api/landlord/properties?id=` endpoint.
2. **Admin screenshot capture.** The preview webview stopped compositing partway through the admin pass
   (`no frames` from the capture API, twice). Every admin claim above comes from DOM assertions on the
   live page rather than a picture.
3. **Bulk apply.** The bulk bar's `Apply` was not executed for the same reason as (1) — moderation state
   would change (`reject`/`flag` on seeded rows).

### 13.3 Things worth doing next

1. Confirm the two remaining destructive paths by hand on a scratch account (delete property, bulk
   moderation apply).
2. Decide §11 Q1 (two money chips) and Q8 (cover-first ordering on the landlord payload) — both are open
   and unchanged by this implementation.
3. `GET /api/admin/properties` still `LIMIT 100`; the landlord list is unbounded. Neither surface
   paginates, which is fine at 7 rows and not fine at 700.
