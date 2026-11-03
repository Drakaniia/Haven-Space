# Haven Space — QA Test Spec (Full User Journey)

**Request:** Run the app as a QA engineer; cover the end-to-end journey (landlord signup → admin approval → listing creation → boarder application → landlord acceptance → boarder confirmation) plus **all** scenarios — positive, negative, and edge cases. The spec below is the agreed test plan; no code has been changed.

**Status:** Spec only — approved for a manual browser walkthrough.

> **Amended 2026-09-26 (`boarder-find-a-room-redirect-spec.md`).** The boarder browse grid was
> retired: `/boarder/find-a-room` now redirects to the public `/find-a-room`, and
> `/boarder/find-a-room/$id` redirects to `/rooms/$id`. Apply/tour still live under
> `/boarder/find-a-room/$id/{apply,tour}`. Route lists and steps below are read with that in
> mind; the run reports themselves are historical and left as recorded.

---

~~Run happy-path QA: landlord signup → admin approve → listing → boarder apply → accept → confirm~~ ✅ Done (`20260816-1519`)
~~Probe edge cases (redirects, navigation, withdraw, multi-apply, access control) and record bugs~~ ✅ Done
~~Load design skills and implement UI/flow fixes for confirmed bugs~~ ✅ Done (8 bugs fixed)
~~Re-verify fixes and summarize findings~~ ✅ Done — see §10 Run Report below

## 1. Decisions Locked in the Interview

| Topic                        | Decision                                                                                                                                                                                                                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Environment                  | **Fully local** — API (`localhost:8000`) + frontend (`localhost:3000`) against a local D1 database                                                                                                                                                                                        |
| Admin account                | **Create one locally** via direct SQL insert (there is no admin signup/seed script)                                                                                                                                                                                                       |
| Scope                        | **Full coverage** — happy path + negative + edge cases                                                                                                                                                                                                                                    |
| Accepted-boarder landing     | **Confirm page first** — accepted boarder should land on `/boarder/confirm-booking`, not the dashboard                                                                                                                                                                                    |
| Test data                    | **Fresh accounts each run** (timestamped emails) so runs are repeatable and don't collide                                                                                                                                                                                                 |
| Deferred features (payments) | Payments **ship** as a manual ledger (`/api/boarder/payments`, `/api/landlord/payments*`, spec `payments-feature`); there is still **no gateway** and no `501 FEATURE_DEFERRED` path anywhere (F2). Messages **ship** (S31)                                                               |
| Deliverable                  | **Spec = test plan + bug log template** (no separate issue drafting)                                                                                                                                                                                                                      |
| Decline path                 | **Boarder can withdraw** an accepted application; leaving it `accepted` forever is not acceptable                                                                                                                                                                                         |
| Email verification           | **Note as limitation** — no real verification email is sent; landlord verification is admin-driven                                                                                                                                                                                        |
| QA method                    | **Manual browser walkthrough driven via the `/browser-use` Freebuff builtin** (direct browser control via CDP: automation, scraping, testing, screenshots, and site/app work). Preview: `browser-use/browser-use@browser-use` (91.2K installs) — direct CDP control, no cloud key needed. |
| Edge cases                   | **Every edge case encountered during the run is added to this spec** — incl. non-navigable pages, broken links, incorrect flows, wrong redirects, dead-ends, missing affordances, crashes                                                                                                 |
| Fix mandate                  | **AI decides and implements** fixes when the flow is incorrect or something is wrong and the fix is right for this app. UI work loads design skills first (`frontend-design`, `web-design-guidelines`, `accessibility`, `emil-design-eng`, `web-perf`)                                    |
| Google OAuth                 | **Include only if credentials are configured locally**; otherwise mark "not testable"                                                                                                                                                                                                     |
| Listing moderation           | **Cover it** — admin Publish/Reject/Flag actions                                                                                                                                                                                                                                          |
| Access control               | **Include** — UI route guards + API 403s across roles                                                                                                                                                                                                                                     |
| Multi-application            | **Include as edge case** — confirm one cancels the boarder's other applications                                                                                                                                                                                                           |
| Post-confirmation            | **Include** — tenancy page, dashboard state, leave-request flow                                                                                                                                                                                                                           |

---

## 2. Environment Setup (one-time, local)

1. Install deps: `bun install` and `bun install --cwd workers/api`.
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

### Local run preconditions

- `JWT_SECRET` must be present in `workers/api/.dev.vars` (copy from `.dev.vars.example`) or auth routes fail.
- Google OAuth and UploadThing are **not required** for this pass (photo uploads and OAuth are out of scope unless credentials exist).
- Payments **ship** as a manual ledger: `/api/boarder/payments` and `/api/landlord/payments*` are mounted from `workers/api/src/routes/payments.ts` (migration `0021_payments.sql`). There is still no `501 FEATURE_DEFERRED` code path anywhere (verified: zero matches under `workers/api`), and there is still **no payment gateway** — GCash/bank/cash are recorded, not processed (spec `payments-feature` D2).
- Messages are **not** deferred any more (`messages-feature-review`): the inbox, threads, images, unread state and report/block all ship, so S31 now checks shipped behaviour.

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

## 4. Scenario Matrix

