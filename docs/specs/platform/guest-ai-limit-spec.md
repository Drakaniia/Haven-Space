# Guest AI Limit — Spec

**Feature:** Limit Haven AI to **one free response for non-authenticated (guest) users** on `/haven-ai`. When a guest submits a second prompt, a login overlay pops up; after logging in they can continue chatting. Authenticated users get a daily cap to protect AI spend; admins are unlimited.

**Status:** Draft — gathered via interview. No code changes yet.
**Related TODO:** `docs/TODO.md` → "limit only one ai response in ai for non authenticated user."

---

## 1. Interview Decisions

| #   | Question                      | Decision                                                                                                                                                                                       |
| --- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Where is the limit enforced?  | **Both** — client shows the overlay UX, server also rejects blocked requests (backstop against direct API calls / cleared browser state).                                                      |
| 2   | How is a guest identified?    | **Cookie issued by the API** on first successful chat (not the existing localStorage `ai_session_id`).                                                                                         |
| 3   | Does the guest freebie reset? | **Never** — a browser gets exactly one free response until the user logs in (cookie-scoped; clearing cookies resets it — accepted trade-off).                                                  |
| 4   | What consumes the freebie?    | **Only a successful AI answer** (see #10 — supersedes the earlier "any submitted prompt" answer; failed/errored attempts do **not** consume it).                                               |
| 5   | Overlay design                | **Modal** (reuse `components/ui/Modal`) with short message + **Log in** (`/auth/login`) and **Sign up** (`/auth/choose`) buttons.                                                              |
| 6   | Dismissible?                  | **Yes** — "Not now" closes the modal; afterward the composer is **disabled until login** (no re-opening modal).                                                                                |
| 7   | After login                   | **Auto-return to `/haven-ai` with chat history preserved, and the blocked message auto-sends.**                                                                                                |
| 8   | Upfront notice to guests      | **No** — silent until the limit is hit.                                                                                                                                                        |
| 9   | Authenticated users           | **Daily cap of 10 responses**, reset per **calendar day in Philippine Time (Asia/Manila, UTC+8)**.                                                                                             |
| 10  | Failed prompt refund          | **Refund on failure** — the freebie/count is only marked used after a successful AI response.                                                                                                  |
| 11  | Post-dismiss composer         | **Disabled until login** (with a small inline Log in / Sign up note so the guest is not stuck).                                                                                                |
| 12  | Return flow                   | **`?redirect=` param on login/signup pages + guest chat state saved to `sessionStorage`** so history and the blocked message survive the login detour.                                         |
| 13  | Server storage                | **Signed cookie counter** (JWT-signed with `JWT_SECRET`) — stateless, **no DB migration, no KV binding**.                                                                                      |
| 14  | Daily-cap exemptions          | **Admins exempt** (unlimited). Boarders and landlords are capped equally.                                                                                                                      |
| 15  | User-cap storage              | **Signed cookie (browser-scoped)** — count is per browser, not per account across devices. Clearing cookies resets it (and logs the user out, since the `access_token` cookie is cleared too). |

**Conflict resolution:** Round 1 chose "any submitted prompt consumes the freebie"; Round 3's more specific "refund on failure" wins. The freebie is consumed **only on a successful AI response**.

---

## 2. Current State (Context)

- **Page:** `apps/web/src/routes/haven-ai.tsx` — public chat with `PublicNavbar`, in-memory `history` state, suggestion buttons, streaming via `chatStream`. No auth awareness.
- **Client API:** `apps/web/src/lib/api/ai.ts` — `chat()` (via `apiFetch`) and `chatStream()` (raw `fetch`). Sends `session_id`/`user_id` (localStorage, ignored server-side). No `Authorization` header, no `credentials: 'include'`.
- **Server endpoint:** `workers/api/src/routes/ai.ts` — `POST /api/ai/chat`, completely open. Reads `GEMINI_API_KEY`, fetches room context from D1, calls Gemini (non-streaming `geminiChatCompletion` / streaming `streamGeminiChat`). `session_id`/`user_id` from the body are **not read**.
- **Auth:** `apps/web/src/lib/auth-context.tsx` (`useAuth()` → `isAuthenticated`, `user`, `token`). Login page `apps/web/src/routes/auth/login.tsx` navigates to `redirectPathForUser(user)` (role home) after login. Google OAuth threaded through `apps/web/src/lib/oauth.ts`.
- **Server auth helpers:** `authenticateUser(db, request, secret)` in `workers/api/src/lib/auth.ts` — supports Bearer header, `access_token` cookie, and test-only `X-User-ID` header; throws `HttpError(401)` when unauthenticated. `signJwt`/`verifyJwt` available for signing cookies.
- **Cross-origin cookies:** The API already handles this pattern — `googleStateCookie()` in `routes/auth.ts` sets `SameSite=None; Secure` over https, `SameSite=Lax` over http. CORS middleware already sets `credentials: true`.

---

## 3. Requirements

### 3.1 Guest (non-authenticated) behavior

1. A guest can send **one** prompt and receive **one** successful AI response. Nothing indicates the limit beforehand.
2. The **second** prompt attempt does **not** reach the AI provider. A modal overlay pops up asking them to log in.
3. The modal is dismissible ("Not now"). After dismissal the composer (textarea + send button + suggestion buttons) is **disabled** and a small inline note with Log in / Sign up links shows above the composer.
4. Logging in or signing up returns the user to `/haven-ai` with their guest chat history restored, and the blocked message **auto-sends** as an authenticated request.
5. Failed first attempts (AI provider error, timeout, empty response) do **not** consume the freebie — the guest can retry.
6. Clearing cookies resets the freebie (accepted trade-off of the cookie approach).

### 3.2 Authenticated behavior (boarders & landlords)

1. Up to **10 successful responses per calendar day** (Philippine Time).
2. On the 11th prompt, the request is rejected with `429 AI_LIMIT_REACHED`; the client shows a non-login message ("You've reached today's limit of 10 Haven AI questions. Come back tomorrow."). No login CTA.
3. The count resets at midnight Asia/Manila regardless of the cookie's issuance time.
4. The count is per-browser (signed cookie), not a global per-account counter.

### 3.3 Admins

- **Unlimited** — no guest freebie rule, no daily cap. (Admins are authenticated, so the guest rule never applies to them anyway.)

---

## 4. Technical Design

### 4.1 Tracking cookie

- **Name:** `ai_usage`
- **Flags:** `HttpOnly; Path=/; SameSite=Lax` (http/local) or `SameSite=None; Secure` (https) — reuse the `googleStateCookie()` pattern (extract or duplicate the SameSite logic; keep the existing function untouched).
- **Value:** JWT signed with `JWT_SECRET` (via existing `signJwt`/`verifyJwt`):
  - Guest: `{ v: 1, kind: 'guest', count: 1, exp: <now + 10y> }` — set after the **first successful** guest response. Presence of a valid guest cookie ⇒ guest is used-up.
  - User: `{ v: 1, kind: 'user', user_id: <id>, date: 'YYYY-MM-DD' (Asia/Manila), count: 1..10, exp: <now + 2d> }` — re-issued with an incremented count after each successful response.
- **Max-Age:** guest 10 years, user 2 days (the `date` claim governs the daily reset, so Max-Age just needs to comfortably exceed 24h).
- **Reset logic (user cookie):** on each request, if the cookie is missing/invalid/`user_id` mismatch/`date != today(PH)` → treat count as 0.
- **PH date:** `new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date())` yields `YYYY-MM-DD` (Workers support full ICU timezones).
- Tampering: JWT signature prevents forging counts; a tampered cookie is treated as absent.

### 4.2 Server enforcement — `POST /api/ai/chat`

Order of operations in the handler (applies to both streaming and non-streaming):

1. **Resolve identity (non-throwing):** `try { authenticateUser(db, c.req.raw, c.env.JWT_SECRET) } catch { guest }`. This picks up the Bearer header, the `access_token` cookie, or the test `X-User-ID` header.
2. **Admin check:** if authenticated with role `admin` → skip all limit logic.
3. **Guest path:** read `ai_usage` cookie → if a valid guest cookie exists → reject with **`429` + `{ success: false, error: 'You've used your one free Haven AI question. Log in or sign up for unlimited chat.', code: 'AI_LIMIT_REACHED', limit: { scope: 'guest', max: 1 } }`** — before any Gemini call.
4. **Authenticated path (boarder/landlord):** read `ai_usage` cookie → normalize per §4.1 reset rules → if `count >= 10` → reject with **`429` + `{ success: false, error: 'You've reached today's limit of 10 Haven AI questions. Come back tomorrow.', code: 'AI_LIMIT_REACHED', limit: { scope: 'user', max: 10 } }`**.
5. **Proceed with existing chat logic** (room context, Gemini call).
6. **On success, write/refresh the cookie:** append `Set-Cookie` to the response.
   - Non-streaming: after `geminiChatCompletion` returns a non-empty content → `jsonResponse(...)` then `response.headers.append('Set-Cookie', aiUsageCookie(...))` (same pattern as `authResponse`).
   - Streaming: after the upstream Gemini response is `ok` (stream accepted) → `Set-Cookie` on the returned `Response` headers. **Decision:** a stream that starts successfully counts as used even if it dies mid-stream (keeps it simple; the client shows an error and the guest keeps their history). Mid-stream failure does **not** refund.
   - Failure (Gemini non-OK / empty / timeout): **no cookie** — freebie/count preserved (refund on failure).
7. **Blocked streaming requests:** return the `429` JSON response directly (not SSE) — the client's `chatStream` handles `!response.ok` and surfaces `code`.

Status code choice: `429 Too Many Requests` with `code: 'AI_LIMIT_REACHED'` distinguishes the limit from generic `AI_PROVIDER_ERROR` (which returns `200` with `success: false` today). Keep the existing `200 + success:false` convention for provider errors untouched.

### 4.3 Client — `apps/web/src/lib/api/ai.ts`

- Add `code?: string` to `AiChatResponse`.
- `chatStream`: capture `body.code` on the `!response.ok` path and return it; add `credentials: 'include'` so the API-issued `ai_usage` cookie round-trips across origins.
- Add an optional `token` param to `chatStream`/`chat`; when present, send `Authorization: Bearer <token>` (the server's `authenticateUser` reads it). This is more reliable than relying on the cross-origin `access_token` cookie.
- `chat()` (non-streaming, via `apiFetch`): `apiFetch` needs `credentials: 'include'` support — add `credentials` to the fetch options in `apps/web/src/lib/api/http.ts` (`apiFetch` currently sends no credentials; safe to default to `'include'` or thread it through).

### 4.4 Client — `apps/web/src/routes/haven-ai.tsx`

- Pull `const { isAuthenticated, token } = useAuth()`.
- New state:
  - `guestPromptsUsed: number` (0 initially; incremented only on a **successful** assistant response while guest — mirrors server refund-on-failure). In-memory only; the server cookie is the source of truth after a page reload (see fallback below).
  - `showLoginModal: boolean`
  - `guestBlocked: boolean` (composer disabled after "Not now")
  - `pendingMessage: string | null` (the blocked prompt, auto-sent after login)
  - `dailyLimitHit: boolean` (authenticated 429 state → inline message)
- `sendMessage(message)`:
  1. `if (loading) return;`
  2. **Client gate:** `if (!isAuthenticated && guestPromptsUsed >= 1)` → store `pendingMessage`, persist session state (below), `setShowLoginModal(true)`, return without calling the API.
  3. Send via `chatStream(text, history, onDelta, token)`.
  4. On success (`result.success && result.response`): if guest → `setGuestPromptsUsed(c => c + 1)`.
  5. On `result.code === 'AI_LIMIT_REACHED'` (server backstop — e.g., after a page reload where client state was lost): if guest → open login modal (store pending message first); if authenticated → `setDailyLimitHit(true)`.
- **Login modal** (reuse `components/ui/Modal`):
  - Title: "Log in to keep chatting"
  - Body: "You've used your one free Haven AI question. Log in or sign up for unlimited chat."
  - Actions: **Log in** → `/auth/login?redirect=/haven-ai`; **Sign up** → `/auth/choose?redirect=/haven-ai`; **Not now** → close modal, `setGuestBlocked(true)`, disable composer.
- **Disabled composer:** when `guestBlocked`, disable textarea + send + suggestion buttons, and render a small inline note above the composer: "Log in or sign up to keep chatting" with links (reuses the same `?redirect=` URLs). The modal does not re-open.
- **Session persistence (auto-return + auto-send):**
  - When the modal opens with a `pendingMessage`, write `sessionStorage['haven_ai_pending'] = JSON.stringify({ history, pendingMessage })`.
  - On mount: if `haven_ai_pending` exists → restore `history`; if `isAuthenticated` and `pendingMessage` exists → `sendMessage(pendingMessage)`; always remove the key afterwards.
  - Note: sessionStorage survives the login detour in the same tab. Opening a new tab after login loses the state (accepted; the server still honors the authenticated session).
- **Authenticated daily limit:** when `dailyLimitHit`, show the message "You've reached today's limit of 10 Haven AI questions. Come back tomorrow." (inline error banner, reuse existing error styling). No login CTA. Composer stays usable (it will just be rejected again) — or optionally disabled; decide during implementation, default: show banner, keep composer enabled.
- **Suggestion buttons** call `sendMessage` — automatically covered by the gate.

### 4.5 Client — `?redirect=` return flow

- **Validation:** the `redirect` search param must be a string starting with a single `/` (reject `//`, protocol-relative, and absolute URLs to avoid open redirects).
- **`apps/web/src/routes/auth/login.tsx`:** read optional `redirect` search param; after successful login navigate to `redirect ?? redirectPathForUser(user)`. Also apply when `handleOAuthHash()` completes on the login page.
- **Signup flow:** `apps/web/src/routes/auth/choose-role.tsx`, `signup/index.tsx`, `signup/landlord.tsx` — carry `?redirect=` through; after `register`/`completeGoogle`, navigate to `redirect` when present.
- **Google OAuth** (`apps/web/src/lib/oauth.ts` + `workers/api/src/routes/auth.ts`):
  - `googleAuthorizeUrl(action, role, redirect?)` appends `redirect` to the authorize URL.
  - The API adds a `redirect` claim to the OAuth `state` JWT (`createGoogleState`) and to the pending JWT (`createGooglePendingToken`); `handleGoogleCallback` uses `state.redirect` (validated with the same rules) for the final redirect of existing users; `pendingSessionRedirect` and the role chooser carry it through `google/complete`, and `choose-role` navigates to it after completion.
  - Fallback: when no `redirect` is present, behavior is unchanged (role-home redirect).

### 4.6 Response shape summary

| Case                       | HTTP | Body                                                                                     |
| -------------------------- | ---- | ---------------------------------------------------------------------------------------- |
| Success (unchanged)        | 200  | `{ success: true, response, property_count? }` / SSE stream                              |
| Provider error (unchanged) | 200  | `{ success: false, error, code: 'AI_PROVIDER_ERROR' }`                                   |
| Guest 2nd prompt           | 429  | `{ success: false, error, code: 'AI_LIMIT_REACHED', limit: { scope: 'guest', max: 1 } }` |
| User daily cap exceeded    | 429  | `{ success: false, error, code: 'AI_LIMIT_REACHED', limit: { scope: 'user', max: 10 } }` |

---

## 5. Files to Change

| File                                                                                  | Change                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workers/api/src/routes/ai.ts`                                                        | Identity resolution (non-throwing), guest/user/admin limit checks, `ai_usage` cookie read/write (+ SameSite logic), PH-date computation, 429 responses, `Set-Cookie` on success (stream + non-stream) |
| `workers/api/test/ai.test.ts`                                                         | **New** — limit tests (see §7)                                                                                                                                                                        |
| `apps/web/src/lib/api/ai.ts`                                                          | `code` on `AiChatResponse`; `chatStream`/`chat` `token` param; `credentials: 'include'`                                                                                                               |
| `apps/web/src/lib/api/http.ts`                                                        | `credentials: 'include'` in `apiFetch` (or thread through)                                                                                                                                            |
| `apps/web/src/routes/haven-ai.tsx`                                                    | Auth awareness, client gate, login modal, disabled composer, session persistence, auto-send, daily-limit banner                                                                                       |
| `apps/web/src/routes/auth/login.tsx`                                                  | `?redirect=` param + navigation                                                                                                                                                                       |
| `apps/web/src/routes/auth/choose-role.tsx`, `signup/index.tsx`, `signup/landlord.tsx` | Carry `?redirect=` through signup                                                                                                                                                                     |
| `apps/web/src/lib/oauth.ts`                                                           | `googleAuthorizeUrl(..., redirect?)`, redirect-aware post-OAuth navigation                                                                                                                            |
| `workers/api/src/routes/auth.ts`                                                      | `redirect` claim in OAuth state + pending JWT; callback/complete honor it                                                                                                                             |
| `docs/TODO.md`                                                                        | Mark the item done                                                                                                                                                                                    |

**No DB migration, no new env vars, no new KV binding.**

---

## 6. Edge Cases & Decisions

- **Guest after refresh:** client state resets, so the gate is bypassed once — the server's `429 AI_LIMIT_REACHED` catches it and pops the modal (fallback path). Acceptable.
- **Guest who logged in once, then logs out:** the guest cookie (if still present) marks the browser used-up; correct — the freebie is per-browser, lifetime.
- **User clears cookies while logged in:** resets the daily count (and logs them out). Accepted per decision #15.
- **Shared IP / multiple tabs:** no IP-based counting; tabs share the cookie, so counts are consistent per browser.
- **Suggestion click as 2nd prompt:** blocked like any send.
- **Mid-stream failure after the provider accepted:** counts as used (decision in §4.2.6) — documented trade-off.
- **`X-User-ID` test header:** `authenticateUser` honors it; tests can use it to simulate authenticated requests without a real login (keep in mind that production traffic can't set it from a browser — CORS allow-headers already includes it).
- **Timezone:** daily reset at Asia/Manila midnight; implement with `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' })`.
- **Open redirect:** `redirect` validated (single leading `/`, no `//`).

---

## 7. Testing Plan

### API (`workers/api/test/ai.test.ts`, bun:test, following `auth.test.ts` conventions)

- Mock `globalThis.fetch` for Gemini generate URLs: canned completion JSON for non-stream; `ReadableStream` SSE body for stream. Restore in `afterEach`.
- Guest gets a successful response **and** a `Set-Cookie: ai_usage` (guest) header.
- Guest 2nd request (with cookie) → `429`, `code: 'AI_LIMIT_REACHED'`, `limit.scope === 'guest'`; assert Gemini was **not** called.
- Refund on failure: Gemini returns 500 → response `success: false`, **no** `Set-Cookie`; retry succeeds and then sets the cookie.
- Streaming: 2nd streaming request → `429` JSON (not SSE).
- Authenticated boarder: 10 successes increment the cookie; 11th → `429`, `limit.scope === 'user'`; a cookie with `date` ≠ today (PH) resets the count.
- Admin: 11+ requests all succeed (no cap).
- Tampered cookie signature → treated as absent (guest 2nd request allowed? No — treated as absent means no guest cookie, so the request proceeds; assert no 429).
- Run: `bun run cf:api:test`, `bun run cf:api:typecheck`.

### Frontend

- `bun run web:typecheck` and `bun run web:test` (if component tests exist).
- Manual browser QA (webapp-testing skill / Chrome):
  1. Guest asks 1 question → answer streams.
  2. Guest asks 2nd question → modal pops, **no** request fired.
  3. "Not now" → composer disabled + inline note.
  4. Log in via email/password with `?redirect=/haven-ai` → lands back on `/haven-ai`, history restored, blocked question auto-sends and gets an answer.
  5. Log out → composer disabled again (guest freebie consumed).
  6. Authenticated boarder: 10 questions OK, 11th shows the daily-limit banner.
  7. Admin: no limits.

---

## 8. Out of Scope (Deferred / Explicitly Not Included)

- No DB migration or KV usage (stateless signed-cookie design).
- No per-minute/per-second rate limiting beyond the response caps.
- No global (cross-device) per-user counters — the daily cap is browser-scoped by decision.
- No upfront "1 free question" teaser UI.
- No changes to what the AI itself answers; only gating.
