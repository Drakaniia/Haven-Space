# Spec — Payments page regressions (nested shell + unapplied migration)

> **SUPERSEDED (2026-10-10)** by [`payments-shell-reverification-spec.md`](./payments-shell-reverification-spec.md).
> This file diagnosed both defects and its fix plan was executed, but the follow-up pass re-proved the
> defects against the tree, recorded the shipped state, and added one decision this file did not make:
> the API now surfaces a stale database as **503 `database_schema_stale`** with a migration hint
> instead of a bare generic 500 (D6 there). Kept for the original diagnosis and sweep evidence.

**Status:** **Superseded** — see the note above. The diagnoses below are verified
read-only findings; §3–§5 are the change plan, executed immediately after this file was written.
**Short name:** `payments-page-regressions`
**Date:** 2026-10-10
**Owner request (verbatim):**

> why do i see two payments pages here, fix this

…with a screenshot of `/landlord/payments` showing **two stacked app shells** (an outer sidebar +
topbar, and a second inset sidebar + topbar inside the content column) and a red **"Internal server
error"** panel under the property/month filters.

**Relationship to existing work:**

- This is a **regression introduced by `payments-feature-spec.md`** (shipped minutes earlier in the same
  session). Both defects are in that work, not pre-existing.
- `docs/qa/specs/qa-spec-audit.md` §10.6 lists the payments pages as previously verified "**single shell, no
  duplicates**" — the claim is currently false, which is what makes this a regression of a checked
  property rather than a never-noticed rough edge.
- `admin-apple-ui-restructure-spec.md` owns the single-shell convention (`Protected` + `RoleShell` once
  per subtree); `landlord-property-detail-page-spec.md` R5 documents the layout-owns-the-shell rule that
  this fix restores.
- `messages-feature-review-spec.md` built the sibling `/landlord/messages` + `/boarder/messages` subtrees
  and got this right — they are the in-repo precedent the fix matches.

---

## 1. Interview decisions

Four rounds of `ask_user`, 16 questions.

| #   | Topic | Decision |
| --- | ----- | -------- |
| D1  | Deliverable | **Spec, then fix both defects in this session.** |
| D2  | Migration reach | **Local + remote + staging.** `wrangler` is authenticated (OAuth token, account `fab94f3e8a58d3b3509d01f11a67b843`), so the remote apply is in scope. |
| D3  | Empty ledger after migrating | **Leave it — real data only.** No seed, no back-fill, no "generate now" button. Document that the ledger is empty until a booking is confirmed. |
| D4  | Other symptoms confirmed | Doubled shell on `/landlord/payments/record` and `/boarder/payments/pay` too; the boarder pages fail against the stale DB as well; the ledger's filters/summary render while the request itself 500s. |
| D5  | Shell ownership | **Keep it in the layout; strip the four leaves.** Matches every other layout subtree. |
| D6  | Prevention | **A web regression test that counts shells** (no shell-counting test exists today). |
| D7  | Remote-migration safety | **Dry-run the SQL on a copy first**, then apply. |
| D8  | API error surface | **Keep the generic 500**; improve only what the page shows. |
| D9  | Test breadth | **The four payments routes only.** |
| D10 | Error-state construction | **Extend the shared `ErrorState`** with an optional action (so a Retry button and a hint are possible without a bespoke panel). |
| D11 | `/boarder/payments/pay` gating | **Keep `RequireTenancy` where it is** (pre-existing behaviour: no confirmed tenancy → no payments UI). Document it; do not move the gate. |
| D12 | Docs to reconcile | **All four:** `qa-spec-audit.md` §10.6, `payments-feature-spec.md` §14, `AGENTS.md`, `docs/guides/MANUAL.md`. |
| D13 | Route audit | **Sweep every route once, fix only payments** (sweep done — §2.3). |
| D14 | Acceptance | **Single shell + no error, then:** confirm a booking → the generated rent/deposit/advance charges must appear in the ledger. |
| D15 | Remote auth fallback | If the remote apply fails on auth, attempt it, report the failure, and leave the exact commands. |
| D16 | Verify bar | **The four project checks + the new shell test** (`cf:api:typecheck`, `cf:api:test`, `web:typecheck`, `web:test`). |

---