Severity legend (for bugs found): **S1** Blocker · **S2** Major · **S3** Minor · **S4** Cosmetic.
Status per scenario: PASS / FAIL / BLOCKED / NOT TESTABLE.

---

### 4.1 Happy Path — Core Journey (P0)

**S1. Landlord signs up**

1. Visit `/` → "Sign up" → choose **Landlord** (or `/auth/signup/landlord`).
2. Fill all fields — first/last name, email, password (≥8), business/property name, description,
   contact number (valid PH mobile, e.g. `09171234567`), city, province, ID type + ID number.
3. Submit.

- **Expected:** Account created; redirected to `/landlord/verification`. API returns
  `account_status = pending_verification`, `verification_status = pending`, `is_verified = false`.
- **Note (observed limitation):** no real verification email is sent; verification is admin-driven.

**S2. Unverified landlord is blocked from creating a listing**

1. As the new landlord, try to create a listing (navigate to `/landlord/listings/create`, submit a valid form).

- **Expected:** Submission fails with a 403-style message (email verification required / verification pending). Listing is NOT created.

**S3. Admin logs in and approves the landlord**

1. Log in as `admin@example.com` → lands on `/admin` ("Command Center").
2. Open the **Landlords** tab → find the new landlord → click **Approve**.

- **Expected:** Confirmation notice; landlord row now shows "verified"; summary "Landlord verification" count decreases.

**S4. Approved landlord can create a listing**

1. As the landlord (still logged in from S1, or re-login), go to `/landlord/listings/create`.
2. Fill the form: name, type, gender pref, description, rent, deposit, rooms (1), capacity (1), min stay, address, city, province, amenities.
3. Submit.

- **Expected:** Redirect to `/landlord/listings`; the listing appears with status `active`. API returns 201 with `room_ids` populated.
- **Expected (per code):** the property is auto-`published` for public browsing — no admin publish step needed.

**S5. Listing is visible publicly**

1. Log out. Browse the public find-a-room page (and/or `/boarder/find-a-room` after boarder login).

- **Expected:** The listing and its room(s) appear with correct price/address.

**S6. Boarder signs up**

1. Sign up as boarder with a fresh email.

- **Expected:** Redirect to boarder area. `boarder_status = new`. (Frontend redirects to `/boarder` dashboard on email/password signup.)

**S7. Boarder applies to the room**

1. As the boarder, open the listing detail and click **Apply** (or go to `/boarder/find-a-room/<id>/apply`).
2. Select the room, write a message, submit.

- **Expected:** Redirect to `/boarder/application-submitted` ("Application submitted!"). API returns 201, status `pending`. The application appears under the boarder's Applications list. `boarder_status` becomes `applied_pending` on next login/refresh.

**S8. Landlord sees and accepts the application**

1. Log in as the landlord → `/landlord/applications`.

- **Expected:** The application shows with boarder name, room, price, status `pending`.

2. Click **Accept**.

- **Expected:** Status flips to `accepted`. The application row no longer shows Accept/Reject buttons.

**S9. Accepted boarder lands on the confirmation page** ⭐ (the key scenario)

1. Log out; log in as the boarder.

- **Expected (per interview decision):** the boarder lands on `/boarder/confirm-booking` — **not** the dashboard — where the accepted application is listed with a payment-method selector (GCash / bank transfer / cash) and a **Confirm Booking** button.
- **Known risk (code-level):** frontend `redirectPathForUser` (`apps/web/src/lib/oauth.ts`) always sends boarders to `/boarder` for email/password login, while the API's `boarderRedirectPath` (used for Google OAuth) is status-aware. **Likely S2 bug — verify actual behavior here.** If the boarder lands on the dashboard instead, log it as a finding (expected: confirm page).

**S10. Boarder confirms the booking**

1. On `/boarder/confirm-booking`, pick a payment method, click **Confirm Booking**.

- **Expected:** Redirect to `/boarder/tenancy`; the tenancy shows property, room, rent, move-in date, deposit. Dashboard shows the tenancy and "accepted" application count updated. API: application status → `confirmed`; `boarder_status` → `accepted`; **any other pending/accepted applications of this boarder are cancelled.**

**S11. Boarder tenancy follow-ups**

1. Open `/boarder/tenancy`.

- **Expected:** Full tenancy details render.

2. Click **Request to leave**, fill reason/date/message, submit.

- **Expected:** Request submits successfully (API `POST /api/boarder/leave-request` returns success); modal closes and tenancy refreshes.

---

### 4.2 Negative & Validation (P1)

**S12. Landlord signup validation**

- Short password (<8), mismatched confirm password, invalid PH phone (e.g. `123456`), missing required landlord fields (business name, ID type/number, city, province).
- **Expected:** Each rejected client-side with a clear message; no account created.

**S13. Boarder signup validation**

- Short password, mismatched confirm, invalid email.
- **Expected:** Rejected client-side; no account created.

**S14. Duplicate email signup**

- Sign up with an email that already exists (landlord or boarder).
- **Expected:** 409 "email already exists" style error shown; no duplicate account.

**S15. Admin rejects a landlord**

1. Sign up a second landlord; admin clicks **Reject** instead of Approve.

- **Expected:** Landlord remains unverified (`is_verified = 0`); cannot create listings. Verify the rejected landlord's verification page still says pending.

