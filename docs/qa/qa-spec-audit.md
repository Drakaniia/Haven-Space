# Haven Space — QA Audit Spec (Navigability, Buttons, UI Completeness)

**Request:** Run the app as a QA engineer with the **Freebuff preview browser tool** (`/browser-use`)
and audit the entire site: **every page is navigable, every button and link works, no missing UI,
no duplicate UI, and every edge case of the flows is exercised**. This spec is the agreed audit
plan; no code has been changed.

**Status:** Spec only — approved for a browser walkthrough.

> **Amended 2026-09-26 (`boarder-find-a-room-redirect-spec.md`).** `/boarder/find-a-room` and
> `/boarder/find-a-room/$id` are now redirects to `/find-a-room` and `/rooms/$id`, so they are no
> longer a "duplicate UI" pair. The boarder browse surface is the public page; the in-shell
> apply/tour routes are unchanged.

> **Amended 2026-10-11 (`landlord-calendar-spec.md`).** A spec now exists for a unified
> read-only operations calendar: charge due dates, tenancy dates, application milestones and
> announcement publish dates. The page itself is still the placeholder this row describes, so its
> "widget or graceful fallback" expectation stands until that spec ships.

---

Run the full-site navigability audit (public → auth → boarder → landlord → admin) with the preview browser
☐ Click every button/link on every page and log broken/missing/dead interactions
☐ Probe missing UI (dead ends, absent affordances, blank states) and duplicate UI (repeated elements, double handlers) and record bugs
☐ Exercise flow edge cases (redirects, guards, refresh/back, empty states) and record bugs
☐ Load design skills and implement UI/flow fixes for confirmed bugs
☐ Re-verify fixes and summarize findings

## 1. Decisions Locked in the Interview

| Topic                                 | Decision                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Environment                           | **Fully local** — API (`localhost:8000`) + frontend (`localhost:3000`) against a local D1 database                                                                                                                                                                                                                                                            |
| Admin account                         | **Create one locally** via direct SQL insert (there is no admin signup/seed script)                                                                                                                                                                                                                                                                           |
| Scope                                 | **Full-site audit** — every route (public, auth, boarder, landlord, admin), every button/link on every page, missing-UI checks, duplicate-UI checks, flow edge cases                                                                                                                                                                                          |
| Test data                             | **Fresh accounts each run** (timestamped emails) so runs are repeatable and don't collide                                                                                                                                                                                                                                                                     |
| Deferred features (payments)          | Payments **ship** as a manual ledger (spec `payments-feature`); there is still **no gateway** and no `501 FEATURE_DEFERRED` path anywhere (F2). Messages **ship** (see A22)                                                                                                                                                                                                                                  |
| Deliverable                           | **Spec = audit plan + bug log template** (no separate issue drafting)                                                                                                                                                                                                                                                                                         |
| QA method                             | **Freebuff preview browser tool** — the `/browser-use` builtin (direct browser control via CDP: automation, scraping, testing, screenshots, and site/app work). Preview: `browser-use/browser-use@browser-use` (91.2K installs) — direct CDP control, no cloud key needed. Fallback: native Python Playwright (system Chrome) — same scenarios, same logging. |
| Navigability mandate                  | **Every page must be reachable** — from nav, from links, and by direct URL. Any non-navigable page, broken link, dead-end, or 404 is a logged bug (S1/S2).                                                                                                                                                                                                    |
| Buttons mandate                       | **Every button/link/action on every page must be clicked** and its result verified — no unexercised affordance. Dead buttons, disabled-without-reason, and buttons that do nothing are logged bugs.                                                                                                                                                           |
| Missing UI                            | **Every flow must have complete affordances** — a way forward and a way back, empty/loading/error states, and feedback after every action. Missing affordances (e.g. no way to withdraw, no back link, blank screens) are logged bugs.                                                                                                                        |
| Duplicate UI                          | **Duplicate/repeated UI is a bug** — duplicate buttons or links doing the same thing, repeated nav items, duplicated forms/mods on one page, double-submit handlers, duplicated page content. Each occurrence is logged with a screenshot.                                                                                                                    |
| Edge cases                            | **Every edge case encountered during the run is added to this spec** — incl. redirects, refresh/back survival, direct-URL access control, empty states, occupied-room filters, multi-apply, re-processing actions.                                                                                                                                            |
| Fix mandate                           | **AI decides and implements** fixes when the flow is incorrect or something is wrong and the fix is right for this app. UI work loads design skills first (`frontend-design`, `web-design-guidelines`, `accessibility`, `emil-design-eng`, `web-perf`)                                                                                                        |
| Google OAuth                          | **Include only if credentials are configured locally**; otherwise mark "not testable"                                                                                                                                                                                                                                                                         |
| Listing moderation                    | **Cover it** — admin Publish/Reject/Flag actions and their UI affordances                                                                                                                                                                                                                                                                                     |
| Access control                        | **Include** — UI route guards + API 403s across roles                                                                                                                                                                                                                                                                                                         |
| Multi-application                     | **Include as edge case** — confirm one cancels the boarder's other applications                                                                                                                                                                                                                                                                               |
| Post-confirmation                     | **Include** — tenancy page, dashboard state, leave-request flow                                                                                                                                                                                                                                                                                               |

---

## 2. Environment Setup (one-time, local)

