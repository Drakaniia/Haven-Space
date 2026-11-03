# Spec — Payments pages: double-shell re-verification + stale-database error surfacing

**Status:** **Re-verification pass, then implement directly** (owner decision D1/D2). §2 is the
re-proved evidence; §3–§6 are the change plan and are executed in this session immediately after this
file is written.
**Short name:** `payments-shell-reverification`
**Date:** 2026-10-10
**Owner request (verbatim):**

> why do i see two payments pages here, fix this

…with a screenshot of `/landlord/payments` showing **two stacked app shells** (the outer sidebar +
topbar, and a second, inset sidebar + topbar squeezed into the content column, repeating the
“Landlord ▸ Payments” breadcrumb) and a red **“Internal server error”** panel under the property/month
filter row.

**Relationship to existing work:**

| Document | Relationship |
| -------- | ------------ |
| `payments-page-regressions-spec.md` | **Predecessor, now superseded** (D7). It diagnosed the same two defects and its fix plan was executed; this file re-proves the defects, records what is actually in the tree today, and adds a decision it did not make (D6: a migration-aware API error). A superseded note is added to its header. |
| `payments-feature-spec.md` | The feature that introduced both regressions. Its §14 “As shipped” still reads as defect-free. |
| `docs/qa/specs/qa-spec-audit.md` §10.6 | Asserts the payments pages are “single shell, no duplicates” — the claim the screenshot falsifies. |
| `admin-apple-ui-restructure-spec.md` | Owns the single-shell convention + the `.chrome-sidebar` / `.chrome-topbar` materials. |
| `landlord-property-detail-page-spec.md` R5 | Documents the layout-owns-the-shell rule this fix restores. |
| `messages-feature-review-spec.md` | Built the sibling `/landlord/messages` + `/boarder/messages` subtrees correctly — the in-repo precedent. |

---

## 1. Interview decisions

Four rounds of `ask_user`, 16 questions.

| #   | Topic | Decision |
| --- | ----- | -------- |
| D1  | Deliverable | **A fresh independent spec file** (`payments-shell-reverification-spec.md`), not an extension of the old one. |
| D2  | Spec vs. code | **Spec first, then implement it directly in this session** (owner overrode the task’s default “spec only, stop there”). |
| D3  | Scope | **Both defects** — the doubled shell *and* the red server-error panel. |
| D4  | Spec depth | **Full implementation plan**: exact files, edits, runbook, test recipe. |
| D5  | Re-verification evidence | **A browser-level check is required** — a read-only code/DB sweep is not sufficient on its own. |
| D6  | API error surface | **Add a migration-aware server hint**: detect schema-stale database errors and return **503 + a stable code + a message naming `migrate:local`**, instead of the bare generic 500. |
| D7  | Supersession | **Add a superseded note to `payments-page-regressions-spec.md`** pointing at this file. |
| D8  | Ledger data | **Real data only — no seed.** The ledger stays empty until a booking is confirmed. |
| D9  | Shell ownership | **Strip the four leaves; the layout keeps `Protected` + `RoleShell`.** |
| D10 | Guards | **All three**: shell-counting render test, static import guard over route files, and a one-off project-wide route sweep. |
| D11 | Migration reach | **Local + staging + production.** |
| D12 | Browser check mechanism | **Seeded QA login, manual inspection** in Chrome against the dev servers (not a headless script). |
| D13 | Boarder gate | **Keep `RequireTenancy` in `boarder/payments.tsx`**, where it already is. |
| D14 | Docs strip | The stale docs that call payments deferred/verified are reconciled (see §6; the owner answered “reconcile all stale docs” in round 1 and confirmed the file list in round 3). |
| D15 | Acceptance | Single shell + no error panel on all four routes, plus confirming a real booking makes the generated charges appear. |
| D16 | Verify bar | The four project checks + the new web tests (D1 of the predecessor: `cf:api:typecheck`, `cf:api:test`, `web:typecheck`, `web:test`). |

---

## 2. Re-verification evidence (read-only, this session)