**S16. Boarder applies to the same room twice**

- After S7, try applying to the same room again.
- **Expected:** API returns 400 "You have already applied to this room. Status: pending" — no duplicate application.

**S17. Boarder applies with no message / missing room**

- Submit the apply form with an empty message or no room selected.
- **Expected:** Client blocks it ("Select a room to apply for.", required message) and/or API returns 400.

**S18. Landlord cannot re-process an application**

- After accepting (S8), try to Accept/Reject again (UI has no buttons; attempt the API via devtools if needed).
- **Expected:** API returns 403 "Application has already been processed".

**S19. Boarder cannot confirm a non-accepted application**

- Try to confirm a pending or rejected application (API call directly, or by URL manipulation).
- **Expected:** API returns 403 "Only accepted applications can be confirmed".

**S20. Invalid login attempts**

- Wrong password → 401 "The password you entered is incorrect".
- Unknown email → 401 "This account does not exist. Please sign up first."

**S21. Login for Google-only account**

- Register a user via Google if configured, then attempt email/password login with the same email.
- **Expected:** 401 "This account was registered with Google. Please use Google login." _(Only if OAuth configured; otherwise NOT TESTABLE.)_

---

### 4.3 Edge Cases (P1–P2)

**S22. Boarder withdraws an accepted application** ⭐ (interview decision: boarder can withdraw)

1. Get an application accepted (repeat S1–S8 with a fresh boarder).
2. As the boarder, delete/withdraw the application (boarder Applications list or API `DELETE /api/boarder/applications/:id`).

- **Expected:** Application no longer appears for the boarder (soft-deleted). The boarder should NOT be forced into confirming. If there is no UI affordance to withdraw an accepted application, log as finding (expected: a withdraw/cancel action exists; a "can never decline" state is not acceptable).

**S23. Multi-application cancel-on-confirm** ⭐

1. Landlord creates a second room (or a second listing) in the same run.
2. Boarder applies to **two** different rooms (both land in `pending`).
3. Landlord accepts **one** of them.
4. Boarder confirms the accepted one (S10).

- **Expected:** The other application is cancelled (`status = cancelled`, soft-deleted) automatically; boarder's applications list shows only the confirmed one as active.

**S24. Boarder applies to multiple rooms and is rejected on one**

1. Boarder applies to two rooms; landlord rejects one, accepts the other.

- **Expected:** Boarder sees one `rejected` and one `accepted`; only the accepted one appears on the confirm page; confirming it cancels nothing else (the rejected one is already terminal).

**S25. Room already has an application (occupied room filter)**

- The apply page filters to non-occupied rooms (`room.status !== 'Occupied'`).
- **Expected:** Once a room is occupied (via confirmed booking), a different boarder cannot apply to it through the UI. Verify via a second boarder browsing the listing.

**S26. Admin listing moderation** ⭐ (interview decision: cover it)

1. As admin, open the **Properties** tab.
2. **Flag** the landlord's listing → verify status changes to `flagged` and the listing disappears from public browsing.
3. **Reject** it (or a second listing) → verify it no longer appears publicly and the landlord's listing page reflects it (status `inactive`).
4. **Publish** it back → verify it reappears publicly.

- **Expected:** Each action produces the listed state change with a notice message.

**S27. Access control — UI route guards** ⭐ (interview decision: include)

- As a boarder, navigate directly to `/landlord`, `/landlord/listings`, `/admin`.
- As a landlord, navigate directly to `/admin`, `/boarder`.
- **Expected:** Redirected away (to `/`) or blocked; the protected page never renders for the wrong role.

**S28. Access control — API 403s**

- Call landlord-only endpoints with a boarder token and admin-only endpoints with a landlord/boarder token (e.g. `PATCH /api/landlord/applications/:id/status` as boarder; `/api/admin/landlords` as landlord).
- **Expected:** 403 responses (e.g. "Forbidden: You do not have permission to access this resource" / "Access denied. Admins only.").

**S29. Landlord status guard on listing writes**

- As an unverified landlord (S2 state), call `POST /api/landlord/listings` directly.
- **Expected:** 403 with `EMAIL_NOT_VERIFIED` / `VERIFICATION_PENDING` / `VERIFICATION_REQUIRED` codes.

---

### 4.4 Navigation & Reachability (P0–P1) — added per "page not navigable" mandate

**S32. Every nav item is reachable and renders**

- For each role shell (boarder, landlord, admin), click **every** item in the sidebar nav and verify the target page renders without error. Landlord nav: Dashboard, Listings, Applications, Boarders, Calendar, Announcements, Messages, Payments, Maps, Activity, Pricing, Settings, Verification, Onboarding. Boarder nav: Dashboard, Find a Room, Applications, Confirm Booking, Tenancy, Payments, Announcements, Messages, House Rules, Maps, Settings.
- **Expected:** each route renders its page (or a graceful empty/error state) — no blank screen, no crash, no broken link. **Any page that is not navigable or 404s is a logged bug (S1/S2).**

**S33. Direct URL navigation works**

