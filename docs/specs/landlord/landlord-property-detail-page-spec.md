# Spec — Landlord property detail page (mockup-matched console) + retiring the Listings page

**Status:** **Draft — spec only.** No code has been changed in this pass (D23). Nothing below is
implemented yet.
**Short name:** `landlord-property-detail-page`
**Date:** 2026-10-08
**Owner request (verbatim):**

> in http://localhost:3000/landlord/properties, after clicking any Property the UI of the Listing will be
> in that image , so it will not directly go to http://localhost:3000/landlord/listings/7/edit, so first it
> will see that image copy that design, and then the function will be then on the buttons like Manage rooms ,
> edit listing... etc... SO remove the Listing page beside the properties

**Reference screenshot (attached by the requestor, stored outside the repo).** A property detail console on
the cream page background:

- Breadcrumb line `Properties / Onda Boarding House`, then a large bold title `Onda Boarding House`, and a
  green pill button `Preview listing` at the top right. _(The muted subtitle `Manage your property, rooms, and
public rental information.` was removed in the 2026-10-10 redundant-copy sweep.)_
- A white bar with four tabs: **Overview** (active — mint pill, rounded), **Rooms**, **Public listing**,
  **Applications**. _(Screenshot history. The shipped bar drops **Rooms** — D26 — and keeps the other three;
  the active tab is the mint pill.)_
- Two white cards side by side:
  - **Property details** — a 2×2 grid: _Property type_ `Boarding house`, _Location_ `Malaybalay, Bukidnon`,
    then a hairline divider, _Rooms_ `20`, _Status_ (green pill) `Active`.
  - **Public listing** — a green `Published` pill at the top right, muted line
    ~~`This is the information boarders can see.`~~ _(removed in the 2026-10-10 redundant-copy sweep)_, then _Monthly rent_ `₱600`, _Amenities_
    `WiFi · Kitchen · Parking`, a divider, and two buttons: green solid `Edit listing`, outlined `Unpublish`.
- A full-width white card: **Room summary** with muted copy
  ~~`Manage room availability and occupancy separately from the public listing.`~~ _(removed in the 2026-10-10 redundant-copy sweep)_, two grey stat tiles
  (_Available rooms_ `8`, _Occupied rooms_ `12`) and an outlined `Manage rooms` button on the right.

Per D1 the screenshot is a **design reference** — its literal values are replaced with Haven Space data, but
its structure, wording and button placement are to be matched.

**Relationship to existing work:**

- Follows `landlord-properties-card-layout-spec.md` (`landlord-properties-card-layout`), which turned the
  landlord/admin property tables into the card list. That spec's **D5 said the whole card opens
  `/landlord/listings/$id/edit`** — this spec **supersedes D5**: the card now opens the property detail page,
  and the edit form moves behind an explicit button.
- Follows `landlord-properties-card-layout` **D22**, which made `/landlord/listings` and `/landlord/properties`
  the identical card list and kept both nav entries. This spec **supersedes D22**: the Listings page and its
  nav entry are removed (D2), leaving Properties as the single list.
- Reuses `admin-apple-ui-restructure`'s pill/`StatusBadge` language, the `Card` surface tokens, and the
  `?tab=` URL contract the admin console established (D4).
- Reuses `create-listing-room-details-spec`'s per-room model and `LandlordRoomList` for room management.
- The page header follows the `PageHeader` convention that each page names itself exactly once
  (`landlord-apple-ui-restructure` D7/D10/R7).

---

## 1. Interview decisions (as answered by the requestor)

Collected in **six rounds** of `ask_user`. Rows marked **(agent default)** are implementation choices
recorded here because the interview left them open; they are repeated in §8.