1. Install deps: `bun install`, `bun install --cwd workers/api`, `bun install --cwd apps/web`.
2. Apply local D1 migrations: `bun run db:setup` (wraps `wrangler d1 migrations apply haven-space --local`).
3. Start the API: `bun run cf:api:dev` → serves at `http://localhost:8000`.
4. Start the frontend: `bun run web:dev` → serves at `http://localhost:3000`.
5. **Point the frontend at the local API** (it defaults to the _production_ Worker URL): open
   `http://localhost:3000/?apiBaseUrl=http://localhost:8000` once. The value persists in
   `localStorage.havenSpaceApiBaseUrl` for the session. Verify via `?apiBaseUrl=` being absent afterwards and API calls hitting `localhost:8000`.
6. **Create the admin user** in the local D1 database (no seed exists). Insert with role `admin`,
   `is_verified = 1`, `email_verified = 1`, `account_status = 'active'` and a bcrypt password hash
   (e.g. `admin@example.com` / `AdminPass123`). For local D1, this is done via
   `wrangler d1 execute haven-space --local --command=...` (SQL below is illustrative):
   ```sql
   INSERT INTO users (first_name, last_name, email, password_hash, role, is_verified, email_verified, account_status)
   VALUES ('QA', 'Admin', 'admin@example.com', '<bcrypt-hash>', 'admin', 1, 1, 'active');
   ```
7. Seed a landlord + listing + at least one boarder application ahead of the audit so role pages
   render with real data (follow the happy-path steps in `qa-spec.md` S1–S10 once, or reuse data
   from a previous run).

### Local run preconditions

- `JWT_SECRET` must be present in `workers/api/.dev.vars` (copy from `.dev.vars.example`) or auth routes fail.
- Google OAuth and UploadThing are **not required** for this pass (photo uploads and OAuth are out of scope unless credentials exist).
- Payments **ship** as a manual ledger — `/api/boarder/payments` and `/api/landlord/payments*` are mounted from `workers/api/src/routes/payments.ts` (migration `0021_payments.sql`). No `501 FEATURE_DEFERRED` code path exists anywhere (verified: zero matches under `workers/api`) — the old claim was a phantom (F2).
- Messages are **not** deferred any more (`messages-feature-review`): inbox, threads, images, unread state, report/block all ship, so A22 checks shipped behaviour for messages.

---

## 3. Test Data Convention

Fresh accounts per run, tagged so runs never collide and are identifiable in the DB:

| Role                        | Email pattern                     | Password        |
| --------------------------- | --------------------------------- | --------------- |
| Landlord                    | `qa.landlord.<runid>@example.com` | `StrongPass123` |
| Boarder                     | `qa.boarder.<runid>@example.com`  | `StrongPass123` |
| Second boarder (edge cases) | `qa.boarder2.<runid>@example.com` | `StrongPass123` |
| Admin                       | fixed `admin@example.com`         | `AdminPass123`  |

`<runid>` = `YYYYMMDD-HHMM` (e.g. `qa.landlord.20260816-1430@example.com`).

---

## 4. Audit Matrix

Severity legend (for bugs found): **S1** Blocker · **S2** Major · **S3** Minor · **S4** Cosmetic.
Status per scenario: PASS / FAIL / BLOCKED / NOT TESTABLE.

For **every page** visited, capture: URL, rendered title/heading, page screenshot (to `qa-screenshots/`),
the list of interactive elements (buttons, links, inputs, selects, toggles), and the result of
clicking each one. This is the per-page button/link matrix (Section 4.6).

---

### 4.1 Public Site — Reachability & Every Link (P0)

**A1. Homepage `/`**

1. Visit `/` logged out.

- **Expected:** renders without error; hero + primary CTAs ("Sign up", "Find a room", "For landlords" etc.) all navigate somewhere real.

2. Click **every** link on the page (header nav, footer links, hero CTAs, logo cloud, testimonials/FAQ toggles if present).

- **Expected:** no link 404s, no dead ends, no anchor-only buttons that look like links. FAQ accordions expand/collapse. The homepage must not re-render a duplicate of itself or show duplicated sections.

**A2. Public content pages**

- Visit each and click every link/button on it: `/our-story`, `/teams`, `/for-landlords`, `/haven-ai`, `/maps` (and `/public-maps`), `/find-a-room`.
- **Expected:** each renders with real content (no lorem ipsum, no blank sections), its CTAs navigate correctly, and back-navigation works. No page is reachable only by typing a URL (every page must be linked from somewhere).

**A3. Legal pages**

- Visit `/legal/privacy-policy`, `/legal/terms-of-service`, `/legal/user-agreement`.
- **Expected:** all render real content; links to each other and back to the homepage work.

**A4. Find-a-room public flow**

1. `/find-a-room` shows published listings; filters/sort/search controls (if any) work and update results.
2. Open a listing detail `/rooms/<id>` (and `/boarder/find-a-room/<id>` when logged in) — see B5.
3. **Apply** CTA behavior: logged out → redirects to login (and returns to the listing after login — check); logged in as boarder → goes to the apply flow; logged in as landlord/admin → blocked or hidden.

**A5. 404 / not-found handling**

- Visit nonexistent routes: `/nonexistent-page`, `/rooms/999999`, `/boarder/nonexistent`, `/landlord/nonexistent`, `/admin/nonexistent`.
- **Expected:** graceful not-found UI (no raw error, no crash, no blank screen); a way back (home link). Room detail for a missing id returns the not-found UI (HTTP 200 per `fix(web): return 200 with not-found UI`).

---

### 4.2 Auth Pages (P0)

**A6. `/auth/login`**

1. Every input labels correctly; password visibility toggle (if any) works; "Forgot password?" link navigates; "Sign up" link navigates.
2. Submit valid credentials → correct role landing (see edge cases, Section 4.9).
3. Submit wrong password / unknown email → clear inline 401 messages (S20 in `qa-spec.md`).
4. **Submit with the form while fields are empty** → validation messages, no crash.

**A7. `/auth/signup` (boarder) and `/auth/signup/landlord`**