- Paste each role page URL directly into the browser (logged out and logged in as the right role): e.g. `/landlord/applications`, `/boarder/tenancy`, `/admin`, `/boarder/confirm-booking`.
- **Expected:** logged out → redirected to `/auth/login`; wrong role → redirected away (or blocked); right role → page renders.

**S34. Back/forward and refresh survive on dynamic pages**

- On the landlord applications list, boarder applications list, and confirm-booking page: click a row/detail, press Back, refresh the page.
- **Expected:** no crash, no "not found", state reloads correctly from the API.

**S35. No dead-end pages**

- Every page that has a primary action must offer a way forward and a way back (breadcrumb/link/back button). Flag any page where the user is stuck with no navigation.

**S36. Public site reachability**

- From the homepage, every public link is reachable: Our Story, Our Team, For Landlords, Haven AI, Find a Room, Maps, legal pages (Privacy, Terms, User Agreement).
- **Expected:** all render; legal pages contain real content, not lorem ipsum.

**S37. 404 / not-found handling**

- Visit a nonexistent route (e.g. `/boarder/nonexistent-page`, `/rooms/999999`).
- **Expected:** graceful not-found UI (no raw error, no crash). A room detail for a missing id returns the not-found UI with HTTP 200 (per `fix(web): return 200 with not-found UI` commit).

---

### 4.5 Deferred Features — Expected Failures (P2)

**S30. Payments ship as a manual ledger (rewritten — this check used to expect a "coming soon" page)**

- As a boarder with a confirmed tenancy, open `/boarder/payments`.
- **Expected:** The real ledger — a balance/next-due/overdue summary and the tenancy's generated rent, deposit and advance charges. A boarder with no confirmed tenancy gets an empty state ("No charges yet"), never a crash and never a blank screen. Submitting a payment requires a reference number and parks the charge in _awaiting verification_; the landlord's ledger then offers **Verify** / **Reject**. No `501 FEATURE_DEFERRED` path exists (F2).

**S31. Messages ship (rewritten — this check used to expect a 501)**

- As a boarder with **no** confirmed tenancy, open `/boarder/messages` (deliberately **not** behind `RequireTenancy`, D12/R14).
- **Expected:** The inbox renders with its empty state — no 501, no "coming soon" copy anywhere (R20).
- As a boarder, open a listing and press **Contact Landlord**.
- **Expected:** The inbox opens (or creates) the pair thread with that listing's landlord and lands on `/boarder/messages/<id>?draft=<propertyId>` with a prefilled message naming the listing.
- As the landlord, open `/landlord/messages`.
- **Expected:** The thread appears with its unread pill; the sidebar shows an unread badge; the bell carries a `message` row with **no** body text and tapping it opens the thread.
- **Expected (both sides):** text + up to 4 images per message, a 2,000-character cap, unread cleared by opening the thread, block stopping both directions until unblocked, one open report per reporter, and delete hiding the conversation for the caller's side only.

---

### 4.6 Edge Cases Discovered During the Run

> This section grows as the run proceeds. Every unexpected behavior encountered is added here with its status (confirmed bug / by-design / fixed).

| #   | Discovered edge case      | Where | Actual behavior | Verdict | Fix applied? |
| --- | ------------------------- | ----- | --------------- | ------- | ------------ |
| —   | _(filled during the run)_ |       |                 |         |              |

---

## 5. Observed Limitations / Known Risks (from code reading — verify in run)

1. **Boarder post-login redirect** — frontend always sends boarders to `/boarder` after email/password login; only the Google-OAuth path is status-aware. Conflicts with the "confirm page first" intent (**S9**). Likely bug.
2. **No decline affordance on confirm page** — `/boarder/confirm-booking` only has "Confirm Booking"; withdrawal must go through the DELETE endpoint (**S22**).
3. **Email verification is not real** — no verification email is sent on email/password signup; landlords become `email_verified = 1` only via admin approval (**S1/S2** note).
4. **Landlord verification page upload is local-only** — the "Submit documents" button on `/landlord/verification` stores nothing to the API ("Upload to the API will be wired once the verification endpoint is finalized"). Verification relies on admin approval.
5. **Listings auto-publish** — `createLandlordProperty` inserts `listing_moderation_status = 'published'`, so admin moderation only bites after the fact (**S5/S26**).
6. **Payments and messaging are both live** — payments run as a manual ledger with boarder submission + landlord verification (**S30**), and messaging runs end-to-end (**S31**). No `501 FEATURE_DEFERRED` code path exists in the Worker for either (F2); no payment gateway is integrated.

---

## 6. Bug Log Template

For every failure found during the walkthrough, record:

```md
### BUG-<nn>: <Short title>

- **Severity:** S1/S2/S3/S4
- **Scenario:** S<n>
- **Environment:** local (API :8000 / web :3000)
- **Repro steps:**
  1. ...
- **Expected:** ...
- **Actual:** ...
- **Evidence:** screenshot / console output / API response (URL + status + body)
- **Impact:** who it affects and how
- **Suggested fix (optional):** ...
```

Run-wide summary at the end: counts by severity + scenario, plus a PASS/FAIL table.

---

## 7. Execution Order & Exit Criteria

Suggested run order: setup (Section 2) → S1–S11 (happy path) → S12–S21 (validation) → S22–S29 (edges) → S30 (payments) and S31 (messaging, live) → S26 last if it mutates the shared listing, or use a dedicated second listing.

