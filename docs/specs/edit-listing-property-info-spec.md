# Spec — Edit listing manages property-wide public information only (Listing status: Draft / Published / Unpublished)

**Status:** **Implemented and verified** (2026-10-10). Every requirement below is in the working tree; the
five §7.4 gates pass, and the §7.5 browser walkthrough was completed at 1440px and 390px. The §9 open
questions were implemented on their stated defaults. See §11 for the implementation record.
**Short name:** `edit-listing-property-info` (the file-name question was left blank in the interview; this is
the recommended option. Rename the file if a different short name is wanted.)
**Date:** 2026-10-09
**Owner request (verbatim):**

> Redesign the “Edit listing” page so it manages only property-wide public information. Do not include editable
> room-management fields in this form because rooms are managed separately in the “Rooms” section below.
>
> Keep these fields in Edit listing:
>
> - Property name
> - Property type
> - Gender preference
> - Description
> - Default monthly rent and deposit, if pricing is shared across rooms
> - Street address
> - City and province
> - Amenities
> - Property-level photos
> - Listing status, renamed to “Listing status” with options such as Draft, Published, and Unpublished
>
> Remove these fields from the upper Edit listing form:
>
> - Number of rooms

**Relationship to existing work:**

- Follows `landlord-property-detail-page-spec.md` (which created the detail page, the rooms page and the edit
  page's exits, and left the edit form's fields untouched) and `landlord-rooms-grid-spec.md` (the dedicated
  `/landlord/properties/$id/rooms` page).
- **Supersedes the field scope of** `landlord-property-detail-page` D8/D9/R7 as it applies to the *edit* page:
  rooms are the rooms page's job; this form stops carrying any room-shaping input. It does **not** touch the
  create page's room model (`create-listing-room-details` D1/D9/D12 stay exactly as built).
- **Removes a duplication** the same way D26 in `landlord-property-detail-page-spec.md` just removed the Rooms
  tab: the Public listing card's own `Unpublish` button goes away and the status control on this form becomes
  the single place a listing's visibility is chosen (D16).
- **Fixes a visibility hole found while writing this spec** (D17, §2.3): Draft and Unpublished do not actually
  hide a listing from boarders today, because the public listing queries check only the admin moderation flag.
  A status control that cannot hide a listing is not a status control, so the fix rides in this pass.

---

## 1. Interview decisions (as answered by the requestor)

Answers were collected in five rounds of `ask_user` (5 + 5 + 5 + 5 + 4 questions). Where a later answer
supersedes an earlier one, the row says so.