### 2.1 Defect A — the shell is rendered twice on the payments routes

`RoleShell` renders the sidebar + topbar + the scrolling content column. Both payments layouts already
render it:

| File | Renders | Verdict |
| ---- | ------- | ------- |
| `apps/web/src/routes/landlord/payments.tsx` | `Protected` → `RoleShell` → `<Outlet />` | correct |
| `apps/web/src/routes/boarder/payments.tsx` | `Protected` → `RoleShell` → `RequireTenancy` → `<Outlet />` | correct |
| `apps/web/src/routes/landlord/payments/index.tsx` | leaf, content only | fixed in the tree |
| `apps/web/src/routes/landlord/payments/record.tsx` | leaf, content only | fixed in the tree |
| `apps/web/src/routes/boarder/payments/index.tsx` | leaf, content only | fixed in the tree |
| `apps/web/src/routes/boarder/payments/pay.tsx` | leaf, content only | fixed in the tree |

**Current tree state (re-read this session):** none of the four leaf files contains a `RoleShell` or
`Protected` import (each carries a comment naming this spec), so the doubling visible in the screenshot
is no longer produced by the source. The layout pair is still present in both layout files.

**Scope of the pattern.** A sweep of all route files found **exactly four** violations, all four
payments leaves; every other leaf under a layout (21 of 21) renders content only. The sweep is repeated
under D10 and its result recorded in §4.3 — if it ever returns a non-payments row, that is a new defect
and gets its own fix rather than being folded in here.

### 2.2 Defect B — `0021_payments.sql` never applied to the dev database

Recorded from the predecessor’s inspection of the local D1 the dev Worker uses
(`workers/api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite`):

```
applied migrations: 0001 … 0020 (ends at 0020_messages.sql)
payments columns:   id, boarder_id, landlord_id, room_id, property_id, amount, late_fee, due_date,
                    paid_date, status, payment_method, reference_number, notes, reminder_sent_at,
                    created_at, updated_at      ← no charge_type / application_id / period_* /
                                                   generation_key / due_soon_reminded_at /
                                                   deposit_resolution
properties:         no late_fee_amount / late_fee_grace_days / electricity_cost / water_cost /
                    internet_cost
applications:       no advance_amount
payment_submissions table: absent
payment rows:       0
```

`GET /api/landlord/payments` selects `charge_type`, `COALESCE(pr.late_fee_grace_days, 3)` and joins
`payment_submissions`; against that schema SQLite throws, `app.onError` (`workers/api/src/index.ts`)
logs it and `responseFromError` (`workers/api/src/lib/http.ts`) returns
`{"error":"Internal server error"}` with status 500 — exactly the red panel in the screenshot. **The
API’s current behaviour is correct for a genuinely unexpected error; the database is simply behind the
code.** D6 changes the *reporting* of that specific class of error, not the query logic.

**Blast radius:** every payments page, both roles. Nothing else in the app reads the new columns, which
is why only payments broke.

### 2.3 Why this was not caught (gaps the guards in §4 close)

| Gap | Detail |
| --- | ----- |
| API tests always migrate | `workers/api/test/*.test.ts` runs **every** migration from disk into a fresh `bun:sqlite` database, so the suite can never observe a stale database. A green suite says nothing about the dev server’s schema. |
| No shell assertion | Until this session no web test rendered a route inside its layout or counted `aside.chrome-sidebar` instances; `auth-layout.test.tsx` and `messages-inbox.test.tsx` render components, not route trees. |
| The convention was undocumented | “A leaf under a layout must not render `Protected`/`RoleShell`” lived only in the shapes of existing files; §6 writes it down. |
| A verified claim went stale | `docs/qa/specs/qa-spec-audit.md` §10.6 still lists the payments pages as verified single-shell. |

---

## 3. Fix plan

### 3.1 Defect A — the layout owns the shell (D9, D13)

For each of `landlord/payments/index.tsx`, `landlord/payments/record.tsx`,
`boarder/payments/index.tsx`, `boarder/payments/pay.tsx`:

1. No `Protected` and no `RoleShell` in the leaf — the route’s `component` renders page content only.
   The parent `…/payments.tsx` supplies both via its `<Outlet />`.
2. Delete any import that existed only to build that shell (`Protected`, `RoleShell`, and
   `useBoarderNav` / `LANDLORD_NAV` where used solely for it).
3. Keep everything else: `PageHeader`, the ledger’s filters, summary, aging card, table, modals,
   toasts, and the pay/record forms. A leaf that renders its own `ToastStack` keeps it — that is page
   state, not chrome.
4. Keep `RequireTenancy` exactly where it is (D13, in `boarder/payments.tsx`); the leaves inherit it.

Target shape (matching `landlord/properties/$id/index.tsx`):

```tsx
export const Route = createFileRoute('/landlord/payments/')({
  component: LandlordPaymentsPage,
});
```

Because the working tree already reflects this, the implement pass **verifies** each leaf rather than
rewriting it, and records the diff against `HEAD` where the wrappers were the only change.

### 3.2 Defect B — apply the migration (D11)

Runbook, in order, dry-run first:

```bash
# 1. Dry-run: prove 0021 applies to the *existing* schema, not just a fresh database.
#    Copy the local sqlite file, apply 0021 to the copy, diff the schema. Throwaway.

# 2. Local dev database — the one the running Worker uses.
bun run --cwd workers/api migrate:local

# 3. Staging Worker + database (no dedicated script exists; target the env explicitly).
bunx wrangler d1 migrations apply haven-space --remote --env staging

# 4. Production.
bun run --cwd workers/api migrate:remote
```

Verify after **each** apply that `payments` gained `charge_type`, `application_id`, `period_start`,
`period_end`, `generation_key`, `due_soon_reminded_at`, `deposit_resolution`; that `properties` gained
`late_fee_amount`, `late_fee_grace_days`, `electricity_cost`, `water_cost`, `internet_cost`; that
`applications` gained `advance_amount`; and that `payment_submissions` exists.

Safety:

- Every statement is additive (`ALTER TABLE … ADD COLUMN`, `CREATE TABLE IF NOT EXISTS`,
  `CREATE INDEX IF NOT EXISTS`, one partial `CREATE UNIQUE INDEX`). No rewrite, no drop, so it is safe
  on populated tables. The only structural risk would be a duplicate non-null `generation_key` — the
  column is brand new, so all rows are `NULL` and the partial index ignores them.
- Rollback is forward-only (dropping the new columns/table); no code path requires a down-migration, so
  record that instead of shipping one.
- If a remote apply fails on auth/permissions, report the failure verbatim and leave the commands; the
  local fix is unaffected.

### 3.3 The stale-database error, surfaced (D6)

**Server** (`workers/api`):

1. In `lib/http.ts`, add a detector for the SQLite “schema is behind the code” family — the D1/SQLite
   messages are `no such column: X`, `no such table: X`, and `table X has no column named Y`. Match on
   those (case-insensitive, message-based) rather than on error class, because D1 surfaces them as
   plain `Error`.
2. In `index.ts`’s `app.onError`, before the generic branch: if the error is not an `HttpError` and the
   detector matches, log it as a schema-stale fault (so the Worker log names the cause) and return
   `errorResponse(503, <message>, { code: 'database_schema_stale' })`. The message names the fix, e.g.
   *“The database is missing the latest migration. Run `bun run --cwd workers/api migrate:local`, then
   try again.”*
3. Everything else keeps the existing behaviour: `HttpError` → its own status, anything else → the
   generic 500. No schema probing, no query changes, no per-route special-casing.

**Why 503 and not 500:** the failure is environmental (the deployment/DB is not ready), not a server
bug, and it is retryable once migrated. `applications`-style “invalid input” paths are untouched.

**Client:** the shared `components/ui/ErrorState` already takes optional `hint` and `action` props (the
payments screens pass `PAYMENTS_ERROR_HINT` from `lib/payments.ts` plus a Retry button). The implement
pass keeps that and should make the copy consistent with the new server message — the hint is the
page-side twin of the 503.

