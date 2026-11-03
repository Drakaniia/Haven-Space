# Settings — Sign-in Method & Notification Preferences — Spec

Status: Draft, ready to implement · Date: 2026-10-21
Branch: `feat/apple-ui-restructure-qa-hardening`
Surfaces: `/boarder/settings`, `/landlord/settings`, `GET /api/users/profile`, `/auth/me`, `POST /auth/change-password`, new notification-preference endpoints, notification writers
Source: two design screenshots supplied with the request (password sign-in state and Google sign-in state)

---

## 1. Request

Add the account-security / sign-in-method section from the mocks to Settings:

- An **email + password** account sees a Security card with a password row and an inline Change password form
  (Current password, New password) — screenshot 1.
- A **Google** account sees the same card in a read-only state: a "SIGN-IN METHOD" row with the Google logo,
  the account email, a green **Connected** pill, and an informational note that Google manages the password,
  with a **Manage Google Account** link — screenshot 2.
- The mocks also restyle the page (ACCOUNT / PREFERENCES / SECURITY eyebrows) and include a Notifications card
  with three toggles (Application updates, Messages, Announcements). Those are in scope, and the toggles must
  actually persist and suppress notifications.

"Different by method, no linking": the card reflects how the account signs in. There is no account-linking or
method-switching UI. A Google-linked account always renders the Google view.

---

## 2. Current State (verified in the repo)

| Concern                    | File                                                                                                                           | Today                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Boarder settings page      | `apps/web/src/routes/boarder/settings.tsx`                                                                                     | PageHeader + Profile card (first/last/phone, Save) + Profile picture card + Change password card (inline current/new password form). `if (profile.isLoading) return <Spinner />` **before** `RoleShell`, so the sidebar disappears while loading.                                                                                                                            |
| Landlord settings page     | `apps/web/src/routes/landlord/settings.tsx`                                                                                    | Same three cards plus city/province, and the shell stays mounted while loading (comment references R24). Duplicated logic, no shared components.                                                                                                                                                                                                                             |
| Profile read               | `workers/api/src/routes/account.ts` → `handleProfile`, `handleUpdateProfile`                                                   | Returns `findUserProfileById` rows. **No** sign-in information: `google_id` / `password_hash` are not selected.                                                                                                                                                                                                                                                              |
| Profile row                | `workers/api/src/repositories/account.ts` → `findUserProfileById`                                                              | `SELECT` lists `u.email`, `u.phone_number`, … but not `u.google_id` or `u.password_hash`.                                                                                                                                                                                                                                                                                    |
| Auth payloads              | `workers/api/src/routes/auth/google.ts` → `formatUserResponse`                                                                 | Builds the `user` object for login / register / me / Google complete. No sign-in flags. Used by `handleLogin`, `handleMe`, `handleRegister`, `handleGoogleComplete`.                                                                                                                                                                                                         |
| Password change            | `workers/api/src/routes/account.ts` → `handleChangePassword`                                                                   | Rejects Google-only accounts with `400 "Google accounts cannot change password here"` only when `!password_hash && google_id`. On success calls `updatePasswordHash`. No timestamp recorded.                                                                                                                                                                                 |
| Google account creation    | `workers/api/src/repositories/users.ts` → `createGoogleUserAccount`                                                            | Inserts `password_hash = ''` (empty string, not NULL) plus `google_id`. So `Boolean(password_hash)` is the correct "has a password" test.                                                                                                                                                                                                                                    |
| Password reset             | `workers/api/src/routes/account.ts`                                                                                            | `/auth/forgot-password` already detects Google-only users (`is_google_user`, `action: 'password_setup'`) and `/auth/reset-password` writes a hash. This is the only existing way a Google user can get a password.                                                                                                                                                           |
| Notification writes        | `workers/api/src/repositories/{messages,announcements,landlord-verification,property-access/history}.ts`, `payments/notify.ts` | Only five writers: `message` (`messages.ts:700`), `announcement` (`announcements.ts:506`, per-recipient loop), landlord verification, property invitation/removal, and payments. **No writer exists for `new_application` / `application_accepted` / `application_rejected` / `booking_confirmed`** — application status lives in the activity/calendar feeds, not the bell. |
| Notification prefs storage | —                                                                                                                              | None. `notifications` is event rows only; `platform_settings` holds admin flags.                                                                                                                                                                                                                                                                                             |
| Toggle primitive           | `apps/web/src/components/ui/`                                                                                                  | No Switch/Toggle. Checkbox usages are plain `<input type="checkbox">` (e.g. `payments/BillingRulesCard.tsx`).                                                                                                                                                                                                                                                                |
| Icons                      | `apps/web/src/components/ui/Icon.tsx`                                                                                          | `google` → `google-icon-logo.svg`, `announcement` → `announcement.svg`, `check`, `clock`, `user`, `photo`, `settings` all exist. `notification.svg` and `shield.svg` existed as assets but had no `Icon` mapping — both mappings are added during implementation.                                                                                                            |
| Design tokens              | `apps/web/src/styles/app.css`                                                                                                  | `--color-cream` page background, `--color-surface` cards, `--color-primary: #4a7c23`, `--color-mint`, muted/subtle greys. `Card` = `rounded-2xl border border-border bg-surface shadow-card`.                                                                                                                                                                                |
| Cached session             | `apps/web/src/lib/types.ts` → `AuthUser`; `auth-context.tsx`; `auth-store.ts`                                                  | `AuthUser` has no sign-in flags; the object is cached in localStorage and drives first paint after hydration.                                                                                                                                                                                                                                                                |