| #   | Topic                          | Decision                                                                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Form scope                     | **Property-wide public information only.** Kept: property name, property type, gender preference, description, monthly rent + deposit (as shared pricing, D6), street address, city, province, amenities, property-level photos, listing status. **Removed: Number of rooms and Capacity per room** (D8).                                                                          |
| D2  | Rooms section below the form   | ~~**Keep the inline `LandlordRoomList` exactly as it is** — compact list, per-room Edit links, ＋ Add room modal, delete.~~ **Superseded on request (2026-10-10, D27):** the inline Rooms section is **removed** — it duplicated `Manage rooms` on the Overview pane. Rooms are managed only on `/landlord/properties/$id/rooms`; this page reads the room rows but renders none. |
| D3  | Status model                   | **The landlord controls `properties.status`; admin moderation stays a separate fact.** The select writes Draft = new `draft` value, Published = `available`, Unpublished = `hidden`. When `listing_moderation_status` is not `published`, the form shows a non-blocking inline hint (D10).                                                                                           |
| D4  | New-listing default            | **A listing created from `/landlord/listings/create` starts as Draft** (`status = 'draft'`, moderation still `pending_review` as today). The create page is otherwise untouched (D19).                                                                                                                                                                                               |
| D5  | Property rent → rooms          | **Never touch existing rooms.** The property-level rent/deposit are the defaults for *newly added* rooms only; editing them here rewrites no room row. (This is a behaviour change: the PUT path that bulk-rewrites room prices/capacity stops being fed.)                                                                                                                       |
| D6  | Shared-pricing control         | **A “Same rent and deposit for every room” toggle** in the Pricing section. Its initial state is **derived on load** (ON when every live room shares one rent, or there are no rooms; OFF when rents differ). **Not persisted** — no migration, no new column.                                                                                                                     |
| D7  | Toggle OFF treatment           | **Rent/deposit become read-only** and are replaced by a range line (e.g. “₱4,200 – ₱6,500 across 12 rooms”) plus a short link to the Rooms section. The stored property price/deposit are **left exactly as they are** (never cleared, never auto-synced to the cheapest room).                                                                                                    |
| D8  | Room-count / capacity fields   | **Both removed from this form.** The API keeps honouring `total_rooms`/`propertyRooms`/`capacity`/`propertyCapacity` on PUT for any older client; the web app simply stops sending them, and the API tests covering that path stay as they are.                                                                                                                                    |
| D9  | Listing-status placement       | **Its own section at the end of the form**, immediately before the sticky save bar — the last decision before saving. (Not folded into Pricing, not moved to the top.)                                                                                                                                                                                                            |
| D10 | Moderation hint                | **Inline muted text directly under the select.** Three states: not-yet-approved (“Awaiting admin review — boarders can’t see this listing yet”), rejected (“An admin rejected this listing — fix the details and publish again to request another review”), and approved/live (no hint). Not a badge, not a page banner.                                                         |
| D11 | Re-publish semantics           | **An approval survives Unpublished → Published.** The only reset is **rejected → Published**, which sets `listing_moderation_status = 'pending_review'` (a landlord-initiated re-review request). Nothing else in this form ever writes moderation.                                                                                                                               |
| D12 | Rejected listings              | **Read as Unpublished** in the select (rejected is never presented as a landlord choice), with the D10 rejection hint.                                                                                                                                                                                                                                                            |
| D13 | Publish preconditions          | **Required property fields valid + at least one room.** Photos stay soft-recommended only (the existing two-photo nudge; nothing blocks).                                                                                                                                                                                                                                          |
| D14 | Required fields                | Property name, description, street address, city and province are **always required**. Monthly rent and deposit are required **only while the shared-pricing toggle is ON** (D6).                                                                                                                                                                                                 |
| D15 | Vocabulary ownership           | **One mapping in the web app, raw values from the API.** The landlord API returns the stored status (`available` / `hidden` / `draft`) plus `listing_moderation_status`; a single web helper maps it to **Draft / Published / Unpublished** with the hint copy. The same helper feeds the pills everywhere the landlord sees listing status.                                         |
| D16 | The “Full” pill                | **A derived badge beside the status, never instead of it.** The card's pill always shows the landlord's own choice (Draft/Published/Unpublished); an all-rooms-occupied property additionally shows a `Full` badge (warning tone) alongside.                                                                                                                                    |
| D17 | Visibility gap (fix it here)   | **Every boarder-visible listing query requires `status = 'available'` AND moderation `published`.** Browse (`/find-a-room`), public detail (`/rooms/$id`), similar listings, saved listings and the boarder save/apply gate all honour Draft and Unpublished; the map already does.                                                                                                 |
| D18 | Detail-page Unpublish button   | **Remove it.** The Public listing card keeps its pill and `Edit listing`, but its `Unpublish` button (and its confirm dialog) goes; this form owns status (same one-control-per-destination rule as D26 in `landlord-property-detail-page-spec.md`). The Danger zone's Delete property is untouched.                                                                            |
| D19 | Create page scope              | **Untouched except the Draft default** (D4): its Number-of-rooms → room-boxes flow, capacity default, and rent/deposit defaults all stay as built.                                                                                                                                                                                                                                 |
| D20 | Property photos                | **Keep the separate Photos card below the form**, unchanged: immediate upload, thumbnails, ✕ = will delete. No cover-photo picker, no reordering in this pass.                                                                                                                                                                                                                     |
| D21 | Old PUT room fields            | Keep the server path (D8); no deprecation warning, no guard — the UI just stops using it.                                                                                                                                                                                                                                                                                         |
| D22 | Persistence of status changes  | **Status saves with the form's Save button** (one submit, like every other field). It does not auto-save on select.                                                                                                                                                                                                                                                               |
| D23 | Migration                      | **None required.** `properties.status` is `TEXT NOT NULL DEFAULT 'available'` with no CHECK constraint (`0002_public_listings.sql:27`), so `draft` needs no schema change. The value set is documented in `docs/specs/schema.md` instead.                                                                                                                                          |
| D24 | Verification bar               | `web:typecheck` + `web:build` + the full `web:test` suite, `cf:api:typecheck` + `cf:api:test`, **plus a browser walkthrough at 1440px and 390px** covering draft → publish → unpublish and all three hint states.                                                                                                                                                              |
| D25 | Deliverable                    | **This spec only.** No code changes, no migrations, no dependency changes in this pass.                                                                                                                                                                                                                                                                                          |
| D27 | Remove the inline Rooms section | **(added 2026-10-10, on request)** The edit form's `LandlordRoomList` block and its `#rooms` anchor are removed. The Pricing section's `Manage rooms →` link now routes to `/landlord/properties/$id/rooms`. The rooms query stays (the shared-pricing state and the R9 publish check still need it), but the form no longer lists or edits rooms. |

---

## 2. Current state (verified 2026-10-09, read-only)

### 2.1 The edit form today — `apps/web/src/routes/landlord/listings/$id/edit.tsx`

Sections and controls, in order:

| Section                 | Controls today                                                                 |
| ----------------------- | ------------------------------------------------------------------------------ |
| Basic information       | Property name, Property type, Gender preference, Description                    |
| Pricing and capacity    | Monthly rent (₱), Deposit (₱), **Number of rooms**, **Capacity per room**, Status (Active / Inactive) |
| Location                | Street address, City, Province                                                  |
| Amenities               | Eight amenity pills                                                             |
| (sticky save bar)       | Cancel · Save changes                                                           |
| Photos (separate card)  | Upload dropzone + thumbnails with ✕ = will delete                                |
| Rooms (`LandlordRoomList`) | Room list, per-room Edit links, ＋ Add room, delete                         |
| Authorized landlords    | Read-only list (owner only)                                                     |

- The form **seeds once** from `getProperty()` and **sends `...form`** on submit, which today includes
  `min_stay` (seeded, never rendered) and `total_rooms` / `capacity` — the fields this spec removes.
- `amenities` and `photos_to_delete` ride along with the same PUT; photo **uploads** post immediately to
  `POST /api/landlord/listings/:id/photos`.