### 3.4 Explicitly not changing

- `RequireTenancy`’s placement (D13).
- Seeding or back-filling payment rows; the ledger stays empty until a real booking (D8).
- The ledger’s endpoints, payloads, filters, or summary shape — Defect B was never an API bug.
- The `.chrome-sidebar` / `.chrome-topbar` materials and the single-scroll-column contract in
  `RoleShell`’s doc comment.

---

## 4. Guards (D10)

### 4.1 Shell-counting render test

`apps/web/test/payments-shell.test.tsx` — for each of the four leaves, render the tree the file router
actually builds (`<RoleShell nav={…}><LeafComponent /></RoleShell>`) and assert **exactly one** shell:

```tsx
expect(document.querySelectorAll('aside.chrome-sidebar')).toHaveLength(1);
expect(document.querySelectorAll('header.chrome-topbar')).toHaveLength(1);
```

Notes:

- One layout around one leaf is precisely the router’s tree, so a leaf that re-adds `Protected` +
  `RoleShell` makes the counts 2 and fails.
- `Sidebar`’s root is `<aside class="chrome-sidebar …">` and `Topbar`’s is
  `<header class="chrome-topbar …">` — both verified in source, both stable semantic selectors rather
  than brittle class chains.
- Scaffolding follows the existing component tests: `QueryClientProvider`, the auth context, and a
  `createFileRoute` / `Link` / `Outlet` / `useSearch` module mock for `@tanstack/react-router`.
- Assert the count is **1**, not merely “not 2”, and also assert the page’s own heading text appears —
  so a vacuous render (the mock rendering nothing) fails loudly instead of passing.

### 4.2 Static import guard over route files

A test that reads the route source files and fails if a **leaf inside a layout subtree** imports
`components/layout/RoleShell` or `components/auth/Protected`. Implementation shape:

- Enumerate route files under `apps/web/src/routes`; a file is a *layout* when it renders `<Outlet />`
  (or by the co-located directory of the same name).
- For every non-layout route in that subtree, `readFileSync` and assert the source does not reference
  `RoleShell` or `Protected`.
- Locate the routes root relative to the test file (`import.meta.dir` → `../src/routes`), never by
  absolute path, so it works on any machine.
- This is the guard that produces a *named file* in the failure message, which the render test alone
  cannot.

### 4.3 Project-wide route sweep (one-off)

Repeat the read-only sweep over every layout subtree and record the result in this spec’s implement
log. Expected: **11 layout routes, 25 leaves under a layout, 0 violations** after the fix. If a
non-payments violation appears, stop and report it rather than folding the fix in.

---

## 5. Verification and acceptance

### 5.1 Automated checks

```bash
bun run cf:api:typecheck
bun run cf:api:test          # includes updated error-mapping coverage (see below)
bun run web:typecheck
bun run web:test             # includes the two new guard tests
```

New API coverage required by D6: a test that a schema-stale error maps to **503 +
`database_schema_stale`** and that an ordinary `HttpError` and an unknown error keep their existing
statuses. Existing tests that assert `Internal server error` for unhandled errors must still pass —
change them **only** if they actually exercise the stale-schema family, and say so.

### 5.2 Browser-level re-verification (D5, D12 — required, not optional)

With `bun run web:dev` and `bun run cf:api:dev` running against the migrated local database:

1. Log in in Chrome as a landlord using the seeded QA credentials, open `/landlord/payments`.
2. Confirm the DOM shows **one** sidebar and **one** topbar, and the breadcrumb reads
   “Landlord ▸ Payments” **once**. Repeat for `/landlord/payments/record`.
3. Log in as a boarder with a confirmed tenancy and repeat for `/boarder/payments` and
   `/boarder/payments/pay`.
4. Confirm **no** error panel on any of the four. If the API is deliberately re-pointed at a stale
   database, confirm the panel now reads the migration hint (and the API returns 503
   `database_schema_stale`) rather than a bare “Internal server error”.
