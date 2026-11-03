# Spec — Landlord dashboard redesign (overview + activity feed)

**Status:** **Implemented and verified locally (2026-10-19).** The dashboard, activity feed, activity
page, and both placeholder routes are in the tree; API and web suites pass, both typechecks pass, and
`web:build` regenerates the route tree cleanly. See §16 for the implementation record.
**Short name:** `landlord-dashboard-redesign`
**Date:** 2026-10-19
**Surface:** `http://localhost:3000/landlord` (the landlord dashboard), plus a real
`/landlord/activity` page and two placeholder routes.
**Owner request (verbatim):**

> create this feature in the dashboard, with base on the image, thos words should route to what it
> should be routed

**How that was read.** The reference image (transcribed in §2.1) is a landlord dashboard: a welcome
header with an attention count and a create-listing CTA, four metric cards, a revenue line chart, an
“Action center” of four counted actions, a “My properties” occupancy list, and a “Recent activity”
feed. The request has two parts: **build that layout** and **make every action word route to the
right place**. Nine rounds of `ask_user` settled which numbers may be real, which are fixtures, how
far the visuals should chase the mockup, and where each word goes.

**Relationship to existing work**

| Document                                                                            | Relationship                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `payments-tracker-redesign-spec.md`                                                 | Owns the payment vocabulary (`due_today`, `in_grace`, `overdue`) and the tracker’s summary. This spec **keeps that vocabulary** (D11) and links to the tracker; it does not change the tracker.                                                         |
| `landlord-calendar-spec.md`                                                         | Owns the aggregated date model, event families, links, and the 62-day / 500-event guards. This spec **extends the calendar repository with timestamps** and reuses its event sources for the activity feed (D20); it does not change the calendar page. |
| `landlord-apple-ui-restructure-spec.md` / `admin-apple-ui-restructure-spec.md`      | Own the single-shell convention (`Protected` + one `RoleShell`), `PageHeader`, `Card`, semantic tokens, and the subtitle-reduction rule. This spec follows them and introduces **no new page shell**.                                                   |
| `landlord-property-detail-page-spec.md` / `landlord-properties-card-layout-spec.md` | Own `/landlord/properties` and its card list. This spec only links to it and reads the same `GET /api/landlord/properties` payload.                                                                                                                     |
| `payments-feature-spec.md`                                                          | Owns `collected_this_month`, `manilaToday()`, and charge-derived statuses. The revenue card and the activity feed reuse those helpers.                                                                                                                  |
| `docs/qa/specs/qa-spec-audit.md`                                                          | Describes `/landlord/activity` as a placeholder. That row is stale after this change and needs a re-check (not owned here).                                                                                                                             |

---

## 1. Interview decisions (as answered by the requestor)

Collected in **nine rounds** of `ask_user`, 42 decisions. Contradictions between an early and a late
answer are marked and resolved. Items marked **(agent default)** are choices the interview left open;
they are restated in §14 so review can overturn them cheaply.

### Round 1 — surface, honesty, routing, fidelity

| #   | Topic          | Decision                                                                                                                                                                  |
| --- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Target surface | **The landlord dashboard only** (`/landlord`). Boarder and admin dashboards are untouched.                                                                                |
| D2  | Missing data   | **Visuals first, data later.** Blocks with no API today are built against sample data. The activity feed is the exception: D15 gives it a real endpoint in this change.   |
| D3  | Link rule      | **Only action words are links.** Titles, numbers, property rows, and the body of an activity row are not clickable; a trailing action word inside an activity row may be. |
| D4  | Fidelity       | **Structural match, not pixel match.** Same sections, hierarchy, and interaction points; Haven Space primitives, tokens, and copy conventions win over mockup styling.    |

### Round 2 — live data, fixtures, zero states, chart

| #   | Topic                 | Decision                                                                                                                                    |
| --- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| D5  | The four metric cards | **Stay live**, served by `GET /api/landlord/dashboard-stats`. The only fixtures left are the revenue trend and the maintenance count (D17). |
| D6  | Fixture location      | **One typed fixture module** (shape-compatible with the future API), not JSON or inline literals.                                           |
| D7  | Action rows at zero   | **Always show all four rows**; a zero renders as `0` and the action stays clickable (the destination explains the empty list).              |
| D8  | “No overdue payments” | **Static line for now**; the conditional “overdue warning” variant is documented as a follow-up when the API lands.                         |
| D9  | Chart implementation  | **Add a chart library.** The specific library is left to the implementer (D22).                                                             |

### Round 3 — chart basis, card copy, properties, feed page, responsive

| #   | Topic                                   | Decision                                                                                                                                          |
| --- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| D10 | Revenue trend basis                     | **Collected payments, trailing six months**, ending with the current Manila month. Labels move with today’s date; they are not frozen at May–Oct. |
| D11 | Card copy vs mockup                     | **Keep the live vocabulary**: “N due today · N in grace · N overdue”, and show the **real 0% trend** rather than inventing “▲ 12.5%”.             |
| D12 | My properties (_superseded by D24/D25_) | First answered as “top 5, low < 50%”; replaced in round 5 by “live, all properties”.                                                              |
| D13 | “View all” for activity                 | **Build the feed page** rather than hiding the link.                                                                                              |
| D14 | Responsive behaviour                    | **Follow the existing landlord pages’ breakpoints** (stat grid 1 / 2 / 4 columns, content stacks below `lg`).                                     |

### Round 4 — activity scope, counts, orphan destinations, spec depth

| #   | Topic                 | Decision                                                                                                                                                                         |
| --- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D15 | Activity data         | **Real endpoint + real page.** Add `GET /api/landlord/activity` and replace the `/landlord/activity` placeholder in this change.                                                 |
| D16 | Activity event set    | **Everything dated** — mirror the calendar’s event families, not a hand-picked subset. _(Refined by D40 and D41: one activity-only type is added and `charge_due` is excluded.)_ |
| D17 | Action-center counts  | **Live where possible**: pending applications, rent due, and renewals come from existing endpoints; maintenance is the only fixture-backed count.                                |
| D18 | Orphan actions        | **Add placeholder pages** for `/landlord/maintenance` and `/landlord/renewals` so “Open” and “Send offer” never dead-end.                                                        |
| D19 | Spec depth / location | **Implementation-ready** at `docs/specs/landlord-dashboard-redesign-spec.md` (this file).                                                                                        |

### Round 5 — activity mechanism, nav, library, attention count, properties

| #   | Topic                 | Decision                                                                                                                                  |
| --- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| D20 | Activity mechanism    | **Extend the calendar repository to carry timestamps** while keeping its date-only display; the feed consumes the same aggregation.       |
| D21 | New placeholder pages | **Not in the sidebar.** They are reachable from the dashboard actions only; `LANDLORD_NAV` is unchanged.                                  |
| D22 | Chart library         | **Implementer decides.** The spec fixes the chart’s behaviour and accessibility bar, not the package.                                     |
| D23 | Attention count       | **Sum of the four action counts** (applications + maintenance + rent due + renewals), so the header always agrees with the Action center. |
| D24 | My properties data    | **Live, all properties** (supersedes D12’s top-five cap).                                                                                 |

### Round 6 — property list, bars, activity page, card links, feed size