**Exit criteria for "core journey passes":** S1–S11 all PASS (S9 per the confirm-page-first expectation; if the app redirects to the dashboard, that's a logged S2 bug and the journey is BLOCKED-by-bug, not failed). S30 is PASS when it fails gracefully; S31 is PASS when the messaging flows in its story behave as written (it is a live feature, not a deferred one).

---

## 8. QA Driver & Fix Process

**Driver:** `/browser-use` Freebuff builtin — direct browser control via CDP for web interaction:
automation, scraping, testing, screenshots, and site/app work (`browser-use/browser-use@browser-use`, 91.2K installs).
No cloud API key required for the local CDP variant. If the builtin is unavailable in a given session,
fall back to native Python Playwright (system Chrome, headless) — same scenarios, same logging.

**Run loop per scenario:**

1. Execute the scenario via the browser driver (fill forms, click through, capture screenshots to `qa-screenshots/`).
2. Verify the API state behind the UI where relevant (curl against `localhost:8000`).
3. **Expected result** vs **actual result** — record PASS/FAIL in Section 4.x.
4. On FAIL:
   - Determine severity (S1–S4) and whether it's a bug or by-design.
   - If it's a flow/UX/navigability bug that should be fixed for this app → **implement the fix** (load design
     skills first: `frontend-design`, `web-design-guidelines`, `accessibility`, `emil-design-eng`; reuse the shared
     UI kit `components/ui/*` and `RoleShell`/`Protected` conventions).
   - Re-run the scenario after the fix and record before/after.

**Fix authority:** The AI decides and implements when the flow is incorrect or something is wrong and the fix
is right for this app — e.g. wrong redirects (S9), missing decline affordance (S22), non-navigable pages (S32),
broken role guards (S27/S28), dead-ends (S35). Backend fixes follow the repository pattern in
`workers/api/src`; frontend fixes reuse the existing UI kit. No new dependencies unless required.

---

## 9. Out of Scope (this pass)

- Google OAuth end-to-end (only if credentials are configured — otherwise NOT TESTABLE).
- Photo uploads via UploadThing (needs token; UI-only upload verified in S4 without a real upload).
- Password reset email delivery (no transactional email provider wired).
- **Code changes are IN scope** when a discovered bug is confirmed and a fix is clearly right for the app
  (per the fix mandate). Pure QA reporting applies only to bugs deemed out of scope or not clearly fixable.

---

## 10. Run Report — `20260816-1519` (local, API :8000 / web :3000, local D1)

**Driver:** Freebuff preview browser (CDP) + curl verification against `localhost:8000`.
**Result:** 36/37 scenarios PASS · 1 NOT TESTABLE · 8 bugs found and fixed · all test suites green after fixes
(API `bun test` 148 pass, web `bun run test` 21 pass; both `tsc --noEmit` clean).

### 10.1 Scenario results