## 2. Diagnosis (verified 2026-10-10, read-only)

### 2.1 Defect A — the payments leaves render their own app shell

`RoleShell` renders the sidebar + topbar + the content column. Its two layout routes already do that:

| File | Renders | In `HEAD` | Now |
| ---- | ------- | --------- | --- |
| `apps/web/src/routes/landlord/payments.tsx` | `Protected` → `RoleShell` → `<Outlet />` | shell | shell |
| `apps/web/src/routes/boarder/payments.tsx` | `Protected` → `RoleShell` → `RequireTenancy` → `<Outlet />` | shell | shell |
| `apps/web/src/routes/landlord/payments/index.tsx` | leaf | **0 `RoleShell` references** | **wraps `Protected` + `RoleShell`** |
| `apps/web/src/routes/landlord/payments/record.tsx` | leaf | **0** | **wraps** |
| `apps/web/src/routes/boarder/payments/index.tsx` | leaf | **0** | **wraps** |
| `apps/web/src/routes/boarder/payments/pay.tsx` | leaf | **0** | **wraps** |

`git show HEAD:<file> | grep -c RoleShell` returns `0` for all four leaves, and the four stub pages that
shipped before the payments feature contained no shell because the layout provided it. The rewrite added
it, so every payments page now nests a second shell inside the first — the outer sidebar/topbar come
from the layout, the inner pair from the page. That is exactly what the screenshot shows: the inner
copy is squeezed into the content column (hence the cramped sidebar and the duplicated
"Landlord ▸ Payments" breadcrumb).

**The convention is unanimous and the regression is strictly localised.** A sweep of all 36 route files
(`/tmp/sweep.mjs`) found 11 layout routes and 25 leaves under a layout subtree:

```
LEAF WRAPS SHELL   boarder/payments/index.tsx     layout: boarder/payments.tsx
LEAF WRAPS SHELL   boarder/payments/pay.tsx       layout: boarder/payments.tsx
LEAF WRAPS SHELL   landlord/payments/index.tsx    layout: landlord/payments.tsx
LEAF WRAPS SHELL   landlord/payments/record.tsx   layout: landlord/payments.tsx
violations: 4
```

Every other leaf — `landlord/properties/$id/index.tsx`, `landlord/messages/index.tsx`,
`boarder/messages/$threadId.tsx`, `landlord/listings/create.tsx`, … — renders content only (21/21 clean).
All four violations came from the payments work.

### 2.2 Defect B — `0021_payments.sql` was never applied to the dev database

Inspected `workers/api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite` (the local D1 the dev
Worker uses):

```
applied migrations: 0001…0020 (ends at 0020_messages.sql)
payments cols: id, boarder_id, landlord_id, room_id, property_id, amount, late_fee, due_date,
               paid_date, status, payment_method, reference_number, notes, reminder_sent_at,
               created_at, updated_at          ← no charge_type, no application_id, no period_*
applications has advance_amount: false
properties has late_fee_amount: false
payment_submissions table: 0
payment rows: 0
```

`GET /api/landlord/payments` selects `pay.charge_type`, `COALESCE(pr.late_fee_grace_days, 3)` and joins
`payment_submissions`; against that schema SQLite throws, Hono's `onError` logs it and returns
`{"error":"Internal server error"}` — the exact red panel in the screenshot. The API's behaviour is
correct for an unexpected error; the database is simply behind the code.

**Blast radius:** every payments page, both roles. Nothing else in the app reads the new columns, which
is why only payments broke.

### 2.3 Why neither defect was caught

| Gap | Detail |
| --- | ----- |
| Tests always migrate | `workers/api/test/*.test.ts` runs **every** migration from disk into a fresh `bun:sqlite` database (`runMigrations()`), so the suite can never see a stale database. 295 tests pass against a schema the dev server did not have. |
| No shell assertion | No web test renders a route inside its layout, and nothing counts `aside.chrome-sidebar` / topbar instances. `auth-layout.test.tsx` and `messages-inbox.test.tsx` render components, not route trees. |
| Convention was undocumented | The layout-owns-the-shell rule lived only in the shapes of the existing files; it is now written down (D12). |
| A verified claim went stale | `qa-spec-audit.md` §10.6 still asserts the payments pages are single-shell "FIXED"/passed. |

---