1. Every field present; password/confirm mismatch, short password, invalid email and PH phone rejected client-side.
2. Duplicate email → 409-style error, no duplicate account.
3. **Duplicate-UI check:** the landlord signup must not render the boarder fields, and vice versa; no duplicated submit buttons or duplicated step panels.

**A8. `/auth/choose` (role chooser)**

- Both role cards (Boarder / Landlord) navigate to the correct signup forms; back link works.

**A9. `/auth/forgot-password` and `/auth/reset-password`**

- Forms render; submit behaves gracefully even though email delivery is deferred (no crash, clear message); links back to login work.

**A10. `/auth/verify-email`**

- Renders a sensible state when visited directly (no crash); link back to login/signup works.

---

### 4.3 Boarder Area (P0)

For each boarder page below, as a seeded boarder (has an accepted/confirmed application where relevant):

1. Reach it via the **sidebar nav** (click every item — no item may 404 or render a blank screen).
2. Reach it by **direct URL** (logged in as boarder).
3. Click **every** button/link/tab on the page and record the result.
4. Check for **missing UI** (no empty state, no way back, no feedback after actions) and **duplicate UI** (repeated buttons, duplicated tabs/content).

| Page                  | Route                                                  | Specific checks                                                                                         |
| --------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Dashboard             | `/boarder`                                             | Stat cards render with data; every card/CTA navigates; empty-state when no data                         |
| Find a Room           | `/boarder/find-a-room`                                 | Listings render; filters work; links to details                                                         |
| Room detail           | `/boarder/find-a-room/<id>`                            | Apply button present when applicable; occupied rooms filtered (S25); back link                          |
| Apply                 | `/boarder/find-a-room/<id>/apply`                      | Room selector + message required; submit → `/boarder/application-submitted`; no duplicate submit        |
| Application submitted | `/boarder/application-submitted`                       | Confirmation renders; links to dashboard/applications                                                   |
| Applications          | `/boarder/applications` + `/boarder/applications/<id>` | Status badges; detail page; **withdraw/delete affordance for accepted applications (S22)**; empty state |
| Confirm Booking       | `/boarder/confirm-booking`                             | Payment-method selector (GCash/bank/cash); Confirm button; **no decline/back affordance missing (S22)** |
| Tenancy               | `/boarder/tenancy`                                     | Full tenancy details; "Request to leave" opens modal, form validates, submits; refresh after submit     |
| Payments              | `/boarder/payments` + `/boarder/payments/pay`          | Summary (balance / next due / overdue) + the tenancy's charges; submit flow requires a reference number; empty state without a tenancy |
| Announcements         | `/boarder/announcements`                               | List renders; empty state                                                                               |
| Messages              | `/boarder/messages` + `/boarder/messages/<id>`         | Inbox list → thread; composer (text + ≤4 images); unread pill; no `RequireTenancy`; no "coming soon"  |
| House Rules           | `/boarder/house-rules`                                 | Renders real content or graceful empty state                                                            |
| Maps                  | `/boarder/maps`                                        | Renders (map widget or graceful fallback); no crash                                                     |
| Settings              | `/boarder/settings`                                    | Form loads user data; save gives feedback; back link                                                    |
| Rooms (legacy)        | `/boarder/rooms/<id>`                                  | Redirects or renders correctly; no 404 crash                                                            |

---

### 4.4 Landlord Area (P0)

Same discipline as 4.3 (nav reachability + direct URL + every button + missing/duplicate UI):

| Page           | Route                                              | Specific checks                                                                                                         |
| -------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Dashboard      | `/landlord`                                        | Stats/cards render with data; every card navigates; empty state                                                         |
| Verification   | `/landlord/verification`                           | Status banner; document upload UI (local-only upload is a **known limitation**, see Section 5); link back to dashboard  |
| Onboarding     | `/landlord/onboarding`                             | Renders; progress/continue affordances; no dead end                                                                     |
| Listings       | `/landlord/listings`                               | Table of listings; edit/view actions; empty state                                                                       |
| Create listing | `/landlord/listings/create`                        | Full form; validation; amenity toggles; rooms inputs; submit → `/landlord/listings`; **no duplicate submit**; back link |
| Edit listing   | `/landlord/listings/<id>/edit`                     | Form pre-fills; save gives feedback; cancel/back link                                                                   |
| Edit room      | `/landlord/rooms/<id>/edit`                        | Pre-fills; save feedback; back link                                                                                     |
| Properties     | `/landlord/properties`                             | Renders or redirects; no dead end                                                                                       |
| Applications   | `/landlord/applications`                           | Accept/Reject buttons work and disappear after action (S8/S18); row actions match state; empty state                    |
| Boarders       | `/landlord/boarders`                               | List renders; row actions; empty state                                                                                  |
| Calendar       | `/landlord/calendar`                               | Renders (widget or graceful fallback); no crash                                                                         |
| Announcements  | `/landlord/announcements`                          | Create/list flow; submit feedback; empty state                                                                          |
| Messages       | `/landlord/messages` + `/landlord/messages/<id>`   | Inbox list → thread; unread badge in the sidebar; block/report in the ⋯ menu; bell row deep-links the thread            |
| Payments       | `/landlord/payments` + `/landlord/payments/record` | Graceful `501` (or partial) — no crash                                                                                  |
| Maps           | `/landlord/maps`                                   | Renders or graceful fallback                                                                                            |
| Activity       | `/landlord/activity`                               | Log/list renders; empty state                                                                                           |
| Pricing        | `/landlord/pricing`                                | Renders real content; CTA links                                                                                         |
| Settings       | `/landlord/settings`                               | Form loads data; save feedback                                                                                          |

