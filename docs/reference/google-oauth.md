# Google OAuth Login/Signup Flow — Spec

Status: Draft (pre-implementation) · Date: 2026-08-16
Branch: `pages-migration-and-booking-flow`
Sites: web `https://haven-space.pages.dev` · API `https://haven-space-api.ovpcasss.workers.dev`

---

## 1. Problem Statement

Two intertwined problems:

1. **Prod bug — Google login appears to "do nothing".** On the deployed site, clicking
   _Continue with Google_ opens the Google account chooser, the user picks an account, and the
   browser lands back on `/auth/login` with **no visible feedback**. The user cannot tell whether
   login succeeded, failed, or is pending.
2. **Missing product flow — no role choice for first-time Google users.** Today a first-time
   Google login silently creates a **boarder** account and skips the "choose boarder or landlord"
   step entirely. There is no way to sign up as a landlord with Google.

The user asked two direct questions this spec answers:

- **What is the real process when I log in with Google (no signup yet)?**
  Intended: a first-time Google user should be routed to a **role chooser** (Boarder / Landlord),
  not silently turned into a boarder.
- **Will it go to "choose boarder or landlord"?** Today: **no** (auto-creates a boarder).
  Intended: **yes**, for brand-new Google emails only.

---

## 2. Current Behavior (as coded) — Full Walkthrough

### 2.1 Files involved

| Concern                                                               | File                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------ |
| OAuth helpers (hash parse, redirect target, authorize URL)            | `apps/web/src/lib/oauth.ts`                                  |
| Global `#auth=` handler                                               | `apps/web/src/routes/__root.tsx` (RootComponent `useEffect`) |
| Login page (Google button → `action=login`, role hardcoded `boarder`) | `apps/web/src/routes/auth/login.tsx`                         |
| Boarder signup page (Google button → `action=signup`, role `boarder`) | `apps/web/src/routes/auth/signup/index.tsx`                  |
| Landlord signup page (**no** Google button)                           | `apps/web/src/routes/auth/signup/landlord.tsx`               |
| Email signup role chooser (`/auth/choose`)                            | `apps/web/src/routes/auth/choose.tsx`                        |
| API Google authorize + callback + user resolution                     | `workers/api/src/routes/auth.ts`                             |
| User repo (google account create / link)                              | `workers/api/src/repositories/users.ts`                      |
| Auth session hydration (localStorage → context, `isHydrated`)         | `apps/web/src/lib/auth-context.tsx`                          |
| Role gate                                                             | `apps/web/src/components/auth/Protected.tsx`                 |

### 2.2 Flow steps (current)

1. Login page button: `window.location.href = googleAuthorizeUrl('login', 'boarder')` →
   `GET {api}/auth/google/authorize?action=login&role=boarder&origin={frontendOrigin}`.
2. `handleGoogleAuthorize`:
   - `requireGoogleConfig` — if `JWT_SECRET`/`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` missing →
     `authErrorRedirect` back to `/auth/login?error=Google%20OAuth%20is%20not%20configured`.
   - Else builds a signed JWT `state` (`type: google_oauth_state`, `action`, `role`, `origin`,
     `nonce`, 10-min expiry), sets HttpOnly `google_oauth_state` cookie, redirects to Google.
3. Google consent → `GET {api}/auth/google/callback?code=...&state=...`.
4. `handleGoogleCallback`:
   - `verifiedGoogleState` — verifies the JWT and **matches the nonce against the
     `google_oauth_state` cookie**. Any mismatch → `authErrorRedirect` → `/auth/login?error=Google
login session expired. Please try again.`
   - `?error` from Google (user cancelled) → `authErrorRedirect` → `/auth/login?error=<...>`.
   - Exchanges `code` for tokens; fetches profile from OpenID userinfo.
   - `userFromGoogleProfile`: - by `google_id` → existing user (login). - by email → links Google identity (`updateGoogleIdentity`) → existing user (login). - **new user**: if `role === 'landlord'` → throw `'Please create landlord accounts with the
landlord signup form.'`; otherwise **auto-creates a boarder** account
     (`createGoogleUserAccount`, `boarderStatus: 'new'`, `isVerified: 1`, `emailVerified: 1`).
   - Suspended/banned → error redirect.
   - Success → redirects to `{origin}/{redirectPathForUser(user)}#auth={urlEncodedJson}` where the
     payload = `{ success, access_token, refresh_token, user }` (plus cookies `access_token` /
     `refresh_token`).