- Unverified landlords get `VerificationNotice` and a disabled Save (BUG-09 behaviour — unchanged).

### 2.2 The two statuses today

- `properties.status` ∈ {`available`, `hidden`} in practice (`occupied` is in the docs but nothing writes it),
  default `available` — landlord-controlled, currently surfaced as **Active / Inactive**
  (`SelectInput` in the edit form) and translated by the API (`mapDetailStatus`: `available`→`active`,
  `hidden`→`inactive`).
- `properties.listing_moderation_status` ∈ {`pending_review`, `published`, `rejected`, `flagged`} —
  **admin-controlled** (`POST /api/admin/properties` action `publish|reject|flag`). A newly created listing
  is `pending_review` (`createLandlordPropertyFromAlias` inserts `'pending_review'`).
- The landlord list derives a third, non-stored value: `mapListStatus` returns **`full`** when every room is
  occupied, and `inactive` when moderation is `rejected`.
- The web translates a second time: `listingPill` → `active`→“Available”, `full`→“Full”,
  `inactive`→“Inactive”, anything else → its own label with underscores stripped.
- `moderationPill` (admin vocabulary: Published/Rejected/…) is a **separate** helper and stays as it is.

### 2.3 The visibility gap (why D17 exists)

Boarder-visible queries check **only** the moderation flag, never `properties.status`:

| Surface                          | File / line                                                   | Checks `status`? |
| -------------------------------- | ------------------------------------------------------------- | ---------------- |
| Browse `/find-a-room`            | `repositories/listings.ts:139` (`publicListingsWhere`)         | ❌ moderation only |
| Public detail `/rooms/$id`       | `repositories/listings.ts:417`                                 | ❌ moderation only |
| Similar listings                 | `repositories/listings.ts:547`, `:586`                         | ❌ moderation only |
| Map (`/landlord/maps`, `/maps`)  | `repositories/listings.ts:490`                                 | ✅ `status IN ('available','active')` |
| Saved listings                   | `repositories/saved-listings.ts:78`                            | ✅ `status != 'hidden'` |
| Boarder save/apply gate          | `routes/boarder.ts:112`                                        | ✅ `status === 'hidden'` blocks |
| AI answer context                | `routes/ai.ts:57`                                             | ❌ moderation only |

**Consequence:** today's `Unpublish` button on the property detail page sets `status = 'hidden'` and the
landlord's own screens say “Inactive”, but the listing stays fully browsable at `/find-a-room` and `/rooms/$id`
as long as an admin once published it. Draft would inherit the same hole. There is no client-side filter on
either boarder surface (`FindARoomContent`, `routes/rooms/$id` read `status` from the payload but never act on
it), so the API is the only place to fix it.

### 2.4 The PUT room path that stops being fed

`PUT /api/landlord/listings/:id` → `updateListingRoomsIfNeeded` (`routes/landlord/listings.ts:538`) reacts to
`total_rooms` / `propertyRooms` / `capacity` / `propertyCapacity` by **creating rooms**, **soft-deleting rooms**
and **rewriting every active room's capacity/type/price**. `handleUpdateListing` also funnels the body's price
into `updateLandlordActiveRooms`. With the fields gone from the form, nothing in the web app sends those keys
any more (the create page uses `POST /api/landlord/listings` with a `rooms[]` payload; `LandlordRoomList` uses
the dedicated room endpoints), so this branch becomes dead for our UI but stays for any older client (D21).

### 2.5 Tests that pin today's behaviour

- `apps/web/test/properties-card-layout.test.tsx` — pill vocabulary (`listingPill`,
  `moderationPill`) and the detail page's source contracts.
- `apps/web/test/create-listing-rooms.test.tsx` — the create page + `room-drafts` helpers.
- `workers/api/test/landlord.test.ts` — PUT payloads including `total_rooms`/`capacity`, the
  Active/Inactive/Full mapping, and photo/amenity writes.
- `workers/api/test/rooms.test.ts` — public browse/detail payloads.
- `workers/api/migrations/0020_messages.sql` is unrelated; no migration is needed by this spec (D23).

---

## 3. Target design

### 3.1 The Edit listing form, top to bottom after this change

```
Edit listing                                            [ ← Back to property ] [ Preview as boarder ]
*(subtitle removed in the 2026-10-10 redundant-copy sweep)*

┌───────────────────────────────────────────────────────────────────────────────┐
│ Basic information                                                             │
│   Property name                                                               │
│   [ Property type ▾ ]        [ Gender preference ▾ ]                          │
│   Description                                                                 │
├───────────────────────────────────────────────────────────────────────────────┤
│ Pricing                                                                       │
│   [✓] Same rent and deposit for every room                                    │
│   [ Monthly rent (₱) ]       [ Deposit (₱) ]            ← editable while ON   │
│   — OR —                                                                      │
│   Rent varies by room: ₱4,200 – ₱6,500 across 12 rooms   Manage rooms →       │
├───────────────────────────────────────────────────────────────────────────────┤
│ Location                                                                      │
│   Street address                                                              │
│   [ City ]                   [ Province ]                                     │
├───────────────────────────────────────────────────────────────────────────────┤
│ Amenities                                                                     │
│   (WiFi) (Air conditioning) (Kitchen) … *(pills, unchanged)*                   │
├───────────────────────────────────────────────────────────────────────────────┤
│ Listing status                                                                │
│   [ Draft ▾ ]    ← Draft / Published / Unpublished                            │
│   Awaiting admin review — boarders can’t see this listing yet                 │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                  [ Cancel ]  [ Save changes ] │  ← sticky
└───────────────────────────────────────────────────────────────────────────────┘

┌─ Photos (separate card, unchanged) ───────────────────────────────────────────┐
└───────────────────────────────────────────────────────────────────────────────┘
Authorized landlords (unchanged, owner only)

*(The inline `LandlordRoomList` Rooms block is removed — D27; only `Manage rooms` on the Overview pane
reaches rooms.)*
```