---

### 4.5 Admin Area (P0)

**A11. `/admin` (Command Center)**

1. Every tab navigates and renders: Overview, Users, Properties, Landlords, (and any others).
2. **User actions:** Approve/Reject landlord, Publish/Reject/Flag listings (S26) — each click produces the documented state change + a notice message, and the row updates (no full-page reload required, no duplicated rows).
3. Every table row action, pagination/sort control (if any), and tab works.
4. Direct URL `/admin` as admin → renders; wrong role → blocked (see 4.9).

---

### 4.6 Every-Button/Link Matrix (P0) — the "click everything" sweep

For **each page** in 4.1–4.5, build the interactive-element inventory and verify each one:

1. Enumerate all interactive elements (via the accessibility tree: `cdp("Accessibility.getFullAXTree")`): buttons, links, inputs, selects, checkboxes, tabs, toggles, accordions.
2. For each element, click it (or exercise it) and record: what it did, resulting URL/state, and a screenshot where behavior is non-obvious.
3. Classify each element: **WORKS** (expected result) / **DEAD** (click does nothing) / **BROKEN** (error, crash, wrong destination) / **DUPLICATE** (another element does the same thing — duplicated CTA, duplicated nav item, double submit button).
4. **Duplicate-button check:** on every page, verify no two buttons/links share the same visible label while doing the same thing (e.g. two "Save" buttons, two "Apply" CTAs), and no button is rendered twice (double-render of a modal/panel).
5. **Double-submit check:** submit each form twice rapidly; the second submit must not create a duplicate record, and buttons must show a loading/disabled state while pending.
6. **Disabled-without-reason check:** any disabled button must be intentional (tooltip/explanation) or it is a bug.
7. **Keyboard/accessibility spot-check** (at least one page per role): tab order reaches all interactive elements; buttons are reachable and activate with Enter/Space; labels are associated with inputs.

---

### 4.7 Missing UI Checks (P1)

For every flow, verify the affordances exist — flag any that don't as a bug:

1. **Way forward + way back:** every page with a primary action offers a way back (breadcrumb/back link/nav). No dead-end pages (S35).
2. **Feedback after every action:** submit/approve/accept/reject/delete/save all show a confirmation notice, inline message, or state change — never silent failure.
3. **Empty states:** every list page (listings, applications, announcements, boarders, tenancy, activity) shows a friendly empty state when there's no data — not a blank area, not a crash.
4. **Loading states:** data-fetching pages show a spinner/skeleton while loading; no frozen blank screen.
5. **Error states:** API failure (e.g. deferred 501, network down) renders a graceful error with a retry/back affordance — never a blank screen or raw JSON.
6. **Status affordances:** accepted application → confirm page exists (S9); withdraw/cancel affordance for an accepted application exists (S22); occupied room can't be applied to via UI (S25).
7. **Logout:** every role shell has a working logout that clears session and lands on `/` — verify no "stuck logged in" state.

---

### 4.8 Duplicate UI Checks (P1)

1. **Duplicate nav/CTAs:** no repeated sidebar items, repeated header/footer links to the same destination, or two identical primary CTAs on one page.
2. **Duplicate content:** no page renders the same section/panel twice (double-rendered components, duplicated modals, repeated table).
3. **Duplicate forms:** no page renders two forms targeting the same action (e.g. two login forms, two signup panels).
4. **Duplicate IDs/keys:** no two elements on a page share an `id`; React list keys are stable (no console key warnings that duplicate content).
5. **Modal duplication:** opening a modal once must not open two copies or leave a stale copy after close.
6. **Route duplication:** no two routes serve the same page with different URLs where one is clearly redundant (e.g. duplicate index routes), unless intentional (aliases must redirect, not render separately).

---

### 4.9 Flow Edge Cases (P1–P2)

**A12. Login redirects (status-aware landing)**

- New boarder login → dashboard. **Accepted** boarder login → `/boarder/confirm-booking` (**S9** — verify; known risk: frontend always sends boarders to `/boarder` on email/password login).
- Landlord login → landlord area; admin login → `/admin`.
- Logged-out deep links: visit `/boarder/tenancy`, `/landlord/applications`, `/admin` logged out → redirected to `/auth/login` (and returned to the original page after login, where the app intends it).

**A13. Role guards — direct URL**

- Boarder visits `/landlord`, `/landlord/listings`, `/admin` → redirected/blocked.
- Landlord visits `/admin`, `/boarder` → redirected/blocked.
- Admin visits `/boarder`, `/landlord` → redirected/blocked.
- **Expected:** the protected page never renders for the wrong role (S27).

**A14. API 403s (devtools/curl)**

- Landlord-only endpoints with a boarder token; admin-only endpoints with a landlord token → 403 (S28).
- Unverified landlord `POST /api/landlord/listings` → 403 with verification code (S29).

**A15. Refresh / back / forward survival**

- On applications lists, confirm-booking, tenancy, and listing forms: click a detail, press Back, refresh — no crash, no stale state, state reloads from the API (S34).

**A16. Multi-application cancel-on-confirm**

- Boarder applies to two rooms; landlord accepts one; boarder confirms it → the other is cancelled automatically; applications list shows only the active one (S23).

**A17. Re-apply / duplicate apply**

- Applying to the same room twice → 400 "You have already applied…", no duplicate (S16).

**A18. Occupied room filter**

- After confirmation, a second boarder cannot apply to the occupied room via UI (S25).

**A19. Withdraw accepted application**

- Boarder withdraws an accepted application (S22) → soft-deleted, gone from list, no forced-confirm dead end. If there's no UI affordance, log as missing-UI bug.

**A20. Re-processing an application**

