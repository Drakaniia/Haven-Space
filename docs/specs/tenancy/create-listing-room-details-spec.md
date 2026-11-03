# Spec — Per-Room Detail Capture on Create Listing (inline room forms, live capacity)

**Status:** **Implemented and verified** (2026-10-08) — 257 API tests pass (26 files), 149 web tests pass
(18 files), both typechecks clean, `web:build` clean, migration `0019` applied to local D1, and the create →
landlord → tenant flow walked end-to-end against the local API. See §11 for what shipped and what did not.
**Short name:** `create-listing-room-details`
**Date:** 2026-10-08
**Owner request (verbatim):**

> http://localhost:3000/landlord/listings/create when creating a listing , there should me a popup box
> dependes on the room inputted, if its 5 so there will be 5 box, and in that box it can input how many
> tenant capacity type of room, if its shared, private, can input 2 or 4 photos of room , etcc., remove the
> minimum stay, so that when a tenant view the property it can see the rooms with picture and current
> capacity of that room

**Relationship to existing work:**

- Follows the Apple-UI restructure specs (`landlord-apple-ui-restructure-spec.md` lists
  `landlord/listings/create.tsx` as **inherited**, i.e. untouched) and the shared `Modal` upgrade in
  `modal-desktop-width-spec.md`. This spec deliberately **does not use a modal** (see D1) — the final
  interaction is inline, so the modal sizing work is unaffected.
- Supersedes the property-level "Number of rooms + one Capacity per room" model with a per-room model.
  The room-level fields it collects (rent, deposit, size, description, status, photos) already exist on the
  **room edit page**; this spec moves the same data to the front of the funnel so tenants never see a
  property whose rooms are half-described.
- The `Minimum stay` removal is intentionally **create-page only** (D4), so nothing else in the app changes.
- Room-type vocabulary changes to `Private / Shared / Dorm` (D15), which touches displays beyond the create
  page; the old value `single` is normalized in a migration, not dual-read.

---

## 1. Interview decisions (as answered by the requestor)

Answers were collected in five rounds of `ask_user`. Where a later answer supersedes an earlier one, the row
says so explicitly.

| #   | Topic                         | Decision                                                                                                                                                                                                                                                                                                                                                               |
| --- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Room boxes: final interaction | **Always-open inline room forms.** Typing `5` in **Number of rooms** renders five room forms directly below the field. There is **no popup/modal**. This supersedes the Round-1 "guided sequence of N modals" answer, which the requestor replaced in the Round-4/5 clarification ("popup box below the Number of rooms… 5 box will popup… for better UI experience"). |
| D2  | Tenant-facing capacity        | **Live remaining slots** — e.g. "2 of 4 slots free", computed from a tracked occupied count. Not a static max-occupancy number alone.                                                                                                                                                                                                                                  |
| D3  | Photos per room               | **Optional, maximum 4, 2 recommended.** Nothing blocks saving; leaving a room with fewer than 2 photos shows a soft, non-blocking warning.                                                                                                                                                                                                                             |
| D4  | "Remove the minimum stay"     | **Create form only.** The dropdown disappears from `/landlord/listings/create`. The edit page keeps it and the tenant-facing "Minimum Stay" card keeps rendering.                                                                                                                                                                                                      |
| D5  | Per-room fields in each box   | **All of:** tenant capacity, room type, photos (0–4), monthly rent, deposit, room name/number, size (m²), description, status.                                                                                                                                                                                                                                         |
| D6  | Occupancy source              | **A landlord-editable `occupied` number per room** (new D1 column).                                                                                                                                                                                                                                                                                                    |
| D7  | Shared rooms                  | **Allow multiple boarders up to capacity.** A shared room accepts bookings until `occupied == capacity`; a private room (`capacity = 1`) behaves like today.                                                                                                                                                                                                           |
| D8  | Occupancy ↔ bookings sync     | **Auto delta from bookings + manual correction.** Confirming a booking adds one occupant, an approved leave removes one; a landlord's manual edit persists until the next booking event applies its delta.                                                                                                                                                             |
| D9  | Property fields               | **Number of rooms drives the box count; the rest are prefilled defaults.** Property monthly rent / deposit / capacity stay and prefill every room; per-room values override.                                                                                                                                                                                           |
| D10 | Headline price                | **Property price field stays as the default, but the tenant-facing headline price is the cheapest room price.**                                                                                                                                                                                                                                                        |
| D11 | Photo upload timing           | **Hold files in memory, upload after the listing exists.** Files are kept in browser memory through the form; after `POST /api/landlord/listings` succeeds, each room's photos are uploaded to that room's photo endpoint.                                                                                                                                             |
| D12 | Reducing the room count       | **Warn, then discard the extras.** Shrinking `5 → 3` after filling shows a confirm naming the rooms that will be dropped; the remaining rooms keep their data.                                                                                                                                                                                                         |
| D13 | Validation rules              | **All of:** `occupied ≤ capacity`; room name required **and unique within the listing**; **max 30 rooms per create**; capacity in **1–10**; soft warning under 2 photos; **every room box must be valid before "Create listing" enables** (the inline equivalent of "all rooms visited").                                                                              |
| D14 | Room type vocabulary          | **Three options: Private / Shared / Dorm** (DB values `private` / `shared` / `dorm`; existing `single` rows migrate to `private`).                                                                                                                                                                                                                                     |
| D15 | Dorm semantics                | **Just a third label.** Same fields and same capacity rules as the others; no special validation, no separate booking behavior.                                                                                                                                                                                                                                        |
| D16 | Edit-listing parity           | **Create now, edit as a follow-up.** The edit page keeps today's `LandlordRoomList` + "Add room" modal; a follow-up spec will bring the boxed form there.                                                                                                                                                                                                              |
| D17 | Tenant surfaces to update     | **All five:** public property detail `/rooms/$id`, `/find-a-room` browse cards, the booking-card "Available Room Types" selector, the landlord's preview of the tenant view, and the admin property inspection surface.                                                                                                                                                |
| D18 | Browse card treatment         | **Keep the card layout, make the numbers real.** Card keeps cover image + price + badges; room/available counts must come from the real room rows (not `propertyRooms` arithmetic).                                                                                                                                                                                    |
| D19 | Min-stay value on create      | **Stop writing it / leave null** so the column default (`''` in `0002_public_listings.sql`) applies.                                                                                                                                                                                                                                                                   |
| D20 | Schema + verification         | **Include the D1 migration** and verify with API tests, web tests, typecheck/build **and** a browser walkthrough of the new form. Migration 0019 needs the requestor's approval before it is applied to remote D1 (see §7.4).                                                                                                                                          |
| D21 | Deliverable                   | **This spec only.** No code changes in this pass.                                                                                                                                                                                                                                                                                                                      |

