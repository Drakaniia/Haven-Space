# Toast Notification System — Spec

**Status:** Draft (from requirements interview)
**Created:** 2026-08-16
**Scope:** Frontend only (`apps/web`). No API changes.

---

## 1. Overview

Haven Space currently gives **zero success feedback** when a user logs in or logs out:

- **Login** (`apps/web/src/routes/auth/login.tsx` → `useAuth().login()` → `navigate` to role home) drops the user straight onto the dashboard.
- **Logout** (`apps/web/src/components/layout/UserMenu.tsx` → `useAuth().logout()` → `navigate` to `/auth/login`) dumps the user back on the login page with no confirmation.
- There is **no toast/notification-feedback UI** in the codebase today (the `NotificationBell` is in-app message notifications, not UI feedback).

This spec defines a **reusable, prop-driven toast system** that:

1. Shows a **non-blocking toast** on successful login and logout.
2. Lives at a **global app level** so it survives the redirects both flows perform.
3. Is a **reusable component** future features can use for any success/error/info/warning feedback (e.g. booking confirmed, application submitted, payment failed).

The frontend-design skill (design philosophy) is applied to the visual treatment.

---

## 2. Goals

- A polished, brand-consistent toast component (`Toast`) and a stack container (`ToastStack`).
- Login success toast appears **after** the user lands on their destination page (e.g. `/boarder`, `/landlord`, `/admin`, or a `?redirect=` target).
- Logout toast appears on `/auth/login` after the redirect.
- The mechanism for surviving navigation is a **sessionStorage bridge** (no global state, no context).
- Future features can render the same primitives directly with props (no provider/hook required).

## 3. Non-Goals (out of scope for this task)

- **Not** upgrading the existing `apps/web/src/components/ui/Modal.tsx` (focus trap, Escape handling, `role="dialog"`, `aria-*`). The existing `ConfirmDialog.tsx` already demonstrates the accessible pattern; a Modal upgrade is a **separate future task**.
- **Not** replacing the in-app notification system (`NotificationBell` / `/api/notifications`). These are unrelated — toasts are transient UI feedback, notifications are persisted app messages.
- **Not** server-side toast delivery, websockets, or cross-tab synchronization (see §9 Edge cases).
- **Not** error toasts for failed login — login failures already render inline via `ErrorState` on the auth pages. (Toasts can carry an error tone for future use, but the auth forms keep inline errors.)

---

## 4. Interview Decisions (requirements)

Captured from the requirements interview — these are binding:

| #   | Question          | Decision                                                                                                                   |
| --- | ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | Popup type        | **Toast notification** — small, non-blocking, auto-dismisses                                                               |
| 2   | Placement         | **Global app-level overlay** — rendered at the app root, survives redirects                                                |
| 3   | Login timing      | Toast appears **after landing** on the destination page (not before redirect)                                              |
| 4   | Dismissal         | **Auto-dismiss (~4s) + X button** — no user action required                                                                |
| 5   | Visual style      | **Brand match**: white card, green/mint accents, `shadow-pop`, uses existing design tokens                                 |
| 6   | Message copy      | **Personalized + friendly** — "Welcome back, John!" style on login                                                         |
| 7   | Consumption API   | **Prop-driven component** — `<ToastStack toasts={...} />` rendered with local state; no context provider/hook for features |
| 8   | Existing modals   | **Add Toast alongside** — `Modal.tsx` / `ConfirmDialog.tsx` untouched                                                      |
| 9   | Tones             | **All four**: `success`, `error`, `info`, `warning`                                                                        |
| 10  | Redirect survival | **sessionStorage bridge** — flows stash a "pending toast" before navigating; destination reads it on mount and clears it   |
| 11  | Stacking          | **Stack vertically** — multiple toasts appear stacked; each auto-dismisses independently                                   |
| 12  | Tone styling      | **Colored left accent bar** per tone + matching icon                                                                       |

---

## 5. Component Design

### 5.1 Files