- Landlord re-accepts/rejects an already-processed application → blocked (no buttons, API 403) (S18).
- Boarder confirms a non-accepted application → API 403 (S19).

**A21. Admin moderation cycle**

- Flag → listing hidden from public; Reject → inactive; Publish → visible again (S26). Each admin action is reflected in both admin and landlord views.

**A22. Deferred features (payments no longer qualify — see below)**

- Payments (boarder + landlord) **ship** as a manual ledger: generated rent/deposit/advance schedules, boarder submission with a reference, landlord verify/reject/record, aging + CSV export, and automatic overdue/late-fee handling. There is still no `501 FEATURE_DEFERRED` route (F2) and no gateway.
- Messages (boarder + landlord) → the shipped inbox: list, thread, composer, unread state, block/report. Admins still see nothing (no admin messages surface, by design).

**A23. Empty/absent data states**

- Fresh boarder with no applications/tenancy: every boarder page shows empty/zero states, not errors.
- Landlord with no listings/boarders: same.
- Listing with no rooms, room with no price, etc. — no page crashes on partial data.

---

### 4.10 Edge Cases Discovered During the Run

> This section grows as the run proceeds. Every unexpected behavior encountered is added here with its status (confirmed bug / by-design / fixed).

| #    | Discovered edge case                                  | Where                                                                                                              | Actual behavior                                                                                                                                                                                                 | Verdict                                       | Fix applied?                                                                                                                               |
| ---- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --- | ---- | ----------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EC-1 | Duplicate layout (2× sidebar + 2× topbar + 2× main)   | `/boarder/applications`, `/boarder/applications/:id`, `/boarder/find-a-room/:id`, `/boarder/find-a-room/:id/apply` | Layout routes (`applications.tsx`, `find-a-room.tsx`, `find-a-room/$id.tsx`) render `Protected`+`RoleShell`+`Outlet`, and child routes render `Protected`+`RoleShell` again → nested duplicate shell            | **Confirmed bug** (S2 duplicate UI)           | **Fixed** — child routes now render content only (shell lives in the parent layout)                                                        |     | EC-2 | Orphaned route (no link reaches it) | `/landlord/rooms/:id/edit` | Only reachable by typing the URL; listing edit page had no per-room management section; page required a `propertyId` search param no link passed | **Confirmed bug** (S2 navigability / missing UI) | **Fixed** — listing edit page now renders a Rooms section with per-room Edit links; room-edit page got `Protected` guard + `RoleShell`; `validateSearch` accepts string or number `propertyId`. **Later refactor:** route moved to `/landlord/listings/rooms/:id/edit` so it inherits the shell + guard from the listings layout; old URL 404s gracefully |
| EC-3 | Room-edit page had no role guard                      | `/landlord/rooms/:id/edit`                                                                                         | Root-level route (not under a `Protected` layout) → any role (even logged-out) could open the landlord room form UI                                                                                             | **Confirmed bug** (S2 access control, A13)    | **Fixed** — room edit now inherits `Protected role="landlord"` from the `/landlord/listings` layout (boarder visits are redirected)        |
| EC-6 | Landlord can re-process a **confirmed** booking (A20) | `PATCH /api/landlord/applications/:id/status`                                                                      | Guard only blocked `accepted`/`rejected`; a landlord rejected an already-confirmed application → app left as `rejected` with `confirmed_at` set, room stayed `occupied`, tenancy vanished — contradictory state | **Confirmed bug** (S2 edge case, A20)         | **Fixed** — guard now also blocks `confirmed`/`cancelled` (returns 403 "Application has already been processed")                           |
| EC-4 | Guest CTA shown to logged-in users                    | `/boarder/find-a-room`                                                                                             | "Want to apply for a room? Log in or sign up" rendered for an authenticated boarder                                                                                                                             | **Confirmed bug** (S3 duplicate/confusing UI) | **Fixed** — CTA hidden when `isAuthenticated` (still shows logged-out on public `/find-a-room`)                                            |
| EC-5 | 404 page had no way back                              | any nonexistent route (`/nonexistent-page`, `/landlord/nonexistent`, `/admin/nonexistent`)                         | TanStack default "Not Found" text, no home link, no branding                                                                                                                                                    | **Confirmed bug** (S3 missing UI, A5)         | **Fixed** — root `notFoundComponent` with 404 heading + "← Back to home" link; `/rooms/999999` already handled "Room not found" gracefully |

---

## 5. Observed Limitations / Known Risks (from code reading — verify in run)

1. **Boarder post-login redirect** — frontend always sends boarders to `/boarder` after email/password login; only the Google-OAuth path is status-aware. Conflicts with the "confirm page first" intent (**A12**). Likely bug.
2. **No decline affordance on confirm page** — `/boarder/confirm-booking` only has "Confirm Booking"; withdrawal must go through the DELETE endpoint (**A19**). Likely missing-UI bug.
3. **Email verification is not real** — no verification email is sent on email/password signup; landlords become `email_verified = 1` only via admin approval.
4. **Landlord verification page upload is local-only** — the "Submit documents" button on `/landlord/verification` stores nothing to the API ("Upload to the API will be wired once the verification endpoint is finalized"). Verify the button gives feedback or logs it as missing-UI.
5. **Listings auto-publish** — `createLandlordProperty` inserts `listing_moderation_status = 'published'`, so admin moderation only bites after the fact.
6. **Payments and messaging both ship** — payments run as a manual ledger with boarder submission + landlord verification, and messaging runs end-to-end: a boarder's *Contact Landlord* opens a real thread (**A22**). The old "`501` for both" claim was never true (F2).
7. **Duplicate-UI risk areas** — pages with legacy + new route trees (e.g. `/find-a-room` vs `/boarder/find-a-room`, `/maps` vs `/public-maps`, `auth/signup` vs `auth/signup/index`, `applications` vs `applications/index`) may double-render or serve near-identical pages — verify each pair during the run.