5. Frontend: `handleOAuthHash()` in `__root.tsx` (and again in each auth page) parses `#auth=`,
   persists via `setStoredAuth`, cleans the hash, then `navigate({ to: redirectPathForUser(user) })`.

### 2.3 Redirect mapping (status-aware, both API and frontend `redirectPathForUser`)

| Role / boarder status                                           | Landing                    |
| --------------------------------------------------------------- | -------------------------- |
| admin                                                           | `/admin`                   |
| landlord                                                        | `/landlord`                |
| boarder `accepted`                                              | `/boarder/confirm-booking` |
| boarder `confirmed`                                             | `/boarder`                 |
| boarder `applied_pending` / `pending_confirmation` / `rejected` | `/boarder/applications`    |
| boarder `new` / `browsing`                                      | `/find-a-room`             |

### 2.4 Where the prod "does nothing" comes from

- On **any** failure inside the callback, `authErrorRedirect` builds
  `/auth/login?error=<message>` (action `login`).
- **No frontend route reads the `error` search param** — confirmed by searching the repo
  (0 matches for `searchParams.get('error')` / `useSearch` error handling in auth pages).
- Result: the user is bounced back to a normal-looking `/auth/login` and sees nothing.

**Confirmed symptom detail (interview):** the Google consent screen _does_ open, so OAuth
credentials exist on prod and the authorize step works; the failure happens **after** consent
(callback error path). The exact `?error=` value is not yet captured (see §6 diagnostics).

Candidate causes to rule out during diagnosis (order of likelihood):

1. `google_oauth_state` cookie / nonce mismatch → _"Google login session expired. Please try
   again."_ (cookie set on the `workers.dev` API domain; cross-site top-level navigation back to
   the callback should carry SameSite=Lax, but blocking/cookie-policy settings or the
   `workers.dev` public-suffix handling can break it).
2. `Google account email is not verified` (profile `email_verified` false/absent).
3. Token exchange / userinfo fetch failures (upstream or network).
4. `This email is already linked to another Google account` (only for repeat attempts).
5. Origin mismatch → `state.origin` not in `APP_ORIGIN` (would fall back to `localhost:3000`; less
   likely to produce a return to `/auth/login`, but possible if the fallback is a stale origin).

**Note:** `main` already contains `handleOAuthHash` in `oauth.ts`, `__root.tsx`, and `login.tsx`
(verified via `git show main:...`), so the deployed frontend is not stale in that respect; the
status-aware boarder landing is branch-only but not the cause of the bounce-back.

---

## 3. Desired Behavior (decided via interview)

### 3.1 First-time Google login (no account for this email anywhere)

1. User clicks _Continue with Google_ (login page, either signup page, or role chooser).
2. Google consent → callback.
3. **Callback detects a brand-new email → redirects to a role chooser page** (frontend),
   carrying a short-lived pending session token (see §5.2 for the mechanism).
4. Chooser shows **Boarder** / **Landlord** cards.
   - **Boarder** → account created immediately (role `boarder`, `boarder_status: 'new'`,
     `is_verified: 1`, `email_verified: 1` — trust Google) → lands on **`/find-a-room`** (the
     public browse page; amended by `boarder-find-a-room-redirect-spec.md`).
   - **Landlord** → optional pre-filled form appears (name/email already filled from Google;
     business/property name, phone, city, province, description **all optional — only the role
     choice is required**) → on submit, account created (role `landlord`) → lands on the
     **landlord dashboard** (`/landlord`) with a **"pending verification"** banner. The landlord
     can fill profile/verification details later; the dashboard shows the pending state.
