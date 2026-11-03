# Spec — Landlord Payments monitoring page (rent ledger + proof review)

**Status:** **Proposed — no code written yet.** This file is the deliverable of the interview
(spec turn only, per the request). §19 is the implementation checklist for the following turn.
**Short name:** `landlord-payments-monitoring`
**Date:** 2026-10-20
**Surface:** `http://localhost:3000/landlord/payments` — one page, two right-side drawers, one message
composer modal, one additive field pair on an existing API payload. No new route, no new endpoint,
no migration.
**Owner request (verbatim, condensed to its binding lines):**

> Build the landlord Payments page based on the attached approved UI reference. The existing
> HavenSpace design system must remain unchanged. Do not redesign the current visual system.
> Preserve: existing color palette, typography, spacing, sidebar, buttons, inputs, status colors,
> icons, borders, radii, shadows, responsive behavior, design tokens and reusable components. Only
> add the new payment-monitoring layout and interaction states.
>
> Page purpose: help landlords monitor tenant rent payments for a selected property and month.
> Filters: Property, Month, Search tenant or room, Status, More filters, Clear filters. Summary
> metrics: Tenants, Expected, Paid, Needs attention. Table: Tenant, Room, Due date, Amount, Status,
> Action. Statuses: Paid, Due in X days, Overdue, Needs review, Payment issue — using the existing
> system status colors, no invented colors.
>
> Rent charges are created automatically from each tenant's rent cycle. The landlord does not create
> a payment before the tenant pays. The tenant submits proof after paying → Needs review → the
> landlord verifies → **only approval changes the status to Paid**. No prominent "Add payment" button
> on the main page.
>
> Table behaviour: tenant name → tenant payment detail; "Remind" → message composer; "Review proof" →
> right-side review drawer; Paid → "View"; Due/Overdue → "Remind".
>
> Review drawer: title "Review payment", tenant/room/rent month/status/amount/method/submitted
> date-time/proof image, the line "Check the amount and reference before approving.", actions
> Approve payment / Reject / Request new proof / Close. Approval changes the status to Paid, saves
> approval date, landlord, method, amount and proof, updates the table immediately, and closes the
> drawer or shows a success state. Reject opens a confirmation dialog, requires a reason, changes the
> status to Payment issue, and lets the landlord message the tenant. Request new proof opens a
> composer prefilled with "Please send a clearer payment proof showing the amount and reference
> number." and keeps the status at Needs review.
>
> Tenant detail view: name, room, property, current rent, due date, current status, Send message,
> Remind, payment activity timeline (charge created / proof submitted / review / approve), Approve
> payment when proof is pending, and "Log offline payment" as a secondary fallback (cash, bank
> transfer, proof via Messenger — never a primary action on the main page).
>
> Design: match the approved reference, keep the table the main focus, keep the drawer fixed while
> the table stays visible, pair colour with text labels, full-screen the drawer on mobile, preserve
> keyboard navigation and visible focus, support loading/empty/error/filtered states, and add no
> charts, dashboard cards, billing settings or decorative sections.
>
> Acceptance: landlord can select a property and month; monitor every tenant status; rent charges
> exist before proof is submitted; proof is reviewable from the table; approval moves the tenant to
> Paid; rejection and request-new-proof work; the drawer matches the reference; the visual system is
> unchanged.

**Two attached reference screenshots** (desktop, 1140×636): (1) the page — sidebar, `Landlord ›
Payments` breadcrumb, "Payments" heading, six filter controls in one row, a single bordered card with
four metrics (Tenants 12 · Expected ₱48,000 · Paid ₱32,000 · Needs attention 3), and an "October
payments" card whose helper line reads "Rent charges are created automatically from each tenant's rent
cycle.", a six-column table (Maria Santos/Paid/View, John Dela Cruz/Due in 6 days/Remind, Ana
Reyes/Overdue/Remind, Liam Garcia/Needs review/Review proof), and a footer line "Showing 4 of 12
tenants · View all". (2) the same page with the review drawer open on the right — "Review payment",
`PAYMENT SUBMISSION` eyebrow, "Liam Garcia", "Room 04 · October rent", a Needs-review pill, Amount
₱4,000 / Method GCash, Submitted October 8, 2026 · 10:42 AM, a "Payment proof" panel containing the
GCash receipt image, the check line, a primary "Approve payment" beside an outlined "Reject", and a
link-styled "Request new proof". The table stays visible (its Action column is clipped by the drawer,
not scrolled away).

---

## 0. Relationship to existing specs

| Document | Relationship |
| --- | --- |
| `payments-tracker-redesign-spec.md` | **Superseded on the page surface only.** Its data layer (charges, submissions, `generation_key`, per-tenancy `next_due_date`, the tracker endpoint, grace/late-fee policy) is kept untouched, and its brief rules R1–R9 still bind (monthly, in-full, no partial payments, move-in-derived first due date, next due = payment date + 1 month, configurable grace, optional late fee). Its **ledger UI (§7)** — one row per boarder with 10 columns, in-row history, five money summary cards, on-page billing-rules card, page-level "Record a payment"/"Add a charge" buttons, and the status legend — is **replaced** by this spec's six-column monitor. |
| `payments-shell-two-pages-reverify-spec.md` | Still binding and untouched: the shell (`Protected` + `RoleShell`) lives in `apps/web/src/routes/landlord/payments.tsx`, and the leaf at `landlord/payments/index.tsx` renders **no** shell of its own. |
| `payments-page-regressions-spec.md` / `payments-shell-reverification-spec.md` | The migration-hint copy (`PAYMENTS_ERROR_HINT`) and the single-shell rule are kept; nothing here reintroduces those regressions. |
| `payments-feature-spec.md` | Owns the charge model and the boarder claim flow. The `pending → verified/rejected` submission machine is reused verbatim; the boarder side is untouched. |
| `messages-feature-review-spec.md` | Owns `MessageComposer`, `openThread` (idempotent per pair), `sendMessage`, `POST /api/messages/attachments`, and the 5s thread poll. This page **imports** those; it does not reimplement messaging. |
| `admin-apple-ui-restructure-spec.md` | Owns the one-shell convention, `.chrome-*` materials, and the semantic token vocabulary this page must not extend. |
| `landlord-calendar-spec.md` | Precedent for the `PageHeader` + `Card` + `StatusBadge` composition, the "four page states" table, and the additive-field-on-an-existing-DTO pattern. |
| `docs/reference/schema.md` | The `payments` / `payment_submissions` / `property_billing_settings` columns this page reads. Nothing here changes them. |

**Inherited unchanged:** money is `roundMoney`-rounded centavos; "today" is `manilaToday()`
(Asia/Manila); overdue is **derived**, never trusted from the stored column; landlord reads are scoped
by property access (co-landlords see what they manage); `generation_key` keeps rent generation
idempotent.

---

## 1. Interview decisions

**Nine rounds of `ask_user`.** Rows marked **(agent default)** were not asked and are cheap to
overturn; §20 lists them again on one page. Rows marked **RES-n** resolve a contradiction between two
answers — the resolution and its reasoning are stated in §1.1.