| #   | Topic                           | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | What the screenshot contributes | **The design.** Structure, headings, button placement and wording are matched; the literal values (property name, ₱600, 20 rooms, 8/12, "Malaybukay, Bukidnon") are illustrative and come from our API.                                                                                                                                                                                                                                                                                                                               |
| D2  | The Listings page               | **Delete the `/landlord/listings` index page and the "My Listings" sidebar entry.** The edit routes stay exactly where they are: `/landlord/listings/$id/edit`, `/landlord/listings/create`, `/landlord/listings/rooms/$id/edit` all keep working (see the requestor's note that the edit URL "is still there").                                                                                                                                                                                                                      |
| D3  | Card click destination          | **The new property detail page**, not the edit form. The card stops being a shortcut into the form.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| D4  | Detail page URL                 | **`/landlord/properties/$id`.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| D5  | Tab state                       | **URL-addressable `?tab=`, defaulting to Overview** — the same contract the admin console uses. Keys: `overview`, `rooms`, `public-listing`, `applications`.                                                                                                                                                                                                                                                                                                                                                                          |
| D6  | Trail / breadcrumb              | **A page-level trail rendered inside the detail page above the title**, matching the screenshot. `Topbar.tsx`'s path-derived trail is left untouched and keeps rendering alongside it.                                                                                                                                                                                                                                                                                                                                                |
| D7  | Trail wording per route         | Detail: `Properties / <Name>`. Rooms page: `Properties / <Name> / Rooms`. Edit page: `Properties / <Name> / Edit listing`.                                                                                                                                                                                                                                                                                                                                                                                                            |
| D8  | "Manage rooms"                  | **A new dedicated rooms page** at `/landlord/properties/$id/rooms` — explicitly _different_ from the listing edit form (basic information / pricing / capacity / status).                                                                                                                                                                                                                                                                                                                                                             |
| D9  | Rooms tab vs rooms page         | ~~**The Rooms tab IS the rooms page** — the tab navigates to `/landlord/properties/$id/rooms`.~~ **Superseded by D26.** There is still no separate Rooms pane on the detail page.                                                                                                                                                                                                                                                                                                                                                     |
| D10 | Tab scope                       | ~~**All four tabs are functional in this pass**~~ **Superseded by D26** — three tabs.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| D11 | Public listing card vs tab      | **Both exist and are different.** The Overview pane keeps the compact summary card from the screenshot (status, rent, amenities, `Edit listing`); the **tab holds the full read-only public view**. (`Unpublish` was part of this row until `edit-listing-property-info` D18/R12 removed it — see D16.)                                                                                                                                                                                                                               |
| D12 | Public listing tab contents     | **Title, description, photos, rent, deposit, amenities, house rules, status** — everything a boarder sees on `/rooms/$id`, read-only.                                                                                                                                                                                                                                                                                                                                                                                                 |
| D13 | Card-level affordances          | **Remove both the inline "Rooms" accordion and the "…" overflow menu.** The card becomes a pure entry point that opens the detail page.                                                                                                                                                                                                                                                                                                                                                                                               |
| D14 | Room summary numbers            | **`Available = total_rooms − occupied_rooms`, `Occupied = occupied_rooms`** — identical to the rollup the property cards already show, so the card and the detail page can never disagree.                                                                                                                                                                                                                                                                                                                                            |
| D15 | The "Published" pill            | **Extend the API detail response with the property's moderation status** (additive, no migration) so the pill reflects real publish state instead of a derived guess.                                                                                                                                                                                                                                                                                                                                                                 |
| D16 | "Unpublish"                     | ~~**Sets the property status to hidden/inactive via the existing `updateListing` API (`PUT /api/landlord/listings/:id`), guarded by a `ConfirmDialog`.**~~ **Superseded by `edit-listing-property-info` D18/R12:** the Public listing card's `Unpublish` button, its `ConfirmDialog` and the route's `updateListing` mutation are removed. Status now has exactly one control — the edit form's **Listing status** section — and the card keeps only its pill and `Edit listing` link.                                                |
| D17 | "Preview listing"               | **Opens the public boarder-facing page `/rooms/$id` in a new tab.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| D18 | Delete property                 | **On the detail page only**, in a clearly separated destructive zone. The list stays a clean entry point.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| D19 | Shared-access landlords         | **Identical page and buttons for every landlord with access.** The API already returns 403 where it matters; the UI does not fork.                                                                                                                                                                                                                                                                                                                                                                                                    |
| D20 | Zero-room property              | **Both tiles read `0`, plus a "No rooms yet" hint and `Manage rooms` as the primary call to action** — mirroring the card's existing "No rooms yet" wording.                                                                                                                                                                                                                                                                                                                                                                          |
| D21 | Applications tab data           | **Reuse `GET /api/landlord/applications` and filter client-side by `property_id`.** It returns every application for the landlord; each row already carries `property_id`.                                                                                                                                                                                                                                                                                                                                                            |
| D22 | Applications empty state        | **The existing `EmptyState` primitive** with a short "No applications yet" message.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| D23 | This pass                       | **Spec only.** No code changes, no migrations, no dependency changes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| D24 | Edit-page exits                 | **"Back to listings" and the Cancel button both go to `/landlord/properties/$id`**, and the header link is relabelled (it can no longer say "Back to listings" — that page is gone).                                                                                                                                                                                                                                                                                                                                                  |
| D25 | Verification bar                | **`web:typecheck` + `web:build` + the full `web:test` suite green**, updating every existing test the removal breaks, **plus new tests for the detail page**.                                                                                                                                                                                                                                                                                                                                                                         |
| D26 | Rooms tab removed               | **(added 2026-10-09, on request)** **The bar drops the Rooms entry.** The Overview pane already carries `Manage rooms`, so two controls led to the same page with the card one doing it better; the bar now lists its three panes only. `rooms` stays a **valid `?tab=` key** so bookmarked and hand-typed `?tab=rooms` links are forwarded to the rooms page instead of being reinterpreted as Overview. Enforced by a `PROPERTY_TAB_BAR_KEYS` constant — the bar renders that, the URL contract keeps the full `PROPERTY_TAB_KEYS`. |

---

## 2. Current state (verified 2026-10-08, read-only)

### 2.1 The routes in play

| Path                                | File                                                     | Today                                                                                                                                                                     |
| ----------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/landlord/properties`              | `apps/web/src/routes/landlord/properties.tsx` (46 lines) | `Protected role="landlord"` → `RoleShell` → `PageHeader` ("My properties", `+ Create listing`) → `LandlordPropertyCards`.                                                 |
| `/landlord/listings`                | `routes/landlord/listings.tsx` (12 lines)                | **Pathless layout** for the whole `/landlord/listings` subtree: `Protected` + `RoleShell` + `<Outlet />`. **Must stay** — the create/edit routes are its children.        |
| `/landlord/listings/`               | `routes/landlord/listings/index.tsx` (49 lines)          | The "My listings" page — `PageHeader` + the **identical** `LandlordPropertyCards`. **This is the page D2 deletes.**                                                       |
| `/landlord/listings/$id/edit`       | `routes/landlord/listings/$id/edit.tsx` (~544 lines)     | The edit form (Basic information / Pricing and capacity / Location / Amenities + Photos + rooms + authorized landlords), now with a sticky Save/Cancel footer. **Stays.** |
| `/landlord/listings/create`         | `routes/landlord/listings/create.tsx` (464 lines)        | Create form. **Stays.**                                                                                                                                                   |
| `/landlord/listings/rooms/$id/edit` | `routes/landlord/listings/rooms/$id/edit.tsx`            | Per-room edit. **Stays.**                                                                                                                                                 |

There is **no** `routes/landlord.tsx` layout route: `/landlord/properties` carries its own `RoleShell`, while
the `/landlord/listings` subtree gets one from `listings.tsx`. Adding sub-routes under `/landlord/properties`
therefore needs the same treatment the listings subtree already has.

### 2.2 The property card today

`apps/web/src/components/properties/PropertyCard.tsx` renders the card. Two of its affordances are removed by
D13, and its click target changes:

- the title is a **stretched link** (`after:absolute after:inset-0`) to `/landlord/listings/$id/edit` — D3
  repoints this to `/landlord/properties/$id`;
- an inline **"Rooms" accordion** (`aria-expanded={rooms.open}`, `aria-controls={rooms.id}`) wrapping
  `LandlordRoomList` — removed by D13;
- a **"…" `CardMenu`** with _Edit listing_ / _Delete property_ — removed by D13;
- a **checkbox** for admin bulk-select — admin surfaces are untouched, so this stays.

`apps/web/src/components/properties/LandlordPropertyCards.tsx` owns the query, the delete mutation, the
confirm dialog and the accordion state. With D13 that collapses to: query + card list + skeleton + empty.

### 2.3 The data available

`GET /api/landlord/properties` (`workers/api/src/routes/landlord/properties.ts`) serves both the list and the
detail, switched by the presence of `?id=`:

```
list  → id, name, type, description, address, latitude, longitude, city, province, price,
        status (active | full | inactive), role (owner | shared), total_rooms, occupied_rooms,
        monthly_revenue, created_at, amenities[], photos[], pending_applications
detail→ id, name, type, gender_preference, description, address, latitude, longitude, city,
        province, price, deposit, capacity ('' — always empty), min_stay, availability,
        status (active | inactive), role, total_rooms, rooms, occupied_rooms, created_at,
        amenities[], photos[], rules, monthlyPayment, monthlyDeposit, advancePayment,
        authorized_landlords (owner only)
```

`status` on the list is **computed** (`mapListStatus`): a `rejected` moderation status → `inactive`;
`occupied_rooms >= total_rooms` (with rooms > 0) → `full`; otherwise `active`. The detail's `status` is the
raw column mapped `available → active`, `hidden → inactive` (`mapDetailStatus`).

**The gap D15 closes:** neither the list nor the detail response exposes
`properties.listing_moderation_status`, so the screenshot's green **"Published"** pill has no data source
today. The column exists in the schema (it is what `mapListStatus` reads) — it simply is not selected.

`GET /api/landlord/applications` (`workers/api/src/routes/applications.ts` →
`listLandlordApplications`) returns **every** application across every property the landlord can access,
with `property_id` on each row, and takes **no** query parameters. D21 filters it client-side.

`GET /api/landlord/rooms?id=` (`LandlordRoomListResponse`) already returns a per-property rollup —
`property.total_rooms` and `property.occupied_rooms` — alongside the room rows, which is the data the
`Room summary` card and the rooms page both need.

### 2.4 Shell pieces to reuse

- `PageHeader` (`icon`, `title`, `subtitle`, `actions`) — the detail page's title block.
- `Card` — `rounded-2xl border border-border bg-surface shadow-card`, with the `padding` prop added in the
  edit-page pass (`padding="p-0"` lets a card own its own internal rows).
- `RoleShell` — `max-w-[1280px]` content column inside `main`.
- `Topbar` / `Breadcrumbs` — `buildTrail(pathname, search)` maps **URL segments only** and explicitly skips
  numeric ids (`if (/^\d+$/.test(segment)) continue;`), so it _cannot_ render a property name. D6 is why the
  trail is page-level.
- `Button` / `buttonClasses` (`primary`, `outline`, `ghost`, `danger`, `dangerGhost`, …), `ConfirmDialog`,
  `EmptyState`, `ErrorState`, `Skeleton`, `Spinner`, `StatusBadge`, `Toast`.
- `LandlordRoomList` — the existing add/edit/delete room manager, embedded today in the card accordion (D13
  removes that home; D8/D9 give it the rooms page instead).

---

## 3. Target design (from the screenshot)

### 3.1 Detail page — `/landlord/properties/$id`

```
Properties / Onda Boarding House                        ← page-level trail (D6), "Properties" is a link
Onda Boarding House                                     ← h1
Manage your property, rooms, and public rental information.   ← muted subtitle
                                            [ Preview listing ]  ← green pill button, new tab (D17)
┌──────────────────────────────────────────────────────────────────────────┐
│  ( Overview )   Public listing    Applications                            │  ← tab bar (D4/D5/D26 — panes only)
└──────────────────────────────────────────────────────────────────────────┘
┌───────────────────────────────────┐  ┌───────────────────────────────────┐
│ Property details                  │  │ Public listing      [ Published ] │
│ Property type       Location      │  │ This is the information boarders  │
│ Boarding house      Malaybukay…   │  │ can see.                          │
│ ─────────────────────────────────  │  │ Monthly rent      Amenities       │
│ Rooms               Status        │  │ ₱600              WiFi · Kitchen…  │
│ 20                  (Active)      │  │ ─────────────────────────────────  │
│                                   │  │ [ Edit listing ]                  │
└───────────────────────────────────┘  └───────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────┐
│ Room summary                                                              │
│ (description removed — 2026-10-10 redundant-copy sweep)                 │
│ ┌──────────────┐ ┌──────────────┐                        [ Manage rooms ] │
│ │Available     │ │Occupied      │                                         │
│ │8             │ │12            │                                         │
│ └──────────────┘ └──────────────┘                                         │
└──────────────────────────────────────────────────────────────────────────┘
```

- Two columns side by side on `lg`+; **stacked** below that (agent default, §8 Q4).
- The detail page uses the shell's full `max-w-[1280px]` column — **not** the 800px form width.
- Stat tiles are muted-grey (`bg-subtle`) rounded surfaces with a small label above a larger number.
- The `Property details` card's 2×2 grid is split by a hairline rule between the two rows, per the screenshot.
- The `Status` value is a pill. Reusing the existing landlord vocabulary (`listingPill`) keeps one pill
  language across the card list and this page (agent default, §8 Q2).
- Buttons sit at the **bottom** of the `Public listing` card, separated by a rule, exactly as drawn.

### 3.2 The tabs

| Tab            | Key              | Pane                                                                                                                                      |
| -------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Overview       | `overview`       | The three cards above — including `Manage rooms`, the rooms page's entry point (D26).                                                     |
| Public listing | `public-listing` | The full read-only public view (D12) + `Edit listing` (the `Unpublish` button was removed by `edit-listing-property-info` D18/R12 — D16). |
| Applications   | `applications`   | This property's applications, filtered from `GET /api/landlord/applications` (D21); `EmptyState` when none (D22).                         |

`rooms` remains a valid `?tab=` key with no tab of its own (D26): `/landlord/properties/$id?tab=rooms` redirects to the rooms page below.

### 3.3 Rooms page — `/landlord/properties/$id/rooms`

Trail `Properties / <Name> / Rooms` (D7), the property name as the heading, and the room manager (D8). The
requestor's note — _"the manage rooms is now different, not the same with the Basic information … Status"_ —
is the reason this is **its own page** rather than another section of the listing edit form.

### 3.4 Edit page changes

Only its exits change (D24): the header link relabels and both it and Cancel navigate to
`/landlord/properties/$id`. The form itself (sections, sticky footer, photos, rooms, authorized landlords)
is untouched by this spec.

---

## 4. Requirements

**R1.** Clicking a property card anywhere it is rendered opens `/landlord/properties/$id`. The stretched-link
pattern (`after:absolute after:inset-0`) is kept.
**R2.** `routes/landlord/listings/index.tsx` is deleted; `routes/landlord/listings.tsx` (the layout) stays.
**R3.** The `My Listings` entry is removed from `LANDLORD_NAV` in `apps/web/src/lib/nav.ts`.
**R4.** Every surviving reference to `/landlord/listings` as a _page_ is repointed — notably
`routes/landlord/index.tsx` (two links), `routes/landlord/listings/create.tsx` (post-create navigation and
its back link), and the edit page's exits (D24). References to `/landlord/listings/$id/edit`,
`/landlord/listings/create` and `/landlord/listings/rooms/$id/edit` are **unchanged**.
**R5.** `/landlord/properties/$id` renders the layout in §3.1 with a page-level trail (D6) whose wording
follows D7.
**R6.** The tab bar is URL-addressable via `?tab=` with `overview` as the default (D4/D5); an unrecognised or
absent value lands on Overview and never on a blank pane, mirroring `toAdminSectionKey`.
**R7.** The bar renders the three pane tabs and no Rooms entry (D26); `Manage rooms` on the Overview pane navigates
to `/landlord/properties/$id/rooms` (D8), and `?tab=rooms` still resolves there rather than to Overview.
**R8.** The Public listing tab renders title, description, photos, rent, deposit, amenities, house rules and
status, read-only (D12).
**R9.** The Applications tab lists this property's applications and shows `EmptyState` when there are none
(D21/D22).
**R10.** `Room summary` uses `Available = total_rooms − occupied_rooms` and `Occupied = occupied_rooms`
(D14), with the zero-room treatment from D20.
**R11.** `Manage rooms` navigates to `/landlord/properties/$id/rooms` (D8).
**R12.** `Preview listing` opens `/rooms/$id` in a new tab (`target="_blank"` + `rel="noreferrer"`), D17.
**R13.** ~~`Unpublish` sets the listing to hidden/inactive through `updateListing` behind a `ConfirmDialog`,
then invalidates the property queries so the page and the card list agree (D16).~~ **Superseded by
`edit-listing-property-info` D18/R12** — the button, its dialog and the mutation are removed (D16); the edit
form's Listing status control is the single place a listing's visibility is chosen.
**R14.** Deleting a property is available on the detail page in a visually separated destructive zone,
reusing the existing `ConfirmDialog` copy and the existing `deleteProperty` mutation (D18).
**R15.** The property card loses its inline Rooms accordion and its "…" menu (D13); `LandlordPropertyCards`
drops the accordion state, the delete mutation and the menu props it no longer needs. The admin bulk-select
checkbox and the admin surface are untouched.
**R16.** The API detail response gains the property's moderation status, additive and with no migration
(D15). The list response is unchanged unless the same field is needed there.
**R17.** The detail page renders for shared-access landlords with the same controls as an owner (D19).
**R18.** Loading uses the existing skeleton/spinner primitives; a failed load uses `ErrorState`; a missing or
forbidden property renders a not-found/forbidden state rather than a blank page.
**R19.** Everything works at 390px (single column) and 1440px (two columns), with visible keyboard focus on
every control and no horizontal overflow introduced by this page.

---

## 5. Files this will touch

**New**

| File                                                                                                                 | Purpose                                                                                       |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `apps/web/src/routes/landlord/properties.tsx` → converted to a **layout** (or `properties/index.tsx` + a new layout) | R2/R5 — the `/landlord/properties` subtree needs an outlet before `$id` children can exist.   |
| `apps/web/src/routes/landlord/properties/$id/index.tsx` (or `$id.tsx`)                                               | The detail page (§3.1).                                                                       |
| `apps/web/src/routes/landlord/properties/$id/rooms.tsx`                                                              | The rooms page (§3.3).                                                                        |
| `apps/web/src/components/properties/PropertyDetailHeader.tsx` _(optional)_                                           | Trail + title + subtitle + `Preview listing`, so the detail and rooms pages share one header. |
| `apps/web/src/components/properties/PropertyOverviewCards.tsx` _(optional)_                                          | The three Overview cards, so the pane stays readable.                                         |
| `apps/web/src/components/properties/PropertyTabs.tsx`                                                                | The `?tab=` bar, modelled on the admin console's tab contract.                                |

**Edited**

| File                                                                                                                      | Change                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `apps/web/src/lib/nav.ts`                                                                                                 | Drop the `My Listings` item (R3).                                                                  |
| `apps/web/src/components/properties/PropertyCard.tsx`                                                                     | Repoint the stretched link (R1); delete the accordion + menu props/render (R15).                   |
| `apps/web/src/components/properties/LandlordPropertyCards.tsx`                                                            | Drop accordion state, delete mutation, confirm dialog, menu wiring (R15).                          |
| `apps/web/src/routes/landlord/index.tsx`                                                                                  | Repoint two `/landlord/listings` links (R4).                                                       |
| `apps/web/src/routes/landlord/listings/create.tsx`                                                                        | Repoint post-create navigation + back link (R4).                                                   |
| `apps/web/src/routes/landlord/listings/$id/edit.tsx`                                                                      | Relabel the header link and repoint it and Cancel to the detail page (R4/D24).                     |
| `apps/web/src/routes/landlord/properties.tsx`                                                                             | Becomes the subtree layout; its header/empty state move into the index page.                       |
| `apps/web/src/lib/types.ts`                                                                                               | Add the moderation-status field to the detail response type (R16).                                 |
| `workers/api/src/routes/landlord/properties.ts`                                                                           | Select and return the moderation status in `formatLandlordPropertyDetail` (R16).                   |
| `apps/web/src/lib/nav.ts`, `apps/web/test/properties-card-layout.test.tsx`, `apps/web/test/create-listing-rooms.test.tsx` | Tests asserting the removed page, accordion and menu (see §6).                                     |
| `apps/web/src/routeTree.gen.ts`                                                                                           | **Generated** — regenerate with `bun run web:build`, never hand-edit (it is in `.prettierignore`). |

**Deleted**

| File                                              | Reason                                 |
| ------------------------------------------------- | -------------------------------------- |
| `apps/web/src/routes/landlord/listings/index.tsx` | D2 — the duplicate "My listings" page. |

---

## 6. Verification (D25)

**Commands:** `bun run web:typecheck`, `bun run web:build`, `bun run web:test`,
`bun run cf:api:typecheck`, `bun run cf:api:test` (the API change is additive), and
`bunx prettier --check` on every touched file.

**Existing tests expected to break and need updating** (verified by reading them, not guessed):

- `apps/web/test/properties-card-layout.test.tsx`
  - `the title carries the stretched link while the controls sit above it (D13)` asserts the card contains
    `aria-expanded={rooms.open}` and `aria-controls={rooms.id}` — the accordion this spec deletes.
  - `both landlord surfaces render the shared card list and no table` asserts **both**
    `/landlord/properties` and `/landlord/listings` render `LandlordPropertyCards` — one of those pages goes
    away.
  - `the landlord card list owns the delete flow and the inline rooms accordion` asserts exactly what R15
    removes.
  - The pure-helper tests (`listingPill`, `moderationPill`, `propertyAddress`, `landlordFacts`,
    `occupancyLabel`) are **unaffected** and must stay green.
- `apps/web/test/create-listing-rooms.test.tsx` — its `PropertiesSection.tsx` contract test is unrelated to
  this change, but the file is the natural home for the new rooms-page coverage.
- `apps/web/test/routes.test.ts` — imports `LANDLORD_NAV` but only asserts nothing points at the retired
  browse URL, so removing the `My Listings` item does **not** break it; it should still be run and reviewed.

**New tests to add:** the trail wording per route (D7); `?tab=` parsing including the unknown-value fallback
(R6); the `Available = total − occupied` rollup and the zero-room wording (R10/D20); and the room-summary
copy. Follow the repo's existing split — pure helpers asserted directly, page contracts asserted against the
source where a full render is impractical.

**Manual walkthrough:** `/landlord/properties` → click a card → detail page; each tab; `Manage rooms`; the
rooms page and back; `Preview listing` opening `/rooms/$id` in a new tab; `Unpublish` behind its confirm
dialog and the resulting pill; delete from the destructive zone; the detail page for a property with zero
rooms — at **390px** and **1440px**.

---

## 7. Out of scope

- The listing **edit** form and the **create** form (only their exits move — D24).
- `LandlordRoomList`'s internals; this spec changes where it lives, not what it does.
- The admin console's property section, its bulk-select and its moderation controls.
- The public boarder-facing `/rooms/$id` page.
- Any new migration, dependency or design token (D23).

---

## 8. Open questions and agent defaults

These were left open by the interview. Items marked **(agent default)** will be implemented as stated unless
overridden; the rest are genuinely unresolved.

1. **Deep links to the old page.** `/landlord/listings` will 404 once `index.tsx` is deleted. Should the
   route instead redirect to `/landlord/properties` so old bookmarks survive? _(Unresolved — the requestor
   chose plain deletion over the redirect option.)_
2. **The `Status` pill vocabulary in `Property details`.** **(agent default)** reuse `listingPill`
   (`Available` / `Full` / `Inactive`) rather than inventing a second pill language next to the
   `Published` pill on the neighbouring card. Worth confirming, since the two pills then read differently
   for the same property (`Active` vs `Published`).
3. **Which moderation values map to the `Published` pill.** **(agent default)** `published` → green
   `Published`; `pending_review` → amber `Pending review`; `rejected` / `flagged` → red; anything else
   falls back to a neutral de-snake-cased label — i.e. exactly the existing `moderationPill` helper.
4. **Responsive breakpoint for the two Overview cards.** **(agent default)** side by side at `lg` (≥1024px),
   stacked below, following the shell's own `lg` pin.
5. **Tile vs slot semantics for `Occupied rooms`.** **(agent default)** `Occupied = occupied_rooms`
   (occupied _rooms_), matching D14 — explicitly **not** the sum of occupied _slots_, which the in-flight
   room-occupancy work would otherwise make tempting.
6. **Where `Add room` is centred.** **(agent default)** the rooms page hosts `LandlordRoomList` unchanged,
   so its existing `+ Add room` button is the entry point; no new room-creation UI is designed.
7. **Tab bar keyboard model.** **(agent default)** follow the existing admin console tab implementation
   rather than introducing a new ARIA tabs pattern.
