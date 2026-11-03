# Spec — Admin Surface Restructure (apple-design)

**Status:** **Not implemented** — spec only (written 2026-09-29). No code has been changed by this spec.
**Short name:** `admin-apple-ui-restructure`
**Date:** 2026-09-29
**Predecessor:** `landlord-apple-ui-restructure-spec.md` (shipped) — same design rubric, same shell, applied to the last
surface that never adopted it.
**Owner request (verbatim):**

> apple-design, restructure the layout and design in Admin

**Reading of the request (confirmed across five interview rounds):** the landlord surface was restructured around the
`apple-design` rubric and the admin surface was left behind. `/admin` is still a **1,085-line single route file** (7
tabs in one component, `useState`-driven), it renders `RoleShell` with **no `nav` at all** — so admin is the only role
with **no sidebar** — and it still hand-rolls the pieces the restructure created: its own page heading instead of
`PageHeader`, `EmptyState` with no icon or action, an ad-hoc `Modal` confirm instead of `ConfirmDialog`, bare
`hover:underline` row actions, `!bg-error` class overrides, and skeletons that still paint the pre-restructure flat
card.

This change **restructures how admin is laid out and presented**: the 7 tabs become an 8-item sidebar (Overview + the
7 existing sections) addressed by a `?tab=` search param, each section gets a real heading, the summary tiles become
the Overview, the three duplicated bulk bars collapse into one, and every surface detail the restructure standardised
(`PageHeader`, `EmptyState`, `ConfirmDialog`, `Button` variants, semantic colour tokens) is adopted. **Routes, data,
queries, mutations, validation and payloads do not change.**

---

## 1. Interview decisions (as answered by the requestor)

### Round 1 — scope and fidelity

| #   | Topic                  | Decision                                                                                                                                                                                                                                                   |
| --- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Files in scope         | **All four admin files**: `routes/admin/index.tsx`, `components/admin/{PropertyAccessTab,LandlordDocumentsModal,AdminSkeletons}.tsx`.                                                                                                                      |
| D2  | Depth of "restructure" | **Visual + layout only.** Same 7 sections, same routes, same data, same copy (the one sanctioned exception is each section's new heading — D6). No merging/renaming sections, no new admin capabilities (sorting, filtering, pagination, command palette). |
| D3  | Apple fidelity         | **Match the landlord precedent.** Reuse the shell that already exists (pinned `.chrome-topbar` / `.chrome-sidebar` / `.chrome-scroll-edge`), plus materials, springs on already-animating components, and instant press feedback everywhere.               |
| D4  | Admin navigation       | **The sidebar becomes the admin nav.** Extend `ADMIN_NAV` to the sections and **remove the in-page tab bar**. Admin finally shares the same shell as landlord and boarder. _(This is the one IA-adjacent change in the whole request — see D32.)_          |

### Round 2 — boundaries created by round 1

| #   | Topic              | Decision                                                                                                                                                                                    |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D5  | Section addressing | **A search param on the same `/admin` route** (`/admin?tab=users`). Deep-linkable, survives refresh and Back, **no new route files**, and the breadcrumb can finally name the open section. |
| D6  | Section headings   | **Each section gets its own `PageHeader`** (icon, title, one-line subtitle). This is the only new copy the change introduces.                                                               |
| D7  | Summary tiles      | **Move into an Overview section.** The four `getSummary` tiles stop sitting above every section; the six work surfaces get the full screen instead.                                         |
| D8  | Sidebar grouping   | **Group like the landlord nav**, using the shared `Sidebar`'s existing `group` support.                                                                                                     |
| D9  | Bulk action bar    | **Unify and restyle, keep it sticky.** One shared bar replaces the three near-identical copies, with a defined stacking relationship to the now-pinned topbar.                              |

### Round 3 — surface language and mechanics

| #   | Topic               | Decision                                                                                                                                                                                                                                                                                                      |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D10 | File structure      | **Split per-section into `components/admin/`.** `routes/admin/index.tsx` keeps the `Protected` wrapper, the shell, and the section switch; each section body moves to its own file.                                                                                                                           |
| D11 | Dark mode           | **Fix all admin colours to semantic tokens.** Dark mode is live app-wide (automatic via `prefers-color-scheme`) and admin was full of literal palette colours that never invert.                                                                                                                              |
| D12 | Destructive actions | **Confirm bulk + all negative outcomes** through the shared `ConfirmDialog` with `busy` wiring. Bulk status changes, per-row Reject/Flag/Ban, landlord Reject, Revoke invitation, and negative account-status changes all confirm. Genuinely reversible single-row changes (Publish, Approve) stay one click. |
| D13 | Row actions         | **Move them onto `Button` variants.** `dangerGhost` / `outline` / `ghost` with real hit padding and press feedback replace the ~8 bare `text-sm hover:underline` buttons — same labels, same positions.                                                                                                       |
| D14 | Breadcrumbs         | **Extend the shared `Breadcrumbs`** so `/admin?tab=users` reads `Admin / Users` and the trail always agrees with the sidebar.                                                                                                                                                                                 |

### Round 4 — rhythm, motion and verification

| #   | Topic          | Decision                                                                                                                                                                                                                                        |
| --- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D15 | Motion budget  | **Same budget as landlord.** Polish what already animates (Modal, menus, toasts) and give every actionable element press feedback. **Section switching is an instant swap** — no page transitions, no staggered reveals, no animated counters.  |
| D16 | Sidebar wiring | **Extend `NavItem` with an optional `search`**, and pass it through the shared `Sidebar` with search-aware active matching.                                                                                                                     |
| D17 | Table density  | **Keep `DataTable`'s current rhythm** (rows already `py-3.5` from the landlord change). No density change to the shared primitive.                                                                                                              |
| D18 | Accessibility  | **Explicit acceptance criteria**: real nav landmark with `aria-current` on the open section, document title reflecting the section, focus order preserved, pinned chrome never trapping focus, dialogs focus-managed. Not just "don't regress". |
| D19 | Verification   | **`bun run web:typecheck` + `bun run web:test` + a production build with the emitted CSS grepped.** No browser walkthrough, no new tests.                                                                                                       |

### Round 5 — blast radius and housekeeping

| #   | Topic                      | Decision                                                                                                                                                                                                                                                                                                 |
| --- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D20 | Shared-chrome blast radius | **Accept it — shared means shared.** `NavItem.search` is optional so no existing nav item changes; `Breadcrumbs` gains a search-aware suffix other roles simply never produce. One consistent shell, exactly as the landlord change chose.                                                               |
| D21 | Per-row status control     | **Keep the `<select>`, confirm negative changes.** The Users row status control is restyled but stays a native select; `banned` / `suspended` route through `ConfirmDialog`, `active` stays one click.                                                                                                   |
| D22 | Headings and naming        | **The implementing agent authors them from existing labels.** Title = the sidebar label; the agent writes a one-line subtitle for each section, keeping today's `Platform overview — accounts, listings, and applications.` for Overview. All eight are listed in §3.4 for review before implementation. |
| D23 | Commit policy              | **Leave everything uncommitted**, consistent with the landlord change and the rest of the in-flight tree.                                                                                                                                                                                                |

### Derived decisions

| #   | Topic                                    | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D24 | In-flight tree must not be undone        | A **partial colour-token pass is already present** in the working tree on all three modified admin files (`text-green-600` → `text-success-ink`, `bg-purple-100` → `bg-accent-tint`, `divide-gray-100` → `divide-border`, `RoleShell title` already dropped, the `<h2>` already promoted to a tracked `<h1>`). This spec records the **post-pass** state in §2 and the remaining colour work is correspondingly narrower (D11). Those edits are **not mine and must not be reverted or duplicated**. |
| D25 | Landing section                          | A bare `/admin` (or an unknown `?tab=` value) lands on **Overview**, never a blank pane.                                                                                                                                                                                                                                                                                                                                                                                                             |
| D26 | Section count                            | **8 sidebar destinations**: Overview + the 7 existing tabs. The 7 existing tabs are unchanged as sections; Overview is the former always-on summary block.                                                                                                                                                                                                                                                                                                                                           |
| D27 | `ADMIN_NAV` is dead code today           | It is exported from `lib/nav.ts` and **imported nowhere** (verified: no consumer in `apps/web/src`). This change wires it up for the first time and grows it from 1 item to 8.                                                                                                                                                                                                                                                                                                                       |
| D28 | Search-aware active state                | Seven links pointing at `/admin` would all render active at once. `Sidebar`'s `Link` therefore needs `search` plus `activeOptions` that include search, and `NavItem` needs the optional `search` field (D16).                                                                                                                                                                                                                                                                                       |
| D29 | New files are allowed                    | The landlord change's "no new files under `components/`" rule (`landlord-apple-ui-restructure` D13) is **explicitly reversed for admin** by D10.                                                                                                                                                                                                                                                                                                                                                     |
| D30 | URL values                               | URL values are kebab-case lowercase: `overview`, `users`, `properties`, `applications`, `landlords`, `property-access`, `settings`, `audit`. Internal keys may keep the existing spelling (`propertyAccess`); only the serialized value is normalised. `validateSearch` must be **non-throwing** so a garbage value falls back to `overview`.                                                                                                                                                        |
| D31 | Palette unchanged                        | The green/cream token set in `@theme` stays. This is a restructure of structure, space, hierarchy and motion — **not a rebrand** and not a colour change beyond adopting tokens that already exist.                                                                                                                                                                                                                                                                                                  |
| D32 | The one IA change                        | Adding 8 items to `ADMIN_NAV` is an IA-adjacent change, sanctioned only by D4. Nothing else in the admin IA moves: no section is merged, split, renamed or reordered-in-meaning.                                                                                                                                                                                                                                                                                                                     |
| D33 | No new dependency                        | `framer-motion@^13.1.0` is already a dependency and already used by `Modal`; D3/D15 need no `package.json` change.                                                                                                                                                                                                                                                                                                                                                                                   |
| D34 | `LandlordDocumentsModal` is test-pinned  | `apps/web/test/landlord-documents-modal.test.tsx` asserts its visible copy (`2 of 4 documents`, `Not submitted`, `Missing: Business permit, Selfie holding the ID`, the `Verification documents — {name}` title), the Approve button's disabled logic, the notification message, and the request bodies. **Restyle only — no string, prop or behaviour change.**                                                                                                                                     |
| D35 | `Protected` stays                        | The route keeps `<Protected role="admin">`; the shell is rendered inside it, as today.                                                                                                                                                                                                                                                                                                                                                                                                               |
| D36 | Sub-`lg` admin gains the sidebar squeeze | Admin currently has no sidebar, so it has never had the 288px-at-every-width rail. D4 gives it one, which means admin inherits the same deferred mobile problem the other roles have (see §9).                                                                                                                                                                                                                                                                                                       |

---

## 2. Current state (verified 2026-09-29, post colour-pass per D24)

### 2.1 Surface inventory — 4 files, ~1,900 lines

| File                                          | Lines | Role                                                                                                                                                                                                                                                         |
| --------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `routes/admin/index.tsx`                      | 1,085 | The whole surface: `Protected` → `RoleShell` → heading, summary tiles, tab bar, 7 tab bodies, 3 sticky bulk bars, ad-hoc confirm Modal, plus local `StatCard` (:74), `RoleBadge` (:97), `formatDate` (:118), `AdminTab` (:996→) and `SettingsForm` (:1029→). |
| `components/admin/PropertyAccessTab.tsx`      | 416   | Property Access section. The **best-behaved** admin file: uses `Card`, `Button`, `ConfirmDialog`, `DataTable` (`expandable`), `EmptyState`, `ErrorState`, `Field`/`SelectInput`, `Icon`, `TableSkeleton`.                                                    |
| `components/admin/LandlordDocumentsModal.tsx` | 328   | Verification document review. Already close to the target language (`rounded-xl`, `bg-mint/40`, `StatusBadge`); **test-pinned** (D34).                                                                                                                       |
| `components/admin/AdminSkeletons.tsx`         | 69    | `StatCardSkeleton`, `StatsGridSkeleton`, `TableSkeleton`, `SettingsSkeleton`.                                                                                                                                                                                |

### 2.2 Admin has no sidebar, and the tab bar is its only navigation

```tsx
// routes/admin/index.tsx:439 — the only RoleShell call in the file
<RoleShell>
```

`RoleShell`'s signature is `nav = []` and it renders `{nav.length > 0 && <Sidebar nav={nav} />}`, so **admin renders no
sidebar** — verified, and the sole reason `ADMIN_NAV` is dead code (D27). Navigation is a 7-item tab bar built from a
local `TABS` array (:64) inside the _page body_:

```tsx
// routes/admin/index.tsx:484
<div className="mb-4 flex flex-wrap gap-2 border-b border-border">
  {TABS.map(item => (
    <button ... className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${
      tab === item.key ? 'border-primary text-primary' : 'border-transparent text-gray-ink hover:text-gray-ink'
    }`}>
