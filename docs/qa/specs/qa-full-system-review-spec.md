# Haven Space — Full-System QA Sweep & `report.md` Spec

**Request (verbatim):** "in `Seed_Credentials_QA.md` you will have a email@email.com and password: admin, this is
your credentials for using loggin in both landlord and boarder, This md is for QA puporses you will run review the
system, and find all sorts of bug and then create a report.md before implementing"

**Status:** Spec only — **no code has been changed**. This document is the agreed plan; implementation begins only
after `report.md` exists (§7, §9).

**Short name:** `qa-full-system-review`

> **Amended 2026-09-26 (`boarder-find-a-room-redirect-spec.md`).** The boarder browse grid and
> listing detail were retired: `/boarder/find-a-room` → `/find-a-room` and
> `/boarder/find-a-room/$id` → `/rooms/$id` (client-side redirects). Only
> `/boarder/find-a-room/$id/{apply,tour}` still render inside the boarder shell. Route
> inventories below that list the old URLs are otherwise still accurate.

---

## 0. Context Gathered Before Interviewing

| Finding                                | Evidence                                                                                                                                                                                                                                                                                                                                                              | Consequence for this run                                                                                                  |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `Seed_Credentials_QA.md` is **empty**  | `wc -c` → `0`; file is untracked, created `2026-09-22 22:59`                                                                                                                                                                                                                                                                                                          | The promised `email@email.com` / `admin` credentials do not exist in the repo or the DB. QA accounts must be seeded (§3). |
| No `email@email.com` user, no admin    | Local D1 `users`: only `id 1 JOHN DIGAL <2401115560@student.buksu.edu.ph>` (boarder, no Google) and `id 2 Kat Is Hungry <amlhungrykat@gmail.com>` (boarder, `google_id` set, created `2026-09-22 14:57:58`)                                                                                                                                                           | Admin **and** landlord accounts do not exist and must be created (§3). Your Google account already has a boarder account. |
| Local data is empty                    | `properties = 0`, `rooms = 0`, `applications = 0`                                                                                                                                                                                                                                                                                                                     | No listing/application UI can be exercised until seeds exist (§3).                                                        |
| Migrations applied only through `0014` | `d1_migrations` lists `0001…0014`; repo has `0015_seed_sample_listings.sql`, `0016_onboarding_fields.sql`, `0017_admin_audit_log.sql` pending                                                                                                                                                                                                                         | `bun run db:setup` must run first or onboarding/audit-log features will fail against a stale schema.                      |
| Demo seeds already exist in `0015`     | Landlords `lina.santos@haven.demo`, `ramon.delacruz@haven.demo`, `maria.reyes@haven.demo`, password `Landlord123!`, plus listings/rooms/addresses                                                                                                                                                                                                                     | Use these as the official landlord fixtures instead of inventing new ones.                                                |
| No admin anywhere in migrations        | `grep "'admin'" workers/api/migrations` → only the `role` CHECK constraint                                                                                                                                                                                                                                                                                            | Admin is inserted via SQL with a bcrypt hash (§3.2).                                                                      |
| Surface size                           | 71 web route files (`apps/web/src/routes/**/*.tsx`); 21 API test files; 8 web test files                                                                                                                                                                                                                                                                              | The sweep is exhaustive and must be split into waves (§4).                                                                |
| Prior QA history sets conventions      | `docs/qa/specs/qa-spec.md`, `docs/qa/specs/qa-spec-audit.md` — S1–S4 severity, `report` tables, `qa-screenshots/`, `<runid>` = `YYYYMMDD-HHMM`, bug-log fields repro/expected/actual/evidence/fix                                                                                                                                                                                 | report.md reuses this house format (§7) rather than inventing a new one.                                                  |
| Deferred features are intentional      | `workers/api/src/routes/deferred.ts` → `code: 'FEATURE_DEFERRED'` (HTTP 501)                                                                                                                                                                                                                                                                                          | Payments/messages are still logged as bugs when the **UI misleads the user** about them, not merely for returning 501.    |
| Environment was broken, now healthy    | Earlier today: `zod` missing from `workers/api/node_modules` → `wrangler dev` failed to bundle; orphaned `workerd.exe` held `127.0.0.1:8000`; Vite had drifted to `:3001`. Fixed: zod installed, processes cleaned, `workers/api/.dev.vars` created, servers on `:8000` (API) and `:3000` (web)                                                                       | QA starts from a working baseline; §2 records it so the run is reproducible.                                              |
| Uncommitted work in the tree           | 9 modified files: `apps/web/src/lib/config.ts`, `apps/web/src/routes/__root.tsx`, `auth/login.tsx`, `auth/signup/index.tsx`, `auth/signup/landlord.tsx`, `auth/choose-role.tsx`, `apps/web/src/components/auth/AuthSplitLayout.tsx`, `apps/web/src/routeTree.gen.ts`, `workers/api/src/index.ts`, `workers/api/src/routes/auth/helpers.ts`                            | These ship as part of "the system" and every finding is attributed to them or marked pre-existing (§7.4).                 |
| Possible duplicate/overlapping routes  | `auth/signup.tsx` + `auth/signup/index.tsx`; `auth/choose.tsx` + `auth/choose-role.tsx`; `boarder/find-a-room.tsx` + `boarder/find-a-room/index.tsx`; `boarder/applications.tsx` + `boarder/applications/index.tsx`; `landlord/listings.tsx` + `landlord/listings/index.tsx`; `landlord/payments.tsx` + `landlord/payments/index.tsx`; `maps.tsx` + `public-maps.tsx` | Explicitly probed for dead/duplicate UI and wrong redirects (a class you asked to log).                                   |