- **No `Number of rooms`. No `Capacity per room`.** The Pricing section is renamed from
  “Pricing and capacity” to **Pricing**, and its description drops the capacity wording.
- **Listing status** is its own section (D9) with the select plus the inline hint (D10).
- Everything else keeps its current component (`Field`, `TextInput`, `SelectInput`, `TextArea`,
  `AmenityToggle`) and its current validation attributes.

### 3.2 The status control

| Stored `properties.status` | Moderation                       | Landlord sees in the select | Hint under it                                                     |
| -------------------------- | -------------------------------- | --------------------------- | ------------------------------------------------------------------ |
| `draft`                    | any                              | **Draft**                   | — (a draft is private by definition)                                |
| `available`                | `published`                      | **Published**               | —                                                                   |
| `available`                | `pending_review`                 | **Published**               | “Awaiting admin review — boarders can’t see this listing yet.”       |
| `available`                | `rejected`                       | **Unpublished**             | “An admin rejected this listing — fix the details and publish again to request another review.” |
| `hidden`                   | any                              | **Unpublished**             | (the rejection hint when moderation is `rejected`)                   |
| unknown value              | —                                | its own label, neutral tone | — (defensive: never crash, never mislabel)                          |

- Choosing **Published** on a listing whose moderation is `rejected` is the *only* write to moderation from
  this page: it becomes `pending_review` (D11). Every other save leaves moderation alone.
- Choosing **Draft** or **Unpublished** never clears an existing approval, so a later **Published** is
  instantly visible again (D11) — unless the listing was rejected.
- The control is a normal form field: it saves with **Save changes** (D22).

### 3.3 Pricing behaviour

- **Toggle ON** (default when every live room shares one rent, or when there are no rooms): the two inputs are
  editable and required (D14), labelled as they are today. Saving writes `price`/`deposit` to the property row
  and touches no room (D5).
- **Toggle OFF** (any two live rooms differ): the inputs are replaced by a read-only line —
  `Rent varies by room: ₱4,200 – ₱6,500 across 12 rooms` — plus a `Manage rooms →` link to the Rooms section.
  The PUT **omits** `price`/`deposit`, so the stored property values are preserved verbatim (D7). The tenant
  headline price keeps coming from the cheapest room (`create-listing-room-details` D10).
- Switching the toggle is a **form-session** choice: turning it ON does not rewrite rooms, and it does not
  persist as a declaration. On the next load it is derived again from the rooms (D6).

### 3.4 Landlord pill vocabulary after this change

One helper (working name `apps/web/src/lib/listing-status.ts`) owns: the three options, the mapping
`available → Published`, `hidden → Unpublished`, `draft → Draft`, the hint copy, and the payload rule
(`price`/`deposit` included only when the toggle is ON).

Consumers:

| Surface                                             | Today                                             | After                                                                 |
| --------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------- |
| Landlord property card pill (`LandlordPropertyCards`) | `listingPill(status)` → Available/Full/Inactive   | `Published` / `Unpublished` / `Draft`, **+ a separate `Full` badge** when every room is occupied (D16) |
| Property detail → Overview `PropertyDetailsCard`    | `listingPill(detail.status)`                      | same helper                                                           |
| Property detail → `PublicListingCard`               | pill + `Unpublish` button                         | same helper, **button removed** (D18)                                  |
| Property detail → Public listing tab                | `listingPill(detail.status)`                      | same helper                                                           |
| Edit listing → Listing status                       | `Active`/`Inactive` select                        | the three options + hint                                              |
| Admin console                                        | `moderationPill` (Published/Rejected/…)           | **unchanged**                                                         |

The API stops translating for the landlord: `mapDetailStatus`/`mapListStatus` return the raw stored status, and
the web derives both the pill and the `Full` badge from the numbers the payloads already carry — the **list**
row sends `total_rooms` + `occupied_rooms` (`routes/landlord/properties.ts:79-80`) and the **detail** row
additionally sends `listing_moderation_status` (`:113`). One small gap to close while there: if a card should
ever want to show the moderation state (not required by D10, which is form-only), the list formatter would need
that field too. (Risk noted in §9.)

### 3.5 Detail page after the change

- The `Public listing` card keeps its pill, its `Edit listing` link and its copy; the `Unpublish` button, its
  ConfirmDialog and the `updateListing` mutation in that route go away (D18).
- Nothing else on the detail page changes; the Rooms tab is already gone (D26 of the previous spec).

---

## 4. Requirements

**R1.** The Edit listing form renders **exactly** these editable controls: property name, property type, gender
preference, description, shared-pricing toggle, monthly rent, deposit, street address, city, province,
amenities, listing status (D1). No `Number of rooms`, no `Capacity per room`, no other room-shaping input.

