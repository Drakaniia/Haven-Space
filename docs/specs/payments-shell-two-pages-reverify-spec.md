# Spec — Payments: re-verifying the “two payments pages” report (doubled shell)

**Status:** **Draft — re-verification pass agreed; nothing implemented.** This file was written from a
read-only investigation of the tree, the local D1, and the shared D1 / deployed API. §3 is the plan the
owner approved; it has **not** been executed.
**Short name:** `payments-shell-two-pages-reverify`
**Date:** 2026-10-11
**Owner request (verbatim):**

> why do i see two payments pages here, fix this

…with a screenshot of `/landlord/payments` showing **two stacked app shells** (an outer sidebar + topbar,
and a second, inset sidebar + topbar repeating the “Landlord ▸ Payments” breadcrumb inside the content
column) and a red **“Internal server error”** panel under the property/month filters.

---

## 0. Relationship to existing work

This is the **third** spec written for this same verbatim request. It supersedes the second, which
superseded the first.

| Document | Relationship |
| -------- | ------------ |
| `payments-page-regressions-spec.md` | First pass. Diagnosed both defects and executed its fix plan; already carries a superseded note. |
| `payments-shell-reverification-spec.md` | Second pass. Re-proved both defects, executed its fix plan (leaves stripped, `0021` applied locally, 503 schema-stale mapping, guards). **This pass supersedes it** (D5) and must add a superseded note to its header (D16). |
| `payments-feature-spec.md` | The feature that introduced both defects. Not touched by this pass. |
| `admin-apple-ui-restructure-spec.md` | Owns the single-shell convention and the `.chrome-sidebar` / `.chrome-topbar` materials. |
| `docs/qa/qa-spec-audit.md` §10.6 | Claims the payments pages were spot-checked “single shell, no duplicates” — the claim this report falsifies. Recorded in §5, not corrected (D19). |
| `AGENTS.md` §Frontend | Line 86 tells contributors to “Wrap role pages in `<Protected role="...">` + `<RoleShell>`” — the guidance that produced the regression. **Corrected by this pass** (D7). |

**Decisions inherited unchanged** from the two predecessors: the layout owns `Protected` + `RoleShell`
and leaves never render it; `RequireTenancy` stays in `boarder/payments.tsx`; no seeded or back-filled
payment rows; the ledger endpoints, payloads, filters and summary shape are untouched.

---

## 1. Interview decisions

**Five rounds of `ask_user`, 19 questions.** Two answers contradicted earlier ones; both were resolved
explicitly in the final round (D15, D17) and the resolution is recorded here.

| #   | Topic | Decision |
| --- | ----- | -------- |
| D1  | Where the screenshot came from | **The local dev server** (`localhost:3000` with `bun run cf:api:dev` behind it). |
| D2  | Is it still reproducing? | **No — the screenshot predates the two earlier passes.** The owner confirmed it is not the current state, which is consistent with §2.1: no source in the tree can nest two shells. |
| D3  | What this pass is | **A fresh, independent re-verification spec.** Not a fix plan for live code, not a delivery/deploy pass. |
| D4  | The red “Internal server error” half of the report | **Cover it as fixed, verify only.** The local database is now at `0021_payments` (§2.2), so the panel should not be reproducible locally. |
| D5  | The environment gap | **Do not own it.** Record it as a known issue with evidence (the shared D1 is at `0014`, the deployed API 501s payments — §2.3, §5). |
| D6  | Evidence bar | **Automated guards only.** No browser session, no screenshots, no headless login script. |
| D7  | The root-cause guideline | **Rewrite the `AGENTS.md` shell guideline** (line 86) so it stops instructing the pattern that caused this. |
| D8  | Relationship to the second spec | **Supersede `payments-shell-reverification-spec.md`** — add a superseded note to its header, the way it did to the first. |
| D9  | The two untracked guard tests | **Out of scope for this pass — no commits.** They are re-verified where they sit. (See the resolution note at D15/D17 for the tension with an earlier answer.) |
| D10 | Guard coverage | **Generalize the render guard to every layout subtree** (D11 constrains the subject set). |
| D11 | Which subtrees the generalized guard renders | **Only subtrees whose layout renders `Protected` + `RoleShell`** — the exact class this defect can occur in. |
| D12 | Spec size | **Minimal close-out.** Supersede note + re-verify the guards + `AGENTS.md` correction. Nothing else — no environment runbook. |
| D13 | Local dev hygiene | **Documented as step one of re-verification**: route-tree regeneration, dev-server restart, port check, API-base check (§3.1). |
| D14 | What “closed” means | **Guards green, nothing else.** No planted-violation proof, no screenshot artifact, no docs gate. |
| D15 | Closure vs. docs *(conflict)* | **Closure = guards green; the docs corrections are separate deliverables.** Both are in the plan (§3.4, §3.5), but only the guard result decides whether the report is closed. |
| D16 | Final deliverable list | Superseded note · re-run the four project checks · generalize the render guard · rewrite the `AGENTS.md` guideline · dev-hygiene pre-check steps. |
| D17 | Committing the guards *(conflict)* | An earlier answer said “track/commit the two guard tests”; the final deliverable list omitted it. **Resolved as out of scope: no commits in this pass** (D9), and the untracked state is recorded as a risk (§7) and a known issue (§5). |
| D18 | Spec file name | **`payments-shell-two-pages-reverify-spec.md`.** |
| D19 | Stale-document claims to record | **`docs/qa/qa-spec-audit.md` §10.6 only.** The other three stale claims (`payments-feature-spec.md` §14, `docs/MANUAL.md`’s missing `migrate:local` step, `docs/specs/google-oauth.md` §8 / `docs/qa/qa-spec.md` S30) are recorded as *seen but not owned* in §5. |