---

## 1. Decisions Locked in the Interview

| Topic                        | Decision                                                                                                                                                                                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Credentials**              | **I create the seed accounts and write `Seed_Credentials_QA.md`** with a full credential table + re-seed/reset guide.                                                                                                                                    |
| **Browser driver**           | **You** run the **Freebuff desktop preview** preview and drive the clicks; I never assume a browser tool. I verify every claim behind the UI (curl + SQL + code + tests).                                                                                |
| **Collaboration workflow**   | **Wave checklists → you report back → I verify → next wave.** Checklists live **inside `report.md` as an appendix** (§7.5).                                                                                                                              |
| **Environment**              | **Local only** — frontend `http://localhost:3000`, API `http://localhost:8000`, local D1 in `workers/api/.wrangler`. Production is **not** touched.                                                                                                      |
| **Scope**                    | **Everything — all 71 routes**, plus cross-cutting, negative, and edge cases (deliberately more than the previous two QA passes).                                                                                                                        |
| **Data policy**              | **Full freedom on local data** — I may seed, mutate, and delete local D1 rows to build/re-run scenarios. Production data is out of reach and out of scope.                                                                                               |
| **Report**                   | **Single root `report.md`**, house format, **written once at the end** (after all waves), with the checklist appendix retained inside it.                                                                                                                |
| **Fix mandate**              | **Report first, then fix all confirmed bugs in severity order (S1→S4)**, re-verifying each and recording before/after.                                                                                                                                   |
| **S1 handling**              | **Fix blockers immediately**, mid-sweep, whenever they stop the current wave; continue the sweep afterwards.                                                                                                                                             |
| **Diff policy**              | **Minimal diff by default** — no refactors, no new dependencies. If a bug truly cannot be fixed minimally, I do it and justify it in the report. **Schema/migration changes require your approval first.**                                               |
| **Regression tests**         | **Every fixed bug gets a regression test** in the matching suite (`workers/api` and/or `apps/web`) where applicable.                                                                                                                                     |
| **Evidence (all required)**  | Screenshots per bug · curl request/response · SQL/DB snapshots · console/network log excerpts · baseline + post-fix test-suite and typecheck runs.                                                                                                       |
| **Third-party features**     | **Exercised live**: Gemini/AI pages, UploadThing uploads (real files into your UploadThing account), Google OAuth signing in with **your real Google account**.                                                                                          |
| **Google OAuth scope**       | Existing-account login path verified live with `amlhungrykat@gmail.com`; new-email signup already proven earlier today (user id 2) and re-checked where possible.                                                                                        |
| **Bug classes logged**       | Crashes/dead ends · deferred-feature (501) UX gaps · dead/duplicate UI & wrong redirects · missing loading/empty/error states · validation & error handling · access control & auth · responsive/layout · a11y · console & network errors · performance. |
| **Severity scheme**          | **S1 blocker · S2 major · S3 minor · S4 cosmetic**, with `PASS / FAIL / BLOCKED / NOT TESTABLE` per scenario.                                                                                                                                            |
| **Worktree attribution**     | **Every bug entry states** whether it is caused by the 9 uncommitted auth files or is pre-existing.                                                                                                                                                      |
| **Out of scope (fix phase)** | No architectural refactors, no dependency upgrades, no migration/schema edits without approval, no CI/deploy edits, no restyling of shared UI primitives beyond a bug's need.                                                                            |