| #   | Topic                | Decision                                                                                                |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------- |
| D25 | Property list length | **All accessible properties, no cap.** The card grows with the portfolio; “Manage →” carries the rest.  |
| D26 | Occupancy bar        | **Single primary green tone**; the `low` tag alone carries the warning (never colour alone).            |
| D27 | Activity page        | **Filterable, paged list**: type filters, property selector, date range, and a “Load more” control.     |
| D28 | Existing card links  | **Keep “Open tracker” only** on the payment-alerts card; remove “Open calendar” from the renewals card. |
| D29 | Dashboard feed       | **Four rows with relative time** (“just now”, “Nm ago”, “Nh ago”, “Yesterday”, then a short date).      |

### Round 7 — card visuals, renewals copy, chart a11y, empty account, verification

| #   | Topic               | Decision                                                                                                                      |
| --- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| D30 | Metric card visuals | **Keep the mint icon tiles** and the existing `StatCard` silhouette; the mockup’s icon-less cards are not adopted.            |
| D31 | Renewals card       | **Keep the live copy** (count + “This month”); no “Next: Nov 3 · Review” fixture line.                                        |
| D32 | Chart accessibility | **Tooltip per point + a visually hidden data table**; keyboard-focusable points.                                              |
| D33 | Empty account       | **Zeros + guided empty states** (create a listing), not invented sample values.                                               |
| D34 | Verification bar    | **Typecheck + build only.** No new tests are required by this spec; existing tests that break must be updated, never skipped. |

### Round 8 — fixtures vs empty, action behaviour, payments link, row style, future contract

| #   | Topic                    | Decision                                                                                                                                                                            |
| --- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D35 | Chart for a new landlord | **Fixture trend whenever the landlord has at least one property**; when the property list is empty, the chart shows its empty state and the maintenance fixture is suppressed to 0. |
| D36 | Action behaviour         | **Navigation only.** No mutations, modals, or reminder sends from the dashboard.                                                                                                    |
| D37 | “View payments →”        | **`/landlord/payments`, unfiltered** (default month and property).                                                                                                                  |
| D38 | Activity row layout      | **Plain text + time**, exactly like the mockup; no icons, chips, or status pills in the feed rows.                                                                                  |
| D39 | Future API contract      | **No appendix.** Fixtures and TODOs are documented here; endpoint design for chart/maintenance waits for the phase that builds it.                                                  |

### Round 9 — listing event, due events, activity page density

| #   | Topic                 | Decision                                                                                                                                                                        |
| --- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D40 | Listing event         | **Add `listing_published`** as an activity-only event (no calendar change), sourced from `properties.created_at` for moderation-published, non-draft listings. _(Extends D16.)_ |
| D41 | Scheduled due events  | **Only events that happened.** Exclude `charge_due` from the feed; include payments, applications, tenancy changes, announcements, and listing publications. _(Refines D16.)_   |
| D42 | Activity page density | **Same plain style** as the dashboard rows, with an added muted context line (property · room · boarder) — no icons or pills.                                                   |

---

## 2. The reference design

### 2.1 Transcription of the mockup

```
Welcome back, kaTGee                                  [+ Create listing]
You have 10 things that need attention today.

[OCCUPANCY]        [MONTHLY REVENUE]    [UPCOMING RENEWALS]   [PAYMENT ALERTS]
45%                ₱58,500              2                     3
▓▓▓▓▓▓▓▓░░░░        ▲ 12.5% vs last      Next: Nov 3 · Review  3 due soon · 0 overdue
9 of 20 rooms ·    month
11 vacant

[Revenue trend                 View payments →]   [Action center]
  line chart, May–Oct                               3  Pending applications     Review →
                                                    2  Maintenance requests      Open →
                                                    3  Rent payments due soon    Remind →
                                                    2  Lease renewals            Send offer →
                                                    ✓ No overdue payments

[My properties                    Manage →]        [Recent activity         View all →]
Sunrise Apartments  7 / 12 occupied                 New application received     12 min ago
▓▓▓▓▓▓▓▓▓▓▓░░░░                                    Lease renewal request created 2 h ago
Greenview Rooms     2 / 8 occupied · low            Payment record updated      Yesterday
▓▓▓▓░░░░░░░░░░░░                                  Property listing published  Oct 16
```

### 2.2 What is reproduced, and what deliberately differs

| Mockup element                                  | Result                                                                                                                                                                              |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Four metric cards with icon tiles               | **Reproduced**, live. The mockup is icon-less but D30 keeps the tiles.                                                                                                              |
| “▲ 12.5% vs last month”                         | **Not reproduced.** The API hard-codes `trend: 0`; the card renders “0% vs last month” (D11).                                                                                       |
| “Next: Nov 3 · Review” on renewals              | **Not reproduced.** The card keeps count + “This month” (D31).                                                                                                                      |
| Occupancy progress bar                          | **Reproduced** as a thin bar under the occupancy sub-line (agent default; not a separate question).                                                                                 |
| “45% / 9 of 20 rooms · 11 vacant”               | **Reproduced**; “N vacant” is derived client-side from `total_rooms - occupied_rooms`.                                                                                              |
| Revenue line chart                              | **Reproduced** with fixtures, six trailing months (D10).                                                                                                                            |
| Action center with four counted rows            | **Reproduced**; three counts are live, maintenance is a fixture (D17).                                                                                                              |
| “No overdue payments” all-clear line            | **Reproduced** statically; conditional behaviour is deferred (D8).                                                                                                                  |
| My properties with occupancy bars and `low` tag | **Reproduced**, live, all properties (D24/D25).                                                                                                                                     |
| Recent activity with relative times             | **Reproduced** as a real feed. “Lease renewal request created” becomes whatever the underlying event is (e.g. “Leave request submitted”) because no renewal-request feature exists. |
| “Property listing published”                    | **Reproduced** via the new activity-only `listing_published` type (D40).                                                                                                            |

### 2.3 Layout grid

`RoleShell` already caps content at `max-w-[1280px]` with `px-6 lg:px-10`. Inside it:

1. Verification banner (existing, unchanged).
2. `PageHeader`: title, derived subtitle, `+ Create listing` action.
3. Metric grid: `grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4`.
4. Chart + Action center: `mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3`; chart `lg:col-span-2`, action
   center `lg:col-span-1`.
5. Properties + Activity: `mt-5 grid grid-cols-1 gap-5 md:grid-cols-2`.

The chart and action center are equal-height on `lg` (stretch), with the action rows distributed from
the top and the all-clear line pinned to the bottom of the card.

---

## 3. Current state (read-only inspection, 2026-10-19)

| Surface              | File                                                            | What it does today                                                                                                                                                                      |
| -------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landlord dashboard   | `apps/web/src/routes/landlord/index.tsx` (160 lines)            | `Protected role="landlord"` + `RoleShell`, pending-verification banner, `PageHeader`, four live stat cards from `getDashboardStats`, three quick-link cards.                            |
| Dashboard API client | `apps/web/src/lib/api/landlord.ts`                              | `getDashboardStats(token)` → `GET /api/landlord/dashboard-stats`.                                                                                                                       |
| Dashboard repository | `workers/api/src/repositories/landlord-dashboard.ts`            | Occupancy from `rooms`; revenue = `buildPaymentAlerts().collected_this_month`; renewals = accepted/approved/confirmed applications; alert counts.                                       |
| Properties list      | `GET /api/landlord/properties`                                  | Returns `occupied_rooms`, `total_rooms`, `monthly_revenue`, `pending_applications` per property. Already consumed by `LandlordPropertyCards`.                                           |
| Activity page        | `apps/web/src/routes/landlord/activity.tsx`                     | 15-line `PlaceholderPage`: “An activity feed will appear here once the landlord activity endpoint is finalized.”                                                                        |
| Calendar repository  | `workers/api/src/repositories/landlord-calendar.ts` (770 lines) | Nine event types built from charges, applications, and announcements. Date-only (`date: YYYY-MM-DD`), no source timestamps. `MAX_CALENDAR_EVENTS = 500`, window ≤ 62 days at the route. |
| Relative time helper | `apps/web/src/lib/messages.ts`                                  | `relativeTime()` and `parseTimestamp()` already exist for messages; thresholds are `just now` / `Nm ago` / `Nh ago` / `Nd ago` / date.                                                  |
| Charting             | —                                                               | **No chart dependency** in `apps/web/package.json`.                                                                                                                                     |
| Maintenance          | —                                                               | **No table, route, repository, or UI.**                                                                                                                                                 |
| Lease renewals       | —                                                               | **No renewal entity.** The existing “renewals” count is accepted/confirmed applications (`landlord-dashboard.ts`).                                                                      |