| # | Topic | Decision |
| --- | --- | --- |
| D1 | What happens to the tracker page | **Replaced.** `/landlord/payments` stops being the 10-column tracker and becomes this six-column monitor. The route file keeps its path; the leaf renders a new page component. |
| D2 | Existing page-level controls | **`Export CSV` stays in the page header** (the reference shows it top-right). **`Add a charge` moves into the tenant detail drawer** as a secondary action. The page-level **"Record a payment"** button is **removed** (the brief forbids a prominent add-payment button). |
| D3 | "Payment issue" | **Derived**, not stored: it means *the latest submission on the current open rent charge was rejected*, and it holds **only until a new proof arrives** (a pending proof immediately becomes Needs review). |
| D4 | Backend appetite | **Frontend-only in spirit**: no new endpoint, no migration, no new table. Reuse `GET /api/landlord/payments/tracker`, `GET /api/landlord/charges/:id`, `GET /api/landlord/tenancies/:applicationId/payment-history`, the submissions verify/reject routes, `POST /api/landlord/charges/:id/record`, the CSV export and the messages API. (One additive DTO field pair is required by D39 — RES-4.) |
| D5 | Row source | **`GET /api/landlord/payments/tracker`** (property + month + search server-side; see RES-3 for the remaining filters). |
| D6 | Drawer / composer state | **Local component state.** Neither drawer, nor the composer, nor the reject dialog is a route or a URL param. The table stays mounted underneath. |
| D7 | Tenant detail shape | **A right drawer too** (same primitive as the review drawer), not a nested page. |
| D8 | "Remind" and "Send message" | **A real message through the messages API** (open the pair thread, send a message), not the in-app reminder notification. |
| D9 | Approve / reject transport | **The existing submission routes**: `POST /api/landlord/submissions/:id/verify` and `.../reject`. |
| D10 | "Log offline payment" | **Reuses `RecordPaymentModal`** with the tenant preselected (cash / bank transfer / Messenger-proof payments all land here). |
| D11 | Status filter values | The **display labels** the table shows (seven of them, §3), not the server's internal seven `TrackerStatus` values. |
| D12 | "In grace" | **Kept distinct** from "Due in X days" — RES-1. |
| D13 | Amount column | **The rent amount only** (`monthly_rent`, i.e. the cycle's rent charge `amount`). Late fees, utilities and deposits never inflate this cell; they live in the drawers. |
| D14 | Metric scope | **Every figure describes the table currently on screen** (after filters). RES-3 explains how that is computed. |
| D15 | "More filters" contents | **Room/bed, Due date range (from/to), Overdue only, Needs review only, Payment method.** |
| D16 | Filter persistence | **In the URL** (`?propertyId=&month=&q=&status=&room=&dueFrom=&dueTo=&overdue=1&needsReview=1&method=`) so the page is shareable and reloadable — the tracker's rule, kept. |
| D17 | Review action label | The Needs-review row's action is **"Review proof"** (never "Verify"), matching the reference. |
| D18 | Rows with no rent cycle in the month | **Included with a quiet label** ("No charge yet", neutral tone) and no action, so the table can never silently hide a tenant. |
| D19 | Row count | **All rows are shown; no paging.** The footer states the count (D40). |
| D20 | Where the CSV lives | **Page header**, unchanged behaviour (same endpoint, same filters it already takes: property + month). |
| D21 | Remind prefill | The composer opens **prefilled with the payment facts** (tenant first name, amount, rent month, due date) — §11.2. |
| D22 | After approval | **The drawer stays open and turns into the approved state**; the row updates immediately underneath. It closes only when the landlord closes it. |
| D23 | Underpayment | **Blocked.** If the submitted amount is below the charge total, "Approve payment" is disabled with an inline explanation. Overpayment is allowed with a note. |
| D24 | Drawer data | **`GET /api/landlord/charges/:chargeId`** — one request per opened drawer, containing the charge and its submissions. |
| D25 | Drawer primitive | **A new shared `apps/web/src/components/ui/Drawer.tsx`** (right-side; full-screen under `md`). Both drawers and the mobile variant use it. |
| D26 | Narrow screens | **The table scrolls horizontally** (as it does today) rather than re-flowing into cards; the drawer becomes a full-screen page. |
| D27 | Verification bar | `web:typecheck` + `web:build` + a **component test for the new table** + a **component test for the review drawer** (+ the existing suites staying green). |
| D28 | Same-day label | **"Due today"** — not "Due in 0 days". |
| D29 | Tracker-era components | **Deleted** (§14), not left in the tree. `RecordPaymentModal` is kept (reused). |
| D30 | Billing rules | The grace-period / late-fee card **leaves this page**; its home becomes the property settings / property-detail surface. **Out of scope for this spec** (§21) — the card and its endpoints stay in the codebase, unwired from Payments. |
| D31 | After a rejection | **Offer a choice**: the drawer shows the rejected state with the reason and a **"Message tenant"** button; the landlord decides whether to send it. No automatic message. |
| D32 | Timeline source | **Derived client-side from `GET /api/landlord/tenancies/:id/payment-history`** (charges + their submissions), not a new endpoint and not the activity feed. |
| D33 | Loading state | **Skeleton table rows** (`ui/Skeleton`) — header + five shimmering rows, no layout jump. |
| D34 | Page subtitle | **Dropped.** `PageHeader title="Payments"` only — the reference's subtitle is deck copy; this repo has swept redundant subtitles. |
| D35 | Needs attention | **In grace + Overdue + Needs review** rows, counted **once each**; Payment-issue rows are counted through their reopened charge (RES-2). |
| D36 | "More filters" presentation | **A popover panel** anchored under the button (not an inline row, not a `Modal`). |
| D37 | Existing tests | **`apps/web/test/payments-tracker.test.tsx` and the tracker expectations in `payments-shell.test.tsx` are rewritten** against the new page in the same change. |
| D38 | "Payment issue" ships | **Yes — the seventh label**, error tone, from D3's derivation. This supersedes the earlier round's "no payment-issue label" answer (RES-2). |
| D39 | Footer line | **`{n} tenants · {k} need attention`** — no "View all" link (there is nothing more to show). |
| D40 | The data gap for D38 | **Two additive fields on the existing tracker DTO** — `pending_claim_charge_id` and `has_rejected_claim` — instead of N per-row charge fetches (RES-4). |
| D41 | The reminder gate | **Remind is always allowed** while the tenant has an open charge; the composer shows **"Last reminded <date>"** when `can_remind` is false because `reminder_sent_at` is set. |
| D42 | "View" on a Paid row | **Opens the tenant detail drawer**, landing on the settled charge and its approval event. |

### 1.1 Contradictions and how they were resolved

**RES-1 — five labels vs "keep In grace distinct".** The brief lists five statuses; the tracker has
seven internal states. The interview first chose "collapse to exactly five" and then "keep In grace
distinct". **Resolution: the label set is the brief's five *plus* "In grace"**, because folding a
past-due-but-not-yet-overdue charge into "Due in X days" would tell a landlord the opposite of the
truth. That gives six, then seven with RES-2.

**RES-2 — "Payment issue" removed, then restored.** One round answered *"no payment-issue label —
a rejected claim is represented by the reopened charge's overdue/in-grace state"*; the next answered
*"honour the brief: the sixth label"*. **Resolution: the brief wins — "Payment issue" ships**, because
(a) the request lists it as a status, (b) its rejection flow says "change the status to Payment issue",
and (c) a row whose proof the landlord just rejected is exactly the row they need to find again.

Consequence for D35: a rejected claim **is** counted in "Needs attention" — but it is counted *once*
(the row now displays Payment issue instead of Overdue/In grace, so there is no double count). The
earlier answer's intent — *"not counted separately"* — is preserved; only the label changed.

**RES-3 — "counts scoped to the current table" vs server-side filters.** The tracker endpoint applies
`status`, `dueFrom`, `dueTo`, `overdue` and `needsReview` **server-side**, and its `summary` is
computed from the already-filtered rows. But this page's seven labels do not map 1:1 onto the server's
seven statuses ("Due in X days" must catch both `due_soon` and `upcoming`), and a server-filtered
`summary` cannot answer *"what does this table show"* once a label-level filter is applied.
**Resolution:**
- **Sent to the server:** `propertyId`, `month`, `q` (search).
- **Applied client-side to the returned rows:** status label, room, due-date range, overdue-only,
  needs-review-only, payment method.
- **The four metrics are computed client-side from the displayed rows** (D14/§6). The server's
  `summary` object is ignored by this page (it stays in the payload for other consumers).

**RES-4 — "reuse existing endpoints" vs the "Payment issue" label.** The tracker payload carries
`has_pending_claim` but **no** rejected-claim signal, so D38 is underivable without either N
`GET /charge` calls per page load or a payload field. **Resolution: add two fields to the existing
response** (`pending_claim_charge_id: number | null`, `has_rejected_claim: boolean`). This is not a new
endpoint, not a migration, and not a new query — the repository already holds every charge and its
submissions in memory when it builds the rows (`chargesByApplication`), so both values are a `.some()`
away (§13.2).

**RES-5 — the reference's "Showing 4 of 12 tenants · View all" vs "show all rows".** The reference
mocks pagination the interview rejected. **Resolution: all rows render; the footer shows
`{n} tenants · {k} need attention`** (D39), preserving the reference's bottom-line placement without
inventing a second page.

---

## 2. Current state (verified read-only, 2026-10-20)

### 2.1 Files that exist today

| File | What it is | Fate |
| --- | --- | --- |
| `apps/web/src/routes/landlord/payments.tsx` | `Protected role="landlord"` + `RoleShell nav={LANDLORD_NAV}` + `<Outlet />` | **Kept unchanged** (owns the shell) |
| `apps/web/src/routes/landlord/payments/index.tsx` | Imports `PaymentsTrackerPage` | **Rewired** to the new page |
| `apps/web/src/routes/landlord/payments/record.tsx` | Deep-link entry that opens `RecordPaymentModal` | **Kept** (unused links stay working) |
| `apps/web/src/components/payments/PaymentsTrackerPage.tsx` (542 lines) | The tracker: queries, URL filters, verify/reject, reminders, next-due edits, settings, CSV, `AddChargeModal`, reject `Modal`, `RecordPaymentModal` | **Replaced** by `PaymentsMonitoringPage.tsx`; `AddChargeModal` moves out to its own file |
| `apps/web/src/components/payments/PaymentTrackerTable.tsx` (333 lines) | 10-column table + in-row `RowHistory` | **Deleted** |
| `apps/web/src/components/payments/PaymentFilters.tsx` (156 lines) | 8-field filter card + `TrackerFilterState` | **Deleted** (a new filter bar replaces it) |
| `apps/web/src/components/payments/PaymentSummaryCards.tsx` (65 lines) | Five money cards that double as status filters | **Deleted** |
| `apps/web/src/components/payments/StatusLegend.tsx` (26 lines) | Visible status key | **Deleted** (labels now sit inside each pill; D25 of the tracker spec is satisfied by text+colour inside the table itself, §16) |
| `apps/web/src/components/payments/BillingRulesCard.tsx` | Grace/late-fee editor | **Kept in the tree, unwired from Payments** (D30) |
| `apps/web/src/components/payments/RecordPaymentModal.tsx` | Full payment recorder (charges, method, reference, proof, next due date) | **Kept and reused** (D10) |
| `apps/web/src/lib/payments.ts` (290 lines) | `formatPeso`, `formatPaymentDate`, `paymentMethodLabel`, `monthLabel`, `manilaToday`, `PAYMENT_METHODS`, `PAYMENTS_ERROR_HINT`, `trackerStatusMeta`, `TRACKER_STATUS_LEGEND`, `roomOrBedLabel`, `paymentStatusMeta`, … | **Kept**, with additions (§13.4); exports that only the deleted files used are pruned |
| `apps/web/src/lib/api/payments.ts` (346 lines) | `getPaymentTracker`, `getPaymentHistory`, `getLandlordCharge`, `verifyLandlordSubmission`, `rejectLandlordSubmission`, `recordLandlordPayment`, `createLandlordCharge`, `fetchLandlordPaymentsCsv`, `sendPaymentReminder`, `updateNextDueDate`, `getBillingSettings`/`updateBillingSettings`, `uploadLandlordProof` | **Kept unchanged** |
| `apps/web/src/lib/api/messages.ts` | `openThread`, `sendMessage`, `uploadMessageAttachments`, … | **Kept unchanged** |
| `apps/web/src/components/messages/MessageComposer.tsx` | Draft-owning composer, Enter = newline, ⌘/Ctrl+Enter = send, image previews, max chars/images | **Reused inside a new modal** (§11) |
| `apps/web/src/components/ui/*` | `Button`, `Card`, `PageHeader`, `Field` (`TextInput`/`SelectInput`/`TextArea`), `Modal`, `ConfirmDialog`, `StatusBadge`, `Skeleton`, `Spinner`, `EmptyState`, `ErrorState`, `Toast`, `Icon` | **Reused**; only `Drawer` is new |
| `apps/web/test/payments-tracker.test.tsx` | Asserts the tracker's 10 columns, legend, filters | **Rewritten** for the new page (D37) |
| `apps/web/test/payments-shell.test.tsx` | Shell-ownership + payments invariants | **Tracker expectations rewritten**, shell invariants kept |

### 2.2 The tracker payload this page consumes

`GET /api/landlord/payments/tracker?propertyId&month&q` →
`{ success, data: { rows: TrackerRow[], summary, counts: { rows, needs_review } } }`

`TrackerRow` (as typed in `apps/web/src/lib/types.ts`):

```
application_id, boarder_id, boarder_name, room_id, room_number,
room_occupied, room_capacity, move_in_date, monthly_rent,
next_due_date, days_remaining, days_overdue,
status: 'paid'|'due_today'|'due_soon'|'in_grace'|'overdue'|'upcoming'|'no_charge',
status_label, current_charge_id, amount_due, last_payment,
has_pending_claim, other_open_charges, can_remind
```

`TrackerSummary` = `{ expected, paid, due_today, in_grace, overdue }` (unused here — RES-3).

`PaymentCharge` (charge detail + history) has `amount`, `late_fee`, `total_due`, `due_date`,
`paid_date`, `stored_status`, `payment_method`, `payment_method_label`, `reference_number`,
`reminder_sent_at`, `created_at`, `submissions: PaymentSubmission[]`.
`PaymentSubmission` has `amount`, `payment_method`, `reference_number`, `proof_url`, `notes`,
`status` (`pending`/`verified`/`rejected`), `verified_by`, `verified_at`, `rejection_reason`,
`created_at`, `submitted_by_name`. Submissions come back **`ORDER BY created_at ASC, id ASC`**, so
`latestSubmission()` (`lib/payments.ts`) is the last element.

### 2.3 What the data cannot tell us (and what this spec does about it)

| Gap | Effect | Handling |
| --- | --- | --- |
| No `payment_issue` stored status | D38's label cannot be read, only derived | `has_rejected_claim` added to the tracker DTO (RES-4) |
| `has_pending_claim` is **any** charge's claim, while `current_charge_id` is the open **rent** charge | A pending utility claim would open a rent charge with nothing to review | `pending_claim_charge_id` added to the DTO; the drawer opens the charge that actually holds the claim |
| Submission carries `verified_by` (id) but no name | The timeline's "Approved by …" cannot name a different reviewer | "Approved by you" when the id matches the signed-in landlord, otherwise "Approved" (§12.3, L2) |
| No reject timestamp separate from `verified_at` | Rejection events use `verified_at` | Stated in §12.3 |
| `RecordPaymentModal` cannot be prefilled with an amount | "Log offline payment" can preselect the tenant only | Accepted; the landlord types the amount (§12.4) |
| Tracker rows carry no per-charge paid total | "Paid" metric must use `monthly_rent` | Documented metric definition (§6) |

---

## 3. Status vocabulary (the heart of the page)

Seven labels. **No new colours are introduced**: every label maps to a tone key that already exists in
`components/ui/StatusBadge.tsx`, and every pill carries its text label as well as its colour.

| Row reality (server) | Displayed label | `StatusBadge` tone key | Existing tone classes | Row action |
| --- | --- | --- | --- | --- |
| current open charge's latest submission is `pending` | **Needs review** | `awaiting_verification` | `bg-info-tint text-info-ink` | **Review proof** |
| current open rent charge's latest submission is `rejected` (nothing newer) | **Payment issue** | `rejected` | `bg-error-tint text-error-ink` | **Remind** |
| `status = 'paid'` | **Paid** | `paid` | `bg-success-tint text-success-ink` | **View** |
| `status = 'due_today'` | **Due today** | `due_today` | `bg-error-tint text-error-ink` | **Remind** |
| `status = 'due_soon'` | **Due in {days_remaining} days** | `due_soon` | `bg-warning-tint text-warning-ink` | **Remind** |
| `status = 'upcoming'` | **Due in {days_remaining} days** | `upcoming` | `bg-subtle text-gray-ink` | **Remind** |
| `status = 'in_grace'` | **In grace** | `in_grace` | `bg-warning-tint text-warning-ink` | **Remind** |
| `status = 'overdue'` | **Overdue** | `overdue` | `bg-error-tint text-error-ink` | **Remind** |
| `status = 'no_charge'` | **No charge yet** | `no_charge` | `bg-subtle text-gray-ink` | — (no action) |

**Precedence (evaluated in this order, first match wins):** pending claim → rejected claim → the
server's `status`. A pending claim outranks everything ("the ball is with the landlord", inherited from
`payments-feature`); a rejected claim outranks the date states because the *next* thing that must happen
is the tenant resubmitting; both are evaluated against the **open rent charge** when one exists
(`current_charge_id`), falling back to the row's `has_pending_claim`.