---

## 2. Environment & Preconditions

### 2.1 Verified current state

| Item            | State                                                                                                                                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API             | `http://localhost:8000` — `GET /api/health` → `200 {"environment":"local"}` (wrangler dev)                                                                                                                                                                          |
| Web             | `http://localhost:3000` — `GET /auth/login` → `200` (Vite/TanStack Start)                                                                                                                                                                                           |
| API deps        | `bun install --cwd workers/api` run today — **`zod@4.4.3` now present**                                                                                                                                                                                             |
| API secrets     | `workers/api/.dev.vars` **created today** from root `.env`: `APP_ENV`, `APP_DEBUG`, `APP_BASE_URL`, `ALLOWED_ORIGINS`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GEMINI_API_KEY` (values never printed; file is gitignored) |
| OAuth config    | `GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback`; authorize → `302` to `accounts.google.com` verified                                                                                                                                           |
| Backup fallback | `apps/web/.dev.vars` contains only `API_BASE_URL`; frontend also auto-detects localhost → `http://localhost:8000` via `apps/web/src/lib/config.ts` (`?apiBaseUrl=` override available if a mismatch appears)                                                        |

### 2.2 Required setup before Wave 1

1. `bun install` · `bun install --cwd workers/api` · `bun install --cwd apps/web` (idempotent).
2. `bun run db:setup` → applies `0015_seed_sample_listings`, `0016_onboarding_fields`, `0017_admin_audit_log`.
3. Re-verify `GET /api/health` and `GET /auth/login` after the migration (schema change → restart `cf:api:dev`).
4. Confirm the two dev servers are the **only** listeners on `:3000` / `:8000` (stale duplicates caused today's port-drift bug).
5. Record the **baseline** test/typecheck results (§6.5) **before** any fix, so post-fix runs can be compared.

### 2.3 Known environment preconditions

- Local-only: no email delivery (verification/reset emails are admin- or token-driven), so email-dependent steps are validated via DB/token evidence, not inboxes.
- Payments/messages/announcements gaps return `501 FEATURE_DEFERRED` by design.
- Vite binds `:3000`; if it ever falls back to `:3001`, OAuth origin handling changes (the API's `APP_ENV=local` now allows any localhost port, but the callback still prefers a trusted origin) — record the actual port in the report.

---

## 3. Seed Plan & `Seed_Credentials_QA.md`

`<runid>` = `YYYYMMDD-HHMM` (e.g. `20260922-2310`), matching the previous specs, so runs never collide.

### 3.1 Accounts to create

| Role                      | Email                             | Password         | Required DB state                                                              | Purpose                                                |
| ------------------------- | --------------------------------- | ---------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------ |
| Admin                     | `admin@example.com`               | `AdminPass123`   | `role='admin'`, `is_verified=1`, `email_verified=1`, `account_status='active'` | Approvals, moderation, audit log, all admin tabs       |
| Landlord (demo, verified) | `lina.santos@haven.demo`          | `Landlord123!`   | seeded by migration `0015`                                                     | Primary landlord fixtures (Sunrise Boarding House)     |
| Landlord (demo, verified) | `ramon.delacruz@haven.demo`       | `Landlord123!`   | seeded by migration `0015`                                                     | Second landlord (Greenfield Dormitory)                 |
| Landlord (demo, verified) | `maria.reyes@haven.demo`          | `Landlord123!`   | seeded by migration `0015`                                                     | Third landlord (Taft Tower Residences)                 |
| Landlord (unverified, QA) | `qa.landlord.<runid>@example.com` | `StrongPass123`  | created via UI signup → `pending_verification`, `is_verified=0`                | Verification gate, admin-approval journey              |
| Boarder (Google-linked)   | `amlhungrykat@gmail.com`          | — (Google login) | existing user id 2, `google_id` set                                            | OAuth existing-account path, boarder journey           |
| Boarder (email/password)  | `2401115560@student.buksu.edu.ph` | known to you     | existing user id 1                                                             | Password login journey, second boarder                 |
| Boarder (QA, fresh)       | `qa.boarder.<runid>@example.com`  | `StrongPass123`  | created via UI signup → status `new`                                           | Clean apply → accept → confirm journey                 |
| Boarder (2nd, edge cases) | `qa.boarder2.<runid>@example.com` | `StrongPass123`  | created via UI signup                                                          | Multi-apply, double-booking, concurrent-room scenarios |

### 3.2 Seeding mechanics

- **Admin hash:** generate with the project's own bcrypt (`bun -e "import b from 'bcryptjs';console.log(b.hashSync('AdminPass123',10))"` from `workers/api`) and insert via `wrangler d1 execute haven-space --local --command "INSERT INTO users (...) VALUES (...)"`.
- **UI-first rule:** only accounts that must exist _before_ a flow starts (admin, demos) are SQL-seeded; QA landlord/boarder accounts are created **through the real signup UI** so the signup flow itself is under test.
- **Idempotency:** every seed uses `WHERE NOT EXISTS`-style guards or is recorded as already-existing, so re-running the sweep does not duplicate rows.

### 3.3 `Seed_Credentials_QA.md` contents (written by me)

1. Banner: **local-only QA credentials, never use against production, dataset may be wiped at any time.**
2. Role → email → password → status table (§3.1) including which Google account is linked.
3. Per-run accounts table (timestamped `<runid>` accounts + what each exercised).
4. **Reset guide:** wipe and re-migrate local D1 (`rm -rf workers/api/.wrangler/state/v3/d1` → `bun run db:setup`), re-seed admin, restart both dev servers, and how to re-point the frontend if the API base ever drifts (`?apiBaseUrl=http://localhost:8000`).
5. Note that the file is currently **untracked**; recommendation to keep it untracked/gitignored so credentials never land in git history.

---

## 4. Wave Plan — All 71 Routes

Waves are ordered so each builds on the data the previous one created. `W1 → W5` are functional; `W6` is cross-cutting.

### W1 — Public site (logged out)

`/` · `/our-story` · `/teams` · `/for-landlords` · `/haven-ai` · `/maps` · `/public-maps` · `/find-a-room` · `/find-a-room/$id` · `/rooms/$id` · `/legal/privacy-policy` · `/legal/terms-of-service` · `/legal/user-agreement` · unknown URL (404) · `__root` shell.

Checks: every header/footer/hero/CTA link resolves; FAQ/accordion toggles; maps render; find-a-room search/filter/sort; room detail; no lorem/blank sections; no duplicated sections; no page reachable _only_ by typing its URL; the AI page (`/haven-ai`) responds via Gemini or fails gracefully.

### W2 — Auth & onboarding

`/auth/login` · `/auth/signup` (`signup.tsx` **and** `signup/index.tsx`) · `/auth/signup/landlord` · `/auth/choose` · `/auth/choose-role` · `/auth/forgot-password` · `/auth/reset-password` · `/auth/verify-email` · `/onboarding` · `/onboarding/boarder` · `/onboarding/landlord`.

Checks: email/password login + logout; validation (mismatch, <8 chars, invalid email, duplicate email 409, invalid PH phone); Google OAuth full redirect chain with your account (state cookie, `#auth=` hash, `#google-pending=` chooser, link-existing-account path, cancelled consent, tampered/expired state, wrong-role attempt); redirect-on-login matrix (`accepted → /boarder/confirm-booking`, `confirmed → /boarder`, `landlord → /landlord`, `admin → /admin`); the duplicate `signup.tsx`/`choose.tsx` routes; refresh/back during the OAuth handoff; session persistence in localStorage.

### W3 — Boarder

`/boarder` · `/boarder/find-a-room` (+ `index`, `$id`, `$id/apply`, `$id/tour`, `rooms/$id`) · `/boarder/applications` (+ `index`, `$id`, `settings`) · `/boarder/application-submitted` · `/boarder/confirm-booking` · `/boarder/tenancy` · `/boarder/house-rules` · `/boarder/announcements` · `/boarder/messages` · `/boarder/maps` · `/boarder/payments` (+ `pay`) · `/boarder/settings` · `/boarder/rooms/$id`.

Checks: dashboard states per boarder status; apply (incl. duplicate apply, occupied room, missing message/room); withdraw (pending + accepted); confirm booking → room becomes occupied; tenancy page + leave request; multi-apply cancellation on confirm; announcements/payments/messages deferred behavior; profile/settings edits; every sidebar nav item reachable.

### W4 — Landlord

`/landlord` · `/landlord/verification` · `/landlord/onboarding` · `/landlord/listings` (+ `index`, `create`, `$id/edit`, `rooms/$id/edit`) · `/landlord/properties` · `/landlord/applications` · `/landlord/boarders` · `/landlord/invitations` · `/landlord/calendar` · `/landlord/activity` · `/landlord/announcements` · `/landlord/messages` · `/landlord/maps` · `/landlord/payments` (+ `record`) · `/landlord/pricing` · `/landlord/settings`.

Checks: unverified landlord blocked from listing writes (403 + banner); create/edit listing (validation, amenities, photos via UploadThing, room_count/capacity, auto-publish); verification-page behavior after admin approval; accept/reject application; boarder list + invitations; announcements targeting; payments recording; pricing; settings; every nav item reachable and each page renders inside `RoleShell`.

### W5 — Admin

`/admin` — all tabs: overview/command center, landlords (approve/reject), properties/moderation (publish/reject/flag), users, applications, audit log, platform settings.

Checks: every stat card + table renders (no `undefined.data` crashes); approve/reject landlord and verify the landlord's next login; moderation actions reflected on the public listing; bulk selection/bulk operations; audit log entries after each admin action; pagination/filters/sort; empty states.

### W6 — Cross-cutting

- **Access control:** logged-out → `/auth/login`; boarder→landlord/admin URLs; landlord→boarder/admin; admin→boarder/landlord; direct-URL access for every role page; API 401/403 parity (curl both roles).
- **State resilience:** refresh, back/forward, deep-link with query + hash, multi-tab session change, logout in one tab, token/refresh behavior, session expiry.
- **Responsive:** 375px, 768px, 1440px on the primary page of each role.
- **a11y:** keyboard-only pass (focus order, traps, visible focus), labels/alt text, contrast, form error association, dialog/sheet focus handling.
- **Console/network:** zero unexplained console errors and no failed requests on page load for every wave page (console + network excerpts captured where they fire).
- **Performance:** page-load timing for the heaviest routes (boarder/landlord/admin dashboards, find-a-room, room detail); note slow TTFB, oversized payloads, blocking requests.
- **Data integrity:** DB state matches UI after each mutating action (apply/accept/confirm/withdraw/approve/moderate), including soft-deletes and cross-user visibility.

---

## 5. Scenario Matrix (per wave)

Each wave's checklist is a numbered list written into the `report.md` appendix (§7.5) with, per scenario:

| Field         | Content                                                            |
| ------------- | ------------------------------------------------------------------ |
| ID            | `W<wave>-S<n>` (plus a `P0` marker for journey-critical scenarios) |
| Preconditions | Which account/role, which seeded data must exist                   |
| Steps         | Exact URL, inputs (values to type), clicks in order                |
| Expected      | UI result + API status/body + DB state                             |
| Actual        | Filled from your report-back                                       |
| Status        | `PASS` / `FAIL` / `BLOCKED` / `NOT TESTABLE`                       |
| Bug           | `BUG-nn` link when it failed                                       |

Mandatory coverage per wave: **positive path, negative path, edge case, and a "re-process / repeat action" case** (repeat submit, double click, back-then-resubmit, re-approve an already-verified landlord, apply twice, confirm twice).

---

## 6. Evidence Requirements

Every `BUG-nn` entry must carry all of the following (none optional):

1. **Screenshots** → `qa-screenshots/<runid>/BUG-nn-<slug>.png` (before and, after a fix, after).
2. **curl request/response** → command, status code, and body for the failing call _and_ the expected call where an API exists.
3. **SQL/DB snapshot** → the query used and the rows that prove the wrong state (password hashes never included).
4. **Console/network excerpt** → the console error text / failed request (status, URL) you paste from the preview.
5. **Suite + typecheck runs** → baseline (before fixes) and post-fix results for `bun run cf:api:test`, `bun run web:test`, `bun run cf:api:typecheck`, `bun run web:typecheck`.
6. **Attribution** → "caused by uncommitted auth work" vs "pre-existing", naming the file(s) involved.

---

## 7. `report.md` Structure (root, house format)

```
# Haven Space — QA Sweep Report (<runid>)
## 1. Decisions locked in the interview        (table, mirrors §1 of this spec)
## 2. Environment                              (URLs, versions, DB state, seeds, servers)
## 3. Test data used                           (accounts created/consumed, <runid>)
## 4. Scenario results                         (per wave: ID | scenario | status | notes)
## 5. Bug log                                  (BUG-nn, S1–S4, full evidence per §6)
## 6. Edge cases discovered                    (table: case | where | actual | verdict | fixed?)
## 7. Fixes applied                            (bug → files changed → before/after → test added)
## 8. Verification after fixes                 (re-run suites, typechecks, re-walked scenarios)
## 9. Summary                                  (counts by severity, exit criteria, residual risks)
## 10. Needs decision / open questions         (anything not fixed + why)
## Appendix A. Wave checklists                 (the ticked checklists used during the sweep)
## Appendix B. Commands & artifacts            (curl/SQL/log excerpts, screenshot index)
```

### 7.1 Bug entry template

```
### BUG-nn: <one-line symptom>
- Severity: S1|S2|S3|S4
- Wave / scenario: W3-S14
- Attribution: caused by uncommitted auth changes (<file>) | pre-existing (<file>)
- Repro: numbered steps, exact URL + inputs
- Expected: UI + API + DB
- Actual: UI + API + DB (status/body quoted)
- Evidence: screenshot path · curl · SQL result · console/network excerpt
- Impact: who is affected, how often, what is blocked
- Status: open | fixed in this run (<fix summary>) | needs decision
```

### 7.2 Status rules

- `BLOCKED` when a predecessor bug/seed gap prevents reaching the scenario — blocked scenarios still get an entry and a bug link.
- `NOT TESTABLE` only with a reason (e.g. a third-party step that cannot be reproduced), never as a silent skip.

### 7.3 Independence rule

The report is written **after** the sweep, from evidence — no bug is closed by "looks fine now" without a re-run, and no finding is dropped because it seems minor (S4 still gets a row).

### 7.4 Uncommitted-change attribution

For each finding, name the specific uncommitted file(s) if involved (`config.ts` API-base detection, `__root.tsx` hash handling, `AuthSplitLayout.tsx` Google button state, `login.tsx`/`signup/index.tsx`/`choose-role.tsx` OAuth handling, `index.ts` CORS origin resolution, `auth/helpers.ts` OAuth cookie/origin logic) or mark it pre-existing with the commit/area it predates.

### 7.5 Wave checklists inside the report

Appendix A holds the checklists the sweep actually used, ticked with `PASS/FAIL` and bug IDs, so the report is self-contained and replayable.

---

## 8. Process (per wave)

1. I publish the wave checklist (Appendix A) and confirm all seeds/accounts for that wave exist.
2. **You** drive the Freebuff desktop preview: follow the numbered steps, screenshot failures, and report back results plus any console/network output.
3. I verify independently: curl the API, SQL the DB, read the relevant route/component code, and run targeted tests.
4. Discrepancies between your observation and my verification are resolved before logging (either a bug in the app, or a wrong expectation in the checklist — the latter amends the checklist).
5. Findings accumulate in working notes; S1 bugs are fixed immediately (§9) and the wave continues.
6. Next wave until W1–W6 are complete, then `report.md` is written in full.

---

## 9. Fix Phase (after `report.md`)

1. Fix all confirmed bugs **in severity order** (S1 → S4), smallest viable diff, no new dependencies, no refactors.
2. A fix that genuinely needs a refactor/dependency is done **only** with an explicit justification recorded in §7 of the report; schema or migration changes require your approval first.
3. Every fix gets a regression test in the matching suite where applicable (API behavior → `workers/api/test/*.test.ts`; UI logic/helpers → `apps/web/test/*`); UI-only cosmetic fixes are verified by re-walking the scenario in the preview.
4. After each fix: re-run the affected suite + both typechecks, re-walk the scenario in the preview (you, at my request), and update the bug entry with before/after evidence.
5. Final pass: full `cf:api:test`, `web:test`, `cf:api:typecheck`, `web:typecheck`, plus a re-verification sweep of all S1/S2 scenarios, recorded in §8 of the report.

---

## 10. Out of Scope

- Production environment, production database, production Worker/Pages deploys.
- Architectural refactors and dependency upgrades (unless a specific bug demands one under §9.2).
- Restyling or redesigning shared UI primitives beyond what a specific bug requires.
- CI/deploy pipeline changes (`/.github/workflows`, `wrangler.jsonc` deploy configs).
- Email delivery (no provider wired locally) — verified through DB/token state instead.
- Real payments (deferred by design; only UX honesty and graceful failure are in scope).

---

## 11. Risks & Open Questions

| Risk / unknown                                                                     | Handling                                                                                                            |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `report.md` is final-only, so blockers found early are only visible to you in chat | Chat summaries after each wave; report references them; S1 fixes are reported immediately.                          |
| UploadThing uploads land in your real account                                      | Only minimal test files; recorded in the report; no bulk uploads.                                                   |
| Gemini/AI calls consume quota                                                      | Limited number of AI calls; failures recorded as bugs only if the UI mishandles them.                               |
| Google consent is human-driven                                                     | Driven once with your account at a point you choose; the rest of the OAuth surface is covered programmatically.     |
| Local DB freedom means the dataset mutates during the sweep                        | Every seed/mutation is recorded with its SQL and the resulting state so steps are reproducible.                     |
| Pending migrations (0015–0017) change the baseline                                 | Applied **before** Wave 1; a post-migration smoke of `/api/health`, `/auth/login`, and one role page is required.   |
| Uncommitted auth work may be intentionally unfinished                              | Findings are attributed but never silently "fixed" in a way that conflicts with that work; unclear cases go to §10. |
| Local-only means deploy-only defects are invisible                                 | Stated explicitly as a coverage limitation in §9 of the report.                                                     |

---

## 12. Exit Criteria (definition of done)

The sweep is complete when:

- [ ] All **71** routes have been visited and recorded with a status (PASS/FAIL/BLOCKED/NOT TESTABLE + reason).
- [ ] Every interactive element on every visited page has been exercised at least once (or explicitly listed as untested).
- [ ] W1–W6 scenarios all have entries, including negative and edge cases.
- [ ] Every mutating action was verified in the DB, not just the UI.
- [ ] `report.md` contains all ten sections + both appendices with complete evidence per bug.
- [ ] Every bug is severity-graded, attributed to uncommitted vs pre-existing, and linked to a dependency (which bug blocks which scenario).
- [ ] Baseline and post-fix suite/typecheck runs are recorded.
- [ ] After the fix phase: all S1/S2 scenarios re-walked, suites + typechecks green, and any unfixed finding is listed in §10 with the reason.