```

- Section state is `const [tab, setTab] = useState<TabKey>('users')` (:125) — **local only**: no deep link, no
  refresh persistence, `Back` leaves the page.
- `TabKey` is a 7-member union; `TABS` carries `{ key, label, icon }` and no group.
- `handleTabChange` (:147) also owns the per-tab selection reset, so nav and state are entangled.
- No `role="tablist"`, no `aria-current`, no keyboard arrow navigation.

### 2.3 The page names itself by hand, and inconsistently with its own nav

```tsx
// routes/admin/index.tsx:441 (post colour-pass: <h2> promoted to a tracked <h1>, title prop already dropped)
<h1 className="text-2xl font-bold tracking-tight text-ink">Command Center</h1>
<p className="mt-1 text-sm text-gray-ink">Platform overview — accounts, listings, and applications.</p>
```

`components/ui/PageHeader.tsx` renders exactly this block (`mb-6`, `Icon size={28}`, `h1 text-2xl font-bold
tracking-tight`, subtitle in `text-gray-ink`, `actions` slot) and is the canonical heading adopted by the landlord
surface — but **no admin page uses it**. Two naming mismatches also exist: the heading says _Command Center_ while
`ADMIN_NAV` calls the destination _Overview_, and the Applications tab carries a second, unrelated stats block below
the summary tiles.

### 2.4 The summary tiles render above every section

`:441` heading → `:455` four `StatCard`s from `getSummary` (`users_total`, `properties_total`,
`applications_total`, `landlords_pending_verification`) → `:484` the tab bar → the open section. So **every** section
pays for four tiles it usually doesn't need; the Applications section pays twice (it has its own 4-stat
`StatsGridSkeleton`-shaped block for total/pending/approved/processed-rate).

### 2.5 The bulk action bar is triplicated

Three blocks at `:784`, `:847`, `:902` (Users, Properties, Applications) are near-identical ~40-line copies:

```tsx
<div className="sticky bottom-4 z-30 mt-4">
  <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/90 px-4 py-3 shadow-2xl backdrop-blur-xl">
    <span className="text-sm font-medium text-ink">{usersSelected.size} selected</span>
    <div className="flex items-center gap-2">
      <select aria-label="Bulk status" ... className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm">
      <Button variant="primary" size="sm" disabled={isBulkBusy || usersOverCap} onClick={() => setConfirm({...})}>Apply</Button>
      <Button variant="ghost" size="sm" ...>Cancel</Button>