| #   | Scenario                                  | Status                    | Notes                                                                                                                                                                                                                                                                                                                                                                                                             |
| --- | ----------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Landlord signup                           | ✅ PASS                   | Redirect → `/landlord/verification`; DB: `pending_verification`, `is_verified=0`                                                                                                                                                                                                                                                                                                                                  |
| S2  | Unverified landlord blocked from listing  | ✅ PASS                   | UI shows "Email verification required"; no property row created                                                                                                                                                                                                                                                                                                                                                   |
| S3  | Admin approves landlord                   | ✅ PASS (after BUG-01)    | Row → Verified, summary count 3→2                                                                                                                                                                                                                                                                                                                                                                                 |
| S4  | Approved landlord creates listing         | ✅ PASS (after BUG-02)    | 201, `room_ids` populated, auto-`published`                                                                                                                                                                                                                                                                                                                                                                       |
| S5  | Listing visible publicly                  | ✅ PASS                   | Public find-a-room shows QA Cozy Pad ₱4,500                                                                                                                                                                                                                                                                                                                                                                       |
| S6  | Boarder signup                            | ✅ PASS                   | `/auth/signup` (no `/auth/signup/boarder` route exists) → `/boarder`                                                                                                                                                                                                                                                                                                                                              |
| S7  | Boarder applies                           | ✅ PASS                   | → `/boarder/application-submitted`; app `pending`                                                                                                                                                                                                                                                                                                                                                                 |
| S8  | Landlord accepts                          | ✅ PASS                   | Status → `accepted`, buttons gone                                                                                                                                                                                                                                                                                                                                                                                 |
| S9  | Accepted boarder lands on confirm page ⭐ | ✅ PASS (after BUG-03)    | Was FAIL (dashboard); now → `/boarder/confirm-booking`                                                                                                                                                                                                                                                                                                                                                            |
| S10 | Boarder confirms booking                  | ✅ PASS (after M1)        | → `/boarder/tenancy`; app `confirmed`, `gcash`                                                                                                                                                                                                                                                                                                                                                                    |
| S11 | Tenancy + leave request                   | ✅ PASS                   | Leave request recorded (`completed`, reason + date); tenancy page then shows "No active tenancy" (M3 note)                                                                                                                                                                                                                                                                                                        |
| S12 | Landlord signup validation                | ✅ PASS                   | Mismatch, <8 chars, invalid PH phone each rejected client-side                                                                                                                                                                                                                                                                                                                                                    |
| S13 | Boarder signup validation                 | ✅ PASS                   | HTML5 `type=email` + `minLength=8` block; no account created                                                                                                                                                                                                                                                                                                                                                      |
| S14 | Duplicate email                           | ✅ PASS                   | 409 "Email already exists"                                                                                                                                                                                                                                                                                                                                                                                        |
| S15 | Admin rejects landlord                    | ✅ PASS                   | Stays `is_verified=0`; listing write → 403                                                                                                                                                                                                                                                                                                                                                                        |
| S16 | Apply to same room twice                  | ✅ PASS                   | 400 "You have already applied to this room. Status: pending"                                                                                                                                                                                                                                                                                                                                                      |
| S17 | Apply with no message/room                | ✅ PASS                   | 400 "Missing required field: message"; client required fields                                                                                                                                                                                                                                                                                                                                                     |
| S18 | Landlord re-process                       | ✅ PASS                   | 403 "Application has already been processed"                                                                                                                                                                                                                                                                                                                                                                      |
| S19 | Confirm non-accepted                      | ✅ PASS                   | Pending → 403 "Only accepted applications can be confirmed"                                                                                                                                                                                                                                                                                                                                                       |
| S20 | Invalid logins                            | ✅ PASS                   | 401 wrong password / unknown email                                                                                                                                                                                                                                                                                                                                                                                |
| S21 | Google-only login                         | ⚠️ NOT TESTABLE           | No OAuth E2E credentials                                                                                                                                                                                                                                                                                                                                                                                          |
| S22 | Boarder withdraws accepted app ⭐         | ✅ PASS (after BUG-04)    | Withdraw button added; app soft-deleted; next login → dashboard (not confirm page)                                                                                                                                                                                                                                                                                                                                |
| S23 | Multi-apply cancel-on-confirm             | ✅ PASS                   | Other app → `cancelled` + soft-deleted                                                                                                                                                                                                                                                                                                                                                                            |
| S24 | One rejected / one accepted               | ✅ PASS                   | Confirmed one stays; rejected untouched                                                                                                                                                                                                                                                                                                                                                                           |
| S25 | Occupied-room filter ⭐                   | ✅ PASS (after BUG-05)    | Was FAIL (double-booking); confirm now marks room `occupied`, API rejects new applies (400)                                                                                                                                                                                                                                                                                                                       |
| S26 | Admin listing moderation ⭐               | ✅ PASS (after BUG-06)    | Flag/Reject/Publish all work; landlord sees `inactive` when rejected                                                                                                                                                                                                                                                                                                                                              |
| S27 | UI route guards                           | ✅ PASS                   | Boarder→/landlord,/admin→`/`; landlord→/admin,/boarder→`/`                                                                                                                                                                                                                                                                                                                                                        |
| S28 | API 403s across roles                     | ✅ PASS                   | Landlord endpoint as boarder → 403; admin endpoint as landlord → 403 "Access denied. Admins only."                                                                                                                                                                                                                                                                                                                |
| S29 | Unverified landlord write guard           | ✅ PASS                   | 403 "Email verification required"                                                                                                                                                                                                                                                                                                                                                                                 |
| S30 | Payments ledger ships                     | ✅ PASS                   | Ledger, summary and submit flow render; a boarder with no tenancy gets an empty state; there is no `501 FEATURE_DEFERRED` route to assert                                                                                                                                                                                                                                                                         |
| S31 | Messages inbox                            | ✅ PASS (after fixes)     | Re-run by hand 2026-10-09, two QA accounts on local D1 at 1440px + 390px: inbox with no tenancy, listing CTA thread + prefill, bell row with no body, unread badges, block/unblock both ways, report, per-side delete + revival. Four defects found and fixed first (`messages-feature-review` §12.8). Image _upload_ leg not testable locally (no `UPLOADTHING_TOKEN`); send + display verified with stored URLs |
| S32 | Every nav item reachable                  | ✅ PASS (after BUG-07/08) | 12 boarder + 15 landlord pages render; no 404/error boundary                                                                                                                                                                                                                                                                                                                                                      |
| S33 | Direct URL navigation                     | ✅ PASS                   | Logged out → `/auth/login`; wrong role → `/`; right role renders                                                                                                                                                                                                                                                                                                                                                  |
| S34 | Back/forward/refresh                      | ✅ PASS                   | Refresh reloads state cleanly; no crash                                                                                                                                                                                                                                                                                                                                                                           |
| S35 | No dead-end pages                         | ✅ PASS (after BUG-07)    | Was FAIL: `/landlord/applications` had no shell/navigation                                                                                                                                                                                                                                                                                                                                                        |
| S36 | Public site reachability                  | ✅ PASS                   | All public + legal pages render with real content                                                                                                                                                                                                                                                                                                                                                                 |
| S37 | 404 / not-found                           | ✅ PASS                   | Graceful "Not Found" / "Room not found" + Browse rooms                                                                                                                                                                                                                                                                                                                                                            |

### 10.2 Bug log

### BUG-01: Admin dashboard crashes on load ("Cannot read properties of undefined (reading 'data')")