**Data gaps this spec has to be honest about**

- No revenue-history endpoint; `revenue.trend` is hard-coded to `0` in the repository.
- No maintenance feature; the action row’s count has nothing real to read.
- No renewal/offer flow; “Send offer” can only lead to a placeholder.
- Activity has no endpoint and no timestamps carried by the calendar event type.

---

## 4. Scope

### In scope

1. Rebuild `/landlord` around the mockup’s five sections.
2. Keep the four metric cards live; add the occupancy progress bar and “N vacant”.
3. Add the fixture-backed revenue trend chart with tooltip + hidden table + empty state.
4. Add the Action center with live counts where they exist and a fixture maintenance count.
5. Add the live My properties occupancy list (all properties).
6. Add `GET /api/landlord/activity`, extend calendar events with `occurred_at`, and build the
   dashboard feed + the `/landlord/activity` page.
7. Add `/landlord/maintenance` and `/landlord/renewals` placeholder routes (not in nav).
8. Implement the exact link map in §6.

### Out of scope

- Any change to the boarder or admin dashboards, their nav, or their APIs.
- Building a maintenance product (tables, requests, statuses, photos).
- Building a lease-renewal/offer product.
- A real revenue-history endpoint or a computed revenue trend.
- Reworking `/landlord/payments`, `/landlord/properties`, `/landlord/applications`, or the calendar
  page.
- New database tables or migrations. **No migration is required by this spec.**
- New automated tests as a gate (D34). Recommended tests are listed in §12.3 but not required.
- URL-state or pagination for the dashboard card (the activity page owns URL state).

---

## 5. Data sourcing

### 5.1 The matrix

| Block                  | Source                                                     | Real or fixture | Notes                                                                                              |
| ---------------------- | ---------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------- |
| Welcome subtitle count | Sum of the four Action-center counts                       | Derived         | Recomputes when any count changes.                                                                 |
| Occupancy card         | `dashboard-stats.occupancy`                                | **Live**        | Sub-line gains `· N vacant`; progress bar at `rate%`.                                              |
| Monthly revenue card   | `dashboard-stats.revenue`                                  | **Live**        | `trend` is 0 today; render `0% vs last month`, not an invented positive.                           |
| Upcoming renewals card | `dashboard-stats.renewals`                                 | **Live**        | Count + `period` (“This month”); no link.                                                          |
| Payment alerts card    | `dashboard-stats.payment_alerts`                           | **Live**        | Value = `due_today + in_grace + overdue`; sub-line in the tracker vocabulary; “Open tracker” link. |
| Revenue trend          | `dashboard-fixtures.revenueTrend(now)`                     | **Fixture**     | Six trailing months, collected basis, suppressed when the landlord has no properties (D35).        |
| Pending applications   | `properties.data.properties[].pending_applications` summed | **Live**        | Uses the existing `['landlord-properties']` query.                                                 |
| Maintenance requests   | `dashboard-fixtures.maintenanceRequests`                   | **Fixture**     | 2, matching the mockup; forced to 0 when the property list is empty.                               |
| Rent payments due soon | `dashboard-stats.payment_alerts.due_soon`                  | **Live**        | This is the tracker’s “due soon” bucket (within 3 days), not “due today”.                          |
| Lease renewals         | `dashboard-stats.renewals.upcoming_count`                  | **Live**        | Known quality gap: it counts accepted/confirmed applications, not renewals.                        |
| My properties          | `GET /api/landlord/properties`                             | **Live**        | All properties, API order; `low` when occupancy < 50%.                                             |
| Recent activity        | `GET /api/landlord/activity?limit=4`                       | **Live (new)**  | Default trailing 30-day window; four rows; plain text + relative time.                             |
| Activity page          | `GET /api/landlord/activity` with filters                  | **Live (new)**  | See §9.                                                                                            |

### 5.2 The fixture module

`apps/web/src/lib/dashboard-fixtures.ts` — **typed, deterministic, and clearly marked as a fixture.**

```ts
/** UI fixture — replace with the revenue-history endpoint when it exists (spec D10/D35). */
export interface RevenuePoint {
  /** `YYYY-MM`, Manila month. */
  month: string;
  /** Short axis label, e.g. "May". */
  label: string;
  /** Money actually collected in the month, in PHP. */
  collected: number;
}

/**
 * Six trailing months ending with the current Manila month, with the same
 * cadence as the mockup. Values are sample data: the last point is ₱58,500.
 */
export function revenueTrend(now: Date = new Date()): RevenuePoint[];

/** UI fixture — no maintenance feature exists yet (spec D17). */
export const maintenanceRequests = 2;
```

Sample output when today is 2026-10-19:

| Month   | Label | Collected |
| ------- | ----- | --------- |
| 2026-05 | May   | ₱38,500   |
| 2026-06 | Jun   | ₱41,200   |
| 2026-07 | Jul   | ₱39,800   |
| 2026-08 | Aug   | ₱46,500   |
| 2026-09 | Sep   | ₱51,000   |
| 2026-10 | Oct   | ₱58,500   |

Rules:

- Month labels are produced with `Intl.DateTimeFormat('en-PH', { month: 'short' })`, not a hard-coded
  array, so the trailing window is always correct.
- The function is pure and takes `now` for deterministic renders.
- File-level comment: **“These values are not real revenue. They exist to render the design; the
  revenue-history endpoint is out of scope (spec §13).”**
- When the landlord has zero properties, the dashboard must not call this function for display; it
  shows the chart’s empty state instead (D35).

### 5.3 Attention count

```
attention =
  pendingApplications          // sum of properties[].pending_applications
  + maintenanceCount           // fixture, or 0 when properties.length === 0
  + paymentAlerts.due_soon
  + renewals.upcoming_count
```

Copy:

- `attention > 0`: `You have {n} thing{s} that need attention today.`
- `attention === 0`: `You have nothing that needs attention today.`
- Until the stats + properties queries resolve, **omit the subtitle** rather than flashing a wrong
  number.

---

## 6. Link map (the request’s second half)

### 6.1 Links

| Visible word       | Where it appears       | Destination                 | Element                              |
| ------------------ | ---------------------- | --------------------------- | ------------------------------------ |
| `+ Create listing` | Page header            | `/landlord/listings/create` | `Link` styled with `buttonClasses()` |
| `Open tracker`     | Payment alerts card    | `/landlord/payments`        | Text link under the card             |
| `View payments →`  | Revenue trend header   | `/landlord/payments`        | Text link, unfiltered (D37)          |
| `Review →`         | Action center, row 1   | `/landlord/applications`    | Row link                             |
| `Open →`           | Action center, row 2   | `/landlord/maintenance`     | Row link (placeholder page)          |
| `Remind →`         | Action center, row 3   | `/landlord/payments`        | Row link, unfiltered                 |
| `Send offer →`     | Action center, row 4   | `/landlord/renewals`        | Row link (placeholder page)          |
| `Manage →`         | My properties header   | `/landlord/properties`      | Text link                            |
| `View all →`       | Recent activity header | `/landlord/activity`        | Text link                            |