---

## 2. Current state (verified 2026-10-08, read-only)

### 2.1 The create page

`apps/web/src/routes/landlord/listings/create.tsx` (277 lines) is a single card form built from the shared
primitives (`Card`, `Field`, `TextInput`, `SelectInput`, `TextArea`, `Button`, `PageHeader`,
`VerificationNotice`). Its state is one flat object:

```ts
const [form, setForm] = useState({
  propertyName,
  propertyType,
  genderPreference,
  propertyDescription,
  propertyPrice,
  propertyDeposit,
  propertyRooms: '1',
  propertyCapacity: '1',
  propertyAddress,
  propertyCity,
  propertyProvince,
  propertyMinStay: '1-month',
});
```

plus `amenities: string[]`. Submit calls `createListing(token, {...form, propertyPrice: Number(...),
propertyDeposit: Number(...), propertyRooms: Number(...), propertyCapacity: Number(...), amenities})`, then
navigates to `/landlord/listings`. There is intentionally **no photo input on create today** — photos are
only uploaded from the edit page (`uploadPropertyPhotos`) and the room edit page (`uploadRoomPhotos`).
`needsVerification` gates the whole form (BUG-09).

The room-count and capacity fields live in one `grid grid-cols-3`, with **Minimum stay** as the third column
(lines ~194–211). Removing Minimum stay (D4) leaves that row two columns wide.

### 2.2 The create API and what it currently accepts

`POST /api/landlord/listings` → `handleCreateListing` in `workers/api/src/routes/landlord/listings.ts`:

- Required-field gate: `propertyName, propertyType, genderPreference, propertyDescription, propertyPrice,
propertyDeposit, propertyRooms, propertyCapacity, propertyAddress, propertyCity, propertyProvince`.
- `listingRooms(body)` (lines ~120–152) **already accepts a `rooms` array**, but only reads
  `{ name, capacity, roomType }` and derives `title`/`roomNumber` from `name`. When no array is sent it
  generates `propertyRooms` rooms from `propertyRooms` / `propertyCapacity` and derives
  `roomType = capacity === 1 ? 'single' : 'shared'`.
- Each room is created via `createLandlordRoom(db, { propertyId, landlordId, title, price: propertyPrice,
description: '', roomNumber, roomType, capacity, deposit: propertyDeposit })` — i.e. **no per-room
  price/deposit/size/description/status and no photos**.
- `createLandlordProperty` is called with `minStay: stringValue(body, 'propertyMinStay', '1 month') || '1 month'`
  (line ~554 on the update path mirrors this).
- Response: `{ message, data: { id, title, status, room_ids } }` where `room_ids` is pushed **in creation
  order**.

So the API is ~70% of the way there: a `rooms` array already exists, and `room_ids` already gives the client
the per-room ids needed to upload photos after create (D11). What is missing is the extra per-room fields,
the room-type vocabulary, occupancy, and photos.

### 2.3 The room data model

`workers/api/migrations/0003_public_room_listings.sql`:

```sql
CREATE TABLE IF NOT EXISTS rooms (
  id, property_id, landlord_id,
  room_number TEXT, room_type TEXT, title TEXT, description TEXT,
  price REAL NOT NULL DEFAULT 0, deposit REAL NOT NULL DEFAULT 0,
  capacity INTEGER NOT NULL DEFAULT 1, size REAL,
  status TEXT NOT NULL DEFAULT 'available',
  created_at, updated_at, deleted_at
);
CREATE TABLE IF NOT EXISTS room_photos (id, room_id, photo_url, is_cover, display_order, created_at);
```

There is **no occupancy column** — only `status` (`available | occupied | maintenance`, validated by
`validRoomStatuses` in `workers/api/src/routes/landlord/rooms.ts`). Room types are **not** validated against
a set anywhere; the only UI vocabulary today is `single | shared`
(`LandlordRoomList.tsx`, `listings/rooms/$id/edit.tsx`).

Latest migration on disk is `0018_landlord_verification_documents.sql` → **the new migration is `0019`**.

### 2.4 Occupancy today, and why it caps at one

- Apply guard: `workers/api/src/routes/applications.ts:163` rejects with 400
  `"This room is already occupied and can no longer be applied to"` whenever `rooms.status = 'occupied'`.
- Confirm booking: `applications.ts:275` → `occupyRoom()` (`repositories/applications.ts:203`) sets the whole
  room to `'occupied'`.
- Leave approved: `repositories/tenancy.ts:478` → `freeRoom()` sets it back to `'available'`.

This is a **one-booking-per-room** model: the second boarder is rejected even for a 4-person room. D7
requires it to become capacity-aware.

### 2.5 Tenant-facing surfaces that render rooms today

| Surface                      | File                                             | What it shows per room today                                                                                                              |
| ---------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Property detail grid         | `components/rooms/RoomDetailView.tsx` (~640–700) | `room.images[0]` photo (placeholder fallback), type, price, `capacity` persons, size, deposit, description                                |
| Room-type selector (booking) | `RoomDetailView.tsx` (~500–560)                  | `room.capacity > 1 ? 'users' : 'user'` icon, type, price                                                                                  |
| "Available Room Types" facts | `RoomDetailView.tsx` (~364–371)                  | Room Types / Availability / **Minimum Stay** quick cards                                                                                  |
| Header availability          | `RoomDetailView.tsx` (~350)                      | "`X` of `Y` rooms available"                                                                                                              |
| Browse cards                 | `components/rooms/FindARoomContent.tsx`          | Cover image + price + badges; cards link to `/rooms/$id` (line ~226)                                                                      |
| Landlord preview             | none dedicated                                   | Landlords see the public `/rooms/$id` page (no link from the landlord listings screens today)                                             |
| Admin property view          | none                                             | `components/admin/sections/PropertiesSection.tsx` has **no room list**; only `PropertyAccessTab` mentions rooms as a removal-impact count |