**Rationale for two tones on the same words:** "Due in 12 days" and "Due in 2 days" are the same
sentence with different urgency, so the sentence stays and the tone does the work (`warning` inside the
3-day window, neutral outside it). That is what keeps the brief's five labels honest instead of
inventing a sixth phrase.

**Degraded copy:** if `days_remaining` is `null` while the status is `due_soon`/`upcoming` (should not
happen — the server computes it from the same due date), render **"Due soon"**, never "Due in null
days".

**Icon:** the pills in this table carry **no icon** (the reference shows text-only pills). The existing
`icon` prop on `StatusBadge` stays available and unused here.

---

## 4. Page layout

Below `RoleShell`: breadcrumb (already rendered by the shell's topbar — `Landlord › Payments`), then:

1. **`PageHeader`** — `title="Payments"`, no subtitle (D34), `actions={<Button variant="outline">
   Export CSV</Button>}`. No "Record a payment", no "Add a charge", no primary button (brief).
2. **Filter bar** (§5) — one row on desktop: Property · Month · Search tenant or room · Status ·
   More filters · Clear.
3. **Metrics strip** (§6) — a single `Card` (not four cards): four cells divided by `divide-x
   divide-border`, labels `Tenants` / `Expected` / `Paid` / `Needs attention`. Values: plain count,
   `formatPeso`, `formatPeso` (green `text-success-ink`), plain count (red `text-error-ink`). Two
   columns on phone, four from `lg`.
4. **Table card** — a `Card` containing: an `h2` (`October payments`), the helper line *"Rent charges
   are created automatically from each tenant's rent cycle."*, the table (§7), and the footer line
   (D39).
5. **Drawers** (§8, §9) render outside the card, fixed to the viewport's right edge.

Vertical rhythm: `flex flex-col gap-5` (the tracker's own spacing), so nothing new is introduced.

**No other sections.** No charts, no aging buckets, no collection-rate cards, no billing-rules card, no
status legend block, no "recent activity" (brief; D30 and §21).

---

## 5. Filters

### 5.1 Controls

| Control | Element | Values | Transport |
| --- | --- | --- | --- |
| **Property** | `Field` + `SelectInput` | the landlord's accessible properties (`getProperties`); defaults to the first one (agent default A2) | server (`propertyId`) |
| **Month** | `Field` + `TextInput type="month"` | `YYYY-MM`; defaults to the current Manila month | server (`month`) |
| **Search tenant or room** | `Field` + `TextInput` | free text; placeholder exactly `Search tenant or room` | server (`q`), 300 ms debounce |
| **Status** | `Field` + `SelectInput` | `Any status` + the seven display labels (D11) | client |
| **More filters** | `Button variant="outline"` with a `chevronDown` icon | opens the popover (§5.2) | — |
| **Clear** | `Button variant="ghost"` | resets §5.3 | — |

Layout: `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6`, with "More filters" and "Clear" in the
last two cells and bottom-aligned (the tracker's `flex flex-col justify-end` trick). At `sm` the six
controls become three rows of two; at `xs` one per row. **No `Card` wrapper** — the reference shows the
controls sitting directly on the cream surface (unlike the tracker's filter card). That is a layout
change, not a token change.

### 5.2 "More filters" popover

A small anchored panel (`absolute`, `z-30`, `rounded-xl border border-border bg-surface p-4
shadow-pop`, the app's existing surface vocabulary), opened by the button, closed by Escape, outside
click, or a second press. Contents, in order:

- **Room / bed** — `SelectInput`: `Any room` + the distinct `room_number` values present in the loaded
  rows (client filter; there is no room-id lookup needed).
- **Due from** / **Due to** — two `TextInput type="date"` fields (inclusive range on `next_due_date`).
- **Overdue only** — checkbox.
- **Needs review only** — checkbox.
- **Payment method** — `SelectInput`: `Any method` + `PAYMENT_METHODS` labels, filtered on
  `row.last_payment.method` (a tenant who has never paid matches no method).

The button shows a count badge (`More filters · 2`) in `text-gray-ink` when any popover filter is
active, so a collapsed popover can never hide an active filter. All inner controls are `<label>`-bound
via `Field`'s `htmlFor`, so the popover is fully keyboard-operable.

### 5.3 URL contract and "Clear filters"

Params (all optional, omitted when empty): `propertyId`, `month`, `q`, `status`, `room`, `dueFrom`,
`dueTo`, `overdue=1`, `needsReview=1`, `method`. Read on mount exactly like the tracker's
`useTrackerFilters`, written with `navigate({ to: '/landlord/payments', search })`. The property and
month are **always** written once resolved, so a shared link reproduces the exact table.

**Clear filters** resets `q`, `status`, `room`, `dueFrom`, `dueTo`, `overdue`, `needsReview`, `method`
**and leaves Property + Month in place** (agent default A3) — they scope the page ("for a selected
property and month"), they are not filters. The control is disabled (visually quiet, `aria-disabled`)
when nothing is set.

---

## 6. Metrics (D14, RES-3)

Computed client-side from the **displayed** rows, so the numbers always describe the table beneath
them:

| Metric | Definition | Rendering |
| --- | --- | --- |
| **Tenants** | `rows.length` | integer, `text-ink` |
| **Expected** | Σ `row.monthly_rent` over rows whose label is **not** `Paid` and **not** `No charge yet` | `formatPeso`, `text-ink` |
| **Paid** | Σ `row.monthly_rent` over rows labelled `Paid` | `formatPeso`, `text-success-ink` |
| **Needs attention** | count of rows labelled `In grace`, `Overdue`, `Needs review` or `Payment issue` | integer, `text-error-ink` |

Notes:
- "Due today" and every "Due in X days" row deliberately **do not** count (D35): a rent day that has
  not passed is business as usual.
- `monthly_rent` (not `amount_due`) keeps the three money figures on one basis — the rent the tenant
  owes for the cycle — matching D13 and the reference's ₱4,000 × 12 = ₱48,000 arithmetic.
- Money renders through the existing `formatPeso` (₱48,000.00). The reference's `₱48,000` is deck
  styling; two decimals is the app's money convention (agent default A4).
- The strip is **not** clickable — the reference shows a read-only summary, and making it a filter
  would duplicate the Status control.

---

## 7. The table

### 7.1 Markup

A real `<table>` inside `overflow-x-auto rounded-xl border border-border bg-surface`, `min-w-[720px]`
on narrow screens (D26), with `<caption className="sr-only">Payments for {Month Year}</caption>` and
`<th scope="col">` headers styled like the tracker's (`text-left text-xs uppercase tracking-wide
text-gray-ink`).

| Column | Content | Notes |
| --- | --- | --- |
| **Tenant** | `boarder_name` | A `<button type="button">` styled as text (`text-ink font-medium hover:underline focus-visible:…`) with `aria-label="Open payment details for {name}"` → tenant detail drawer (D42 uses the same drawer for "View") |
| **Room** | `room_number` | Plain room label only (the mock's `Room 01`). The occupancy share (`Room 4 · 2/4`) is *not* in this table — it stays in the tenant drawer (agent default A5) |
| **Due date** | `next_due_date` via `formatPaymentDate` (`Oct 5, 2026`), `—` when null | Never a derived/relative string |
| **Amount** | `formatPeso(monthly_rent)` | Rent only (D13) |
| **Status** | `StatusBadge` per §3 | text + colour, always |
| **Action** | per §3's Action column | see §7.2 |

`<tr>` hover uses the app's existing subtle hover (`hover:bg-subtle/40`), and the row whose drawer is
open carries `bg-subtle/40` so the trigger stays findable while the drawer covers the right edge.

### 7.2 Row actions

| State | Action control | Behaviour |
| --- | --- | --- |
| Paid | **View** — link-styled button (`text-primary hover:underline`) | Tenant detail drawer (D42) |
| Needs review | **Review proof** — link-styled button | Review drawer for `pending_claim_charge_id` (fallback `current_charge_id`) |
| Due today / Due in X days / In grace / Overdue / Payment issue | **Remind** — `Button size="sm" variant="outline"` | Message composer (§11.2) |
| No charge yet | — | Nothing; the cell is empty (`—` in `text-gray-ink`, `aria-hidden` on the dash is not needed since it is text) |

Every action carries `aria-label` naming the tenant (`Remind John Dela Cruz`, `Review Liam Garcia's
proof`, `View Maria Santos' payments`), and the Remind button is disabled while its send is in flight.

Deliberately **absent** from the row: "Record payment", "History", "Add charge", "Send reminder"
(the tracker's actions). Offline recording lives in the drawer (D2/D10), and the row keeps exactly one
action so the table stays the focus.

### 7.3 Footer

`Showing {n} tenants · {k} need attention` in `text-sm text-gray-ink`, left-aligned under the table
(D39/RES-5), with `k` = the Needs-attention count of §6 (so it agrees with the metric strip). When
`n = 0` the footer is hidden (the empty state replaces the table).

### 7.4 Table states

| State | Rendering |
| --- | --- |
| **Loading (first load)** | The card, its heading and helper line render; the table header renders; the body is **five skeleton rows** (`Skeleton h-4` bars at 40/25/30/20/35/25 % widths). Metrics render as `Skeleton h-8 w-20` blocks (D33) |
| **Loading (filter change)** | Previous rows stay rendered with `aria-busy` on the table and reduced opacity (`opacity-60`), so changing a filter never blanks the page |
| **Empty — nothing billed** | `EmptyState icon="payment" title="No tenants to bill for {Month Year}"` + description *"Rent charges are created automatically from each tenant's rent cycle. Confirm a tenancy or pick another month."* + a link to `/landlord/boarders` |
| **Empty — no properties** | `EmptyState icon="buildingOffice" title="No properties yet"` + link to `/landlord/properties` |
| **Empty — filters match nothing** | `EmptyState icon="search" title="Nothing matches these filters"` + `Button onClick={clearFilters}` "Clear filters" |
| **Error** | `ErrorState message={error.message} hint={PAYMENTS_ERROR_HINT}` + `Button` "Try again" → `refetch()` |
| **No proof image on a pending claim** | The drawer shows a bordered placeholder "No proof image attached" instead of a broken `<img>` (§8.3) |

---

## 8. Review drawer

### 8.1 The shared primitive (`ui/Drawer.tsx`)

New file, no styling invention — it reuses the app's surface vocabulary:

```ts
export function Drawer({
  open, title, onClose, children, footer, width = 'md',
}: {
  open: boolean;
  title: string;                     // → aria-labelledby + the visible heading
  onClose: () => void;               // Escape, the X, and the scrim (md+ has no scrim)
  children: ReactNode;
  footer?: ReactNode;                // pinned action area
  width?: 'md' | 'lg';
})
```

Behaviour:
- **Right-anchored, full height**, `fixed inset-y-0 right-0 z-50`, `w-full max-w-[420px]` (`lg` →
  `max-w-[520px]`), `border-l border-border bg-surface shadow-pop`, `flex flex-col`.
- **Under `md`: full-screen** (`inset-0 max-w-none`), with a back-styled header ("← Back" replaced by
  the same X, `aria-label="Close"`) — D25/D26, brief's "convert the right drawer into a full-screen
  detail page".
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` the title, a `sr-only` description slot.
- **No dimming scrim on `md`+** so "the table remains visible" (brief) — but the content behind is
  **inert while open** (`inert` on the page wrapper; the app already uses focus traps in `Modal`, and
  this is the same promise). On `sm`/`xs` the full-screen panel covers everything anyway.
- **Escape** closes; the **X** closes; focus moves to the panel on open and returns to the element
  that opened it on close (the `ConfirmDialog` pattern); Tab is trapped inside while open.
- Body scrolls (`overflow-y-auto`), header and footer are pinned.
- Content is never unmounted while closing (no exit animation is introduced — the app has none).

### 8.2 Review drawer content (matches screenshot 2)

Data: `useQuery(['landlord-charge', chargeId], () => getLandlordCharge(token, chargeId))`; the
submission is `latestSubmission(charge)` whose `status === 'pending'`.

| Region | Content |
| --- | --- |
| Eyebrow | `PAYMENT SUBMISSION` (`text-[11px] uppercase tracking-wide text-gray-ink`) |
| Title | Tenant name (`text-lg font-semibold text-ink`) |
| Sub-line | `Room {room_number} · {Month} rent` (e.g. `Room 04 · October rent`) — from the charge's room + `due_date` month, not the row, so it stays correct after a refetch |
| Status | `StatusBadge status="awaiting_verification" label="Needs review"` |
| Amount | `formatPeso(submission.amount)` |
| Method | `paymentMethodLabel(submission.payment_method, charge.payment_method_label)` (`GCash / e-wallet`, or the stored custom label for `other`) |
| Reference | `submission.reference_number` (`—` when empty) |
| Submitted | `formatDateTime(submission.created_at)` → `October 8, 2026 · 10:42 AM` (new formatter, §13.4; Manila wall-clock) |
| Proof | `<a href={proof_url} target="_blank" rel="noreferrer">` wrapping a `max-h-64 object-contain` image on the app's soft surface (`bg-subtle/40 rounded-xl border border-border p-3`) with `alt="Payment proof from {name}"`. No proof → the placeholder panel. Image failure (`onError`) → the same placeholder + "Open proof in a new tab" link |
| Check line | *"Check the amount and reference before approving."* (`text-sm text-gray-ink`) |
| Footer actions | **Approve payment** (`Button variant="primary"`, full-width-ish) · **Reject** (`Button variant="outline"`, the danger-styled text) · **Request new proof** (link-styled button below the pair, matching the reference) · close via the header X |
| Busy | Approve shows `Approving…` and both approve/reject disable while either mutation is in flight |

When `charge` is still loading: skeleton blocks for the facts + the proof box. When it errors:
`ErrorState` inside the drawer with a retry (the drawer stays open). When the charge has **no pending
submission** (someone else approved it, or a new proof replaced it): the drawer shows the settled
state (§8.4) rather than an approve button.

### 8.3 Approve (D22, D23)

1. Guard: `submission.amount < charge.total_due` → the button is **disabled**, with the inline line
   *"The tenant submitted ₱3,500 of the ₱4,000 due. Full payment is required before approving."* and
   `Request new proof` promoted beside it (the natural next step). `total_due` (rent + late fee) is
   the comparison basis; when it differs from `amount`, the line names both.
2. Overpayment (`amount > total_due`) is allowed, with `Overpaid by ₱X` under Amount.
3. `verifyLandlordSubmission(token, submission.id)` → on success:
   - `invalidateQueries(['payment-tracker'])` and `['payment-history', application_id]`, so the row,
     the metrics, the footer count and the timeline all move at once (**the table updates
     immediately**, brief).
   - **The drawer stays open** and re-renders in its approved state (§8.4, D22). A toast
     (`useToasts`) says `Payment approved` — the drawer is the success state, the toast is the
     confirmation.
   - Focus moves to the drawer's new primary action (`Close`).
4. On failure: the toast carries the server message; the drawer stays in its pending state and the
   button re-enables. No optimistic row flip (the status flip is what the whole page is about — it must
   be the server's answer, not a guess).

**What approval stores** (brief: "save the approval date, landlord, payment method, amount and proof
image"): the existing verify route already writes `payment_submissions.status='verified'`,
`verified_by`, `verified_at` and the charge's `status='paid'`, `paid_date`, `payment_method`,
`reference_number`; the proof URL is already on the submission. **No schema change**: §13.5 verifies
each of the five fields against the route before implementation starts.

### 8.4 Approved state (D22)

Same drawer, same header, title unchanged; the status pill becomes `Paid`, and the action area is
replaced by a quiet summary panel:

```
Paid · approved {October 8, 2026 · 10:44 AM}
Approved by you            (or "Approved" when verified_by ≠ the signed-in landlord)
₱4,000 · GCash · Ref 8842
```

plus a single **Close** button (primary). No "Approve" is offered twice.

### 8.5 Reject (D31)

1. **Reject** opens the tracker's reject `Modal` (a confirmation dialog with a field — `ConfirmDialog`
   has no input, so `Modal` + `TextArea` is reused): title *"Reject this payment?"*, body explaining
   that the tenant will be told why and can submit again, `Field label="Reason" htmlFor=
   "rejection_reason"` with placeholder `e.g. No transfer matching this reference number`, and a
   `Button variant="danger"` **Reject payment** disabled until the reason is non-empty.
2. `rejectLandlordSubmission(token, submission.id, reason)` → invalidate the tracker + history.
3. The **drawer stays open** and switches to the rejected state: pill `Payment issue`, the reason
   quoted in a quiet error panel, and **two buttons**: `Message tenant` (primary-outline) and `Close`.
   Choosing to message opens the composer **prefilled with the rejection reason** (§11.3); choosing
   Close closes the drawer with the row already showing Payment issue.
4. The row now displays **Payment issue** and its action is **Remind**; a new proof flips it to
   **Needs review** (D3).

### 8.6 Request new proof (D3, D21)

Opens the message composer **over** the drawer with the exact prefilled body:

> Please send a clearer payment proof showing the amount and reference number.

On send: toast `Message sent`, the drawer shows an inline note *"New proof requested — the status stays
Needs review until the tenant sends another proof."* and the **status does not change** (brief,
D3). The drawer stays open so the landlord can close it deliberately. Sending is optional-cancel: if
they cancel the composer, the drawer is exactly as it was.

---

## 9. Tenant detail drawer (D7, D42)

Opened by the tenant name (any state) and by **View** on a Paid row. Same `Drawer`,
`width="lg"` on `md`+.

| Region | Content | Source |
| --- | --- | --- |
| Title | Tenant name | tracker row |
| Sub-line | `Room {room_number} · {property_title}` | row + `getProperties` (or history's `property_title`) |
| Status | `StatusBadge` per §3 | row |
| Facts (2-col grid) | **Current rent** `formatPeso(monthly_rent)` · **Due date** `formatPaymentDate(next_due_date)` | row |
| Actions | **Send message** (`outline`), **Remind** (`outline`), **Approve payment** (`primary`, only when a proof is pending → opens the review drawer), **Log offline payment** (`ghost`), **Add a charge** (`ghost`) | §11, §12 |
| Timeline | Payment activity, newest first (§9.1) | `getPaymentHistory(application_id)` |

`Approve payment` is present **only** when `has_pending_claim` (brief: "approve payment action when
proof is pending"); it opens the review drawer for `pending_claim_charge_id` and leaves this drawer in
place underneath (the review drawer replaces it — only one drawer is open at a time, §10).

Loading: skeleton lines under the facts and timeline. Error: inline `ErrorState` in the timeline area
with retry (the facts above still render, because they come from the row).

### 9.1 Timeline derivation (D32)

Client-side, from `TenancyPaymentHistory` (`{ tenancy, charges[] }`, each charge carrying its
submissions). One event per real record; **no invented events**, no "reviewed" event that never
happened.

| Event | Source row | Timestamp used | Copy | Tone |
| --- | --- | --- | --- | --- |
| **Rent charge created** | a `rent` charge | `charge.created_at` | `Rent · ₱4,000 · due Oct 8, 2026` | neutral |
| **Charge added** (other types) | `deposit` / `advance` / `utility` / `late_fee` / `other` | `charge.created_at` | `{chargeTypeLabel} · ₱X · due …` | neutral |
| **Proof submitted** | `submission` with `status='pending'` | `submission.created_at` | `₱4,000 · GCash · Ref 8842` + `View proof` link | info |
| **Payment approved** | `submission` with `status='verified'` | `submission.verified_at` | `Approved · ₱4,000 · GCash` (+ "by you" when `verified_by` = the signed-in user, L2) | success |
| **Payment rejected** | `submission` with `status='rejected'` | `submission.verified_at` (L3) | `Rejected: {rejection_reason}` | error |
| **Reminder sent** | `charge.reminder_sent_at` | `reminder_sent_at` | `Reminder sent for the {Month} rent` | neutral |

Rendering: a vertical rule (`border-l border-border pl-4`), one row per event — a 6px dot tinted with
`statusTone(event.tone)`'s text colour, the title, the copy line, and the timestamp in
`text-xs text-gray-ink`. Sorted by timestamp **descending**, ties broken by charge id so a
same-second pair is stable. Each event's `id` is `${kind}:${chargeId}:${submissionId ?? ''}` (React
key). When the timeline is empty: *"No payment activity yet — a rent charge appears here as soon as the
tenancy's cycle creates one."*

The timeline is capped at the **20 most recent** events (agent default A6) with a `Show earlier
activity` button that raises the cap by 20 — the history endpoint returns a tenancy's whole ledger, and
a three-year tenancy should not render 200 rows into a drawer.

---

## 10. Drawer orchestration (D6, D7)

Page-level state, one union:

```ts
type Panel =
  | { kind: 'none' }
  | { kind: 'review'; chargeId: number; applicationId: number }
  | { kind: 'tenant'; applicationId: number };
```

- Opening either panel closes the other (only one drawer at a time), and opening the composer or a
  modal does not change the panel.
- The review drawer opened from the tenant drawer **replaces** it (`panel = review`); closing the
  review drawer returns to `none` (not back to the tenant drawer — the landlord asked for the proof,
  and the row is still one click away). Documented as an agent default (A7).
- No panel state goes into the URL (D6), so a reload returns to the plain table.
- The `applicationId` travels with the review panel so approvals can invalidate
  `['payment-history', applicationId]` without a second lookup.

---

## 11. Messaging (D8, D21, D31)

### 11.1 The composer modal

New `components/payments/MessageTenantModal.tsx` — a `Modal` (the app's existing dialog) wrapping the
existing **`MessageComposer`** (`initialText`, `autoFocus`, `onSend`). Flow:

1. On open: `openThread(token, { counterpart_id: boarder_id, property_id })` (idempotent per pair —
   `messages-feature-review` R1). While it resolves, the modal shows a `Spinner` and a disabled
   composer.
2. `onSend({ text, files })`: `uploadMessageAttachments(token, files)` → `sendMessage(token, threadId,
   { body: text, attachments, property_id })` — exactly `MessageThread`'s own sequence (upload first,
   then send, so a failed upload never leaves a half-written message).
3. Success: toast `Message sent`, invalidate `['message-threads']` and `['message-unread']`, close the
   modal and return focus to the button that opened it. Failure: the composer keeps the draft and shows
   the server message (the composer's own error slot).
4. The modal is titled per intent: **`Message {first name}`** for Remind/Request-proof, **`Message
   about the payment`** for the post-reject message.

This deliberately **does not** navigate to `/landlord/messages/:threadId` (the `MessageButton`
behaviour): the brief wants the landlord to stay on Payments, and the drawer must survive the send.

### 11.2 Remind prefill (D21, D41)

Body, built from the row (pure helper `reminderMessage(row, monthLabel)`):

> Hi {first name}, a gentle reminder that your ₱4,000 rent for October 2026 was due on Oct 5, 2026.
> You can send your payment proof here once you've paid.

Past-due rows append ` It's now X days past the due date.` ("in grace"/"overdue" rows only, using
`days_overdue`). **Remind is available whenever `current_charge_id` exists** (D41) — the tracker's
once-per-cycle gate is not applied to a message. When `can_remind === false` **because**
`reminder_sent_at` is set, the modal shows a quiet line above the composer: *"Last reminded Oct 3,
2026."* The old in-app reminder endpoint (`POST /api/landlord/charges/:id/remind`) is **no longer
called from this page** (agent default A8) — sending a real message is the reminder now, and calling
both would notify the tenant twice.

### 11.3 Post-reject message (D31)

Body: `Your ₱4,000 rent payment for October was rejected: {reason}. Please send a new proof with the
correct amount and reference number.` Editable, not locked — the landlord can rewrite it entirely.

### 11.4 Request-new-proof message (§8.6)

The brief's exact sentence, character-for-character:
`Please send a clearer payment proof showing the amount and reference number.`

---

## 12. Offline payment and additional charges (D2, D10, D30)

| Action | Where | Behaviour |
| --- | --- | --- |
| **Log offline payment** | tenant detail drawer, `variant="ghost"` (secondary — brief: never primary) | Opens the existing `RecordPaymentModal` with `initialApplicationId` and a one-tenant `boarders` list, so cash / bank transfer / a Messenger screenshot can all be recorded with method, reference and an optional receipt. The modal is the existing component, unchanged (its proof upload, `charge_ids` selection and next-due-date handling all come along). On `onRecorded`: toast + `invalidateQueries(['payment-tracker'])` + `['payment-history', applicationId]`. |
| **Add a charge** | tenant detail drawer, `variant="ghost"` | The tracker's `AddChargeModal`, **moved out of the deleted page** into `components/payments/AddChargeModal.tsx` (props unchanged: `open`, `rows`, `token`, `propertyId`, `onClose`, `onCreated`, `onError`, plus a new optional `initialBoarderId` so the drawer opens with this tenant selected). Used for utilities / one-off charges only. |
| **Export CSV** | page header | `fetchLandlordPaymentsCsv(token, { propertyId, month })` — the same call and the same `payments-{month}.csv` download as today (D20). |
| **Billing rules** | — | **Not on this page** (D30). The card, `getBillingSettings` and `updateBillingSettings` stay in the tree; relocating the editor to the property settings surface is a separate change (§21). |

Deleting the page-level "Record a payment" button does **not** remove the route
`/landlord/payments/record` — existing links and bookmarks keep working (§2.1).

---

## 13. Data contract and the one backend change (D40, RES-4)

### 13.1 Requests this page makes

| When | Call |
| --- | --- |
| page load / property or month or search changes | `getPaymentTracker(token, { propertyId, month, search })`, key `['payment-tracker', propertyId, month, search]`, `keepPreviousData` |
| property list | `getProperties(token)`, key `['landlord-properties']` |
| review drawer opens | `getLandlordCharge(token, chargeId)`, key `['landlord-charge', chargeId]` |
| tenant drawer opens | `getPaymentHistory(token, applicationId)`, key `['payment-history', applicationId]` |
| approve / reject / record / add charge | the existing mutations, each invalidating `['payment-tracker']` + `['payment-history', …]` |
| Export CSV | `fetchLandlordPaymentsCsv(token, { propertyId, month })` |

`staleTime` 30 s for the tracker (payments move when a tenant acts), and the page does **not** poll.

### 13.2 The additive fields (the only `workers/api` edit)

`workers/api/src/repositories/payments/tracker.ts` already builds, per tenancy, the full `ChargeDto[]`
(`chargesByApplication`) including every submission, and already computes `hasPendingClaim`. Add:

```ts
// after `const hasPendingClaim = …`
const pendingClaimCharge = charges.find(charge =>
  charge.submissions.some(item => item.status === 'pending')
);
// "Rejected" means the CURRENT open rent charge's newest submission was rejected —
// a new proof (pending) therefore clears it, which is the only thing the label promises.
const latestOnOpenRent = openRent?.submissions.at(-1) ?? null;
const hasRejectedClaim =
  Boolean(openRent) &&
  latestOnOpenRent?.status === 'rejected' &&
  !openRent?.submissions.some(item => item.status === 'pending');
```

and on the row DTO (`workers/api/src/repositories/payments/tracker.ts` type + `apps/web/src/lib/types.ts`
`TrackerRow`):

```ts
/** The charge that actually holds a pending claim (may be a utility charge, not rent). */
pending_claim_charge_id: number | null;
/** The current open rent charge's newest submission was rejected and nothing newer arrived. */
has_rejected_claim: boolean;
```

Notes:
- **No new query, no new endpoint, no migration, no route change.** The two values are derived from
  arrays already in memory.
- `submissions` arrives `ORDER BY created_at ASC, id ASC`, so "newest" is the array's last element
  (`latestSubmission`'s rule); the extra `.some(pending)` guard makes the derivation order-independent
  anyway.
- Both fields are additive, so the existing API tests keep passing; the tracker test may add one
  assertion for `has_rejected_claim` (both true after a rejection, false after a new pending proof).
- The response remains `{ success: true, data: { rows, summary, counts } }` — nothing else moves.

### 13.3 Client-side filter/sort helpers

`apps/web/src/lib/payments.ts` gains pure, testable functions (mirroring how `trackerStatusMeta` /
`paymentStatusMeta` already live there):

```ts
export type MonitorLabel =
  | 'Paid' | 'Needs review' | 'Payment issue' | 'Due today'
  | 'In grace' | 'Overdue' | 'No charge yet' | `Due in ${number} days`;

export function monitorStatusMeta(row: TrackerRow): { tone: string; label: string };
export function needsAttention(row: TrackerRow): boolean;
export function monitorMetrics(rows: TrackerRow[]): {
  tenants: number; expected: number; paid: number; needsAttention: number;
};
export function matchesFilters(row: TrackerRow, filters: MonitorFilters): boolean;
export function reminderMessage(row: TrackerRow, month: string): string;
export function rejectionMessage(row: TrackerRow, month: string, reason: string): string;
export function buildTenantTimeline(history: TenancyPaymentHistory, viewerId?: number): TenantTimelineEvent[];
```

`monitorStatusMeta` is the **single** place the §3 table lives, so the table, the filter dropdown, the
tone and the metrics can never disagree.

### 13.4 Formatters

- `formatPeso`, `formatPaymentDate`, `monthLabel`, `formatPaymentDate` — reused as-is.
- **New** `formatDateTime(value: string): string` → `October 8, 2026 · 10:42 AM` in **Asia/Manila**,
  implemented with `Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', … })` on the parsed
  timestamp (never by string surgery, and never by the host's local zone — the same reasoning as
  `manilaToday`).
- **Pruned** if unused after the deletions: `TRACKER_STATUS_LEGEND`, `trackerStatusMeta`,
  `roomOrBedLabel` (only the deleted table/filters/legend import them — verified with a grep before
  removing, and `apps/web/test/payments.test.ts` updated if it asserts on them).

### 13.5 Approval-field verification (must happen before implementation)

Before writing the drawer, confirm in `workers/api/src/repositories/payments/submissions.ts` that the
verify path writes **all five** things the brief names: `verified_at` (date), `verified_by` (landlord),
the charge's `payment_method`, the charge's amount/paid state and the proof reference already stored on
the submission. If any is missing, it is a **gap to report**, not a thing to invent client-side.

---

## 14. Files

### 14.1 New

| File | Responsibility |
| --- | --- |
| `apps/web/src/components/ui/Drawer.tsx` | The shared right drawer (D25, §8.1) |
| `apps/web/src/components/payments/PaymentsMonitoringPage.tsx` | Queries, URL filters, panel union, toasts, invalidation — no markup beyond composition |
| `apps/web/src/components/payments/PaymentMonitorFilters.tsx` | The six controls + the "More filters" popover + `MonitorFilters`/`emptyMonitorFilters`/URL (de)serialisation |
| `apps/web/src/components/payments/PaymentMetricsStrip.tsx` | The four-cell metric card (§6) |
| `apps/web/src/components/payments/PaymentMonitorTable.tsx` | The six-column table, row actions, skeleton rows, footer line (§7) |
| `apps/web/src/components/payments/ReviewPaymentDrawer.tsx` | Review / approved / rejected states, approve, reject modal, request-new-proof (§8) |
| `apps/web/src/components/payments/TenantPaymentDrawer.tsx` | Facts, actions, timeline (§9) |
| `apps/web/src/components/payments/AddChargeModal.tsx` | The tracker's `AddChargeModal`, moved out + `initialBoarderId` |
| `apps/web/src/components/payments/MessageTenantModal.tsx` | The composer modal (§11) |
| `apps/web/test/payments-monitor-table.test.tsx` | Component test (D27) |
| `apps/web/test/payments-review-drawer.test.tsx` | Component test (D27) |

All new files stay within `components/payments/` + `components/ui/` (≤3 levels from `src/`, so the
4-level audit rule is satisfied).

### 14.2 Changed

| File | Change |
| --- | --- |
| `apps/web/src/routes/landlord/payments/index.tsx` | Imports `PaymentsMonitoringPage` (route + shell untouched) |
| `apps/web/src/lib/payments.ts` | Adds §13.3/§13.4 helpers; prunes exports the deletions orphan |
| `apps/web/src/lib/types.ts` | `TrackerRow` gains the two fields (D40) |
| `workers/api/src/repositories/payments/tracker.ts` | Derives the two fields (§13.2) |
| `apps/web/test/payments-tracker.test.tsx`, `apps/web/test/payments-shell.test.tsx` | Rewritten against the new page (D37); shell invariants kept |
| `apps/web/test/payments.test.ts` | Updated only if it asserts a pruned helper |

### 14.3 Deleted

`PaymentsTrackerPage.tsx`, `PaymentTrackerTable.tsx`, `PaymentFilters.tsx`, `PaymentSummaryCards.tsx`,
`StatusLegend.tsx` (D29). `BillingRulesCard.tsx` and `RecordPaymentModal.tsx` are **kept** (D30/D10).

---

## 15. Design-system guardrails (the request's "must remain unchanged" list)

| Must not change | How this spec honours it |
| --- | --- |
| Colour palette | Only existing tokens: `cream`, `surface`, `subtle`, `ink`, `gray-ink`, `border`, `border-strong`, `mint`, `primary`/`primary-strong`/`primary-hover`, `success-tint`/`success-ink`, `warning-tint`/`warning-ink`, `info-tint`/`info-ink`, `error-tint`/`error-ink`, `critical-tint`/`critical-ink`. **No new token, no arbitrary hex, no inline colour.** |
| Typography | The existing scale only: `text-2xl font-bold tracking-tight` (page title via `PageHeader`), `text-lg font-semibold` (drawer title), `text-base`/`text-sm` body, `text-xs` meta, `text-[11px] uppercase tracking-wide` eyebrow (already used elsewhere), `tabular` numerals are **not** introduced. |
| Spacing | `gap-5` between page blocks, `gap-4` inside grids, `p-4`/`px-4 py-3` cells, `p-6` drawer sections — the tracker's own rhythm. |
| Sidebar | `LANDLORD_NAV` untouched; the Payments entry already exists. |
| Buttons | `Button`/`buttonClasses` variants only (`primary`, `outline`, `ghost`, `danger`); no new variant, no size beyond `sm`/`md`. Link-styled row actions reuse `buttonClasses({ variant: 'ghost', size: 'sm' })` + `underline` — no new class vocabulary. |
| Inputs | `Field` + `TextInput`/`SelectInput`/`TextArea` only. |
| Status colours | §3's tone keys are **existing** `StatusBadge` entries. `StatusBadge.tsx` is not edited at all except (if needed) zero lines — no new tone keys. |
| Icons | Existing `Icon` keys only: `payment`, `buildingOffice`, `search`, `chevronDown`, `close`, `check`, `clock`, `export`, `plus`, `photo`, `chat`, `users`. No new SVG assets. |
| Borders / radii / shadows | `border border-border`, `rounded-xl`/`rounded-2xl`, `rounded-full` pills, `shadow-pop` for the drawer and popover. |
| Responsive behaviour | Sidebar drawer behaviour untouched; the table keeps horizontal scroll (as today); the new drawer is the only new responsive element (full-screen < `md`). |
| Tokens / components | Reuse list in §2.1; the **only** new component is `ui/Drawer.tsx`, written in the same idiom as `Modal`/`ConfirmDialog`. |

---

## 16. Accessibility

- **Table**: real `<table>`/`<th scope="col">`/`<caption class="sr-only">`. Column order is
  meaningful; no layout tables.
- **Tenant name**: a real `<button>` (`aria-label="Open payment details for {name}"`), not a `<div
  onClick>`; visible focus ring from the app's global focus styling.
- **Actions**: each button's accessible name includes the tenant (`Remind John Dela Cruz`,
  `Review Liam Garcia's proof`, `View Maria Santos' payments`), because a table of identically labelled
  buttons is unusable with a screen reader.
- **Colour is never the only signal**: every status is a pill with its label (§3); the metric labels
  are words, not colour swatches.
- **Drawer**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, Escape to close, focus moves in
  on open and returns to the trigger on close, Tab trapped, `aria-live="polite"` region for the
  approve/reject result so a keyboard user hears "Payment approved".
- **Popover**: `aria-expanded`/`aria-controls` on the button, Escape closes, focus returns to the
  button, all inner controls labelled.
- **Skeletons** are `aria-hidden` (the `Skeleton` component already sets it) with `aria-busy` on the
  table while loading.
- **Touch targets**: row action buttons are `size="sm"` but keep `py-1.5` + `min-h-[32px]`; the
  reference's quiet link actions get a padded hit area (`px-1 -mx-1`), so mobile tapping is not a
  precision task.
- **Reduced motion**: only `animate-pulse` (skeletons) and existing transitions — nothing added that
  needs a `prefers-reduced-motion` guard beyond what `Skeleton` already does.

---

## 17. Responsive behaviour

| Breakpoint | Layout |
| --- | --- |
| `≥ 1024px` (reference, 1140px) | Filters in one row of six; metrics in one card of four; table fully visible; drawer 420px fixed right, table still visible behind it (no scrim) |
| `768–1023px` | Filters wrap to 3×2; metrics 2×2; table scrolls horizontally; drawer still a right panel (400px) |
| `< 768px` | Filters stack 1-per-row; metrics 2×2; table scrolls horizontally inside its card (D26); **drawer becomes full-screen** with the same content in one column and a sticky header/footer; the popover becomes a full-width panel under the button |
| Touch | No hover-only affordance: row actions are always visible, not revealed on hover |

The page must not produce horizontal document overflow at 390px (the calendar spec's bar), only
in-card table scrolling.

---

## 18. Edge cases

| Case | Behaviour |
| --- | --- |
| Charge has a late fee | Amount column stays the rent (D13); the drawer's Amount is the **submitted** amount, and the check line names `total_due` when a fee is involved |
| Tenant submitted a short payment | Approve disabled with the underpayment line; Request new proof promoted (§8.3) |
| Tenant overpaid | Approve allowed; `Overpaid by ₱X` noted |
| Claim is on a utility charge, not rent | The row shows **Needs review** and `Review proof` opens the charge that holds the claim (`pending_claim_charge_id`) |
| Two pending claims for one tenant | The newest charge's claim opens first; the timeline lists both; approving one keeps the row at Needs review until the second is decided |
| Rejected, then new proof | Label moves Payment issue → Needs review (D3); `has_rejected_claim` clears (§13.2) |
| Rejected, nothing new | Row stays Payment issue indefinitely; counted once in Needs attention (RES-2) |
| Charge cancelled | `current_charge_id` is null → row reads **No charge yet** (or the next open cycle); cancelled charges never appear as a row state |
| Property with no confirmed tenancies | Empty state "No tenants to bill for {Month}" |
| Landlord with no properties | Empty state "No properties yet" + link |
| Month with no rent cycles | Empty state; the month control stays usable |
| A tenant left mid-month | They appear only if the server returns them for that month (tracker rule D1); no client-side filtering |
| Search matches a room but not a name | Server `q` already searches `room_number`/`title` |
| Filter combination yields nothing | "Nothing matches these filters" + Clear filters |
| Drawer open, tenant's claim is approved elsewhere | `GET /charge` on refetch returns no pending submission → the drawer shows the settled state (§8.2) instead of an approve button |
| Token expires mid-approval | `apiFetch`'s existing 401 handling applies; the toast carries the message and the drawer stays in its pending state |
| Very long tenant name | Tenant cell truncates with `truncate` + `max-w-[18ch]`; the drawer title wraps |
| 50+ tenants in a month | All rows render (D19); no virtualisation in this change (agent default A9) |
| Proof image is a PDF or a huge photo | `<img>` fails → `onError` swaps to the placeholder + "Open proof in a new tab"; no file is ever fetched with a token in the URL |

---

## 19. Testing and verification bar (D27)

| Check | Requirement |
| --- | --- |
| `bun run web:typecheck` | Clean |
| `bun run web:build` | Clean (route tree regenerates because the leaf's import changes, not its path) |
| `bun run web:test` | Green, including the two new files and the rewritten one |
| `bun run cf:api:typecheck` + `bun run cf:api:test` | Clean/green (**the tracker DTO changed**, §13.2) — run these even though the page is the deliverable |
| **New** `apps/web/test/payments-monitor-table.test.tsx` | §3's mapping and precedence (pending > rejected > status, all eight server states); `needsAttention` membership (due-today excluded, payment-issue included); `monitorMetrics` arithmetic on the mock's own numbers (12 / 48,000 / 32,000 / 3); the action per state (View / Review proof / Remind / —); the footer's `{n} tenants · {k} need attention`; skeleton rows while loading; the two empty states' copy; the table renders exactly the six headers |
| **New** `apps/web/test/payments-review-drawer.test.tsx` | Renders tenant/room/rent-month/status/amount/method/submitted/reference from a fixture charge; approve is **disabled** and the underpayment line shows when `amount < total_due`; approve calls `verifyLandlordSubmission` with the pending submission id; the approved state replaces the actions and the row query is invalidated; reject requires a non-empty reason and calls `rejectLandlordSubmission`; request-new-proof prefills the exact brief sentence; no-proof-image placeholder |
| Rewritten `apps/web/test/payments-tracker.test.tsx` | The new page's contracts: route wiring, the absence of "Record a payment"/"Add a charge"/billing rules on the page, filters in the URL, `getPaymentTracker` called with only `propertyId`/`month`/`search`, the drawer opening from a tenant name |
| Rewritten tracker expectations in `payments-shell.test.tsx` | Shell stays in `landlord/payments.tsx`, the leaf renders no `Protected`/`RoleShell`, deep link `/landlord/payments/record` still resolves |
| Manual walkthrough | 1440px and 390px against the local API: property + month switch, each status's row action, review drawer → approve (row + metrics + footer move), reject → Payment issue → composer, request new proof, tenant drawer timeline, offline payment, Export CSV, the four states, keyboard-only pass (Tab to a row action, Escape out of both drawers and the popover) |
| Not claimed | No visual-regression tooling, no screenshots, no load test — the repo has none |

---

## 20. Agent defaults (not asked; cheap to overturn)

1. **A1** — `formatPeso` (two decimals) for money, including the metrics; the reference's whole-peso
   rendering is deck styling.
2. **A2** — Property defaults to the landlord's **first accessible property** (the tracker's rule);
   no "All properties" option is added to this page.
3. **A3** — **Clear filters** keeps Property + Month (scope) and clears everything else.
4. **A4** — The metrics strip is **read-only** (not a filter).
5. **A5** — The Room column is the **room number only**; occupancy share is not in this table.
6. **A6** — The timeline renders the **20 newest events** with a "Show earlier activity" expander.
7. **A7** — Closing the review drawer returns to the table, **not** to the tenant drawer.
8. **A8** — The old in-app reminder endpoint is **not called** from this page (the message is the
   reminder); the endpoint stays for other surfaces.
9. **A9** — No virtualisation: 50+ rows render plainly (D19's all-rows rule).
10. **A10** — Search is debounced **300 ms** and sent as `q`; the input keeps focus while results
    update.
11. **A11** — The table keeps the tracker's `min-w-[720px]` (not 960px): six columns do not need the
    ten-column width.
12. **A12** — The approved state shows "Approved by you" rather than guessing a name (L2).
13. **A13** — `has_rejected_claim` is scoped to the **open rent charge** (§13.2), so a rejected
    utility claim never repaints a rent row.
14. **A14** — Toasts come from the page's single `useToasts()`; drawers receive callbacks, never their
    own toast host.

---

## 21. Out of scope (explicitly, per the request and the interview)

- **Billing settings** (grace period, late fee) on this page — D30 moved them to the property settings
  surface, which this spec does **not** build (§22).
- **Charts, aging buckets, collection-rate cards, extra dashboard cards, decorative sections** — the
  brief forbids them; the tracker's five money cards and its status legend are gone.
- **A prominent "Add payment" / "Record a payment" button** on the page — brief; offline recording
  lives in the tenant drawer.
- **Boarder-side changes** — `/boarder/payments` keeps its own ledger, claim form and proof upload.
- **New endpoints, migrations or tables** — D4/RES-4: exactly two additive DTO fields.
- **Pagination / virtualisation** — D19.
- **Deep-linkable drawers** — D6 (no `?panel=` params).
- **Editing or voiding a paid charge** from the drawer.
- **Bulk actions** (remind all, approve all) — not in the brief.
- **Admin or co-landlord-specific surfaces** — co-landlords inherit access via the existing property
  scoping, nothing more.

---

## 22. Limitations and follow-ups found while researching

| # | Item | Consequence / owner |
| --- | --- | --- |
| L1 | **The billing-rules editor now has no home** (D30 moved it off Payments, and this spec does not build the property-settings section). | `/landlord/payments` loses grace/late-fee configuration until that surface ships. `BillingRulesCard`, `getBillingSettings` and `updateBillingSettings` stay in the tree so the move is a re-mount, not a rewrite. **This is the highest-risk item in the change and should be sequenced with (or immediately after) it.** |
| L2 | A submission stores `verified_by` (id) but no reviewer name. | The timeline can only say "Approved by you" / "Approved" (A12). A `verified_by_name` join is a small future API addition. |
| L3 | No `rejected_at`; rejection reuses `verified_at`. | Timeline rejection events are timestamped from `verified_at` and labelled as the decision time. |
| L4 | `has_pending_claim` is charge-agnostic while `current_charge_id` is rent-specific. | Fixed here by `pending_claim_charge_id` (§13.2); the old field stays for compatibility. |
| L5 | `RecordPaymentModal` has no amount prefill. | "Log offline payment" preselects the tenant only. Prefilling the open charge would change that component's props — a small, separate change. |
| L6 | The approved reference shows whole pesos; the app renders centavos. | A1: app convention wins; changing `formatPeso` is a repo-wide decision, not this page's. |
| L7 | `apps/web/test/payments-tracker.test.tsx` currently encodes the tracker's 10 columns and legend. | It **must** be rewritten in the same change (D37), or `web:test` will fail on the deleted components — this is the most likely "forgotten file" of the implementation. |

---

## 23. Implementation checklist

1. `workers/api/src/repositories/payments/tracker.ts` — derive `pending_claim_charge_id` +
   `has_rejected_claim`; extend the DTO type; `apps/web/src/lib/types.ts` mirror.
2. `apps/web/src/lib/payments.ts` — §13.3 helpers + `formatDateTime`; prune the orphaned exports.
3. `apps/web/src/components/ui/Drawer.tsx`.
4. `components/payments/PaymentMonitorFilters.tsx` (+ URL (de)serialisation) and
   `PaymentMetricsStrip.tsx`.
5. `components/payments/PaymentMonitorTable.tsx` (six columns, actions, skeleton rows, footer).
6. `components/payments/ReviewPaymentDrawer.tsx` (review → approve / reject / request-proof → approved
   / rejected states).
7. `components/payments/TenantPaymentDrawer.tsx` (+ timeline from `buildTenantTimeline`).
8. `components/payments/MessageTenantModal.tsx`; move `AddChargeModal.tsx` out of the old page; wire
   `RecordPaymentModal`.
9. `components/payments/PaymentsMonitoringPage.tsx` — queries, panel union, invalidation, toasts;
   rewire `routes/landlord/payments/index.tsx`.
10. Delete §14.3's five files.
11. Tests: the two new files, the rewritten tracker test, the shell-test update, the API suite run.
12. Run §19's bar; walk 1440px + 390px; append an "Implemented" block to this spec's header with the
    real test counts and any deviation.

---

## 24. Acceptance criteria → where they are satisfied

| Request's criterion | Satisfied by |
| --- | --- |
| Landlord can select a property and month | §5.1 (both controls, both in the URL) |
| Landlord can monitor all tenant payment statuses | §3 (seven labels) + §7 (one row per tenant, all rows) |
| Rent charges exist before proof is submitted | Unchanged data model (charges are generated by the rent cycle; nothing on this page creates a payment before the tenant acts) + §4's helper line |
| Tenant payment proof can be reviewed from the table | §7.2 "Review proof" → §8 |
| Approving proof changes the tenant to Paid | §8.3 (verify route, immediate invalidation, approved state) |
| Rejection and request-new-proof flows work | §8.5, §8.6, §11.2–11.4 |
| The right-side drawer matches the reference | §8.2's field-by-field table against screenshot 2 |
| The existing HavenSpace visual system is unchanged | §15 (token-by-token guardrails), D34 (no subtitle) |