```

Notes: the bar is already the most Apple-like thing on the page (translucent, `shadow-2xl`, floating) but it
**hard-codes `bg-white/90`** rather than the `.chrome-topbar` material (so it does not follow the dark theme), it is
`z-30` — the same layer as the now-pinned topbar — and the "Max 100 per bulk operation" message is appended _below_
the sticky bar so it can sit off-screen.

### 2.6 Confirmation is ad-hoc, and destructive intent is expressed by string matching

```tsx
// routes/admin/index.tsx:967 — its own Modal, not ConfirmDialog
<Modal open={Boolean(confirm)} title={confirm?.title ?? ''} onClose={() => setConfirm(null)}>
  ...
  <Button variant="primary" onClick={confirm.onConfirm} disabled={isBulkBusy}
    className={
      confirm.confirmLabel.toLowerCase() === 'ban' ||
      confirm.confirmLabel.toLowerCase() === 'reject'
        ? '!bg-error hover:!bg-error'
        : ''
    }>{confirm.confirmLabel}</Button>
```

So: `confirm` is a local `useState` holding `{title, message, confirmLabel, onConfirm}` (:140); the danger styling is
decided by **lower-casing the button label**; the button is `variant="primary"` with an `!important` override instead
of `variant="danger"`; `busy` is the page-wide `isBulkBusy` rather than the mutation in question; and
`ConfirmDialog` (which `PropertyAccessTab` already uses, and which the landlord change standardised on) is unused
here.

Per-row actions are the opposite — they fire immediately, with no confirmation:

```tsx
// :337 Publish / :345 Reject / :352 Flag  (bare text buttons, ~20px tall, no hit padding, no press state)
<button type="button" className="text-sm text-success-ink hover:underline" onClick={...}>Publish</button>
<button type="button" className="text-sm text-error-ink hover:underline" onClick={...}>Reject</button>
<button type="button" className="text-sm text-yellow-600 hover:underline" onClick={...}>Flag</button>
```

Landlord Approve/Reject (`:411`/`:419`) are the same, and so is `PropertyAccessTab`'s **Revoke** invitation. Also
still on `primary` + `!important`: `LandlordDocumentsModal:243` (`!bg-error hover:!bg-error`) and `:274`
(`!border-error-border !text-error-ink hover:!bg-error-tint`).

Remaining `Button` overrides to retire: **3** (`!bg-error` ×2, the `!border-error-border` trio ×1). `Button` already
has `danger` (`bg-error text-white hover:brightness-90`) and `dangerGhost` (quiet red text) variants.

### 2.7 The Users row status control

```tsx
// :305 — fires a mutation on change, no confirmation, unstyled native select
<StatusBadge status={row.account_status} />
<select aria-label="Change account status"
  className="rounded border border-border-strong px-1.5 py-0.5 text-xs"
  value={row.account_status}
  onChange={event => patchUser.mutate({ userId: row.id, status: event.target.value })}>
```

### 2.8 Chips and pills

`RoleBadge` (`:97`) hand-rolls a pill (`bg-accent-tint text-accent-ink` for admin, `bg-mint text-primary-dark` for
landlord, `bg-info-tint text-info-ink` for boarder) with its own `Icon size={12}` — next to a `StatusBadge` primitive
that already owns exactly this job, including `accent` and `info` tones. `PropertyAccessTab`'s inline notice is
`rounded-md border border-mint bg-mint/40 px-4 py-2 text-sm` — a **third** banner treatment, while
`components/shared/RestrictionBanner` already exists with the motion and shape the restructure standardised on.

### 2.9 Skeletons still paint the pre-restructure card

```tsx
// AdminSkeletons.tsx:5 — flat, border-only, no elevation; matches the OLD Card, not the new one
<div className="rounded-lg border border-border bg-surface p-4 flex items-start gap-3">
// :37
<div className="overflow-hidden rounded-lg border border-border bg-surface">
// header row px-4 py-2 and body rows px-4 py-3 — the real DataTable now uses py-3 headers and py-3.5 rows
```

So loading a section shows a visibly different card shape and row rhythm than the loaded table it becomes.
`SettingsSkeleton` is the odd one out: it does use `<Card>`.

### 2.10 What is _not_ broken and must stay that way

The data layer (`lib/api/admin.ts` — 14 exported calls including the bulk and property-access ones), every React
Query key (`['admin', ...]` and its invalidations), the 100-row bulk cap and its "Selected first 100" messaging, the
`selectable` / `onToggle` / `onToggleAll` selection model, `Protected role="admin"`, `ExpandedRow`/`expandable`
behaviour, every mutation payload and success/error toast message, and every string a test asserts (D34). Only one
test touches a shared primitive (`components.test.tsx`: `Button renders its children`), and `routes.test.ts` asserts
only `accountHomeEntry('admin') === { to: '/admin', label: 'Dashboard' }` — which this change does not touch.

### 2.11 Motion and material vocabulary that already exists (nothing new is needed)

| Piece                                                        | Where                             | Notes                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.chrome-topbar` / `.chrome-sidebar` / `.chrome-scroll-edge` | `app.css`                         | Translucent materials + the scroll-edge underlay, with `prefers-color-scheme: dark` and `prefers-reduced-transparency: reduce` variants already written.                                                                                                                                                     |
| `Topbar` breadcrumbs                                         | `components/layout/Topbar.tsx`    | `buildTrail(pathname)` + `SEGMENT_LABELS`; renders `<nav aria-label="Breadcrumb">` with `aria-current` on the last crumb. **Pathname-only** — no search awareness (the gap D14 closes).                                                                                                                      |
| `Sidebar`                                                    | `components/layout/Sidebar.tsx`   | `lg:sticky lg:h-screen`, collapse toggle, group headers, `activeProps={{ className: 'bg-mint font-semibold text-primary' }}`. Links are `to={item.to}` — **no search support** (the gap D16 closes).                                                                                                         |
| `PageHeader`                                                 | `components/ui/PageHeader.tsx`    | icon + title + subtitle + actions; unused by admin.                                                                                                                                                                                                                                                          |
| `EmptyState`                                                 | `components/ui/EmptyState.tsx`    | optional `icon` and `action`; admin uses only `title` (3 call sites).                                                                                                                                                                                                                                        |
| `ConfirmDialog`                                              | `components/ui/ConfirmDialog.tsx` | focus-managed, Escape/overlay cancel, `destructive`, `busy`; used only by `PropertyAccessTab`.                                                                                                                                                                                                               |
| `Button` / `buttonClasses`                                   | `components/ui/Button.tsx`        | `primary\|secondary\|outline\|ghost\|danger\|dangerGhost`; `active:scale-[0.97]` press feedback. Admin overrides it 3×.                                                                                                                                                                                      |
| `Modal`                                                      | `components/ui/Modal.tsx`         | framer-motion spring, `bg-surface/90 backdrop-blur-xl`, `z-50`.                                                                                                                                                                                                                                              |
| `--ease-settle`, `--shadow-card`, `--shadow-pop`             | `@theme` in `app.css`             | The elevation and settle vocabulary the restructure standardised on.                                                                                                                                                                                                                                         |
| Semantic tokens                                              | `@theme` in `app.css`             | `--color-{success,warning,error,info}-{tint,ink,border}`, `--color-accent-{tint,ink}`, `--color-border`, `--color-border-strong`, `--color-gray-ink` — all with dark-mode values. `text-warning-ink` / `bg-warning-tint` exist and are the right home for the last literal colour (`text-yellow-600`, §2.6). |
| Dark mode                                                    | `app.css`                         | Live app-wide, automatic via `prefers-color-scheme` (`color-scheme: light dark;` line 68) — no toggle, no stored preference.                                                                                                                                                                                 |

