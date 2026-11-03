# Spec — Payments tracker redesign (one row per boarder)

**Status:** **Implemented and verified locally (2026-10-13).** Phases 1–4 of §12 are in the tree; the
four checks in §10.1 are green and the browser sanity run in §12 passed. The implement log at the end
records exactly what ran. Not deployed anywhere — §9.3 still holds.
**Short name:** `payments-tracker-redesign`
**Date:** 2026-10-11
**Owner request (verbatim):** “major adjustment in payment layout”, with a pasted brief: _“Redesign the
Payments page for a boarding-house management system. Create a monthly boarder payment tracker showing
one row per boarder. Do not use profile photos.”_ … through to _“…matching the existing Haven Space
visual style: warm off-white background, rounded white cards, dark text, green primary actions, and
clear payment-status indicators.”_

The brief's own rules, kept here as the acceptance spine (§10.2 maps each one):

| #   | Brief rule                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------ |
| R1  | Payments are monthly and must be paid in full.                                                                                 |
| R2  | Do not support partial payments.                                                                                               |
| R3  | First due date comes from the move-in date (Oct 1 → Nov 1; Oct 15 → Nov 15).                                                   |
| R4  | After a payment, the next due date is one month after the **actual payment date** (due Oct 15, paid Oct 30 → next due Nov 30). |
| R5  | The landlord can manually edit the next due date.                                                                              |
| R6  | Grace period is configurable per property (1–3 days as the common options).                                                    |
| R7  | Late fees can be enabled or disabled per property.                                                                             |
| R8  | When enabled, the late fee is a configurable **fixed amount or percentage**.                                                   |
| R9  | The late fee is applied automatically after the grace period ends.                                                             |

---

## 0. Relationship to existing work

| Document                                                            | Relationship                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `payments-feature-spec.md`                                          | The feature this redesigns: it owns the charge ledger, the schedule generator, the claims flow and the billing run. This spec **supersedes its ledger UI (§7)** and **extends its billing rules (§8.2)**; its data model (charges, submissions, `generation_key`) is kept. |
| `payments-shell-two-pages-reverify-spec.md`                         | The layout-owns-the-shell fix. **Unaffected**, and still binding: the rebuilt page stays a leaf under `landlord/payments.tsx` and renders no `Protected`/`RoleShell`.                                                                                                      |
| `payments-page-regressions-spec.md`                                 | Same shell/migration fix, superseded. Reference only.                                                                                                                                                                                                                      |
| `admin-apple-ui-restructure-spec.md`                                | Owns the single-shell convention and the visual language this redesign must match (cream background, rounded white cards, `.chrome-*` materials, semantic tokens).                                                                                                         |
| `docs/qa/specs/qa-spec-audit.md` §10.6 / `docs/qa/specs/qa-spec.md` | Claim the payments page was verified single-shell and payments were deferred; both go stale again after this change and need a re-check (not owned here).                                                                                                                  |
| `landlord-property-detail-page-spec.md` R5                          | The layout-owns-the-shell rule the rebuilt page must keep honouring.                                                                                                                                                                                                       |

**Decisions inherited unchanged:** charges are the money record; `generation_key` keeps generation
idempotent; landlord writes are scoped by property access (co-landlords included); money is rounded to
centavos through `roundMoney`; “today” is `manilaToday()` (Asia/Manila), never UTC.

---

## 1. Interview decisions

**Seven rounds of `ask_user`, 33 questions.** Contradictions between an early and a late answer are
called out where they occurred (D4 vs D33, D9 vs D31) with the resolution.