## 3. Fix plan

### 3.1 Defect A — strip the shell from the four leaves (D5)

For each of `boarder/payments/index.tsx`, `boarder/payments/pay.tsx`, `landlord/payments/index.tsx`,
`landlord/payments/record.tsx`:

1. Delete the `Protected` and `RoleShell` wrappers; the route's `component` renders the page content
   directly (the layout supplies both).
2. Delete the now-unused imports (`Protected`, `RoleShell`, and `useBoarderNav`/`LANDLORD_NAV` where the
   leaves only used them to build the shell).
3. Keep everything else — `PageHeader` with its icon/subtitle, the ledger's filters, summary, aging,
   modals and toasts, the pay/record forms.
4. Keep the boarder `RequireTenancy` gate exactly where it is (D11) — it lives in the layout, so the
   leaves already inherit it.

Resulting shape (matching `landlord/properties/$id/index.tsx`):

```tsx
export const Route = createFileRoute('/landlord/payments/')({
  component: LandlordPaymentsPage,
});
```

Leaves that render their own toasts keep `ToastStack` — it is page state, not chrome.

### 3.2 Defect B — apply the migration (D2, D7)

Runbook, in order, with the dry-run first:

```bash
# 1. Dry-run on a copy: prove 0021 applies to the *existing* schema (not just a fresh DB).
#    A throwaway local D1 is migrated to 0020, seeded, then 0021 is applied to it.
#    (Verification step for this session; no repo artifact.)

# 2. Local dev database — the one the running Worker uses.
bun run --cwd workers/api migrate:local

# 3. Staging Worker + database.
bun run --cwd workers/api migrate:remote --env staging 2>/dev/null || \
  bunx wrangler d1 migrations apply haven-space --remote --env staging

# 4. Production.
bun run --cwd workers/api migrate:remote
```

Verify (each target) that `payments` gained `charge_type` / `application_id` / `period_start` /
`period_end` / `generation_key` / `due_soon_reminded_at` / `deposit_resolution`, that `properties` gained
`late_fee_amount` / `late_fee_grace_days` / `electricity_cost` / `water_cost` / `internet_cost`, that
`applications` gained `advance_amount`, and that `payment_submissions` exists.

Safety notes:

- Every statement is additive (`ALTER TABLE … ADD COLUMN`, `CREATE TABLE IF NOT EXISTS`,
  `CREATE INDEX IF NOT EXISTS`, one partial `CREATE UNIQUE INDEX`). No data is rewritten and no column is
  dropped, so the migration is safe on populated tables; the only structural risk would be an existing
  duplicate non-null `generation_key`, which cannot exist (the column is brand new, so all rows are
  `NULL` and the partial index ignores them).
- Rollback: forward-only. Reverting means dropping the new columns/table, which no code path requires —
  record that instead of shipping a down-migration.
- If the remote apply fails on auth or permissions, report the failure verbatim and leave the commands
  (D15); the local fix is unaffected.

### 3.3 Error surface (D8, D10)

- **API unchanged**: a database error keeps returning the generic 500 (`responseFromError`). No
  migration-probing logic is added — a missing migration is a developer-setup fault, and guessing at
  schema errors in `onError` would risk masking real bugs.
- **Page improved**: extend `components/ui/ErrorState` with an optional `action?: ReactNode` (mirroring
  `EmptyState`, which already takes one) and have the payments ledger pass a **Retry** button plus a hint
  line ("This usually means the API is running without the latest database migration."). The boarder
  ledger and both forms get the same treatment through the shared component.
- The property/month filter row keeps rendering above the error panel, which is what let the screenshot
  show filters and an error at once.

### 3.4 Explicitly not changing

- The boarder `RequireTenancy` placement (D11).
- The empty-ledger experience: "No charges for this month" stays until a real booking is confirmed (D3).
- The ledger's shape, endpoints and payloads — the API is correct; only its database was stale.

---

## 4. Regression guard (D6, D9)

New `apps/web/test/payments-shell.test.tsx`, scoped to the four payments routes:

```tsx
// For each of the four leaves:
//   render(<RoleShell nav={...}><LeafComponent /></RoleShell>)   // what the router does
//   expect(document.querySelectorAll('aside.chrome-sidebar')).toHaveLength(1)
```