---

## 3. Requirements

### 3.1 The admin shell (D4, D8, D26, D27, D35, D36)

- **R1.** `routes/admin/index.tsx` renders `<RoleShell nav={ADMIN_NAV}>`, so admin gets the same pinned sidebar,
  translucent chrome and single scrolling column as landlord and boarder. The `.chrome-sidebar` material, the `lg`
  pin, the collapse toggle and the internal nav scroll all come free from the shared component.
- **R2.** `ADMIN_NAV` (`lib/nav.ts`) grows from **1 item to 8**, grouped (D8):
  `Operations` — Overview, Users, Properties, Applications, Landlords; `Access & audit` — Property Access, Audit log;
  `System` — Settings. Each item carries `{ to: '/admin', label, icon, group, search: { tab: '<url value>' } }`
  (D16/D30). Icons reuse the existing set (`home`, `users`, `list`, `application`, `shieldCheck`, `settings`,
  `document`) so no icon work is needed.
- **R3.** **The in-page tab bar is deleted** (`TABS` at :64, the `.map()` at :484, `handleTabChange`'s nav role at
  :147). `TABS`'s labels/icons move to `ADMIN_NAV`; its selection-reset responsibilities move next to the state they
  belong to.
- **R4.** The nav labels are the **single source of truth** for each section's identity: `PageHeader` titles are read
  from `ADMIN_NAV` labels rather than re-typed, so the sidebar and the heading can never disagree again (the current
  _Command Center_ vs _Overview_ mismatch).
- **R5.** `RoleShell`'s no-`overflow` rule holds for admin too: `main` stays part of the page's scroll container, or
  the sidebar and topbar pins silently die. The admin route must not wrap the shell in a scroll container.

### 3.2 Section addressing (D5, D25, D28, D30)

- **R6.** The `/admin` route declares a `validateSearch` that reads `tab`, is **non-throwing**, and resolves an
  unknown/absent value to `overview` (D25/D30). URL values: `overview`, `users`, `properties`, `applications`,
  `landlords`, `property-access`, `settings`, `audit`.
- **R7.** The open section is read from the search param, not local state. Deep-linking
  `/admin?tab=applications` selects the Applications section on first paint; refresh keeps it; `Back` returns to the
  previous section instead of leaving admin.
- **R8.** Section switching is a **replacement, not an addition** — exactly one section renders at a time, as the tab
  bar does today. No section is ever mounted off-screen.
- **R9.** `NavItem` gains an **optional `search`** field, and `Sidebar` passes it to its `Link` and matches active
  state **including search** (D16/D28) — otherwise all eight links to `/admin` light up at once. `search` stays
  optional so none of the existing landlord/boarder items change (D20).
- **R10.** Per-section selection state (the three `*SelectMode` / `*Selected` pairs) resets when the section changes,
  preserving today's `handleTabChange` behaviour.

### 3.3 Breadcrumbs (D14, D20)

- **R11.** `buildTrail` takes the current **search** in addition to the pathname, and a declarative map (exported from
  `lib/nav.ts` alongside `ADMIN_NAV`, so `Topbar` never imports admin components) turns `?tab=users` into a trailing
  **`Users`** crumb. `/admin?tab=users` therefore renders `Admin / Users`, and `/admin` renders just `Admin`.
- **R12.** The extension is **inert for every other role**: no other route declares a `tab` param, so no other trail
  changes. `Breadcrumbs` still renders nothing when there is no derivable trail, and the last crumb stays
  `aria-current="page"` plain text (links only for ancestors).
- **R13.** No route param (id) ever renders as a bare number; the trailing section crumb is the only search-derived
  crumb.

### 3.4 Headings, rhythm and density (D2, D6, D17, D22, D31)