---

## 2. Evidence gathered while writing this spec

All of §2 is read-only: source reads, `git show` of `HEAD` / `origin/main`, a local SQLite read of the
miniflare D1 file, `wrangler d1` reads against the shared database, and two `curl` probes of the
deployed API and the deployed Pages app. No file was modified.

### 2.1 Defect A — the doubled shell is **not reproducible from the current tree**

The rule the predecessors established: the payments **layouts** own the shell, the **leaves** render
content only. The tree obeys it:

| File | Router role | Parent route | `Protected` / `RoleShell` in the file |
| ---- | ----------- | ------------ | ------------------------------------- |
| `apps/web/src/routes/landlord/payments.tsx` | layout | `__root` | **yes** — `Protected` → `RoleShell` → `<Outlet />` |
| `apps/web/src/routes/landlord/payments/index.tsx` | leaf | `/landlord/payments` | **no** — the only matches are a comment naming where the shell lives |
| `apps/web/src/routes/landlord/payments/record.tsx` | leaf | `/landlord/payments` | **no** — zero references |
| `apps/web/src/routes/boarder/payments.tsx` | layout | `__root` | **yes** — `Protected` → `RoleShell` → `RequireTenancy` → `<Outlet />` |
| `apps/web/src/routes/boarder/payments/index.tsx` | leaf | `/boarder/payments` | **no** — comment only |
| `apps/web/src/routes/boarder/payments/pay.tsx` | leaf | `/boarder/payments` | **no** — zero references |

Supporting checks:

- `git show HEAD:<leaf> | grep -c RoleShell` → **0** for all four leaves, so the committed state is
  clean too; the wrappers only ever existed in the (uncommitted) payments work that has since been
  stripped.
- `apps/web/src/routeTree.gen.ts` nests the leaves under the two layouts:
  `getParentRoute: () => LandlordPaymentsRoute` for `/landlord/payments/` and
  `/landlord/payments/record`; `getParentRoute: () => BoarderPaymentsRoute` for
  `/boarder/payments/` and `/boarder/payments/pay`. So the router renders **one** shell per page, and
  the second sidebar + topbar in the screenshot cannot be produced from this source.
- The pattern is absent everywhere else: the earlier project-wide sweep recorded **75 route files,
  8 shell-owning layout routes, 22 nested leaf routes, 0 violations**.
- `origin/main` has **no payments routes at all** (`git ls-tree origin/main -- apps/web/src/routes`
  shows no `payments*` files), so no deployed build from `main` could have rendered this page either.

**Guards that already exist for this defect** (both **untracked** today):

| File | Kind | What it proves |
| ---- | ---- | -------------- |
| `apps/web/test/payments-shell.test.tsx` | render | For each of the four payments leaves: `<RoleShell nav={…}><Leaf /></RoleShell>` yields exactly one `aside.chrome-sidebar` and one `header.chrome-topbar`. |
| `apps/web/test/route-shell-ownership.test.ts` | static | Reads every route file, works out the layout subtrees, and fails naming any leaf that imports `RoleShell` or renders `<Protected>`. |