| File                                   | Contents                                                                                                             |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/components/ui/Toast.tsx` | Presentational primitives: `Toast` (single item) + `ToastStack` (vertical container) + `ToastHost` (bridge consumer) |
| `apps/web/src/lib/toast.ts`            | Types (`ToastTone`, `ToastItem`) + sessionStorage bridge helpers (`setPendingToast`, `usePendingToast`)              |
| `apps/web/src/routes/__root.tsx`       | Mount `<ToastHost />` once, globally                                                                                 |

### 5.2 Types (`lib/toast.ts`)

```ts
export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  /** Stable id — required for stacking + dismissal. */
  id: string;
  tone: ToastTone;
  message: ReactNode; // or string
  /** Overrides the default auto-dismiss duration (ms). */
  duration?: number;
  /** Optional action button (future use, e.g. "View dashboard"). */
  action?: { label: string; onClick: () => void };
}
```

### 5.3 `Toast` (single item)

Presentational, controlled component:

```ts
interface ToastProps {
  tone: ToastTone;
  message: ReactNode;
  onDismiss: () => void;
  duration?: number; // default 4000
  action?: ToastItem['action'];
}
```

Behavior:

- Renders a white rounded card (`rounded-xl border border-gray-200 bg-white shadow-pop`).
- **Colored left accent bar** (~4px, full height) colored by tone (see §7).
- Tone icon (check / x / info / warning) next to message.
- X close button (top-right or right side), `aria-label="Dismiss notification"`.
- Auto-dismiss via `setTimeout(duration)`; timer cleaned up on unmount/dismiss.
- Entrance animation: slide + fade (see §7.3); respects `prefers-reduced-motion`.

### 5.4 `ToastStack` (container)

```ts
interface ToastStackProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'; // default 'top-right'
}
```

Behavior:

- `fixed` container with `z-[60]` (above modals, which use `z-50`), `pointer-events-none` on the container, `pointer-events-auto` on each toast.
- **Stacks vertically** (flex-col, gap-2); newest at the top (or bottom — pick one, default top).
- Each toast auto-dismisses independently via its own timer (managed by the consumer or by `ToastHost`).
- Screen-reader friendly: the stack is wrapped in `role="status"` / `aria-live="polite"` (or `assertive` for error tone).

### 5.5 `ToastHost` (global, bridge consumer)

Rendered **once** in `__root.tsx` (global app-level placement):

- On mount and on **route change**, reads a pending toast from `sessionStorage` (see §6), converts it into a `ToastItem`, renders it via `ToastStack`, and clears the storage key.
- Manages local `ToastItem[]` state, auto-dismiss timers, and dismiss handlers.
- This is the only place the auth-flow toasts surface; it renders on **every** page, so it works regardless of where the redirect lands.

> Note: `ToastHost` is prop-free by design (it only consumes the sessionStorage bridge). Features that want immediate feedback without a redirect render `<ToastStack toasts={...} onDismiss={...} />` directly with their own local state — that is the "prop-driven" path.

---

## 6. sessionStorage Bridge

Purpose: carry a toast across a client-side navigation (login page → dashboard, dashboard → login page) where component state would otherwise be lost.

### 6.1 Storage key

`haven_toast_pending` — JSON:

```ts
interface PendingToast {
  tone: ToastTone;
  message: string;
  duration?: number;
}
```

### 6.2 Helpers (`lib/toast.ts`)

```ts
/** Called by login/logout flows BEFORE navigating. */
export function setPendingToast(tone: ToastTone, message: string, duration?: number): void;

