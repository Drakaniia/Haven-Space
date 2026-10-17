# Spec — Payments feature (rent ledger, manual verification, no gateway)

**Status:** **Shipped** (same session, 2026-10-10). Migration `0021_payments.sql`, the
`repositories/payments/*` layer, the boarder + landlord routes, the four web screens, the nightly
billing job and the doc reconciliation in §10 are all implemented. Verified: `cf:api:typecheck` clean,
`cf:api:test` **295 pass / 0 fail** (20 new payments tests), `web:typecheck` clean, `web:test` **257
pass / 0 fail** (7 new), `bun run web:build` green. Deviations from this plan are recorded in
§14 “As shipped”.
**Short name:** `payments-feature`
**Date:** 2026-10-10
**Owner request (verbatim):**

> help me give idea in the payments features

The request is an **idea + build-plan** request, not an implementation request. §3 is the idea catalog
(all candidates, including the ones deliberately _not_ chosen, so nothing is lost); §4–§12 specify the
selected subset in implementation detail.

**Relationship to existing work:**

- `docs/qa/qa-spec.md` (S30) and `docs/qa/qa-spec-audit.md` assert payments return a graceful "coming
  soon" because no `/api/payments/*` route is mounted, and explicitly note that **no `501
FEATURE_DEFERRED` path exists anywhere in the Worker** (their finding F2). That is accurate today and
  this spec is what falsifies it.
- `messages-feature-review-spec.md` is the template for this document (decision table → verified current
  state → build plan → verification bar). It also set the precedent that a "deferred" flag in
  `docs/` is a claim to re-verify, not a fact.
- `docs/MANUAL.md` line 116 and `docs/specs/google-oauth.md` line 325 both state payments are
  unimplemented platform-wide — both need updating when this ships (D31).
- `docs/specs/schema.md` §Payments describes a PHP-era `payments` design; migration
  `0011_tenancy_leave_requests.sql` is the real one. The two have drifted and must be reconciled.
- `admin-apple-ui-restructure-spec.md` shipped the shared `PlaceholderPage`/`EmptyState` primitives the
  four payment stubs currently use.
- `landlord-rooms-grid-spec.md` / `landlord-property-detail-page-spec.md` own the landlord
  property→rooms navigation this feature hangs a Payments tab off.

---

## 1. Interview decisions

Collected in **seven rounds** of `ask_user`. Rows marked **(agent default)** were left open by the
interview and are restated in §12.

### 1.1 Framing (round 1)

| #   | Topic               | Decision                                                                                                                                                      |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Deliverable         | **Ideas + full build plan, spec only.** No code this pass.                                                                                                    |
| D2  | Core payment model  | **Manual tracking. No payment gateway, no in-app money movement.** GCash / bank transfer / cash are recorded, not processed.                                  |
| D3  | Billable line items | **All six:** monthly rent, security deposit, advance payment, utilities (electricity/water/internet), late fees, ad-hoc fees (maintenance, parking, damages). |

### 1.2 Ledger mechanics (round 2)

| #   | Topic                   | Decision                                                                                                                                                                          |
| --- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D4  | Charge origin           | **Auto-generate a schedule from the tenancy** on confirmation; the landlord may edit amounts afterwards.                                                                          |
| D5  | Who records             | **Boarder submits → landlord verifies.** Boarder supplies method + reference (+ optional receipt image); status sits in a pending-verification state until the landlord confirms. |
| D6  | Partials / overpayments | **Full amount only.** A payment must equal its charge exactly; a split is modelled as two charges. No credit ledger, no allocations table.                                        |
| D7  | Ledger scope            | **Per property for the landlord** (all boarders of that property, plus per-boarder detail); **own-only for the boarder**.                                                         |

### 1.3 Overdue, utilities, proof, deposits (round 3)

| #   | Topic                           | Decision                                                                                                                                                                |
| --- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D8  | Overdue + late fees + reminders | **Fully automatic.** Overdue is derived from `due_date` + grace; a late fee is applied automatically after the grace period; reminders are emitted automatically (D25). |
| D9  | Utilities                       | **Landlord posts a utility charge manually** (never auto-generated — the amount is only known when the bill arrives), which notifies the boarder.                       |
| D10 | Proof of payment                | **Reference number required, receipt image optional.**                                                                                                                  |
| D11 | Deposit at tenancy end          | **Manual refund/forfeit** recorded by the landlord with a reason; the final statement reflects it.                                                                      |

### 1.4 Scope boundaries (round 4)

| #   | Topic                          | Decision                                                                                                                                                                                                                                                        |
| --- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D12 | Pre-tenancy payments           | **None.** Confirm Booking is unchanged (it still just records `payment_method`); deposit/advance become the first **auto-generated charges once the tenancy exists**.                                                                                           |
| D13 | Backfill of existing tenancies | **Start from the next billing cycle.** No historical arrears for tenancies confirmed before this ships.                                                                                                                                                         |
| D14 | Admin role                     | **None.** Payments are a private landlord↔boarder relationship: no admin section, no aggregate stats, no content access.                                                                                                                                        |
| D15 | Reporting                      | **All five:** aging/overdue report, per-month collection summary, **CSV export**, **printable receipt + monthly statement**, and **wiring the real dashboard numbers** (the hard-coded `payment_alerts` 0/0 and the room-price-derived "Monthly revenue" card). |

### 1.5 Billing rules (round 5)

| #   | Topic            | Decision                                                                                                       |
| --- | ---------------- | -------------------------------------------------------------------------------------------------------------- |
| D16 | Due day          | **Derived from the tenancy's move-in day-of-month** (per tenancy, not per property, not a fixed platform day). |
| D17 | Late fee         | **Per-property flat fee after the grace period** (not per-day, not per-tenancy).                               |
| D18 | Reminders        | **In-app bell only** (the repo wires no email/push), **3 days before due + once on overdue**.                  |
| D19 | Grace period     | **3 days** after the due date before a charge is overdue and a late fee applies.                               |
| D20 | Late-fee default | **₱500 default, editable per property, may be set to `0`** (0 = never charge a late fee).                      |

### 1.6 Architecture, screens, verification (round 6)

| #   | Topic                   | Decision                                                                                                                                                                                                                                         |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D21 | Data model              | **Extend `payments` + add a `payment_submissions` table.** The charge stays on `payments`; each boarder submission is its own audited row (method, reference, proof URL, submitted_by, decision, verified_by, reason).                           |
| D22 | `/boarder/payments/pay` | Becomes a **"Submit a payment" flow for one specific charge**, deep-linked from a charge row.                                                                                                                                                    |
| D23 | Gateway future-proofing | **Strictly manual — keep it simple.** No provider-agnostic abstraction, no `payment_intents`; accept a migration later if a gateway is ever added.                                                                                               |
| D24 | Verification bar        | **All five:** API tests (schedule, verification, late fees, authorization), web tests (ledger + submit flow), manual two-account walkthrough (mobile + desktop), fix the stale "payments deferred" docs, and the full project check suite green. |
| D25 | Out of scope            | **All six:** online gateway/e-wallet checkout, platform fees/revenue cut, automated bank reconciliation, formal receipts/BIR compliance, multi-currency, dispute/chargeback workflow.                                                            |

### 1.7 Date & amount edges (round 7)

| #   | Topic                   | Decision                                                                                                                                                                                                         |
| --- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D26 | Month-end due dates     | **Clamp to the last day of shorter months.** Move-in on the 31st ⇒ due Feb 28, Apr 30, …                                                                                                                         |
| D27 | First billing month     | **First full charge lands on the next due date.** Move-in on the 20th ⇒ nothing due until the 20th of the following month. No pro-rating.                                                                        |
| D28 | Late-fee default        | ₱500 flat, per property, editable, `0` disables it (restated from D20).                                                                                                                                          |
| D29 | Landlord-side recording | **Yes — the landlord can record a payment on the boarder's behalf and it auto-verifies** (cash handed over in person). The existing "Record a payment" stub becomes real and is labelled "recorded by landlord". |

**Resulting status lifecycle:**

```
pending ──(boarder submits)──► awaiting_verification ──(landlord verifies)──► paid
   │                                    │
   │◄────────(landlord rejects)─────────┘
   │
   ├─(due_date + 3d passes)──► overdue ──(verified/recorded)──► paid
   └─(charge cancelled by landlord)──► cancelled