| #   | Topic                                           | Decision                                                                                                                                                                                                                                      |
| --- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Month selector vs row-per-boarder               | **The month narrows the rows** (a boarder shows when they have a charge due or paid in that month) **and each row still shows the boarder's current state** (current due date, days, status).                                                 |
| D2  | The existing per-charge ledger                  | **Replaced entirely** on this page — the charge table, its aging card and the per-row verify/reject buttons leave the page.                                                                                                                   |
| D3  | Next due date                                   | **Persisted per tenancy as the source of truth**; the landlord's manual edit writes that field.                                                                                                                                               |
| D4  | Generated rows                                  | **Forward-only for settled history** — paid/cancelled rows are never rewritten. (Refined by D33, which allows shifting a _not-yet-due_ rent row.)                                                                                             |
| D5  | Spec depth                                      | **Full implementation plan**: migration SQL, endpoints and payloads, component-level plan, test list.                                                                                                                                         |
| D6  | What the row tracks                             | **Rent only.** Deposit, advance, utility and late-fee charges appear in the row's history, never as the row's cycle.                                                                                                                          |
| D7  | States that don't fit the five colours          | **Separate info chips beside the status** (`Awaiting verification`, `Cancelled`), so the five payment states stay unambiguous.                                                                                                                |
| D8  | “Due soon” window (not in the brief)            | **Keep the existing 3 days** (`DUE_SOON_DAYS`).                                                                                                                                                                                               |
| D9  | Where late-fee policy lives                     | **On the property's billing rules**, with the grace period existing independently of the fee toggle. (Refined by D31: one grace number, not two.)                                                                                             |
| D10 | Percentage base                                 | **The rent plus the other unpaid charges in that cycle.**                                                                                                                                                                                     |
| D11 | What one “Record payment” settles               | **The modal lists the cycle's open charges, all pre-selected and editable** — the landlord can deselect charges.                                                                                                                              |
| D12 | Payment methods                                 | **Extend the enum** to `cash \| bank_transfer \| gcash \| card \| other`, **plus a stored free-text label** used when “other” is chosen.                                                                                                      |
| D13 | Receipt/proof                                   | **Required for non-cash methods**; optional for cash.                                                                                                                                                                                         |
| D14 | “Send reminder” row action                      | **In-app notification to the boarder, once per cycle.**                                                                                                                                                                                       |
| D15 | The boarder claim (submit → verify/reject) flow | **Kept**, surfaced through a **“Needs review” filter** on the tracker rather than a row button.                                                                                                                                               |
| D16 | Payment history per boarder                     | **The row expands in place**, listing every charge type with dates, amounts, methods, references, notes, receipts and late fees.                                                                                                              |
| D17 | Automatic boarder notices                       | **All removed** from the billing job (no automatic due-soon, overdue or late-fee notifications to boarders).                                                                                                                                  |
| D18 | Action placement                                | **Record + Send reminder are row actions**; **Add a charge and Export CSV stay page-level**; the header keeps a page-level **Record a payment** button as well.                                                                               |
| D19 | Search/filter state                             | **In the URL and applied server-side** (shareable, reloadable).                                                                                                                                                                               |
| D20 | Existing tenancies                              | **Backfill `next_due_date` from the move-in day plus the tenancy's due day, ignoring the open charges** that happen to be generated.                                                                                                          |
| D21 | Move-in date source                             | **The tenancy's move-in/confirmation date** (what the schedule already uses), not the boarder profile's editable field.                                                                                                                       |
| D22 | Summary cards                                   | **Money amounts, and each card is a clickable filter** onto the table.                                                                                                                                                                        |
| D23 | “Room or bed number”                            | **The room number plus its occupancy share**, e.g. `Room 4 · 2/4` (there is no bed entity in the schema).                                                                                                                                     |
| D24 | Empty states                                    | **Distinguish the causes with different copy and CTAs**: no tenancies/charges yet vs a month or filter that matches nothing.                                                                                                                  |
| D25 | Accessibility                                   | **Text label + icon per status + a visible legend on the page** — never colour alone.                                                                                                                                                         |
| D26 | Migration reach                                 | **One additive migration, applied locally only.** The shared cloud database stays out of scope (it is currently 7 migrations behind — §9.3).                                                                                                  |
| D27 | “No partial payments”                           | **Every selected charge settles in full, and the API rejects an amount below the selected total** (`422 amount_below_selected_total`).                                                                                                        |
| D28 | Blast radius                                    | **The landlord page, the boarder payments page, and the other surfaces that show payment state** (§8). Note: **no property-detail Payments tab exists today** — the third surface is the landlord dashboard's alerts card + the Tenants page. |
| D29 | CSV shape                                       | **Tracker rows followed by a per-charge detail section in the same file.**                                                                                                                                                                    |
| D30 | Verification bar                                | **Four project checks + new API tests + a tracker component test.**                                                                                                                                                                           |
| D31 | Grace period _(refines D9)_                     | **One number**, governing both the status (“in grace”) and the late-fee timing.                                                                                                                                                               |
| D32 | Dashboard payment alerts                        | **Re-derived from the new statuses** so the dashboard and the tracker agree.                                                                                                                                                                  |
| D33 | The stale not-yet-due rent row _(refines D4)_   | **Shift it to the re-anchored date, keyed by `generation_key`**; settled rows stay untouched.                                                                                                                                                 |

---

## 2. Current state (read-only inspection, 2026-10-11)

### 2.1 What exists today

| Surface                | File                                                                                                                  | What it does                                                                                                                                                                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landlord payments page | `apps/web/src/routes/landlord/payments/index.tsx` (546 lines)                                                         | Property + month selectors, four summary tiles, an **Aging** card, a **per-charge** ledger table with Verify/Reject/Record/Cancel row actions, a Billing rules card (flat late fee + `late_fee_grace_days`), Export CSV, `Record a payment` link. |
| Record / add charge    | `apps/web/src/routes/landlord/payments/record.tsx` (386 lines)                                                        | Records a payment against one charge (method + reference + date + notes) and creates manual utility/other charges.                                                                                                                                |
| Boarder payments       | `apps/web/src/routes/boarder/payments/index.tsx`, `pay.tsx`                                                           | Boarder ledger + a claim form (method, reference, optional proof, notes) → `awaiting_verification`.                                                                                                                                               |
| API                    | `workers/api/src/routes/payments.ts` (811 lines)                                                                      | Boarder read/claim/proof; landlord ledger, report, CSV, tenancy billing, property billing settings, manual charges, charge edit/cancel, record, deposit resolution, verify/reject.                                                                |
| Repositories           | `workers/api/src/repositories/payments/{ledger,schedule,charges,submissions,billing-run,notify,reporting,helpers}.ts` | Reads, schedule generation, writes, the nightly run, notification inserts, pure date/money helpers.                                                                                                                                               |
| Dashboard              | `workers/api/src/repositories/landlord-dashboard.ts` via `buildPaymentAlerts`                                         | `payment_alerts: { due_soon, overdue }`, shown on `apps/web/src/routes/landlord/index.tsx` as “N due soon · N overdue”.                                                                                                                           |

### 2.2 Where today's behaviour differs from the brief