Public read paths: `workers/api/src/routes/rooms.ts` → `formatRoom` (public list), `formatDetailRoom`
(detail), `formatPublicProperty` (sends `capacity: ''`, `minStay: ''`) and `formatListingDetail` (sends
`minStay: escapeHtml(property.min_stay)`). `RoomRow` in `repositories/listings.ts` already carries
`capacity`, `room_type`, `status`, `room_price`, `size`, `deposit`, `description`.

---

## 3. Target behavior

### 3.1 The create form, top to bottom after this change

```
Property name
Property type            Gender preference
Description
Monthly rent (₱)         Deposit (₱)            ← remains the default for every room (D9)
Number of rooms  [ 3 ]   Capacity per room [ 4 ]
  ┌─────────────────────────────────────────────────────────────┐
  │ Room 1                        [ Private ▾ ]  Capacity [ 1 ] │   ← inline, always open (D1)
  │ Name/number [Room 1]  Rent [₱3000]  Deposit [₱3000]  Size [18]│
  │ Occupied now: 0 of 1 slot free                               │
  │ Description […………………………………]        Status [ Available ▾ ]   │
  │ Photos  [＋ Add photos]  (0 of 4 · 2 recommended)   ▢ ▢ ▢ ▢  │
  └─────────────────────────────────────────────────────────────┘
  ┌─────────────────────────────────────────────────────────────┐
  │ Room 2                        [ Shared  ▾ ]  Capacity [ 4 ] │
  │ …                                                            │
  └─────────────────────────────────────────────────────────────┘
  ┌─────────────────────────────────────────────────────────────┐
  │ Room 3                        [ Dorm    ▾ ]  Capacity [ 6 ] │
  │ …                                                            │
  └─────────────────────────────────────────────────────────────┘
Street address
City                     Province
Amenities (chips)
[ Create listing ]   ← disabled until every room box is valid (D13)
```

- Changing **Number of rooms** adds boxes to the end (seeded from the property defaults) or prompts before
  removing them (D12).
- Each box header summarises the room (`Room 2 · Shared · 4 persons · 4 slots free · 2 photos`) so a landlord
  can see the whole listing at a glance.
- The boxes are plain page content: `Card`-style surfaces built from the existing `Field` / `TextInput` /
  `SelectInput` / `TextArea` / `Button` primitives, stacked in a `<section>` below the number field. No
  `Modal`, no portal, no focus trap.

### 3.2 Per-room field contract

| Field        | Control                          | Default (D9)                                                                                           | Rules (D13)                                                              |
| ------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Name/number  | `TextInput`                      | `Room {index + 1}`                                                                                     | required; unique within the listing (case-insensitive)                   |
| Room type    | `SelectInput`                    | `Shared` for the first room, seeded from property capacity (`capacity === 1 → Private`, else `Shared`) | one of `Private` / `Shared` / `Dorm` (D14/D15)                           |
| Capacity     | `TextInput type=number`          | property **Capacity per room**                                                                         | 1–10, required                                                           |
| Monthly rent | `TextInput type=number`          | property **Monthly rent**                                                                              | required, ≥ 0                                                            |
| Deposit      | `TextInput type=number`          | property **Deposit**                                                                                   | ≥ 0                                                                      |
| Size (m²)    | `TextInput type=number`          | empty                                                                                                  | optional                                                                 |
| Description  | `TextArea`                       | empty                                                                                                  | optional                                                                 |
| Status       | `SelectInput`                    | `Available`                                                                                            | `Available` / `Occupied` / `Maintenance`                                 |
| Occupied now | read-only summary in the box     | `0`                                                                                                    | new rooms start empty; correction lives on the room edit page (see §9.1) |
| Photos       | file input (`image/*`, multiple) | none                                                                                                   | 0–4; jpg/jpeg/png/webp; ≤ 5 MB each (existing limits); soft warn under 2 |

Rent/deposit/size reuse the existing per-room column names (`price`, `deposit`, `size`).

---

## 4. Requirements

### R1 — Number of rooms renders N inline room forms (D1, D9)

A `<section aria-label="Rooms">` below the **Number of rooms** field renders exactly `propertyRooms` room
boxes, in order, with no modal. `propertyRooms` is clamped to **1–30** (D13) both in the input (`min={1}
max={30}`) and in the renderer, so a typed `500` cannot build 500 boxes. Each box is keyed by a stable room
id (see R2) rather than by index, so editing a middle field cannot shuffle values between boxes.

### R2 — Room draft state survives count changes (D12)

`rooms` is a separate state array (`RoomDraft[]`), independent of the property fields:

```ts
interface RoomDraft {
  key: string; // crypto.randomUUID() — stable React key
  name: string; // room_number
  type: 'private' | 'shared' | 'dorm';
  capacity: string;
  price: string;
  deposit: string;
  size: string;
  description: string;
  status: 'available' | 'occupied' | 'maintenance';
  photos: File[]; // in-memory only (D11)
}
```

Growing appends drafts seeded from the current property defaults. Shrinking beyond a filled room opens the
shared `ConfirmDialog` naming the rooms to be dropped ("Room 4, Room 5 will be removed"); on confirm the tail
is discarded, the head keeps its data. Nothing is discarded silently.

### R3 — Every room box must be valid before submit (D13)

`Create listing` stays disabled while any room fails validation (plus the existing `needsVerification`
disable). Per-room errors are rendered inside the offending box, reusing the create page's existing
`ErrorState`/inline error style, and the first invalid box is scrolled into view on submit attempt. Covers:
required name, unique name, capacity 1–10, `occupied ≤ capacity` (trivially true on create since occupied is
0, but the rule guards the payload), rent required.

### R4 — Photos are optional, max 4, recommended 2 (D3, D11)