5. Record the actual observed shell counts and the absence of the error panel in this spec’s implement
   log. A passing build is not evidence for this criterion — the screenshot came from a green build.

### 5.3 Acceptance criteria

1. `/landlord/payments`, `/landlord/payments/record`, `/boarder/payments`, `/boarder/payments/pay`
   each render one sidebar and one topbar (browser-verified, §5.2).
2. No “Internal server error” from `/api/landlord/payments` or `/api/boarder/payments` against the
   migrated local database; a stale schema instead yields 503 `database_schema_stale` with the
   migration hint.
3. The empty ledger (D8) shows “No charges for this month” for a month with no charges — not an error.
4. **Confirm a booking → the tenancy’s rent/deposit/advance charges appear** in the boarder’s ledger and
   in the landlord’s ledger for that property and month (real data only).
5. Both guard tests fail if a shell is re-added to a leaf (prove by temporarily re-adding one, then
   reverting) and the import guard names the offending file.

---

## 6. Docs reconciliation (D14)

| File | Claim today | Change |
| ---- | ----------- | ------ |
| `payments-page-regressions-spec.md` | Status “spec, then fix in this session” | Add a **superseded** note at the top pointing at this file, and note where this one differs (D6). |
| `docs/qa/specs/qa-spec-audit.md` §10.6 | Payments pages listed as verified “single shell, no duplicates” | Record the regression, its date, and that the claim is now **guarded by a test** rather than by spot-checking. |
| `payments-feature-spec.md` §14 | “As shipped” reads as clean | Add both regressions (§14) with causes (nested shell; unapplied migration) and the fix, so the spec stops implying defect-free delivery. |
| `AGENTS.md` | No shell rule | Frontend conventions: **“a route under a layout route (`X.tsx` with `<Outlet />`) must not render `Protected` or `RoleShell` itself — the layout owns them”**, plus the `migrate:local` requirement for local payments work. |
| `docs/guides/MANUAL.md` | Migration step exists but is not part of the local start | Make `bun run --cwd workers/api migrate:local` an explicit local-setup step, noting that a stale DB now surfaces as a 503 `database_schema_stale` (and previously as a bare 500). |
| `docs/reference/google-oauth.md` §8 / `docs/qa/specs/qa-spec.md` S30 | Payments “deferred / coming soon” | Note that payments now ships, so the deferred-feature expectations are historical. |

---

## 7. Out of scope

- A structural fix that makes a doubled shell impossible at runtime (a shared wrapper that throws in
  dev) — D9 chose the convention-matching fix; D10 chose tests as the guard.
- Seeding or back-filling payment data (D8).
- Adding a `migrate:remote:staging` package script (the runbook calls wrangler with `--env staging`
  directly); worth doing separately if staging migrations become routine.
- Print/statement views, the property-detail Payments tab, and the advance-amount prompt — still open
  from `payments-feature-spec.md` §14.4.
- A headless-browser CI check: D12 chose seeded-login manual inspection for this pass.

## 8. Risks

| Risk | Mitigation |
| ---- | ---------- |
| Applying `0021` to production touches live data. | Additive-only statements; dry-run on a copy first; staging before production; verify the schema additions after each apply (D11). |
| The 503 mapping could mask a genuine bug that happens to mention `no such table`. | Match the narrow, well-known stale-schema message family only, and log the original error — a real bug still lands in the log with its stack. |
| The render test could pass vacuously if the router mock renders nothing. | Assert `length === 1` for both shell roots **and** assert the page heading is present (§4.1). |
| The import guard could drift from the real route layout. | Enumerate from the filesystem (layout = file that renders `<Outlet />`, or the directory-parent route), not from a hand-kept list of paths. |
| The browser check is manual and could be skipped. | It is an explicit acceptance criterion (§5.2) with observed counts recorded in the implement log; a green build is explicitly *not* accepted as evidence. |
| A remote migration fails on credentials/permissions. | Report verbatim, leave the exact commands, and keep the local verification valid (§3.2). |