**R2.** The PUT payload built by this page contains only the fields above (plus `amenities` and
`photos_to_delete`). It never sends `total_rooms`, `propertyRooms`, `capacity` or `propertyCapacity`, and it
stops sending `min_stay` (a field the form cannot edit). `price`/`deposit` are sent only when the shared-pricing
toggle is ON (D5/D7/D8).

**R3.** Saving this form never modifies a room row: no room created, deleted, re-priced or re-capacity-ed
(D5/D8). Enforced at the UI level in this pass; the API path stays available to older clients (D21).

**R4.** The shared-pricing toggle derives its initial state from the property's live rooms (all rents equal, or
no rooms → ON; otherwise OFF). It is not persisted anywhere (D6).

**R5.** With the toggle OFF, rent/deposit are read-only and replaced by a range line naming the room count plus
a link to the Rooms section; the stored property price/deposit are left untouched by a save (D7).

**R6.** The Listing status section offers Draft / Published / Unpublished and nothing else, and it reads back
the stored state per §3.2 (D3/D12).

**R7.** The moderation hint appears under the select in the two non-live states, in the wording of §3.2, is
non-blocking, and is absent when moderation is `published` (D10).

**R8.** Switching a **rejected** listing to Published sets `listing_moderation_status = 'pending_review'`. No
other action on this page writes moderation (D11).

**R9.** Published can be saved only when the required fields are valid **and** the property has at least one
room; the save button states the reason when it is blocked. Photos remain recommended-only (D13/D14).

**R10.** Property name, description, street address, city and province are always required; rent/deposit are
required only while the toggle is ON (D14).

**R11.** Every landlord surface that names listing status speaks Draft / Published / Unpublished through one
shared web helper; the all-rooms-occupied `Full` state becomes an additional badge and never replaces the
landlord's choice (D15/D16).

**R12.** The property detail page's Public listing card no longer offers `Unpublish`; its confirm dialog and
mutation are removed with it (D18).

**R13.** **Visibility:** a listing is boarder-visible only when `properties.status = 'available'` **and**
`listing_moderation_status = 'published'`. The browse list, public detail, similar listings, saved listings and
the AI context query all add the status condition; the map and the boarder save/apply gate already honour it
and stay as they are (D17). Draft and Unpublished listings disappear from every boarder surface, including
direct `/rooms/$id` URLs (404 / not-found, not a half-rendered page).

**R14.** A newly created listing is `status = 'draft'` with moderation `pending_review`; the create page's
fields and flow are otherwise unchanged (D4/D19).

**R15.** The Photos card and the Authorized-landlords card keep their current behaviour and position
(D18/D20). The inline `LandlordRoomList` Rooms section is **removed** (D27) — rooms are reached only through
`Manage rooms` on the property detail page; the form still reads the room rows for the pricing state and the
publish precondition.

**R16.** Loading uses the existing spinner/`ErrorState`; unverified landlords keep the `VerificationNotice` and
the disabled Save; the page stays single-column at 390px with no horizontal overflow (existing shell caveat
noted in `messages-feature-review` §12.10 applies).

**R17.** The stored status value set (`draft`, `available`, `hidden`) is documented in `docs/specs/schema.md`;
no migration is written (D23).

**R18.** The stale references are cleaned up in the same pass: `apps/web/src/lib/room-drafts.ts`'s comment
about the edit page carrying property-level defaults, `landlord-property-detail-page-spec.md` §3.4/D16 wording
about the card's Unpublish button, and `docs/MANUAL.md` if it lists the edit form's fields.

---

## 5. Files this will touch (planned)

### 5.1 Frontend

| File                                                            | Change                                                                                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `apps/web/src/routes/landlord/listings/$id/edit.tsx`            | The redesign: drop the two room fields, add the Pricing toggle, move/rename Status to Listing status with the hint, trim the payload. |
| `apps/web/src/lib/listing-status.ts` **(new)**                  | The single Draft/Published/Unpublished mapping, hint copy, option list and payload rule (D15).                            |
| `apps/web/src/components/properties/LandlordPropertyCards.tsx`  | Pull the pill from the new helper; render the derived `Full` badge beside it (D16).                                        |
| `apps/web/src/components/properties/PropertyCard.tsx`           | Retire `listingPill`'s landlord vocabulary (or re-point it at the new helper); `moderationPill` stays.                     |
| `apps/web/src/components/properties/PropertyOverview.tsx` / `PropertyPublicListing.tsx` | Use the new helper for the status pill.                                                          |
| `apps/web/src/routes/landlord/properties/$id/index.tsx`         | Remove the Unpublish button, its ConfirmDialog and the now-unused `updateListing` mutation (D18).                          |
| `apps/web/src/routes/landlord/listings/create.tsx`              | One-line change: send `propertyStatus: 'draft'` (or let the API default it, see §9 Q1).                                    |

### 5.2 Backend