| Brief                                                           | Today                                                                                                                                                    | Gap                                                                                                     |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| One row per boarder                                             | One row per **charge**                                                                                                                                   | The page must be rebuilt around tenancies.                                                              |
| R4 next due = payment date + 1 month                            | Due dates are fixed to the move-in day and pre-generated 3 months ahead (`schedule.ts`)                                                                  | Needs the per-tenancy `next_due_date` + the shift rule (D33).                                           |
| R5 manual next-due edit                                         | No such field or endpoint                                                                                                                                | New column + endpoint.                                                                                  |
| R6/R7/R8 grace rule, late-fee toggle, percent                   | `properties.late_fee_amount` (flat, default 500) + `late_fee_grace_days` (default 3); a fee is applied whenever the amount is > 0                        | Needs `late_fee_enabled`, `late_fee_type`, `late_fee_percent`; grace becomes independent of the toggle. |
| R9 automatic after grace                                        | Already true (`billing-run.ts` `applyLateFees`)                                                                                                          | Keep, but gate on the toggle and compute percent.                                                       |
| Methods incl. card + custom                                     | `PAYMENT_METHODS = ['gcash','bank_transfer','cash']`, validated in `isPaymentMethod`                                                                     | Extend the enum + store the custom label.                                                               |
| Receipt required for non-cash                                   | Proof is **optional** on the boarder claim; there is no landlord-scoped upload                                                                           | New requirement + a landlord upload route.                                                              |
| One in-app notification **to the landlord** after grace         | The run notifies the **boarder** (due soon, overdue, late fee) — three types, once each                                                                  | Invert: no boarder notices, one landlord notice.                                                        |
| Row action “Send reminder”                                      | Nothing; reminders are automatic                                                                                                                         | New endpoint + once-per-cycle marker.                                                                   |
| Payment history per boarder                                     | No such view                                                                                                                                             | New expansion + endpoint.                                                                               |
| Five status colours + labels + icons                            | Four tones (`paid`, `due_soon`, `awaiting_verification`, `overdue`) on `StatusBadge`; no **due today**, no **in grace**, no dark red, no legend or icons | New tones/tokens + icons + legend.                                                                      |
| Summary cards: expected / paid / due today / in grace / overdue | Expected / Collected / Awaiting verification / Overdue + an Aging card                                                                                   | New card set (money, clickable).                                                                        |
| Filters + search incl. room, status, due date, overdue          | Property + month only                                                                                                                                    | URL-driven, server-side.                                                                                |
| Clean empty state explaining both causes                        | One empty state (“No charges for this month”)                                                                                                            | Two-cause copy + CTAs.                                                                                  |

### 2.3 Assets the plan reuses

- Pure, tested date/money helpers: `nextDueAfter`, `addMonthsClamped`, `addDays`, `daysBetween`, `daysOverdue`, `roundMoney`, `manilaToday`, `isDueSoon`, `effectiveStatus` (`payments/helpers.ts`).
- Idempotency via `payments.generation_key` + the partial unique index `idx_payments_generation_key`.
- `payment_submissions` as the immutable audit row for both boarder claims and landlord recordings.
- Token-based theming (`apps/web/src/styles/app.css`): `--color-{success,warning,error,info}-{tint,ink,border}`; `StatusBadge`'s tone map; `Icon` names `check`, `clock`, `banknotes`, `report`, `calendar`, `minus`, `plus`, `history`, `export` all already exist.
- Material/visual language from `RoleShell`, `Card`, `DataTable`, `PageHeader`, `Modal`, `Field`, `ToastStack`.

---

## 3. Target model

### 3.1 Concepts

- **Tenancy** = a confirmed `applications` row. It gains **`next_due_date`**, the single source of truth
  for when the next rent is due.
- **Rent cycle** = one `payments` row with `charge_type = 'rent'`, carrying `period_start`…`period_end`
  (the month it covers) and a `generation_key` of `rent:<applicationId>:<due_date>`.
- **Tracker row** = one tenancy, showing its current cycle (D6: rent only) plus derived state.
- **Derived tracker status** (never stored, computed from the due date + grace, like `effectiveStatus`
  today): `paid`, `due_today`, `due_soon`, `in_grace`, `overdue`, `upcoming`, `no_charge`.
- **Late fee** = a `payments` row with `charge_type = 'late_fee'` and key `late_fee:<chargeId>`, created
  only by the nightly run (R9), once per cycle (idempotent by key).

### 3.2 Date rules

| Rule                 | Definition                                                                                                                                                                                                                                                                                  | Worked example                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| First due date (R3)  | `nextDueAfter(move_in_date, day(move_in_date))` — the first occurrence of the move-in day **strictly after** the move-in date; never pro-rated                                                                                                                                              | Oct 1 → **Nov 1**; Oct 15 → **Nov 15**                     |
| After a payment (R4) | `next_due_date = addMonthsClamped(paid_date, 1)` — anchored to the **actual payment date**, day clamped to the target month                                                                                                                                                                 | Due Oct 15, paid Oct 30 → **Nov 30**; paid Jan 31 → Feb 28 |
| Manual edit (R5)     | The landlord writes `next_due_date` directly; the same reconciliation step as R4 runs                                                                                                                                                                                                       | Landlord moves Nov 30 → Dec 5                              |
| Grace (R6, D31)      | `properties.late_fee_grace_days` is **re-purposed as the single grace period** (column name kept, semantics documented; UI label “Grace period (days)”, presets 1/2/3 + custom). It governs the `in_grace` window **and** the late-fee trigger, and exists whether or not late fees are on. | Grace 3, due Nov 5 → `in_grace` Nov 6–8, `overdue` Nov 9   |
| Late fee (R9)        | Applied by the nightly run when `late_fee_enabled = 1` and `today > due + grace`                                                                                                                                                                                                            | Due Nov 5, grace 3 → fee from Nov 9                        |
| Percent base (D10)   | `SUM(amount)` of the rent charge **plus every open charge whose `due_date` falls inside that rent charge's `period_start`…`period_end`** for the same tenancy                                                                                                                               | Rent 6,500 + utilities 800 → 7,300 → 5% = **₫365**         |

### 3.3 Reconciliation of generated rows (D4 + D33)

The schedule generator pre-generates ~3 months of rent. When a payment re-anchors `next_due_date`, the
**next not-yet-due rent row is shifted** so a tenancy can never carry two open rent charges for one
cycle. Precisely:

1. Only rows with `charge_type = 'rent'`, `status = 'pending'` and `due_date > today` are eligible.
2. The earliest such row becomes the target of the shift: `due_date`, `period_start`, `period_end`,
   `description` (`Monthly rent — <Month Year>`) and `generation_key` are rewritten to the re-anchored
   date; the new key is `rent:<applicationId>:<newDue>`.
