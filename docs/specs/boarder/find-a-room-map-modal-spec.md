# Spec — Find a Room Map as a Modal (+ shared Modal hardening)

**Status:** **Implemented and verified** (2026-09-30) — 115 unit tests pass, `web:typecheck` clean, and
36 checks passed driving real Chrome. See §9 for the bugs the browser check caught and §11 for what
shipped.

> **Partly superseded (2026-09-30).** `modal-desktop-width` replaced **D4**'s `md` panel with `xl`, and
> `hero-map-modal` reversed **D1**/§8 for the home hero — it now opens the same `MapModal` as a
> **view-only** dialog, and `/public-maps` (this spec's other "keeps navigating" surface) was deleted
> outright. Everything else here still stands: the shared `Modal` hardening, the `/boarder/maps`
> deletion, and the mount-on-open rule are what every other map surface relies on.

**Short name:** `find-a-room-map-modal`
**Date:** 2026-09-30
**Owner request (verbatim):**

> in boarder page, in when the map is lcick should just open in http://localhost:3000/find-a-room, not
> in anothr pages, it would be good if its just a modal not page, in border pages find a room,
> because right now the map opens in new page, make it a modal in http://localhost:3000/find-a-room

**Relationship to existing work:** three earlier specs already built the map pieces this reuses —
`auth-hero-map-locale` (one shared locale module), `map-use-location` (`useMapLocation` +
`MapLocationControl` + a runtime-coordinate URL builder), and `public-maps-view-only` (a read-only map
plus the "interactive map lives elsewhere" pattern). This spec changes **where the interactive map is
hosted** for the browse page, and hardens the shared `Modal` it is hosted in. It does **not** change
any of those three deliverables' behaviour.

---

## 1. Interview decisions (as answered by the requestor)

| #   | Topic                                      | Decision                                                                                                                                                                                                                                         |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Which trigger becomes a modal              | **Only the "Map" button on `/find-a-room`.** The home hero, `/public-maps` CTA and the landlord sidebar keep navigating. **(Superseded for the hero by `hero-map-modal` D1 — the hero opens a view-only dialog and `/public-maps` is deleted.)** |
| D2  | Modal contents                             | **The interactive map, with the "Use my location" control** — the same behaviour `/maps` has today.                                                                                                                                              |
| D3  | The existing map pages                     | **Keep every map page as-is** — _later refined for one route by D19._                                                                                                                                                                            |
| D4  | Modal size                                 | **`md`** (`max-w-lg`, i.e. 512px) — the shared `Modal`'s existing default.                                                                                                                                                                       |
| D5  | Map frame inside the modal                 | **`w-full h-[60vh]`** — the same portrait ratio `/maps` uses.                                                                                                                                                                                    |
| D6  | Modal open state                           | **Local component state only.** No query param, no hash; browser Back leaves `/find-a-room`.                                                                                                                                                     |
| D7  | Geolocation preference                     | **Shared with `/maps`, and it auto-applies when the modal opens.** An opted-in user sees their position immediately.                                                                                                                             |
| D8  | Modal heading                              | **"Find boarding houses near you"** (fixed — not the `/maps` heading, not a state-dependent string).                                                                                                                                             |
| D9  | Shared `Modal` accessibility gaps          | **Fix both in the shared component** — add a body scroll lock _and_ a focus trap + focus restore, benefiting all six existing modal surfaces.                                                                                                    |
| D10 | The "Map" affordance markup                | **Identical look, becomes a `<button type="button">`** instead of `<Link to="/maps">`.                                                                                                                                                           |
| D11 | Mobile                                     | **Same centered modal everywhere.** No bottom sheet, no near-fullscreen special case.                                                                                                                                                            |
| D12 | Boarders                                   | **The modal replaces `/boarder/maps` for boarders** — the sidebar has no Map entry anyway, so that page was reachable only by typing the URL.                                                                                                    |
| D13 | Test placement (map feature)               | **Extend `apps/web/test/maps.test.ts`.**                                                                                                                                                                                                         |
| D14 | Regression coverage for the `Modal` change | **Unit tests for `Modal` itself** (its scroll lock, focus trap and focus restore).                                                                                                                                                               |
| D15 | Filter changes while open                  | **Nothing — the modal is independent.** Changing filters or submitting a search does not close it.                                                                                                                                               |
| D16 | `Modal` DOM freedom                        | **Keep the current DOM structure.** No portal, no restructuring of the overlay/panel; add behaviour only.                                                                                                                                        |
| D17 | Reuse                                      | **`MapEmbed` + `MapLocationControl` + `useMapLocation` unchanged** — the modal is a new host for the exact same pieces.                                                                                                                          |
| D18 | Mounting                                   | **Mount the map body only when the modal is open** — no geolocation work, and no iframe, on page load.                                                                                                                                           |
| D19 | `/boarder/maps`                            | **Delete the route** (chosen over keeping it orphaned or redirecting it). Supersedes D3 for this one route.                                                                                                                                      |
| D20 | New component                              | **`apps/web/src/components/rooms/MapModal.tsx`** — generically named, though only `/find-a-room` hosts it today.                                                                                                                                 |
| D21 | Link to the full map page                  | **None.** The dialog is the destination; no "Open full map" action inside it.                                                                                                                                                                    |
| D22 | State owner                                | **`FindARoomContent`** holds `open`/`onClose`; the modal component is presentational.                                                                                                                                                            |
| D23 | Deliverables / git                         | **Changes stay uncommitted**, same convention as the earlier specs.                                                                                                                                                                              |

---

## 2. Current state (verified 2026-09-30)

### 2.1 The broken path

`apps/web/src/components/rooms/FindARoomContent.tsx` line ~358, inside the search `<form>`:

```tsx
<Link
  to="/maps"
  className="inline-flex items-center gap-2 rounded-xl border border-primary px-4 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-mint"
  title="View Map"
>
  <img src="/assets/svg/maps.svg" alt="" width={20} height={20} className="shrink-0" />
  Map
</Link>
```

Clicking it **navigates away** from `/find-a-room` to `/maps` — a full page load out of `PublicLayout`,
losing the search box, filters and results scroll position. That is exactly what the request objects to.

### 2.2 The boarder path is the same page

`apps/web/src/routes/boarder/find-a-room/index.tsx`:

```tsx
beforeLoad: () => { throw redirect({ to: BROWSE_LISTINGS_PATH, replace: true }); },
```

i.e. **`/boarder/find-a-room` redirects to `/find-a-room`** (spec `boarder-find-a-room-redirect`).
There is no boarder-specific browse grid, so "the boarder page's Find a Room" and `/find-a-room` are
the same surface, and fixing the button once fixes it for boarders. (The boarder shell's
`RoleShell`/sidebar is therefore _not_ present on that page — it renders in `PublicLayout`.)

### 2.3 The map pieces being reused (all unchanged by this spec)

| Piece                                 | File                                      | What it gives the modal                                                                               |
| ------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `useMapLocation`                      | `lib/use-map-location.ts`                 | `{ status, coordinates, supported, useMyLocation, reset }`; auto-applies a remembered opt-in on mount |
| `MapLocationControl`                  | `components/rooms/MapLocationControl.tsx` | The toolbar row: "Use my location" / "Locating…" / reset; renders `null` when unsupported             |
| `MapEmbed`                            | `components/rooms/MapEmbed.tsx`           | The `<iframe>`, `url ?? DEFAULT_MAP_URL`                                                              |
| `mapSubtitle()` / `LOCATION_SUBTITLE` | `components/rooms/MapEmbed.tsx`           | The two subtitle strings every map surface shares                                                     |
| `mapUrlForCoordinates()`              | `lib/maps.ts`                             | Runtime-coordinate Google embed at `z=15`                                                             |

`routes/maps.tsx` is the reference implementation the modal mirrors — header, control row, then a
`w-full h-[60vh]` frame.

### 2.4 The shared `Modal` (and its documented gaps)

`apps/web/src/components/ui/Modal.tsx`:

```tsx
export function Modal({ open, title, onClose, children, size = 'md' }) {
  // Trap focus / close on escape can be added, basic is close on esc
  useEffect(() => { /* window keydown → onClose on Escape */ }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div ... className="fixed inset-0 bg-black/20 backdrop-blur-md" onClick={onClose} />
          <motion.div ... className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl ..." onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2>{title}</h2>
              <button aria-label="Close" onClick={onClose}>…</button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
```

Sizes: `md: max-w-lg`, `lg: max-w-2xl`, `xl: max-w-4xl`. It already closes on Escape, backdrop click
and the X. It does **not** lock body scroll, does **not** trap focus, and does **not** restore focus.

**Blast radius of touching it — six call sites:**

| File                                          | Usage          |
| --------------------------------------------- | -------------- |
| `components/admin/LandlordDocumentsModal.tsx` | lines 163, 306 |
| `routes/boarder/announcements.tsx`            | line 103       |
| `routes/boarder/tenancy.tsx`                  | line 142       |
| `components/rooms/LandlordRoomList.tsx`       | line 162       |
| `routes/landlord/announcements.tsx`           | line 201       |
| `routes/landlord/boarders.tsx`                | line 300       |

### 2.5 What deleting `/boarder/maps` touches

| Reference                                                                                      | Action                                                                     |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `apps/web/src/routes/boarder/maps.tsx`                                                         | **delete**                                                                 |
| `apps/web/src/routeTree.gen.ts`                                                                | regenerate (`bun run web:build`) — 10 references today                     |
| `apps/web/test/maps.test.ts`                                                                   | lines 42 and 305: two arrays list `routes/boarder/maps.tsx`                |
| `apps/web/src/lib/maps.ts`                                                                     | module doc comment names the route — stale prose, update                   |
| `report.md`, `docs/qa/specs/qa-spec-audit.md`, `qa-full-system-review-spec.md`, `docs/plans/…` | **historical, leave alone**                                                |
| `lib/nav.ts` / `lib/use-boarder-nav.ts`                                                        | already have **no** boarder map entry — nothing to remove                  |
| `components/layout/Topbar.tsx`                                                                 | `maps: 'Map view'` breadcrumb label — keep (still serves `/landlord/maps`) |

---

## 3. Requirements

### 3.1 Shared `Modal` hardening (D9, D16)

- **R1.** While `open`, the modal **locks page scroll**: the document behind must not scroll. The
  previous value must be recorded and restored on close **and on unmount**.
- **R2.** While `open`, **focus is trapped** inside the panel: `Tab` past the last focusable element
  wraps to the first, and `Shift+Tab` from the first wraps to the last. The close button and the map
  `<iframe>` are both focusable and must be part of the cycle.
- **R3.** On open, focus **moves into the panel** (the close button is the natural first stop). On
  close, focus **returns to the element that was focused before opening** — for this feature, the
  "Map" button on `/find-a-room`.
- **R4.** The **DOM structure is unchanged**: no portal, no new wrapper elements, the overlay/panel
  split and `AnimatePresence` stay exactly as they are. Only behaviour (listeners, refs, effects) is
  added.
- **R5.** Everything the modal already does keeps working: Escape closes, backdrop click closes, a
  click inside the panel does **not** close, `size` still selects `md`/`lg`/`xl`, the spring/scale
  animation is untouched.
- **R6.** All new browser-API access (`document`, `window`, focus, scroll) stays **inside effects** or
  event handlers, so the shared component remains server-renderable.

### 3.2 The map modal (D2, D8, D17, D18, D20, D21, D22)

- **R7.** New `apps/web/src/components/rooms/MapModal.tsx` exporting
  `MapModal({ open, onClose }: { open: boolean; onClose: () => void })`.
- **R8.** It renders the shared `Modal` with the **fixed title `"Find boarding houses near you"`** and
  no `size` prop (the default `md` is what was chosen — D4). It adds **no** footer, no "open full map"
  action and no extra buttons (D21).
- **R9.** The body reuses the existing pieces **unchanged** (D17), mirroring `routes/maps.tsx`:

  ```tsx
  const location = useMapLocation();
  const pin = location.coordinates;

  <p className="mb-3 text-sm text-gray-ink">{pin ? LOCATION_SUBTITLE : mapSubtitle()}</p>
  <MapLocationControl state={location} />
  <MapEmbed
    title="Haven Space map"
    heightClass="h-[60vh]"
    url={pin ? mapUrlForCoordinates(pin.latitude, pin.longitude) : undefined}
  />
  ```

  `useMapLocation` is called with **no `autoApply` override**, so the shared preferences behave exactly
  as on `/maps` (D7) — a remembered opt-in auto-applies when the modal mounts.

- **R10.** **Mount on open (D18).** The hook, the control and the iframe must only come into existence
  when the modal is open. This is structural, not merely visual: a component holding the hook must not
  be rendered while `open` is false, so a remembered opt-in cannot trigger a geolocation lookup on
  page load. Suggested shape:

  ```tsx
  export function MapModal({ open, onClose }) {
    return (
      <Modal open={open} title={MAP_MODAL_TITLE} onClose={onClose}>
        {open ? <MapModalBody /> : null}
      </Modal>
    );
  }
  ```

  **Consequence to accept:** because the child is dropped the moment `open` flips false, the map frame
  disappears at the start of the panel's ~400 ms exit animation instead of fading with it. Judged worth
  it for the hard guarantee; see §9.1.

- **R11.** `FindARoomContent` owns the state (D22): `const [mapOpen, setMapOpen] = useState(false)`, and
  renders `<MapModal open={mapOpen} onClose={() => setMapOpen(false)} />` once, near the end of its tree.
- **R12.** The "Map" affordance (D10) becomes a `<button type="button">` that calls
  `setMapOpen(true)`. It **keeps its current look** — same classes, same `/assets/svg/maps.svg` icon,
  same "Map" label, same `title="View Map"` — and **stops being a `Link`**, so the `@tanstack/react-router`
  `Link` import may become unused in that file (remove it if so).
- **R13.** Nothing else on `/find-a-room` changes: the search form, filters, view toggle, result grid,
  empty/loading/error states and the listing cards are untouched (D15).

### 3.3 Delete `/boarder/maps` (D19)

- **R14.** Delete `apps/web/src/routes/boarder/maps.tsx` and regenerate `routeTree.gen.ts`.
- **R15.** Update every non-historical reference: the two arrays in `apps/web/test/maps.test.ts`
  (which must drop the file and, where the list means "surfaces that render the location control", may
  add the new modal instead) and the stale route list in `lib/maps.ts`'s module comment.
- **R16.** No redirect is added — a bookmarked `/boarder/maps` becomes a 404, which is the chosen
  trade-off (D19). Boarders reach the map through the `/find-a-room` modal.

---

## 4. Files to change

| #   | File                                                 | Change                                         |
| --- | ---------------------------------------------------- | ---------------------------------------------- |
| 1   | `apps/web/src/components/ui/Modal.tsx`               | R1–R6 (scroll lock, focus trap, focus restore) |
| 2   | `apps/web/src/components/rooms/MapModal.tsx`         | **new** — R7–R10                               |
| 3   | `apps/web/src/components/rooms/FindARoomContent.tsx` | R11–R13 (state, modal, `Link` → `button`)      |
| 4   | `apps/web/src/routes/boarder/maps.tsx`               | **delete** (R14)                               |
| 5   | `apps/web/src/routeTree.gen.ts`                      | regenerate (R14)                               |
| 6   | `apps/web/src/lib/maps.ts`                           | stale comment only (R15)                       |
| 7   | `apps/web/test/maps.test.ts`                         | extend + fix the two route arrays (R15, R17)   |
| 8   | `apps/web/test/modal.test.tsx`                       | **new** — the `Modal` unit tests (D14)         |

**No** new dependency (no focus-trap or portal package), **no** API/worker/migration change, **no**
change to `useMapLocation`, `geolocation.ts`, `MapEmbed`, `MapLocationControl`, `MapLocationControl`'s
labels, `lib/maps.ts`'s builders, or any other map page.

---

## 5. Exact resulting values

| Item               | Value                                                                     |
| ------------------ | ------------------------------------------------------------------------- |
| Modal size         | `md` → `max-w-lg` (512px)                                                 |
| Map frame          | `w-full h-[60vh]`, `title="Haven Space map"`                              |
| Modal title        | `Find boarding houses near you`                                           |
| Subtitle, default  | `Browse boarding houses around Malaybalay, Bukidnon.` (`mapSubtitle()`)   |
| Subtitle, tracking | `Showing boarding houses around your location.` (`LOCATION_SUBTITLE`)     |
| Trigger            | `<button type="button">` with `maps.svg`, label `Map`, `title="View Map"` |
| Control labels     | `Use my location` / `Locating…` / `Reset to Malaybalay` (unchanged)       |
| Modal open state   | `useState` inside `FindARoomContent` — not in the URL                     |
| `/boarder/maps`    | deleted (404)                                                             |

---

## 6. Edge cases

| Case                                                                                  | Expected behaviour                                                                                                                                               |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/find-a-room` first load, modal never opened                                         | **No geolocation call at all** and **no map iframe in the DOM** — not even for an opted-in user (R10).                                                           |
| Opted-in user opens the modal                                                         | The map opens already on their coordinates at `z=15`, subtitle is `LOCATION_SUBTITLE`, control is active (D7).                                                   |
| Non-opted-in user opens the modal                                                     | Malaybalay at `z=13`; clicking "Use my location" requests permission exactly as `/maps` does.                                                                    |
| Modal closed while a lookup is in flight                                              | The body unmounts; `useMapLocation`'s mounted/in-flight guards discard the result — no state update after unmount.                                               |
| Close, then reopen                                                                    | A fresh hook instance; a remembered opt-in auto-applies again. No stale coordinates carried over.                                                                |
| Close via Escape / X / backdrop                                                       | All three work and all three return focus to the "Map" button (R3).                                                                                              |
| **Escape while focus is inside the map iframe**                                       | The iframe swallows key events, so Escape may not reach the document — the modal will not close that way. The X and the backdrop still work. Accepted; see §9.2. |
| **Tab from the panel into the iframe**                                                | The iframe is a focusable stop inside the panel and must be part of the trap's cycle, otherwise Tab escapes the dialog and the trap is meaningless (R2).         |
| Two modals open at once (not possible on `/find-a-room` today, but `Modal` is shared) | The scroll lock must record and restore the previous value without stranding `overflow: hidden` on `document.body` when the inner modal closes (R1).             |
| Modal closed, then the page unmounts (route change)                                   | Scroll lock released on unmount, not only on close (R1).                                                                                                         |
| Filter changed / search submitted while open                                          | The modal stays open, unchanged — it is independent of results (D15).                                                                                            |
| Results are empty / still loading                                                     | Irrelevant: the button and modal do not depend on the result set.                                                                                                |
| `/boarder/find-a-room` typed by a signed-in boarder                                   | Still redirects to `/find-a-room`; the boarder sees the same modal. Unchanged.                                                                                   |
| Bookmarked `/boarder/maps`                                                            | 404 (D19, R16).                                                                                                                                                  |
| Signed-out visitor on `/find-a-room`                                                  | Same modal; the map is a public Google embed and needs no session.                                                                                               |
| `navigator.geolocation` missing / insecure context                                    | `MapLocationControl` renders `null`; the modal shows the map with no location row.                                                                               |
| SSR of `/find-a-room`                                                                 | Modal is closed → nothing rendered for it; the `<button>` renders as a plain server-rendered button. No `window`/`document` access (R6).                         |
| Reduced motion / slow devices                                                         | Modal animation comes from framer-motion; the map iframe loads when opened only, which is _lighter_ than the old full-page navigation.                           |
| Narrow viewport                                                                       | Same centered dialog at every width (D11); `h-[60vh]` in a ~512px panel is a portrait map, accepted (D4/D5).                                                     |
| Google embed refuses to render in an iframe sandbox/consent region                    | Unchanged pre-existing behaviour; the panel still opens and closes.                                                                                              |

---

## 7. Test plan

Run from the repo root:

```bash
bun run web:typecheck
bun run web:test          # bun test --preload ./test/setup.ts
```

- **R17. `apps/web/test/maps.test.ts` (extended, D13).**
  - `FindARoomContent.tsx` contains `<MapModal`, contains a `<button` for the affordance, and **no
    longer** contains `to="/maps"` — a regression guard against the navigation coming back;
  - `components/rooms/MapModal.tsx` contains `<Modal`, `useMapLocation`, `MapLocationControl`,
    `<MapEmbed`, and `h-[60vh]`, and does **not** pass a `size` prop;
  - the modal's body is mounted conditionally (assert the guard text, e.g. `open ? <MapModalBody`),
    which is the structural half of R10;
  - the two existing route arrays no longer name `routes/boarder/maps.tsx`, and
    `existsSync('src/routes/boarder/maps.tsx')` is `false`;
  - **no** file under `src/` references `/boarder/maps` any more;
  - `LOCATION_SURFACES` becomes `routes/maps.tsx`, `routes/landlord/maps.tsx`,
    `components/rooms/RoomDetailView.tsx`, `components/rooms/MapModal.tsx`.
- **R18. `apps/web/test/modal.test.tsx` (new, D14).** Component tests in the existing
  `@testing-library/react` + happy-dom style of `components.test.tsx`:
  - closed → renders nothing; open → renders the title and children;
  - Escape calls `onClose`; a backdrop click calls `onClose`; a click inside the panel does **not**;
  - `document.body` scroll is locked while open and restored on close **and** on unmount;
  - focus lands inside the panel on open, `Tab` from the last focusable wraps to the first, and focus
    returns to the previously-focused trigger on close.
- **R19. The critical behavioural guard.** A render test proving **no geolocation call happens while
  the modal is closed**: stub `navigator.geolocation`, set the stored opt-in, render the modal with
  `open={false}`, and assert `getCurrentPosition` was never called (this is the test that pins R10).
- **R20. `bun run web:typecheck` clean.**
- **R21.** The whole existing suite stays green (16 files under `apps/web/test/` today).
- **R22.** Browser verification is **optional** but was the thing that caught a real bug in the
  previous map change (a stuck "Locating…" state invisible to unit tests). Recommended follow-up:
  open `/find-a-room`, click **Map**, confirm the dialog opens _without navigating_, grant location,
  close, and confirm focus returns to the button and the results behind never scrolled.

---

## 8. Out of scope (explicit)

- The home page **"View Map"** button (`Hero.tsx` → `/public-maps`) and the `/public-maps` **"Open the
  interactive map"** CTA (→ `/maps`) — both keep navigating (D1, D3). **(Superseded by
  `hero-map-modal`: the hero now opens a view-only dialog and `/public-maps` is deleted.)**
- The landlord sidebar's **"Map View"** → `/landlord/maps` (D1, D3).
- The `/maps`, `/public-maps` and `/landlord/maps` pages themselves, and the listing-detail map — all
  unchanged (D3).
- Listing pins / "boarding houses near me" markers on the modal map. It stays a Google place embed.
- A query-param or hash representation of the open modal (D6), and a shareable deep link to it.
- A bottom sheet or any mobile-specific layout (D11).
- An "open full map" escape hatch inside the dialog (D21).
- Any change to `useMapLocation`, `lib/geolocation.ts`, `MapEmbed`, `MapLocationControl` or
  `lib/maps.ts`'s URL builders (D17).
- Portalling the modal, or any other DOM restructure of `Modal` (D16).
- Adding a focus-trap or portal dependency.
- Distance/radius features, reverse geocoding, or sending coordinates anywhere — all still excluded by
  the earlier `map-use-location` spec.
- Updating historical docs (`report.md`, `docs/qa/*`, `docs/plans/*`) that name
  `/boarder/maps`.
- Any commit (D23).

---

## 9. Open questions / risks

1. **Exit animation vs. the mount guard (D18).** Keeping the map inside the DOM during the close
   animation would need the `open ? … : null` conditional dropped, and then the hook is alive for the
   ~400 ms exit fade. The structural guarantee was chosen deliberately; if the frame visibly popping
   away looks bad in review, the alternative is to keep the conditional and shorten the exit duration.
2. **Escape cannot be received from inside the iframe — confirmed in Chrome.** A focused embedded map
   is a separate document, so an Escape pressed while it has focus never reaches this document and does
   not close the dialog. The X and the backdrop cover it. Fixing it properly would need a keydown
   bridge into the cross-origin frame — out of scope.
3. **Focus trap + iframe — a real bug, found by the browser check and fixed.** This was flagged here as
   "worth verifying behaviourally", and it did not hold up: the panel's `keydown` handler never sees a
   `Tab` pressed while the map has focus, so Chrome's default moved focus **out of the dialog and onto
   a nav link behind it** (`active = A "Our Story"`). The parent's own Tab handling could not have
   caught it. Fixed by watching where focus _lands_ rather than which key was pressed: a `focusin`
   listener pulls focus back to the panel's first focusable whenever it lands outside the panel, which
   also covers the case where the map has not finished loading. Verified in Chrome (focus forced
   outside is pulled back) and unit-tested. See §11.
4. **Scroll lock is now app-wide.** `Modal` has six other call sites, and one of them could be open
   over another. The lock must save and restore the prior `overflow` value rather than unconditionally
   clearing it, or a nested close could release the lock while a modal is still open. Unit tests cover
   the simple case; a nested case is not currently reachable in the app.
5. **`md` (512px) with `h-[60vh]` is a portrait map.** It matches what was chosen (D4/D5) but is a
   different feel from the 1152px-wide `/maps`. If it reads poorly on desktop, switching to `lg`/`xl`
   is a one-line change — noted rather than pre-empted.
6. **Deleting `/boarder/maps` breaks old links with no redirect** (D19). Only QA/audit documents still
   name it, and they are historical. Accepted.
7. **The modal's subtitle line is a small addition.** The request only named the modal and its map; the
   `mapSubtitle()` / `LOCATION_SUBTITLE` line is included because every other map surface shows one and
   it is the only feedback that the pin changed (the title is fixed by D8). Trivially droppable if
   unwanted.
8. **`routeTree.gen.ts` is generated.** Deleting the route file without regenerating leaves a stale
   import; the build (`bun run web:build`) is what regenerates it, so typecheck alone is not the gate
   for R14.

---

## 10. Acceptance criteria

- [x] On `/find-a-room`, clicking **Map** opens a dialog **in place** — the URL stays `/find-a-room`, the results behind are untouched and the page does not scroll-jump.
- [x] The dialog is titled **"Find boarding houses near you"**, is `max-w-lg`, and contains the control row plus a `w-full h-[60vh]` Google embed defaulting to Malaybalay.
- [x] "Use my location" inside the dialog behaves exactly as on `/maps`, sharing the same remembered preference and its auto-apply.
- [x] **No geolocation call and no map iframe exist on `/find-a-room` until the modal is opened**, even for an opted-in user.
- [x] The shared `Modal` now locks body scroll, traps focus inside the panel, and restores focus to the trigger on close — with **no DOM restructure** and no dependency added.
- [x] The six existing `Modal` call sites are behaviourally unchanged apart from the new scroll lock / focus handling (smoke-tested in Chrome).
- [x] Escape, the X and the backdrop all close the dialog; a click inside does not.
- [x] The "Map" affordance looks identical to before but is a `<button type="button">`. (`Link` is still imported by that file for the listing cards, so the import stays.)
- [x] `/boarder/maps` is deleted, the route tree is regenerated, and no source file references the path; the two `maps.test.ts` arrays are updated.
- [x] `bun run web:typecheck` clean; `bun run web:test` green — 115 tests across 16 files, including `modal.test.tsx` and the extended `maps.test.ts`.
- [x] No API/worker/DB/dependency change; nothing committed; historical docs untouched.

---

## 11. Implementation notes (what shipped)

Written after the fact, so the spec reflects reality.

- **`Modal.tsx`** gained `panelRef`, `restoreFocusRef`, `lockedOverflowRef` and `isOpenRef`, plus two
  effects. The scroll lock saves `document.body.style.overflow` on open and restores it on close _and_
  on unmount. Focus moves to the panel's first focusable on open and returns to the previously-focused
  element on close (with the document as the documented fallback when the dialog was open at mount).
  Tab/Shift+Tab wrap is handled by a `keydown` handler on the panel. **No DOM change** was needed.
- **The focus trap needed a second mechanism.** The panel `keydown` handler cannot observe a `Tab`
  pressed while the embedded map has focus — the map is another document, so the event never reaches
  this one. Chrome's default then moved focus **out of the dialog onto a nav link behind it**. A
  `focusin` listener now pulls focus back into the panel whenever it lands outside, which covers that
  case (and any other way focus could leave) without touching the markup. The listener is removed
  before focus is handed back on close, so restoring to a trigger outside the panel is not itself
  treated as an escape.
- **`MapModal.tsx`** is a thin wrapper (`<Modal>` + a conditionally-mounted `<MapModalBody />`), so the
  hook and iframe do not exist while closed. It renders `mapSubtitle()` / `LOCATION_SUBTITLE` above the
  control row, then the control, then `MapEmbed` with `h-[60vh]`.
- **`FindARoomContent.tsx`** holds `mapOpen`, renders `<MapModal … />`, and the affordance became a
  `<button type="button">` with identical classes, keeping `title="View Map"`.
- **`routes/boarder/maps.tsx`** was deleted and `routeTree.gen.ts` regenerated; `lib/maps.ts`'s module
  comment no longer lists it.
- **Tests:** `apps/web/test/modal.test.tsx` (new, 9 cases) covers render/close, scroll lock with
  release on close and unmount, focus move-in/restore, the Tab cycle, and the focus guard that stops
  the dialog being escaped; `apps/web/test/maps.test.ts` (29 cases) gained the modal wiring,
  delete-the-route and open-guard assertions and lost the deleted route from its arrays. Suite total:
  **115 passing across 16 files**, `bun run web:typecheck` clean.
- **Browser verification (Chrome over CDP, 36 checks, all passing).** `/find-a-room` was driven for
  real: clicking **Map** opens the dialog with the URL unchanged at `/find-a-room`; no iframe and **no
  geolocation lookup exist before it is opened** even with a stored opt-in; the remembered position
  auto-applies at `z=15`; the wheel does not move the page while open and does move it after close
  (a control for the lock); Escape closes, focus returns to the **Map** button; reopening and resetting
  work; and `/boarder/maps` is a 404. One pre-existing modal (`Add a room` on the landlord
  listing-edit page) was smoke-tested too — it still opens, now locks scroll, takes focus and releases
  the lock on close.