---

## 6. Bug Log Template

For every failure found during the walkthrough, record:

```md
### BUG-<nn>: <Short title>

- **Severity:** S1/S2/S3/S4
- **Category:** navigability / button / missing UI / duplicate UI / edge case / access control
- **Scenario:** A<n>
- **Environment:** local (API :8000 / web :3000)
- **Repro steps:**
  1. ...
- **Expected:** ...
- **Actual:** ...
- **Evidence:** screenshot / console output / API response (URL + status + body)
- **Impact:** who it affects and how
- **Suggested fix (optional):** ...
```

Run-wide summary at the end: counts by severity + category, plus a PASS/FAIL table and a
navigability map (every route → reachable via nav / direct URL / both / neither).

---

## 7. Execution Order & Exit Criteria

Suggested run order: setup (Section 2) → A1–A5 public sweep → A6–A10 auth → A11 admin →
4.3 boarder sweep → 4.4 landlord sweep → 4.6 every-button matrix (per page as you go) →
4.7 missing UI → 4.8 duplicate UI → 4.9 flow edge cases → A23 last (or use a dedicated fresh
account) since it mutates shared data.

**Exit criteria for "site is navigable and complete":** every route in Sections 4.1–4.5 is
reachable and renders without crash; every interactive element in the 4.6 matrix has a recorded
WORKS/DEAD/BROKEN/DUPLICATE verdict; no page is missing a way forward/back; no confirmed
duplicate-UI bugs remain unfixed; flow edge cases pass or are logged with severity. A22 passes
when deferred pages fail gracefully.

---

## 8. QA Driver & Fix Process

**Driver:** Freebuff preview browser tool — the `/browser-use` builtin (direct browser control via
CDP for web interaction: automation, scraping, testing, screenshots, and site/app work;
`browser-use/browser-use@browser-use`, 91.2K installs). No cloud API key required for the local CDP
variant. If the builtin is unavailable in a given session, fall back to native Python Playwright
(system Chrome, headless) — same scenarios, same logging (see `qa-screenshots/recon.py` and
`qa-screenshots/qa_happy_path.py` for the established pattern).

**Run loop per audit item:**

1. Execute via the browser driver (navigate, click through, capture screenshots to `qa-screenshots/`).
2. Verify the API state behind the UI where relevant (curl against `localhost:8000`).
3. **Expected result** vs **actual result** — record PASS/FAIL in Section 4.x.
4. On FAIL:
   - Determine severity (S1–S4) and category (navigability / button / missing UI / duplicate UI / edge case / access control).
   - If it's a flow/UX/navigability bug that should be fixed for this app → **implement the fix** (load design
     skills first: `frontend-design`, `web-design-guidelines`, `accessibility`, `emil-design-eng`; reuse the shared
     UI kit `components/ui/*` and `RoleShell`/`Protected` conventions).
   - Re-run the scenario after the fix and record before/after.

**Fix authority:** The AI decides and implements when the flow is incorrect or something is wrong and the fix
is right for this app — e.g. wrong redirects (A12), missing decline affordance (A19), non-navigable pages,
dead buttons, missing UI, duplicate UI, broken role guards (A13/A14), dead-ends. Backend fixes follow the
repository pattern in `workers/api/src`; frontend fixes reuse the existing UI kit. No new dependencies unless
required.

---

## 9. Out of Scope (this pass)

- Google OAuth end-to-end (only if credentials are configured — otherwise NOT TESTABLE).
- Photo uploads via UploadThing (needs token; UI-only upload verified without a real upload).
- Password reset email delivery (no transactional email provider wired).
- Visual/design polish review beyond what blocks navigation, buttons, or UI completeness
  (duplicate/missing-UI findings that are purely cosmetic are logged, not fixed).
- **Code changes are IN scope** when a discovered bug is confirmed and a fix is clearly right for the app
  (per the fix mandate). Pure QA reporting applies only to bugs deemed out of scope or not clearly fixable.

---

## 10. Run #1 Findings — 2026-08-16 (preview browser, local API :8000 / web :3000)

Fresh landlord (`qa.landlord.audit.20260816@example.com`, promoted to verified) + boarder
(`qa.boarder.audit.20260816@example.com`) + listing "Audit House Manila" (id 6, 2 rooms) + 1
boarder application (id 9).

### 10.1 Duplicate layout — nested sidebar + nav (fixed)

Four boarder routes rendered **two sidebars, two topbars, two `<nav>` and two `<main>`** because the
route tree used layout routes that render `Protected` + `RoleShell` + `<Outlet />` while their child
routes rendered `Protected` + `RoleShell` again:

- `/boarder/applications` (`applications.tsx` layout + `applications/index.tsx`)
- `/boarder/applications/:id` (`applications.tsx` layout + `applications/$id.tsx`)
- `/boarder/find-a-room/:id` (`find-a-room.tsx` layout + `find-a-room/$id.tsx` layout)
- `/boarder/find-a-room/:id/apply` (same chain)

**Fix:** removed the nested `Protected`/`RoleShell` from `applications/index.tsx`, `applications/$id.tsx`,
and `find-a-room/$id.tsx` (kept `<Outlet />`). The landlord area (listings, payments layout trees) was
verified clean — one shell per page.

### 10.2 Orphaned room-edit page (fixed)

`/landlord/rooms/:id/edit` was reachable only by direct URL — no `Link` anywhere pointed to it and the
listing edit page had no per-room management UI. It also depended on a `propertyId` search param and
had **no role guard** (a boarder could open the form UI).

