# Spec — Landlord property rooms page as a stat + toolbar + card grid

**Status:** **Implemented** (2026-10-09) — 228 web tests pass (21 files, +31 new), 273 API tests pass (27 files),
`web:typecheck` / `web:build` / `cf:api:typecheck` all clean, and the route SSRs without error. See §13 for what
shipped, the two deviations and what could not be verified.
**Short name:** `landlord-rooms-grid`
**Date:** 2026-10-09
**Surface:** `http://localhost:3000/landlord/properties/$id/rooms` — one page, one component tree.
**Owner request (verbatim):**

> in http://localhost:3000/landlord/properties/7/rooms copy image design for better UI

Plus a reference screenshot (attached by the requestor, stored outside the repo). Read top to bottom it shows:

1. A breadcrumb `Properties › Onda Boarding House › Rooms`.
2. A large page title (`Onda Boarding House`) and a solid green **`+ Add room`** button at the top-right.
   *(The subtitle *"Manage rooms, rent and occupancy in one place."* was removed in the 2026-10-10
   redundant-copy sweep — D14.)*
3. A row of **four stat cards** — `Total rooms 20`, `Occupied rooms 1`, `Available rooms 19`, `Free slots 400` — white, thin-bordered, softly rounded, each with a small grey label above a large bold number.
4. A **toolbar**: three filter pills (`All 20`, `Available 19`, `Occupied 1`) on the left, where the active pill is a solid dark-green disc; on the right a bordered **search field** ("Search rooms") and a **`Sort: Room number`** select.
5. A **4-column grid of room cards**. Each card: `Room N` in bold with a status pill at its right (`Occupied` in a peach pill / `Available` in a green pill), a muted `Shared room` line, `₱600 /month` (bold peso, small `/month`), a thin full-width progress bar, a muted `20 of 20 slots free` line, then a wide outline **`Edit room`** button paired with a small circular **trash icon button**.
6. A footer of `Showing 12 of 20 rooms` and a **`Load more rooms`** button.

As with the earlier picture-driven specs, the screenshot is a **layout reference**: its copy is kept where the owner asked for it (D14) and its *data* is filled from Haven Space's API. No new colours, no new fonts, no new image assets.

**Relationship to existing specs**