| File                                                              | Change                                                                                                                       |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `workers/api/src/routes/landlord/listings.ts`                     | `normalizeListingStatus` accepts `draft` (keeping the `active`/`inactive` aliases); rejected → Published resets moderation (R8); create defaults to `draft` (R14). |
| `workers/api/src/routes/landlord/properties.ts`                   | Stop translating: return the raw `status` + `listing_moderation_status` so the web owns the vocabulary (D15).                  |
| `workers/api/src/repositories/listings.ts`                        | Add the status condition to `publicListingsWhere`, `getPublicListingDetail`, `listSimilarPublicListings` (R13).                |
| `workers/api/src/repositories/saved-listings.ts`                  | Tighten `status != 'hidden'` to `status = 'available'` so drafts can't be saved (R13).                                        |
| `workers/api/src/routes/ai.ts`                                    | Same status condition in the AI context query (R13).                                                                          |
| `workers/api/src/repositories/landlord/properties-mutations.ts`   | Create path inserts `status = 'draft'` (R14).                                                                                 |
| `docs/specs/schema.md`                                            | Document the three status values (R17).                                                                                        |

### 5.3 Tests

| File                                                  | Change                                                                                                     |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `apps/web/test/properties-card-layout.test.tsx`       | Pill vocabulary updates (Draft/Published/Unpublished + Full badge) and the detail page's contracts (no Unpublish button). |
| `apps/web/test/edit-listing-property-info.test.tsx` **(new)** | The new helper's mapping/hint/payload rules and the form's field-list source contract (no “Number of rooms” / “Capacity per room” strings, toggle markup present). |
| `workers/api/test/landlord.test.ts`                   | Raw status passthrough, `draft` accepted on PUT, rejected → Published resets moderation, PUT keeps room rows untouched when the room fields are absent. |
| `workers/api/test/rooms.test.ts`                      | Public browse/detail/similar exclude `draft` and `hidden` (R13).                                            |
| `workers/api/test/boarder`-adjacent suites             | The save/apply gate still refuses `draft`/`hidden`.                                                         |
| `workers/api/test/landlord-rooms.test.ts`              | Unchanged — it covers the endpoints that stay the room-management path (D21).                               |

---

## 6. Edge cases

1. **Zero rooms.** Toggle defaults ON (no rooms to compare), rent/deposit required, **Published blocked** until
   one room exists (R9) with an inline reason and a link to the Rooms section. Draft and Unpublished save fine.
2. **Rooms with mixed rent while the toggle is ON.** Allowed (the toggle is a claim about *defaults*, not a
   validation of rooms); no room is rewritten (R3). The hint under the toggle says the choice affects newly
   added rooms only.
3. **A property whose rooms all share a rent but the stored property price differs.** Toggle ON; saving leaves
   the room rows alone; the property price is whatever the landlord last saved.
4. **Rejected listing left as Unpublished.** The hint stays (no moderation write), and the landlord can fix
   fields and save; only switching to Published requests re-review (R8).
5. **Unpublished → Published on an admin-approved listing.** Instant visibility, no re-review (D11).
6. **Moderation `flagged`.** Treated like “not published”: landlord surfaces show Unpublished + the
   awaiting/rejected hint depending on the exact value; never a crash, never a false “Live”.
7. **Legacy `properties.status` values not in the set** (e.g. `occupied` from the old docs). The select shows
   the raw label with a neutral tone; saving rewrites it to one of the three legal values.
8. **Landlord edits address while a shared-access co-manager has the page open.** Last write wins, as today —
   no new concurrency control in this pass (see §9).
9. **A draft listing with photos and no rooms.** It is invisible to boarders by both moderation and status; the
   detail page still previews for the landlord (`Preview as boarder` opens `/rooms/$id`, which now 404s for
   non-published — see §9 Q2).
10. **The `Full` badge on an Unpublished listing.** Both show: the pill says Unpublished, the badge says Full —
    occupancy is a fact, not a status (D16).
11. **Saving with the toggle OFF and a stale form state.** The payload omits price/deposit, so an old value in
    the input can never be written by accident (R2).
12. **The old `Status` select is removed, not hidden.** No `Active`/`Inactive` option may remain reachable from
    this page (R6).

---

## 7. Test plan

### 7.1 Pure helpers (web, direct assertions)

- `listingStatusLabel` / mapping: `available → Published`, `hidden → Unpublished`, `draft → Draft`, unknown →
  its own label with a neutral tone.
- `listingModerationHint`: the three hint states and their exact copy (§3.2), plus `flagged` and
  `undefined` moderation.
- `isFullProperty(total, occupied)`: true only when `total > 0 && occupied >= total`.
- `sharedPricingState(rooms)`: ON for zero rooms and for equal rents; OFF with the min/max range otherwise.
- `listingSavePayload(form, property)`: includes price/deposit only when the toggle is ON; never includes
  `total_rooms`/`capacity`/`min_stay`.

### 7.2 Source contracts (web, the repo's existing style)

- `routes/landlord/listings/$id/edit.tsx` contains `Listing status`, the three option values, and **does not
  contain** `Number of rooms`, `Capacity per room`, `id="total_rooms"` or `id="capacity"`.
- It contains the toggle control and the range line, and it does not contain `listingPill(`'s old
  Active/Inactive strings.
- `routes/landlord/properties/$id/index.tsx` no longer contains `Unpublish` (D18) but still contains the Danger
  zone and `deleteProperty`.
- The shared helper is imported by the card list, the detail page's Overview card and the Public listing pane
  (one definition, four consumers).

### 7.3 API tests

- PUT accepts `status: 'draft'`, stores it, and returns it; `active`/`inactive` aliases still normalise.
- PUT with only the form's fields leaves `rooms` untouched (count, prices, capacities) — the direct
  regression test for R3.