### 6.2 Non-links

These are **static text** and must not become clickable:

- “OCCUPANCY”, “MONTHLY REVENUE”, “UPCOMING RENEWALS”, “PAYMENT ALERTS”
- Every metric value and sub-line
- “Revenue trend”, “Action center”, “My properties”, “Recent activity” (titles)
- Property names and their occupancy lines/`low` tags
- Activity descriptions and timestamps
- “No overdue payments”
- The “You have N things…” subtitle

### 6.3 Action center row anatomy

Each row is a single horizontal link:

```
[count chip]  [label]                    [action word →]
```

| Row | Label                  | Count source                             | Chip tone                       | Action word | Destination              |
| --- | ---------------------- | ---------------------------------------- | ------------------------------- | ----------- | ------------------------ |
| 1   | Pending applications   | `sum(properties[].pending_applications)` | `bg-mint` / primary ink         | Review      | `/landlord/applications` |
| 2   | Maintenance requests   | fixture (`2`, or `0` with no properties) | `bg-warning-tint` / warning ink | Open        | `/landlord/maintenance`  |
| 3   | Rent payments due soon | `payment_alerts.due_soon`                | `bg-warning-tint` / warning ink | Remind      | `/landlord/payments`     |
| 4   | Lease renewals         | `renewals.upcoming_count`                | `bg-mint` / primary ink         | Send offer  | `/landlord/renewals`     |

- The whole row is the click target (`Link`, `rounded-xl`, `hover:bg-subtle`, visible focus ring).
- The action word is rendered with `Icon name="arrowRight"` after the text, not as a bare glyph.
- Counts of 0 still render the chip (`0`) and the row stays clickable (D7).
- Each link gets an explicit accessible name, e.g. `aria-label="Review 3 pending applications"`.
- The all-clear line is **not** a link: a check icon plus “No overdue payments”, using success tokens.
  The overdue-warning variant is deferred (D8).

---

## 7. Page specification

### 7.1 Header

`PageHeader` (existing component):

- `title`: `Welcome back, {user.first_name}`; fall back to `Welcome back`.
- `subtitle`: the derived attention line (§5.3).
- `actions`: `<Link to="/landlord/listings/create" className={buttonClasses()}>+ Create listing</Link>`.
- Pending-verification banner stays exactly as it is, above the header.

### 7.2 Metric cards

Keep the existing local `StatCard` shape (`Card`, mint icon tile, uppercase label, number, sub-line),
with these changes:

| Card              | Icon        | Value                            | Sub-line                                                                                                                                       | Link                                   |
| ----------------- | ----------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Occupancy         | `analytics` | `{rate.toFixed(0)}%`             | `{occupied} of {total} rooms · {vacant} vacant` plus a thin progress bar (`role="progressbar"`, `aria-valuenow={rate}`)                        | none                                   |
| Monthly revenue   | `payment`   | `₱{monthly.toLocaleString()}`    | `trend > 0`: `▲ {trend}% vs last month`; `trend < 0`: `▼ {Math.abs(trend)}% vs last month`; `trend === 0`: `0% vs last month` with neutral ink | none                                   |
| Upcoming renewals | `calendar`  | count                            | `{period}`                                                                                                                                     | **none** (D28 removes “Open calendar”) |
| Payment alerts    | `flag`      | `due_today + in_grace + overdue` | `{due_today} due today · {in_grace} in grace · {overdue} overdue`                                                                              | `Open tracker` → `/landlord/payments`  |

- The progress bar is a local 4px track (`bg-subtle`) with a `bg-primary-strong` fill, `rounded-full`.
  It is not a new shared primitive; if a second use appears, promote it.
- The revenue arrow uses ▲ / ▼ characters (as the mockup does) but must also carry text, not colour
  alone; the percentage is the text.
- The four cards render skeletons while `dashboard-stats` loads. On error, the page keeps the shell
  and shows the existing `ErrorState` in place of the metric grid; the rest of the page still renders.

### 7.3 Revenue trend card

- `Card` with `padding="p-5"`, header row: `h2` “Revenue trend” + `View payments →`.
- Chart area height ~220px, responsive width.
- Data: `revenueTrend()` fixtures while `properties.length > 0`; empty state otherwise.
- X axis: six short month labels. Y axis: three or four ticks with compact currency (`₱0`, `₱20k`,
  `₱40k`, `₱60k`). Gridlines are `border`-toned and dashed.
- Line: `primary-strong`, 2px, round caps; points 4px; the last point is emphasised and labelled with
  its value (`₱58,500`).
- Tooltip: month, full `₱` amount; follows the pointer and is keyboard-reachable per point.
- Accessibility:
  - The SVG gets `role="img"` and an `aria-label` summarising the series and range.
  - A visually hidden `<table>` (`sr-only`) follows the chart: caption “Monthly revenue, trailing six
    months”, columns Month / Collected.
  - Points are focusable (`tabIndex={0}`) and show the same tooltip on focus.
  - Any entrance animation is disabled under `prefers-reduced-motion: reduce`.
- Loading: `Skeleton` block at chart height. Error: fixtures cannot error, so a failed properties
  query leaves the chart rendering its fixtures (the card has no dependency on that query beyond the
  zero-property check); never render a half-drawn chart.
- Empty state (properties loaded and the list is empty): dashed `EmptyState` inside the card: “No
  revenue yet” / “Create a listing and start collecting rent.” with a `Create a listing` action.
- The card is **not** a link; only “View payments →” is.

**Chart library decision (D22):** the implementer chooses. Requirements: React 19 compatible,
responsive, supports a tooltip and custom point rendering, and can run without animation. Recharts is
the default suggestion; if its bundle cost is rejected, hand-rolled SVG is acceptable as long as §7.3
is met. Install under `apps/web` only (`bun add --cwd apps/web <package>`), and record the choice in
the implementation notes.

### 7.4 Action center card

- Header: `h2` “Action center”; no header action.
- Four rows per §6.3, separated by `border-b border-border` (last row has none).
- The all-clear line sits below the rows, separated by a top border, with a `check` icon in success
  ink.
- The card stretches to the chart’s height on `lg`; rows keep their natural height and the all-clear
  line is pushed to the bottom with `mt-auto`.
- Loading: four skeleton rows. Error: rows still render with `—` for the count whose source failed
  and enabled links; the failing section’s `ErrorState` explains the failure. No row is ever disabled.
- The card is not a link; each row is.

### 7.5 My properties card

- Header: `h2` “My properties” + `Manage →` (`/landlord/properties`).
- One row per accessible property, in the API’s order:
  - Name (`text-sm font-medium text-ink`, truncates with `title` for long names).
  - Right side: `{occupied} / {total} occupied`; append a `low` pill when
    `total > 0 && occupied / total < 0.5` (also `low` when `total === 0`? **No** — a property with no
    rooms shows `0 / 0 occupied` with no tag; see §14.4).
  - A 6px track bar under the name, `bg-subtle`, fill `bg-primary-strong` at `rate%`, `rounded-full`,
    `role="progressbar"` with `aria-valuenow`, `aria-valuemin=0`, `aria-valuemax=100`, and
    `aria-label="{name} occupancy: {rate}%"`.