Combined with D1/D2 (screenshot predates the fixes, from local dev), the conclusion for this pass is:
**Defect A is a historical state, and the job is to re-prove the guards still hold and to widen them.**

### 2.2 Defect B — the red “Internal server error” is fixed locally

- **Local database:** the miniflare D1 the dev Worker uses
  (`workers/api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/b94889fad…sqlite`) records
  `d1_migrations` through **`0021_payments.sql`** — the migration that adds `payments.charge_type`,
  `application_id`, `period_start/end`, `generation_key`, `due_soon_reminded_at`,
  `deposit_resolution*`, the `payment_submissions` table, and the `properties` / `applications`
  columns the ledger queries. The stale-schema cause of the red panel is gone locally.
- **API error surface:** `workers/api/src/lib/http.ts` exports `SCHEMA_STALE_CODE =
  'database_schema_stale'`, `SCHEMA_STALE_MESSAGE`, and `isSchemaStaleError()` (matching
  `/no such column/i`, `/no such table/i`, `/has no column named/i`), and `responseFromError()` maps
  that family to **503** instead of the bare 500.
- **Client surface:** `apps/web/src/lib/payments.ts` exports `PAYMENTS_ERROR_HINT` naming
  `bun run --cwd workers/api migrate:local`, and `components/ui/ErrorState.tsx` supports `hint` and
  `action`, so the payments screens can explain a stale database instead of printing a bare server
  error.

So Defect B is verified as *implemented*; this pass only confirms it is still in place (§3.2).

### 2.3 The environment gap (recorded, not owned — D5)

The fixes above are local-only. The shared/deployed side is behind in a way that no code change here
addresses, and it is the reason a *deployed* payments page still cannot work:

| Probe | Result |
| ----- | ------ |
| Shared D1 `haven-space` (`bc45d25b-7e79-4418-9f8c-b53b206ffc44`, the only `haven-space` database in account `fab94f3e8a58d3b3509d01f11a67b843`) — `d1_migrations` | ends at **`0014_seed_sample_listings.sql`**. `0015`–`0021` unapplied, so `payment_submissions`, `payments.charge_type` etc. do not exist there. |
| Same database — table list | has `payments`, `applications`, `messages`, `notifications`, `conversations`, … but **no `payment_submissions`**. |
| Migration **numbering divergence** | The repo/local ledger has `0014_property_access.sql` + `0015_seed_sample_listings.sql`; the shared ledger records `0014_seed_sample_listings.sql`. The shared database predates a renumbering, so a blind `wrangler d1 migrations apply --remote` would run `0014_property_access` and re-run the seed (`0015` is `NOT EXISTS`-guarded, so it would not duplicate rows, but it is not a no-op). |
| `GET https://haven-space-api.floresaybaez574.workers.dev/api/landlord/payments` | **501** `{"error":"payments routes are not implemented in the Cloudflare Worker yet","code":"FEATURE_DEFERRED","feature":"payments"}` — the deployed Worker is an older build than the payments work. |
| `GET https://haven-space-api.floresaybaez574.workers.dev/api/health` | 200, `"environment":"production"` (the deployed Worker is reachable; it simply has no payments routes). |
| `GET https://haven-space.pages.dev/landlord/payments` | 200, app HTML (the shell is client-gated, so the SSR HTML contains no `chrome-sidebar`); `origin/main` contains no payments route files, so the deployed Pages app does not serve this page from `main`. |
| Branch position | `feat/apple-ui-restructure-qa-hardening` is **476 commits ahead of `origin/main`** and in sync with `origin/feat/apple-ui-restructure-qa-hardening`. |

### 2.4 Why the report stayed open

| Gap | Detail |
| --- | ------ |
| The two earlier passes changed code but nothing was committed | The shell fix lives in the working tree, the guard tests are untracked, and `origin/main` still has no payments routes. Anything measuring “what is deployed” sees none of it. |
| The guards are not under version control | `apps/web/test/payments-shell.test.tsx` and `apps/web/test/route-shell-ownership.test.ts` are `??` — a `git clean`, a fresh clone, or a CI run on another branch has no regression guard at all. |
| A green build was never the same as the browser | The screenshot came from a dev server whose bundle was built before the fix; the second predecessor planned a browser check (its D5/D12) and this pass replaces that bar with the automated guards (D6). |
| The claim in `docs/qa/qa-spec-audit.md` §10.6 was never corrected | It still lists the payments pages as verified single-shell. |