3. The shift is skipped when a row already exists with the new key (idempotent), and when the resulting
   date would not be > the settled cycle's `period_end`.
4. Rows that are `paid`, `cancelled`, or past-due (i.e. already `in_grace`/`overdue`) are **never**
   touched — that is the forward-only rule (D4).
5. Both the record endpoint and the manual next-due endpoint run this step **inside the same write path**
   as the `next_due_date` update, so the two can never drift.

### 3.4 Tracker status vocabulary

Order of precedence: `paid` → `overdue` → `in_grace` → `due_today` → `due_soon` → `upcoming` →
`no_charge`.

| Status      | Condition                                              | Tone (brief) | Label                | Icon        |
| ----------- | ------------------------------------------------------ | ------------ | -------------------- | ----------- |
| `paid`      | The cycle's rent charge is `paid`                      | Green        | `Paid`               | `check`     |
| `overdue`   | `today > due + grace`                                  | Dark red     | `Overdue · Nd`       | `report`    |
| `in_grace`  | `due < today ≤ due + grace`                            | Yellow       | `In grace · Nd left` | `clock`     |
| `due_today` | `today == due`                                         | Red          | `Due today`          | `banknotes` |
| `due_soon`  | `1 ≤ due − today ≤ 3`                                  | Yellow       | `Due in Nd`          | `clock`     |
| `upcoming`  | `due − today > 3`                                      | Gray         | `Upcoming · Nd`      | `calendar`  |
| `no_charge` | No open rent cycle (or the tenancy has no billing yet) | Gray         | `No active charge`   | `minus`     |

`upcoming` and `no_charge` are both gray, matching the brief's “Gray: No active charge or not
applicable”. The brief does not name a state for “due later than the due-soon window”, so `upcoming` is
introduced rather than leaving those rows coloured as if they were unremarkable **— see §11 Q1**.

Info chips (D7), shown beside the status and never replacing it:

| Chip                    | Condition                                                                 |
| ----------------------- | ------------------------------------------------------------------------- |
| `Awaiting verification` | A pending `payment_submissions` row exists for any charge in the cycle    |
| `Cancelled`             | The cycle's rent charge was cancelled                                     |
| `+N other charges`      | Open non-rent charges exist for the tenancy (utilities, deposit, advance) |

---

## 4. Schema

### 4.1 `workers/api/migrations/0022_payments_tracker.sql` (new, additive only)

```sql
-- 1. Per-tenancy billing anchor (spec `payments-tracker-redesign` D3).
ALTER TABLE applications ADD COLUMN next_due_date TEXT;
CREATE INDEX IF NOT EXISTS idx_applications_next_due ON applications(next_due_date);

-- 2. Late-fee policy (R7/R8): an enable flag, a type, and the percentage.
ALTER TABLE properties ADD COLUMN late_fee_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE properties ADD COLUMN late_fee_type TEXT NOT NULL DEFAULT 'fixed';   -- 'fixed' | 'percent'
ALTER TABLE properties ADD COLUMN late_fee_percent REAL NOT NULL DEFAULT 0;

-- 3. Custom payment method label (D12) on both the money row and its audit row.
ALTER TABLE payments ADD COLUMN payment_method_label TEXT;
ALTER TABLE payment_submissions ADD COLUMN payment_method_label TEXT;

-- 4. One landlord overdue notification per cycle (D17).
ALTER TABLE payments ADD COLUMN overdue_notified_at TEXT;
```

No column is dropped and no row is rewritten, so the migration is safe on populated tables. The
existing `late_fee_amount`, `late_fee_grace_days` and `due_soon_reminded_at` columns stay; `late_fee_grace_days`
now means “grace period”, and `due_soon_reminded_at` becomes unused (documented, not dropped).
`payments.reminder_sent_at` is re-purposed as the **manual** reminder marker (D14) — one per cycle.

### 4.2 Backfill (D20) — `scripts/tools/backfill-next-due-date.mjs` (new)

A one-off, idempotent script (not a migration), because clamping a due day to month length in SQL is
error-prone while the JS helpers are already tested:

1. Read every confirmed, non-deleted tenancy: `COALESCE(confirmed_at, created_at)` as the move-in date.
2. `next_due_date = nextDueAfter(move_in_date, day(move_in_date))`, then roll forward with
   `addMonthsClamped(..., 1)` until `>= today` — so the backfill never produces a due date in the past.
3. Skip rows that already have `next_due_date` (idempotent), ignoring open charge rows entirely (D20).
4. `--dry-run` prints the changes and writes nothing; the run is logged in §12 with its output.

---

## 5. API contract

Base: `/api/landlord/*`, all landlord-scoped through `requireLandlord` + `accessiblePropertyClause`.
Money values are numbers, dates are `YYYY-MM-DD`, all “today” maths uses `manilaToday()`.

| #   | Method + path                                                 | Status    | Purpose                                                                                                                               |
| --- | ------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `GET /api/landlord/payments/tracker`                          | new       | The tracker rows + summary.                                                                                                           |
| 2   | `GET /api/landlord/tenancies/:applicationId/payment-history`  | new       | One boarder's full history for the row expansion.                                                                                     |
| 3   | `PATCH /api/landlord/tenancies/:applicationId/next-due-date`  | new       | R5 manual edit.                                                                                                                       |
| 4   | `POST /api/landlord/charges/:chargeId/remind`                 | new       | D14 reminder, once per cycle.                                                                                                         |
| 5   | `POST /api/landlord/charges/:chargeId/proof`                  | new       | Landlord receipt upload (mirrors the boarder route).                                                                                  |
| 6   | `POST /api/landlord/charges/:chargeId/record`                 | changed   | Multi-charge settlement, method label, proof, next-due adjustment.                                                                    |
| 7   | `PATCH /api/landlord/properties/:propertyId/billing-settings` | changed   | `late_fee_enabled`, `late_fee_type`, `late_fee_percent` added.                                                                        |
| 8   | `GET /api/landlord/payments/export.csv`                       | changed   | Tracker section + charge-detail section (D29).                                                                                        |
| 9   | `GET /api/landlord/payments`, `/report`                       | retained  | No longer used by the page; kept for the dashboard/reporting paths and existing tests. Documented as legacy in the route doc comment. |
| 10  | Boarder routes (`/api/boarder/payments*`, verify/reject)      | unchanged | D15 keeps the claim flow.                                                                                                             |