**Fix:** added a Rooms section (room number, type, price, status badge, "Edit room" link) to
`landlord/listings/$id/edit.tsx`; wrapped the room-edit page in `Protected role="landlord"` +
`RoleShell`; widened `validateSearch` to accept a string or numeric `propertyId`. Verified: boarder
visiting `/landlord/rooms/7/edit` is redirected; landlord edit link loads the seeded form.

### 10.3 Guest CTA on logged-in find-a-room (fixed)

"Want to apply for a room? Log in or sign up" rendered for an authenticated boarder on
`/boarder/find-a-room`. **Fix:** `FindARoomContent` now hides the CTA when `useAuth().isAuthenticated`;
logged-out public `/find-a-room` still shows it.

### 10.4 404 page without a way back (fixed)

No `notFoundComponent` was configured, so unknown routes rendered bare "Not Found" with no home link
(spec A5). **Fix:** root `notFoundComponent` with a 404 heading, message, and "← Back to home" link.
`/rooms/999999` already rendered a graceful "Room not found" state.

### 10.5 Bug log

#### BUG-01: Nested duplicate layout (sidebar + topbar + main) on boarder pages

- **Severity:** S2
- **Category:** duplicate UI
- **Scenario:** 4.8 (duplicate UI), 4.3 boarder sweep
- **Repro:** log in as boarder → `/boarder/applications` (and the three related routes)
- **Expected:** one sidebar + one topbar + content
- **Actual:** two sidebars, two topbars, two `<main>` (outer shell + nested shell rendered inside content)
- **Impact:** layout broken, screen real estate wasted, confusing navigation; affects every boarder using the core apply flow
- **Status:** FIXED (verified single shell on all four routes)

#### BUG-02: Landlord room-edit page unreachable from the UI

- **Severity:** S2
- **Category:** navigability / missing UI
- **Scenario:** 4.4 (Edit room row), 4.1 A2 (every page linked from somewhere)
- **Repro:** as landlord, open any listing edit page → no per-room management exists; `/landlord/rooms/:id/edit` only via typed URL
- **Expected:** room editing reachable with a back path
- **Actual:** route exists but no link targets it; requires `propertyId` search param; no role guard
- **Impact:** landlords cannot edit individual rooms (price/status/photos)
- **Status:** FIXED (Rooms section + links + guard + shell; both `?propertyId=6` and router-encoded forms work)

#### BUG-03: Guest "Log in or sign up" CTA on authenticated boarder page

- **Severity:** S3
- **Category:** duplicate UI / confusing UI
- **Scenario:** 4.8 duplicate-CTA check
- **Status:** FIXED

#### BUG-04: 404 renders bare "Not Found" with no way back

- **Severity:** S3
- **Category:** missing UI
- **Scenario:** A5
- **Status:** FIXED

### 10.6 Passed spot-checks (this run)

- Landlord dashboard, listings, listings/create, listings/:id/edit, properties, announcements,
  settings, verification, payments, boarders, applications — **single shell, no duplicates**.
- Boarder dashboard, find-a-room index, payments, payments/pay, applications/settings — single shell.
- Login redirect is status-aware: new boarder → `/boarder/find-a-room` (not hardcoded `/boarder`).
- Role guard: boarder → `/landlord/rooms/:id/edit` redirected to `/`; `Protected` enforced.
- `/rooms/999999` → graceful "Room not found" + Browse rooms link.
- Web typecheck (`tsc --noEmit`) and web test suite (31 tests) pass after all fixes.

---

## 11. Run #2 Findings — 2026-08-16 (flow edge cases + room-management refactor)

### 11.1 Room-edit route refactor (done)

`/landlord/rooms/:id/edit` moved to `/landlord/listings/rooms/:id/edit` (file
`routes/landlord/listings/rooms/$id/edit.tsx`) so it **inherits the `Protected` guard and `RoleShell`
from the `/landlord/listings` layout** instead of wrapping itself. Removed the self-wrapped shell/guard;
`validateSearch` still accepts a string or numeric `propertyId`. The old URL 404s gracefully via the
new not-found page. Verified: landlord edit link loads the seeded form under one shell; a boarder
visiting the route is redirected.

### 11.2 Rooms add/delete on the listing edit page (done)

`/landlord/listings/:id/edit` Rooms section now has:

- **+ Add room** — modal (room number, type, price, deposit, capacity) → `POST /api/landlord/rooms`;
  duplicate room number shows the API 409 inline; list refreshes after create.
- **Delete** per room — accessible `ConfirmDialog` + `DELETE /api/landlord/rooms?id=…`; list refreshes after delete.

Verified end-to-end in the browser: added "Room 3" (₱5,000) → appeared in the list; deleted it → list
restored to Room 1/2. Both mutations invalidate `landlord-rooms` + `landlord-properties` so the
listing table and dashboard occupancy stay in sync.

### 11.3 Flow edge cases (walkthrough, fresh accounts as in Section 3)