/** Called by ToastHost on mount/route-change. Reads once, clears, returns the toast or null. */
export function usePendingToast(): PendingToast | null;
```

- `setPendingToast` wraps `sessionStorage.setItem` in try/catch (storage can be unavailable).
- `usePendingToast` reads + `removeItem`s in the same tick so a stale toast can't re-fire on a later navigation.
- Uses **sessionStorage**, not localStorage: the toast should appear only in the tab that performed the action (multi-tab login in another tab should not toast this tab — see §9).

### 6.3 Flow: Login

1. `login.tsx` `handleSubmit` → `await login(...)` succeeds.
2. `setPendingToast('success', \`Welcome back, ${user.first_name}!\`)` (message copy §8).
3. `navigate({ to: redirect ?? redirectPathForUser(user) })` — unchanged.
4. `ToastHost` (mounted in root) sees the route change, reads the pending toast, shows it for ~4s.

### 6.4 Flow: Logout

1. `UserMenu.tsx` Log out button → `await logout()` succeeds.
2. `setPendingToast('info' | 'success', "You've been logged out. See you soon!")` (tone decision in §10, Open Questions — default: `success` per user's "success logout" framing).
3. `navigate({ to: '/auth/login' })` — unchanged.
4. `ToastHost` shows it over the login page.

### 6.5 Flow: Google OAuth login (included)

The Google OAuth success path completes in `__root.tsx` (`handleOAuthHash()` returns a user) and in `choose-role.tsx` (`completeGoogle`). Both should also call `setPendingToast(...)` before navigating so OAuth logins get the same welcome toast. (Flagged in §10 as a confirm.)

---

## 7. Visual Design

### 7.1 Design tokens (reuse existing — `apps/web/src/styles/app.css`)

| Token              | Value                         | Used for                  |
| ------------------ | ----------------------------- | ------------------------- |
| `--color-success`  | `#388e3c`                     | success accent bar + icon |
| `--color-error`    | `#d32f2f`                     | error accent bar + icon   |
| `--color-warning`  | `#ff9800`                     | warning accent bar + icon |
| `--color-info`     | `#1976d2`                     | info accent bar + icon    |
| `--color-ink`      | `#1a1a1a`                     | message text              |
| `--color-gray-ink` | `#555555`                     | secondary text            |
| `--shadow-pop`     | `0 10px 15px rgba(0,0,0,0.1)` | card shadow               |
| `--font-sans`      | Plus Jakarta Sans             | inherited                 |

### 7.2 Composition (per toast)

```
┌─┬───────────────────────────────────────┬───┐
│█│ [icon] Welcome back, John!            │ ✕ │   ← accent bar (4px, tone color)
└─┴───────────────────────────────────────┴───┘
  white card: rounded-xl border border-gray-200 bg-white shadow-pop
```

- Card: `flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-pop`
- Accent bar: absolutely positioned 4px-wide, full-height, tone color (rounded left corners).
- Icon: tone-appropriate (`check` for success, `x`/`close` for error, `info` for info, `warning` for warning) using the existing `Icon` component (`components/ui/Icon.tsx`).
- Message: `text-sm text-ink` (allow ReactNode for rich messages).
- X button: `aria-label="Dismiss notification"`, subtle gray, hover darkens.

### 7.3 Motion

Add to `apps/web/src/styles/app.css` (alongside existing `modal-pop` / `menu-pop` patterns):

```css
/* Toast entrance: slide in from the right + fade */
@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateX(16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
.toast-in {
  animation: toast-in 200ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .toast-in {
    animation: none;
  }
}
```

- One high-quality entrance (slide + fade) rather than scattered micro-animations — per the design skill's "one well-orchestrated moment" guidance.
- Exit can be a simple fade (or none) to keep it snappy.

### 7.4 Position & z-index

- Default `top-right` (below the navbar visually — the navbar is fixed; confirm overlap, may need `top-20` instead of `top-4` to clear it).
- `z-[60]` so toasts always render above modals (`z-50`) and dropdown menus (`z-40`).

---

## 8. Message Copy

| Flow                       | Tone                                    | Message                                                 |
| -------------------------- | --------------------------------------- | ------------------------------------------------------- |
| Email login success        | success                                 | `Welcome back, {first_name}!` (personalized + friendly) |
| Google OAuth login success | success                                 | `Welcome back, {first_name}!`                           |
| Logout                     | success (default) / info (alt, see §10) | `You've been logged out. See you soon!`                 |

- `first_name` from `AuthUser` (`apps/web/src/lib/types.ts`).
- Keep copy short — the toast is transient (~4s), so one sentence max.
- Logout copy deliberately does not name the user (already known, and logout happens from their own session).

---

## 9. Edge Cases & Constraints

| Case                                                         | Behavior                                                                                                                                              |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rapid duplicate toasts                                       | `ToastHost` stacks them vertically (§5.4); dedupe identical pending toasts in `setPendingToast` (replace, don't append)                               |
| `sessionStorage` unavailable (private mode, disabled)        | try/catch everywhere; login/logout still work, toast silently skipped                                                                                 |
| Stale pending toast (user navigates away before reading)     | `usePendingToast` reads + clears in one tick; a toast left in storage fires on the **next** navigation — acceptable, but mitigate by clearing on read |
| Logout while already on `/auth/login` (e.g. session expired) | `usePendingToast` on mount still shows the toast (route may not change) — `ToastHost` should check on mount, not only on route change                 |
| Multi-tab                                                    | sessionStorage is per-tab: only the acting tab toasts. Intentional.                                                                                   |
| `?redirect=` login targets (e.g. `/haven-ai`)                | Toast fires wherever navigation lands — works because `ToastHost` is global                                                                           |
| Screen readers                                               | Stack container `aria-live="polite"` (`assertive` for error); toasts must **not** steal focus (non-modal by definition); X button is focusable        |
| Reduced motion                                               | `prefers-reduced-motion` disables the slide animation                                                                                                 |
| Toast during another modal                                   | Toast z-index (60) > modal (50); toast still appears above                                                                                            |

---

## 10. Open Questions / Confirmations

1. **Logout tone**: user framed both as "success" — default to `success` tone for logout, but an `info` tone reads more neutral for leaving. Confirm at implementation.
2. **Google OAuth toast**: include the welcome toast on OAuth success paths (`__root.tsx` hash handler + `choose-role.tsx`)? Default: yes (consistency).
3. **Toast vertical position**: `top-right` default — confirm it clears the fixed navbar (`top-20` vs `top-4`).
4. **Toast placement inside layout**: confirm `ToastHost` mounts in `__root.tsx` (public pages too, e.g. `/haven-ai`, since login redirects there are possible).
5. **Newest toast position in stack**: top of stack (newest first) vs bottom — default newest-first.

---

## 11. Future Extensibility (why this shape)

- **Any feature** can render `<ToastStack toasts={...} onDismiss={...} />` with local state — no provider wiring. Examples already in the app: booking confirmed, application submitted/withdrawn, room created/updated, tenancy leave requested, profile saved, payment events.
- Optional `action` prop enables action toasts ("View dashboard", "Undo") without API changes.
- If the app later wants cross-cutting toasts without local state, a `ToastProvider` + `useToast()` can be added on top of the same `Toast`/`ToastStack` primitives — the presentational layer doesn't change.
- Tone system (`success | error | info | warning`) maps 1:1 to the app's existing semantic color tokens.

---

## 12. Verification Plan

- `bun run web:typecheck` — no type errors.
- `bun run web:test` — add unit tests for `lib/toast.ts` bridge (`setPendingToast`/`usePendingToast` round-trip, dedupe, storage-unavailable fallback) following the pattern of `apps/web/test/oauth.test.ts`.
- Manual QA (local dev, `bun run web:dev`):
  1. Email login → welcome toast on dashboard.
  2. Logout → toast on `/auth/login`.
  3. Login with `?redirect=/haven-ai` → toast on `/haven-ai`.
  4. Google OAuth login → welcome toast.
  5. Trigger two toasts close together → stacked, both dismiss independently.
  6. `prefers-reduced-motion` on → no slide animation.
  7. Toast appears above an open modal.
- No API changes → no API tests required.