Tests affected: `workers/api/test/account.test.ts`, `messages.test.ts`, `announcements.test.ts` extend;
`auth.test.ts` uses `toMatchObject` for the `user` payload, so the new booleans do not break it.
`docs/qa/reports/report.md` row W3-U19 says `/boarder/settings` shows "Change password" — that stays true for
password accounts and becomes false for Google accounts, so the QA expectation should be annotated.

---

## 3. Decisions (from the interview)

1. **Pages:** boarder settings and landlord settings. The Google-specific UI applies only to accounts that have a
   Google link; password-only accounts keep today's change-password experience.
2. **Scope:** the full mock — section eyebrows, page restyle, and working notification toggles (new storage + API).
3. **Google accounts:** display-only. No "set password" action in Settings. The note points to Google.
4. **View rule:** Google wins if linked. `google_id` present → Google view, even if a password hash also exists.
   No linking/unlinking UI anywhere.
5. **Notification toggles:** three, with role-aware subtitles. Persisted and enforced (not UI-only).
6. **Interaction:** keep the inline password form (current + new), restyled inside the security card — no modal.
7. **Enforcement map:** the three toggles map to application/booking types, `message`, and `announcement`.
   Payments, property-access and landlord-verification notifications are always delivered and ignore toggles.
8. **Suppression mechanism:** skip inserting the notification row. Existing rows stay visible in the bell
   (muting is not retroactive).
9. **Defaults:** Application updates ON, Messages ON, Announcements OFF. Defaults are implicit until the first
   save (no backfill migration, no side-effecting GET).
10. **Password "last updated":** real timestamp column, shown as a formatted date, or "Never changed" when null.
11. **Sign-in data source:** boolean flags on the profile and auth payloads (`has_password`,
    `google_connected`), added to `AuthUser` — not a dedicated endpoint, not an enum.
12. **Manage Google Account:** links to `https://myaccount.google.com/security`, new tab,
    `rel="noopener noreferrer"`.
13. **Toggle saving:** auto-save on flip, optimistic UI, success/error toast.
14. **Page chrome:** ship section eyebrows, the "Edit profile →" link, and keep the Profile picture card.
    Do **not** ship the decorative footer labels ("EMAIL + PASSWORD SIGN-IN" / "GOOGLE SIGN-IN · SECURITY INFORMATION").
15. **Change-password API guard:** unchanged. Google-linked accounts can still change a password via the API and
    the forgot-password flow; Settings simply does not expose the form.
16. **Muting Messages:** suppresses the bell row only; the message is still stored and appears in the inbox/thread.
17. **Password validation:** unchanged — two fields, minimum 8 characters. No confirm field, no new strength rules.
18. **Sessions:** nothing happens to other sessions on password change. No token revocation.
19. **Application updates toggle:** persist-only for now. The enforcement hook and mapping exist, but nothing
    writes those notification types today. Documented as a known gap (see §12).
20. **Tests:** API tests only (`workers/api/test/*`). Frontend is verified manually plus `bun run web:typecheck`.

---

## 4. Goals / Non-goals

### Goals

- Render the correct Security card per account: password form for password accounts, Google connected row for
  Google-linked accounts (including mixed accounts).
- Persist notification preferences and enforce them when notifications are created.
- Match the mocks' page structure and copy on both settings pages, using existing primitives and tokens.
- Share one implementation between boarder and landlord settings instead of duplicating the cards a third time.

### Non-goals