- **R14.** Every section opens with the shared **`PageHeader`** (icon + title + subtitle), replacing the hand-rolled
  heading block and giving each section a single place that names it. Titles come from `ADMIN_NAV` labels (R4); the
  eight subtitle lines are authored in this change and listed here for review before implementation (D22):

  | Section         | Title           | Subtitle (new copy)                                                                                               |
  | --------------- | --------------- | ----------------------------------------------------------------------------------------------------------------- |
  | Overview        | Overview        | Platform overview — accounts, listings, and applications. _(unchanged, carried over from today's lead paragraph)_ |
  | Users           | Users           | Every account on the platform — boarders, landlords and admins.                                                   |
  | Properties      | Properties      | Listings submitted for moderation and their current status.                                                       |
  | Applications    | Applications    | Boarder applications across all properties.                                                                       |
  | Landlords       | Landlords       | Verify landlord accounts and review their documents.                                                              |
  | Property Access | Property Access | Grant and revoke a landlord's access to a property.                                                               |
  | Settings        | Settings        | Platform-wide configuration values.                                                                               |
  | Audit log       | Audit log       | Every administrative action, newest first.                                                                        |

  _(Today's one existing subtitle — `Platform overview — accounts, listings, and applications.` — is the Overview
  line verbatim; everything else in the table is new copy. No other string on the surface changes.)_

- **R15.** The `PageHeader`'s `actions` slot is where per-section affordances live (e.g. a section-level action), so
  the section toolbar stops being an ad-hoc `mb-3 flex items-center justify-between` row.
- **R16.** Sections are separated by the shell's existing rhythm rather than hand-set `mt-6` / `mb-4` / `space-y-*`
  mixtures. Admin adopts the same spacing scale as landlord: sections in a `space-y-6` rhythm, `gap-4` inside grids,
  consistent card padding via `Card`.
- **R17.** Summary tiles live **only** in the Overview section (D7). The seven work sections lose the 4-tile header
  they currently pay for on every load. The Applications section keeps its own 4-stat block (it is that section's
  content, not a global header).
- **R18.** `DataTable`'s rhythm is untouched (D17): admin inherits `py-3` headers and `py-3.5` rows. No admin-specific
  density variant.

### 3.5 Surface language and semantic tokens (D11, D31)

- **R19.** Every remaining literal palette colour in admin is replaced with the semantic token that already exists:
  `text-yellow-600` (the Flag action) → `text-warning-ink`. This is the **last** literal colour on the surface — the
  in-flight pass (D24) already handled `bg-purple-100`/`text-purple-700` → `bg-accent-tint`/`text-accent-ink`,
  `bg-blue-100`/`text-blue-700` → `bg-info-tint`/`text-info-ink`, `text-green-600` → `text-success-ink`,
  `text-red-600` → `text-error-ink`, `divide-gray-100` → `divide-border`, `border-gray-300` → `border-border-strong`,
  `bg-red-50`/`border-red-200`/`text-red-700` → `bg-error-tint`/`border-error-border`/`text-error-ink`. **Every
  admin surface must be legible in dark mode**, since it is live app-wide and automatic.
- **R20.** `RoleBadge` and any hand-rolled pill move onto **`StatusBadge`** (extending its tone map if a role tone is
  missing) so the surface has one pill language; the icon inside the badge, if kept, comes from the same map rather
  than a nested ternary.
- **R21.** `PropertyAccessTab`'s inline notice/error banners adopt the surface's notice treatment instead of
  `rounded-md border border-mint bg-mint/40` — one banner shape across admin, aligned with
  `components/shared/RestrictionBanner`'s existing shape and motion.
- **R22.** `AdminSkeletons` is rebuilt to describe the **real** loaded layout: card-shaped skeletons matching `Card`
  (`rounded-2xl` + `shadow-card` + `p-5`) and table skeletons matching `DataTable` (`rounded-2xl`, `py-3` header,
  `py-3.5` rows). `SettingsSkeleton` already uses `Card` and stays the reference implementation.
- **R23.** **No new tokens, no palette change** (D31). Only `@theme` values that already exist may be referenced.

### 3.6 Actions and affordances (D12, D13, D21)

- **R24.** **Row actions become real controls** (D13): the ~8 bare `text-sm hover:underline` buttons move onto
  `Button` variants (`dangerGhost` for Reject/Flag-class actions, `ghost`/`outline` for neutral ones, `primary` for
  Publish/Approve-class), with hit padding meeting the tap guidance and `active:scale-[0.97]` press feedback
  inherited from `buttonClasses`. **Labels and positions are unchanged.**
- **R25.** **No route or component file overrides a `Button`'s colours.** The 3 `!` overrides retire: the ad-hoc
  confirm's `!bg-error hover:!bg-error` → `variant="danger"` (which removes the string-matching hack in R27),
  `LandlordDocumentsModal:243` → `variant="danger"`, and `:274` → the closest real variant
  (`variant="outline"` with a documented destructive tone, or an extension to `Button`'s variant map if a
  "quiet destructive outline" is genuinely missing). Extending `components/ui/Button.tsx`'s variant map is
  preferred over an `!important` override (D20).
- **R26.** **Destructive actions confirm** (D12). Routing through the shared `ConfirmDialog` with `destructive` and
  `busy` wired to the specific mutation's `isPending`:
  - bulk user status change, bulk property moderation, bulk application decision;
  - per-row property **Reject** and **Flag**; per-row landlord **Reject**;
  - `PropertyAccessTab`'s **Revoke** invitation (its Remove-access flow already confirms).
    **One-click stays:** Publish, landlord Approve, application-wise reversible single changes, and switching an
    account **to** `active` (R28).
- **R27.** The ad-hoc `confirm` state + `Modal` (:967) is **deleted** in favour of `ConfirmDialog`, removing the
  label-string-matching danger logic, the page-wide `isBulkBusy` `busy` value, and the second confirmation UI on the
  surface.
- **R28.** The Users row status `<select>` **stays a native select** (D21) but is restyled to the surface's control
  language; choosing **`banned` or `suspended`** routes through `ConfirmDialog` (with the target user named) before
  the mutation fires, while `active` applies immediately. The select's value must not visually "jump" to the pending
  value before confirmation succeeds.
- **R29.** Row actions that the landlord change standardised (`Button` + press feedback + hit area) and the audit/
  history tables are visually consistent; no admin table mixes bare links with buttons.

### 3.7 The unified bulk action bar (D9)

- **R30.** The three copies at `:784`, `:847`, `:902` become **one shared component** under `components/admin/`
  (D10/D29), parameterised by selection count, the action control (the status/action `<select>`), the apply handler,
  the cancel handler and the cap state.
- **R31.** The bar uses the **`.chrome-*` / material vocabulary** for its surface instead of hard-coded
  `bg-white/90`, so it follows the dark theme like the rest of the chrome; it keeps its `rounded-2xl`,
  `shadow-pop`/`shadow-2xl`-class elevation and stays **sticky at the bottom** (D9).
- **R32.** Its stacking is defined against the pinned topbar (both are `z-30` today): the bar must sit above section
  content and below `Modal`/`ConfirmDialog` (`z-50`), and must never be obscured by, or obscure, the pinned topbar.
- **R33.** The "Max 100 per bulk operation" message moves **inside** the bar (or above it) so it can never render
  off-screen below a sticky element; the 100-row cap, its toast copy and the "Selected first 100" info toast are
  unchanged.
- **R34.** The bulk flows keep their exact behaviour: selecting, the `selectable` DataTable wiring, the per-cap
  guards, the failed-ids-remain-selected behaviour, and the "Skipped your own account" info toast.

### 3.8 States render inside the shell (D1, D10)

- **R35.** Admin sections keep the `AdminTab` idea — loading (skeleton), error (`ErrorState`) and empty
  (`EmptyState`) — but the wrapper is rebuilt on the split (D10) as a shared **section frame** under
  `components/admin/`, used by all seven section bodies.
- **R36.** Empty states adopt `EmptyState`'s existing optional `icon` and `action` (R22's audit found 3 call sites
  using `title` only), so an empty Users/Properties/Audit table reads as a deliberate state rather than a bare
  sentence. **Existing empty-state copy is unchanged**; only icon/action are added where they help.
- **R37.** Because the shell now wraps everything and sections swap in place, **loading a section never removes the
  sidebar or topbar** — the `AdminTab` early-`return` pattern is safe here (it returns inside `RoleShell`), and the
  split must not move any early return above the shell.
- **R38.** The `PropertyAccessTab` section keeps its own query/loading/error handling (it fetches independently) and
  adopts the same section frame so all eight sections open identically.

### 3.9 Motion (D3, D15, D33)

- **R39.** **Polish, don't invent.** Existing animations keep their springs (`Modal`), and every actionable element
  on the surface gains/keeps instant press feedback on `:active` (skill: respond on pointer-down, not release).
  `Button`'s `active:scale-[0.97]` is the reference for anything currently without one — the row actions, the tab-bar
  buttons being deleted, the sidebar items, the status `<select>`, the bulk bar's controls.
- **R40.** **Nothing new moves** (D15): section switching is an instant swap; no page-entrance choreography, no
  staggered tile entrance, no animated counters, no scroll-driven reveals, no parallax.
- **R41.** No bounce anywhere (no interaction here is momentum-driven), and every animation touched must honour
  `prefers-reduced-motion: reduce` via the existing per-keyframe/`motion-reduce:` guard pattern, while the new
  material surfaces must honour the existing `prefers-reduced-transparency: reduce` path.
- **R42.** Motion never blocks input: no transition may lock out clicks during its run.

### 3.10 Accessibility (D18)

- **R43.** The sidebar is a real navigation landmark (`<nav>` inside `<aside>`, already the case) and the open
  section carries `aria-current="page"` (via `Link`'s active state / `activeProps`), so a screen reader can tell
  which of the 8 sections is open.
- **R44.** **The document title reflects the section**, so a browser tab or history entry names the open section
  rather than eight identical "Admin" entries.
- **R45.** Focus order stays logical (sidebar → topbar → section); switching sections must not move focus
  unpredictably, and the pinned chrome never traps focus or hides a focused element behind it.
- **R46.** `ConfirmDialog`'s existing focus management (focus the confirm button, return focus to the trigger on
  close, Escape/overlay cancel) is the required behaviour for the newly-confirmed actions (R26/R28).
- **R47.** The restyle must not regress the existing `aria-label`s (`Change account status`, the bulk selects, the
  expand-toggle labels `Expand rows for …` / `Collapse rows for …`), the `aria-busy`/`aria-live` loading wrappers, or
  the `focus-visible` outlines on the document-review buttons.

### 3.11 Non-goals encoded as guard rails

- **R48.** **Routes, data, queries, mutations and payloads are frozen.** `lib/routes.ts`, `lib/api/admin.ts`, every
  React Query key/invalidation, `validateSearch`-unrelated route config, and every user-visible string except the
  eight section headings/subtitles (R14) stay exactly as they are. `Protected role="admin"` and
  `accountHomeEntry('admin')` are untouched.