---

## 3. Plan (approved, not yet executed)

### 3.1 Step one — dev hygiene pre-check (D13)

The defect was only ever seen in local dev, so the environment must be provably current before anything
is re-verified. Write the results of each step into the implement log (§8).

1. **Regenerate the route tree.** Route files changed since the dev server started; per `AGENTS.md` the
   tree is regenerated by the build: `bun run web:build` (it rewrites
   `apps/web/src/routeTree.gen.ts`). Confirm the four payments leaves still nest under their layouts.
2. **Restart both dev servers**, don’t hot-reload an old module graph:
   `bun run web:dev` (expect `http://localhost:3000`) and `bun run cf:api:dev` (expect
   `http://localhost:8000`).
3. **Confirm the API base the browser will actually use.** `apps/web/src/lib/config.ts` resolves in
   this order: `?apiBaseUrl=` query override → `localStorage['havenSpaceApiBaseUrl']` → localhost
   default (`http://localhost:8000`) → deployed default
   (`https://haven-space-api.floresaybaez574.workers.dev`). **A saved override or a non-localhost
   hostname silently points local dev at the deployed API, which 501s payments (§2.3)** — clear it with
   `/landlord/payments?apiBaseUrl=clear` and re-check.
4. **Confirm the local database is at `0021`** before treating an empty ledger as “no charges yet”:
   `bun run --cwd workers/api migrate:local` is a no-op when already applied. Expect
   `d1_migrations` to end at `0021_payments.sql`.

### 3.2 Re-verify the existing guards (D6, D14)

Run the four project checks and record the result of each:

```bash
bun run cf:api:typecheck
bun run cf:api:test          # includes the schema-stale error mapping coverage
bun run web:typecheck
bun run web:test             # includes payments-shell.test.tsx + route-shell-ownership.test.ts
```

Record: pass/fail per check, the number of tests run, and the specific names of the two guard tests in
the output. What the guards must still show:

- `payments-shell.test.tsx` — exactly **one** `aside.chrome-sidebar` and one `header.chrome-topbar` per
  rendered payments tree, with the page’s own heading present (so a vacuous render fails).
- `route-shell-ownership.test.ts` — **0 violations**, and it names the offending file when it fails.

No browser session, no screenshots, no headless script (D6, D14).

### 3.3 Generalize the render guard to every layout subtree (D10, D11)

Extend the render guard so the payments routes stop being a special case:

1. **Subjects = subtrees whose layout renders `Protected` + `RoleShell`** (D11). Determine them by
   reading source, not from a hand-kept list — a layout qualifies when it imports
   `components/layout/RoleShell` and renders `<Outlet />`. Today that is **8 layouts**:
   `boarder/applications.tsx`, `boarder/find-a-room.tsx`, `boarder/messages.tsx`,
   `boarder/payments.tsx`, `landlord/listings.tsx`, `landlord/messages.tsx`,
   `landlord/payments.tsx`, `landlord/properties.tsx`.
2. **Explicitly excluded** (not shell-owning layouts, so a leaf there may legitimately render its own
   chrome or none): `__root.tsx`, `auth/signup.tsx`, `boarder/find-a-room/$id.tsx`.
3. **Per leaf**: render `<RoleShell nav={…}><Leaf /></RoleShell>` and assert exactly one sidebar and one
   topbar **and** that the page’s own heading text rendered. Reuse the scaffolding pattern already in
   `payments-shell.test.tsx` (the `@tanstack/react-router` module mock with `createFileRoute`,
   `Link`, `Outlet`, `useNavigate`, `useLocation`, `QueryClientProvider`, `AuthProvider`, and the
   empty-but-valid `fetch` stub).
4. **Record the enumerated subject count** in the implement log: how many shell-owning layouts and how
   many leaves under them the guard actually rendered. Expected scale, from the earlier sweep: 8
   shell-owning layouts and 22 nested leaf routes across all layout subtrees.
5. Keep `route-shell-ownership.test.ts` as the failure-message-producing companion; the two tests are
   complementary and both stay.