- Linking a Google identity to a password account, unlinking, or choosing a primary sign-in method.
- Setting/creating a password for a Google-only account from Settings.
- Email/push notification delivery; preferences govern in-app bell rows only.
- Adding a `payment` / `property` / `verification` toggle.
- Retroactive hiding of notification rows already received.
- Session revocation after a password change.
- A new admin settings route (admins have no settings page today).
- Reworking the Profile form into a read-only summary: fields stay editable with the existing Save button.

---

## 5. UX Specification

### 5.1 Page structure (both roles)

Content column: `max-w-3xl` (up from `max-w-2xl` so the mock's three-across profile row fits).

```
H1  Settings
    Manage your profile, notification preferences, and account security.

ACCOUNT                      ← eyebrow
[ Profile card ]             ← editable form + Save profile; footer "Edit profile →"
[ Profile picture card ]     ← kept (not in the mock, but retained by decision)

PREFERENCES
[ Notifications card ]       ← three toggles

SECURITY
[ Account security card ]    ← Google view or password view
```

- Keep `<RoleShell>` mounted in **both** pages while the profile loads (fix the boarder early-return). The loading
  state renders `<Spinner />` inside the content column, below the page header.
- Section eyebrows: small uppercase, letter-spaced, muted, e.g.
  `text-xs font-semibold uppercase tracking-[0.14em] text-muted`. Semantics: eyebrow is `h2`, card titles become
  `h3` (today card titles are `h2`).
- Card subtitles use `text-sm text-gray-ink`, one line, under the card title.
- Dividers inside cards: `border-t border-border` with `pt-4`/`mt-4` spacing.
- The mock's green accent applies to the Connected pill and save actions; reuse existing tokens
  (`bg-success-tint text-success-ink` via `StatusBadge status="active"`), not new hex values.

### 5.2 ACCOUNT — Profile card

- Title `Profile` with the `user` icon; subtitle "Your personal information used on Haven Space."
- Fields: boarder → First name, Last name, Phone number in a `sm:grid-cols-3` row. Landlord → same row, then
  City, Province in a second row. Inputs and validation stay exactly as today (`updateProfile`, Save profile).
- Footer link, bottom-right: **Edit profile →** (`arrowRight` icon). It is a `button type="button"` that scrolls
  the first field into view and focuses it (`firstNameRef.current.focus()`, `scrollIntoView({ block: 'center' })`).
  No navigation, no new route.
- Keep the existing success toast "Profile updated." and the existing ErrorState behaviour.
- The mock renders the profile as read-only values; that is **not** adopted — the form remains editable.

### 5.3 ACCOUNT — Profile picture card

Unchanged behaviour (choose image, 2MB/type limits, UploadThing, "Avatar updated." toast), restyled only by the
new eyebrow/heading level.

### 5.4 PREFERENCES — Notifications card

- Title `Notifications` with the `notification` icon; subtitle "Choose what you want Haven Space to let you
  know about."
- Three rows, each: bold label, muted subtitle, right-aligned toggle. Rows separated by `border-t border-border`.
- Toggles are `role="switch"` with `aria-checked`, a visible label association (`aria-labelledby`), 44×44 minimum
  hit area, primary green when on, `bg-border`/subtle when off, `transition-colors` only (reduced-motion safe).
  Disabled while a save is in flight.
- Defaults: Application updates ON, Messages ON, Announcements OFF.

| Key                   | Boarder label / subtitle                                    | Landlord label / subtitle                                   |
| --------------------- | ----------------------------------------------------------- | ----------------------------------------------------------- |
| `application_updates` | Application updates — "Status changes to your applications" | Application updates — "New applications and status changes" |
| `messages`            | Messages — "New messages from landlords"                    | Messages — "New messages from tenants"                      |
| `announcements`       | Announcements — "Updates about properties and the platform" | Announcements — "Updates about properties and the platform" |

Behavior: flip → optimistic local update → `PUT /api/users/notification-preferences` with all three booleans →
on success toast "Preferences updated."; on failure revert to the previous values and show
"Couldn't save your notification preferences. Please try again." Load state: card renders a `Skeleton` (or
spinner row) while the GET is in flight; a GET failure shows an inline `ErrorState` with a retry.

### 5.5 SECURITY — Account security card (password account)

- Title `Account security` with the `shield` icon; subtitle "Update the password you use to sign in to Haven Space."
- Row: bold "Password", muted line under it:
  - `password_updated_at` present → "Last updated {formatted date}" (e.g. `Oct 3, 2026`, using `en-PH`
    `month: short` like `formatPaymentDate`).
  - null → "Never changed".
- Inline form below the row (same card): Current password, New password (`autoComplete` unchanged, `minLength=8`),
  and the "Change password" button. While pending: "Changing…". Success toast "Password changed." and the
  last-updated line refreshes.
- Validation and API behaviour unchanged (8 chars, 401 for wrong current password, error text from the API).
- The mock shows a Change password button that opens something; that affordance is **not** adopted — the fields
  stay visible (decision 6).

### 5.6 SECURITY — Account security card (Google account)

- Title `Account security` with the `shield` icon; subtitle "Your Haven Space account is connected to Google."
- Sub-label above the row: `SIGN-IN METHOD` (uppercase, muted, tracked).
- Row inside a bordered sub-panel (`rounded-xl border border-border`, `p-4`, flex):
  - Left: Google logo (`Icon name="google"`), bold "Google", muted account email (`user.email`).
  - Right: `StatusBadge status="active" label="Connected"`.
- Note bar below: subtle background (`bg-subtle` or `bg-mint/40`), small info glyph, text
  "Google handles your password and sign-in security. Manage them in your Google Account." plus a right-aligned
  link **Manage Google Account ↗** → `https://myaccount.google.com/security`, `target="_blank"`,
  `rel="noopener noreferrer"`.
- No password form, no last-updated line, no "Set password" action.
- Mobile: the row stacks (logo/name/email then the pill); the note bar stacks the text above the link.

### 5.7 View selection

Derived from the account flags, Google first:

```
google_connected === true            → Google view
google_connected !== true && has_password → password view
neither known yet                    → skeleton inside the SECURITY section (never flash the wrong card)
```

- Mixed accounts (`google_connected && has_password`) render the **Google view**.
- The flags come from the profile query (authoritative). `useAuth().user` flags may be used for the first paint
  after hydration; if they are absent (old localStorage session) wait for the profile query.

---

## 6. Data Model

New migration `workers/api/migrations/0023_settings_preferences.sql` (next number after
`0022_payments_tracker.sql`):

```sql
ALTER TABLE users ADD COLUMN password_updated_at TEXT;

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id INTEGER PRIMARY KEY,
  application_updates INTEGER NOT NULL DEFAULT 1,
  messages INTEGER NOT NULL DEFAULT 1,
  announcements INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

- `users.password_updated_at` is nullable; NULL means "never changed since this column exists". Existing
  password users therefore start at "Never changed" (accepted; no backfill from `created_at`).
- `notification_preferences` has one row per user, created on the first `PUT`. Absent row ⇒ implicit defaults
  (`1, 1, 0`). The SQL defaults and the code constant must stay identical.
- No seed/backfill inserts; existing and new users are both handled by the implicit-default rule.

`updatePasswordHash` (`workers/api/src/repositories/account.ts`) also sets
`password_updated_at = CURRENT_TIMESTAMP`. It is shared by change-password and reset-password, so a Google user who
sets a password through the reset flow gets a timestamp too.

---

## 7. API Changes

### 7.1 Sign-in flags

Add to `GET /api/users/profile` (and the PUT/PATCH responses, which return the same `user`):

```
has_password: boolean        // password_hash is non-empty
google_connected: boolean    // google_id is non-null
```

- Extend `findUserProfileById`'s `SELECT` with
  `CASE WHEN u.password_hash <> '' THEN 1 ELSE 0 END AS has_password` and
  `CASE WHEN u.google_id IS NOT NULL THEN 1 ELSE 0 END AS google_connected`.
  Never select the hash itself.
- Extend `UserProfileRow` with numeric `has_password` / `google_connected`, and convert to booleans in the route
  (add a small `formatProfile(row)` helper) so the JSON never leaks `0`/`1`.
- Extend `formatUserResponse` (`routes/auth/google.ts`) with `has_password: Boolean(user.password_hash)` and
  `google_connected: Boolean(user.google_id)`. This covers `/auth/me`, `/auth/login`, `/auth/register` and
  `/auth/google/complete`.
- Do **not** touch the JWT payload (`userPayload`) — the flags are display-only and the client must not treat a
  token claim as authorization.

### 7.2 Notification preferences

New routes in `workers/api/src/routes/account.ts`, authenticated via the existing `requireUser`:

| Method | Path                                  | Body                                                                          | Response                                                            |
| ------ | ------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| GET    | `/api/users/notification-preferences` | —                                                                             | `{ preferences: { application_updates, messages, announcements } }` |
| PUT    | `/api/users/notification-preferences` | `{ application_updates: boolean, messages: boolean, announcements: boolean }` | `{ preferences: {...} }` (saved values)                             |

- PUT requires all three keys and rejects non-booleans with `400 "Invalid notification preferences"`.
- Upsert with `INSERT … ON CONFLICT(user_id) DO UPDATE SET …, updated_at = CURRENT_TIMESTAMP`.
- Unauthenticated → 401 via `requireUser`. Admins may call it; there is no UI for them.
- Keep the response shape snake_case, matching the DB and the rest of the account API.

New repository `workers/api/src/repositories/notification-preferences.ts`:

```ts
export type NotificationPreferenceKey = 'application_updates' | 'messages' | 'announcements';
export interface NotificationPreferences {
  application_updates: boolean;
  messages: boolean;
  announcements: boolean;
}
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  application_updates: true,
  messages: true,
  announcements: false,
};