- Follows `landlord-property-detail-page-spec.md`, which created this route and embedded `LandlordRoomList` on it (that spec's D8/D9/R11), and `landlord-properties-card-layout-spec.md`, which owns the property-card card language this page mirrors (rounded surfaces, dot/text pills, `Card` tokens, "layout only" reading of screenshots — its D1/D16).
- Follows `create-listing-room-details-spec.md` for the room model (`private` / `shared` / `dorm`, tenant capacity, `occupied`, "slots free") and for the per-room photo UX this spec reuses in the add-room dialog (its D11/R6).
- Follows `admin-apple-ui-restructure-spec.md` for the pill primitive (`StatusBadge`) and the "real controls, not bare glyphs" rule this page's icon buttons have to respect.
- Does **not** touch the property card list, the property detail page, the listing edit page, or the boarders page.

---

## 1. Interview decisions (as answered by the requestor)

Collected in **eight rounds** of `ask_user`. Rows marked **(agent default)** are choices the interview left open and this spec fixes; they are restated in §11 so review can overturn them cheaply.

| #   | Topic | Decision |
| --- | ----- | -------- |
| D1  | Surfaces in scope | **Only the standalone rooms page** (`/landlord/properties/$id/rooms`). `LandlordRoomList` keeps its current compact look everywhere else it is embedded (listing edit page, boarders page). |
| D2  | Where `+ Add room` lives | **In the page header**, top-right, exactly as in the picture (today it is the right-hand control of an in-content `Rooms` section header, which is dropped). |
| D3  | Search + sort | **Fully functional.** Search filters the grid; sort reorders it. The select's default is the room-number order. |
| D4  | Paging | **None.** Every room is rendered; the picture's `Showing 12 of 20 rooms` counter and `Load more rooms` button are **not** reproduced. |
| D5  | Delete affordance | **Icon-only trash button** next to `Edit room` (as in the picture), guarded by the existing `ConfirmDialog`, with an `aria-label`. |
| D6  | The four stat cards | `Total rooms` · `Occupied rooms` · `Available rooms` · `Tenants / capacity`, with the definitions in §4.2. Maintenance is **not** given a stat card. |
| D7  | Maintenance status | **Its own pill and its own filter pill.** `All · Available · Occupied · Maintenance`, all four pills always rendered. |
| D8  | Room card photo | **Yes — a photo thumbnail** on each card, using the room's `cover_photo` and a placeholder tile when it has none. |
| D9  | Slot line + bar | Replaces the picture's `20 of 20 slots free` with the **tenant count over capacity**, e.g. `1/20 slots occupied`; the bar fills with that occupied share (D12). |
| D10 | Component structure | **A new page-level component.** `LandlordRoomList` is left alone as a component; see D18 for the one shared piece. |
| D11 | Fourth stat card | Label **`Tenants / capacity`** *(relabelled on request 2026-10-10 — was `Occupancy`)*, value **`tenants/capacity`** (e.g. `1/400`) — the owner's "total tenants / total capacity of the property". |
| D12 | Per-room slots | Card reads **`occupied/capacity`** ("1/20 occupied by boarders"); bar fill = occupied share. |
| D13 | Sort options | **Room number (default) · Rent · Slots free · Tenants / capacity**, with the directions in D33. |
| D14 | Header copy | **The picture's copy**: title = property name. ~~subtitle = *"Manage rooms, rent and occupancy in one place."*~~ **Superseded (2026-10-10, redundant-copy sweep):** the page subtitle is **removed** — the title and the grid already say what the page is. |
| D15 | Maintenance in the numbers | **Not counted as available.** `Available rooms` counts `status === 'available'` only. |
| D16 | Grid | **4 columns → 2 → 1** (desktop / tablet / phone). A lone card **keeps its column width**; it never stretches to fill the row. |
| D17 | Shared add-room logic | The new page owns stats, toolbar, grid and states; the **add-room form + create/upload mutations are extracted into one shared piece** that both the new page and `LandlordRoomList` use, so behaviour stays identical. |
| D18 | Verification bar | `web:typecheck` + `web:build` + a **new small web test** + the existing suites + a **manual browser walkthrough at 1440px and 390px**. |
| D19 | Boarders on the card | **No names, no extra fetch** — the `occupied` number is all the card shows. |
| D20 | Pills primitive | **Extend `StatusBadge`** with the missing tones (`available`, `occupied`, `maintenance`) and use it for both the card pills and the filter pills' dot/label language. |
| D21 | States | **`EmptyState`** for a property with no rooms, a **skeleton card grid** while loading, and a **"no rooms match"** line (with a clear action) when the filters/search match nothing. |
| D22 | Tests | **One new small test file** in the repo's existing source-contract + pure-helper style. |
| D23 | Stat card component | **A new local stat card** on the rooms page (white surface, border, large number, as in the picture). `PropertyOverview`'s private `StatTile` is untouched. |
| D24 | Which status drives the pills | **`room.status` only.** A shared room with 1 of 20 tenants that is still `available` stays under **Available** (the card's tenant count makes the mismatch visible). |
| D25 | Pills vs search | **Pill counts follow the search text**; the four stat cards always describe the whole property. |
| D26 | Room number | Rendered **exactly as stored** (`1`, `Room 3`, `A2` — no `Room ` prefix is added); sorted **naturally**, numeric-aware and case-insensitive (`Room 2` before `Room 10`). |
| D27 | Card interactivity | **The card body is inert.** `Edit room` navigates to the room edit route; the trash button deletes. No stretched link. |
| D28 | Filter/search/sort persistence | **Component state only** — no URL search params. A refresh resets to All / empty search / room-number sort. |
| D29 | Photos in the add dialog | The modal **gains photo upload**, using the same functions and inputs as creating a room inside property creation (create first, then `uploadRoomPhotos`), per D30. |
| D30 | Photo flow | Room is created, then the selected file is uploaded against its id; a failed upload leaves the room created and surfaces a warning (the create-listing flow's behaviour). |
| D31 | Photo limit in the modal | **One cover photo.** Additional photos remain a job for the room edit page. *(Conflicts with "the same inputs as create-listing", whose input is multi-photo — see §11 Q1.)* |
| D32 | Grid footer / mobile toolbar | **No footer under the grid.** On narrow screens the toolbar stacks: pills wrap onto their own row, search goes full width, sort below it. |
| D33 | Sort directions | `Room number` (natural, ascending) · `Rent` low→high · `Slots free` high→low · `Tenants / capacity` low→high (least-filled first). |
| D34 | Card fields | **Exactly the picture's fields** — room number, type, status pill, rent, slot line + bar, `Edit room`, trash. No deposit, size, description or photo count. |
| D35 | Palette | **Existing tokens only** (`cream` / `mint` / `primary` / `ink` / `border` / the shared primitives). The screenshot is a layout reference, not a colour source. |

---

## 2. Current state (verified 2026-10-09, read-only)

### 2.1 The page

| File | Lines | What it is today |
| ---- | ----- | ---------------- |
| `apps/web/src/routes/landlord/properties/$id/rooms.tsx` | 52 | `createFileRoute('/landlord/properties/$id/rooms')` → `Protected`/`RoleShell` come from the route tree's parent. The page fetches `getProperty(token, id)` (`['landlord-property', id]`), renders `Spinner` / `ErrorState`, then `PropertyDetailHeader` (`subtitle="Add rooms, set their rent, and manage which rooms are occupied."`, `trailTail="Rooms"`) followed by `<LandlordRoomList token propertyId />`. |
| `apps/web/src/components/rooms/LandlordRoomList.tsx` | ~200 | Owns its own `getRooms` query (`['landlord-rooms', propertyId]`), the add-room `Modal` (room number, type, price, deposit, capacity), the delete mutation + `ConfirmDialog`, toasts, and a `Rooms` section header with an inline `+ Add room` button. The list itself is a bordered `<ul>` of rows: room number, `Type · ₱price/mo · N of M slots free`, `StatusBadge`, `Edit room` link (`/landlord/listings/rooms/$id/edit?propertyId=`), `Delete` button. |

`LandlordRoomList` is also embedded by `apps/web/src/routes/landlord/listings/$id/edit.tsx` (line 509) and effectively by `apps/web/src/routes/landlord/boarders.tsx` (a room picker that shares the same query key), which is why D1 keeps it intact and D17 only extracts the add flow.

### 2.2 The data (no API change needed)

`GET /api/landlord/rooms?propertyId=` (`apps/web/src/lib/api/landlord.ts:171` →
`workers/api/src/routes/landlord/rooms.ts:124`) already returns everything this page needs:

```
data.property = { id, name, status, total_rooms (rooms.length), occupied_rooms (rooms with status 'occupied') }
data.rooms[]  = { id, property_id, room_number, room_type, description, price, deposit,
                  status ('available' | 'occupied' | 'maintenance'),
                  capacity, occupied, free_slots (max(capacity - occupied, 0)),
                  size, cover_photo (is_cover wins, else first photo), photos[],
                  created_at, updated_at }   // the payload also carries `tenant: null`
```

TypeScript mirror: `LandlordRoom` / `LandlordRoomListResponse` in `apps/web/src/lib/types.ts:446`/`464`.

**Consequences for this spec — the whole change is frontend-only:**

- The property name is already fetched by the page's own `getProperty` query (the header needs it), and the rooms payload repeats `property.name` / `total_rooms` / `occupied_rooms`. The page can derive every stat from the rooms array alone, so the stat cards never disagree with the grid.
- `room.status` and `room.occupied` are independent fields: the statuses come from the DB, occupancy from boarder rows. D24 settles which one the pills follow.
- Room create (`POST /api/landlord/rooms`) and room photo upload (`POST /api/landlord/rooms/{id}/photos`) are **not** behind `requireVerifiedLandlordWrite` (verified: `workers/api/src/routes/landlord/rooms.ts` imports only `requireLandlord`), so the add dialog works for unverified landlords the way it does today.
- Room create already accepts `id`-bearing responses: `201 { success, message, data: LandlordRoom }` — the room id needed for the photo upload is in the response.
- `POST /api/landlord/rooms` rejects a duplicate room number with `409` and validates capacity 1–10 / occupied ≤ capacity; the modal's error surface already prints these messages.

### 2.3 The primitives available

- `Card` — `rounded-2xl border border-border bg-surface p-5 shadow-card`, opaque by design.
- `StatusBadge` — tone map keyed by status string. Covers `active`, `pending`, `pending_review`, `published`, `rejected`, `flagged`, `full`, `shared`, `owned`, `admin`, `landlord`, `boarder`, … The tone map has **no `available`, `occupied` or `maintenance` entries** (D20 adds them).
- `Button` / `buttonClasses` — variants `primary`, `secondary`, `outline`, `ghost`, `danger`, `dangerGhost`, `warning`, `warningGhost`; sizes `sm`, `md`; already `rounded-full` with `active:scale-[0.97]`.
- `Modal` — `open`, `title`, `onClose`, `children`, `size`; handles Escape, focus trap, body scroll lock and focus restore. *(Defect noticed while reading: its close button uses `<Icon name="x" …>` and `ICON_FILES` has no `x` key — the glyph renders empty. Out of scope, but worth a one-line fix while this dialog is being touched; see §11 Q4.)*
- `Field` / `TextInput` / `SelectInput` / `TextArea` — the shared form primitives (`SelectInput` is a native `<select>`, so the sort control needs no custom popover).
- `EmptyState` — `title`, `description`, `icon`, `action` (dashed border, mint disc).
- `Skeleton`, `Spinner`, `ErrorState`, `ConfirmDialog`, `ToastStack`/`useToasts`.
- `Icon` — asset map over `apps/web/public/assets/svg`. Relevant names present: `search` (`search.svg`), `chevronDown`, `close`, `plus`, `photo`, `buildingOffice`/`list` (`property.svg`), `users`, `currencyDollar`, `chartBar`, `calendarDays`, `location`/`pin`. **There is no `trash` asset and no `trash` key**, so the trash button needs an inline SVG (precedent: `DataTable.tsx:44`, `Toast.tsx`, `Avatar.tsx` all hand-roll SVGs).
- `PropertyOverview.tsx` has a **private** `StatTile` (grey `bg-subtle` tile, numeric value) used by the detail page's *Room summary* card. D23 keeps it private and builds the page's own stat card.
- `PropertyCard.tsx` exports the pill/fact helpers and the dot-pill pattern from `landlord-properties-card-layout` — reusable vocabulary, but its cards are property cards, not room cards.
- `roomTypeLabel()` (`apps/web/src/lib/room-drafts.ts`) already maps `private|single → Private`, `shared → Shared`, `dorm → Dorm`; it is what the current room row uses and what the new card should use.
- Formatting helpers exist inside `PropertyCard.tsx` (`formatPeso`, `formatCardDate`) — exported, so the room card can import them rather than adding a fourth peso/date formatter.

### 2.4 Test surface

`apps/web/test/` runs with `bun test` (happy-dom in `test/setup.ts`). Two conventions coexist: behavioural component tests, and **source-contract tests** that `readFileSync` a file and assert on its text (`create-listing-rooms.test.tsx` asserts on `LandlordRoomList.tsx` — e.g. `room.free_slots`, `roomTypeLabel`; `properties-card-layout.test.tsx` asserts on `PropertyCard.tsx`'s markup and helpers). D22 adds one file in that style, which means the existing `create-listing-rooms` assertions on `LandlordRoomList.tsx` must keep passing (D17 keeps that component's behaviour and row markup, only lifting its modal out).

`workers/api/test/source-references.test.ts` scans `apps/web/src` for legacy `.php`/`.js` references; new files must keep passing it (no local `.js` import specifiers).

---

## 3. Target layout

```
Properties › Onda Boarding House › Rooms                     ← PropertyDetailHeader trail (unchanged)
┌───────────────────────────────────────────────────────────────────────────────────────┐
│  Onda Boarding House                                        [   + Add room   ]        │
│  (subtitle removed — 2026-10-10 redundant-copy sweep)                                 │
└───────────────────────────────────────────────────────────────────────────────────────┘

┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ Total rooms│ │ Occupied   │ │ Available  │ │Tenants/cap │      ← 4 white bordered cards
│     20     │ │ rooms   1  │ │ rooms  19  │ │   1/400    │        (2 per row on tablet,
└────────────┘ └────────────┘ └────────────┘ └────────────┘         1 on phone)

( All 20 )  ( Available 19 )  ( Occupied 1 )  ( Maintenance 0 )   [🔍 Search rooms]  [Sort: Room number ⌄]
      ↑ active pill: solid primary; inactive: bordered surface

┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ ┌──────┐         │ │ …                │ │ …                │ │ …                │
│ │photo │  Room 1  ( Occupied )        ← thumbnail + title + status pill
│ └──────┘  Shared room                  ← roomTypeLabel()
│  ₱600 /month                           ← price
│  ▬▬▬▬▬▬▬▬▬░░░░░░░░░░░                  ← bar, fill = occupied / capacity
│  1/20 slots occupied                   ← D12
│  [    Edit room    ] [🗑]              ← outline button + icon-only trash
└──────────────────┘ └──────────────────┘ └──────────────────┘ └──────────────────┘
```

- The grid is `grid gap-4 sm:grid-cols-2 xl:grid-cols-4` (D16) — cards keep their column width, so one room yields one card-sized card, not a full-width banner.
- Card geometry follows the property cards: `Card` surface (`rounded-2xl border border-border bg-surface shadow-card`), `p-4`, thumbnail `rounded-xl` with the room icon as placeholder, `flex-col` stack inside.
- Toolbar is one flex row on ≥`sm`, stacked below it (D32).
- Nothing sits under the grid (D4).

---

## 4. Screenshot element → Haven Space mapping

### 4.1 Card

| Picture slot | Ours | Source |
| --- | --- | --- |
| (no image) | Room thumbnail, `cover_photo` first; placeholder tile with the `photo`/`buildingOffice` icon when the room has no photos | `room.cover_photo`, `room.photos[]` |
| `Room 1` | `room.room_number` **as stored** (D26) | `room_number` |
| `Occupied` / `Available` pill | `StatusBadge` with the new tones: occupied → warning tint (peach, as in the picture), available → success tint (green), maintenance → neutral | `room.status` |
| `Shared room` muted line | `roomTypeLabel(room.room_type)` + `room` — e.g. `Shared room`, `Private room`, `Dorm room` | `room_type` |
| `₱600 /month` | `formatPeso(room.price)` + `/month` (muted) | `price` |
| progress bar | `width = occupied / capacity`, clamped 0…1, rounded, `bg-mint` track with `bg-primary` fill | `occupied`, `capacity` |
| `20 of 20 slots free` | `{occupied}/{capacity} slots occupied` (singular/plural handled), e.g. `1/20 slots occupied` | `occupied`, `capacity` |
| `Edit room` | `buttonClasses({ variant: 'outline', size: 'sm' })` link to `/landlord/listings/rooms/$id/edit?propertyId=` (**route unchanged**) | `room.id` |
| trash button | Icon-only `Button variant="dangerGhost" size="sm"` with an inline trash SVG, `aria-label={\`Delete room ${room.room_number}\`}` → `ConfirmDialog` → `deleteRoom` | `room.id` |

### 4.2 Stat cards

| Card | Value | Definition |
| --- | --- | --- |
| `Total rooms` | count | `rooms.length` (identical to `property.total_rooms`) |
| `Occupied rooms` | count | rooms with `status === 'occupied'` (identical to `property.occupied_rooms`) |
| `Available rooms` | count | rooms with `status === 'available'` — **maintenance rooms are excluded** (D15) |
| `Tenants / capacity` | `N/M` | `sum(room.occupied)` / `sum(room.capacity)` across all rooms, e.g. `1/400` (D11) |

All four are computed **client-side from the rooms array**, so they always agree with the grid and never depend on a second endpoint. They are **never affected** by the search box or the active filter (D25).

### 4.3 Toolbar

| Picture | Ours |
| --- | --- |
| `All 20` / `Available 19` / `Occupied 1` | Four pills: `All`, `Available`, `Occupied`, `Maintenance` (D7), each with its count **recomputed against the current search text** (D25). Active pill = solid `primary` disc with white text; inactive = `bg-surface` + `border-border` + `text-gray-ink`, both `rounded-full px-3 py-1 text-sm`. Rendered as real `<button>`s with `aria-pressed`. |
| `Search rooms` field | `TextInput` with the `search` icon, `aria-label="Search rooms"`, placeholder `Search rooms`, matching **room number only** (D13). A small clear (`×`) control appears when non-empty. |
| `Sort: Room number` | `SelectInput` (native select, `aria-label="Sort rooms"`) with exactly four options (D13/D33): `Room number` (default), `Rent` (low→high), `Slots free` (high→low), `Tenants / capacity` (low→high, least-filled first). |
| `Showing 12 of 20 rooms` / `Load more rooms` | **Not reproduced** (D4). |

**Natural sort (D26):** compare with `localeCompare(..., { numeric: true, sensitivity: 'base' })` on `room_number`, with `room.id` as the tiebreaker so the order is stable. Ties on rent/slots/occupancy also fall back to the same natural room-number order.

---

## 5. Files

**New**

| File | Purpose |
| ---- | ------- |
| `apps/web/src/components/rooms/RoomCard.tsx` | Presentational room card (thumbnail, title, status pill, type line, price, bar, slot line, `Edit room`, trash) **plus** the pure helpers the test targets: slot label, bar ratio, natural comparator, status filter/match predicate, stat rollups. |
| `apps/web/src/components/rooms/PropertyRoomsGrid.tsx` | The page-level block: `getRooms` query, the four stat cards (local component, D23), the toolbar (pills / search / sort), the responsive grid, the skeleton grid, the empty states, the delete mutation + `ConfirmDialog`, toasts, and the `+ Add room` trigger wiring. |
| `apps/web/src/components/rooms/RoomFormModal.tsx` *(name illustrative)* | The extracted add-room dialog: the five existing fields **plus the new cover-photo input** (D29–D31), the `createRoom` mutation, the follow-up `uploadRoomPhotos` call, error/busy state, and an `open`/`onClose`/`onCreated` contract. Used by `PropertyRoomsGrid` and by `LandlordRoomList` (D17). |
| `apps/web/test/rooms-grid.test.tsx` | The new test (D22): pure-helper tests for the stat rollups, slot label, bar ratio, natural sort, filter+search predicates; source-contract assertions for the new components and the touched files. |

**Changed**

| File | Change |
| ---- | ------ |
| `apps/web/src/routes/landlord/properties/$id/rooms.tsx` | `subtitle` → the picture's copy (D14); pass `action={<Button onClick={…}>+ Add room</Button>}` (or an equivalent trigger the grid owns) to `PropertyDetailHeader` (D2); render `PropertyRoomsGrid` instead of `LandlordRoomList`. Keeps its `Spinner`/`ErrorState` handling for the property fetch. |
| `apps/web/src/components/ui/StatusBadge.tsx` | Add `available: 'bg-success-tint text-success-ink'`, `occupied: 'bg-warning-tint text-warning-ink'`, `maintenance: 'bg-subtle text-gray-ink'` (D20). Existing entries untouched. |
| `apps/web/src/components/rooms/LandlordRoomList.tsx` | Replace its inline `Modal` with the extracted `RoomFormModal` (D17). Its section heading, row markup, delete flow, toasts and query keys stay as they are, so `create-listing-rooms.test.tsx` keeps passing with at most the modal-wiring assertion updated. |

**Untouched (explicitly):** `workers/api/**` (no endpoint, query or migration changes — §2.2), `PropertyOverview.tsx`'s `StatTile`, `PropertyCard.tsx` / `LandlordPropertyCards.tsx`, `PropertiesSection.tsx`, `DataTable`, `Card`, `Modal`, `Button`, `Field`, `ConfirmDialog`, the property detail page, `listings/$id/edit.tsx`, `listings/rooms/$id/edit.tsx`, `boarders.tsx`, and the `landlord-rooms` query key shape (the boarders page shares it).

**Open structural question:** the header's `+ Add room` button and the grid both need the dialog's open state. Two viable shapes — (a) the page owns the state and passes `action` + `addOpen`/`onAddOpenChange` down to the grid, or (b) the grid renders the header trigger. Pick one at implementation time; the spec requires only that the button sits in the header (D2) and that the dialog remains a single shared implementation (D17).

---

## 6. Requirements

**Page header**

- **R1** — The header renders `PropertyDetailHeader` with the breadcrumb trail unchanged (`Properties › {property name} › Rooms`) and the **title only** — the subtitle was removed by the redundant-copy sweep (D14).
- **R2** — A primary `+ Add room` button renders in the header's action slot, top-right, at every breakpoint (D2). It opens the shared add-room dialog (R24).
- **R3** — The old in-content `Rooms` heading + subtitle block ("Edit each room's price, status, and photos…") is no longer rendered on this page.
- **R4** — Loading the property keeps today's behaviour (`Spinner`, `ErrorState`); a missing property keeps rendering `ErrorState "Property not found."`.

**Stat cards**

- **R5** — Four stat cards render in a row (2-up on tablet, 1-up on phone) with the labels/values of §4.2 (D6, D11) and the white/bordered/large-number look (D23).
- **R6** — The values are derived from the rooms array, never from a second query, and are **stable** under search/filter (D25).
- **R7** — `Tenants / capacity` renders as `occupied/capacity` (e.g. `1/400`). With zero capacity the value renders `0/0` and never crashes (§9).
- **R8** — The four cards render even when the property has no rooms (all zeroes), above the empty state (D21).

**Toolbar**

- **R9** — Four filter pills (`All`, `Available`, `Occupied`, `Maintenance`) render with counts; `All` is the default and shows the total (D7).
- **R10** — Selecting a pill filters the grid by `room.status` **only** (D24). The active pill is visually distinct (solid `primary`), and every pill is a real button exposing `aria-pressed`.
- **R11** — Pill counts are recomputed against the current search text (D25) but `Maintenance 0` is still rendered (D7).
- **R12** — The search input filters the grid client-side on `room_number` only (D13), case-insensitively and substring-matched, with a visible clear affordance.
- **R13** — The sort select offers exactly `Room number` (default), `Rent`, `Slots free`, `Tenants / capacity` with the directions in D33, and applies immediately (D3).
- **R14** — Room-number ordering is natural/numeric-aware and case-insensitive (D26); every other sort falls back to it as a tiebreaker.
- **R15** — Filters, search and sort are component state only (D28); no URL params are added.

**Grid and cards**

- **R16** — Every room renders one card in a 4 / 2 / 1 column responsive grid; a single card keeps its column width (D16).
- **R17** — The card shows, in order: thumbnail (or placeholder), `room_number` verbatim, `StatusBadge`, `<Type> room`, `₱{price} /month`, the occupancy bar, `N/M slots occupied`, then `Edit room` + trash (D34, §4.1).
- **R18** — The thumbnail uses `cover_photo`; with no photos it renders a placeholder tile (room `photo`/`buildingOffice` icon on `bg-subtle`) so no card shows a broken image (D8).
- **R19** — The bar fill is `occupied / capacity`, clamped to 0…1, with `role="progressbar"` (or an equivalent accessible name carrying the same numbers).
- **R20** — The slot line reads `N/M slots occupied` and handles the 1-slot case grammatically (`1/1 slot occupied`).
- **R21** — `Edit room` links to `/landlord/listings/rooms/$id/edit?propertyId={id}` — the existing route and param — and is a real link styled as the app's outline button (D27).
- **R22** — The trash button is icon-only, `aria-label`led with the room number, styled `dangerGhost`, and calls the delete mutation **only after** the `ConfirmDialog` is confirmed (D5).
- **R23** — The card body is otherwise inert: no stretched link, no click handler (D27).
- **R24** — Room colours use existing tokens only — `primary`/`mint` for the bar, `success`/`warning`/neutral tints for pills, no new palette values (D35).

**Add-room dialog (shared, D17/D29–D31)**

- **R25** — The dialog keeps today's five inputs and validation (room number required, `private|shared|dorm` type, monthly rent required, optional deposit, capacity) and the same success/error handling + toast.
- **R26** — It adds **one optional cover photo** input that accepts a single image, validates size/type the way `RoomFormFields` does (jpg/png/webp, ≤5 MB), and shows the picked file's name with a remove control.
- **R27** — On submit it creates the room, then uploads the picked file with `uploadRoomPhotos(token, createdRoom.id, [file])` — the create-listing flow's order (D30).
- **R28** — If creation succeeds and the upload fails, the modal still closes with a success toast for the room **and** a warning that the photo did not upload (pointing at `Edit room`), and the grid is invalidated either way.
- **R29** — A duplicate room number (`409`) or a validation error (`400`) keeps the dialog open with the API's message shown, exactly as today.
- **R30** — On success the grid is invalidated (`['landlord-rooms', propertyId]` and `['landlord-properties']`, as today) so stats, pills and cards all update together.

**States**

- **R31** — While the rooms query is loading, a **skeleton card grid** (the existing `Skeleton` primitive, card-shaped) renders instead of a bare spinner (D21).
- **R32** — A property with no rooms renders `EmptyState` (e.g. title *"No rooms yet"*, description about adding the first room, action = the add-room button) plus the four zeroed stat cards (R8).
- **R33** — A search/filter that matches nothing renders a quiet *"No rooms match …"* line with a **Clear filters** action; the toolbar and stat cards stay visible.
- **R34** — A rooms query error renders the existing `ErrorState` with a retry path (today's `ErrorState` message behaviour, optionally with the `refetch` action).
- **R35** — Deleting the last room moves the page from the grid to the empty state without a reload.

---

## 7. Data flow and derived values

```
getRooms(token, propertyId) → data.rooms[]
   ├─ stats:        length · count(status==='occupied') · count(status==='available') · sum(occupied)/sum(capacity)
   ├─ searchHits:   rooms whose room_number includes the trimmed, lowercased query
   ├─ pillCounts:   status counts over searchHits (D25)
   ├─ visible:      searchHits filtered by the active pill, then sorted by the active sort
   └─ grid:         <RoomCard> per visible room   (no paging — D4)
```

The page's existing `['landlord-property', propertyId]` query keeps supplying the header name; the grid uses `['landlord-rooms', propertyId]` (the same key `LandlordRoomList` and the room edit page use), so opening the page then navigating to a room edit page is instant from cache (and vice versa).

---

## 8. Accessibility and interaction contract

- **Pills** are `<button type="button">` with `aria-pressed`; the group is wrapped in a labelled container (`aria-label="Filter rooms by status"`) so a screen reader announces the set. Colour is never the only signal — the active pill also carries weight/contrast.
- **Search** has a real `<label>`-equivalent (`aria-label="Search rooms"`), `type="search"`, and a clear button `aria-label="Clear search"`.
- **Sort** is a native `<select>` with an `aria-label` — no custom listbox, so keyboard and mobile behaviour come for free.
- **Cards** are `<li>` items in a `<ul>`; each card's status pill carries text (never a bare dot); the trash button is labelled with the room number so a screen reader can tell twenty identical buttons apart.
- **Bar** is `role="progressbar"` with `aria-valuenow`/`aria-valuemin`/`aria-valuemax` (or `aria-label` carrying "1 of 20 slots occupied").
- **Hit targets:** the `Edit room` link and the trash button are ≥44px in their smaller dimension at `sm` size (the trash button gets `h-9 w-9` minimum plus its own padding, matching the "real controls" rule).
- **Focus:** visible `focus-visible:ring` on pills, search, select, card links and the trash button; the modal keeps its existing focus trap/restore (Modal handles it).
- **Motion:** no new animation beyond the existing button press scale, `transition-colors` on pills, and the shared `Modal` spring; all reduced-motion respecting (no new transitions are introduced).
- **Empty/loading copy** is real text, not decorative imagery; the skeleton grid is `aria-hidden` with a single `aria-busy`/`role="status"` announcement on the grid container.

---

## 9. Edge cases

| Case | Expected |
| --- | --- |
| Property with 0 rooms | Four zeroed stat cards + `EmptyState` with the add action (R8/R32). No grid, no toolbar counts beyond `All 0`. |
| Single room | One card at its natural column width in a 4-column grid (D16) — top-left aligned, not stretched. |
| `room.status === 'maintenance'` | Maintenance pill on the card (neutral tint) and a `Maintenance` filter pill; **not** counted in `Available rooms` (D7/D15). |
| `occupied > 0` but `status === 'available'` | Card stays under the **Available** pill and shows `1/20 slots occupied` — the mismatch is visible, not hidden (D24). |
| `occupied === capacity` but `status === 'available'` | Card shows a full bar and `20/20 slots occupied`; pill still says Available (status is the source of truth, D24). |
| `capacity === 0` (legacy row) | Bar renders empty, slot line `0/0 slots occupied`, no division by zero; `Tenants / capacity` stat stays `0/0` (R7). |
| `occupied > capacity` | Ratios clamp to 1 (full bar); the API already clamps `free_slots` at 0. |
| No `cover_photo` and no `photos` | Placeholder tile; card height is unchanged (R18). |
| `room_type === null` / unknown | `roomTypeLabel` falls back to `Room` (existing behaviour) — the card must not print "null room". |
| Long `room_number` (e.g. `Room 12 - Annex B`) | Title wraps to 2 lines (`line-clamp-2`) or ellipsizes; the pill keeps its position; no horizontal overflow. |
| Rent ≥ ₱100,000 | `formatPeso` output still fits; card text does not overflow the column. |
| Max rooms per listing (30) | Grid renders all 30 (no paging, D4); the page scrolls, no nested scroller. |
| Search matches nothing | "No rooms match …" + Clear filters, toolbar intact (R33). |
| Filter + search + sort combined | All three compose (search → status filter → sort); clearing the search restores the previous pill's set. |
| Delete fails | The `ConfirmDialog` closes, the error surfaces via the existing error/toast path, the room stays in the grid. |
| Delete the last room | Empty state renders without a reload (R35). |
| Add a duplicate room number | Dialog stays open, `409` message shown (R29). |
| Photo upload fails after create | Room exists, grid refreshed, success + warning toasts (R28). |
| Add dialog without a photo | Room is created with no photos; the card shows the placeholder tile on next render. |
| Unverified landlord | Create/upload are not gated by `requireVerifiedLandlordWrite` (§2.2) — the flow behaves as it does today. |
| Slow rooms query | Skeleton grid, no layout shift when data lands (R31). |
| Property 404 / access denied | Today's `ErrorState` path (R4). |

---

## 10. Verification plan (D18)

**Commands, each reported honestly:**

```
bun run web:typecheck
bun run web:build
bun run web:test          # existing 19 files + the new one
bun run cf:api:typecheck  # nothing on the API side should change; cheap insurance
bun run cf:api:test       # unchanged, expected green; run because it is fast
```

**New test — `apps/web/test/rooms-grid.test.tsx`** (source contracts + pure helpers, matching `properties-card-layout.test.tsx`):

1. Helper tests: the four stat rollups (including a maintenance room not counting as available), the occupancy ratio string (`1/400`, `0/0`), the per-card slot label (`1/20 slots occupied`, `1/1 slot occupied`), the bar ratio clamping (0, 0.5, >1), and the natural comparator (`Room 2` before `Room 10`, `A2` before `A10`, case-insensitive).
2. Filter/search predicate tests: status-only classification (an `available` room with tenants stays Available), case-insensitive substring search on `room_number`, and the "no matches" outcome.
3. Source contract: `routes/landlord/properties/$id/rooms.tsx` imports `PropertyRoomsGrid`, no longer imports `LandlordRoomList`, and no longer contains the old subtitle.
4. Source contract: `PropertyRoomsGrid.tsx` contains the four stat labels, the four pill labels, the search/sort controls, `xl:grid-cols-4`, and does not contain `Load more` or `Showing`.
5. Source contract: `StatusBadge.tsx` contains the new `available` / `occupied` / `maintenance` tones.
6. Source contract: `LandlordRoomList.tsx` no longer declares its own `<Modal` markup (it renders the shared room form dialog) while still containing `room.free_slots`, `roomTypeLabel` and its delete confirm — i.e. the existing `create-listing-rooms` expectations survive.

**Manual walkthrough** (dev server + seeded `Onda Boarding House` data, both roles available):

| Check | Where |
| --- | --- |
| Header: breadcrumb, title, picture subtitle, `+ Add room` top-right | `/landlord/properties/7/rooms` at 1440px |
| Stat cards match the grid: totals, occupied/available counts, `Tenants / capacity` = tenants/capacity | 1440px, cross-checked against the API payload |
| Pills filter correctly; counts update as the search text changes; the active pill is unmistakable | 1440px |
| Search by room number (e.g. `3` → Room 3 and Room 13), clear control resets | 1440px |
| Sort by each of the four options; `Room 2` precedes `Room 10`; changing sort does not lose the filter | 1440px |
| Card anatomy: thumbnail/placeholder, pill, type line, price, bar fill matches the slot line, `Edit room`, trash | 1440px |
| `Edit room` lands on the room edit page with the right room and `propertyId` | 1440px |
| Trash opens the confirm; cancelling leaves the room; (destructive confirm exercised on a scratch property only) | 1440px |
| Add room: five fields + cover photo; duplicate number shows the 409 message; a new room appears with correct stats | 1440px |
| Add room without a photo → placeholder tile | 1440px |
| Grid at 2 and 1 columns; toolbar stacks; pills wrap; no horizontal overflow | 390px and ~800px |
| Keyboard-only pass: Tab order pills → search → sort → each card's link → trash; Enter activates; Escape closes the dialog | 1440px |
| Loading skeletons and the zero-room empty state (scratch property with rooms deleted) | both widths |
| Regression: `/landlord/listings/$id/edit` still shows the compact room list with a working add dialog | 1440px |
| Regression: the boarders page's room picker still lists rooms | 1440px |

**Not planned:** any API test addition (no API change), and any data migration.

---

## 11. Open questions and agent defaults

- **Q1 — Photo input vs "one cover photo" (D29 vs D31).** The owner asked for "the same functions and inputs as when creating a room inside property creation" **and** "one cover photo only". `RoomFormFields` is a *multi*-photo input (`MAX_ROOM_PHOTOS = 4`, `RECOMMENDED_ROOM_PHOTOS = 2`). This spec follows the explicit **one cover photo** for the dialog while reusing the *upload machinery* (`uploadRoomPhotos`, the same accept/size rules). If review prefers literal input reuse, swapping the single-file input for the multi-file one is a contained change (upload the first file as cover, ignore/quarantine the rest, or lift `MAX_ROOM_PHOTOS` by following the create-listing flow).
- **Q2 — Occupied pill tone.** `occupied` → `warning-tint` (amber/peach, matching the screenshot) is an **(agent default)**. `info-tint` is the alternative if review feels amber reads as "a problem" for a room that is simply full.
- **Q3 — Trash icon.** No `trash` asset and no `trash` key in `Icon` (§2.3), so the spec assumes an inline SVG inside the button. The alternative is adding `public/assets/svg/trash.svg` + an `Icon` key, which would let every future delete affordance share it.
- **Q4 — `Modal`'s invisible close icon.** The dialog's close button uses `Icon name="x"` and the map has no `x` entry (it has `close`), so the glyph renders empty today. Not required by this request, but this spec touches the dialog's owner; a one-line `x: 'close.svg'` (or switching the call site) is a cheap drive-by fix that should be verified rather than assumed.
- **Q5 — Bar semantics.** D12 reads the bar as *occupied* share (fills as the room fills). The screenshot's bar looks filled even on nearly-empty rooms, so if review prefers "free share" the only change is `1 - occupied/capacity`.
- **Q6 — Stat card `Tenants / capacity` vs a slot-based `Available rooms`.** `Available rooms` counts *rooms*, `Tenants / capacity` counts *slots* — deliberately two different units on one row. If that reads as confusing, the alternatives are labelling the fourth card `Slots occupied` or adding a `/label` suffix to each card's number. **(Resolved 2026-10-10: the card's label was made explicit as `Tenants / capacity` on request.)**
- **Q7 — No paging at 30 rooms.** A listing caps at 30 rooms (`MAX_ROOMS_PER_LISTING`), but a seeded property could hold more. With paging dropped (D4) the page renders everything; if a property ever exceeds ~50 rooms, a "load more" can be reintroduced without changing the card or toolbar design.
- **Q8 — Header trigger ownership.** §5's structural note: either the page owns the dialog's open state and passes `action` down, or the grid renders the header button. Pure implementation shape, flagged so it is decided once rather than half-and-half.
- **Q9 — `Spinner` for the property fetch.** The rooms grid gets skeletons (R31) but the page's separate `getProperty` fetch for the header still shows the existing `Spinner`. A skeleton header is possible but not requested.
- **Q10 — Maintenance filter value.** `All / Available / Occupied / Maintenance` follows "its own pill and filter" (D7). If a property has no maintenance rooms the pill reads `Maintenance 0` and yields an empty grid plus the "no rooms match" line — arguably noise; hiding zero-count pills is the one-line alternative.

---

## 12. Out of scope

- **Any API, repository, or migration change.** The existing `GET /api/landlord/rooms` payload covers every number on this page (§2.2).
- **`LandlordRoomList`'s visual design elsewhere.** The listings edit page and the boarders page keep the compact row list; only its add-room dialog is lifted out (D17).
- **The property card list, property detail page, listing edit page, tenant-facing browse pages and the admin console.**
- **Paging, infinite scroll, bulk actions on rooms, drag reordering.**
- **Boarder names/avatars on room cards** (explicitly declined, D19) and any new boarder data fetch.
- **Editing room details on this page** (rent, capacity, status, description) — that remains the room edit route, reached through `Edit room`.
- **Adding new colour tokens, fonts or image assets** (D35); the screenshot is a layout reference.
- **New sorting/filtering dimensions** beyond the four sorts and four status pills.
- **Adopting `PropertyOverview`'s `StatTile` as a shared primitive** (D23 keeps it private).

---

## 13. What shipped (2026-10-09)

**New files**

| File | Role |
| ---- | ---- |
| `apps/web/src/components/rooms/RoomCard.tsx` | The card, its grid and skeleton grid, and every pure helper the page and the tests share (`rollupRoomStats`, `slotsLabel`, `slotRatio`, `occupancyValue`, `naturalRoomNumber`, `matchesRoomSearch`, `roomMatchesFilter`, `countRoomsByFilter`, `sortRooms`, `ROOM_FILTERS`, `ROOM_SORT_OPTIONS`). |
| `apps/web/src/components/rooms/PropertyRoomsGrid.tsx` | The page-level block: stat cards, the filter/search/sort toolbar, the responsive grid, skeleton/empty/no-match states, the delete mutation + confirm, toasts, and the header-driven add dialog. |
| `apps/web/src/components/rooms/RoomFormModal.tsx` | The shared add-room dialog (D17): the five original fields plus an optional cover photo, creating the room then uploading the photo, with `coverPhotoError` and the size/type rules. |
| `apps/web/test/rooms-grid.test.tsx` | 31 tests: helper units, source contracts, and a behavioural pass that renders the real `RoomCard` / `PropertyRoomsGrid` under `@testing-library/react` (stats, pills, search, sort, delete confirm, empty state). |

**Changed:** `routes/landlord/properties/$id/rooms.tsx` (header action + grid, picture subtitle), `components/rooms/LandlordRoomList.tsx`
(renders `RoomFormModal`, keeps its rows/delete/toasts), `components/ui/StatusBadge.tsx` (three room tones),
`test/properties-card-layout.test.tsx` and `test/create-listing-rooms.test.tsx` (assertions that named the old page structure
now name the new one — the room-type checks were widened to include the shared dialog rather than dropped).

**Untouched, as planned:** `workers/api/**` (no endpoint, query or migration change — the existing `GET /api/landlord/rooms`
payload already carried every number), `PropertyOverview`'s `StatTile`, `PropertyCard`/`LandlordPropertyCards`,
`PropertiesSection`, `DataTable`, and the room edit route.

### 13.1 Deviations

1. **`LandlordRoomList`'s dialog gains the cover-photo field.** D17 asked for one shared add flow; sharing it means the
   listing-edit page's dialog offers the same optional photo. Its create/delete behaviour, copy and rows are unchanged.
2. **`create-listing-rooms.test.tsx` was widened, not just updated.** The `private/shared/dorm` option assertion now also
   checks `RoomFormModal.tsx` (three sources instead of two) — the option markup moved with the extraction, so the test
   follows the vocabulary rather than losing it.

### 13.2 Verification actually run

| Check | Command / method | Result |
| ----- | ---------------- | ------ |
| Web typecheck | `bun run web:typecheck` | **pass** (exit 0) |
| Web tests | `bun run web:test` | **228 pass / 0 fail** (21 files; +31 new) |
| Web build | `bun run web:build` | **pass** (exit 0) |
| API typecheck | `bun run cf:api:typecheck` | **pass** (exit 0) |
| API tests | `bun run cf:api:test` | **273 pass / 0 fail** (27 files) |
| Route runtime smoke | dev server on :3002, `GET /landlord/properties/7/rooms` | **200**, route module evaluated under Vite SSR, no errors in the server log |
| Card behaviour | happy-dom render of the real `RoomCard` | Room number, type line, status pill (warning tint for occupied), rent, `2/20 slots occupied`, `progressbar` with `aria-valuenow`/`aria-valuemax` and a 10%/100% width, cover photo vs placeholder tile, `Edit room` link, trash callback |
| Grid behaviour | happy-dom render of the real `PropertyRoomsGrid` | Stats `3 / 1 / 2 / 21-60`; pills filter (`Occupied` → Room 2, `Available` → Rooms 1 & 10, `Maintenance` → empty with *Clear filters*); search `1` → Rooms 1 & 10 with pill counts following the search while the stat cards stay whole-property; sorts reorder (slots / rent / occupancy); trash opens the confirm with the room named, cancel keeps the grid; empty property shows `EmptyState` + zeroed stats + the add action |

**Not verified, and why**

1. **The manual browser walkthrough (spec §10).** No browser-automation tool is available in this environment, and the page
   needs a landlord session held in `localStorage`, which a `curl` request cannot present. The behavioural render tests above
   cover the same assertions at the component level, but nobody has yet looked at the page at 1440px and 390px.
2. **The rendered `href` of `Edit room` in-process.** Several test files each mount their own minimal router tree in one Bun
   process and happy-dom does not reliably interpolate `$id`, so the behavioural test asserts the target path only; the route,
   the `id` param and the `propertyId` search value are locked in by source contract, and the link uses the exact shape the
   existing `LandlordRoomList` and room cards already ship.
3. **The add-room submit path (create → upload) under test.** `RoomFormModal`'s create/upload sequence is asserted by source
   contract (create before upload) rather than by a mocked mutation, so a real submit has not been exercised end to end.