### 5.1 `GET /api/landlord/payments/tracker` (1)

Query: `propertyId`, `month` (`YYYY-MM`), `status` (one of the §3.4 values), `roomId`,
`dueFrom` + `dueTo`, `overdue=1`, `needsReview=1`, `q` (boarder name, room number or reference).

```jsonc
{
  "success": true,
  "data": {
    "rows": [
      {
        "application_id": 12,
        "boarder_id": 8,
        "boarder_name": "Maria Reyes",
        "room_id": 4,
        "room_number": "4",
        "room_occupied": 2, // “Room 4 · 2/4” (D23)
        "room_capacity": 4,
        "move_in_date": "2026-10-01",
        "monthly_rent": 6500,
        "next_due_date": "2026-11-01",
        "days_remaining": 21, // null once overdue
        "days_overdue": null, // null until past grace
        "status": "upcoming",
        "status_label": "Upcoming · 21d",
        "current_charge_id": 91,
        "amount_due": 6500, // rent + its late fee, when one exists
        "last_payment": {
          "date": "2026-10-30",
          "amount": 6500,
          "method": "gcash",
          "method_label": null
        },
        "has_pending_claim": false,
        "other_open_charges": 1,
        "can_remind": true,
        "next_due_editable": true
      }
    ],
    "summary": {
      "expected": 45000,
      "paid": 32000,
      "due_today": 6500,
      "in_grace": 13000,
      "overdue": 6500
    },
    "counts": { "rows": 7, "needs_review": 2 }
  }
}
```

`expected` is the selected month's rent (its cycle), `paid` is what has been collected against those
cycles, and the remaining three are the amounts sitting in each state (D22). Rows are ordered by status
severity, then by next due date.

### 5.2 `POST /api/landlord/charges/:chargeId/record` (6) — changed

```jsonc
// request
{
  "charge_ids": [91, 95], // defaults to [chargeId]; every id must be open, same tenancy, same cycle (D11)
  "paid_date": "2026-10-30", // defaults to manilaToday()
  "payment_method": "gcash", // cash | bank_transfer | gcash | card | other (D12)
  "payment_method_label": null, // required when payment_method == "other"
  "reference_number": "GC-8891", // required unless cash
  "amount": 7300, // optional; must be >= the selected total (D27)
  "notes": "Paid in person",
  "proof_url": "https://…", // required for non-cash (D13)
  "next_due_date": "2026-11-30" // optional manual adjustment (R5); default = addMonthsClamped(paid_date, 1)
}
```

Behaviour: every selected charge is settled **in full** (one verified `payment_submissions` row per
charge, `status = 'verified'`, `verified_by` the landlord, carrying the method label and proof URL); then
`applications.next_due_date` is set and §3.3 runs; then the boarder gets the existing
`payment_recorded` notification. Errors: `400` (missing method / reference / proof for a non-cash
method / label missing for `other`), `422 amount_below_selected_total`, `409` (a selected charge is
already settled or belongs to another tenancy), `404`.

### 5.3 `PATCH …/next-due-date` (3)

`{ "next_due_date": "2026-12-05" }`. Validates ISO format; accepts a past date **only** with
`"confirm_past": true` (the client warns first). Runs §3.3 and returns the updated row shape.

### 5.4 `POST …/remind` (4)

Creates one `notifications` row for the boarder (`type: 'payment_reminder'`, metadata
`{ charge_id, amount, due_date }`) and stamps `payments.reminder_sent_at`. A second call for the same
charge returns `409 reminder_already_sent` (D14: once per cycle).

### 5.5 `POST …/proof` (5)

Multipart `proof`, mirroring the boarder route: JPEG/PNG/GIF/WebP, ≤ 2MB, UploadThing purpose
`payment-proof`, returns `{ proof_url }`. Used by the record modal for non-cash methods (D13).

### 5.6 Billing settings (7)

Adds `late_fee_enabled: 0|1`, `late_fee_type: 'fixed'|'percent'`, `late_fee_percent: number` (0–100) to
the existing PATCH and to `PropertyBillingSettings`. `late_fee_grace_days` keeps its column and becomes
the single grace period (D31).

### 5.7 CSV (8, D29)

```
# Tracker — <property> — <month>
Boarder,Room,Move-in,Monthly rent,Current due date,Days remaining/overdue,Last payment date,Method,Status
Maria Reyes,4 · 2/4,2026-10-01,6500.00,2026-11-01,21,2026-10-30,GCash,Upcoming

# Charges — same filters
Boarder,Charge,Due,Period,Amount,Late fee,Total,Status,Paid date,Method,Reference,Notes,Receipt
Maria Reyes,Monthly rent — November 2026,2026-11-01,2026-11-01…2026-11-30,6500.00,0.00,6500.00,pending,,,,
```

Quoting via the existing `csvEscape`; the same filters as the on-screen query are applied to both
sections.

---

## 6. Billing job (`workers/api/src/repositories/payments/billing-run.ts`)

Rewritten steps, in order (each idempotent):

1. **Extend schedules** — unchanged in shape, but the horizon is derived from each tenancy's
   `next_due_date`, so a re-anchored tenancy is never billed on its old day (D33).