// type → toggle, or null when the type is always delivered
export function notificationCategory(type: string): NotificationPreferenceKey | null;

export function findNotificationPreferences(db, userId): Promise<NotificationPreferences>;
export function saveNotificationPreferences(db, userId, prefs): Promise<NotificationPreferences>;
export function isNotificationMuted(db, userId, type): Promise<boolean>;
```

### 7.3 Enforcement

`notificationCategory` mapping (single source of truth, unit-testable):

| Toggle                    | Types                                                                                                                                                                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `application_updates`     | `new_application`, `application_accepted`, `application_rejected`, `booking_confirmed`                                                                                                                                                                                                                        |
| `messages`                | `message`                                                                                                                                                                                                                                                                                                     |
| `announcements`           | `announcement`                                                                                                                                                                                                                                                                                                |
| always delivered (`null`) | `payment_due_soon`, `payment_overdue`, `payment_late_fee`, `payment_verified`, `payment_rejected`, `payment_recorded`, `payment_submitted`, `property_invitation`, `property_access_removed`, `landlord_verification_approved`, `landlord_verification_rejected`, `landlord_verification_documents_requested` |

Call sites:

1. `repositories/messages.ts` → `insertMessageNotification`: after the suspended/banned check, return early when
   `isNotificationMuted(db, recipientId, 'message')`. The message row itself is already written by the caller and
   must not be affected.
2. `repositories/announcements.ts` → `createAnnouncementNotifications`: this loops per boarder. Do **not** add a
   per-user query inside the loop; resolve the muted recipients for the batch once via `mutedRecipientIds()`
   and skip those ids, then keep the existing insert loop. Because announcements default **off**, a recipient
   with no saved row counts as muted — the batch helper derives the flag from the toggle's default, not from
   "a row exists and says 0".
3. No other writer changes. Payments, property access and landlord verification are always delivered.
4. Application types have no writer today. The mapping exists so the toggle becomes live the moment a writer is
   added; this is documented in §12 as a known no-op.

Unmuting never recreates past rows, and muted types are not filtered out of `GET /api/notifications` — history is
preserved by design (decision 8).

---

## 8. Frontend Changes

### 8.1 New shared components — `apps/web/src/components/settings/`

| File                                   | Responsibility                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `SettingsSection.tsx`                  | Eyebrow `h2` + children container (`flex flex-col gap-4`, `scroll-mt-24` friendly).                    |
| `ProfileCard.tsx` (optional)           | Extract boarder/landlord profile form if the duplication becomes noisy; may stay inline in the routes. |
| `NotificationPreferencesCard.tsx`      | Query + optimistic mutation + three toggle rows + loading/error states.                                |
| `AccountSecurityCard.tsx`              | Chooses Google vs password view from the profile flags, renders both states.                           |
| `GoogleSignInPanel.tsx` (internal)     | The connected row + note bar + external link.                                                          |
| `PasswordSecurityPanel.tsx` (internal) | Password row/last-updated + inline form + mutation.                                                    |

New primitive `apps/web/src/components/ui/Toggle.tsx`: controlled `{ checked, onChange, disabled, id }`,
`role="switch"`, `aria-checked`, keyboard operable (Space/Enter), 44px target, focus ring consistent with
`Field` inputs, no animation beyond `transition-colors`. Add a plain-English doc comment explaining the switch
semantics (states as announced), following the style of other `ui/` primitives.

### 8.2 API client & types

- `apps/web/src/lib/api/account.ts`: add `getNotificationPreferences(token)` and
  `updateNotificationPreferences(token, preferences)`, returning a typed `NotificationPreferencesResponse`.
- `apps/web/src/lib/types.ts`:
  - `AuthUser`: add optional `has_password?: boolean; google_connected?: boolean;` (optional so a stale cached
    session still typechecks; the settings page waits for the profile query).
  - Add `NotificationPreferences` and `NotificationPreferencesResponse`.
- React Query keys: `['notification-preferences']` for the card; invalidate after a successful PUT (optimistic
  set already updates the cache).
- No new routes, so `routeTree.gen.ts` does not change.

### 8.3 Routes

- `apps/web/src/routes/boarder/settings.tsx`
  - Remove the bespoke Change password card and the page-level early return; keep `<RoleShell>` mounted.
  - Render `SettingsSection` groups: ACCOUNT (Profile + Profile picture), PREFERENCES (Notifications),
    SECURITY (Account security).
  - Add `firstNameRef` for the "Edit profile →" affordance.
- `apps/web/src/routes/landlord/settings.tsx`
  - Same structure; keep city/province fields.
- Both pages share the new cards; no copy divergence except the table in §5.4 and the profile fields.

### 8.4 Design/quality constraints

- Use existing `Card`, `Button`, `Field`, `PasswordInput`, `StatusBadge`, `ErrorState`, `Skeleton`, `ToastStack`;
  no new colors, shadows, or radii.
- Heading order per page: `h1` (PageHeader) → `h2` (eyebrows) → `h3` (card titles).
- Touch targets ≥44px; the toggle row is clickable on its label; no hover-only affordances.
- The Google link is the only external navigation on the page and must open a new tab with `noopener noreferrer`.
- Keep the app's 100ms `ease-out`/`active:scale-[0.97]` button conventions only where already used.

---

## 9. Edge Cases

| Case                                                        | Expected                                                                                                                                                                      |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google-only account (`password_hash = ''`, `google_id` set) | `has_password: false`, `google_connected: true` → Google view; no form.                                                                                                       |
| Password-only account (`google_id` NULL)                    | `google_connected: false`, `has_password: true` → password view; unchanged behaviour.                                                                                         |
| Mixed account (Google linked + password)                    | Both true → Google view (decision 4). `POST /auth/change-password` still succeeds if called directly; accepted inconsistency, noted in §12.                                   |
| Google user set a password via forgot-password earlier      | Still the Google view while `google_id` exists; the password keeps working for login.                                                                                         |
| Old localStorage session without flags                      | AuthUser flags optional; the card waits for the profile query and never flashes the wrong view.                                                                               |
| Profile query fails                                         | SECURITY section shows `ErrorState` with retry; the rest of the page still renders.                                                                                           |
| Preferences GET fails                                       | Notifications card shows an inline error + Retry; toggles are not shown in a misleading default state.                                                                        |
| Preference PUT fails                                        | Optimistic flip reverts, error toast, switches re-enabled.                                                                                                                    |
| All toggles off                                             | Bell still receives payments, invitations, verification notices (always-on list).                                                                                             |
| Muted Messages                                              | Inbox/thread unaffected; only the bell row is skipped.                                                                                                                        |
| Muted Announcements                                         | No new rows; historical announcement rows remain visible. New accounts start muted (Announcements defaults off), so announcements only reach the bell after the user opts in. |
| Google account email changes on Google's side               | Row shows `users.email` (Haven's stored address) until a login refreshes the profile.                                                                                         |
| Suspended/banned account                                    | Settings routes are gated by `Protected`; no change.                                                                                                                          |
| Admin                                                       | No settings route; endpoints work if called but no UI is added.                                                                                                               |
| Password change with wrong current password                 | Unchanged: API 401, message shown in `ErrorState`.                                                                                                                            |
| Password reset (forgot flow)                                | Stamps `password_updated_at`; the settings page reflects it on next load.                                                                                                     |
| Rapid toggle flips                                          | Switches disabled while the PUT is in flight; last saved state is what persists.                                                                                              |

---

## 10. Testing & Verification

### 10.1 API tests (required)

`workers/api/test/account.test.ts`

1. `GET /api/users/profile` for a password user → `has_password: true`, `google_connected: false`.
2. Google-only user (`password_hash: ''`, `google_id` set) → `has_password: false`, `google_connected: true`.
3. Mixed user → both `true`.
4. `GET /api/users/notification-preferences` with no row → `{ application_updates: true, messages: true, announcements: false }`.
5. `PUT` persists; a second `GET` returns saved values; a second `PUT` updates the same row (assert one row in SQLite).
6. `PUT` with a missing key or a non-boolean → 400 and no row written.
7. Both endpoints unauthenticated → 401.
8. `POST /auth/change-password` sets `password_updated_at`; it is null before the first change.
9. `POST /auth/reset-password` also sets `password_updated_at`.
10. Google-only change-password still returns the existing 400 (regression guard).

`workers/api/test/messages.test.ts`

11. Recipient with `messages = 0` → message stored and returned, **no** `message` notification row.
12. Recipient with defaults → notification row still created (existing test must keep passing).

`workers/api/test/announcements.test.ts`

13. Mute one boarder's announcements → that boarder gets no row; other boarders still get one; muted boarder's
    existing rows remain in `GET /api/notifications`.

`workers/api/test/notifications.test.ts`

14. All preferences off → `payment_*`, `property_invitation`, `landlord_verification_*` rows are still inserted.

`workers/api/test/auth.test.ts`

15. Update the strict `user` payload assertions (login around line 388, register around 453) to include
    `has_password` / `google_connected`; add one assertion that a Google-complete session reports
    `password` false / `google` true.

Optional (cheap, high value): a unit test for `notificationCategory` covering every type listed in §7.3 and
returning `null` for unknown types.

### 10.2 Frontend verification (manual, per decision 20)

- `bun run web:typecheck` must pass.
- `bun run web:build` (route tree unchanged, but catches bundling/prerender issues).
- Manual, with the API and web dev servers running (`bun run cf:api:dev`, `bun run web:dev`):
  1. `bun run --cwd workers/api migrate:local` applies `0023` cleanly.
  2. Password account: Settings renders the password form; changing the password succeeds and the last-updated
     line updates; wrong current password shows the API error.
  3. Google account: simulate locally with
     `UPDATE users SET google_id = 'test-google-id', password_hash = '' WHERE email = '<seed>'`
     → Settings renders the Google row with the account email, Connected pill, working external link, and no form.
     Restore the row afterwards.
  4. Mixed account (`google_id` set with a real hash) → Google view.
  5. Toggle each preference, reload, confirm persistence; set Announcements on/off; confirm defaults on a fresh
     account (Announcements off).
  6. Turn Messages off, send a message from the other role: message appears in the inbox, bell gets no new row.
  7. Turn Announcements off, post an announcement: no new bell row for the muted boarder; unmuted boarder receives
     one.
  8. Turn everything off and trigger a payment notification: the bell row still appears.
  9. Both roles: eyebrows, `Edit profile →` focus/scroll, avatar upload, profile save, and mobile width behaviour.

### 10.3 Commands

```bash
bun run cf:api:test
bun run cf:api:typecheck
bun run web:typecheck
bun run web:build
```

---

## 11. Acceptance Criteria

1. `/boarder/settings` and `/landlord/settings` show ACCOUNT / PREFERENCES / SECURITY eyebrows and the cards in
   the order described in §5.1, with `RoleShell` visible during loading.
2. A password account sees "Account security" with a Password row, last-updated/never-changed text, and the inline
   Current/New password form; change still enforces 8 characters and the existing API errors.
3. A Google-linked account sees the Google row (logo, "Google", account email, green "Connected"), the
   "Google handles your password…" note, and a "Manage Google Account" link to
   `https://myaccount.google.com/security` that opens in a new tab; **no** password form is rendered.