- **R49.** **No new admin capability** (D2): no sorting, filtering, search-within-table, pagination, column
  visibility, CSV export, or command palette. If the restructure tempts one (the audit log's missing time-of-day, the
  Users table's absent pagination), it is **recorded in §9, not implemented**.
- **R50.** No API/worker/D1/migration change, no dependency change (D33), no `routeTree.gen.ts` edit (no new route),
  no theme/palette change (D31/D23).
- **R51.** `LandlordDocumentsModal`'s copy, props and request bodies are **frozen** — restyle only (D34).

---

## 4. Files to change

### Modified

| #   | File                                          | Change                                                                                                                                                                                                        |
| --- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `lib/nav.ts`                                  | R2, R11 — `ADMIN_NAV` grows to 8 grouped items with `search`; add optional `search` to `NavItem`; export the tab→label map for breadcrumbs                                                                    |
| 2   | `components/layout/Sidebar.tsx`               | R9 — pass `NavItem.search` to `Link` and match active state including search (optional, so other roles are untouched)                                                                                         |
| 3   | `components/layout/Topbar.tsx`                | R11, R12 — `buildTrail` takes the search and resolves the section crumb                                                                                                                                       |
| 4   | `components/ui/Button.tsx`                    | R25 — only if a quiet-destructive-outline variant is genuinely missing; prefers extending the variant map over `!important`                                                                                   |
| 5   | `components/admin/AdminSkeletons.tsx`         | R22 — rebuild against the real `Card`/`DataTable` geometry                                                                                                                                                    |
| 6   | `components/admin/PropertyAccessTab.tsx`      | R21, R24, R26, R38 — notice/error banner treatment, Revoke confirms, section frame                                                                                                                            |
| 7   | `components/admin/LandlordDocumentsModal.tsx` | R25 only — retire the 2 `!` overrides onto real variants; **no copy or behaviour change** (D34/R51)                                                                                                           |
| 8   | `routes/admin/index.tsx`                      | R1, R3, R6, R7, R10, R37 — `nav={ADMIN_NAV}`, `validateSearch`, delete `TABS` + the tab bar + `handleTabChange`'s nav role + the ad-hoc confirm Modal; keep it as the shell + section switch + shared queries |

### New (D10/D29)

| #   | File                                                | Purpose                                                                                                                    |
| --- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 9   | `components/admin/AdminSection.tsx`                 | The `AdminTab` replacement: section frame + loading/error/empty (R35)                                                      |
| 10  | `components/admin/BulkActionBar.tsx`                | The unified sticky bulk bar (R30–R34)                                                                                      |
| 11  | `components/admin/sections/OverviewSection.tsx`     | The four `getSummary` tiles (R17)                                                                                          |
| 12  | `components/admin/sections/UsersSection.tsx`        | Users table + status control (R28)                                                                                         |
| 13  | `components/admin/sections/PropertiesSection.tsx`   | Properties table + moderation actions (R24–R26)                                                                            |
| 14  | `components/admin/sections/ApplicationsSection.tsx` | Applications stats + table + document-review entry point                                                                   |
| 15  | `components/admin/sections/LandlordsSection.tsx`    | Landlord verification table (R26)                                                                                          |
| 16  | `components/admin/sections/SettingsSection.tsx`     | The extracted `SettingsForm` (:1029)                                                                                       |
| 17  | `components/admin/sections/AuditSection.tsx`        | Audit log table + toolbar                                                                                                  |
| 18  | `components/admin/sections.ts`                      | Section registry: key → component, subtitle, and the section switch's ordering (keeps labels sourced from `ADMIN_NAV`, R4) |

**No** changes to `lib/api/admin.ts`, `lib/types.ts`, `lib/routes.ts`, `lib/nav.ts`'s `BOARDER_NAV`/`LANDLORD_NAV`/
`getBoarderNav`/`accountHomeEntry`, any landing file, `package.json`, `routeTree.gen.ts`, the worker, migrations, or
`app.css`'s palette.

**Blast-radius note:** items 1–3 are shared chrome. `NavItem.search` is optional and `buildTrail`'s search argument is
inert for every route without a `tab` param, so landlord/boarder rendering is unchanged by construction — which is
exactly why D20 chose this over an admin-only fork. `ADMIN_NAV` is currently unused (D27), so its growth breaks
nothing.

---

## 5. Resulting markup (illustrative, not final)

```tsx
// lib/nav.ts — ADMIN_NAV becomes 8 destinations, the single source of truth for section identity
export const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Overview',        icon: 'home',        group: 'Operations',     search: { tab: 'overview' } },
  { to: '/admin', label: 'Users',           icon: 'users',       group: 'Operations',     search: { tab: 'users' } },
  { to: '/admin', label: 'Properties',      icon: 'list',        group: 'Operations',     search: { tab: 'properties' } },
  { to: '/admin', label: 'Applications',    icon: 'application', group: 'Operations',     search: { tab: 'applications' } },
  { to: '/admin', label: 'Landlords',       icon: 'shieldCheck', group: 'Operations',     search: { tab: 'landlords' } },
  { to: '/admin', label: 'Property Access', icon: 'users',       group: 'Access & audit', search: { tab: 'property-access' } },
  { to: '/admin', label: 'Audit log',       icon: 'document',    group: 'Access & audit', search: { tab: 'audit' } },
  { to: '/admin', label: 'Settings',        icon: 'settings',    group: 'System',         search: { tab: 'settings' } },
];

// components/layout/Sidebar.tsx — search passed through, active state includes it
<Link
  key={`${item.to}?${item.search?.tab ?? ''}`}
  to={item.to}
  search={item.search}                       // optional: absent for every other role (D20)
  activeOptions={{ includeSearch: Boolean(item.search) }}
  activeProps={{ className: 'bg-mint font-semibold text-primary', 'aria-current': 'page' }}
  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-ink hover:bg-mint/50 active:scale-[0.98] motion-reduce:transition-none"
>

// routes/admin/index.tsx — shell + search-param section switch, no tab bar, no ad-hoc confirm
export const Route = createFileRoute('/admin/')({
  validateSearch: (search: Record<string, unknown>): { tab: SectionKey } => ({ tab: toSectionKey(search.tab) }),
  component: () => (<Protected role="admin"><AdminOverview /></Protected>),
});

return (
  <RoleShell nav={ADMIN_NAV}>                          {/* R1 — admin finally has a sidebar */}
    <Section active={tab} />                           {/* R8 — exactly one section renders */}
    <BulkActionBar … />                                {/* R30 — one bar, not three */}
    <LandlordDocumentsModal … />                       {/* unchanged (D34) */}
  </RoleShell>
);

// components/admin/sections/UsersSection.tsx — one heading, one frame, real controls
<AdminSection title="Users" icon="users" subtitle="Every account on the platform — boarders, landlords and admins." …>
  <PageHeader … />                                     {/* R14 — title sourced from ADMIN_NAV */}
  <DataTable … />
</AdminSection>

// components/admin/BulkActionBar.tsx — the three copies collapse into one, themed like the chrome
<div className="sticky bottom-4 z-30 mt-4">
  <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl border border-border bg-surface/90 px-4 py-3 shadow-pop backdrop-blur-xl">
    <span className="text-sm font-medium text-ink">{count} selected</span>
    <div className="flex items-center gap-2">{action} <Button … /> <Button variant="ghost" … /></div>
  </div>
  {overCap ? <p className="mt-2 text-center text-xs text-error-ink">Max 100 per bulk operation</p> : null}
</div>
```

---

## 6. Edge cases

| Case                                                                  | Expected behaviour                                                                                                                                                                                                     |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin` with no `?tab=`                                              | Lands on **Overview** (D25/R6), not a blank pane and not Users.                                                                                                                                                        |
| `/admin?tab=nonsense`                                                 | Falls back to **Overview**; `validateSearch` never throws and never renders a broken section (R6).                                                                                                                     |
| `/admin?tab=property-access`                                          | Selects Property Access; the sidebar item is the active one, and the crumb reads `Admin / Property Access`.                                                                                                            |
| Deep link straight to `/admin?tab=audit`                              | Audit section is selected on first paint, its own query fires, the sidebar shows it active, and the document title names it (R7/R44).                                                                                  |
| Refresh on a section                                                  | Same section (D5) — the first time admin survives a reload in place.                                                                                                                                                   |
| Browser Back from `/admin?tab=users` after visiting `?tab=properties` | Returns to Users, staying inside admin (today Back leaves the page).                                                                                                                                                   |
| Section switch with rows selected                                     | That section's selection mode and selected set reset, exactly as `handleTabChange` does today (R10); other sections' state is unaffected.                                                                              |
| Section switch while a mutation is pending                            | The mutation keeps running; the bulk bar belongs to its own section and is unmounted with it, so no stray bar persists over another section.                                                                           |
| Sidebar collapsed                                                     | The 8 items (and 3 group headers) collapse to icons as they do for landlord; the section switch still works and the breadcrumb trail reflows without overlap.                                                          |
| Sidebar at sub-`lg` widths                                            | Admin now has the same 288px rail the other roles have; `DataTable`'s `overflow-x-auto` absorbs the narrower column, and the deferred mobile-drawer issue is inherited, not solved (§9).                               |
| Long admin tables (hundreds of rows)                                  | Rhythm unchanged (R18); the page remains the scroll container and the sticky bulk bar sits above the rows.                                                                                                             |
| Bulk bar visible while scrolling a long table                         | Sits above rows, below `Modal`/`ConfirmDialog` (`z-50`), and never obscures the pinned topbar (R32).                                                                                                                   |
| Over-cap selection (101+)                                             | The cap message renders inside/above the bar (R33); Apply stays disabled; the cap, its toast and the "Selected first 100" info toast are unchanged.                                                                    |
| Bulk action fails for some ids                                        | Failed ids stay selected exactly as today; the success + error toast pair is unchanged (R34).                                                                                                                          |
| Choosing `banned`/`suspended` on a row `<select>`                     | `ConfirmDialog` names the user, the mutation fires only on confirm, and the select does not show the new value before it commits (R28).                                                                                |
| Choosing `active` on a row `<select>`                                 | Applies immediately, no dialog (R12/D21).                                                                                                                                                                              |
| Cancelling a confirm                                                  | Nothing mutates, focus returns to the trigger (R46), and any pending selection state is untouched.                                                                                                                     |
| Per-row Reject/Flag/Revoke                                            | Confirm first (R26); Publish/Approve stay one click.                                                                                                                                                                   |
| A section's query is loading                                          | Sidebar and topbar stay put; only the section body shows its skeleton (R37).                                                                                                                                           |
| A section's query errors                                              | `ErrorState` renders **inside** the shell; the sidebar keeps working so the admin can move elsewhere.                                                                                                                  |
| A section is empty                                                    | `EmptyState` renders inside the shell, with icon/action where they help, copy unchanged (R36).                                                                                                                         |
| `/admin` in dark mode                                                 | Every surface (chrome, cards, tables, pills, banners, skeletons, the bulk bar, the confirm dialog) uses semantic tokens and inverts; the lint-level check is that **no literal palette class remains** in admin (R19). |
| `prefers-reduced-transparency: reduce`                                | Sidebar and topbar go opaque and drop blur (existing `.chrome-*` rule); admin adds no new translucent surface outside that path.                                                                                       |
| `prefers-reduced-motion: reduce`                                      | Press feedback and existing springs degrade to non-animated changes; section switching is already instantaneous (R41).                                                                                                 |
| Keyboard-only use                                                     | Sidebar items are links and focusable; `aria-current` marks the open section; dialogs focus-manage; no focus is trapped behind pinned chrome (R43–R46).                                                                |
| A screen reader announces the open section                            | Document title names it (R44); the nav landmark exposes `aria-current`.                                                                                                                                                |
| `LandlordDocumentsModal` opened from Applications                     | Unchanged: title format, `2 of 4 documents`, Approve disabled logic, notification message and request bodies all still match `landlord-documents-modal.test.tsx` (D34).                                                |
| `PropertyAccessTab`'s Remove-access flow                              | Still `ConfirmDialog`-confirmed with its "Data they created" block; only the envelope is restyled (R21/R38).                                                                                                           |
| Tenant-facing / landlord pages                                        | Unchanged: `NavItem.search` is optional and `buildTrail`'s search argument is inert without a `tab` param (R12/D20). `components.test.tsx` and `routes.test.ts` must stay green.                                       |

---

## 7. Verification (D19)

```bash
bun run web:typecheck   # must be clean
bun run web:test        # existing suite must stay green (16 test files, incl. landlord-documents-modal.test.tsx)
bun run web:build       # must succeed
```

Plus a **build-output check** on the emitted CSS, mirroring how the landlord change verified its utilities beyond
happy-dom (there is no layout engine in the test env, so visual intent can only be confirmed in the compiled
artefact):

```bash
# the materials/utilities this change relies on must actually compile
grep -o "backdrop-blur-xl\|backdrop-saturate-150\|bg-surface/90\|rounded-2xl\|shadow-card\|shadow-pop\|active:scale-\[0\.97\]" \
  apps/web/dist/client/assets/app-*.css | sort -u

# the accessibility guards must still be present after touching the chrome
grep -o "prefers-reduced-motion\|prefers-reduced-transparency\|prefers-color-scheme" \
  apps/web/dist/client/assets/app-*.css | sort -u

# the surface must hold no literal palette colours
grep -rnoE "(bg|text|border|divide|ring)-(gray|red|green|yellow|blue|purple|amber|slate)-[0-9]+" \
  apps/web/src/routes/admin apps/web/src/components/admin   # expect: no matches

# no Button overrides survive
grep -rn '!bg-\|!border-\|!text-' apps/web/src/routes/admin apps/web/src/components/admin   # expect: no matches

# the dead tab bar and the ad-hoc confirm are gone
grep -rn "const TABS\|handleTabChange\|Apple design confirmation modal" apps/web/src/routes/admin/index.tsx  # expect: no matches

# admin is wired to a sidebar at last
grep -rn "ADMIN_NAV" apps/web/src   # expect: lib/nav.ts (definition) + routes/admin/index.tsx (consumer)
```

**Not verified by this spec:** real scroll/sticky behaviour of the bulk bar under the pinned topbar, the actual blur
rendering of the sidebar and bar, dark-mode appearance, and the perceived quality of the new spacing and headings.
D19 deliberately did not choose the browser-walkthrough option, so the last mile is a human glance at `/admin` in
both themes at desktop and narrow widths.

---

## 8. Out of scope (explicit)

- **Any IA change beyond D4/D32** — no section merged, split, reordered in meaning or renamed; the 7 existing
  sections keep their identity and their contents.
- **New admin capabilities** (D2/R49) — sorting, filtering, search-within-table, pagination, column pickers, export,
  bulk-edit beyond today's three flows, a command palette.
- **Route changes** — no new route files, no `routeTree.gen.ts` edit; the section param is the only new addressing
  (D5).
- **Data-layer changes** — `lib/api/admin.ts`, `lib/types.ts`, query keys, invalidations, bulk semantics, the 100-row
  cap.
- **Copy changes** beyond the eight section headings/subtitles (R14) — all table headers, action labels, toast
  messages, empty-state text, confirm wording and `LandlordDocumentsModal`'s pinned strings stay as they are.
- **`LandlordDocumentsModal` behaviour** (D34/R51) — restyle only.
- **A rebrand or palette change** (D31) — the green/cream token set is untouched; only existing tokens are adopted.
- **New motion** (D15/R40) — section transitions, staggered reveals, animated counters, scroll-driven effects,
  parallax.
- **The mobile sidebar drawer** — admin inherits the 288px-at-every-width rail (D36); fixing it is still deferred for
  all roles.
- **Dark-mode _toggle_** — dark mode is automatic via `prefers-color-scheme`; no toggle is added, and a manual switch
  remains out of scope.
- **New tests** (D19) — typecheck + existing suite + built-CSS check only.
- **Committing the work** (D23).

---

## 9. Open questions / risks

1. **Two agents may be in the same files.** The admin files changed on disk _during_ this interview: a colour-token
   pass appeared (`text-green-600` → `text-success-ink`, `bg-purple-100` → `bg-accent-tint`, `divide-gray-100` →
   `divide-border`), `RoleShell title="Admin overview"` was dropped, and the `<h2>` was promoted to a tracked `<h1>`
   (D24). Those edits are **not mine** and are already staged/unstaged in the tree alongside unrelated work. Before
   implementing, re-read the four files — the "current state" in §2 is a snapshot, and item 8's rewrite of
   `routes/admin/index.tsx` is the change most likely to collide with a concurrent edit.
2. **The six new subtitles are new copy.** D22 has the agent author them, and §3.4 lists all eight for review. They
   are the only strings that change; if any wording is wrong, fix it in the spec before implementation so the heading
   table stays the single source of truth.
3. **Section identity vs. the old "Command Center".** D4/D6 mean the heading becomes _Overview_ while the previous
   heading was _Command Center_, and `ADMIN_NAV` already said _Overview_. The old name disappears from the surface.
   If "Command Center" was intentional branding, this is the place to say so.
4. **Sidebar-first admin may read as more navigation than the surface needs.** Eight destinations for what is one
   dense console is a real trade: it buys deep links, breadcrumbs and shell consistency, and it costs a 288px column
   that the tables currently use. If the console feel matters more, the fallback is D4's alternative — keep the
   topbar-only shell and make the tab bar a proper segmented control — which would leave R1–R13 mostly moot.
5. **`NavItem.search` is a shared-component change.** It is optional and inert for other roles by construction, but
   it does touch the component every role renders. If a regression appears in the landlord or boarder sidebar, D20's
   fallback is an admin-owned section list instead of an extension to `NavItem`.
6. **Search-aware active matching is the fragile part.** TanStack `Link` active state with `includeSearch` must be
   confirmed at implementation time; if it proves unreliable, the fallback is for the admin section list to compare
   the parsed `tab` value itself rather than relying on route matching.
7. **Breadcrumb section labels need a home.** R11 puts the tab→label map in `lib/nav.ts` so `Topbar` never imports an
   admin component. If that layering reads wrong, the alternative is a small `lib/crumbs.ts`; the constraint that
   must hold is that the shared `Topbar` does not depend on `components/admin/*`.
8. **The bulk bar's stacking is genuinely awkward.** It and the pinned topbar are both `z-30`, and the bar is
   `sticky bottom-4` inside a page whose `main` has `pb-16`. R32 defines the intent but the exact layering (`z`
   values, offset, safe area on mobile) is likely to need one adjustment during implementation.
9. **`text-yellow-600` → `text-warning-ink` changes the Flag affordance's look.** It is the correct token and the
   only literal colour left (R19), but `--color-warning-ink` is a brown-ish amber (#92400e) versus the brighter
   yellow-600, so the Flag action will read more muted. Accepted as the price of dark-mode correctness; worth a
   glance in the built result.
10. **`SettingsSection` has a latent bug worth not preserving.** `SettingsForm` sets `saved` to true on submit and
    never on success, so "Saved." appears even when the mutation fails (and never clears on failure). R48 freezes
    behaviour, but if the section is restyled anyway, this is the one behaviour fix that is nearly free — it needs an
    explicit go-ahead, because it is technically a behaviour change.
11. **Splitting 1,085 lines is the largest mechanical part.** Eight section files + a frame + the bulk bar, with the
    shared queries, mutations and selection state staying in the route file. The risk is a half-migrated state where
    a section reads state it no longer owns; the mitigation is to move one section at a time and keep typecheck green
    throughout.
12. **The audit log still has no time of day** (`formatDate` → `toLocaleDateString()`), while `PropertyAccessTab`'s
    history uses `toLocaleString()`. Two admin views disagree about how "when" is rendered. R49 puts that out of
    scope; it is a one-line fix if you want it folded in.

---

## 10. Acceptance criteria

- [ ] `/admin` renders `RoleShell` **with** `ADMIN_NAV`, so admin has the same pinned sidebar, translucent chrome and
      single scrolling column as landlord and boarder; the in-page tab bar is gone.
- [ ] `ADMIN_NAV` has 8 grouped destinations (Overview, Users, Properties, Applications, Landlords, Property Access,
      Audit log, Settings), each with an icon and a `tab` search value, and is consumed by the admin route.
- [ ] The open section lives in `?tab=` on the same route: deep links work, refresh keeps the section, Back returns to
      the previous section, an unknown value falls back to Overview, and exactly one section renders at a time.
- [ ] `NavItem.search` is optional and passed through `Sidebar` with search-aware active matching, so exactly one
      sidebar item is active and no other role's nav changes.
- [ ] Breadcrumbs read `Admin / Users` for `/admin?tab=users`, `Admin` for `/admin`, stay `aria-current` on the last
      crumb, and are inert for every route without a `tab` param.
- [ ] Each of the 8 sections opens with the shared `PageHeader` (icon, title, subtitle), with the title sourced from
      `ADMIN_NAV` and the 8 subtitles matching §3.4.
- [ ] The four `getSummary` tiles live only in the Overview section; the 7 work sections no longer render them.
- [ ] The three sticky bulk bars collapse into one shared component, themed with the chrome material instead of
      `bg-white/90`, stacking correctly under the pinned topbar and below `Modal`/`ConfirmDialog`, with the cap
      message inside/above the bar; cap, toasts, selection and failed-ids behaviour unchanged.
- [ ] The ad-hoc `Modal` confirm and its label-string-matching danger logic are deleted; bulk actions, per-row
      Reject/Flag, landlord Reject, Revoke invitation and negative account-status changes all confirm through
      `ConfirmDialog` with `busy` wired to the specific mutation; Publish, Approve and `active` stay one click.
- [ ] The Users row status control stays a native select, is restyled, and does not display a pending value before
      confirmation.
- [ ] Row actions are `Button` variants with real hit areas and press feedback; **no** file overrides a `Button`'s
      colours (the 3 `!` overrides are gone).
- [ ] **No literal palette colour remains** in `routes/admin/` or `components/admin/`; pills, banners, notices and
      skeletons all use semantic tokens, and the whole surface is legible in dark mode.
- [ ] `RoleBadge`/hand-rolled pills use `StatusBadge`; `PropertyAccessTab` uses the shared notice/banner treatment;
      `AdminSkeletons` matches the real `Card` and `DataTable` geometry.
- [ ] Every section renders loading, error and empty states **inside** the shell through the shared section frame,
      with `EmptyState`'s optional icon/action used where it helps and empty-state copy unchanged.
- [ ] No new motion beyond polish and press feedback: section switching is instantaneous, no bounce anywhere, reduced
      motion and reduced transparency honoured, and no transition blocks input.
- [ ] Accessibility: `aria-current` on the open section, document title naming the section, preserved focus order,
      pinned chrome never trapping focus, dialog focus management intact, existing `aria-label`s/`aria-live`
      wrappers/`focus-visible` outlines not regressed.
- [ ] Routes, `lib/api/admin.ts`, query keys/invalidations, mutation payloads, validation, `Protected`, and **all copy
      except the eight headings/subtitles** are unchanged; `LandlordDocumentsModal` is restyle-only.
- [ ] `bun run web:typecheck` clean, `bun run web:test` green, `bun run web:build` succeeds, and the emitted CSS
      contains the materials/utilities the change relies on plus the reduced-motion and reduced-transparency guards.
- [ ] Working tree left **uncommitted**, with the pre-existing in-flight edits (D24) untouched.