```

---

## 2. Current state (verified 2026-10-10, read-only)

### 2.1 What exists

| Area           | Reality                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ----------- |
| Web routes     | Four stubs: `apps/web/src/routes/boarder/payments/index.tsx` (EmptyState "Payments coming soon"), `boarder/payments/pay.tsx` (EmptyState "Payments coming soon"), `landlord/payments/index.tsx` and `landlord/payments/record.tsx` (both `PlaceholderPage`).                                                                                                                                                             |
| Nav            | `apps/web/src/lib/nav.ts` already exposes both entries (`{ to: '/boarder/payments', … }` line 32, `{ to: '/landlord/payments', … }` line 74) — no nav change needed.                                                                                                                                                                                                                                                     |
| API            | **No payments route.** `workers/api/src/index.ts` mounts system/auth/account/rooms/properties/boarder/application/landlord/admin/notification/message/tenancy/announcement/ai — there is no `routes/payments.ts` and `routes/landlord/index.ts` mounts only listings, properties, rooms, boarders, dashboard, invitations, verification. `/api/payments/*` therefore 404s today.                                         |
| Table          | `payments` created by migration **`0011_tenancy_leave_requests.sql`** (line 56): `id, boarder_id, landlord_id, room_id, property_id, amount REAL, late_fee REAL DEFAULT 0, due_date TEXT, paid_date TEXT, status TEXT DEFAULT 'pending', payment_method TEXT, reference_number TEXT, notes TEXT, reminder_sent_at TEXT, created_at, updated_at`. Indexes: `(landlord_id, status)`, `(boarder_id, status)`, `(due_date)`. |
| Booking        | `applications.payment_method` + `confirmed_at` are set by `confirmApplicationBooking()` (`repositories/applications.ts:290`); the route (`routes/applications.ts:261`) requires any non-empty `payment_method` string and does not validate it against the UI's `gcash                                                                                                                                                   | bank_transfer | cash` list. |
| Money display  | `apps/web/src/routes/landlord/index.tsx` renders a "Monthly revenue" card from `roomStats.monthly_revenue` (sum of **occupied rooms' price**), and a "Payment alerts" card from `payment_alerts.due_soon + overdue`.                                                                                                                                                                                                     |
| Tenancy view   | `repositories/tenancy.ts` `formatTenancy()` returns `tenancy_start_date` from `apps.created_at`, `monthly_rent` from `rooms.price`, `deposit` from `rooms.deposit`, and exposes `property_electricity_cost` / `property_water_cost` / `property_internet_cost` — **all hard-coded to `0`**. There is no utility-cost storage.                                                                                            |
| Uploads        | Server-side only: `workers/api/src/lib/uploadthing.ts` (`UTApi`, env `UPLOADTHING_TOKEN`, optional test bindings `UPLOADTHING_UPLOAD_FILES` / `UPLOADTHING_DELETE_FILES`). The avatar route (`routes/account.ts:199`) is the reference pattern: `formData()`, ≤2 MB, jpeg/png/gif/webp, then `uploadFilesToUploadThing` → `ufsUrl`.                                                                                      |
| Tests          | `workers/api/test/*.test.ts` use `bun:test` + `bun:sqlite` with a hand-rolled D1 adapter that runs every non-seed migration from `workers/api/migrations/` (`test/tenancy.test.ts:7-40`). Web tests are `bun test` with a happy-dom preload (`apps/web/test/setup.ts`).                                                                                                                                                  |
| Scheduled work | `workers/api/wrangler.jsonc` has **no `triggers`/`crons`** and the Worker exports only the Hono `app` — there is currently no place for a nightly job to run.                                                                                                                                                                                                                                                            |

### 2.2 Findings that constrain the build

| #       | Finding                                                                                                                                                                                                    | Consequence                                                                                                                                                                                                                                                        |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **F1**  | `payments` has **no link to the tenancy/application** (`application_id`), only to boarder/landlord/room/property.                                                                                          | D4 ("auto-generate from the tenancy") is not expressible against the current schema — a migration must add the tenancy link, or schedule generation keys off `(boarder_id, room_id)` and silently breaks when a boarder moves rooms. **High risk, must be fixed.** |
| **F2**  | `properties.advance` is free-text (`TEXT NOT NULL DEFAULT 'None'`, values like `'2 months'`; see `0015_seed_sample_listings.sql`).                                                                         | D3 includes the advance payment as a billable item but the amount **cannot be computed**. An explicit amount must be captured (see §12 Q1).                                                                                                                        |
| **F3**  | Floor-and-ceiling mismatch: `platform_settings` ships `platform_fee_percent = '5.00'` while D25 forbids platform fees.                                                                                     | Either the setting becomes documented dead data, or it is removed/ignored explicitly so a future reader does not implement a cut. Flag in the spec, do not silently use it.                                                                                        |
| **F4**  | `notifications.roleVisibleTypes()` (`repositories/notifications.ts:49`) is a **per-role allow-list**.                                                                                                      | New payment notification types are invisible in the bell unless registered there. Boarder list is only `['application_accepted','announcement','message']`.                                                                                                        |
| **F5**  | `formatLandlordBoarder()` (`repositories/landlord-boarders.ts:110`) **hard-codes** `payment_status: 'paid'`, `payment_due_day: 15`, `last_payment_date: null`.                                             | Every landlord boarder row currently lies about payment state. Must be replaced with real ledger values (D15, D16).                                                                                                                                                |
| **F6**  | `getLandlordDashboardStats()` (`repositories/landlord-dashboard.ts:106`) returns `payment_alerts: { due_soon: 0, overdue: 0 }` as literals, and defines "revenue" as occupied-room price, not collections. | D15 requires both to become real queries over `payments`.                                                                                                                                                                                                          |
| **F7**  | Automated reminders/late fees (D8) need a schedule, but **no cron trigger exists**.                                                                                                                        | The build must add `"triggers": { "crons": [...] }` to `wrangler.jsonc` and a `scheduled` export alongside the Hono app, _or_ fall back to lazy on-read evaluation + no reminders. See §8.2 — this is the single largest infra change in the spec.                 |
| **F8**  | `amount` / `late_fee` are SQLite `REAL` (IEEE-754 floats).                                                                                                                                                 | Money comparisons ("paid in full", "balance") can drift. Mitigation in §9 R3.                                                                                                                                                                                      |
| **F9**  | There is no tenancy "move-in date" the user picked — the app treats `applications.created_at` as the tenancy start (`move_in_date` in boarders, `tenancy_start_date` in tenancy).                          | D16's due day derives from a field that also carries the original _application_ timestamp; `confirmed_at` is the more honest anchor. Flagged as §12 Q2.                                                                                                            |
| **F10** | `payment_method` at booking is free-form server-side.                                                                                                                                                      | The ledger should adopt one shared method vocabulary (`gcash`, `bank_transfer`, `cash`) rather than repeating the booking route's weaker check.                                                                                                                    |
| **F11** | `apps/web/src/lib/room-drafts.ts` enforces only a **photo count** (`MAX_ROOM_PHOTOS`), and message images mirror it; the avatar route is the only place with size + MIME checks.                           | The receipt upload must copy the **avatar** limits (≤2 MB, image MIME allow-list), not the photo-count precedent.                                                                                                                                                  |
| **F12** | Stale docs: `docs/MANUAL.md:116`, `docs/qa/qa-spec.md` (S30 + §"Deferred features"), `docs/qa/qa-spec-audit.md`, `docs/specs/schema.md` §Payments, `docs/specs/google-oauth.md:325`.                       | D24 requires reconciling all of them after the build.                                                                                                                                                                                                              |

---

## 3. Idea catalog (the requested "ideas")

Ranked by value/effort. **Selected** = decided in §1 and specified in §4–§9. **Deferred** = deliberately
not built now but recorded so the idea is not lost.

| #   | Idea                                                                                  | Value                                                       | Effort                                        | Verdict                                                                                         |
| --- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| I1  | Auto-generated rent schedule from the tenancy (due dates, deposit, advance)           | High — removes the landlord's monthly mental arithmetic     | M                                             | **Selected** (D4, D27)                                                                          |
| I2  | Boarder submits payment with reference + optional receipt; landlord verifies          | High — closes the "did they pay?" loop with an audit trail  | M                                             | **Selected** (D5, D10, D21)                                                                     |
| I3  | Per-property landlord ledger with aging (due soon / overdue / paid)                   | High — this is the actual product                           | M                                             | **Selected** (D7, D15)                                                                          |
| I4  | Automatic overdue detection, grace period, flat late fee                              | High — enforces the house rules already written in listings | S (once I7 exists)                            | **Selected** (D8, D17, D19, D20)                                                                |
| I5  | In-app reminders (3 days before, once overdue)                                        | High — cheap, reuses the bell                               | S                                             | **Selected** (D18)                                                                              |
| I6  | Landlord records cash/GCash in hand on the boarder's behalf                           | Medium-high — real boarding houses collect cash             | S                                             | **Selected** (D29)                                                                              |
| I7  | Nightly billing job (generate charges, flag overdue, apply late fees, send reminders) | Required plumbing for I1/I4/I5                              | M                                             | **Selected** (D8, §8.2)                                                                         |
| I8  | Landlord-posted utility charges (electricity/water/internet)                          | High — the #1 recurring extra in PH boarding houses         | S                                             | **Selected** (D9); makes the hard-coded `property_*_cost` tenancy fields (F-tenancy) real       |
| I9  | Aging report, monthly collection summary, CSV export                                  | Medium — bookkeeping                                        | S–M                                           | **Selected** (D15)                                                                              |
| I10 | Printable receipt per payment + monthly statement per boarder                         | Medium — replaces loose GCash screenshots                   | M                                             | **Selected** (D15)                                                                              |
| I11 | Real dashboard numbers (payment alerts, collected-this-month)                         | Medium — removes a hard-coded 0 and a misleading "revenue"  | S                                             | **Selected** (D15, F5, F6)                                                                      |
| I12 | Deposit refund/forfeit at move-out with a final statement                             | Medium                                                      | S                                             | **Selected** (D11)                                                                              |
| I13 | Online checkout (GCash/Maya via PayMongo/Xendit, card via Stripe)                     | High long-term                                              | L (KYC, webhooks, reconciliation, settlement) | **Deferred** (D2, D23)                                                                          |
| I14 | Platform fee / revenue cut on collected rent                                          | Revenue                                                     | L (money movement + payouts + regulatory)     | **Deferred** (D25; note F3's orphaned `platform_fee_percent`)                                   |
| I15 | Partial payments + running balance + credit on overpayment                            | Medium                                                      | M                                             | **Deferred** (D6) — revisit when a real gateway lands                                           |
| I16 | Auto-generated utility estimates later adjusted ("estimated reading")                 | Medium                                                      | M                                             | **Deferred** (D9 chose landlord-posted)                                                         |
| I17 | Bank statement upload + auto-matching                                                 | Low now                                                     | L                                             | **Deferred** (D25)                                                                              |
| I18 | BIR-compliant official receipts / e-invoicing                                         | Compliance                                                  | L                                             | **Deferred** (D25) — informal printable receipt only                                            |
| I19 | Multi-currency                                                                        | Low (PH-only product)                                       | M                                             | **Deferred** (D25)                                                                              |
| I20 | Dispute/chargeback workflow beyond verify/reject                                      | Medium                                                      | M                                             | **Deferred** (D25)                                                                              |
| I21 | Deposit/advance payable at Confirm Booking (hold the room)                            | Medium-high                                                 | M                                             | **Deferred** (D12) — the natural v2, and the point where a gateway first pays for itself        |
| I22 | Auto-generated utility charges from meter readings with a photo                       | Medium                                                      | M                                             | **Deferred** — parked with I16                                                                  |
| I23 | Prompt/auto-triggered WhatsApp or SMS reminders for boarders who ignore the bell      | Medium                                                      | M                                             | **Deferred** — blocked on a channel existing (no email/push wired today)                        |
| I24 | "Pay to landlord's GCash" deep link / QR (no gateway, just a payment link)            | Medium                                                      | S–M                                           | **Deferred** — cheapest realistic bridge to I13; revisit first if users ask where to send money |
| I25 | Boarder-declared payment _history_ import (backfill their own arrears)                | Low                                                         | S                                             | **Deferred** (D13 chose next-cycle start)                                                       |

---

## 4. Data model

### 4.1 Migration `0021_payments.sql` (next free number after `0020_messages.sql`)

```sql
-- 1. Link charges to the tenancy that generated them (F1).
ALTER TABLE payments ADD COLUMN application_id INTEGER;
ALTER TABLE payments ADD COLUMN charge_type TEXT NOT NULL DEFAULT 'rent';
    -- rent | deposit | advance | utility | late_fee | other
ALTER TABLE payments ADD COLUMN description TEXT;          -- "Electricity, Oct 2026"
ALTER TABLE payments ADD COLUMN period_start TEXT;         -- '2026-10-20' (billing period)
ALTER TABLE payments ADD COLUMN period_end TEXT;           -- '2026-11-19'
ALTER TABLE payments ADD COLUMN generation_key TEXT;       -- idempotency for the billing job
ALTER TABLE payments ADD COLUMN due_soon_reminded_at TEXT; -- second reminder slot (D18)
ALTER TABLE payments ADD COLUMN created_by INTEGER;        -- landlord when hand-created

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_generation_key
  ON payments(generation_key) WHERE generation_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_application
  ON payments(application_id, status);

-- 2. Per-property billing policy (D17, D20).
ALTER TABLE properties ADD COLUMN late_fee_amount REAL NOT NULL DEFAULT 500;
ALTER TABLE properties ADD COLUMN late_fee_grace_days INTEGER NOT NULL DEFAULT 3;

-- 3. Utility rate storage so formatTenancy()'s hard-coded zeros become real (I8).
ALTER TABLE properties ADD COLUMN electricity_cost REAL NOT NULL DEFAULT 0;
ALTER TABLE properties ADD COLUMN water_cost REAL NOT NULL DEFAULT 0;
ALTER TABLE properties ADD COLUMN internet_cost REAL NOT NULL DEFAULT 0;

-- 4. Immutable submission audit trail (D5, D21).
CREATE TABLE IF NOT EXISTS payment_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id INTEGER NOT NULL,
  submitted_by INTEGER NOT NULL,           -- boarder, or landlord for D29 recordings
  amount REAL NOT NULL,
  payment_method TEXT NOT NULL,            -- gcash | bank_transfer | cash
  reference_number TEXT NOT NULL,          -- required (D10)
  proof_url TEXT,                          -- optional receipt image
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | verified | rejected
  verified_by INTEGER,
  verified_at TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_submissions_payment
  ON payment_submissions(payment_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_status
  ON payment_submissions(status, created_at);
```

Notes:

- `application_id` is added **without** a FK because `applications` is deep in the dependency chain and
  existing rows are `NULL`; a later migration can backfill and add the constraint if desired.
- `status` on `payments` keeps its free-text nature (no `CHECK` constraint in `0011`), so adding
  `awaiting_verification` needs no table rebuild.
- `generation_key` format (agent default): `rent:{application_id}:{period_start}`,
  `deposit:{application_id}`, `advance:{application_id}`, `late_fee:{payment_id}`.
- Existing rows are **not** backfilled with schedule charges (D13). They get `application_id = NULL`,
  `charge_type = 'rent'`.

### 4.2 Repository layer (new files under `workers/api/src/repositories/payments/`)

Per the project convention (routes call repositories, never D1 directly):

| File                      | Responsibilities                                                                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `payments/schedule.ts`    | `generateScheduleForApplication()`, day-of-month clamping (D26), next-cycle start (D27), idempotent via `generation_key`                              |
| `payments/ledger.ts`      | `listChargesForBoarder()`, `listChargesForProperty()` (property-access aware via `accessiblePropertyClause`), `getChargeById()` with ownership guards |
| `payments/submissions.ts` | `createSubmission()`, `verifySubmission()`, `rejectSubmission()`, `recordPaymentByLandlord()` (auto-verify, D29)                                      |
| `payments/billing-run.ts` | `markOverdue()`, `applyLateFees()`, `emitDueSoonReminders()`, `emitOverdueReminders()` — the nightly job (§8.2)                                       |
| `payments/reporting.ts`   | aging buckets, monthly collection summary, CSV row builder                                                                                            |
| `payments/deposit.ts`     | refund/forfeit at move-out (D11)                                                                                                                      |
| `payments/types.ts`       | row + DTO interfaces, `formatCharge()`, shared money rounding helper                                                                                  |

---

## 5. API design

All routes follow the house conventions: `Hono` sub-app, `authorizeUser(db, req, ['boarder'|'landlord'], JWT_SECRET)`,
`jsonResponse`/`errorResponse`, `isJsonRecord` validation, `{ success: true, data }` envelopes.

### 5.1 Boarder (`workers/api/src/routes/boarder/payments.ts`, mounted from `routes/boarder.ts`)

| Method | Path                                                | Behaviour                                                                                                                                                                                                                                                    |
| ------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET`  | `/api/boarder/payments`                             | Own ledger: charges + their submissions + a summary (`total_due`, `overdue_count`, `next_due_date`, `awaiting_verification_count`). Boarder-scoped by `boarder_id = user.user_id`.                                                                           |
| `GET`  | `/api/boarder/payments/:chargeId`                   | One charge with full submission history; 404 unless it belongs to the caller.                                                                                                                                                                                |
| `POST` | `/api/boarder/payments/:chargeId/submissions`       | Submit a payment. Body: `payment_method`, `reference_number` (**required**), `notes`. Sets `payments.status = 'awaiting_verification'`, creates a `pending` submission, notifies the landlord. 409 if the charge is already paid / has a pending submission. |
| `POST` | `/api/boarder/payments/:chargeId/submissions/proof` | Multipart receipt upload, avatar-route pattern (≤2 MB, image MIME allow-list), returns `proof_url`; the submission POST then references it.                                                                                                                  |

### 5.2 Landlord (`workers/api/src/routes/landlord/payments.ts`, mounted from `routes/landlord/index.ts`)

| Method  | Path                                                       | Behaviour                                                                                                                                                     |
| ------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| `GET`   | `/api/landlord/properties/:propertyId/payments`            | Per-property ledger (D7): all boarders, charges, statuses; filters `status`, `month`, `boarder_id`. Property-access enforced.                                 |
| `POST`  | `/api/landlord/properties/:propertyId/charges`             | Create a **utility** or **ad-hoc** charge (D9, D3): `boarder_id`, `charge_type`, `amount`, `due_date`, `description`.                                         |
| `PATCH` | `/api/landlord/charges/:chargeId`                          | Edit amount / due date / description before it is paid; audited.                                                                                              |
| `POST`  | `/api/landlord/charges/:chargeId/cancel`                   | Void an unpaid charge (`status = 'cancelled'`).                                                                                                               |
| `POST`  | `/api/landlord/submissions/:submissionId/verify`           | Mark verified: submission `verified`, `payments.status='paid'`, `paid_date`, `payment_method`, `reference_number` copied onto the charge; notify the boarder. |
| `POST`  | `/api/landlord/submissions/:submissionId/reject`           | Body: `rejection_reason` (required). Submission `rejected`, charge returns to `pending`/`overdue`; notify the boarder.                                        |
| `POST`  | `/api/landlord/charges/:chargeId/record`                   | **D29** — landlord records money in hand; writes a `payment_submissions` row with `submitted_by = landlord` and immediately verifies it; charge → `paid`.     |
| `POST`  | `/api/landlord/tenancies/:applicationId/billing`           | Create/refresh the schedule for one tenancy (used to opt an existing tenancy in, D13) — body may set `start_period`.                                          |
| `PATCH` | `/api/landlord/properties/:propertyId/billing-settings`    | Late fee amount, grace days, utility rates (D17, D20, I8).                                                                                                    |
| `GET`   | `/api/landlord/properties/:propertyId/payments/report`     | Aging buckets (current / 1–30 / 31–60 / 61–90 / 90+) + monthly collection summary.                                                                            |
| `GET`   | `/api/landlord/properties/:propertyId/payments/export.csv` | CSV of the ledger for bookkeeping (D15).                                                                                                                      |
| `POST`  | `/api/landlord/charges/:chargeId/deposit-resolution`       | **D11** — `refund                                                                                                                                             | forfeit | partial`with`amount`+`reason`; records the resolution on the deposit charge and surfaces it on the statement. |

Receipts and statements are **client-rendered print views** (print-to-PDF), so they need no dedicated
endpoint beyond the ledger data.

### 5.3 Authorization invariants (must be tested)

1. A boarder can read and submit only charges where `payments.boarder_id = user.user_id`.
2. A landlord can read/write only charges belonging to properties reachable through
   `accessiblePropertyClause('p')` (ownership **or** shared property access).
3. No endpoint accepts a client-supplied `boarder_id`/`landlord_id` as authority — it is derived from the token.
4. Admins are not granted any of these routes (D14).
5. A verified submission cannot be verified/rejected twice (idempotency guard).

---

## 6. Business rules

### 6.1 Schedule generation (D4, D26, D27)

Triggered when `applications.status` becomes `confirmed` (today: `confirmApplicationBooking()` in
`repositories/applications.ts:290`).

- **Anchor date** = the tenancy start date (see §12 Q2 for `created_at` vs `confirmed_at`).
- **Due day** = anchor day-of-month, **clamped** to the last day of any shorter month (a 31st anchor
  bills Feb 28/29) (D26).
- **First charge** = the first due date strictly after the anchor date; the partial stub month is never
  charged (D27).
- **Rent amount** = `rooms.price` at generation time, snapshotted onto the row (later price edits must
  not retroactively rewrite history).
- **Deposit charge** = `rooms.deposit`, due on the first due date.
- **Advance charge** = explicit amount captured at billing setup (§12 Q1) — `properties.advance` is
  free-text and cannot be parsed safely (F2).
- **Horizon**: generate N months ahead (agent default: 3) and let the nightly job extend the horizon, so
  the ledger is never empty but also never infinite.
- **Idempotency**: `generation_key` unique index; re-running the generator is a no-op.

### 6.2 Due, overdue, grace, late fees (D8, D17, D19, D20)

- A charge is **due soon** when `due_date - today ∈ [1..3]`.
- A charge is **overdue** when `today > due_date + grace_days` and `status ∈ (pending, awaiting_verification)`.
- On the first nightly run where a charge is overdue, **one** `late_fee` charge is created
  (`charge_type='late_fee'`, `amount = properties.late_fee_amount`, `generation_key = late_fee:{id}`).
  Setting the property's `late_fee_amount = 0` disables it, and the unique key makes it apply at most once.
- Late fees are **not** recursive: no per-day accrual, no fee-on-fee.

### 6.3 Verification lifecycle

- Submitting requires `payment_method`, `reference_number`, and implicitly the full charge amount (D6).
  The amount is server-derived from the charge — never trusted from the client.
- `paid` requires a verified submission **or** a landlord recording (D29).
- A rejected submission leaves an auditable row and returns the charge to its computed status.
- Editing a charge to a different amount after a submission exists is blocked (it would silently
  invalidate the submission).

### 6.4 Deposit at move-out (D11)

- The deposit charge stays `paid`; resolution is recorded separately (`refund | forfeit | partial` +
  reason + amount) and shown on the final statement.
- Resolution is available from the boarder-detail surface, and only for tenancies whose leave request
  is approved (existing `leave_request_status = 'approved'` path in `repositories/tenancy.ts`).

---

## 7. Frontend surfaces

| Route                                | Change                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/boarder/payments`                  | Replace the `EmptyState` with the real ledger: **summary strip** (balance due, next due date, overdue count), charge list grouped by month with status chips, a **Submit payment** primary action per unpaid charge, and a submission/badge showing pending-verification state.                                                                                        |
| `/boarder/payments/pay`              | Becomes the **submit-a-payment flow for one charge** (D22), deep-linked as `/boarder/payments/pay?chargeId=<id>`: charge summary, method selector (reusing the `gcash`/`bank_transfer`/`cash` vocabulary), reference input (required), optional receipt upload, submit → toast → back to the ledger. Must degrade gracefully to a chooser if no `chargeId` is present. |
| `/landlord/payments`                 | Replace `PlaceholderPage` with the **per-property ledger** (D7): property switcher, filters (month, status, boarder), collection summary header, aging view, CSV export, and a **Print statement** action per boarder.                                                                                                                                                 |
| `/landlord/payments/record`          | Becomes the **record-a-payment-on-behalf** form (D29), reachable from a charge row and from the boarder detail; labelled "Recorded by landlord".                                                                                                                                                                                                                       |
| `/landlord/properties/$id`           | Add a **Payments** tab alongside the existing rooms/boarders tabs, showing that property's ledger.                                                                                                                                                                                                                                                                     |
| `/landlord/boarders` (tenant detail) | Wire the real `payment_status`, `payment_due_day`, `last_payment_date` (currently hard-coded, F5), plus a deposit-resolution action.                                                                                                                                                                                                                                   |
| `/landlord/index` (dashboard)        | Wire `payment_alerts.due_soon`/`overdue` and replace the room-price "revenue" with **collected this month** (F6, D15).                                                                                                                                                                                                                                                 |
| `/boarder/tenancy`                   | Show the real utility rates instead of the hard-coded `0` values from `formatTenancy()`, plus a link to the ledger.                                                                                                                                                                                                                                                    |

Reuse `components/ui/*`: `Card`, `DataTable`, `Modal`, `Button`, `Field`/`SelectInput`, `EmptyState`,
`ErrorState`, `Spinner`, `PageHeader`, `Icon` (`payment` icon already mapped in
`components/ui/Icon.tsx:5`). Follow the Apple-UI restructure conventions from
`admin-apple-ui-restructure-spec.md` (shells via `<Protected>` + `<RoleShell>`, `useBoarderNav`).

---

## 8. Notifications, scheduled work, and exports

### 8.1 Notification types (F4 is a landmine)

Register these in `roleVisibleTypes()` (`repositories/notifications.ts:49`) or they will not appear:

| Type                | Recipient | When                                       |
| ------------------- | --------- | ------------------------------------------ |
| `payment_due_soon`  | boarder   | 3 days before `due_date` (D18)             |
| `payment_overdue`   | boarder   | first run after grace period expires       |
| `payment_submitted` | landlord  | boarder submits for verification           |
| `payment_verified`  | boarder   | landlord verifies                          |
| `payment_rejected`  | boarder   | landlord rejects (with reason in metadata) |
| `payment_recorded`  | boarder   | landlord records on their behalf (D29)     |
| `payment_late_fee`  | boarder   | late fee applied                           |

`metadata` should carry `{ charge_id, payment_id, amount, due_date }` so the bell can deep-link to
`/boarder/payments/pay?chargeId=…`.

### 8.2 The nightly job (F7 — the main infra change)

D8 ("fully automatic overdue + late fees + reminders") and I7 require a schedule that does not exist yet.
Two options; the spec recommends the first:

1. **Cron Trigger (recommended).** Add to `workers/api/wrangler.jsonc`:
   `"triggers": { "crons": ["0 17 * * *"] }` (17:00 UTC = 01:00 PHT), and change the Worker entry from
   a bare Hono default export to `export default { fetch: app.fetch, scheduled: handler }`
   (the `scheduled` handler is additive and does not disturb routing). One run does, in order:
   (a) extend schedules to the horizon, (b) emit due-soon reminders, (c) mark overdue, (d) apply late
   fees, (e) emit overdue reminders. All steps are idempotent via `generation_key` /
   `reminder_sent_at` / `due_soon_reminded_at`.
2. **Lazy on-read fallback.** Compute overdue state at read time and drop reminders/late fees. This
   satisfies nothing in D8 except the badge, so it is a fallback only if `wrangler.jsonc` must not
   change.

Timezone: all stored dates are `YYYY-MM-DD`; the comparison must be done in **Asia/Manila (UTC+8)**,
not UTC, or charges flip to overdue 8 hours late. State this explicitly in the implementation.

### 8.3 Exports and receipts

- **CSV**: server-side `text/csv` response (`Content-Disposition: attachment`) — no extra dependency.
- **Receipt / statement**: client-rendered print views (`window.print()` with a print-only stylesheet),
  which keeps "PDF" dependency-free. Informal only: no BIR/official-receipt claims (D25).

---

## 9. Edge cases and guardrails

| #   | Case                                                                     | Rule                                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Boarder changes rooms / reapplies                                        | Schedules are keyed by `application_id` + `generation_key`, so a new tenancy gets a fresh schedule with no collision (this is why F1 must be fixed).                                  |
| R2  | Landlord edits the room price mid-tenancy                                | Past charges keep their snapshotted `amount`; only future generated charges pick up the new price.                                                                                    |
| R3  | Float money (F8)                                                         | Round every stored/written amount to 2 decimals at write time; compare "paid in full" with a tolerance (`abs(a-b) < 0.005`) or compare centavos. Document the tolerance in a comment. |
| R4  | Two submissions on one charge                                            | Second submit returns 409 while one is `pending`; after a rejection the boarder may submit again (new row).                                                                           |
| R5  | Landlord verifies, then disputes                                         | Verification is final in v1; correction requires cancelling the charge and creating a new one (D25: no dispute workflow).                                                             |
| R6  | Charge edited after submission                                           | Blocked (would invalidate the submission) — see §6.3.                                                                                                                                 |
| R7  | Boarder submits zero or negative via crafted JSON                        | Server derives the amount from the charge; `amount` is never accepted from the boarder.                                                                                               |
| R8  | Receipt file bad                                                         | Reject >2 MB or non-image MIME, mirroring `routes/account.ts:199` (F11).                                                                                                              |
| R9  | Late fee after the charge is cancelled/paid                              | Never: the job only touches `pending`/`overdue` rows whose `due_date + grace` has passed.                                                                                             |
| R10 | Late fee applied, then the boarder pays the base rent                    | The late fee is its own charge and stays due; the ledger shows both.                                                                                                                  |
| R11 | Cron runs twice (retry)                                                  | All job steps idempotent; no duplicate notifications, no duplicate fees.                                                                                                              |
| R12 | Tenancy ends with an unpaid balance                                      | Leave approval is **not** blocked by an unpaid balance in v1 (no new gate on `approvePendingLeaveRequest`) — flagged as §12 Q4. Deposit resolution surfaces the balance instead.      |
| R13 | Boarder with no confirmed tenancy opens `/boarder/payments`              | `EmptyState` ("No charges yet — they appear once your booking is confirmed"), never an error. Matches the harnesses in `docs/qa/qa-spec.md`.                                          |
| R14 | Landlord with no properties                                              | `EmptyState` with a "Create listing" CTA.                                                                                                                                             |
| R15 | Deep-linked `/boarder/payments/pay?chargeId=X` for someone else's charge | 404 (not 403) to avoid enumerating charge ids.                                                                                                                                        |
| R16 | Property shared with a co-landlord                                       | Ledger reads follow `accessiblePropertyClause` (consistent with rooms/boarders).                                                                                                      |
| R17 | `payments` rows pre-dating this feature (all NULL `application_id`)      | Visible to the landlord as legacy-only entries; never auto-amended (D13).                                                                                                             |
| R18 | Currency formatting                                                      | `₱` + `toLocaleString()` to match the dashboard card, PHP only (D25).                                                                                                                 |

---

## 10. Verification plan (D24)

Gates (all must pass):

```bash
bun run cf:api:typecheck
bun run cf:api:test
bun run web:typecheck
bun run web:test
bun run format:check
```

**API tests** (`workers/api/test/payments*.test.ts`, using the existing `bun:sqlite` migration harness
from `test/tenancy.test.ts`):

- Schedule generation: correct due day, month-end clamping (Jan 31 → Feb 28), next-cycle first charge,
  deposit/advance, idempotent re-run.
- Submit → verify → `paid`; submit → reject → charge returns to `pending`; double-verify blocked.
- Late fee applied exactly once after grace; `late_fee_amount = 0` disables it; no fee on cancelled charges.
- Reminders: due-soon once, overdue once, no duplicates on a second job run.
- Authorization: boarder cannot read/submit another boarder's charge; landlord cannot touch a property
  they don't own or share; admins get nothing.
- Dashboard rollups: `payment_alerts.due_soon`/`overdue` reflect real rows.

**Web tests**: ledger renders charge states and empty states; the submit form requires a reference and
blocks submission while pending; the ledger scope filters property/boarder correctly.

**Manual walkthrough**: two accounts (landlord + boarder) at 390 px and 1440 px — confirm booking →
first charge appears → submit with reference + receipt → landlord sees pending → verify → boarder sees
paid → landlord records cash → dashboard alerts and aging update → CSV export and print statement.

**Docs reconciliation** (F12): update `docs/MANUAL.md:116`, `docs/qa/qa-spec.md` (S30 + the "Deferred
features" table rows), `docs/qa/qa-spec-audit.md`, `docs/specs/schema.md` §Payments, and
`docs/specs/google-oauth.md:325`.

---

## 11. Out of scope (D25)

- Online gateway / card or e-wallet checkout (no real money movement in-app).
- Platform fees or any revenue cut (note F3's orphaned `platform_fee_percent = '5.00'` — explicitly not used).
- Automated bank reconciliation.
- Formal receipts / BIR compliance (informal printable receipt only).
- Multi-currency (PHP only).
- Dispute/chargeback workflow beyond verify/reject.
- Partial payments, overpayment credits, and allocations (D6).
- Payments before tenancy confirmation, including a deposit to hold a room at Confirm Booking (D12).
- Any admin payments surface (D14).
- Historical backfill for pre-existing tenancies (D13).

---

## 12. Open questions (agent defaults pending owner confirmation)

| #   | Question                                                                                                                                      | Agent default if unanswered                                                                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Q1  | The advance payment amount cannot be derived from `properties.advance` (free text, F2). Where does the number come from?                      | Add an explicit `advance_amount` to the billing-setup step, defaulting to 0 with a landlord prompt ("₱0 = no advance"). |
| Q2  | The "move-in day" anchor: `applications.created_at` (application date, used as tenancy start today) or `confirmed_at` (booking confirmation)? | `confirmed_at` when present, falling back to `created_at` for pre-existing rows.                                        |
| Q3  | Generation horizon: how many months ahead should charges be created?                                                                          | 3 months, extended nightly.                                                                                             |
| Q4  | Should an unpaid balance block a leave request from being approved?                                                                           | No — v1 surfaces the balance on the deposit-resolution panel instead.                                                   |
| Q5  | Utility charge cadence: one charge per utility per month (electricity/water/internet) or one combined "utilities" charge?                     | Per-utility charges (`charge_type='utility'` + `description`), because the property stores three separate rates (I8).   |
| Q6  | Should reminders also be emitted to the landlord (e.g. "3 boarders overdue this week")?                                                       | No in v1 — the dashboard alert card covers it.                                                                          |
| Q7  | Receipt retention: delete the UploadThing file when a charge is cancelled?                                                                    | Keep it (audit trail); no deletion on cancel.                                                                           |
| Q8  | Is a boarder allowed to submit against a charge they believe is wrong (amount dispute)?                                                       | They submit anyway and note it in `notes`; the landlord can edit/reject. No formal dispute flow (D25).                  |
| Q9  | Should the ledger show charges for tenancies that ended (former boarders)?                                                                    | Yes, read-only, from the property's boarder history — the ledger is the historical record.                              |

## 12.1 Risks

| Risk                                                                                                                                                      | Mitigation                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adding `triggers`/`scheduled` to the Worker touches the deploy path that CI gates (`.github/workflows/deploy.yml`); a broken export breaks the whole API. | Keep `export default { fetch: app.fetch, scheduled }` minimal, verify with `wrangler deploy --dry-run` (the command `docs/MANUAL.md` already documents).                              |
| Money as `REAL` (F8)                                                                                                                                      | R3.                                                                                                                                                                                   |
| `formatLandlordBoarder()` / dashboard literals (F5, F6) are asserted in existing tests with `'paid'`, `15`, and `{ due_soon: 0, overdue: 0 }`.            | Expect to update `test/landlord-boarders.test.ts` (lines 144-146) and `test/landlord-dashboard.test.ts` (lines 100, 142) as part of D15 — updating them is correct, not a regression. |
| Scope creep toward a gateway                                                                                                                              | D23 forbids abstraction; revisit only as v2 (I13).                                                                                                                                    |

---

## 13. Implementation checklist (for the follow-up session)

1. Migration `0021_payments.sql`; run `bun run --cwd workers/api migrate:local`, verify typecheck/tests.
2. Repositories under `repositories/payments/` with unit-testable pure helpers (clamping, next due date, money rounding).
3. Hook `generateScheduleForApplication()` into the confirm-booking path.
4. Boarder routes + landlord routes (incl. property-access guards) in `routes/`, mounted in `index.ts` / `routes/landlord/index.ts`.
5. Notification types registered in `roleVisibleTypes()`; bell deep-links.
6. `scheduled` handler + `wrangler.jsonc` cron trigger; idempotent billing run.
7. Dashboard + landlord boarders wiring (real `payment_alerts`, real revenue = collected, real `payment_status`/`due_day`/`last_payment_date`).
8. Web: ledger, submit flow, record flow, property Payments tab, deposit resolution, print receipt/statement, CSV export.
9. Tests (API + web) and the manual two-account walkthrough at 390 px / 1440 px.
10. Docs reconciliation (F12) and update this spec's status line to "Shipped" with an "As shipped" section.

---

## 14. As shipped

Verified end state, and every place it differs from the plan above.

### 14.1 What exists now

| Layer            | Artifact                                                                                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migration        | `workers/api/migrations/0021_payments.sql` — tenancy link + `charge_type`/`period_*`/`generation_key`/reminder columns on `payments`, `applications.advance_amount`, three property billing columns, and the `payment_submissions` table.         |
| Repositories     | `workers/api/src/repositories/payments/{helpers,types,notify,schedule,ledger,submissions,charges,reporting,billing-run,index}.ts`                                                                                                                 |
| Routes           | `workers/api/src/routes/payments.ts` (boarder + landlord), mounted in `workers/api/src/index.ts`                                                                                                                                                  |
| Schedule hook    | `routes/applications.ts` — `generateScheduleForApplication()` runs on booking confirm                                                                                                                                                             |
| Billing job      | `runBillingJob()` + `scheduled` handler on the default export + `triggers.crons` in `workers/api/wrangler.jsonc` (production **and** staging)                                                                                                     |
| Notifications    | `payment_due_soon`, `payment_overdue`, `payment_late_fee`, `payment_verified`, `payment_rejected`, `payment_recorded` (boarder) and `payment_submitted` (landlord), registered in `roleVisibleTypes()`                                            |
| Dashboard wiring | `getLandlordDashboardStats()` now reports real `payment_alerts` and **collected-this-month** revenue; `formatLandlordBoarder()` reports real `payment_status`/`payment_due_day`/`last_payment_date`; `formatTenancy()` reports real utility rates |
| Web              | `lib/api/payments.ts`, `lib/payments.ts`, `lib/types.ts` payment types, `StatusBadge` tones, and four real screens: `/boarder/payments`, `/boarder/payments/pay`, `/landlord/payments`, `/landlord/payments/record`                               |     | Tests | `workers/api/test/payments.test.ts` (20, including a confirm-booking → ledger end-to-end through the HTTP surface), `apps/web/test/payments.test.ts` (7) |

### 14.2 Deviations from the plan

| #   | Planned                                                                                                                           | Shipped                                                                                                                                                                                                      | Why                                                                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| V1  | `GET /api/landlord/properties/:propertyId/payments` and `/payments/report` as separate endpoints                                  | One `GET /api/landlord/payments?propertyId=&month=&status=&boarderId=` returning `{ charges, summary, aging, collection }`                                                                                   | The report _is_ the ledger payload, so a second endpoint would have returned the same rows twice. `listChargesForProperty()` still exists in the repository. |
| V2  | `POST /api/boarder/payments/:chargeId/submissions/proof`                                                                          | `POST /api/boarder/payments/:chargeId/proof`                                                                                                                                                                 | One less path segment; the upload is not itself a submission.                                                                                                |
| V3  | An added `GET /api/landlord/charges/:chargeId` was not in the plan                                                                | Added                                                                                                                                                                                                        | The record screen needs one charge without fetching the whole ledger.                                                                                        |
| V4  | "Printable receipt / statement" (D15)                                                                                             | **Not built.** CSV export, aging and the monthly collection summary are.                                                                                                                                     | Print-to-PDF views were the lowest-value item in D15 and needed a print stylesheet pass; the ledger + CSV cover bookkeeping. Remaining work.                 |
| V5  | "A **Payments** tab on `/landlord/properties/$id`" (§7)                                                                           | **Not built.** The ledger has a property selector instead.                                                                                                                                                   | The ledger is already per-property (D7); the tab is a navigation nicety. Remaining work.                                                                     |
| V6  | Advance amount: "add an explicit `advance_amount` to the billing-setup step, defaulting to 0 **with a landlord prompt**" (§12 Q1) | Column + `POST /api/landlord/tenancies/:id/billing` accept it; the billing-rules card only exposes late fee + grace.                                                                                         | The prompt needs a tenancy-detail surface the landlord settings page does not have yet. Advance charges only appear once the amount is set.                  |
| V7  | Property-level utility _rates_ wired into billing settings                                                                        | Rates are stored (`electricity_cost`/`water_cost`/`internet_cost`) and surface on the tenancy payload; the billing-rules card does not edit them, and utility charges are posted as an amount + description. | Editing rates without an auto-calculating charge would imply a calculation that does not exist (D9 chose landlord-posted amounts).                           |
| V8  | A boarder-facing link to the ledger from `/boarder/tenancy`                                                                       | The real utility rates ship on that page; the ledger link is the existing `Payments` nav entry.                                                                                                              | Avoids a second entry point for the same destination.                                                                                                        |

### 14.3 Confirmed exactly as planned

- **No gateway, no admin surface, no platform fee** (D2, D14, D25) — the orphaned `platform_fee_percent`
  setting is untouched and unused.
- **Due day from the move-in day, month-end clamped, first full charge next cycle** (D16/D26/D27) — proven
  by tests (`nextDueAfter('2026-01-31', 31) === '2026-02-28'`).
- **Submit → verify/reject → settle, reference required, receipt optional, full amount only** (D5/D6/D10),
  server-derived amounts, 409 on a duplicate claim, resubmission allowed after a rejection.
- **Landlord recording auto-verifies and is attributed** (D29).
- **₱500 flat late fee per property, 3-day grace, 0 disables it, applied at most once** (D17/D19/D20) —
  asserted by the billing-run tests, including a no-op retry.
- **In-app reminders only, 3 days before + once overdue** (D18); **Asia/Manila** date handling.
- **Authorization**: boarder 404s on another boarder's charge, landlord 404s on an inaccessible property,
  admin and wrong-role callers get 403.
- **Idempotency**: `generation_key` makes both schedule generation and late fees safe to replay.

### 14.4 Remaining work / limitations

1. **No manual two-account browser walkthrough** was performed (D24 asked for one at 390 px and 1440 px);
   coverage is typecheck + unit/integration tests + the production build. This is the one unmet item of
   the verification bar.
2. **No print/statement view** (V4) and **no property-detail Payments tab** (V5).
3. **No landlord prompt for the advance amount** (V6) — it is API-settable only.
4. `format:check` fails repo-wide on this Windows checkout (~470 files, including files untouched by this
   work) because `.prettierrc` sets `endOfLine: "lf"` while the working tree is CRLF. Every file added or
   edited here passes `prettier --check` individually; the repo-wide failure is pre-existing.