**File layout:** add the generalized cases to the existing
`apps/web/test/payments-shell.test.tsx`, or split a shared helper out and add a sibling test — decided
at implement time, whichever keeps each test file readable. Do not delete the payments cases: they are
the originally reported route set.

### 3.4 Rewrite the `AGENTS.md` shell guideline (D7)

`AGENTS.md` line 86 currently reads:

```
- **Role shells:** Wrap role pages in `<Protected role="...">` + `<RoleShell>`; configure nav in `apps/web/src/lib/nav.ts`.
```

That sentence is the root cause of this defect: followed literally on a leaf under a payments layout, it
produces the second sidebar. Replace it with the layout-owns-the-shell rule, in the project’s existing
`AGENTS.md` voice, covering:

- `Protected` + `RoleShell` belong to the **layout** route (`X.tsx` with `<Outlet />`); leaves render
  content only. Exactly one shell per subtree.
- Nav config still lives in `apps/web/src/lib/nav.ts` and reaches the layout.
- A leaf that renders its own shell nests a second sidebar and topbar — the “two payments pages”
  regression.
- The rule is enforced by `apps/web/test/route-shell-ownership.test.ts` and
  `apps/web/test/payments-shell.test.tsx`, so adding a shell to a leaf fails the suite.

Keep it brief — one bullet, same section, no new section. Do not restructure the file, and do not touch
the “Role shells” wording elsewhere in `AGENTS.md` unless it contradicts the new rule.

### 3.5 Supersede the second spec (D8)

At the top of `payments-shell-reverification-spec.md`, add a note in the same style the first spec
received:

- this pass supersedes it,
- what it recorded that still holds (both fixes, the guards, the 503 mapping — all verified present),
- what is new: the shell defect is confirmed **historical**, the guards are generalized, the
  `AGENTS.md` guideline is corrected, and the remaining gap is environmental (§2.3), recorded but not
  owned.

The file stays in the tree; do not delete or rewrite its decisions.

---

## 4. Verification and acceptance

### 4.1 Checks

```bash
bun run cf:api:typecheck
bun run cf:api:test
bun run web:typecheck
bun run web:test
```

All four must pass, and the two guard tests must appear in the `web:test` output with zero violations.

### 4.2 Acceptance criteria

1. The four project checks pass, with the guard tests present in the run (D6, D14).
2. `route-shell-ownership.test.ts` reports **0 violations** across the whole routes tree.
3. The generalized render guard renders **every** leaf under a shell-owning layout and observes exactly
   one `aside.chrome-sidebar` and one `header.chrome-topbar` per subtree, plus the page’s own heading.
4. The `AGENTS.md` shell guideline describes the layout-owns-the-shell rule and names the guard tests.
5. `payments-shell-reverification-spec.md` carries a superseded note pointing at this file.
6. The dev-hygiene pre-check (§3.1) is recorded in the implement log with its observed results.

### 4.3 Closure

**Closed when the guards are green** (D14/D15). The docs corrections (2.4, 3.4, 3.5) are deliverables
of the same pass but do not gate closure. No browser session, screenshot, planted-violation proof, or
headless script is required — a deliberate reduction from the second spec’s D5/D12 bar, which is
recorded here so the difference is not read as an omission.

---

## 5. Known issues recorded, not addressed

| # | Issue | Evidence |
| - | ----- | -------- |
| K1 | `docs/qa/qa-spec-audit.md` §10.6 still claims the payments pages are “single shell, no duplicates”. | §10.6 lists “landlord … payments, boarders, applications — **single shell, no duplicates**” as a passed spot-check. Selected for recording in D19; **correction is out of scope for this pass.** |
| K2 | The **shared** D1 `haven-space` is 7 feature-migrations behind. | `d1_migrations` ends at `0014_seed_sample_listings.sql`; no `payment_submissions`; `payments` lacks `charge_type`. |
| K3 | The shared database’s migration ledger **diverges in numbering** from the repo. | Shared has `0014_seed_sample_listings.sql`; repo has `0014_property_access.sql` + `0015_seed_sample_listings.sql`. A blind remote apply would also re-run the (`NOT EXISTS`-guarded) seed. |
| K4 | The **deployed API has no payments routes**: `GET /api/landlord/payments` → **501 `FEATURE_DEFERRED`**. | `curl` probe, §2.3. |
| K5 | The **deployed Pages app** (built from `main`) contains no payments routes at all, and this branch is 476 commits ahead of `origin/main`. | `git ls-tree origin/main`, §2.3. |
| K6 | The two shell guards are **untracked**, so nothing guards this regression in version control. | `git status --short apps/web/test` → `?? …/payments-shell.test.tsx`, `?? …/route-shell-ownership.test.ts`. Out of scope per D9/D17. |
| K7 | Other stale claims seen but not owned: `payments-feature-spec.md` §14 “as shipped” reads clean; `docs/MANUAL.md` has no `migrate:local` step; `docs/specs/google-oauth.md` §8 and `docs/qa/qa-spec.md` S30 still describe payments as deferred. | Recorded for a future docs pass (D19). |