- Rejected + Published → `pending_review`; rejected + Draft/Unpublished → still rejected; published +
  Unpublished → still published (R8/D11).
- Browse/detail/similar exclude `draft` **and** `hidden` rows even when moderation is `published` (R13) — the
  test that would have caught §2.3.
- Saved listings refuse a draft/unpublished property.
- Create → `status = 'draft'`, moderation `pending_review` (R14).

### 7.4 Build gates

`bun run web:typecheck`, `bun run web:test`, `bun run web:build`, `bun run cf:api:typecheck`,
`bun run cf:api:test` — all green, no assertion weakened to accommodate the change.

### 7.5 Browser walkthrough (D24, required)

Two QA accounts on the local D1 (landlord + boarder), at **1440px and 390px**:

1. Open a Published listing's Edit page: no Number of rooms / Capacity per room; the toggle reflects the rooms;
   Listing status reads Published with no hint.
2. Set Unpublished, save, reload: select reads Unpublished; the landlord card shows Unpublished; `/find-a-room`
   and `/rooms/$id` no longer show it for the boarder account (the §2.3 regression).
3. Set Published again, save: visible again with no re-review; the hint reappears only if moderation is not
   published.
4. On a listing with mixed room rents, confirm the toggle is OFF, the range line names the real min–max and
   count, and saving changes no room's rent (spot-check the Rooms section and `/landlord/properties/$id/rooms`).
5. On a property with no rooms, confirm Published is blocked with the reason, Draft saves.
6. On a rejected listing, confirm the rejection hint and that switching to Published asks for re-review
   (moderation back to `pending_review`).
7. Confirm the detail page's Public listing card has no Unpublish button, that `Edit listing` still opens this
   form, and that the Full badge shows beside the status for an all-occupied property.
8. Confirm the Photos card and the Rooms section below behave exactly as before.

---

## 8. Out of scope (explicit)

- The **create** page's model (D19) beyond the draft default — its Number-of-rooms boxes, capacity default and
  price/deposit defaults stay.
- The **rooms page** and `LandlordRoomList` internals (D2) — rooms keep their own page, grid, stats and modal.
- **Admin console** moderation wording and controls (`moderationPill`, publish/reject/flag) — untouched.
- **Payments, messages, applications, verification, tenancy** — untouched.
- **Photo cover selection/reordering** (D20), a `pricing_is_shared` column (D6), and removing the dead PUT room
  path (D21).
- **Design-system work**: no new primitive is planned; the toggle reuses the existing form/checkbox language,
  the hint is plain muted text.

---

## 9. Open questions and agent defaults

Defaults are what the implementer will do unless the requestor says otherwise.