Each box has a multi-file input accepting up to 4 images per room. Picking a 5th is rejected with an inline
message (no file is added). A room with 0–1 photos shows a soft amber hint ("Add at least 2 photos so
boarders know what they're renting") — it never blocks submit, and it is visible in the box summary. Files
are **not** uploaded during the form; they are held in memory and uploaded per room after the listing is
created (R8).

### R5 — Minimum stay is gone from create (D4, D19)

The dropdown is removed from `create.tsx`; the `grid grid-cols-3` row becomes
`grid grid-cols-2`. `propertyMinStay` is removed from the create form state and from the `createListing`
payload entirely, so the API falls back to its column default (D19). The edit page's Minimum stay field and
the tenant-facing "Minimum Stay" quick card are **unchanged**.

### R6 — The create API accepts full per-room payloads (D5)

`POST /api/landlord/listings` gains a first-class `rooms` array:

```jsonc
{
  "propertyName": "…" /* existing property fields, propertyMinStay now omitted */,
  "rooms": [
    {
      "name": "Room 1", // was already supported
      "room_type": "shared", // new: private | shared | dorm
      "capacity": 4,
      "price": 3000,
      "deposit": 3000,
      "size": 18, // optional
      "description": "…", // optional
      "status": "available" // optional, default available
    }
  ]
}
```

- `listingRooms(body)` is extended to read the new fields, and `createLandlordRoom` in
  `repositories/landlord-properties.ts` is extended to persist `size`, `description`, `status`, and the
  per-room `price`/`deposit` (today it is handed the property values).
- **Backward compatibility:** when no `rooms` array is sent, the existing `propertyRooms` /
  `propertyCapacity` generation path is kept (used by `landlord.test.ts` and `e2e-flow.test.ts`), but its
  derived type becomes `capacity === 1 ? 'private' : 'shared'` (D14).
- **Ordering contract:** `data.room_ids[i]` is the id of `rooms[i]` (creation loop order, already true
  today). The client relies on this to attach photos; a test must pin it.
- Validation returns `400 { errors }` for: more than 30 rooms, a non-`private|shared|dorm` type, capacity
  outside 1–10, empty name, duplicate names within the payload, `occupied > capacity`.

### R7 — Room types become private / shared / dorm (D14, D15)

- Migration `0019` normalizes existing rows: `UPDATE rooms SET room_type = 'private' WHERE room_type =
'single'`.
- Server-side validation set `['private','shared','dorm']` is added wherever room types are written
  (`POST/PUT /api/landlord/rooms`, listing create).
- Display sites updated: `LandlordRoomList.tsx` (label + Add-room select), `listings/rooms/$id/edit.tsx`
  select, `RoomDetailView.tsx` (`cleanRoomType`, `roomTypeFilters`), `routes/rooms.ts`
  (`formatRoom`, `formatDetailRoom`, `displayRoomTypes`), and the seeded rows in
  `migrations/0015_seed_sample_listings.sql` (handled by the 0019 UPDATE rather than by editing the seed).
- Capitalization for tenants: `Private` / `Shared` / `Dorm`.

### R8 — Photos upload after the listing exists (D11)

`handleSubmit` becomes:

1. Validate everything (R3); bail out early otherwise.
2. `POST /api/landlord/listings` with the property fields + `rooms` array.
3. From the response, map `room_ids[i]` → draft `i`, and for each draft with photos, `POST
/api/landlord/rooms/{roomId}/photos` with `roomPhotos[]` (the existing endpoint, same 5 MB / jpg-png-webp
   limits).
4. Show progress while uploading ("Creating listing… 2 of 3 rooms"), then navigate to `/landlord/listings`
   with the existing `setPendingToast('success', 'Listing created!')`.

Partial-failure rule: if the listing is created but one room's photos fail, **do not** roll the listing back.
Navigate to the listing edit page with an error toast naming the rooms whose photos need re-uploading
("Listing created, but photos for Room 3 failed — add them from the edit page."). Re-uploading from the room
edit page already works (`uploadRoomPhotos`).

### R9 — Occupancy becomes per-room and capacity-aware (D6, D7, D8)

- Migration `0019` adds `rooms.occupied INTEGER NOT NULL DEFAULT 0` (plus an index only if a query needs it —
  the public reads are per-property).
- Free slots = `MAX(capacity - occupied, 0)`.
- **Apply guard** (`applications.ts:163`) changes from `status === 'occupied'` to
  `status === 'maintenance' || capacity - occupied <= 0`, with a message like
  `"This room is already full and can no longer be applied to"`.
- **Confirm booking** (`applications.ts:275`): `occupied = occupied + 1`, and `status` becomes `'occupied'`
  only when `occupied >= capacity`. Pending applications are unaffected.
- **Leave approved** (`tenancy.ts:478`): `occupied = MAX(occupied - 1, 0)`, and `status` returns to
  `'available'` when `occupied < capacity`.
- **Manual correction** (D8): `PUT /api/landlord/rooms` accepts `occupied`, validated `0 ≤ occupied ≤
capacity` (`400` otherwise); it is stored as-is. Because bookings apply **deltas** rather than recomputing
  from scratch, a manual correction survives until the next booking event changes it — which is exactly the
  D8 behavior. Document this in a comment on the occupancy helpers so it is not "fixed" later.
- `freeRoom`/`occupyRoom` are replaced by a single pair of helpers (e.g. `occupyRoomSlot` / `freeRoomSlot`)
  in `repositories/applications.ts`; deleting a room keeps its rows soft-deleted as today.

### R10 — Tenants see photos and live capacity (D2, D10, D17)

- `formatRoom` (public list) and `formatDetailRoom` (detail) gain `occupied` and `free_slots`, and keep
  `capacity` plus the existing `photos`/`images` arrays (so every room card already has a photo — the
  missing piece today is only that create cannot populate them).
- `formatPublicProperty` / `formatListingDetail` set the headline `price` to the **cheapest room price** when
  rooms exist (D10), falling back to `properties.price` when a property has no priced rooms.
- Tenant UI:
  - Detail grid (`RoomDetailView.tsx`): each room card shows capacity **and** slots free ("2 of 4 slots
    free"), keeping size/deposit/description as-is; a full room shows a `Full` badge and is not selectable
    in the booking-card room-type list.
  - Booking-card selector: keeps the person/user icon, adds "`X` slots left"; full rooms are filtered out of
    the selectable list (mirroring the existing `availableRooms` filter).
  - `/find-a-room` cards: layout unchanged; `availableRooms` / `totalRooms` come from the real room rows, and
    the price shown is the cheapest room price.
  - Landlord preview (D17): the public `/rooms/$id` page is the landlord's preview. If the landlord
    listings/detail screens offer no link to it today (verified: none), add a small "Preview as boarder"
    link on the listing edit page pointing at `/rooms/{id}` — one link, no new page.
  - Admin (D17): `PropertiesSection.tsx` currently has **no room list**. Add a read-only rooms table to the
    admin property detail (name, type, capacity, occupied, slots free, price, status) reading from the same
    payload shape. Flagged in §9.2 because it is new admin UI rather than a tweak.

### R11 — Nothing about the edit page changes in this pass (D16)

`apps/web/src/routes/landlord/listings/$id/edit.tsx`, `LandlordRoomList.tsx` and the room edit page keep
their current behavior (the room edit page does gain the `occupied` field, since that is where the manual
correction lives per D6/D8). Bringing the boxed room form to the edit page is the follow-up spec.

### R12 — Verification (D20)

The implementation is not done until §7's gates pass, including the browser walkthrough.

---

## 5. Files to change (planned)

### 5.1 Frontend

| File                                                           | Change                                                                                                                                                  |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/routes/landlord/listings/create.tsx`             | Room-draft state + inline boxes, remove Minimum stay, per-room validation, photo file handling, post-create photo upload, submit orchestration          |
| `apps/web/src/components/rooms/RoomFormFields.tsx` (**new**)   | The reusable per-room field block (name, type, capacity, rent, deposit, size, description, status, photos) so the follow-up edit-page spec can reuse it |
| `apps/web/src/components/rooms/RoomDraftSummary.tsx` (**new**) | One-line room summary used by the box headers and the shrink confirm                                                                                    |
| `apps/web/src/components/rooms/RoomDetailView.tsx`             | Slots-free copy/badges, full-room filtering in the selector, room-type label mapping                                                                    |
| `apps/web/src/components/rooms/FindARoomContent.tsx`           | Verify counts/prices come from real room rows (D18); no layout change                                                                                   |
| `apps/web/src/components/rooms/LandlordRoomList.tsx`           | `Private`/`Shared`/`Dorm` label + select options; show `occupied` in the room row                                                                       |
| `apps/web/src/routes/landlord/listings/rooms/$id/edit.tsx`     | Room-type options (`private`/`shared`/`dorm`) + new "Occupied now" field (D6)                                                                           |
| `apps/web/src/routes/landlord/listings/$id/edit.tsx`           | Room-type option unchanged (property types are separate), add the "Preview as boarder" link (R10)                                                       |
| `apps/web/src/lib/api/landlord.ts`                             | `uploadRoomPhotos` is reused as-is; types for the new per-room create payload                                                                           |
| `apps/web/src/lib/types.ts`                                    | `RoomSummary.free_slots`, `RoomDetail.occupied`/`free_slots`, room-type union                                                                           |
| `apps/web/src/components/admin/sections/PropertiesSection.tsx` | Read-only per-room table (R10, pending §9.2)                                                                                                            |

### 5.2 Backend

| File                                                                      | Change                                                                                                                                            |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workers/api/migrations/0019_room_occupancy_and_room_types.sql` (**new**) | `ALTER TABLE rooms ADD COLUMN occupied INTEGER NOT NULL DEFAULT 0;` + `UPDATE rooms SET room_type = 'private' WHERE room_type = 'single';`        |
| `workers/api/src/routes/landlord/listings.ts`                             | `listingRooms()` reads the full per-room payload; min-stay no longer written on create; room-type derivation; per-room validation errors          |
| `workers/api/src/repositories/landlord-properties.ts`                     | `createLandlordRoom` accepts `price`, `deposit`, `size`, `description`, `status`                                                                  |
| `workers/api/src/routes/landlord/rooms.ts`                                | `validRoomTypes`, `occupied` on create/update + validation, `occupied` in the formatted room payload                                              |
| `workers/api/src/repositories/landlord-rooms.ts`                          | Row type + insert/update statements carry `occupied`                                                                                              |
| `workers/api/src/repositories/applications.ts`                            | `occupyRoomSlot` / `freeRoomSlot` (delta model), keep the old names as thin wrappers or migrate call sites                                        |
| `workers/api/src/routes/applications.ts`                                  | Capacity-aware apply guard; confirm increments the slot                                                                                           |
| `workers/api/src/repositories/tenancy.ts`                                 | Leave-approved decrements the slot                                                                                                                |
| `workers/api/src/repositories/listings.ts`                                | `RoomRow.occupied`, cheapest-room-price subquery for the list/detail headline price                                                               |
| `workers/api/src/routes/rooms.ts`                                         | `formatRoom` / `formatDetailRoom` expose `occupied` + `free_slots`; `formatPublicProperty` / `formatListingDetail` headline price = cheapest room |

No changes to auth, UploadThing integration, `Modal`, `ConfirmDialog`, or the deploy config.

---

## 6. Edge cases

1. **Typing a huge room count.** `500` is clamped to 30 with an inline hint ("Maximum 30 rooms at a time —
   add more from the edit page"), so the page cannot hang rendering boxes (D13).
2. **Typing `0` or clearing the field.** Clamp to 1 on blur; the field keeps `min={1}`. An empty box list is
   never rendered.
3. **Shrinking below the filled rooms.** Confirm dialog names the rooms to drop (D12). Cancel restores the
   previous count.
4. **Duplicate room names.** Case-insensitive uniqueness inside the listing; the second box shows "A room
   named X already exists" and submit stays disabled. The API returns the same rule as `409`/`400` so the
   client can't be bypassed.
5. **Per-room price left blank.** Falls back to the property monthly rent at build-the-payload time, so the
   field is never sent as `0` by accident. Rent of `0` must be typed explicitly if genuinely free.
6. **Property capacity changed after rooms were seeded.** Existing room boxes keep their own capacity
   (property fields are defaults for **new** boxes only) — otherwise a landlord who tuned room 3 would lose
   it by editing the property default.
7. **Identical room types across all boxes.** Fine: the tenant-side "Room Types" text collapses to
   `Private` / `Shared` / `Dorm` via the existing `displayRoomTypes()` set logic.
8. **Photos larger than 5 MB or wrong type.** Rejected at pick time with the inline message, matching
   `/api/landlord/rooms/:id/photos` which accepts jpg/png/webp (note: the **property** photo endpoint also
   allows gif — the room endpoint does not; the create form follows the room endpoint, since these are room
   photos).
9. **Listing created, photo upload fails.** Per R8: no rollback, navigate to the edit page with an error
   toast naming the affected rooms.
10. **Two rooms, one private with `capacity` 1.** `occupied` can only be 0 or 1; the tenant sees `1 of 1
slots free` / `Full`. Booking behavior for private rooms is unchanged from today (D7 keeps
    one-booking-per-room for `capacity = 1`).
11. **A shared room with 4 slots and 4 confirmed boarders.** The room flips to `status = 'occupied'` and the
    apply endpoint rejects new applications; when one leaves, it flips back to `available` with 1 slot free.
12. **Legacy rows with `room_type = 'single'`.** Normalized by migration 0019; no dual-read path exists, so
    a display can never show "Single" again after the migration is applied.
13. **Properties with no rooms** (created through older payloads or `POST /api/landlord/properties`). The
    headline price falls back to `properties.price`; tenant views show "No rooms currently available" exactly
    as today.
14. **Reduced motion / mobile.** Inline boxes are plain flow content, so mobile is a single column of cards;
    nothing in this change animates (no new transitions beyond the existing `active:scale` button feedback).
15. **Unverified landlord.** The existing `VerificationNotice` + disabled submit is untouched; the room boxes
    render but submit stays blocked (BUG-09 must not regress).

---

## 7. Test plan

### 7.1 Web (`apps/web/test`, `bun test`, Testing Library — matches `landlord-documents-modal.test.tsx` style: `render` + `screen` + `QueryClientProvider` where needed)

New `apps/web/test/create-listing-rooms.test.tsx`:

1. **N rooms render N boxes** — type `3` in Number of rooms and assert three boxes with the seeded names
   `Room 1`–`Room 3` and the prefilled property defaults.
2. **Growing keeps data, shrinking warns** — fill Room 2's name, raise the count to 4 (Room 2 keeps its
   value), lower it to 2 (a `ConfirmDialog` names `Room 3`/`Room 4`, cancel restores the count).
3. **Validation gates submit** — duplicate room name, capacity `0`/`11`, blank rent disable
   `Create listing`; fixing them enables it.
4. **Minimum stay is gone** — the create page renders no `Minimum stay` label (regression guard for D4),
   and the property row is a 2-column grid.
5. **Photos capped at 4 with a soft hint** — selecting 5 files adds 4 and shows the cap message; a room with
   1 photo shows the 2-photo recommendation and submit stays enabled.
6. **Photos upload after create** — stub `fetch`, submit, assert the listing POST body contains the full room
   payload and that one `POST /api/landlord/rooms/{id}/photos` per room with photos follows, using the
   `room_ids` from the create response in order.
7. **Partial photo failure** — make the second room's upload fail; assert the listing is not re-created and
   the error toast names that room.

Extend `apps/web/test/components.test.tsx` (or the same new file) with a `RoomFormFields` unit test covering
the three room types and the occupied/slots-free summary line.

### 7.2 API (`workers/api/test`, real SQLite/D1 harness as today)

- `landlord.test.ts`: create a listing with a 3-room payload (mixed types, per-room price/deposit/size/
  description/status) → assert persisted rows and `room_ids` order; assert `400` for >30 rooms, bad type,
  capacity `0`/`11`, duplicate names; assert the legacy `propertyRooms`/`propertyCapacity` path still works
  and now derives `private`/`shared`; assert a create with no `propertyMinStay` leaves `min_stay = ''`.
- `rooms.test.ts`: public list + detail now include `occupied` / `free_slots` and the cheapest-room headline
  price; a room with `occupied = capacity` reports `free_slots = 0`.
- `applications.test.ts` (or the existing journey test): a 4-slot shared room accepts a second application
  after the first confirmed booking, rejects once `occupied = capacity`, and a leave approval frees a slot
  (`status` flips back to `available`, `free_slots` becomes 1).
- `landlord-photos.test.ts`: unchanged, but confirm the room photo endpoint is what the create flow uses.

### 7.3 Build gates

```bash
bun run cf:api:test
bun run cf:api:typecheck
bun run web:test
bun run web:typecheck
bun run web:build
bun run --cwd workers/api migrate:local   # applies 0019 locally
bunx prettier --write <touched files>
```

### 7.4 Migration approval (D20)

`0019_room_occupancy_and_room_types.sql` is additive-plus-normalizing (`ALTER TABLE … ADD COLUMN` + one
`UPDATE`). Local apply is part of the implementation; **remote D1 apply needs an explicit go-ahead** and must
be listed in the handoff notes.

### 7.5 Browser walkthrough (required, D20)

With the web app on `:3000` and the API on `:8000` (verified-landlord account from
`Seed_Credentials_QA.md`):

1. `/landlord/listings/create` → type `3`, confirm three boxes appear below the field with no modal.
2. Fill room 1 (Private, 1 person, 2 photos), room 2 (Shared, 4, 4 photos), room 3 (Dorm, 6, no photos →
   soft hint), and confirm the summary lines update live.
3. Confirm `Minimum stay` is absent and submit is disabled until every room is valid.
4. Submit → listing appears in `/landlord/listings`; open the listing edit page and confirm every room row
   shows the entered rent/type/capacity and its photos.
5. Open `/rooms/{id}` → each room card shows its own photo plus "`X` of `Y` slots free".
6. Try the 4th photo cap and a 6 MB file to see both inline messages.
7. As a boarder, apply to the shared room; as the landlord confirm the booking; reload `/rooms/{id}` and see
   slots decrease; approve a leave and see them restored.

---

## 8. Out of scope (explicit)

- The edit-listing page's room UI (D16) — separate follow-up spec.
- Any modal/panel resizing (this change is inline; `modal-desktop-width` decisions stand).
- Removing `min_stay` from the edit page, the API, or the D1 schema (D4/D19 keep the column and the edit
  field).
- Auto-deriving occupancy from applications only (D6 chose the explicit column) and auto-incrementing photos
  or amenity defaults.
- Payments, house rules, moderation, notifications.
- Changing the deploy pipeline, CI workflow, or Pages build script.
- Applying migration 0019 to remote D1 (TBD approval, §7.4).
- Committing or deploying anything.

---

## 9. Open questions / risks

1. **`occupied` on create.** The wizard exposes room **status** but shows occupied as read-only (`0`), since a
   brand-new room has no boarders and D6's manual correction belongs on the room edit page where the room
   already exists. If the requestor wants an editable "Occupied now" field in the create boxes too, that is a
   one-field addition — confirm before implementation.
2. **Admin room table is new UI.** `PropertiesSection.tsx` has no room list today, so R10's admin bullet is
   new surface area, not a tweak. If the requestor prefers to keep the admin change to payload parity only,
   the read-only table drops out.
3. **Capacity 1–10 vs dorm rooms.** D15 says Dorm is just a label, but a real dorm can exceed 10 beds. If
   dorms need larger capacities, the bound becomes type-dependent (`Private ≤ 2`, others ≤ 20) — say so
   before implementation.
4. **Headline price = cheapest room (D10) changes browse-card prices.** Existing seeded listings have room
   prices equal to their property price, so cards should look identical after migration; any property whose
   room prices diverge will change its displayed price. Worth a data sanity check on the seed set.
5. **Full rooms disappear from the booking selector.** Filtering out full rooms (R10) means a boarder can no
   longer apply to a full room at all; the API already rejects it, so this is a UI-only softening, but it
   makes "no rooms currently available" more common on single-room listings.
6. **Landlord preview link.** No landlord screen links to the public `/rooms/$id` page today; R10 adds one
   link on the listing edit page. If the requestor wants a richer in-shell preview, that is its own spec.
7. **`freeRoomSlot` on tenancy cancellation paths.** Only leave approval calls `freeRoom` today; if any other
   path ends a tenancy (admin actions, deletions), it must go through the same decrement or occupancy will
   drift. Worth a grep during implementation.

---

## 10. Acceptance criteria

1. `/landlord/listings/create` renders exactly `Number of rooms` inline room boxes below that field, with no
   modal, clamped to 1–30.
2. Each box captures name, room type (Private/Shared/Dorm), capacity (1–10), rent, deposit, size,
   description, status and 0–4 photos, seeded from the property defaults.
3. Changing the room count keeps filled data and asks before discarding rooms.
4. `Create listing` is disabled until every room box is valid; duplicate names and out-of-range capacity are
   rejected inline _and_ by the API.
5. Rooms with fewer than 2 photos show a non-blocking recommendation.
6. `Minimum stay` is absent from the create form only; the edit page and the tenant "Minimum Stay" card still
   work.
7. Submitting creates the listing and all rooms with their per-room values, then uploads each room's photos
   to that room; a per-room upload failure surfaces a toast naming the room and does not roll back the
   listing.
8. `rooms.occupied` exists (migration 0019), shared rooms accept bookings up to `capacity`, and confirmed
   bookings/approved leaves move the count while a landlord's manual correction persists.
9. `/rooms/$id` shows each room's own photo plus live "`X` of `Y` slots free"; full rooms are marked and not
   selectable for booking.
10. `/find-a-room` cards keep their layout, with room counts and headline price coming from real room rows.
11. Existing room types show as Private (no "Single" anywhere), and the Add-room modal/room edit page offer
    Private/Shared/Dorm.
12. `bun run web:test`, `bun run web:typecheck`, `bun run web:build`, `bun run cf:api:test` and
    `bun run cf:api:typecheck` are clean, migration 0019 applies locally, and the §7.5 browser walkthrough
    passes.
13. No change to auth, UploadThing configuration, `Modal`/`ConfirmDialog`, routing config, or the deploy
    pipeline; nothing is committed.

---

## 11. Implementation notes (what shipped)

Implemented 2026-10-08. Nothing was committed.

### 11.1 Files

| File                                                                                | Change                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workers/api/migrations/0019_room_occupancy_and_room_types.sql` (**new**)           | `ALTER TABLE rooms ADD COLUMN occupied INTEGER NOT NULL DEFAULT 0` + `UPDATE rooms SET room_type = 'private' WHERE room_type = 'single'`                                                                                                                                                           |
| `workers/api/src/routes/landlord/listings.ts`                                       | `listingRooms()` now reads the full per-room payload (name, type, capacity, price, deposit, size, description, status, occupied) and validates it **before any write**; min stay is no longer written; room types normalize to private/shared/dorm; the update path's room-type derivation follows |
| `workers/api/src/repositories/landlord/properties-types.ts` / `properties-rooms.ts` | `CreateLandlordRoomInput` gains `size`/`status`/`occupied`; the INSERT persists them                                                                                                                                                                                                               |
| `workers/api/src/routes/landlord/rooms.ts`                                          | `validRoomTypes`, `normalizeRoomType` (legacy `single` → `private`), capacity 1–10, `occupied ≤ capacity`, `occupied`/`free_slots` in the payload; the current capacity is only read when occupancy changes without capacity                                                                       |
| `workers/api/src/repositories/landlord-rooms.ts`                                    | `occupied` on the row type, the create input, the update input and both statements                                                                                                                                                                                                                 |
| `workers/api/src/repositories/applications.ts`                                      | `occupyRoom`/`freeRoom` became delta statements (`occupied + 1` / `MAX(occupied - 1, 0)` with a status CASE that only flips at full/available); `findApplicationRoom` selects capacity/occupied                                                                                                    |
| `workers/api/src/routes/applications.ts`                                            | Apply guard is capacity-aware (`maintenance` → maintenance error, `capacity - occupied <= 0` → "already full")                                                                                                                                                                                     |
| `workers/api/src/repositories/listings.ts`                                          | `RoomRow.occupied` + the rooms SELECT                                                                                                                                                                                                                                                              |
| `workers/api/src/routes/rooms.ts`                                                   | `roomOccupancy()` helper; `occupied`/`free_slots` on `formatRoom` and `formatDetailRoom`; `cheapestRoomPrice()` sets the list/detail headline price                                                                                                                                                |
| `workers/api/src/routes/admin.ts`                                                   | New `GET /api/admin/properties/rooms?id=` read-only per-room view (R10)                                                                                                                                                                                                                            |
| `apps/web/src/routes/landlord/listings/create.tsx`                                  | Inline room boxes, no modal; room-draft state with grow/shrink + confirm; per-room validation gating submit; photos uploaded per room after the listing exists; Minimum stay removed; 2-column property rows                                                                                       |
| `apps/web/src/components/rooms/RoomFormFields.tsx` (**new**)                        | The per-room field block (name, type, capacity, rent, deposit, size, occupied read-out, description, status, 0–4 photos with cap + soft hint)                                                                                                                                                      |
| `apps/web/src/lib/room-drafts.ts` (**new**)                                         | Pure helpers: types, options, seeding, clamp (1–30), resize/discard, per-room validation, summaries, API payload                                                                                                                                                                                   |
| `apps/web/src/components/rooms/RoomDetailView.tsx` + `detail-helpers.ts`            | "X of Y slots free" in the room grid and the booking selector; free-slot-aware availability; Full/Limited/Maintenance labels; private/shared/dorm (legacy `single` → Private)                                                                                                                      |
| `apps/web/src/components/rooms/LandlordRoomList.tsx`                                | Private/Shared/Dorm options, `roomTypeLabel`, "N of M slots free" per room                                                                                                                                                                                                                         |
| `apps/web/src/routes/landlord/listings/rooms/$id/edit.tsx`                          | Private/Shared/Dorm options, new **Occupied now** field with a slots-free read-out                                                                                                                                                                                                                 |
| `apps/web/src/routes/landlord/listings/$id/edit.tsx`                                | "Preview as boarder →" link to the public `/rooms/$id` page                                                                                                                                                                                                                                        |
| `apps/web/src/components/admin/sections/PropertiesSection.tsx`                      | "Rooms" action opening a read-only room inspector (type, rent, capacity, occupied, slots free, photos, status)                                                                                                                                                                                     |
| `apps/web/src/lib/api/landlord.ts`                                                  | Photo uploads now reject on non-2xx so a failed room upload is reported instead of silently succeeding                                                                                                                                                                                             |
| `apps/web/src/lib/{types.ts,room-drafts.ts}`, `apps/web/src/lib/api/admin.ts`       | Room occupancy/type fields and the admin rooms client                                                                                                                                                                                                                                              |
| `apps/web/test/create-listing-rooms.test.tsx` (**new**)                             | 20 tests: draft rules, the inline form (cap, hint, removal, errors), tenant occupancy copy/type labels, and create-page/admin source guards                                                                                                                                                        |
| `workers/api/test/room-occupancy.test.ts` (**new**)                                 | Real-SQLite occupancy deltas + capacity-aware apply guard                                                                                                                                                                                                                                          |
| `workers/api/test/{landlord,landlord-rooms,rooms,admin-dashboard}.test.ts`          | Updated to the new contract (per-room binds, normalized room types, `occupied`/`free_slots`, cheapest price, empty min stay) plus new payload-validation and admin room-view tests                                                                                                                 |

`FindARoomContent.tsx` needed **no change**: its card already renders `roomTypes`/`availableRooms`/`price`, all of
which now come from real room rows via the API (D18).

### 11.2 Verification

| Gate                                          | Result                                                                                                                |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `bun run cf:api:typecheck`                    | clean                                                                                                                 |
| `bun run cf:api:test`                         | **257 pass, 0 fail** (26 files)                                                                                       |
| `bun run web:typecheck`                       | clean                                                                                                                 |
| `bun run web:test` (preloads `test/setup.ts`) | **149 pass, 0 fail** (18 files)                                                                                       |
| `bun run web:build`                           | succeeds                                                                                                              |
| `bun run --cwd workers/api migrate:local`     | 0019 applied; `rooms.occupied` exists (53 rows at 0) and no `room_type = 'single'` remains (18 rows became `private`) |
| `bunx prettier --write` on touched files      | clean (the `.sql` migration has no prettier parser and is excluded)                                                   |

**End-to-end API walkthrough** (local worker on `:8000` + local D1, demo landlord `lina.santos@haven.demo`):

1. `POST /api/landlord/listings` with a 2-room payload (Private capacity 1 / Dorm capacity 4) → **201**,
   `data.room_ids` `[54, 55]` in creation order.
2. `GET /api/landlord/rooms?propertyId=8` → each room reports `room_type` (`private`/`dorm`), `capacity`,
   `occupied: 0`, `free_slots` (1 / 4).
3. `PUT /api/landlord/rooms?id=55` `{ occupied: 2 }` → **200**, `free_slots: 2`.
4. `PUT` with `{ occupied: 9 }` → **400** `occupied must be between 0 and capacity`; `{ room_type: 'penthouse' }`
   → **400** `room_type must be one of: private, shared, dorm`.
5. `GET /api/rooms/detail?id=8` (after publishing locally) → headline `price: 1800` (cheapest room, D10),
   `minStay: ""` (D19), and per-room `freeSlots` 2 / 1 with `roomType` `dorm` / `private`.
6. `GET /api/rooms/public` → the browse card carries the cheapest price and per-room `free_slots`.
7. Fixture cleaned up: `DELETE /api/landlord/properties?id=8` → 200; property and its rooms are soft-deleted
   (verified in local D1).

### 11.3 Not done (deliberately or blocked)

- **The browser walkthrough (§7.5) was not driven in a real browser.** There is no browser-automation tool in
  this session, so the UI was verified by unit tests (including rendered `RoomFormFields` behaviour), source
  guards, typecheck and build, plus the HTTP walkthrough above. The first two §7.5 steps (typing `3` and
  watching three boxes appear; the photo cap message) are covered by unit tests; the remaining click-through
  is worth doing before shipping.
- **Room photo uploads were not exercised end-to-end** — UploadThing needs a real token, so the smoke fixture
  had zero photos. The create page's post-create upload calls the same `/api/landlord/rooms/:id/photos`
  endpoint already covered by `landlord-rooms.test.ts`, and the new client-side non-2xx handling is what
  drives the "photos for Room 3 failed" toast.
- Remote D1 was **not** migrated (needs the go-ahead in §7.4). Nothing was committed or deployed.
- §9.1 was resolved the way the spec leaned: the create boxes show **Occupied now** as a read-only `0` for
  brand-new rooms, and the editable correction lives on the room edit page.