---

## 6. Explicitly not doing

- **No commits and no branch operations.** The guard tests stay untracked; nothing is staged, pushed, or
  merged (D9, D17).
- **No environment runbook.** No remote migration, no staging/production apply, no deploy — K2–K5 are
  recorded, not fixed (D5, D12).
- **No seeding or back-filling** of payment rows; the ledger stays empty until a real booking confirms.
- **No runtime invariant** (no context-based “nested shell” throw/warn in `RoleShell`); the guards remain
  the enforcement mechanism.
- **No browser verification, screenshots, headless login script, or planted-violation proof** (D6, D14).
- **No consolidation of the three specs** into one file, and no deletion of the predecessors.
- **No changes to the ledger’s endpoints, payloads, filters, or summary shape**, and none to the
  `.chrome-sidebar` / `.chrome-topbar` materials or `RoleShell`’s single-scroll-column contract.
- **No re-litigation** of the inherited decisions: layout owns the shell; `RequireTenancy` stays in
  `boarder/payments.tsx`; the 503 `database_schema_stale` mapping stays.

---

## 7. Risks

| Risk | Mitigation |
| ---- | ---------- |
| The render guard passes vacuously (a mock renders nothing and “one sidebar” is never true). | Assert `length === 1` for both shell roots **and** that the page’s own heading rendered; the existing payments guard already does this — keep it in the generalized version. |
| Generalizing pulls in layouts that do not own a shell (`__root`, `auth/signup`, `boarder/find-a-room/$id`) and produces false failures. | Subject set is derived from source (a layout qualifies only if it imports `RoleShell` and renders `<Outlet />`), and the exclusions are listed explicitly in §3.3. |
| The generalized guard’s subject list silently goes stale as routes are added. | Enumerate from the filesystem at test time; record the observed counts in the implement log each run. |
| Untracked guards can vanish (`git clean`, fresh clone, CI on another branch). | Recorded as K6 and flagged to the owner; committing them is the identified follow-up, out of scope here. |
| `localStorage['havenSpaceApiBaseUrl']` or a non-localhost hostname points local dev at the deployed API, which 501s payments — re-creating a false “payments is broken” signal. | Step 3.1.3 clears the override and re-checks before anything is judged. |
| Someone reads “guards green” as “the deployed app works”. | §2.3 and K2–K5 state plainly that the deployed API 501s payments and the shared database is behind; acceptance §4.3 covers the local tree only. |
| `0014`–`0021` applied blindly to the shared database later, re-running the seed under its old number. | K3 records the numbering divergence and the `NOT EXISTS` guard so the eventual apply is done deliberately. |

---

## 8. Implement log

_Empty — this spec was written before any change. Fill in while executing §3:_

- ( ) §3.1 dev hygiene: route tree regenerated — result: …
- ( ) §3.1 dev hygiene: dev servers restarted, ports confirmed — result: …
- ( ) §3.1 dev hygiene: API base confirmed local (override cleared) — result: …
- ( ) §3.1 dev hygiene: local `d1_migrations` ends at `0021_payments.sql` — result: …
- ( ) §3.2 `cf:api:typecheck` — result: …
- ( ) §3.2 `cf:api:test` — result (count): …
- ( ) §3.2 `web:typecheck` — result: …
- ( ) §3.2 `web:test` — result (count, guard test names): …
- ( ) §3.3 generalized guard: shell-owning layouts / leaves rendered — count: …
- ( ) §3.3 generalized guard: violations — expected 0 — result: …
- ( ) §3.4 `AGENTS.md` shell guideline rewritten — result: …
- ( ) §3.5 superseded note added to `payments-shell-reverification-spec.md` — result: …