| # | Question | Default |
| - | -------- | ------- |
| Q1 | Should the create page send `propertyStatus: 'draft'` explicitly, or should the API's create path insert `draft` (so every client gets it)? | **API default** — the create path inserts `draft`; the web sends nothing, keeping the create page a one-file-non-change (R14). |
| Q2 | `Preview as boarder` opens the public `/rooms/$id`, which will 404 for a Draft/Unpublished listing (R13). Add a landlord-only preview mode, or leave it? | **Leave it for now**; the button keeps its behaviour, and §9 Q3's hint already tells the landlord why the public page is empty. A landlord-side preview is a separate spec. |
| Q3 | Should the Edit page show a small inline “not visible to boarders” note whenever status ≠ Published, next to `Preview as boarder`? | **Yes, muted one-liner** — same copy as the D10 hint, so the two never disagree. |
| Q4 | Does the `Full` badge need its own tone? | **`warning`** — `StatusBadge` already has a `full` tone (`bg-warning-tint`). |
| Q5 | Should shared-access (`role: 'shared'`) landlords be able to publish/unpublish? | **Yes, unchanged** — the API already authorises co-managers for property writes and the button never forked by role. |
| Q6 | Is the AI-context query (`routes/ai.ts`) part of R13? | **Yes** — it feeds boarder-facing answers, so a draft must not appear in them. |
| Q7 | What about `properties.status = 'occupied'`, which the docs mention but nothing writes? | **Leave the value in the docs' history, document the three live values** (R17); no data cleanup. |
| Q8 | Do we keep sending the whole form object (`...form`) or an explicit allow-list? | **Explicit allow-list** in one place (the new helper), so R2's “never sends `total_rooms`” is enforced by construction, not by remembering to delete a key. |
| Q9 | Where does the range in the OFF state come from — all live rooms or only available ones? | **All live rooms** (the number a landlord would call “the property's rooms”), with the count in the copy. |
| Q10 | Should the spec also update `qa-full-system-review-spec.md` / `report.md` rows that describe the old edit form? | **Yes, minimally** — one line each, in the implementation pass, so the QA ledger doesn't describe fields that no longer exist. |

**Risks worth naming:**

- **API vocabulary change (R/D15)** touches a payload four web surfaces read. The mitigation is that the API
  already sends `listing_moderation_status`, `total_rooms` and `occupied_rooms`, so the web can compute
  everything locally; the API tests that assert `active`/`inactive`/`full` must be updated in the same commit,
  and the admin console (which uses moderation) must be re-checked to prove it did not depend on the landlord
  translation.
- **R13 changes boarder-visible output** for rows whose `status` is not `available` today. The seeded demo data
  is all `available`, so the visible change is limited to listings a landlord has unpublished — which is the
  point — but the announcement/application/tenancy surfaces that key off a property should be spot-checked to
  ensure nothing else assumed “moderation published ⇒ visible”.
- **The PUT room path stays live (D21)**, so an older client could still create/delete rooms through it. If that
  is unacceptable, revisit D21 and delete the branch with its API tests.

---

## 10. Acceptance criteria

1. The Edit listing form shows exactly the D1 field set — no room-count or capacity input anywhere in it — and
   saves those fields in one submit (R1/R2/R6).
2. Saving this form provably does not touch a single room row, and the PUT it sends never carries the room
   fields (R2/R3), verified by an API test and by the browser spot-check in §7.5.4.
3. The pricing toggle behaves per D6/D7 (derived on load, read-only range when OFF, stored values preserved),
   and the required-field rules follow the toggle (R4/R5/R10).
4. Listing status offers Draft / Published / Unpublished, reads back the stored state correctly, shows the
   right hint in every moderation state, and only a rejected listing's Published resets moderation (R6–R9).
5. Boarders cannot see, save or reach a Draft or Unpublished listing anywhere (R13) — the §2.3 hole is closed
   with API tests that fail on today's code.
6. New listings are Drafts; the create page otherwise behaves exactly as before (R14).
7. Every landlord surface names the status the same way, and the `Full` badge never replaces the landlord's
   choice (R11).
8. The property detail page has no Unpublish button (R12), and the Rooms section, Photos card and Authorized
   landlords card are unchanged (R15).
9. All five gates in §7.4 pass, and the §7.5 walkthrough is completed at 1440px and 390px with no console
   errors.

---

## 11. Implementation record (2026-10-10)

All §7.4 gates green on the implemented tree: `web:typecheck` ✓ · `web:build` ✓ · `web:test` **249 pass / 0
fail** ✓ · `cf:api:typecheck` ✓ · `cf:api:test` **275 pass / 0 fail** ✓. No assertion was weakened.

**Walkthrough (§7.5) — 1440px + 390px, local D1, landlord `lina.santos@haven.demo` (owns properties 1 and 4):**

1. A Published listing's edit page shows **no `Number of rooms` / `Capacity per room`**; the Pricing toggle
   reads OFF for a mixed-rent property with the real range `Rent varies by room: ₱1,500 – ₱3,000 across 4
   rooms`; Listing status reads **Published** with no hint (R1/D6/D7).
2. Set **Unpublished**, save, reload: select reads Unpublished, the §9 Q3 note appears beside `Preview as
   boarder`, the landlord card flips to **Unpublished**, and the §2.3 hole is closed — `GET /api/rooms/public`
   drops the property and `GET /api/rooms/detail?id=4` returns **404** (R6/R13). Property 1, `hidden` with
   moderation `published`, was already absent from browse — the exact regression the specced API test targets.
3. Set **Published** again, save: visible again instantly (`/api/rooms/detail?id=4` → 200) with moderation
   still `published` — **no re-review** (D11).
4. **Rejected** (moderation set to `rejected`): the select reads Unpublished and the rejection hint shows;
   switching to **Published** and saving writes `listing_moderation_status = 'pending_review'` (R8/D12).
   The other two hint states were observed directly: `pending_review` → the awaiting-review copy; `published`
   → no hint (D10).
5. **Zero rooms** (a temporary property): the shared-pricing toggle defaults ON; publishing is **blocked**
   with the reason `Add at least one room before publishing — rooms are managed in the Rooms section below.`
   and no write lands (R9). The temporary row was removed afterwards.
6. The detail page's Public listing card has **no `Unpublish`**, keeps its pill and `Edit listing` (R12);
   the Photos card and Authorized landlords card behave as before (R15).

**Follow-up (2026-10-10, D27):** on request the inline `LandlordRoomList` block was then removed from the edit
form — it duplicated `Manage rooms` on the Overview pane. The form's headings are now `Basic information ·
Pricing · Location · Amenities · Listing status`, with only the Photos and Authorized-landlords cards below;
the Pricing `Manage rooms →` link routes to `/landlord/properties/$id/rooms`, and the rooms query remains
only to derive the shared-pricing state and the R9 publish precondition. Verified live at 1440px: no Rooms
heading, no `Edit room` links, the link lands on the rooms page. `web:typecheck` ✓ and `web:test` **249 pass / 0
fail** ✓ after the change (`edit-listing-property-info` source contract updated accordingly).
7. **390px:** the form is single-column with no overflow once the shell's sidebar is collapsed; with it
   expanded the page inherits the known shell caveat (`messages-feature-review` §12.10 — a fixed 288px rail
   that squeezes `main`), which every role page shares and which this change does not introduce (R16). No
   console errors originate from this page.

**Doc cleanups done in the same pass (R17/R18):** the status vocabulary is documented in
`docs/specs/schema.md`; the superseded `Unpublish` button is struck through with a supersession note in
`landlord-property-detail-page-spec.md` (D16/R13). The `room-drafts.ts` comment no longer references
edit-page defaults, and neither `docs/MANUAL.md` nor the QA ledgers enumerate the removed fields, so they
needed no edit (Q10).

**Deliberately not changed:** the PHP-compat `POST /api/landlord/listings/properties` alias keeps its explicit
`propertyStatus` pass-through (its test pins it); R14's draft default applies to the primary create path
(`POST /api/landlord/listings`), which is what the web create page uses.