Recipe and rationale:

- One instance of the layout around one leaf is precisely the tree the file router produces, so a leaf
  that re-adds `Protected` + `RoleShell` makes the count **2** and fails the test.
- `Sidebar`'s root is `<aside class="chrome-sidebar …">` — a stable, semantic selector; counting it
  avoids brittle class churn. Assert the topbar too if it has an equally stable root.
- The render needs the same scaffolding the other component tests use: a `QueryClientProvider`, the auth
  context stubbed (`useAuth` → a token), and `@tanstack/react-router` mocked (`Link`, `Outlet`,
  `useSearch`, `createFileRoute`) as `auth-layout.test.tsx` already demonstrates.
- Scope is deliberately the four payments routes (D9): the sweep in §2.3 showed they are the only
  violations, and a broader sweep can follow as its own change if the convention ever drifts again.

---

## 5. Verification and acceptance

Checks (D16), all run after the edits:

```bash
bun run cf:api:typecheck
bun run cf:api:test          # 295 pass expected — unchanged by this fix
bun run web:typecheck
bun run web:test             # 257 pass + the new shell test
```

Acceptance criteria (D14):

1. `/landlord/payments` renders **one** sidebar and **one** topbar, and **no** error panel; the empty
   state ("No charges for this month") shows for a month with no charges.
2. `/landlord/payments/record` and `/boarder/payments/pay` render one shell each (same fix).
3. No "Internal server error" from `/api/landlord/payments` or `/api/boarder/payments` against the
   migrated local database.
4. **Confirm a booking → the tenancy's rent/deposit/advance charges appear in the boarder's ledger**, and
   the landlord's ledger shows them for that property and month.
5. The new shell test fails if a shell is re-added to any of the four leaves (prove by temporarily
   re-adding one during development, then reverting).

---

## 6. Docs reconciliation (D12)

| File | Claim today | Change |
| ---- | ----------- | ------ |
| `docs/qa/specs/qa-spec-audit.md` §10.6 | "…payments, payments/pay — **single shell, no duplicates**" (listed as verified) | Note the regression and its date, and add a line to §10.6 recording that the single-shell claim is now guarded by a test rather than by spot-checking. |
| `payments-feature-spec.md` §14 | "As shipped" reads as clean | Add the two regressions to §14 with their causes (nested shell; unapplied migration) and the fix, so that spec stops implying the work shipped defect-free. |
| `AGENTS.md` | No shell rule | Add to the Frontend conventions: **"a route that lives under a layout route (`X.tsx` with an `<Outlet />`) must not render `Protected` or `RoleShell` itself — the layout owns them"**, plus the `migrate:local` requirement for local payments work. |
| `docs/guides/MANUAL.md` | Migration step exists but is not part of the local start | Make `bun run --cwd workers/api migrate:local` an explicit step in the local setup, with a one-line note that a stale database surfaces as a bare `Internal server error` on the API. |

---

## 7. Out of scope

- Making the douple-shell impossible structurally (a shared wrapper component) — D5 chose the
  convention-matching fix; D6 chose the test as the guard.
- Fixing the same pattern anywhere else: the sweep found none (D13).
- Migration-aware API error handling / a `503 FEATURE_DEFERRED`-style contract (D8).
- Seeding or back-filling payment data for the local database (D3).
- Moving the boarder `RequireTenancy` gate (D11).
- Print/statement views, the property-detail Payments tab and the advance-amount prompt, all still open
  from `payments-feature-spec.md` §14.4.

## 8. Risks

| Risk | Mitigation |
| ---- | ---------- |
| Applying `0021` remotely touches the production database. | Additive-only statements; dry-run on a copy first (D7); staging before production; verify the five schema additions after each apply. |
| Stripping the wrappers removes the boarder tenancy gate. | It lives in `boarder/payments.tsx`, not in the leaves — verified by reading the layout; the shell test plus the existing nav tests cover the leaf shape. |
| The shell test could pass vacuously if the router mock renders nothing. | Assert the sidebar is present (`length === 1`), not merely "not 2", so a broken mock fails loudly. |
| `ErrorState` gains a prop used by one page only. | It mirrors `EmptyState`'s existing `action` prop, so the shared primitive stays consistent rather than accreting a one-off. |