5. Google accounts trust Google's email verification (no separate Haven email-verification step).

### 3.2 Returning Google user

- Already linked (by `google_id` or previously-linked email) → **skip the chooser**, issue tokens,
  land on the status-aware redirect for their role (§2.3).

### 3.3 Existing email/password account signs in with Google (same email, no Google link yet)

- Do **not** silently link. Route to the chooser page which shows an **inline account-found
  notice**: _"An account already exists for <email>. Link Google sign-in?"_
  - **Link** → API attaches the Google identity to the existing account and logs in (role
    preserved; landing per §2.3).
  - **Cancel/Use password instead** → back to `/auth/login` (no account changes).

### 3.4 Cancelled on Google consent

- Redirect back to `/auth/login` with a friendly banner: _"Google login was cancelled."_

### 3.5 Any Google auth failure

- **Inline error banner** on the page that receives the redirect (login / signup / chooser),
  showing the API-provided message (e.g., "Google OAuth is not configured", "Google login session
  expired. Please try again."). The `?error=` param must be surfaced, never silently dropped.

### 3.6 Landlord Google signup enabled

- Google sign-in/sign-up for landlords is supported (new accounts, optional details).
- Existing Google-created or linked landlord accounts log in as landlord and land on `/landlord`.

---

## 4. Current Deviations to Fix (summary)

| #   | Issue                                        | Current                                                                  | Desired                                                  |
| --- | -------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------- |
| D1  | `?error=` silently swallowed                 | `/auth/login?error=...` renders nothing                                  | Inline banner on all auth pages                          |
| D2  | New Google user auto-created as boarder      | callback creates boarder immediately                                     | Route to role chooser first                              |
| D3  | Landlord Google signup blocked               | error _"Please create landlord accounts with the landlord signup form."_ | Enabled, optional details                                |
| D4  | Existing email account silently linked       | `updateGoogleIdentity` without consent                                   | Inline "link Google?" confirmation                       |
| D5  | Cancel gives no feedback                     | error redirect, no visible notice                                        | "Google login was cancelled" banner                      |
| D6  | Login Google button hardcodes `role=boarder` | `googleAuthorizeUrl('login', 'boarder')`                                 | Role resolved server-side; chooser decides for new users |

---

## 5. Proposed Implementation (direction — refine during implementation)

> No code has been written yet. The sections below are the intended shape, to be validated while
> implementing and testing locally.

### 5.1 API (`workers/api/src/routes/auth.ts`, `repositories/users.ts`)

- **Split user resolution from account creation** in the callback:
  - Resolve existing user (by `google_id` or email) → existing path (tokens + status-aware
    redirect), **no chooser**.
  - New email → **do not create yet**; redirect to the frontend chooser page.
  - Email matches an existing password account → **do not link yet**; redirect to the chooser
    page in "link-confirm" mode.
- **Pending-session token**: after a successful Google exchange for a new/link case, mint a
  short-lived signed JWT (e.g., `type: 'google_pending'`, contains `google_id`, `email`, `name`,
  `picture`, `action`, `origin`, `nonce`, ~10 min expiry) and redirect to
  `{origin}/auth/choose-role#google-pending={jwt}` (mirrors the existing `#auth=` fragment pattern).
- **New endpoint** to complete the flow, e.g. `POST /auth/google/complete` (and
  `/api/auth/google/complete`):
  - Body: `{ pendingToken, role: 'boarder' | 'landlord', businessName?, description?, city?,
province?, phoneNumber? }` plus `link: true` for the existing-account case.
  - Validates the pending token; creates the account for the chosen role (or links the identity
    for the existing-account case); returns the standard auth payload
    (`access_token`, `refresh_token`, `user`) so the frontend persists the session like the
    `#auth=` path does.
  - New boarder: `boarder_status: 'new'`, `is_verified: 1`, `email_verified: 1`, `account_status:
'active'`.
  - New landlord: `is_verified: 0`, `email_verified: 1` (trust Google), `account_status: 'active'`
    (landing works; verification badge shows pending — confirm the exact gating that should apply,
    see §7 Open Questions). Name from Google; optional fields stored if provided.
- Keep `boarderRedirectPath` / `redirectPathForUser` status-aware mapping (§2.3) unchanged.
- Keep error handling via `authErrorRedirect` (now that the frontend surfaces `?error=`).

### 5.2 Frontend (`apps/web/src/lib/oauth.ts`, routes)

- **New route `/auth/choose-role`** (new file; reuse `AuthSplitLayout`, `GoogleButton`-style UI,
  `Card`s):
  - Reads the `#google-pending=` fragment via a new helper (e.g., `handlePendingGoogleSession()`),
    validates shape, shows:
    - **New-account mode**: Boarder / Landlord cards (mirror `/auth/choose` visuals).
    - **Landlord details step**: optional fields (business/property name, description, phone,
      city, province) pre-filled with Google name/email; "Continue" proceeds with or without them.
    - **Link mode**: account-found notice + "Link Google account" / "Cancel" actions.
  - Calls the `google/complete` endpoint; on success persists via `setStoredAuth` and navigates
    with `resolvePostAuthPath(user, redirect)` (landlord → `/landlord`; boarder → `/find-a-room`).
    The helper wraps `redirectPathForUser(user)` and only honours the OAuth `redirect` when it
    is reachable for the user's role.
  - Also renders `?error=` banners.
- **Surfacing `?error=`**: on `/auth/login`, `/auth/signup`, `/auth/signup/landlord`, and
  `/auth/choose-role`, read the `error` search param (TanStack route `validateSearch`) and render
  an `ErrorState`/banner; keep the message in the URL until consumed or use `replaceState` after
  render.
- **Login page**: keep the Google button (`action=login`). Role param becomes a hint; the chooser
  decides for new users.
- **Landlord signup page**: add a `GoogleButton` (`action=signup`) above the form, plus the
  `#auth=`/`#google-pending=` handling.
- **`redirectPathForUser`**: landlord → `/landlord` (with pending banner) and new boarder →
  `/find-a-room` (amended by `boarder-find-a-room-redirect-spec.md`). `resolvePostAuthPath`
  applies this as the fallback whenever an explicit `redirect` is absent or belongs to another
  role's area.

### 5.3 Tests

- API (`workers/api/test/auth.test.ts`): extend Google OAuth tests —
  - new email → callback redirects to chooser URL with pending token, **no** account row created;
  - `google/complete` with role `boarder` creates boarder (`status new`, verified);
  - `google/complete` with role `landlord` creates landlord (unverified, email-verified);
  - `google/complete` with `link: true` links identity to existing password account (password
    login still works afterwards);
  - missing/invalid/expired pending token → 400/401;
  - existing Google user → immediate token redirect (no chooser);
  - cancel → `/auth/login?error=...`.
- Frontend (`apps/web/test/oauth.test.ts`): pending-session parse helpers, chooser mode detection,
  `?error=` rendering on login page.
- Manual E2E (see §6).

---

## 6. Verification Plan

### 6.1 Local reproduction & diagnosis of the prod bug (before/while implementing)

Preconditions already confirmed with the user: `workers/api/.dev.vars` has `GOOGLE_CLIENT_ID` /
`GOOGLE_CLIENT_SECRET`, and `http://localhost:8000/api/auth/google/callback` is registered in
Google Cloud Console.

1. `bun install` (root, `workers/api`, `apps/web` as needed).
2. `bun run --cwd workers/api migrate:local` (apply D1 migrations to the local DB).
3. Terminal A: `bun run cf:api:dev` (API at `http://localhost:8000`).
4. Terminal B: `bun run web:dev` (frontend at `http://localhost:3000`).
5. Open `http://localhost:3000/auth/login`, click _Continue with Google_, sign in with a test
   Google account.
6. **Capture the final URL** — read the `error` param (and the API response/worker logs) to
   confirm which failure path fires locally. This both diagnoses the prod issue and validates the
   error-banner fix.
7. Also test the negative case: temporarily blank the OAuth creds in `.dev.vars` → expect
   `/auth/login?error=Google OAuth is not configured` and (after the fix) an inline banner.

### 6.2 Local E2E of the new flow (acceptance scenarios)

| #   | Scenario                                                                                                             | Expected                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| A1  | Fresh Google email, pick **Boarder**                                                                                 | Account created (`status new`); lands `/find-a-room`; session persisted; refresh keeps login                                |
| A2  | Fresh Google email, pick **Landlord**, submit with all-optional fields empty                                         | Landlord account created; lands `/landlord` with pending-verification banner; can open profile later and fill details       |
| A3  | Fresh Google email, pick **Landlord**, fill business name/phone/city                                                 | Stored on the landlord profile; lands `/landlord`                                                                           |
| A4  | Returning Google boarder                                                                                             | Skips chooser; lands per status (`new` → `/find-a-room`; `accepted` → `/boarder/confirm-booking`; etc.)                     |
| A5  | Existing email/password account; same email via Google                                                               | Chooser shows link prompt; **Link** → logged into existing account (role preserved); **Cancel** → `/auth/login`, no changes |
| A6  | Cancel on Google consent screen                                                                                      | `/auth/login` with "Google login was cancelled" banner                                                                      |
| A7  | Google OAuth creds removed locally                                                                                   | `/auth/login` with inline "Google OAuth is not configured" banner                                                           |
| A8  | Google email that is already linked to a different Google account                                                    | Inline error banner with the linked-account message                                                                         |
| A9  | Email/password login still works; password login for a Google-only account still shows the "use Google login" notice | Unchanged behavior                                                                                                          |

### 6.3 Prod verification (after the fix merges to `main`)

1. Reproduce on `https://haven-space.pages.dev` with the same test account; confirm the `?error=`
   value that previously caused the silent bounce (record it in the spec/commit).
2. Confirm the fix surfaces it (or fixes the root cause) and the full chooser flow works in prod.
3. Check worker logs/observability for the callback request during the reproduction.
4. Confirm the Google OAuth client's registered redirect URIs still match prod callback.

---

## 7. Open Questions / Decisions to Confirm During Implementation

1. **Landlord dashboard gating** — should Google-created landlord accounts be `account_status:
'active'` (can browse the shell, sees pending banner) or `pending_verification` (tighter)?
   User intent: "landlord dashboard obviously can't do anything" → they should land in the
   landlord area with a pending banner; confirm no route hard-blocks unverified landlords.
2. **Pending-token mechanism** — `#google-pending={jwt}` fragment + `POST /auth/google/complete`
   is the leading approach; alternative: reuse a query param with the existing state cookie. Pick
   during implementation based on how `handleOAuthHash` is structured.
3. **Chooser page** — new `/auth/choose-role` vs extending `/auth/choose`. Leading: new page
   (keeps the email-signup chooser untouched).
4. **Role param on the Google button** — keep sending `role=boarder` as a default hint (API
   ignores for new users) vs drop the param. Minor; pick the least churn.
5. **Exact prod `?error=` value** — still unknown; must be captured in §6.1/§6.3 before finalizing
   the root-cause narrative.
6. **`google_oauth_state` SameSite behavior across the workers.dev → Google → workers.dev chain**
   — if diagnosis shows the state-cookie path failing, consider `SameSite=None; Secure` for that
   cookie or a fallback (e.g., also validate `state.origin` without the cookie when the state JWT
   is still valid and fresh). Do not weaken the nonce check without a deliberate decision.

---

## 8. Out of Scope (for now)

- Email/password signup role chooser redesign (the `/auth/choose` page stays as-is).
- Email verification emails for Google-created accounts (trusting Google per decision).
- Messages and payments ship (payments as a manual ledger with no gateway — spec `payments-feature`); earlier "deferred platform-wide" wording is stale.
- Changes to the accepted-boarder `confirm-booking` landing logic (already status-aware).