4. Mixed accounts render the Google view.
5. `GET /api/users/profile`, `/auth/me`, login, register and Google-complete payloads include boolean
   `has_password` and `google_connected`; no hash or Google ID is exposed.
6. `GET`/`PUT /api/users/notification-preferences` implement the shapes in §7.2, default to
   `(true, true, false)` without writing a row, and reject invalid bodies with 400.
7. Flipping a toggle saves optimistically, persists across reload, and shows a success toast; a failed save reverts
   and shows an error toast.
8. Muting `messages` or `announcements` skips the corresponding notification insert while leaving the underlying
   message/announcement and existing notification history intact; payment, property-access and verification
   notifications are never suppressed.
9. The password card shows a real "Last updated" date derived from `users.password_updated_at` (or "Never
   changed"), and both change-password and reset-password set that timestamp.
10. The Profile card keeps its editable form, gains the "Edit profile →" focus/scroll affordance, and the Profile
    picture card remains available on both pages.
11. Existing behaviours are preserved: profile save, avatar upload, `POST /auth/change-password` for password
    accounts, Google-only rejection, and forgot-password.
12. `bun run cf:api:test`, `bun run cf:api:typecheck`, `bun run web:typecheck` and `bun run web:build` pass; the
    manual checklist in §10.2 has been executed.

---

## 12. Known Gaps / Follow-ups

1. **Application updates is a no-op today.** No writer inserts `new_application`, `application_accepted`,
   `application_rejected` or `booking_confirmed` into `notifications`. The toggle stores and the mapper supports
   the types, but nothing is suppressed until those writers exist. Decide separately whether application status
   changes should light the bell (would need its own spec + tests) or whether the toggle should be hidden until then.
2. **Mixed accounts inconsistency.** The UI hides password change for Google-linked accounts while
   `POST /auth/change-password` still accepts it. Resolve when (if) a "set/change password" escape hatch is added.
3. **No email/notification delivery channel.** Preferences only govern in-app bell rows; there is no email digest
   to mute.
4. **No session invalidation** after a password change; other devices remain signed in.
5. **No committed frontend coverage** for the two card states, per the interview decision. The states were
   verified once during implementation with a throwaway `react-dom/server` render (Google state: Connected pill,
   account email, external link, no form; password state: form, date/"Never changed"; mixed: Google wins), then
   the script was deleted. A permanent test would be cheap insurance if the decision changes.
6. **Admin settings** still does not exist, so admins cannot manage preferences in the UI.
7. **`docs/qa/reports/report.md` W3-U19** should be annotated: "Change password" is conditional on a password account.

---

## 13. Implementation Order (suggested)

1. Migration `0023_settings_preferences.sql` + `notification-preferences` repository + enforcement helper.
2. Sign-in booleans on the profile and auth payloads (+ fix affected API tests).
3. Preferences GET/PUT routes + API tests.
4. Enforcement in `insertMessageNotification` and `createAnnouncementNotifications` + API tests.
5. `Toggle` primitive, `SettingsSection`, `NotificationPreferencesCard`, `AccountSecurityCard`; API client + types.
6. Wire both settings routes (eyebrows, ordering, `Edit profile →`, remove the old password card, keep the shell
   mounted on the boarder page).
7. Typecheck/build/test, then the manual checklist, then update the QA report note.

---

## 14. Implementation Notes (shipped)

Files added

| File                                                               | Purpose                                                                                      |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `workers/api/migrations/0023_settings_preferences.sql`             | `users.password_updated_at` + `notification_preferences`.                                    |
| `workers/api/src/repositories/notification-preferences.ts`         | Defaults, `notificationCategory`, `find`/`save`, `isNotificationMuted`, `mutedRecipientIds`. |
| `apps/web/src/components/ui/Toggle.tsx`                            | Full-row switch (`role="switch"`, `aria-checked`).                                           |
| `apps/web/src/components/settings/SettingsSection.tsx`             | Eyebrow `h2` + `SettingsToast` / `PushSettingsToast` types.                                  |
| `apps/web/src/components/settings/NotificationPreferencesCard.tsx` | Query + optimistic PUT + toggles + loading/error states.                                     |
| `apps/web/src/components/settings/AccountSecurityCard.tsx`         | Google and password states, password mutation, date formatting.                              |

Files changed

- `workers/api/src/routes/account.ts` — `profilePayload` (0/1 → booleans), preferences GET/PUT handlers and routes.
- `workers/api/src/repositories/account.ts` — profile SELECT adds the two flags + `password_updated_at`;
  `updatePasswordHash` stamps the timestamp.
- `workers/api/src/routes/auth/google.ts` — `formatUserResponse` adds both booleans.
- `workers/api/src/repositories/messages.ts` — `insertMessageNotification` returns early when muted.
- `workers/api/src/repositories/announcements.ts` — batch `mutedRecipientIds` filter before the insert loop.
- `apps/web/src/lib/types.ts` — optional `AuthUser` flags + `NotificationPreferences` types.
- `apps/web/src/lib/api/account.ts` — preference client functions.
- `apps/web/src/components/ui/Icon.tsx` — `notification` and `shield` mappings.
- `apps/web/src/components/ui/Field.tsx` — `TextInput` accepts a ref (`ComponentPropsWithRef<'input'>`).
- `apps/web/src/routes/{boarder,landlord}/settings.tsx` — sections, shared cards, `Edit profile →`, boarder shell
  stays mounted while loading, old bespoke password card removed.
- Tests: `workers/api/test/account.test.ts` (flags, defaults/upsert, validation, 401, always-on types,
  timestamps), `messages.test.ts` (muted recipient), `announcements.test.ts` (muted boarder).

Verification run: `bun run cf:api:typecheck`, `bun run web:typecheck`, `bun run cf:api:test` (350 pass),
`bun run web:test` (324 pass), `bun run web:build`, plus two temporary server-render checks (both deleted
afterwards): the four security states (Google, password, never-changed, mixed → Google wins) and the
notifications card (three switches, two on/one off, role-specific copy). The built client chunks contain the
Settings strings. Manual authenticated browser checks from §10.2 still need a human run with the dev servers
and a migrated local D1 — no browser automation is available in this environment.