- The `low` pill uses `StatusBadge` with a new `low` tone (`bg-warning-tint text-warning-ink`) and the
  label `low`. Adding the tone is a one-line map entry; it does not change any existing status.
- No cap (D25). With many properties the card grows; it is not a scrolling region.
- Loading: 3 skeleton rows. Error: inline `ErrorState` with a `Try again` button that refetches.
- Empty: `EmptyState` icon `buildingOffice`, title “No properties yet”, description “Create your first
  listing to see occupancy here.”, action → `/landlord/listings/create`.

### 7.6 Recent activity card

- Header: `h2` “Recent activity” + `View all →` (`/landlord/activity`).
- `getLandlordActivity(token, { limit: 4 })`, default trailing 30 days, newest first.
- Four rows (D29), plain text + relative time (D38):
  - Left: the event sentence from §8.2.
  - Right: `activityTime(occurred_at)`, `text-xs text-gray-ink`, `whitespace-nowrap`.
  - Rows are **not** links.
- The timestamp carries an absolute `title` (`Oct 19, 2026, 3:42 PM`) for hover.
- Loading: four skeleton lines. Error: inline `ErrorState`. Empty: “No activity yet” + “New
  applications, payments, and tenancy changes will show up here.”
- If the feed returns fewer than four, render what exists (no placeholders).

### 7.7 Removed pieces

- The three `QuickLinkCard`s (My properties / Applications / Boarders) are removed; the Action center
  and My properties card replace them.
- The “Open calendar” link under Upcoming renewals is removed (D28).
- The local `StatCard` / `QuickLinkCard` definitions move out of the route into
  `components/landlord/dashboard/` as part of the split; no other page imports them.

---

## 8. Activity feed

### 8.1 Event set

Mirrors the calendar’s event families (D16) but contains **only things that happened** (D41) and adds
one activity-only type (D40):

| Type                    | Family       | Included | `occurred_at` source                                                                                   |
| ----------------------- | ------------ | -------- | ------------------------------------------------------------------------------------------------------ |
| `payment_received`      | money        | yes      | `payments.updated_at` (proxy for “record updated”), falling back to `paid_date` at 00:00 Manila        |
| `application_received`  | applications | yes      | `applications.created_at`                                                                              |
| `application_accepted`  | applications | yes      | `applications.updated_at` (proxy; `approximate: true`)                                                 |
| `application_confirmed` | applications | yes      | `applications.confirmed_at`                                                                            |
| `tenancy_move_in`       | tenancy      | yes      | `applications.confirmed_at` (or `created_at`), at 00:00 Manila                                         |
| `tenancy_move_out`      | tenancy      | yes      | `applications.intended_leave_date`, at 00:00 Manila                                                    |
| `leave_requested`       | tenancy      | yes      | `applications.leave_request_date`, at 00:00 Manila                                                     |
| `announcement_publish`  | content      | yes      | `announcements.publish_date`, at 00:00 Manila                                                          |
| `listing_published`     | content      | yes      | `properties.created_at`, only when the listing is not a draft and its moderation status is `published` |
| `charge_due`            | money        | **no**   | Scheduled date, not an event that happened                                                             |

Rules:

- The feed shows `application_received` for settled applications too, not only pending ones — the
  calendar's "received" chip is a pending-state view, while the feed records the original receipt
  date. The calendar payload is unchanged.
- Future-dated rows are excluded: `occurred_at <= now` in Asia/Manila.
- Cancelled charges, rejected/cancelled applications, soft-deleted rows, deleted announcements, and
  properties that are not visible are excluded, matching the calendar’s existing filters.
- `listing_published` is activity-only; **the calendar page and its type union do not gain it**.
- The activity type is a separate exported union (`ActivityEventType`) so the calendar’s contract stays
  stable.

### 8.2 Sentences (client-side copy)

`apps/web/src/lib/activity.ts` owns the wording, keyed by type (D39: no API copy):

| Type                    | Sentence                     |
| ----------------------- | ---------------------------- |
| `payment_received`      | `Payment recorded`           |
| `application_received`  | `New application received`   |
| `application_accepted`  | `Application accepted`       |
| `application_confirmed` | `Application confirmed`      |
| `tenancy_move_in`       | `Boarder moved in`           |
| `tenancy_move_out`      | `Tenancy ended`              |
| `leave_requested`       | `Leave request submitted`    |
| `announcement_publish`  | `Announcement published`     |
| `listing_published`     | `Property listing published` |

The activity page appends a muted context line when available:
`{property.name} · {room.name} · {boarder.name}` with missing parts omitted. The dashboard card shows
only the sentence + time, matching the mockup (D38).

### 8.3 Relative time

Add `activityTime(occurred_at, now = new Date())` in `apps/web/src/lib/activity.ts`, reusing
`parseTimestamp` from `apps/web/src/lib/messages.ts`:

| Elapsed                       | Label          |
| ----------------------------- | -------------- |
| < 60 s                        | `just now`     |
| < 60 min                      | `{n}m ago`     |
| < 24 h                        | `{n}h ago`     |
| previous calendar day (local) | `Yesterday`    |
| same calendar year            | `Oct 16`       |
| older                         | `Oct 16, 2025` |

- Local browser time, consistent with the messages helper. The server also returns `today` (Manila)
  for date windows; the feed label itself is browser-local.
- Invalid/missing timestamps fall back to the event’s `date` formatted `MMM d`.

### 8.4 Activity page (`/landlord/activity`)

Replace the placeholder. Keep `Protected role="landlord"` + `RoleShell nav={LANDLORD_NAV}` exactly as
the current route does.

- `PageHeader icon="analytics" title="Activity"` (title only; no subtitle, per the repo’s
  redundant-copy convention).
- Toolbar:
  - Property select: `All properties` + accessible properties (reuse `getProperties`).
  - Family filter: `All`, `Applications`, `Payments`, `Tenancy`, `Content` — chips or a select,
    matching existing filter controls (`SelectInput`). The UI labels map to the API families
    (`Payments` → `money`, `Applications` → `applications`, `Tenancy` → `tenancy`, `Content` →
    `content`).
  - Range: `Last 7 days`, `Last 30 days` (default), `Last 90 days`. Custom dates are not required.
- URL state: `?propertyId=&types=&range=30`, so the view is shareable and survives refresh.
- List: 20 events per request. Rows show the sentence, the muted context line, and a trailing
  relative time. D42 keeps the page plain, so status is **not** rendered as a pill. The only clickable
  element in a row is the trailing action word from `event.link` (e.g. `View ledger`), rendered as a
  `Link` — an action word, so it is allowed under D3. The sentence and context stay static.
- `Load more` appends the next page; disable while fetching and hide when `has_more` is false. Show
  `Showing {loaded} of {total}` only when `total > loaded`.
- Loading: 6 skeleton rows. Error: `ErrorState` + retry. Empty: distinguish “no properties at all”
  (guiding to create a listing) from “nothing in this range” (with a `Reset filters` action).
- Data volume: the endpoint caps a response at 1,000 source events per window and reports
  `truncated`; if truncated, show a muted line “Showing the most recent 1,000 events in this range.”
- The page is read-only; no dismiss/mark-read actions.

### 8.5 API

**Route file:** `workers/api/src/routes/landlord/activity.ts`, mounted in
`workers/api/src/routes/landlord/index.ts` as
`landlordRoutes.route('/api/landlord', activityRoutes)`.

```
GET /api/landlord/activity
  ?from=YYYY-MM-DD        optional, default = Manila today - 29 days
  &to=YYYY-MM-DD          optional, default = Manila today + 1 day (exclusive)
  &propertyId=<int>       optional
  &types=<csv>            optional; event types and/or families
  &limit=<1..50>          optional, default 20
  &offset=<int >= 0>      optional, default 0
```