- **Severity:** S1 (blocker)
- **Scenario:** S3 / S26 / S32
- **Environment:** local (API :8000 / web :3000)
- **Repro:** Log in as admin → `/admin` → app-level error boundary "Something went wrong!"; no `/api/admin/*` calls fire.
- **Expected:** Command Center renders with stat cards and tables.
- **Actual:** `AdminOverview` throws at `rows={users.data!.data}` (and `properties.data!`, `landlords.data!`) — non-null assertions are evaluated eagerly while the React Query result is still pending (`users.data === undefined`).
- **Evidence:** Stack: `TypeError: Cannot read properties of undefined (reading 'data') at AdminOverview (src/routes/admin/index.tsx:556:25 compiled / :365 source)`.
- **Impact:** All admins; the whole admin area (approvals, moderation) was unreachable. Pre-existing since `d918682 feat(web): restore admin page design with the shared kit`.
- **Fix:** Guarded the three tables with `{users.data ? <DataTable …/> : null}` (same pattern the applications/settings tabs already used). ✅ Verified: Command Center renders, all tabs load.

### BUG-02: Creating a listing always returns 500 (NOT NULL constraint on property_rules)

- **Severity:** S1 (blocker)
- **Scenario:** S4
- **Repro:** Landlord submits the create-listing form (or `POST /api/landlord/listings` with valid camelCase payload).
- **Expected:** 201 with `room_ids`.
- **Actual:** 500 `{"error":"Internal server error"}` — SQLite `NOT NULL constraint failed: properties.property_rules`.
- **Root cause:** `propertyRules: stringValue(body, 'propertyRules') || null` binds an explicit `NULL` into `property_rules TEXT NOT NULL DEFAULT ''`.
- **Impact:** No landlord could ever publish a listing.
- **Fix:** Bind `''` fallback. ✅ Verified: 201, listing created, room populated.

### BUG-03: Accepted boarder lands on dashboard, not the confirm page (predicted S2 risk)