2. **Apply late fees** (R9) — only when `late_fee_enabled = 1`, only for `overdue` charges, skipping
   `charge_type = 'late_fee'` rows, keyed `late_fee:<chargeId>`. Amount = fixed `late_fee_amount`, or
   `roundMoney(percentBase × late_fee_percent / 100)` where `percentBase` is the cycle base of §3.2.
3. **Mark overdue** — unchanged (`today > due + grace`).
4. **One landlord notification** (D17) — for each newly overdue charge with `overdue_notified_at IS NULL`
   and `today > due + grace`, insert a single `notifications` row for `payments.landlord_id`
   (`type: 'payment_overdue_landlord'`, metadata `{ charge_id, boarder_id, amount, due_date }`) and stamp
   `overdue_notified_at`. Never repeated, never daily.
5. **Remove** `emitDueSoonReminders`, `emitOverdueReminders` and the late-fee notice to boarders.
   `due_soon_reminded_at` is left in place but unused.

The codebase has **no email, SMS or WhatsApp transport** today — notifications are rows in the
`notifications` table rendered by `NotificationBell` — so the brief's “in-app only, no SMS/email/WhatsApp”
requirement is met by construction. This is asserted in the API tests rather than assumed.

The manual reminder (D14) is the only other sender, and it targets the boarder.

---

## 7. Frontend plan

### 7.1 Page composition — `apps/web/src/routes/landlord/payments/index.tsx` (rewritten)

Stays a leaf under `landlord/payments.tsx` — **no `Protected`, no `RoleShell`** (see §0).

1. **PageHeader** — title `Payments`, icon `payment`; actions: `Export CSV` (outline) and
   `Record a payment` (primary, page-level → opens the modal with a boarder picker) (D18).
2. **Filter card** — Property (existing selector), Month (existing `type="month"`), Room/bed, Payment
   status, Due date (`from`/`to` + presets Today / This week / This month), an `Overdue only` toggle, a
   search box (boarder, room, reference) and a `Needs review` toggle (D15/D19).
3. **Summary cards** (D22) — `Total expected`, `Paid`, `Due today`, `In grace period`, `Overdue`; each
   shows money with a sub-line count and is a button that writes the matching status filter into the URL.
4. **Tracker table** — one row per boarder (`DataTable`): boarder name · Room `4 · 2/4` · Move-in ·
   Monthly rent · Current due date · Days remaining / overdue · Last payment date · Method · Status badge
   (+ info chips) · Actions (`Record payment`, `Send reminder` when applicable, plus a `History`
   disclosure). The row is a `<button aria-expanded>` that expands into the history panel (D16).
5. **History panel** — charges for that tenancy (rent, deposit, advance, utilities, late fees) with
   date, amount, method (+ custom label), reference, notes, receipt link, and any pending claim with
   Verify/Reject when the row is in the review queue.
6. **Legend** — a small key restating the five states with icon + label + meaning (D25).
7. **Billing rules card** — Grace period (days, 1–3 presets + custom), `Enable late fees` toggle,
   fee type (Fixed ₫ / Percentage %), amount or percent, and a worked example line
   (“A ₫6,500 rent paid after 3 days would add ₫500”).
8. **Modals** — `Record payment` (five fields + receipt + next-due adjustment, D11/D13/R5),
   `Add a charge` (utility/other, page-level, D18), `Reject claim`.
9. **Empty states** (D24) — (a) no confirmed tenancies yet: “No boarders to bill yet” + CTA to
   Tenants/Applications; (b) rows exist but the month/filters match nothing: “Nothing matches these
   filters” + `Clear filters`, with the summary cards showing zero.

### 7.2 Files

| File                                            | Change                                                                                                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `routes/landlord/payments/index.tsx`            | Rewritten around the tracker.                                                                                                                                             |
| `routes/landlord/payments/record.tsx`           | Becomes a thin deep-link page that opens the shared `RecordPaymentModal` for its `chargeId` (existing links keep working); the add-charge form moves into the modal.      |
| `components/payments/PaymentTrackerTable.tsx`   | New — table + row expansion toggle.                                                                                                                                       |
| `components/payments/PaymentSummaryCards.tsx`   | New — five clickable money cards.                                                                                                                                         |
| `components/payments/PaymentFilters.tsx`        | New — URL-driven filter bar.                                                                                                                                              |
| `components/payments/RecordPaymentModal.tsx`    | New — shared by the row action and the page-level button.                                                                                                                 |
| `components/payments/BoarderPaymentHistory.tsx` | New — the expansion panel.                                                                                                                                                |
| `components/payments/BillingRulesCard.tsx`      | New — extracted and extended from the page's current card.                                                                                                                |
| `components/payments/StatusLegend.tsx`          | New — the accessibility key.                                                                                                                                              |
| `lib/payments.ts`                               | Add `trackerStatusMeta(row)` (label + tone + icon), `daysLabel`, `lateFeePreview`, `PAYMENT_METHODS` extended with `card` + `other`, `paymentMethodLabel(value, label)`.  |
| `lib/api/payments.ts`                           | Add `getPaymentTracker`, `getPaymentHistory`, `updateNextDueDate`, `sendPaymentReminder`, `uploadLandlordProof`; extend `recordLandlordPayment`, `updateBillingSettings`. |
| `lib/types.ts`                                  | Add `TrackerRow`, `TrackerSummary`, `TrackerQuery`, extend `PropertyBillingSettings`, `PaymentCharge` (`payment_method_label`).                                           |
| `components/ui/StatusBadge.tsx`                 | Add tones `due_today`, `in_grace`, `overdue_severe`, `upcoming`, `no_charge`.                                                                                             |
| `styles/app.css`                                | Add a dark-red semantic triple `--color-critical-{tint,ink,border}` for `overdue_severe` (`error-ink` `#b91c1c` is the existing red and stays the `due_today` red).       |
| `routes/landlord/payments/index.tsx` (nav)      | No change — `LANDLORD_NAV` already has `Payments`.                                                                                                                        |