Validation and behaviour:

- `from`/`to` follow the calendar’s `YYYY-MM-DD`, `to` exclusive, span > 0 and ≤ 366 days. Invalid →
  `400` through `errorResponse`, matching the calendar route.
- `propertyId` must be a positive integer; an inaccessible property yields an **empty list**, not a
  404 (the ledger/calendar convention).
- `types` accepts the activity union plus `calendar` families for convenience; unknown values → `400`
  with the offending value named.
- `limit` is clamped to 1–50; `offset` is `>= 0`.
- Scoping uses `accessiblePropertyClause` so co-landlords see shared properties.
- Results are newest-first by `occurred_at`, then id descending, deterministic across refetches.

Response envelope (`jsonResponse` convention):

```jsonc
{
  "success": true,
  "data": {
    "window": { "from": "2026-09-20", "to": "2026-10-20" },
    "today": "2026-10-19",
    "property_id": null,
    "events": [
      {
        "id": "payment:88:payment_received",
        "type": "payment_received",
        "family": "money",
        "occurred_at": "2026-10-19T14:42:00+08:00",
        "date": "2026-10-19",
        "subject": "Maria Santos",
        "status": "paid",
        "approximate": false,
        "amount": 4500,
        "property": { "id": 1, "name": "Sunrise Apartments" },
        "room": { "id": 4, "name": "Room 4" },
        "boarder": { "id": 12, "name": "Maria Santos" },
        "link": { "to": "/landlord/payments", "label": "View ledger" }
      }
    ],
    "total": 37,
    "has_more": true,
    "next_offset": 20,
    "truncated": false
  }
}
```

Implementation notes:

1. Extend `CalendarEvent` in `workers/api/src/repositories/landlord-calendar.ts` with
   `occurred_at: string`. Populate it in every loader while building the event (mapping in §8.1).
   The calendar page ignores the field; its payload remains backwards compatible.
2. Extract the three loaders behind `listCalendarEventSources(db, landlordId, query, today)` returning
   **all** events in the window (no 500 cap). `listCalendarEvents()` keeps the existing cap and
   `truncated` behaviour by calling it.
3. `workers/api/src/repositories/landlord-activity.ts`:
   - calls `listCalendarEventSources` for the window;
   - queries `listing_published` events separately (properties + accessibility clause);
   - drops `charge_due`, future `occurred_at`, and the excluded statuses;
   - filters `types`/`propertyId`, sorts, counts `total`, slices `offset/limit`, and reports
     `has_more`/`next_offset`;
   - caps the pre-slice set at 1,000 and sets `truncated` (the cap applies before paging; document
     that a truncated range cannot be paged past the cap).
4. Add `listing_published` to `LINKS` in the activity repository:
   `{ to: '/landlord/properties', label: 'View property' }`.
5. No migration. No new tables. No D1 schema change.
6. The route requires `requireLandlord` and `requireD1`, exactly like `dashboard.ts` and `calendar.ts`.

### 8.6 Web client

`apps/web/src/lib/api/activity.ts` (mirroring `calendar.ts`):

```ts
export interface LandlordActivityQuery {
  from?: string;
  to?: string;
  propertyId?: number | null;
  types?: string[] | null;
  limit?: number;
  offset?: number;
}

export function activityQueryString(query: LandlordActivityQuery): string;

export function getLandlordActivity(
  token: string,
  query?: LandlordActivityQuery
): Promise<ActivityResponse>;
```

Types live in `apps/web/src/lib/types.ts` next to the calendar block:
`ActivityEventType`, `ActivityEvent`, `ActivityPayload`, `ActivityResponse`.

Query keys:

- dashboard: `['landlord-activity', 'recent']`
- page: `['landlord-activity', { from, to, propertyId, types, offset }]`

`getProperties` keeps `['landlord-properties']` so the dashboard, properties page, and tracker share
one cache entry.

---

## 9. New placeholder routes (D18, D21)

Both routes follow the current `/landlord/activity` placeholder shape:
`Protected role="landlord"` + `RoleShell nav={LANDLORD_NAV}` + `PlaceholderPage`. **They are not added
to `LANDLORD_NAV`.**