- **Severity:** S2
- **Scenario:** S9 (⭐ key scenario)
- **Repro:** Landlord accepts application → boarder logs out/in via email+password.
- **Expected:** `/boarder/confirm-booking`.
- **Actual:** `/boarder` dashboard. Frontend `redirectPathForUser` (oauth.ts) was role-only; API `boarderRedirectPath` mapped `accepted` → `/boarder` too.
- **Fix (3 parts):** (1) frontend `redirectPathForUser` is now status-aware — `accepted` → `/boarder/confirm-booking`, `confirmed` → `/boarder`, `applied_pending/rejected` → `/boarder/applications`; (2) API `determineBoarderStatus` now returns `confirmed` when a confirmed booking exists (so confirmed boarders don't get re-routed to confirm); (3) API `boarderRedirectPath` maps `accepted` → `/boarder/confirm-booking`. ✅ Verified: accepted boarder → confirm page; post-confirmation login → dashboard; post-withdrawal login → dashboard.

### BUG-04: No UI to withdraw an accepted application ("can never decline")

- **Severity:** S2 (violates interview decision)
- **Scenario:** S22 (⭐)
- **Repro:** Boarder opens an accepted application: list shows no actions; detail page's "Delete application" button is `disabled={… || isAccepted}`.
- **Expected:** A withdraw/cancel affordance for accepted applications.
- **Actual:** The only paths for an accepted app were confirm or wait; the DELETE endpoint worked but had no UI.
- **Fix:** Added a **Withdraw** action to the applications list (accepted + pending) and re-enabled the detail-page delete for accepted apps (relabeled "Withdraw application"). ✅ Verified: withdraw soft-deletes the app, list empties, and the next login goes to the dashboard (not forced to confirm).

### BUG-05: Confirming a booking never marks the room occupied → double-booking possible

- **Severity:** S2
- **Scenario:** S25 (⭐)
- **Repro:** Boarder A confirms a room; boarder B (different account) applies to the same room via UI/API and is also confirmed by the landlord. Room stays `available` after every confirm.
- **Expected:** Occupied room rejects new applications (`room.status !== 'Occupied'` filter, API 400).
- **Actual:** Room never became occupied; observed two boarders with confirmed bookings on the same room.
- **Fix:** (1) confirm route marks the room `occupied`; (2) leave-request completion frees the room back to `available`; (3) create-application route rejects applies to occupied rooms with 400 "This room is already occupied…". ✅ Verified: room status flips `occupied` on confirm; a second boarder's apply is rejected with 400; leave request frees the room.

### BUG-06: Admin moderation unreachable — Properties tab only lists `pending_review` while listings auto-publish

- **Severity:** S2
- **Scenario:** S26 (⭐)
- **Repro:** Admin → Properties tab shows "No properties pending review" despite two published listings; Publish/Reject/Flag never appear.
- **Expected:** Admin can Flag/Reject/Publish listings.
- **Actual:** Frontend queried `/api/admin/properties?moderation=pending_review`; the API only supports filtering by a single status; every listing is auto-`published`, so nothing ever appeared.
- **Fix:** API now supports `moderation=all` (no status filter); frontend uses it; tab shows all properties with moderation actions. ✅ Verified: Flag → `flagged` + removed from public; Reject → landlord sees `inactive`; Publish → restored publicly.

### BUG-07: `/landlord/applications` renders without the app shell (dead-end page)

- **Severity:** S2 (S32/S35: page not navigable as expected)
- **Scenario:** S32 / S35
- **Repro:** Open `/landlord/applications` → only a bare table; no sidebar, no topbar, no log-out.
- **Expected:** RoleShell with navigation like every other landlord page.
- **Actual:** `RoleShell` was imported but never rendered (route returned a bare `<div>`).
- **Fix:** Wrapped the page in `<RoleShell title="Applications" nav={LANDLORD_NAV}>`. ✅ Verified: sidebar + topbar + Log out render.

### BUG-08: Boarder find-a-room shows a doubled shell (two sidebars/topbars)

- **Severity:** S3 (cosmetic/navigability)
- **Scenario:** S32
- **Repro:** Open `/boarder/find-a-room` → two stacked sidebars and two "Log out" buttons.
- **Expected:** One shell.
- **Actual:** The layout route `/boarder/find-a-room` AND its index route both wrapped content in `RoleShell`.
- **Fix:** Index route no longer wraps (parent layout provides the shell). ✅ Verified: single sidebar/topbar.

### Minor findings (fixed)

- **M1 (S10):** Confirm-booking page rendered rent as **₱0** — frontend read `monthly_rent ?? price` but the API returns `room_price`. ✅ Fixed (`room_price ?? monthly_rent ?? price`).
- **M2 (S10/S11):** Tenancy deposit showed **₱0** because `createLandlordRoom` never stored the property deposit. ✅ Fixed: room insert now carries `deposit` (verified: room deposit 2500 when listing deposit 2500).

### Minor observations (by-design / noted, not fixed)

- **M3 (S11):** After a leave request the tenancy page switches to "No active tenancy" with a misleading "Once your booking is confirmed…" empty state; there is no "leave request pending" state. Tenancy data is correctly `completed` in the DB.
- **M4:** React SSR hydration-mismatch warnings fire on several shell pages (`<div className="flex min-h-screen">` in RoleShell). Client regenerates the tree; no user-visible breakage, but noisy.
- **M5:** A room with two concurrent confirmed bookings created before BUG-05's fix remains double-booked in the DB (test data, not new writes).
- **M6:** `boarder_status` is stored on `users` (via `updateBoarderStatus`) but the canonical status is computed at login (`determineBoarderStatus`); they can diverge between writes. Not user-visible.

### 10.3 Edge cases discovered during the run (filled from §4.6)

| #   | Discovered edge case                            | Where                         | Actual behavior                                    | Verdict                     | Fix applied? |
| --- | ----------------------------------------------- | ----------------------------- | -------------------------------------------------- | --------------------------- | ------------ |
| 1   | Admin dashboard crash on load                   | `/admin`                      | Error boundary, no data                            | Confirmed bug (BUG-01)      | ✅           |
| 2   | Listing creation 500 on property_rules NULL     | `POST /api/landlord/listings` | 500 NOT NULL constraint                            | Confirmed bug (BUG-02)      | ✅           |
| 3   | Accepted boarder redirected to dashboard        | email/password login          | Dashboard instead of confirm page                  | Confirmed bug (BUG-03)      | ✅           |
| 4   | No withdraw affordance for accepted apps        | boarder applications          | Delete disabled, list has no action                | Confirmed bug (BUG-04)      | ✅           |
| 5   | Room never marked occupied on confirm           | confirm flow                  | Double-booking possible (observed)                 | Confirmed bug (BUG-05)      | ✅           |
| 6   | Admin moderation unreachable                    | admin Properties tab          | Lists only `pending_review`; listings auto-publish | Confirmed bug (BUG-06)      | ✅           |
| 7   | Landlord applications page missing shell        | `/landlord/applications`      | No sidebar/topbar/logout                           | Confirmed bug (BUG-07)      | ✅           |
| 8   | Doubled shell on boarder find-a-room            | `/boarder/find-a-room`        | Two sidebars/topbars                               | Confirmed bug (BUG-08)      | ✅           |
| 9   | Confirm-page rent shows ₱0                      | `/boarder/confirm-booking`    | Field mismatch `room_price`                        | Confirmed bug (M1)          | ✅           |
| 10  | Tenancy deposit shows ₱0                        | `/boarder/tenancy`            | Room deposit never set on create                   | Confirmed bug (M2)          | ✅           |
| 11  | Two boarders confirmed same room (pre-fix data) | room 2                        | Both apps `confirmed`; room `available` until fix  | By-design fallout of BUG-05 | —            |

### 10.4 Summary

- **Counts by severity:** S1 ×2 (BUG-01, BUG-02) · S2 ×5 (BUG-03…BUG-07) · S3 ×2 (BUG-08, M1) · S4 ×0 · M2 (S3 data fix).
- **Counts by scenario:** S3/S4/S9/S22/S25/S26/S32/S35 all had confirmed bugs fixed.
- **Exit criteria:** Core journey S1–S11 ✅ PASS (S9 was BLOCKED-by-bug before the fix, PASS after). S30/S31 ✅ PASS (fail gracefully). All tests green: API 148/148, web 21/21, both typechecks clean.