### 7.3 Visual and accessibility rules

- Card/table language from `admin-apple-ui-restructure`: cream page, rounded white cards, `PageHeader`
  for the title, semantic tokens only (no raw hex in components).
- **Never colour alone**: every status renders an icon + text label, and the legend is visible on the
  page (D25). Chips carry text, not just a dot.
- Status text always includes the timing (“Overdue · 4d”, “In grace · 2d left”, “Due in 3d”), so the
  state is readable without the colour (brief's “Days remaining or days overdue”).
- The row expansion uses `aria-expanded` / `aria-controls`; the clickable summary cards are `<button>`
  elements with `aria-pressed` reflecting the active filter.
- Numbers use `formatPeso`; dates use `formatPaymentDate`.

---

## 8. Blast radius and non-goals

**In scope (D28)**

| Surface                                                             | Change                                                                                                                                               |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landlord Payments page                                              | The redesign above.                                                                                                                                  |
| `routes/landlord/payments/record.tsx`                               | Retargeted to the shared modal.                                                                                                                      |
| Boarder payments page (`boarder/payments/index.tsx`, `pay.tsx`)     | Adopt the new status vocabulary (including `due_today` / `in_grace`), the extended method list and custom label. The claim flow itself is unchanged. |
| Landlord dashboard (`landlord/index.tsx` + `landlord-dashboard.ts`) | Payment alerts re-derived from the tracker states (D32): “N due today · N in grace · N overdue”, linking to the tracker pre-filtered.                |
| CSV export                                                          | Two sections (D29).                                                                                                                                  |
| Billing job                                                         | §6.                                                                                                                                                  |

**Explicitly not in scope**

- **No `Protected`/`RoleShell` in any leaf** — the earlier shell-defect fix stays untouched (§0).
- **No bed entity** — “bed number” is the room number plus occupancy share (D23).
- **No property-detail Payments tab** — it does not exist today, so nothing is built for it here.
- **Editing the tenancy's move-in date** — the tracker reads the tenancy's confirmation/move-in date
  (D21) and offers no editor for it; the Tenants page keeps editing the boarder _profile_ field, which
  does **not** feed billing (§11 Q3).
- **No email/SMS/WhatsApp, no scheduled/repeat reminders** beyond §5.4 and §6.
- **No pagination** in v1 (see §11 Q4).
- **Remote/staging database work** — D26 keeps this pass local (§9.3).
- **No changes** to deposits/advance resolution, the claims flow's semantics, or the admin surfaces.

---

## 9. Data, migration and environment

### 9.1 Local runbook

```bash
bun run --cwd workers/api migrate:local                    # applies 0022
bun scripts/tools/backfill-next-due-date.mjs --dry-run     # inspect
bun scripts/tools/backfill-next-due-date.mjs               # idempotent apply
```

Then verify: `applications.next_due_date` is populated for every confirmed tenancy and is not in the
past; `properties.late_fee_enabled` defaults to 1 with `late_fee_type = 'fixed'`.

### 9.2 Compatibility

- 0022 is additive; the API code depends on the new columns, so the migration must be applied **before**
  the API is deployed anywhere. A stale database still surfaces as the existing
  `503 database_schema_stale` response.
- Old clients hitting `POST …/record` without `charge_ids` keep working (defaults to `[chargeId]`).

### 9.3 The shared cloud database (recorded, not fixed)

The shared D1 `haven-space` (`bc45d25b-…`) is at migration `0014` — `0015`–`0021` are unapplied and its
migration ledger predates a renumbering — and the deployed API answers `/api/landlord/payments` with
`501 FEATURE_DEFERRED`. So this redesign will not be visible on any deployed environment until that gap
is closed. Out of scope by D26; recorded here so a green local build is not mistaken for a shipped one.

---

## 10. Verification and acceptance

### 10.1 Checks (D30)

```bash
bun run cf:api:typecheck
bun run cf:api:test          # + workers/api/test/payments-tracker.test.ts (new)
bun run web:typecheck
bun run web:test             # + apps/web/test/payments-tracker.test.tsx (new)
```

New API coverage: first due date from the move-in date (R3 cases, both examples); re-anchor on payment
(R4 example, plus a month-end clamp); manual next-due edit; the §3.3 shift leaves settled rows alone and
never doubles a cycle; `amount_below_selected_total` (D27); percent base includes the cycle's other open
charges (D10); a fee is skipped when disabled (R7) and applied once when enabled (R9); exactly one
landlord notification across two consecutive runs (D17); the reminder is once per cycle (D14); the
custom method label round-trips (D12); a non-cash method without a receipt is rejected (D13); the CSV
contains both sections (D29).

New web coverage: one row per boarder with every column from the brief; status renders label **and**
icon (not colour alone); the legend is present; a clickable card writes the status filter; both empty
states; the row expansion lists history; and the page still renders a single shell (the existing
`route-shell-ownership` guard must stay green).

### 10.2 Acceptance criteria

1. R1/R2 — no partial amounts anywhere: every selected charge settles in full and a lower amount is
   rejected.
2. R3 — move-in Oct 1 → first due Nov 1; move-in Oct 15 → first due Nov 15.
3. R4 — due Oct 15, paid Oct 30 → next due Nov 30.
4. R5 — the landlord can edit the next due date from the row, and the change persists and reconciles the
   not-yet-due rent row.
5. R6 — grace period configurable per property (1–3 presets plus custom), governing the `in_grace`
   window.
6. R7 — late fees can be switched off per property, and nothing is added when they are off.
7. R8 — a late fee can be a fixed amount or a percentage of the cycle base.
8. R9 — the fee appears automatically after the grace period without any manual action.
9. One row per boarder, with name, room/bed, move-in date, monthly rent, current due date, days
   remaining/overdue, last payment date and method, status, `Record payment` and `Send reminder`.
10. No profile photos anywhere in the tracker.
11. The five summary cards exist and each filters the table.
12. Search plus property / room / status / due-date / overdue filters work from the URL.
13. Recording a payment captures date, full amount, method (incl. card and a custom label), reference,
    notes, receipt and the next-due adjustment.
14. Exactly one in-app overdue notification reaches the landlord after grace; no SMS/email/WhatsApp and no
    repeats.
15. Each boarder's history expands in the row and shows every charge with receipts and late fees.
16. Property selector, month selector, billing rules, Export CSV, Add a charge and Record a payment all
    still work.
17. The empty state explains “no active charges” and “nothing matches the filters” distinctly.
18. The page matches the existing visual language and never renders two shells.

---

## 11. Open questions and risks

| #   | Risk / question                                                                                                                               | Proposed handling                                                                                                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | The brief never names a colour for “due later than the due-soon window”, but every row must render something.                                 | `upcoming` (gray, `calendar` icon, “Upcoming · Nd”). Confirm with the owner at implementation review; the alternative is to reuse gray `No active charge`, which would read as “nothing owed”. |
| Q2  | Reusing `properties.late_fee_grace_days` as “grace period” keeps the schema minimal but leaves a misleading column name.                      | Document the semantics in the migration comment; a rename (new `grace_period_days` + backfill) is the cleaner option if the owner prefers explicit naming.                                     |
| Q3  | Two move-in dates exist (`boarder_profiles.move_in_date`, editable on Tenants) and the landlord may expect the tracker's date to be editable. | D21 uses the tenancy date. Flag the profile field as non-billing in the UI copy; a tenancy move-in editor is a follow-up.                                                                      |
| Q4  | Server-side filtering with no pagination will get slow for very large portfolios.                                                             | Fine for the target scale (tens of boarders). Add `limit`/cursor when a landlord exceeds ~200 rows.                                                                                            |
| Q5  | Shifting a generated row rewrites `generation_key`; a bug there could re-generate a duplicate month.                                          | Shift inside the same write path as `next_due_date`, guarded by `NOT EXISTS` on the new key, covered by the §10.1 test that a cycle never has two open rent rows.                              |
| Q6  | Percent late fees computed on “other unpaid charges in the cycle” can produce a fee larger than the rent itself if utilities are large.       | Show the computed amount in the billing-rules preview and in the toast when the fee is created; consider a cap (the brief allows one, it does not require it).                                 |
| Q7  | Removing the boarder's automatic reminders changes an existing behaviour the boarder page currently relies on for “due soon” context.         | The boarder page keeps showing due-soon/in-grace states; only the automatic notifications stop (D17). Called out in the boarder-page test.                                                     |
| Q8  | The shared database is 7 migrations behind, so nothing here is verifiable on a deployed environment.                                          | Out of scope (D26), recorded in §9.3 so a green local build is not read as “shipped”.                                                                                                          |
| Q9  | The chosen verification bar has no backfill test.                                                                                             | The script ships with `--dry-run` and its output is recorded in the implement log; adding a seeded backfill test is the recommended follow-up if the script is ever re-run in anger.           |

---

## 12. Implementation phases and log

**Phases** (each ends with the four checks green):

1. **Model** — migration 0022, the backfill script, repository changes (`helpers`, `charges`, `ledger` →
   tracker query, `schedule` horizon, `billing-run`), API endpoints 1–8, API tests.
2. **Page** — the tracker table, cards, filters, record modal, history expansion, legend, billing-rules
   card, empty states, tokens/tone additions, web tests.
3. **Blast radius** — boarder page vocabulary + methods, dashboard alerts, CSV sections.
4. **Clean-up** — legacy doc comments, the retired boarder notifications, `due_soon_reminded_at`
   documented as unused.

**Implement log** — run 2026-10-13 on `feat/apple-ui-restructure-qa-hardening`, local D1.

- (x) 0022 applied locally — local D1's migration ledger ends at `0022_payments_tracker.sql` (22 rows).
- (x) Backfill — 3 confirmed tenancies, **0 without** a `next_due_date`, none in the past.
- (x) `cf:api:typecheck` — clean. `cf:api:test` — **332 pass / 0 fail** (30 files), including the 14
  tracker cases in `test/payments-tracker.test.ts`.
- (x) `web:typecheck` — clean. `web:test` — **294 pass / 0 fail** (28 files), including
  `test/payments-tracker.test.tsx` (one row per boarder, label + icon, legend, clickable card filter,
  both empty states, the history expansion) and `test/landlord-dashboard.test.tsx`.
- (x) Phase 2 browser sanity — real Chrome over CDP against `web:dev` + the local API, signed in as
  `lina.santos@haven.demo`: `/landlord/payments` renders the filter card, the five money cards, the
  table (`QA Boarder · Room 1 · 0/1 · ₱3,500.00 · Oct 24, 2026 · No Active Charge`) and the status key
  with **one sidebar and one topbar**; the `History` disclosure expands into the history panel and
  next-due editor; no `Internal server error`, no `NaN`.
- (x) Phase 3 surfaces checked — the dashboard's Payment alerts card now counts `due_today + in_grace +
overdue` and reads `0 due today · 0 in grace · 0 overdue` in the browser (it previously formed `NaN`:
  the card was written against counts the API did not send, and `web:typecheck` caught the type
  mismatch). The boarder page derives `due_today` / `in_grace` from the charge's due date, so its badge
  agrees with the tracker instead of reading “Unpaid”.
- Fix found by this pass: the “Room or bed” cell prefixed the seed's own room name, rendering
  `Room Room 1`; `roomOrBedLabel` now adds the word only when it is missing.
- Still open (unchanged by this pass): §9.3 (the shared cloud D1 is migrations behind, so nothing here
  is visible on a deployed environment), and the CSV's `#` section headers are a spreadsheet-friendly
  deviation from a header-only file.