| #   | Scenario                                                                                                                                                                                                     | Result                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| F1  | Boarder applies (app 9) → landlord accepts → boarder confirms (GCash) → `/boarder/confirm-booking` + tenancy page with full details                                                                          | **PASS** (confirm-booking page correctly shows "No accepted applications" after confirmation)                |
| F2  | Leave request: boarder submits (reason/date/message) → tenancy shows pending banner + details, re-submit disabled → landlord approves from Boarders page                                                     | **PASS** (after approval: app removed from both lists, boarder gone from tenants, room freed to `available`) |
| F3  | Admin moderation cycle on a listing: Flag → hidden from `/api/rooms/public` → Reject → status `Rejected` → Publish → visible again; notice "Property moderation status updated successfully" on every action | **PASS**                                                                                                     |
| F4  | A16 multi-apply: boarder applied to 2 rooms; landlord accepted one; boarder confirmed → the other application auto-cancelled, only the confirmed one remains                                                 | **PASS**                                                                                                     |
| F5  | A17 duplicate apply: re-applying to a room already applied to → 400 "You have already applied to this room. Status: pending", no duplicate row                                                               | **PASS**                                                                                                     |
| F6  | A18 occupied room: second boarder applies to an occupied room → 400 "This room is already occupied and can no longer be applied to"                                                                          | **PASS**                                                                                                     |
| F7  | A20 re-processing: landlord re-rejects an already-processed application → was allowed (BUG, fixed below)                                                                                                     | **FIXED** — 403 "Application has already been processed"                                                     |

### 11.4 Bug log — Run 2

#### BUG-05: Landlord can re-process a confirmed booking (A20)

- **Severity:** S2
- **Category:** edge case / access control
- **Scenario:** A20, 4.9
- **Repro:** accept + boarder-confirm an application, then `PATCH /api/landlord/applications/:id/status` with `rejected`
- **Expected:** 403 — application already processed
- **Actual:** 200; app ends as `rejected` with `confirmed_at`/`payment_method` still set, room stays `occupied`, tenancy is gone — contradictory state
- **Impact:** a landlord can silently strand a confirmed tenant and leave rooms marked occupied
- **Fix:** `workers/api/src/routes/applications.ts` — status guard now blocks `accepted`, `rejected`, `confirmed`, and `cancelled`
- **Status:** FIXED (verified 403; API typecheck + 165 API tests pass)

### 11.5 Cleanup

Test data left consistent: room 7 reset to `available`, broken app 10 soft-deleted. Accounts and the
"Audit House Manila" listing (id 6) remain for further runs.

---

## 12. Run 3 — Application state machine + reusable room management

### 12.1 Application status state machine

Added an explicit, single-source-of-truth state machine in `workers/api/src/lib/application-status.ts`
and enforced it on **every** mutation path (`workers/api/src/routes/applications.ts`):

```
pending → accepted → confirmed → ended
pending → rejected          pending → cancelled (withdraw / multi-apply cancel)
confirmed → ended (tenancy leave approved)   ended: terminal
```

- `PATCH /status` (accept/reject): only `pending` may transition; `accepted`/`rejected`/`confirmed`/`cancelled` → 403.
- Boarder withdraw: only `pending`/`accepted` may withdraw; confirmed bookings can no longer be cancelled by the boarder.
- Multi-apply cancel-on-confirm: only other `pending`/`accepted` apps are cancelled (a confirmed sibling can never be touched).
- Tenancy leave-approval now ends the application with status `ended` (was: soft-delete) and requires a `confirmed` application; the `ended` status is terminal and immutable.
- `workers/api/src/repositories/applications.ts` + `repositories/tenancy.ts` updated to match.
- Frontend: `StatusBadge` gained `confirmed`/`ended`/`cancelled` styles; the boarder application detail page shows a
  note + disabled control for confirmed/ended instead of the dangerous "Withdraw/Delete" button.

**Tests:** 11 new state-machine unit tests (`workers/api/test/lib/application-status.test.ts`); route tests
updated for the new confirm/ended semantics. API suite now **176 tests, all pass**; typecheck clean.

### 12.2 Reusable `LandlordRoomList` component

Extracted the listing-edit Rooms section into `apps/web/src/components/rooms/LandlordRoomList.tsx` —
self-contained data fetching + mutations (list / add / delete / edit-room links), used in two places:

- `/landlord/listings/:id/edit` — replaces the former inline section (identical UI, verified in browser).
- `/landlord/properties` — `DataTable` gained an optional `expandable` row renderer (chevron toggle,
  `aria-expanded`); each property row expands to show its `LandlordRoomList` inline.

Verified in the browser: expanded the "Audit House Manila" row → Room 1/2 listed with Edit-room links and
Delete; the "+ Add room" modal opens correctly inside the expanded table row (fixed-position modal escapes the
table's `overflow-x-auto`); edit-room still navigates to `/landlord/listings/rooms/:id/edit` with the inherited
shell + seeded form.

### 12.3 Findings

- **EC-6 (fixed):** `DataTable` had no way to surface per-row detail; added an optional `expandable` prop
  (backwards-compatible — all other usages unchanged).
- **EC-7 (fixed):** boarder application detail still offered "Withdraw" on a confirmed booking; now gated to
  pending/accepted with a status note for confirmed/ended.
- **Note:** room deletion previously used native `window.confirm` — a minor a11y gap (no focus
  management, no `role=dialog` exposure). Replaced with a reusable, accessible `ConfirmDialog`
  (`apps/web/src/components/ui/ConfirmDialog.tsx`): `role=dialog` + `aria-modal`, `aria-labelledby`/
  `aria-describedby`, Escape-to-cancel, overlay-click-to-cancel, focus moves to the destructive confirm
  button on open and returns to the trigger on close, `busy` state disables both buttons. The only
  `window.confirm` call site in the app (`LandlordRoomList` delete) now uses it; `Button` gained a
  `ref` prop (React 19 passes it through) to support focus management. Verified in the browser:
  Escape cancels without deleting, confirm deletes and closes the dialog, room list refreshes.

### 12.4 Verification

- `tsc --noEmit` clean (web + API); 31 web tests pass; 176 API tests pass.
- Browser: expanded-row room list + add-room modal on Properties; extracted component on listing edit;
  room-edit deep link intact.