| Route                   | File                                           | Icon       | Copy                                                                                                                                                                                                                                                                   |
| ----------------------- | ---------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/landlord/maintenance` | `apps/web/src/routes/landlord/maintenance.tsx` | `kitchen`  | Title “Maintenance requests”; notice “Maintenance tracking is not built yet.”; message “Requests from boarders will be listed here once maintenance tracking ships. Until then, coordinate repairs through Messages.”; action `Go to Messages` → `/landlord/messages`. |
| `/landlord/renewals`    | `apps/web/src/routes/landlord/renewals.tsx`    | `calendar` | Title “Lease renewals”; notice “Renewal offers are not built yet.”; message “Lease renewals will be managed here once the offer flow ships. Tenancy dates already appear on the Calendar.”; action `Open calendar` → `/landlord/calendar`.                             |

Route registration: adding the files is enough for TanStack’s file router, but the route tree must be
regenerated (`bun run web:build`) so `routeTree.gen.ts` includes them. The generated diff is expected
and committed with the change.

---

## 10. States, responsive, accessibility

### 10.1 States

| Section         | Loading                 | Error                                                                                       | Empty                                                           |
| --------------- | ----------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Metric cards    | 4 card skeletons        | page-level `ErrorState`, other sections still render                                        | zeros are legitimate values; no empty state                     |
| Revenue trend   | chart-height `Skeleton` | fixtures stay rendered (the card does not depend on a failing query); never a partial chart | guided empty state with a create-listing action (no properties) |
| Action center   | 4 skeleton rows         | `—` for counts whose source failed, links enabled                                           | zeros + all-clear line                                          |
| My properties   | 3 skeleton rows         | inline `ErrorState` + retry                                                                 | guided `EmptyState`                                             |
| Recent activity | 4 skeleton lines        | inline `ErrorState`                                                                         | “No activity yet”                                               |
| Activity page   | 6 skeleton rows         | `ErrorState` + retry                                                                        | no-properties vs no-results states                              |

Rules:

- The shell never unmounts through loading/error (the repo’s `R24` regression). Every section renders
  inside `RoleShell`.
- A failure in one section never blanks the page; each query owns its own error surface.
- The header subtitle is omitted until the counts are known.
- Empty-account behaviour (D33/D35): zero properties ⇒ chart empty state, maintenance count forced to
  0, attention count 0, properties guided empty; stats and feed show their real zeros/empties.

### 10.2 Responsive (D14)

Follow the existing pages:

- Metric grid: `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`.
- Chart + Action center: single column below `lg`; `lg:grid-cols-3` with 2/1 split.
- Properties + Activity: single column below `md`; `md:grid-cols-2`.
- Action rows: count + label on the left, action word on the right; at very narrow widths the action
  word wraps below the label rather than overflowing.
- Long property names truncate with a `title`; timestamps stay `whitespace-nowrap`.
- The chart never scrolls horizontally; it resizes with its card.
- At 390px the page has one column and no horizontal overflow.

### 10.3 Accessibility

- Every action is a real `Link` with a visible focus ring; no clickable `div`s.
- Counts are text, never icons alone; the `low` tag is text plus colour.
- The all-clear line has a check icon **and** the words “No overdue payments”.
- Progress bars expose `role="progressbar"` with a label, `aria-valuenow/min/max`.
- The chart has `role="img"`, a summary `aria-label`, keyboard-focusable points, and the `sr-only`
  table (D32).
- Colour is never the only signal: `low`, trend direction, and occupancy numbers are all text.
- Motion respects `prefers-reduced-motion: reduce` (chart animation off, no new decorative motion).
- Headings: one `h1` from `PageHeader`; each card uses `h2`; no skipped levels.

---

## 11. Files and components

### 11.1 Web

| Action | File                                                                | Purpose                                                                                                                 |
| ------ | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Modify | `apps/web/src/routes/landlord/index.tsx`                            | Compose the five sections; keep `Protected` + `RoleShell`; remove `QuickLinkCard`; header/link map.                     |
| Create | `apps/web/src/components/landlord/dashboard/DashboardStatCards.tsx` | The four live cards, occupancy bar, tracker link.                                                                       |
| Create | `apps/web/src/components/landlord/dashboard/RevenueTrendCard.tsx`   | Chart, header link, tooltip, hidden table, empty state.                                                                 |
| Create | `apps/web/src/components/landlord/dashboard/ActionCenterCard.tsx`   | Four counted rows + all-clear line.                                                                                     |
| Create | `apps/web/src/components/landlord/dashboard/MyPropertiesCard.tsx`   | Occupancy list, `low` tag, manage link, states.                                                                         |
| Create | `apps/web/src/components/landlord/dashboard/RecentActivityCard.tsx` | Four-row feed, view-all link, states.                                                                                   |
| Create | `apps/web/src/components/landlord/dashboard/ActivityFeedRow.tsx`    | Shared plain row (sentence + time); `context` prop for the page.                                                        |
| Create | `apps/web/src/lib/dashboard-fixtures.ts`                            | Revenue points + maintenance count (typed fixtures).                                                                    |
| Create | `apps/web/src/lib/activity.ts`                                      | Sentence map, context builder, `activityTime`, family labels.                                                           |
| Create | `apps/web/src/lib/api/activity.ts`                                  | `getLandlordActivity` + query builder.                                                                                  |
| Modify | `apps/web/src/lib/types.ts`                                         | Add `occurred_at` to `CalendarEvent`, plus `ActivityEventType`, `ActivityEvent`, `ActivityPayload`, `ActivityResponse`. |
| Modify | `apps/web/src/routes/landlord/activity.tsx`                         | Replace placeholder with the feed page.                                                                                 |
| Create | `apps/web/src/routes/landlord/maintenance.tsx`                      | Placeholder page.                                                                                                       |
| Create | `apps/web/src/routes/landlord/renewals.tsx`                         | Placeholder page.                                                                                                       |
| Modify | `apps/web/src/components/ui/StatusBadge.tsx`                        | Add the `low` tone (`bg-warning-tint text-warning-ink`).                                                                |
| Modify | `apps/web/package.json`                                             | Chart dependency, if the implementer adds one.                                                                          |

Component depth check: `components/landlord/dashboard/*` is three levels under `components/`, within
the repo’s ≤4 rule.

### 11.2 API

| Action | File                                                | Purpose                                                                                                 |
| ------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Modify | `workers/api/src/repositories/landlord-calendar.ts` | Add `occurred_at` to every event; extract `listCalendarEventSources`; keep the public result unchanged. |
| Create | `workers/api/src/repositories/landlord-activity.ts` | Activity assembly, listing events, filtering, sorting, paging.                                          |
| Create | `workers/api/src/routes/landlord/activity.ts`       | Validation + handler.                                                                                   |
| Modify | `workers/api/src/routes/landlord/index.ts`          | Mount the activity routes.                                                                              |
| Modify | `workers/api/README.md`                             | Add the endpoint next to the calendar/dashboard entries.                                                |

No migration.

### 11.3 Suggested implementation order

1. **API foundation** — `occurred_at` on calendar events, source extraction, activity repository,
   route, mount. Verify with `cf:api:typecheck` and a local `curl`.
2. **Web plumbing** — types, activity client, `activity.ts`, fixtures.
3. **Dashboard sections** — stat cards, chart, action center, properties, activity; wire the page and
   remove the quick links.
4. **Activity page + placeholders** — filters, URL state, load-more, route tree regeneration.
5. **Polish** — responsive pass, accessibility pass, all checks, manual walkthrough.

---

## 12. Verification

### 12.1 Required (D34)

```bash
bun run web:typecheck
bun run web:build
bun run cf:api:typecheck
```

`web:build` also regenerates `routeTree.gen.ts`, which must include the two new routes.

### 12.2 Manual walkthrough

1. Sign in as a landlord with multiple properties and payments.
2. Confirm the four metric cards match `GET /api/landlord/dashboard-stats` exactly.
3. Confirm the attention subtitle equals the sum of the four action counts.
4. Click every entry in §6.1 and verify the destination; click every item in §6.2 and verify nothing
   navigates.
5. Confirm the action count chips: 0 renders as `0` and still navigates.
6. Confirm My properties lists every property, the `low` tag only appears under 50%, and the bars
   match `occupied / total`.
7. Confirm Recent activity shows at most four real events, newest first, with correct relative times;
   “View all” opens the activity page.
8. On the activity page, exercise property, family, and range filters; confirm URL state, load-more,
   and both empty states.
9. Sign in as a landlord with **no properties**: zeros, chart empty state, guided property empty,
   maintenance count 0.
10. Repeat steps 2–7 at 1440px and at 390px (Chrome device toolbar) with no horizontal overflow.

### 12.3 Recommended, not required

- A web test that renders the dashboard against a stubbed API and asserts the four section headings,
  the link map, and the absence of “Open calendar”.
- A web test for `activityTime` thresholds.
- An API test for window validation, past-only filtering, `charge_due` exclusion, scoping, and paging.
- `bun run web:test` and `bun run cf:api:test`; any pre-existing failure must be reported, and any
  test broken by this change must be updated rather than skipped.

### 12.4 Definition of done

- [ ] The dashboard renders the mockup’s five sections with live data and the documented fixtures.
- [ ] The exact link map in §6.1 is implemented; §6.2 stays static.
- [ ] “Open tracker” remains; “Open calendar” is gone.
- [ ] `/landlord/activity` is a working filterable, paged feed.
- [ ] `/landlord/maintenance` and `/landlord/renewals` exist and are absent from the sidebar.
- [ ] No migration was added.
- [ ] §12.1 passes; §12.2 is walked and any deviation is recorded.

---

## 13. Known gaps and risks

| Risk / gap                                              | Impact                                                                                                                  | Mitigation                                                                                                                                                |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The revenue chart is fixture money                      | A landlord could mistake it for real collected revenue, and the chart can disagree with the live “Monthly revenue” card | The fixture module is named and commented as sample data; the chart is suppressed with no properties; replace it when the revenue-history endpoint lands. |
| Revenue trend is hard-coded `0`                         | The card reads “0% vs last month” even when revenue changed                                                             | Accepted by D11; compute it with the future revenue endpoint.                                                                                             |
| Maintenance count is fake                               | Header attention count includes a number with no feature behind it                                                      | Forced to 0 when there are no properties; code comment; placeholder page explains the feature is unbuilt.                                                 |
| “Lease renewals” is not a renewal count                 | The card and action row can overstate renewals                                                                          | Inherited from the existing repository; documented; relabel when a renewal model exists.                                                                  |
| Activity timestamps are proxies                         | `application_accepted` uses `updated_at` and `listing_published` uses `created_at`                                      | `approximate: true` on those events; relative labels only.                                                                                                |
| Wide activity windows are expensive                     | A 366-day request reads charges, applications, and announcements                                                        | Default 30 days; 1,000-event cap + `truncated`; the UI only offers 7/30/90-day ranges.                                                                    |
| Extracting calendar sources touches a shipped feature   | The calendar could regress                                                                                              | `listCalendarEvents()` keeps its exact response; only an extra field is added; run the calendar tests even though D34 does not require new tests.         |
| Chart dependency adds bundle weight                     | Slower dashboard load                                                                                                   | Implementer may choose a lighter/hand-rolled option; lazy-load the chart if the dependency is heavy.                                                      |
| Removing “Open calendar” removes a path to the calendar | Minor discoverability loss                                                                                              | Accepted by D28; the calendar remains in the sidebar.                                                                                                     |
| No new tests                                            | Fewer guards around a large UI change                                                                                   | §12.2 walkthrough is mandatory; §12.3 lists the tests to add next.                                                                                        |

---

## 14. Open decisions (agent defaults, cheap to overturn)

| #   | Default chosen here                                                                                                  | Why                                                                   | Overturn by                                      |
| --- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------ |
| 1   | Occupancy card gains “· N vacant” and a progress bar                                                                 | Matches the mockup and needs no API change                            | Say “drop the bar” / “drop vacant”               |
| 2   | Maintenance fixture value is `2`                                                                                     | Matches the mockup                                                    | Change the constant                              |
| 3   | Attention line at zero reads “You have nothing that needs attention today.”                                          | Avoids “0 things”                                                     | Supply alternative copy                          |
| 4   | A property with 0 rooms shows `0 / 0 occupied` and no `low` tag                                                      | A tag would imply a denominator problem, not low demand               | Decide otherwise                                 |
| 5   | Property order follows the API (no re-sorting)                                                                       | Matches the mockup’s non-sorted example and avoids surprising reorder | Sort by occupancy ascending                      |
| 6   | Occ/rent/renewal rows in the Action center use the same label/route as the mockup, even when the data is approximate | Preserves the requested design                                        | Rename “Lease renewals” to “Tenancies”           |
| 7   | Relative times use the browser’s local timezone, not Manila                                                          | Consistent with the existing messages helper                          | Force Asia/Manila                                |
| 8   | Activity default range is 30 days; page size is 20; max limit is 50                                                  | Conservative, matches the UI’s 7/30/90 presets                        | Change the constants                             |
| 9   | Activity page exposes `propertyId`, `types`, and `range` in the URL                                                  | Shareable/reloadable, like the payments tracker                       | Keep state local                                 |
| 10  | Activity page rows link out through a trailing action word; status is not shown                                      | D3 allows action words; D42 keeps the page plain                      | Add status pills or make the whole row clickable |
| 11  | `listing_published` requires a non-draft, moderation-published listing and uses `created_at`                         | Avoids surfacing drafts; no published-at column exists                | Use moderation audit timestamps                  |
| 12  | The chart is a fixture even for a landlord whose real collected revenue is 0                                         | D35 keys off the property list, not revenue                           | Key off `revenue.monthly > 0`                    |
| 13  | The activity endpoint's 1,000-event cap is applied before paging                                                     | Bounds work on wide windows                                           | Page in SQL / raise the cap                      |

---

## 15. Acceptance criteria (mapped to decisions)

| #   | Criterion                                                                                                                  | Decision           |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| A1  | `/landlord` renders header, 4 metric cards, chart, action center, properties, activity                                     | D1, D4             |
| A2  | Metric card values, sub-lines, and the tracker link match `dashboard-stats`                                                | D5, D11, D28       |
| A3  | Chart shows six trailing months, is keyboard/tooltip accessible, has a hidden table, and hides for a zero-property account | D10, D32, D35      |
| A4  | Action center always shows four rows, live counts where possible, fixture maintenance, all-clear line                      | D7, D8, D17, D23   |
| A5  | Every §6.1 word routes; every §6.2 item is static                                                                          | D3                 |
| A6  | My properties is live, uncapped, single-tone bars, `low` under 50%                                                         | D24, D25, D26      |
| A7  | Recent activity is real, four plain rows with relative times, and “View all” opens the feed                                | D13, D15, D29, D38 |
| A8  | `/landlord/activity` filters by property/family/range, pages, and handles both empty states                                | D27, D42           |
| A9  | `/landlord/maintenance` and `/landlord/renewals` exist but are absent from the sidebar                                     | D18, D21           |
| A10 | No migration; calendar response remains backwards compatible                                                               | §8.5               |
| A11 | No-property landlord sees zeros and guided empties, never invented money                                                   | D33, D35           |
| A12 | The required checks in §12.1 pass and the §12.2 walkthrough is completed                                                   | D34                |

---

## 16. Implementation record (2026-10-19)

### 16.1 What shipped

| Area       | Files                                                                                                                                                                                                                                                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API        | `workers/api/src/repositories/landlord-activity.ts`, `workers/api/src/routes/landlord/activity.ts`, mounted in `workers/api/src/routes/landlord/index.ts`; `landlord-calendar.ts` gained `occurred_at`, exported timestamp helpers, and the extracted `listCalendarEventSources` source loader.                                                                                      |
| Web        | `apps/web/src/routes/landlord/index.tsx`, `activity.tsx`, `maintenance.tsx`, `renewals.tsx`; `apps/web/src/components/landlord/dashboard/{DashboardStatCards,RevenueTrendCard,ActionCenterCard,MyPropertiesCard,RecentActivityCard,ActivityFeedRow}.tsx`; `apps/web/src/lib/{activity.ts,dashboard-fixtures.ts,api/activity.ts}`; `types.ts`, `StatusBadge.tsx`, `routeTree.gen.ts`. |
| Dependency | `recharts@3.10.1` in `apps/web`.                                                                                                                                                                                                                                                                                                                                                     |
| Tests      | New `workers/api/test/landlord-activity.test.ts`; updated the stale calendar-wiring assertion in `apps/web/test/landlord-calendar.test.tsx`.                                                                                                                                                                                                                                         |

### 16.2 Deviations discovered during implementation

1. **`listing_moderation_status` is `published`, not `approved`.** The activity query uses the value
   the rest of the API actually stores. The spec text has been corrected.
2. **Settled applications still produce an `application_received` activity.** The calendar only emits
   `application_received` while an application is `pending`; the activity feed needs the original
   receipt date after acceptance/confirmation. `listCalendarEventSources` now takes an
   `includeSettledReceived` option, used only by the activity repository. The calendar's response is
   unchanged (all calendar tests still pass).
3. **The chart uses Recharts** (the spec left the library choice to the implementer).
4. **The activity page uses `useInfiniteQuery`** so “Load more” appends pages instead of re-fetching.

### 16.3 Verification actually run

| Check                      | Result                                                          |
| -------------------------- | --------------------------------------------------------------- |
| `bun run web:typecheck`    | pass                                                            |
| `bun run cf:api:typecheck` | pass                                                            |
| `bun run web:build`        | pass (route tree regenerated; new routes present)               |
| `bun run web:test`         | 294 pass, 0 fail                                                |
| `bun run cf:api:test`      | 337 pass, 0 fail (31 files, including the 5 new activity tests) |

### 16.4 Not verified / limitations

- No automated browser walkthrough was available; the 1440px / 390px visual pass in §12.2 remains
  manual.
- Recharts logs a zero-width/height warning under happy-dom in the existing dashboard tests. The
  tests pass and the chart renders in the browser build; it does not affect production output.
- The fixture revenue chart and the live monthly-revenue card can still disagree, as documented in
  §13.
