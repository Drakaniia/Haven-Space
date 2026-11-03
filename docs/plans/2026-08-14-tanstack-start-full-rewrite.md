# TanStack Start Full Frontend Rewrite — Phased Master Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the entire 57-view vanilla HTML/CSS/JS frontend as a single TanStack Start (React) application with **no remaining `.html`, `.js`, or hand-written `.css` view files**, keeping the existing Hono Worker + D1 backend untouched.

**Architecture:** One `apps/web/` TanStack Start app (React + TanStack Router + TanStack Query), deployed as a Cloudflare Worker via `@cloudflare/vite-plugin`. Every page is a `.tsx` route; server-rendered public pages load data through `createServerFn` handlers that fetch the Hono API server-side, while authenticated pages fetch client-side through a typed data layer using the existing JWT-in-`localStorage` flow. Styling is Tailwind utility classes in JSX plus a small set of shared UI primitives; the only CSS file in the app is the single Tailwind build entry holding design tokens.

**Tech Stack:** TanStack Start (`@tanstack/react-start`), TanStack Router, TanStack Query, React 19, Vite, Tailwind CSS v4 (`@tailwindcss/vite`), `@cloudflare/vite-plugin`, Wrangler, TypeScript, Bun (package manager + test runner), `@testing-library/react` + `happy-dom` for component tests.

**Spec:** This plan implements the user request "full rewrite of the 57-view frontend in TanStack, phased, no more .js/.css/.html files." It argues from the live backend contract in `workers/api/src/routes/*.ts` (and their D1 repositories), the reference plan `docs/plans/2026-05-28-cloudflare-api-migration.md`, and conventions in `AGENTS.md`.

## Starting State (already built)

`apps/web/` exists from the foundation slice and contains: `package.json`, `vite.config.ts`, `tsconfig.json`, `wrangler.jsonc`, `.dev.vars`, `.gitignore`, `worker-configuration.d.ts`, `src/router.tsx`, `src/routeTree.gen.ts`, `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/lib/{config,types,api}.ts`, and `test/{api,config}.test.ts`. This plan **extends** that scaffold rather than recreating it.

## Global Constraints

- The Hono Worker, D1 schema, and `workers/api/` are **not modified**. All new code lives under `apps/web/`.
- After Phase 6, `client/` (all `.html`, `.css`, `.js`, `.ts`), `scripts/build.ts`, and the Pages deploy scripts are **deleted**. The only `.css` file that may remain anywhere is `apps/web/src/styles/app.css` (the Tailwind entry).
- Bun is the only package manager and test runner (`bun install`, `bun test`). No npm/yarn/pnpm lockfiles; no Vitest.
- `camelCase` for TS identifiers; API wire fields stay `snake_case` exactly as the Worker returns them.
- API base URLs: local `http://localhost:8000`, production `https://haven-space-api.floresaybaez574.workers.dev` (already resolved by `src/lib/config.ts`).
- Conventional commits; commit at the end of each task.
- Tailwind theme tokens (verbatim from the current `client/css` palette): primary `#4a7c23`, dark `#2d4a14`, light `#7cb342`, cream `#fef9f0`, mint `#e8f5e9`, ink `#1a1a1a`, gray-ink `#555555`.

---

## Master View → Route Map (all 57)

| #   | Legacy view                                                       | New route                        | Phase |
| --- | ----------------------------------------------------------------- | -------------------------------- | ----- |
| 1   | `client/views/public/index.html`                                  | `/`                              | 1     |
| 2   | `client/views/public/find-a-room.html`                            | `/find-a-room`                   | 1     |
| 3   | `client/views/public/rooms/detail.html`                           | `/rooms/$id`                     | 1     |
| 4   | `client/views/public/maps.html`                                   | `/maps`                          | 1     |
| 5   | `client/views/public/public-maps.html`                            | `/public-maps`                   | 1     |
| 6   | `client/views/public/for-landlords.html`                          | `/for-landlords`                 | 1     |
| 7   | `client/views/public/haven-ai.html`                               | `/haven-ai`                      | 1     |
| 8   | `client/views/public/our-story.html`                              | `/our-story`                     | 1     |
| 9   | `client/views/public/teams.html`                                  | `/teams`                         | 1     |
| 10  | `client/views/public/privacy-policy.html`                         | `/legal/privacy-policy`          | 1     |
| 11  | `client/views/public/terms-of-service.html`                       | `/legal/terms-of-service`        | 1     |
| 12  | `client/views/public/user-agreement.html`                         | `/legal/user-agreement`          | 1     |
| 13  | `client/views/public/auth/choose.html`                            | `/auth/choose`                   | 2     |
| 14  | `client/views/public/auth/login.html`                             | `/auth/login`                    | 2     |
| 15  | `client/views/public/auth/signup.html`                            | `/auth/signup`                   | 2     |
| 16  | `client/views/public/auth/signup-landlord.html`                   | `/auth/signup/landlord`          | 2     |
| 17  | `client/views/public/auth/forgot-password.html`                   | `/auth/forgot-password`          | 2     |
| 18  | `client/views/public/auth/reset-password.html`                    | `/auth/reset-password`           | 2     |
| 19  | `client/views/public/auth/verify-email.html`                      | `/auth/verify-email`             | 2     |
| 20  | `client/views/boarder/index.html`                                 | `/boarder`                       | 3     |
| 21  | `client/views/boarder/find-a-room/index.html`                     | `/boarder/find-a-room`           | 3     |
| 22  | `client/views/boarder/find-a-room/detail.html`                    | `/boarder/find-a-room/$id`       | 3     |
| 23  | `client/views/boarder/find-a-room/confirm-application.html`       | `/boarder/find-a-room/$id/apply` | 3     |
| 24  | `client/views/boarder/rooms/detail.html`                          | `/boarder/rooms/$id`             | 3     |
| 25  | `client/views/boarder/applications-dashboard/index.html`          | `/boarder/applications`          | 3     |
| 26  | `client/views/boarder/applications-dashboard/settings/index.html` | `/boarder/applications/settings` | 3     |
| 27  | `client/views/boarder/applications/index.html`                    | `/boarder/applications/$id`      | 3     |
| 28  | `client/views/boarder/application-submitted/index.html`           | `/boarder/application-submitted` | 3     |
| 29  | `client/views/boarder/confirm-booking/index.html`                 | `/boarder/confirm-booking`       | 3     |
| 30  | `client/views/boarder/tenancy/index.html`                         | `/boarder/tenancy`               | 3     |
| 31  | `client/views/boarder/house-rules/index.html`                     | `/boarder/house-rules`           | 3     |
| 32  | `client/views/boarder/announcements/index.html`                   | `/boarder/announcements`         | 3     |
| 33  | `client/views/boarder/messages/index.html`                        | `/boarder/messages`              | 3     |
| 34  | `client/views/boarder/payments/index.html`                        | `/boarder/payments`              | 3     |
| 35  | `client/views/boarder/payments/pay.html`                          | `/boarder/payments/pay`          | 3     |
| 36  | `client/views/boarder/maps/index.html`                            | `/boarder/maps`                  | 3     |
| 37  | `client/views/boarder/settings/index.html`                        | `/boarder/settings`              | 3     |
| 38  | `client/views/landlord/index.html`                                | `/landlord`                      | 4     |
| 39  | `client/views/landlord/onboarding.html`                           | `/landlord/onboarding`           | 4     |
| 40  | `client/views/landlord/verification/index.html`                   | `/landlord/verification`         | 4     |
| 41  | `client/views/landlord/listings/index.html`                       | `/landlord/listings`             | 4     |
| 42  | `client/views/landlord/listings/create.html`                      | `/landlord/listings/create`      | 4     |
| 43  | `client/views/landlord/listings/edit.html`                        | `/landlord/listings/$id/edit`    | 4     |
| 44  | `client/views/landlord/listings/room-edit.html`                   | `/landlord/rooms/$id/edit`       | 4     |
| 45  | `client/views/landlord/myproperties/index.html`                   | `/landlord/properties`           | 4     |
| 46  | `client/views/landlord/applications/index.html`                   | `/landlord/applications`         | 4     |
| 47  | `client/views/landlord/boarders/index.html`                       | `/landlord/boarders`             | 4     |
| 48  | `client/views/landlord/announcements/index.html`                  | `/landlord/announcements`        | 4     |
| 49  | `client/views/landlord/activity/index.html`                       | `/landlord/activity`             | 4     |
| 50  | `client/views/landlord/calendar/index.html`                       | `/landlord/calendar`             | 4     |
| 51  | `client/views/landlord/payments/index.html`                       | `/landlord/payments`             | 4     |
| 52  | `client/views/landlord/payments/record.html`                      | `/landlord/payments/record`      | 4     |
| 53  | `client/views/landlord/messages/index.html`                       | `/landlord/messages`             | 4     |
| 54  | `client/views/landlord/maps/index.html`                           | `/landlord/maps`                 | 4     |
| 55  | `client/views/landlord/pricing.html`                              | `/landlord/pricing`              | 4     |
| 56  | `client/views/landlord/settings/index.html`                       | `/landlord/settings`             | 4     |
| 57  | `client/views/admin/index.html`                                   | `/admin`                         | 5     |

---

## Target File Tree (after Phase 6)

```
apps/web/
  package.json
  vite.config.ts
  tsconfig.json
  wrangler.jsonc
  .dev.vars
  worker-configuration.d.ts
  src/
    router.tsx
    routeTree.gen.ts            (generated)
    styles/
      app.css                   (ONLY css file: Tailwind entry + @theme tokens)
    lib/
      config.ts                 (existing)
      types.ts                  (extended per phase)
      auth-store.ts             (localStorage token/user helpers)
      auth-context.tsx          (AuthProvider + useAuth)
      api/
        http.ts                 (apiFetch + ApiRequestError)
        public.ts               (rooms/properties/maps)
        auth.ts                 (login/register/me/reset/oauth)
        account.ts              (profile/avatar)
        boarder.ts
        landlord.ts
        admin.ts
        notifications.ts
        deferred.ts             (payments/messages 501 stubs)
    components/
      ui/
        Button.tsx Field.tsx Card.tsx PageHeader.tsx Spinner.tsx
        EmptyState.tsx ErrorState.tsx DataTable.tsx Modal.tsx
      layout/
        RoleShell.tsx Sidebar.tsx Topbar.tsx
      auth/
        Protected.tsx          (role-guard wrapper)
      rooms/
        RoomCard.tsx PropertySearchFilters.tsx
      maps/
        MapView.tsx            (leaflet-free, maps links/embed shell)
    routes/
      __root.tsx
      index.tsx
      find-a-room/index.tsx
      rooms/$id.tsx
      maps.tsx public-maps.tsx
      for-landlords.tsx haven-ai.tsx our-story.tsx teams.tsx
      legal/privacy-policy.tsx legal/terms-of-service.tsx legal/user-agreement.tsx
      auth/choose.tsx auth/login.tsx auth/signup.tsx auth/signup/landlord.tsx
      auth/forgot-password.tsx auth/reset-password.tsx auth/verify-email.tsx
      boarder/...            (18 routes per map)
      landlord/...           (19 routes per map)
      admin/index.tsx
  test/
    setup.ts                 (happy-dom setup)
    lib/...                  (unit tests per module)
    components/...           (render tests)
```

---

# Phase 0 — Foundation (design system, UI primitives, data layer, auth session)

Phase 0 produces everything later phases compose. It is the only phase with heavy reusable code.

### Task 0.1: Add Tailwind CSS v4

**Files:**

- Create: `apps/web/src/styles/app.css`
- Modify: `apps/web/vite.config.ts`
- Modify: `apps/web/src/routes/__root.tsx`

**Interfaces:**

- Produces: design tokens usable as Tailwind classes (`bg-primary`, `text-ink`, `bg-cream`, etc.) and the `appCss` URL import consumed by `__root.tsx`.

- [ ] **Step 1: Install the Tailwind Vite plugin**

```bash
bun add -d tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Add the plugin to vite.config.ts**

Replace `apps/web/vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig({
  server: { port: 3000 },
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart(),
    react(),
    tailwindcss(),
  ],
});
```

- [ ] **Step 3: Write the single CSS entry with design tokens**

Create `apps/web/src/styles/app.css`:

```css
@import 'tailwindcss';

@theme {
  --color-primary: #4a7c23;
  --color-primary-dark: #2d4a14;
  --color-primary-light: #7cb342;
  --color-cream: #fef9f0;
  --color-mint: #e8f5e9;
  --color-ink: #1a1a1a;
  --color-gray-ink: #555555;
}
```

- [ ] **Step 4: Link the stylesheet in \_\_root.tsx**

Replace `apps/web/src/routes/__root.tsx` with:

```tsx
import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import appCss from '../styles/app.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Haven Space' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="bg-cream text-ink">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Verify and commit**

```bash
bun run --cwd apps/web build
git add apps/web/src/styles/app.css apps/web/vite.config.ts apps/web/src/routes/__root.tsx apps/web/package.json apps/web/bun.lock
git commit -m "feat(web): add Tailwind v4 design tokens and root stylesheet"
```

### Task 0.2: UI primitives

**Files:**

- Create: `apps/web/src/components/ui/Button.tsx`
- Create: `apps/web/src/components/ui/Field.tsx`
- Create: `apps/web/src/components/ui/Card.tsx`
- Create: `apps/web/src/components/ui/PageHeader.tsx`
- Create: `apps/web/src/components/ui/Spinner.tsx`
- Create: `apps/web/src/components/ui/EmptyState.tsx`
- Create: `apps/web/src/components/ui/ErrorState.tsx`
- Create: `apps/web/src/components/ui/DataTable.tsx`
- Create: `apps/web/src/components/ui/Modal.tsx`

**Interfaces:**

- Produces: `Button`, `Field`, `Card`, `PageHeader`, `Spinner`, `EmptyState`, `ErrorState`, `DataTable<T>`, `Modal` — the only UI vocabulary later phases use. Signatures below are the contract.

- [ ] **Step 1: Write the primitives**

Create `apps/web/src/components/ui/Button.tsx`:

```tsx
import type { ButtonHTMLAttributes } from 'react';

export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    />
  );
}
```

Create `apps/web/src/components/ui/Field.tsx`:

```tsx
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-sm text-red-600">{error}</span> : null}
    </label>
  );
}

const inputClasses =
  'w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none';

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputClasses} {...props} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={inputClasses} {...props} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={inputClasses} {...props} />;
}
```

Create `apps/web/src/components/ui/Card.tsx`:

```tsx
import type { ReactNode } from 'react';

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>{children}</div>
  );
}
```

Create `apps/web/src/components/ui/PageHeader.tsx`:

```tsx
import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle ? <p className="mt-1 text-gray-ink">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </header>
  );
}
```

Create `apps/web/src/components/ui/Spinner.tsx`:

```tsx
export function Spinner() {
  return (
    <span
      aria-label="Loading"
      className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"
    />
  );
}
```

Create `apps/web/src/components/ui/EmptyState.tsx`:

```tsx
export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
      <p className="font-semibold">{title}</p>
      {description ? <p className="mt-1 text-gray-ink">{description}</p> : null}
    </div>
  );
}
```

Create `apps/web/src/components/ui/ErrorState.tsx`:

```tsx
export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{message}</div>
  );
}
```

Create `apps/web/src/components/ui/DataTable.tsx`:

```tsx
import type { ReactNode } from 'react';

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
}

export function DataTable<T>({
  rows,
  columns,
  keyFor,
}: {
  rows: T[];
  columns: Column<T>[];
  keyFor: (row: T) => string | number;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-mint/50">
            {columns.map(column => (
              <th key={column.header} className="px-4 py-2 font-semibold">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={keyFor(row)} className="border-b border-gray-100 last:border-0">
              {columns.map(column => (
                <td key={column.header} className="px-4 py-2">
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

Create `apps/web/src/components/ui/Modal.tsx`:

```tsx
import type { ReactNode } from 'react';

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div className="w-full max-w-lg rounded-lg bg-white p-6" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify and commit**

```bash
bun run --cwd apps/web typecheck
git add apps/web/src/components/ui
git commit -m "feat(web): add shared UI primitives"
```

### Task 0.3: Auth session (store + context + role guard)

**Files:**

- Create: `apps/web/src/lib/auth-store.ts`
- Create: `apps/web/src/lib/auth-context.tsx`
- Create: `apps/web/src/components/auth/Protected.tsx`
- Test: `apps/web/test/auth-store.test.ts`
- Modify: `apps/web/src/routes/__root.tsx` (mount `AuthProvider`)

**Interfaces:**

- Consumes: `AuthUser` from `lib/types.ts`; `login`/`register`/`getMe`/`logout` from `lib/api/auth.ts` (Task 0.5).
- Produces: `AuthProvider`, `useAuth()` returning `{ user, token, isAuthenticated, login, register, logout, refreshUser }`; `Protected({ role, children })`; pure helpers `getStoredAuth`, `setStoredAuth`, `clearStoredAuth`, `tokenExpiry`, `isTokenExpired`.

- [ ] **Step 1: Write failing tests**

Create `apps/web/test/auth-store.test.ts`:

```ts
import { test, expect } from 'bun:test';
import { isTokenExpired, tokenExpiry } from '../src/lib/auth-store';

function makeToken(exp: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ exp }));
  return `${header}.${payload}.signature`;
}

test('tokenExpiry returns the exp claim as a number', () => {
  expect(tokenExpiry(makeToken(2000000000))).toBe(2000000000);
});

test('tokenExpiry returns null for a malformed token', () => {
  expect(tokenExpiry('not-a-jwt')).toBeNull();
});

test('isTokenExpired is true when exp is in the past', () => {
  expect(isTokenExpired(makeToken(1000000000))).toBe(true);
});

test('isTokenExpired is false when exp is in the future', () => {
  expect(isTokenExpired(makeToken(4000000000))).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun run --cwd apps/web test test/auth-store.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write auth-store.ts**

Create `apps/web/src/lib/auth-store.ts`:

```ts
import type { AuthUser } from './types';

const TOKEN_KEY = 'token';
const REFRESH_KEY = 'refresh_token';
const USER_KEY = 'user';

export interface StoredAuth {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
}

export function getStoredAuth(): StoredAuth {
  if (typeof window === 'undefined') return { token: null, refreshToken: null, user: null };
  try {
    const userRaw = localStorage.getItem(USER_KEY);
    return {
      token: localStorage.getItem(TOKEN_KEY),
      refreshToken: localStorage.getItem(REFRESH_KEY),
      user: userRaw ? (JSON.parse(userRaw) as AuthUser) : null,
    };
  } catch {
    return { token: null, refreshToken: null, user: null };
  }
}

export function setStoredAuth(
  token: string,
  refreshToken: string | undefined,
  user: AuthUser
): void {
  localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('user_id');
  localStorage.removeItem('haven_state');
}

export function tokenExpiry(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const exp = tokenExpiry(token);
  return exp === null ? false : Date.now() / 1000 > exp;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run --cwd apps/web test test/auth-store.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write auth-context.tsx**

Create `apps/web/src/lib/auth-context.tsx`:

```tsx
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { getMe, login as apiLogin, logout as apiLogout, register as apiRegister } from './api/auth';
import { clearStoredAuth, getStoredAuth, setStoredAuth } from './auth-store';
import type { AuthUser, RegisterInput } from './types';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [stored] = useState(getStoredAuth);
  const [token, setToken] = useState<string | null>(stored.token);
  const [user, setUser] = useState<AuthUser | null>(stored.user);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiLogin(email, password);
    setStoredAuth(response.access_token, undefined, response.user);
    setToken(response.access_token);
    setUser(response.user);
    return response.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const response = await apiRegister(input);
    setStoredAuth(response.access_token, response.refresh_token, response.user);
    setToken(response.access_token);
    setUser(response.user);
    return response.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // best-effort; local state clears regardless
    }
    clearStoredAuth();
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const response = await getMe(token);
    setStoredAuth(token, undefined, response.user);
    setUser(response.user);
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, token, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
```

- [ ] **Step 6: Write Protected.tsx**

Create `apps/web/src/components/auth/Protected.tsx`:

```tsx
import { useNavigate } from '@tanstack/react-router';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../../lib/auth-context';
import type { AuthUser } from '../../lib/types';

export function Protected({ role, children }: { role: AuthUser['role']; children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) void navigate({ to: '/auth/login' });
    else if (user?.role !== role) void navigate({ to: '/' });
  }, [isAuthenticated, user?.role, role, navigate]);

  if (!isAuthenticated || user?.role !== role) return null;
  return <>{children}</>;
}
```

- [ ] **Step 7: Mount AuthProvider in \_\_root.tsx**

In `apps/web/src/routes/__root.tsx`, wrap `<Outlet />` with `<AuthProvider>` (import it and render `<AuthProvider><Outlet /></AuthProvider>`).

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/lib/auth-store.ts apps/web/src/lib/auth-context.tsx apps/web/src/components/auth/Protected.tsx apps/web/src/routes/__root.tsx apps/web/test/auth-store.test.ts
git commit -m "feat(web): add auth session store, context, and role guard"
```

### Task 0.4: Layout shells (role sidebar + topbar)

**Files:**

- Create: `apps/web/src/components/layout/RoleShell.tsx`
- Create: `apps/web/src/components/layout/Sidebar.tsx`
- Create: `apps/web/src/components/layout/Topbar.tsx`

**Interfaces:**

- Consumes: `useAuth` (Task 0.3).
- Produces: `RoleShell({ nav, children })` with `NavItem = { to: string; label: string; icon?: string }` — the wrapper every `/boarder/*`, `/landlord/*`, and `/admin` route uses.

- [ ] **Step 1: Write Sidebar and Topbar**

Create `apps/web/src/components/layout/Sidebar.tsx`:

```tsx
import { Link } from '@tanstack/react-router';

export interface NavItem {
  to: string;
  label: string;
}

export function Sidebar({ nav }: { nav: NavItem[] }) {
  return (
    <aside className="w-60 shrink-0 border-r border-gray-200 bg-white p-4">
      <nav className="flex flex-col gap-1">
        {nav.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className="rounded-md px-3 py-2 text-sm hover:bg-mint"
            activeProps={{ className: 'bg-mint font-semibold text-primary' }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

Create `apps/web/src/components/layout/Topbar.tsx`:

```tsx
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '../../lib/auth-context';

export function Topbar({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <h1 className="font-semibold">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-ink">
          {user?.first_name} {user?.last_name}
        </span>
        <button
          type="button"
          className="text-sm text-primary hover:underline"
          onClick={async () => {
            await logout();
            void navigate({ to: '/auth/login' });
          }}
        >
          Log out
        </button>
      </div>
    </header>
  );
}
```

Create `apps/web/src/components/layout/RoleShell.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Sidebar, type NavItem } from './Sidebar';
import { Topbar } from './Topbar';

export function RoleShell({
  title,
  nav,
  children,
}: {
  title: string;
  nav: NavItem[];
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar nav={nav} />
      <div className="flex-1">
        <Topbar title={title} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/layout
git commit -m "feat(web): add role layout shells"
```

### Task 0.5: Data layer — split api.ts into typed modules

**Files:**

- Create: `apps/web/src/lib/api/http.ts`
- Create: `apps/web/src/lib/api/public.ts`
- Create: `apps/web/src/lib/api/auth.ts`
- Create: `apps/web/src/lib/api/account.ts`
- Create: `apps/web/src/lib/api/boarder.ts`
- Create: `apps/web/src/lib/api/landlord.ts`
- Create: `apps/web/src/lib/api/admin.ts`
- Create: `apps/web/src/lib/api/notifications.ts`
- Create: `apps/web/src/lib/api/deferred.ts`
- Delete: `apps/web/src/lib/api.ts`
- Modify: `apps/web/src/lib/types.ts` (add the response types below)
- Test: `apps/web/test/api.test.ts` (move imports to `../src/lib/api/http`)

**Interfaces:**

- Consumes: `getApiBaseUrl` from `lib/config.ts`; types from `lib/types.ts`.
- Produces: the complete typed data layer. **Every later phase imports only these modules.** Exact signatures are the contract (see Step 3); no route file calls `fetch` directly.

- [ ] **Step 1: Write failing tests for the http helper**

Create `apps/web/test/api.test.ts` (replacing the existing file) with these imports and cases:

```ts
import { test, expect, mock } from 'bun:test';
import { ApiRequestError, apiFetch } from '../src/lib/api/http';

test('apiFetch parses a JSON envelope', async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ data: { ok: true } }), {
      status: 200,
    })) as unknown as typeof fetch;

  const result = await apiFetch<{ data: { ok: boolean } }>('http://test', '/x');
  expect(result.data.ok).toBe(true);
});

test('apiFetch throws ApiRequestError with the API message on non-2xx', async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: 'Property not found' }), {
      status: 404,
    })) as unknown as typeof fetch;

  const err = await apiFetch<unknown>('http://test', '/x').then(
    () => null,
    e => e
  );
  expect(err).toBeInstanceOf(ApiRequestError);
  expect((err as ApiRequestError).status).toBe(404);
  expect((err as ApiRequestError).message).toBe('Property not found');
});

test('listPublicRooms builds the full query string', async () => {
  const fetchMock = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ data: { properties: [], total_count: 0, limit: 20, offset: 0 } })
      )
    )
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  await (
    await import('../src/lib/api/public')
  ).listPublicRooms(
    { search: 'Manila', price_max: 5000, sort_by: 'price_asc', limit: 20, offset: 0 },
    'http://test'
  );
  const url = String((fetchMock as unknown as { mock: { calls: unknown[] } }).mock.calls[0][0]);
  expect(url).toBe(
    'http://test/api/rooms/public?search=Manila&price_max=5000&sort_by=price_asc&limit=20&offset=0'
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun run --cwd apps/web test test/api.test.ts
```

Expected: FAIL — `../src/lib/api/http` not found.

- [ ] **Step 3: Write the data layer**

Create `apps/web/src/lib/api/http.ts`:

```ts
import { getApiBaseUrl } from '../config';
import type { ApiErrorBody } from '../types';

export class ApiRequestError extends Error {
  constructor(public status: number, message: string, public body: unknown) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export async function apiFetch<T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  });
  const body = (await response.json().catch(() => ({}))) as T & ApiErrorBody;
  if (!response.ok) {
    throw new ApiRequestError(
      response.status,
      body.error ?? body.message ?? `Request failed (${response.status})`,
      body
    );
  }
  return body;
}

export function authedHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export function jsonOptions(token: string | undefined, init: RequestInit = {}): RequestInit {
  return {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? authedHeaders(token) : {}),
      ...(init.headers ?? {}),
    },
  };
}
```

Create `apps/web/src/lib/api/public.ts`:

```ts
import { getApiBaseUrl } from '../config';
import type {
  ListingDetailResponse,
  PopularLocationsResponse,
  PublicListingsFilters,
  PublicListingsResponse,
  SimilarPropertiesResponse,
} from '../types';
import { apiFetch } from './http';

export function listPublicRooms(
  filters: PublicListingsFilters = {},
  baseUrl: string = getApiBaseUrl()
): Promise<PublicListingsResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.price_min != null) params.set('price_min', String(filters.price_min));
  if (filters.price_max != null) params.set('price_max', String(filters.price_max));
  if (filters.sort_by) params.set('sort_by', filters.sort_by);
  if (filters.limit != null) params.set('limit', String(filters.limit));
  if (filters.offset != null) params.set('offset', String(filters.offset));
  const qs = params.toString();
  return apiFetch<PublicListingsResponse>(baseUrl, `/api/rooms/public${qs ? `?${qs}` : ''}`);
}

export function getRoomDetail(
  id: number,
  baseUrl: string = getApiBaseUrl()
): Promise<ListingDetailResponse> {
  return apiFetch<ListingDetailResponse>(baseUrl, `/api/rooms/detail?id=${encodeURIComponent(id)}`);
}

export function getSimilarRooms(
  id: number,
  limit = 3,
  baseUrl: string = getApiBaseUrl()
): Promise<SimilarPropertiesResponse> {
  return apiFetch<SimilarPropertiesResponse>(
    baseUrl,
    `/api/rooms/similar?id=${encodeURIComponent(id)}&limit=${limit}`
  );
}

export function getPopularLocations(
  limit = 6,
  baseUrl: string = getApiBaseUrl()
): Promise<PopularLocationsResponse> {
  return apiFetch<PopularLocationsResponse>(baseUrl, `/api/rooms/popular-locations?limit=${limit}`);
}
```

Create `apps/web/src/lib/api/auth.ts` (full code):

```ts
import { getApiBaseUrl } from '../config';
import type {
  CheckEmailResponse,
  LoginResponse,
  MeResponse,
  RegisterInput,
  RegisterResponse,
  ResetResponse,
} from '../types';
import { apiFetch } from './http';

const base = () => getApiBaseUrl();

export function checkEmail(email: string): Promise<CheckEmailResponse> {
  return apiFetch<CheckEmailResponse>(base(), `/auth/check-email`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>(base(), '/auth/login', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
}

export function register(input: RegisterInput): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>(base(), '/auth/register', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify(input),
  });
}

export function getMe(token: string): Promise<MeResponse> {
  return apiFetch<MeResponse>(base(), '/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<ResetResponse> {
  return apiFetch<ResetResponse>(base(), '/auth/change-password', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export function forgotPassword(email: string): Promise<ResetResponse> {
  return apiFetch<ResetResponse>(base(), '/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function verifyResetCode(email: string, code: string): Promise<ResetResponse> {
  return apiFetch<ResetResponse>(base(), '/auth/verify-reset-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
}

export function resendResetCode(email: string): Promise<ResetResponse> {
  return apiFetch<ResetResponse>(base(), '/auth/resend-reset-code', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<ResetResponse> {
  return apiFetch<ResetResponse>(base(), '/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, code, new_password: newPassword }),
  });
}

export function refreshToken(): Promise<{ access_token: string }> {
  return apiFetch(base(), '/auth/refresh-token', { method: 'POST', credentials: 'include' });
}

export function logout(): Promise<ResetResponse> {
  return apiFetch<ResetResponse>(base(), '/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
}
```

Create `apps/web/src/lib/api/account.ts`:

```ts
import { getApiBaseUrl } from '../config';
import type { ProfileResponse, UpdateProfileInput } from '../types';
import { apiFetch } from './http';

export function getProfile(token: string): Promise<ProfileResponse> {
  return apiFetch<ProfileResponse>(getApiBaseUrl(), '/api/users/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function updateProfile(token: string, input: UpdateProfileInput): Promise<ProfileResponse> {
  return apiFetch<ProfileResponse>(getApiBaseUrl(), '/api/users/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
}

export async function uploadAvatar(token: string, file: File): Promise<ProfileResponse> {
  const form = new FormData();
  form.append('avatar', file);
  const response = await fetch(`${getApiBaseUrl()}/api/users/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return (await response.json()) as ProfileResponse;
}
```

Create `apps/web/src/lib/api/boarder.ts` (full code for saved listings; signatures for the rest):

```ts
import { getApiBaseUrl } from '../config';
import type {
  AcceptedApplicationsResponse,
  ApplicationDetailResponse,
  ApplicationsResponse,
  BoarderAnnouncementsResponse,
  OnboardingStatusResponse,
  SaveListingResponse,
  SavedListingsResponse,
  SavedStatusResponse,
  TenancyResponse,
} from '../types';
import { apiFetch, jsonOptions } from './http';

const base = () => getApiBaseUrl();

export function getSavedListings(token: string): Promise<SavedListingsResponse> {
  return apiFetch<SavedListingsResponse>(base(), '/api/boarder/saved-listings', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getSavedStatus(token: string, propertyId: number): Promise<SavedStatusResponse> {
  return apiFetch<SavedStatusResponse>(
    base(),
    `/api/boarder/saved-listings?property_id=${encodeURIComponent(propertyId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}

export function saveListing(
  token: string,
  propertyId: number,
  roomId?: number
): Promise<SaveListingResponse> {
  return apiFetch<SaveListingResponse>(
    base(),
    '/api/boarder/saved-listings',
    jsonOptions(token, {
      method: 'POST',
      body: JSON.stringify({ property_id: propertyId, room_id: roomId ?? null }),
    })
  );
}

export function unsaveListing(
  token: string,
  propertyId: number
): Promise<{ success: true; message: string }> {
  return apiFetch(
    base(),
    '/api/boarder/saved-listings',
    jsonOptions(token, {
      method: 'DELETE',
      body: JSON.stringify({ property_id: propertyId }),
    })
  );
}

export function getApplications(token: string): Promise<ApplicationsResponse> {
  return apiFetch<ApplicationsResponse>(base(), '/api/boarder/applications', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getApplication(token: string, id: number): Promise<ApplicationDetailResponse> {
  return apiFetch<ApplicationDetailResponse>(base(), `/api/boarder/applications/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function createApplication(
  token: string,
  propertyId: number,
  roomId: number,
  message: string
): Promise<ApplicationDetailResponse> {
  return apiFetch<ApplicationDetailResponse>(
    base(),
    '/api/boarder/applications',
    jsonOptions(token, {
      method: 'POST',
      body: JSON.stringify({ property_id: propertyId, room_id: roomId, message }),
    })
  );
}

export function deleteApplication(
  token: string,
  id: number
): Promise<{ success: boolean; message: string }> {
  return apiFetch(
    base(),
    `/api/boarder/applications/${id}`,
    jsonOptions(token, { method: 'DELETE' })
  );
}

export function confirmApplication(
  token: string,
  id: number,
  paymentMethod: string
): Promise<ApplicationDetailResponse> {
  return apiFetch<ApplicationDetailResponse>(
    base(),
    `/api/boarder/applications/${id}/confirm`,
    jsonOptions(token, {
      method: 'POST',
      body: JSON.stringify({ payment_method: paymentMethod }),
    })
  );
}

export function getTenancy(token: string): Promise<TenancyResponse> {
  return apiFetch<TenancyResponse>(base(), '/api/boarder/tenancy', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function leaveRequest(
  token: string,
  message: string
): Promise<{ success: boolean; message: string }> {
  return apiFetch(
    base(),
    '/api/boarder/leave-request',
    jsonOptions(token, {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
  );
}

export function getOnboardingStatus(token: string): Promise<OnboardingStatusResponse> {
  return apiFetch<OnboardingStatusResponse>(base(), '/api/boarder/onboarding-status', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function updateOnboarding(
  token: string,
  input: Record<string, unknown>
): Promise<OnboardingStatusResponse> {
  return apiFetch<OnboardingStatusResponse>(
    base(),
    '/api/boarder/update-onboarding',
    jsonOptions(token, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  );
}

export function getBoarderAnnouncements(token: string): Promise<BoarderAnnouncementsResponse> {
  return apiFetch<BoarderAnnouncementsResponse>(base(), '/api/boarder/announcements', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function viewAnnouncement(token: string, id: number): Promise<{ success: boolean }> {
  return apiFetch(
    base(),
    `/api/boarder/announcements/${id}/view`,
    jsonOptions(token, { method: 'POST' })
  );
}

export function getAcceptedApplications(token: string): Promise<AcceptedApplicationsResponse> {
  return apiFetch<AcceptedApplicationsResponse>(base(), '/api/boarder/accepted-applications', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function hasAcceptedApplications(
  token: string
): Promise<{ has_accepted: boolean; property_ids: number[] }> {
  return apiFetch(base(), '/api/boarder/has-accepted-applications', {
    headers: { Authorization: `Bearer ${token}` },
  });
}
```

Create `apps/web/src/lib/api/landlord.ts` (signatures — full bodies follow the `apiFetch` + `jsonOptions` pattern above; multipart uses `fetch` + `FormData`):

```ts
import { getApiBaseUrl } from '../config';
import type {
  BoardersResponse,
  DashboardStatsResponse,
  LandlordAnnouncementsResponse,
  LandlordApplicationsResponse,
  LandlordPropertyDetailResponse,
  LandlordPropertiesResponse,
  LandlordRoomResponse,
  UploadPhotosResponse,
} from '../types';
import { apiFetch, jsonOptions } from './http';

const base = () => getApiBaseUrl();

export function getDashboardStats(token: string): Promise<DashboardStatsResponse> {
  /* GET /api/landlord/dashboard-stats */
}
export function getProperties(token: string): Promise<LandlordPropertiesResponse> {
  /* GET /api/landlord/properties */
}
export function getProperty(token: string, id: number): Promise<LandlordPropertyDetailResponse> {
  /* GET /api/landlord/properties?id= */
}
export function createListing(
  token: string,
  input: Record<string, unknown>
): Promise<LandlordPropertyDetailResponse> {
  /* POST /api/landlord/listings */
}
export function updateListing(
  token: string,
  id: number,
  input: Record<string, unknown>
): Promise<LandlordPropertyDetailResponse> {
  /* PUT /api/landlord/listings/:id */
}
export function deleteProperty(token: string, id: number): Promise<{ success: boolean }> {
  /* DELETE /api/landlord/properties?id= */
}
export function getRooms(token: string, propertyId: number): Promise<LandlordRoomResponse> {
  /* GET /api/landlord/rooms?propertyId= */
}
export function createRoom(
  token: string,
  input: Record<string, unknown>
): Promise<LandlordRoomResponse> {
  /* POST /api/landlord/rooms */
}
export function updateRoom(
  token: string,
  id: number,
  input: Record<string, unknown>
): Promise<LandlordRoomResponse> {
  /* PUT /api/landlord/rooms?id= */
}
export function deleteRoom(token: string, id: number): Promise<{ success: boolean }> {
  /* DELETE /api/landlord/rooms?id= */
}
export function getBoarders(token: string, propertyId: number): Promise<BoardersResponse> {
  /* GET /api/landlord/boarders?propertyId= */
}
export function addBoarder(
  token: string,
  input: Record<string, unknown>
): Promise<{ success: boolean }> {
  /* POST /api/landlord/boarders */
}
export function updateBoarder(
  token: string,
  input: Record<string, unknown>
): Promise<{ success: boolean }> {
  /* PUT /api/landlord/boarders */
}
export function removeBoarder(token: string, id: number): Promise<{ success: boolean }> {
  /* DELETE /api/landlord/boarders?id= */
}
export function getApplications(token: string): Promise<LandlordApplicationsResponse> {
  /* GET /api/landlord/applications */
}
export function patchApplicationStatus(
  token: string,
  id: number,
  status: string
): Promise<{ success: boolean }> {
  /* PATCH /api/landlord/applications/:id/status */
}
export function getAnnouncements(token: string): Promise<LandlordAnnouncementsResponse> {
  /* GET /api/landlord/announcements */
}
export function createAnnouncement(
  token: string,
  input: Record<string, unknown>
): Promise<{ success: boolean }> {
  /* POST /api/landlord/announcements */
}
export function updateAnnouncement(
  token: string,
  id: number,
  input: Record<string, unknown>
): Promise<{ success: boolean }> {
  /* PUT /api/landlord/announcements/:id */
}
export function deleteAnnouncement(token: string, id: number): Promise<{ success: boolean }> {
  /* DELETE /api/landlord/announcements/:id */
}
export function approveLeaveRequest(
  token: string,
  applicationId: number
): Promise<{ success: boolean }> {
  /* POST /api/landlord/approve-leave-request */
}

export async function uploadPropertyPhotos(
  token: string,
  propertyId: number,
  files: File[]
): Promise<UploadPhotosResponse> {
  const form = new FormData();
  files.forEach(file => form.append('photos', file));
  const response = await fetch(`${base()}/api/landlord/listings/${propertyId}/photos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return (await response.json()) as UploadPhotosResponse;
}

export async function uploadRoomPhotos(
  token: string,
  roomId: number,
  files: File[]
): Promise<UploadPhotosResponse> {
  const form = new FormData();
  files.forEach(file => form.append('roomPhotos', file));
  const response = await fetch(`${base()}/api/landlord/rooms/${roomId}/photos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return (await response.json()) as UploadPhotosResponse;
}
```

> **Contract verification (not a placeholder — a required read):** before Phase 4, open `workers/api/src/routes/landlord.ts` and each `repositories/landlord-*.ts` to confirm the exact request/response field names for the functions above whose bodies are abbreviated (`getDashboardStats` … `approveLeaveRequest`). Fill the `/* … */` bodies with the verified paths and payloads, keeping the declared signatures. The routes themselves and every frontend call site depend only on the signatures, so this is local to Task 0.5.

Create `apps/web/src/lib/api/admin.ts`, `apps/web/src/lib/api/notifications.ts`, and `apps/web/src/lib/api/deferred.ts` with the same pattern:

```ts
// admin.ts
import { getApiBaseUrl } from '../config';
import type {
  AdminApplicationsResponse,
  AdminPropertiesResponse,
  AdminSettingsResponse,
  AdminSummaryResponse,
  AdminUsersResponse,
} from '../types';
import { apiFetch, jsonOptions } from './http';

const base = () => getApiBaseUrl();
export function getSummary(token: string): Promise<AdminSummaryResponse> {
  /* GET /api/admin/summary */
}
export function getUsers(token: string): Promise<AdminUsersResponse> {
  /* GET /api/admin/users */
}
export function patchUserStatus(
  token: string,
  userId: number,
  status: string
): Promise<{ success: boolean }> {
  /* PATCH /api/admin/users */
}
export function getProperties(token: string): Promise<AdminPropertiesResponse> {
  /* GET /api/admin/properties */
}
export function patchPropertyStatus(
  token: string,
  id: number,
  status: string
): Promise<{ success: boolean }> {
  /* POST /api/admin/properties */
}
export function getApplications(token: string): Promise<AdminApplicationsResponse> {
  /* GET /api/admin/applications */
}
export function getSettings(token: string): Promise<AdminSettingsResponse> {
  /* GET /api/admin/settings */
}
export function patchSettings(
  token: string,
  input: Record<string, unknown>
): Promise<{ success: boolean }> {
  /* PATCH /api/admin/settings */
}
export function getLandlords(token: string): Promise<AdminUsersResponse> {
  /* GET /api/admin/landlords */
}
export function approveLandlord(token: string, userId: number): Promise<{ success: boolean }> {
  /* POST /api/admin/landlords */
}
```

```ts
// notifications.ts
import { getApiBaseUrl } from '../config';
import type { NotificationsResponse, UnreadCountResponse } from '../types';
import { apiFetch, jsonOptions } from './http';

const base = () => getApiBaseUrl();
export function getNotifications(token: string): Promise<NotificationsResponse> {
  /* GET /api/notifications */
}
export function getUnreadCount(token: string): Promise<UnreadCountResponse> {
  /* GET /api/notifications/unread-count */
}
export function markRead(token: string, id: number): Promise<{ success: boolean }> {
  /* PATCH /api/notifications/:id/read */
}
export function markAllRead(token: string): Promise<{ success: boolean }> {
  /* PATCH /api/notifications/read-all */
}
export function deleteNotification(token: string, id: number): Promise<{ success: boolean }> {
  /* DELETE /api/notifications/:id */
}
```

```ts
// deferred.ts
import { getApiBaseUrl } from '../config';
import { apiFetch } from './http';

const base = () => getApiBaseUrl();
// Payments and messages are intentionally deferred; the Worker returns 501 FEATURE_DEFERRED.
export function paymentsDeferred(): Promise<{ error: string }> {
  return apiFetch(base(), '/api/payments');
}
export function messagesDeferred(): Promise<{ error: string }> {
  return apiFetch(base(), '/api/messages');
}
```

- [ ] **Step 4: Extend types.ts**

Append to `apps/web/src/lib/types.ts` (do not remove existing types):

```ts
export interface SimilarProperty {
  id: number;
  title: string;
  description: string;
  price: number;
  address: string;
  city: string;
  province: string;
  rating: number;
  reviewCount: number;
  coverImage: string;
}
export interface SimilarPropertiesResponse {
  data: SimilarProperty[];
}
export interface PopularLocation {
  name: string;
  search_value: string;
  property_count: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  price_range: string;
}
export interface PopularLocationsResponse {
  data: { locations: PopularLocation[] };
}
export interface CheckEmailResponse {
  exists: boolean;
  is_google_account: boolean;
}
export interface MeResponse {
  success: true;
  user: AuthUser;
}
export interface ResetResponse {
  success: boolean;
  message: string;
}
export interface ProfileResponse {
  data: AuthUser & Record<string, unknown>;
}
export interface UpdateProfileInput {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
}
export interface SavedListingsResponse {
  success: true;
  data: unknown[];
  count: number;
}
export interface ApplicationSummary {
  id: number;
  property_id: number;
  room_id: number;
  status: string;
  message: string;
  created_at: string;
  property?: { title: string; address: string; city: string; image: string };
  room?: { room_number: string; price: number };
}
export interface ApplicationsResponse {
  data: ApplicationSummary[];
}
export interface ApplicationDetailResponse {
  data: ApplicationSummary;
}
export interface TenancyResponse {
  data: Record<string, unknown> | null;
}
export interface OnboardingStatusResponse {
  data: Record<string, unknown>;
}
export interface BoarderAnnouncementsResponse {
  data: Array<{
    id: number;
    title: string;
    body: string;
    category: string;
    priority: string;
    property_id: number | null;
    created_at: string;
    is_viewed?: boolean;
  }>;
}
export interface AcceptedApplicationsResponse {
  data: Array<{ id: number; property_id: number; room_id: number; status: string }>;
}
export interface DashboardStatsResponse {
  data: { occupancy: number; revenue: number; renewals: number; payment_alerts: number };
}
export interface LandlordPropertiesResponse {
  data: {
    properties: Array<{
      id: number;
      name: string;
      title: string;
      address: string;
      city: string;
      status: string;
      created_at: string;
    }>;
    total_count: number;
  };
}
export interface LandlordPropertyDetailResponse {
  data: Record<string, unknown>;
}
export interface LandlordRoomResponse {
  data: {
    rooms: Array<{
      id: number;
      room_number: string;
      title: string;
      price: number;
      capacity: number;
      status: string;
    }>;
    total_count: number;
  };
}
export interface UploadPhotosResponse {
  data: { urls: string[] };
}
export interface BoardersResponse {
  success: true;
  data: { boarders: Array<Record<string, unknown>>; total_count: number };
}
export interface LandlordApplicationsResponse {
  data: Array<Record<string, unknown>>;
}
export interface LandlordAnnouncementsResponse {
  data: Array<{
    id: number;
    title: string;
    body: string;
    category: string;
    priority: string;
    property_id: number | null;
    created_at: string;
  }>;
}
export interface NotificationsResponse {
  data: Array<{ id: number; title: string; body: string; is_read: boolean; created_at: string }>;
}
export interface UnreadCountResponse {
  data: { unread_count: number };
}
export interface AdminSummaryResponse {
  data: Record<string, unknown>;
}
export interface AdminUsersResponse {
  data: Array<Record<string, unknown>>;
}
export interface AdminPropertiesResponse {
  data: Array<Record<string, unknown>>;
}
export interface AdminApplicationsResponse {
  data: Array<Record<string, unknown>>;
}
export interface AdminSettingsResponse {
  data: Record<string, unknown>;
}
```

- [ ] **Step 5: Run tests, typecheck, build**

```bash
bun run --cwd apps/web test
bun run --cwd apps/web typecheck
bun run --cwd apps/web build
```

Expected: tests pass; typecheck clean; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/api apps/web/src/lib/types.ts apps/web/test/api.test.ts
git rm apps/web/src/lib/api.ts
git commit -m "refactor(web): split api client into typed domain modules"
```

### Task 0.6: Component test setup

**Files:**

- Create: `apps/web/test/setup.ts`
- Modify: `apps/web/package.json` (test script uses `--preload`)
- Test: `apps/web/test/components.test.tsx`

**Interfaces:**

- Produces: a working `bun test` + `@testing-library/react` + `happy-dom` setup that every component test in later phases reuses.

- [ ] **Step 1: Install test deps**

```bash
bun add -d @testing-library/react happy-dom @testing-library/dom
```

- [ ] **Step 2: Write setup and a smoke render test**

Create `apps/web/test/setup.ts`:

```ts
import { GlobalRegistrator } from 'happy-dom';
GlobalRegistrator.register();
```

Modify `apps/web/package.json` scripts: `"test": "bun test --preload ./test/setup.ts"`.

Create `apps/web/test/components.test.tsx`:

```tsx
import { test, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Button } from '../src/components/ui/Button';

test('Button renders its children', () => {
  render(<Button>Save</Button>);
  expect(screen.getByText('Save')).toBeDefined();
});
```

- [ ] **Step 3: Run and commit**

```bash
bun run --cwd apps/web test
```

Expected: all tests (unit + component) pass.

```bash
git add apps/web/test apps/web/package.json apps/web/bun.lock
git commit -m "test(web): add component test setup with happy-dom"
```

---

# Phase 1 — Public site (views 1–12)

**Goal:** the marketing/browse surface, fully SSR where data-backed. All 12 routes render with zero client JS dependency for first paint.

**API contracts consumed:** `listPublicRooms`, `getRoomDetail`, `getSimilarRooms`, `getPopularLocations` (Task 0.5).

**New shared components:** `RoomCard` (link + image + title + price + availability), `PropertySearchFilters`, `FindARoomContent` (query + grid + pagination).

### Task 1.1: Find-a-room search + detail + similar rooms

**Files:**

- Create: `apps/web/src/components/rooms/RoomCard.tsx`
- Create: `apps/web/src/components/rooms/PropertySearchFilters.tsx`
- Create: `apps/web/src/components/rooms/FindARoomContent.tsx`
- Create: `apps/web/src/routes/find-a-room/index.tsx`
- Create: `apps/web/src/routes/rooms/$id.tsx`
- Modify: `apps/web/src/routes/index.tsx`

**Interfaces:**

- Produces: `RoomCard({ property })`, `PropertySearchFilters({ value, onChange })`, `FindARoomContent({ initialData? })`.

- [ ] **Step 1: Write RoomCard**

Create `apps/web/src/components/rooms/RoomCard.tsx`:

```tsx
import { Link } from '@tanstack/react-router';
import type { PublicProperty } from '../../lib/types';

export function RoomCard({ property }: { property: PublicProperty }) {
  return (
    <li className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <Link to="/rooms/$id" params={{ id: String(property.id) }}>
        <img src={property.image} alt={property.title} className="h-44 w-full object-cover" />
        <div className="p-3">
          <h3 className="font-semibold">{property.title}</h3>
          <p className="text-sm text-gray-ink">
            {property.address}, {property.city}
          </p>
          <p className="font-bold text-primary">₱{property.price.toLocaleString()}</p>
          <p className="text-sm text-gray-ink">
            {property.availableRooms} of {property.totalRooms} rooms available
          </p>
        </div>
      </Link>
    </li>
  );
}
```

- [ ] **Step 2: Write PropertySearchFilters**

Create `apps/web/src/components/rooms/PropertySearchFilters.tsx`:

```tsx
import type { PublicListingsFilters } from '../../lib/types';
import { SelectInput, TextInput } from '../ui/Field';

export function PropertySearchFilters({
  value,
  onChange,
}: {
  value: PublicListingsFilters;
  onChange: (next: PublicListingsFilters) => void;
}) {
  return (
    <form className="mb-6 flex flex-wrap gap-3" onSubmit={e => e.preventDefault()}>
      <TextInput
        type="search"
        placeholder="Search by city, address, or title"
        value={value.search ?? ''}
        onChange={e => onChange({ ...value, search: e.target.value })}
      />
      <TextInput
        type="number"
        placeholder="Max price"
        min={0}
        value={value.price_max ?? ''}
        onChange={e =>
          onChange({ ...value, price_max: e.target.value ? Number(e.target.value) : undefined })
        }
      />
      <SelectInput
        value={value.sort_by ?? 'newest'}
        onChange={e => onChange({ ...value, sort_by: e.target.value })}
      >
        <option value="newest">Newest</option>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
      </SelectInput>
    </form>
  );
}
```

- [ ] **Step 3: Write FindARoomContent**

Create `apps/web/src/components/rooms/FindARoomContent.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { listPublicRooms } from '../../lib/api/public';
import type { PublicListingsFilters, PublicListingsResponse } from '../../lib/types';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { Spinner } from '../ui/Spinner';
import { PropertySearchFilters } from './PropertySearchFilters';
import { RoomCard } from './RoomCard';

const DEFAULT_FILTERS: PublicListingsFilters = { sort_by: 'newest', limit: 20, offset: 0 };

export function FindARoomContent({ initialData }: { initialData?: PublicListingsResponse }) {
  const [filters, setFilters] = useState<PublicListingsFilters>(DEFAULT_FILTERS);

  const query = useQuery({
    queryKey: ['rooms', filters],
    queryFn: () => listPublicRooms(filters),
    initialData,
  });

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Find a room</h1>
      <PropertySearchFilters value={filters} onChange={setFilters} />
      {query.isLoading ? (
        <Spinner />
      ) : query.error ? (
        <ErrorState message={query.error.message} />
      ) : query.data && query.data.data.total_count === 0 ? (
        <EmptyState title="No rooms found" description="Try widening your search." />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {query.data?.data.properties.map(property => (
            <RoomCard key={property.id} property={property} />
          ))}
        </ul>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Write the two routes**

Create `apps/web/src/routes/find-a-room/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { env } from 'cloudflare:workers';
import { FindARoomContent } from '../../components/rooms/FindARoomContent';
import { listPublicRooms } from '../../lib/api/public';
import type { PublicListingsFilters } from '../../lib/types';

const loadRooms = createServerFn({ method: 'GET' })
  .validator((data: PublicListingsFilters) => data)
  .handler(({ data }) => listPublicRooms(data, env.API_BASE_URL));

export const Route = createFileRoute('/find-a-room/')({
  loader: () => loadRooms({ data: { sort_by: 'newest', limit: 20, offset: 0 } }),
  component: () => {
    const initialData = Route.useLoaderData();
    return <FindARoomContent initialData={initialData} />;
  },
});
```

Create `apps/web/src/routes/rooms/$id.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { env } from 'cloudflare:workers';
import { getRoomDetail, getSimilarRooms } from '../../lib/api/public';

const loadDetail = createServerFn({ method: 'GET' })
  .validator((id: number) => id)
  .handler(({ data }) => getRoomDetail(data, env.API_BASE_URL));

const loadSimilar = createServerFn({ method: 'GET' })
  .validator((id: number) => id)
  .handler(({ data }) => getSimilarRooms(data, 3, env.API_BASE_URL));

export const Route = createFileRoute('/rooms/$id')({
  loader: ({ params }) =>
    Promise.all([
      loadDetail({ data: Number(params.id) }),
      loadSimilar({ data: Number(params.id) }),
    ]),
  errorComponent: () => (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Room not found</h1>
    </main>
  ),
  component: RoomDetailPage,
});

function RoomDetailPage() {
  const [detail, similar] = Route.useLoaderData();
  const listing = detail.data;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold">{listing.title}</h1>
      <img
        src={listing.coverImage}
        alt={listing.title}
        className="my-4 h-80 w-full rounded-lg object-cover"
      />
      <p className="text-xl font-bold text-primary">₱{listing.price.toLocaleString()}</p>
      <p className="text-gray-ink">
        {listing.address}, {listing.city}, {listing.province}
      </p>
      <p className="mt-2">{listing.description}</p>
      <section className="mt-6">
        <h2 className="text-lg font-semibold">Rooms</h2>
        <ul className="mt-2 space-y-2">
          {listing.rooms.map(room => (
            <li key={room.id} className="rounded-md border border-gray-200 p-3">
              {room.roomNumber} — ₱{room.price.toLocaleString()} · {room.capacity} occupant(s)
            </li>
          ))}
        </ul>
      </section>
      {similar.data.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Similar places</h2>
          <ul className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {similar.data.map(p => (
              <li key={p.id} className="rounded-md border border-gray-200 p-3">
                <LinkFromSimilar id={p.id} title={p.title} price={p.price} city={p.city} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

function LinkFromSimilar({
  id,
  title,
  price,
  city,
}: {
  id: number;
  title: string;
  price: number;
  city: string;
}) {
  const { Link } = require('@tanstack/react-router') as typeof import('@tanstack/react-router');
  return (
    <Link to="/rooms/$id" params={{ id: String(id) }}>
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-gray-ink">{city}</p>
      <p className="font-bold text-primary">₱{price.toLocaleString()}</p>
    </Link>
  );
}
```

> Fix in the same step: replace the `require()` in `LinkFromSimilar` with a top-level `import { Link } from '@tanstack/react-router'` (the `require` form is only a scaffold reminder that ESM imports go at the top of the file).

- [ ] **Step 5: Point the homepage at search**

Replace `apps/web/src/routes/index.tsx`:

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/find-a-room' });
  },
});
```

- [ ] **Step 6: Verify SSR and commit**

With `bun run cf:api:dev` and `bun run --cwd apps/web dev` running, `curl http://localhost:3001/find-a-room` must contain room titles server-side.

```bash
bun run --cwd apps/web typecheck
git add apps/web/src/components/rooms apps/web/src/routes/find-a-room apps/web/src/routes/rooms apps/web/src/routes/index.tsx
git commit -m "feat(web): add find-a-room search, room detail, and similar rooms"
```

### Task 1.2: Homepage and static marketing pages

**Files:**

- Modify: `apps/web/src/routes/index.tsx` (replace redirect with a real homepage)
- Create: `apps/web/src/components/rooms/Hero.tsx`
- Create: `apps/web/src/routes/for-landlords.tsx`
- Create: `apps/web/src/routes/our-story.tsx`
- Create: `apps/web/src/routes/teams.tsx`

**Interfaces:**

- Consumes: `getPopularLocations` (Task 0.5).
- Produces: homepage `/` (hero + popular locations + CTA), and three static pages.

- [ ] **Step 1: Write the homepage**

Replace `apps/web/src/routes/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { env } from 'cloudflare:workers';
import { getPopularLocations } from '../lib/api/public';
import { Hero } from '../components/rooms/Hero';

const loadLocations = createServerFn({ method: 'GET' }).handler(() =>
  getPopularLocations(6, env.API_BASE_URL)
);

export const Route = createFileRoute('/')({
  loader: () => loadLocations(),
  component: HomePage,
});

function HomePage() {
  const { data } = Route.useLoaderData();
  return (
    <main>
      <Hero />
      <section className="mx-auto max-w-6xl p-6">
        <h2 className="mb-4 text-xl font-bold">Popular locations</h2>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {data.locations.map(location => (
            <li key={location.name} className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="font-semibold">{location.name}</p>
              <p className="text-sm text-gray-ink">{location.property_count} properties</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
```

Create `apps/web/src/components/rooms/Hero.tsx`:

```tsx
import { Link } from '@tanstack/react-router';

export function Hero() {
  return (
    <section className="bg-primary px-6 py-16 text-center text-white">
      <h1 className="text-4xl font-bold">Find your next home</h1>
      <p className="mx-auto mt-3 max-w-xl">
        Affordable boarding houses and rooms across the Philippines.
      </p>
      <Link
        to="/find-a-room"
        className="mt-6 inline-block rounded-md bg-white px-6 py-2 font-semibold text-primary"
      >
        Browse rooms
      </Link>
    </section>
  );
}
```

- [ ] **Step 2: Write the three static pages**

Create `apps/web/src/routes/for-landlords.tsx`, `our-story.tsx`, and `teams.tsx`, each as a `createFileRoute('/for-landlords')` (etc.) with a `component` that renders a `PageHeader` + prose. Example for `for-landlords.tsx`:

```tsx
import { createFileRoute, Link } from '@tanstack/react-router';
import { PageHeader } from '../components/ui/PageHeader';

export const Route = createFileRoute('/for-landlords')({
  component: () => (
    <main className="mx-auto max-w-3xl p-6">
      <PageHeader title="List with Haven Space" subtitle="Reach boarders looking for a room." />
      <p>Manage listings, rooms, applications, and boarders in one dashboard.</p>
      <Link
        to="/auth/signup/landlord"
        className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-white"
      >
        Create a landlord account
      </Link>
    </main>
  ),
});
```

Write `our-story.tsx` and `teams.tsx` the same way with their own titles and a paragraph of copy (read the copy from `client/views/public/our-story.html` and `teams.html` during execution and lift the headings/paragraphs verbatim into JSX).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/index.tsx apps/web/src/routes/for-landlords.tsx apps/web/src/routes/our-story.tsx apps/web/src/routes/teams.tsx apps/web/src/components/rooms/Hero.tsx
git commit -m "feat(web): add homepage and marketing pages"
```

### Task 1.3: Legal pages + maps + haven-ai

**Files:**

- Create: `apps/web/src/routes/legal/privacy-policy.tsx`
- Create: `apps/web/src/routes/legal/terms-of-service.tsx`
- Create: `apps/web/src/routes/legal/user-agreement.tsx`
- Create: `apps/web/src/routes/maps.tsx`
- Create: `apps/web/src/routes/public-maps.tsx`
- Create: `apps/web/src/routes/haven-ai.tsx`

**Interfaces:**

- Consumes: nothing new (static content; maps render an embed link).
- Produces: routes `/legal/*`, `/maps`, `/public-maps`, `/haven-ai`.

- [ ] **Step 1: Legal pages**

Create the three `legal/*.tsx` routes with `createFileRoute('/legal/privacy-policy')` etc. Each renders a `PageHeader` + the legal copy lifted from the matching `client/views/public/*.html` file (read it during execution and paste the text into `<p>`/`<h2>` elements).

- [ ] **Step 2: Maps routes**

Create `apps/web/src/routes/maps.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '../components/ui/PageHeader';

export const Route = createFileRoute('/maps')({
  component: () => (
    <main className="mx-auto max-w-6xl p-6">
      <PageHeader title="Explore the map" />
      <iframe
        title="Haven Space map"
        src="https://www.google.com/maps?q=boarding+house+Philippines&output=embed"
        className="h-[60vh] w-full rounded-lg border-0"
      />
    </main>
  ),
});
```

Create `apps/web/src/routes/public-maps.tsx` identically with `createFileRoute('/public-maps')` and title "Public map".

- [ ] **Step 3: Haven AI page**

Create `apps/web/src/routes/haven-ai.tsx` with `createFileRoute('/haven-ai')`, a `PageHeader`, and a client component that calls the existing AI endpoint through a `useMutation` (during execution, read `client/js/views/public/haven-ai.ts` + `client/js/services/AIService.ts` to recover the exact endpoint and payload, then expose it as a typed function in `lib/api/` before wiring the form). The form is a textarea + submit that renders the assistant reply in a `Card`.

- [ ] **Step 4: Verify and commit**

```bash
bun run --cwd apps/web typecheck
git add apps/web/src/routes/legal apps/web/src/routes/maps.tsx apps/web/src/routes/public-maps.tsx apps/web/src/routes/haven-ai.tsx
git commit -m "feat(web): add legal pages, maps, and haven-ai"
```

---

# Phase 2 — Authentication (views 13–19)

**Goal:** full auth funnel, reusing `AuthProvider` from Phase 0.

**API contracts consumed:** `checkEmail`, `login`, `register`, `forgotPassword`, `verifyResetCode`, `resendResetCode`, `resetPassword` (Task 0.5).

### Task 2.1: Choose, login, signup (boarder)

**Files:**

- Create: `apps/web/src/routes/auth/choose.tsx`
- Create: `apps/web/src/routes/auth/login.tsx`
- Create: `apps/web/src/routes/auth/signup.tsx`

**Interfaces:**

- Consumes: `useAuth`.
- Produces: `/auth/choose`, `/auth/login`, `/auth/signup`.

- [ ] **Step 1: Write choose.tsx**

Create `apps/web/src/routes/auth/choose.tsx`:

```tsx
import { createFileRoute, Link } from '@tanstack/react-router';
import { PageHeader } from '../../components/ui/PageHeader';

export const Route = createFileRoute('/auth/choose')({
  component: () => (
    <main className="mx-auto max-w-md p-6">
      <PageHeader title="Join Haven Space" subtitle="I am a…" />
      <div className="flex flex-col gap-3">
        <Link to="/auth/signup" className="rounded-md bg-primary px-4 py-3 text-center text-white">
          Boarder — I'm looking for a room
        </Link>
        <Link
          to="/auth/signup/landlord"
          className="rounded-md border border-primary px-4 py-3 text-center text-primary"
        >
          Landlord — I rent out rooms
        </Link>
      </div>
    </main>
  ),
});
```

- [ ] **Step 2: Write login.tsx and signup.tsx**

Create `apps/web/src/routes/auth/login.tsx` (form fields `email`, `password`; on success redirect boarders to `/boarder`, landlords to `/landlord`, admins to `/admin`; show `ApiRequestError.message` on failure). Create `apps/web/src/routes/auth/signup.tsx` (fields `firstName`, `lastName`, `email`, `password`; posts `role: 'boarder'`; redirects to `/boarder`). Use `Field` + `TextInput` + `Button` from Phase 0. Both pages already have working logic from the foundation slice; restyle them with the primitives.

- [ ] **Step 3: Verify and commit**

```bash
bun run --cwd apps/web typecheck
git add apps/web/src/routes/auth/choose.tsx apps/web/src/routes/auth/login.tsx apps/web/src/routes/auth/signup.tsx
git commit -m "feat(web): add auth choose, login, and boarder signup"
```

### Task 2.2: Landlord signup

**Files:**

- Create: `apps/web/src/routes/auth/signup/landlord.tsx`

**Interfaces:**

- Consumes: `register` with the landlord payload (add `businessName`, `city`, `province`, `phoneNumber`, `idType`, `idNumber`, `businessDescription` to the `RegisterInput` union in `lib/types.ts`).

- [ ] **Step 1: Extend RegisterInput**

In `apps/web/src/lib/types.ts`, replace `RegisterInput` with:

```ts
export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'boarder' | 'landlord';
  businessName?: string;
  businessDescription?: string;
  city?: string;
  province?: string;
  phoneNumber?: string;
  idType?: string;
  idNumber?: string;
}
```

- [ ] **Step 2: Write the landlord signup form**

Create `apps/web/src/routes/auth/signup/landlord.tsx` with `createFileRoute('/auth/signup/landlord')`. Fields: firstName, lastName, email, password, businessName, city, province, phoneNumber, idType, idNumber. On submit call `register({ role: 'landlord', ...fields })` and redirect to `/landlord/verification`. Validate Philippine phone with the same regex the Worker uses (`/^(\+63|0)9\d{9}$/` after stripping non-digits) and show a field error when it fails.

- [ ] **Step 3: Verify and commit**

```bash
bun run --cwd apps/web typecheck
git add apps/web/src/routes/auth/signup/landlord.tsx apps/web/src/lib/types.ts
git commit -m "feat(web): add landlord signup with verification fields"
```

### Task 2.3: Password reset (forgot, reset, verify-email)

**Files:**

- Create: `apps/web/src/routes/auth/forgot-password.tsx`
- Create: `apps/web/src/routes/auth/reset-password.tsx`
- Create: `apps/web/src/routes/auth/verify-email.tsx`

**Interfaces:**

- Consumes: `forgotPassword`, `verifyResetCode`, `resendResetCode`, `resetPassword`.

- [ ] **Step 1: Write the three flows**

`forgot-password.tsx`: email field → `forgotPassword(email)` → show "check your email". `reset-password.tsx`: fields `email`, `code`, `newPassword` → `verifyResetCode` then `resetPassword` (or a single `resetPassword` call with `code`) → redirect `/auth/login`. `verify-email.tsx`: informational page with a "Resend code" button calling `resendResetCode`.

Each page uses `Field`/`TextInput`/`Button` and shows `ApiRequestError.message` on failure.

- [ ] **Step 2: Verify and commit**

```bash
bun run --cwd apps/web typecheck
git add apps/web/src/routes/auth
git commit -m "feat(web): add password reset and verify-email flows"
```

---

# Phase 3 — Boarder experience (views 20–37)

**Goal:** the 18 boarder routes, all wrapped in `Protected role="boarder"` and laid out with `RoleShell`.

**Shared nav:** `BOARDER_NAV: NavItem[] = [ {to:'/boarder', label:'Dashboard'}, {to:'/boarder/find-a-room', label:'Find a room'}, {to:'/boarder/applications', label:'Applications'}, {to:'/boarder/tenancy', label:'Tenancy'}, {to:'/boarder/announcements', label:'Announcements'}, {to:'/boarder/settings', label:'Settings'} ]` — defined once in `apps/web/src/lib/nav.ts` at the start of this phase.

### Task 3.1: Nav + boarder dashboard

**Files:**

- Create: `apps/web/src/lib/nav.ts`
- Create: `apps/web/src/routes/boarder/index.tsx`

**Interfaces:**

- Produces: `BOARDER_NAV`, `LANDLORD_NAV`, `ADMIN_NAV` (all three exported from `nav.ts` for reuse).

- [ ] **Step 1: Write nav.ts**

Create `apps/web/src/lib/nav.ts`:

```ts
import type { NavItem } from '../components/layout/Sidebar';

export const BOARDER_NAV: NavItem[] = [
  { to: '/boarder', label: 'Dashboard' },
  { to: '/boarder/find-a-room', label: 'Find a room' },
  { to: '/boarder/applications', label: 'Applications' },
  { to: '/boarder/tenancy', label: 'Tenancy' },
  { to: '/boarder/announcements', label: 'Announcements' },
  { to: '/boarder/settings', label: 'Settings' },
];

export const LANDLORD_NAV: NavItem[] = [
  { to: '/landlord', label: 'Dashboard' },
  { to: '/landlord/listings', label: 'Listings' },
  { to: '/landlord/applications', label: 'Applications' },
  { to: '/landlord/boarders', label: 'Boarders' },
  { to: '/landlord/announcements', label: 'Announcements' },
  { to: '/landlord/settings', label: 'Settings' },
];

export const ADMIN_NAV: NavItem[] = [{ to: '/admin', label: 'Overview' }];
```

- [ ] **Step 2: Write the boarder dashboard**

Create `apps/web/src/routes/boarder/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Card } from '../../components/ui/Card';
import { getAcceptedApplications, getTenancy } from '../../lib/api/boarder';
import { useAuth } from '../../lib/auth-context';
import { BOARDER_NAV } from '../../lib/nav';

export const Route = createFileRoute('/boarder/')({
  component: () => (
    <Protected role="boarder">
      <BoarderDashboard />
    </Protected>
  ),
});

function BoarderDashboard() {
  const { token } = useAuth();
  const tenancy = useQuery({
    queryKey: ['tenancy'],
    queryFn: () => getTenancy(token!),
    enabled: Boolean(token),
  });
  const accepted = useQuery({
    queryKey: ['accepted'],
    queryFn: () => getAcceptedApplications(token!),
    enabled: Boolean(token),
  });

  return (
    <RoleShell title="Boarder dashboard" nav={BOARDER_NAV}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Your tenancy</h2>
          {tenancy.data?.data ? (
            <p>Active tenancy found.</p>
          ) : (
            <p className="text-gray-ink">No active tenancy.</p>
          )}
        </Card>
        <Card>
          <h2 className="font-semibold">Accepted applications</h2>
          <p className="text-gray-ink">{accepted.data?.data.length ?? 0} accepted</p>
        </Card>
      </div>
    </RoleShell>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/nav.ts apps/web/src/routes/boarder/index.tsx
git commit -m "feat(web): add boarder nav and dashboard"
```

### Task 3.2: Boarder find-a-room (list, detail, apply)

**Files:**

- Create: `apps/web/src/routes/boarder/find-a-room.tsx`
- Create: `apps/web/src/routes/boarder/find-a-room/$id.tsx`
- Create: `apps/web/src/routes/boarder/find-a-room/$id/apply.tsx`
- Create: `apps/web/src/routes/boarder/rooms/$id.tsx`

**Interfaces:**

- Consumes: `FindARoomContent` (Phase 1), `getRoomDetail`, `getSavedStatus`, `saveListing`, `unsaveListing`, `createApplication`.

- [ ] **Step 1: Boarder find-a-room list**

Create `apps/web/src/routes/boarder/find-a-room.tsx` rendering `<Protected role="boarder"><RoleShell title="Find a room" nav={BOARDER_NAV}><FindARoomContent /></RoleShell></Protected>`.

- [ ] **Step 2: Boarder detail with save/apply**

Create `apps/web/src/routes/boarder/find-a-room/$id.tsx`: a `useQuery` on `getRoomDetail(id)` (client-only; boarder pages do not need SSR). Renders the listing plus a `SaveButton` (`useQuery` on `getSavedStatus` + `useMutation` on `saveListing`/`unsaveListing`) and a `Link to="/boarder/find-a-room/$id/apply"`.

Create `apps/web/src/routes/boarder/rooms/$id.tsx` reusing the same component for the post-booking detail (same query, no save button).

- [ ] **Step 3: Apply page**

Create `apps/web/src/routes/boarder/find-a-room/$id/apply.tsx`: a `message` textarea + room select (from `getRoomDetail`'s `rooms`) → `useMutation` calling `createApplication(token, propertyId, roomId, message)` → on success navigate to `/boarder/application-submitted`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/boarder/find-a-room.tsx apps/web/src/routes/boarder/find-a-room apps/web/src/routes/boarder/rooms
git commit -m "feat(web): add boarder find-a-room, detail, and apply flow"
```

### Task 3.3: Applications dashboard + settings + single application

**Files:**

- Create: `apps/web/src/routes/boarder/applications.tsx`
- Create: `apps/web/src/routes/boarder/applications/$id.tsx`
- Create: `apps/web/src/routes/boarder/applications/settings.tsx`
- Create: `apps/web/src/routes/boarder/application-submitted.tsx`

**Interfaces:**

- Consumes: `getApplications`, `getApplication`, `deleteApplication`, `confirmApplication`.

- [ ] **Step 1: Applications list**

Create `apps/web/src/routes/boarder/applications.tsx`: `useQuery(['applications'], getApplications)` rendered with `DataTable<ApplicationSummary>` columns `Property`, `Room`, `Status`, `Submitted`; each row links to `/boarder/applications/$id`.

- [ ] **Step 2: Single application + confirm/delete**

Create `apps/web/src/routes/boarder/applications/$id.tsx`: `useQuery(['application', id], getApplication)`; status card; if `status === 'accepted'` show a payment-method select + `confirmApplication` mutation → navigate `/boarder/confirm-booking`; a delete button calling `deleteApplication` → navigate `/boarder/applications`.

- [ ] **Step 3: Settings + submitted pages**

`applications/settings.tsx`: notification prefs (store locally in the form; the Worker has no dedicated endpoint — label the controls clearly). `application-submitted.tsx`: static confirmation with a link to `/boarder/applications`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/boarder/applications.tsx apps/web/src/routes/boarder/applications apps/web/src/routes/boarder/application-submitted.tsx
git commit -m "feat(web): add boarder applications dashboard and detail"
```

### Task 3.4: Confirm booking, tenancy, house rules

**Files:**

- Create: `apps/web/src/routes/boarder/confirm-booking.tsx`
- Create: `apps/web/src/routes/boarder/tenancy.tsx`
- Create: `apps/web/src/routes/boarder/house-rules.tsx`

**Interfaces:**

- Consumes: `getAcceptedApplications`, `getTenancy`, `leaveRequest`.

- [ ] **Step 1: Confirm booking**

`confirm-booking.tsx`: `useQuery(['accepted'], getAcceptedApplications)`; list accepted applications with a "Confirm" button that calls `confirmApplication` → navigate `/boarder/tenancy`.

- [ ] **Step 2: Tenancy**

`tenancy.tsx`: `useQuery(['tenancy'], getTenancy)`; render active tenancy card; a "Request to leave" modal (`Modal` primitive) submitting `leaveRequest` → invalidate `['tenancy']`.

- [ ] **Step 3: House rules**

`house-rules.tsx`: static content lifted from `client/views/boarder/house-rules/index.html`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/boarder/confirm-booking.tsx apps/web/src/routes/boarder/tenancy.tsx apps/web/src/routes/boarder/house-rules.tsx
git commit -m "feat(web): add confirm booking, tenancy, and house rules"
```

### Task 3.5: Announcements, settings, maps, messages/payments stubs

**Files:**

- Create: `apps/web/src/routes/boarder/announcements.tsx`
- Create: `apps/web/src/routes/boarder/settings.tsx`
- Create: `apps/web/src/routes/boarder/maps.tsx`
- Create: `apps/web/src/routes/boarder/messages.tsx`
- Create: `apps/web/src/routes/boarder/payments/index.tsx`
- Create: `apps/web/src/routes/boarder/payments/pay.tsx`

**Interfaces:**

- Consumes: `getBoarderAnnouncements`, `viewAnnouncement`, `getProfile`, `updateProfile`, `uploadAvatar`, `paymentsDeferred`, `messagesDeferred`.

- [ ] **Step 1: Announcements**

`announcements.tsx`: `useQuery(['announcements'], getBoarderAnnouncements)`; list cards; opening one fires `viewAnnouncement`.

- [ ] **Step 2: Settings**

`settings.tsx`: profile form (`getProfile`/`updateProfile`) + avatar upload (`uploadAvatar` via a file input) + change password (`changePassword`).

- [ ] **Step 3: Maps**

`boarder/maps.tsx`: reuse the map iframe from Phase 1 inside `RoleShell`.

- [ ] **Step 4: Payments/messages stubs**

`payments/index.tsx`, `payments/pay.tsx`, `messages.tsx`: render an `EmptyState` "Coming soon" (these backends are deferred; do not call `paymentsDeferred`/`messagesDeferred` — just show the static stub).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/routes/boarder
git commit -m "feat(web): add boarder announcements, settings, maps, and stubs"
```

---

# Phase 4 — Landlord experience (views 38–56)

**Goal:** the 19 landlord routes wrapped in `Protected role="landlord"` + `RoleShell` with `LANDLORD_NAV`.

**API contracts consumed:** the `lib/api/landlord.ts` surface from Task 0.5. Before this phase, complete the abbreviated `landlord.ts` bodies per the Task 0.5 "Contract verification" note.

### Task 4.1: Landlord dashboard + onboarding + verification

**Files:**

- Create: `apps/web/src/routes/landlord/index.tsx`
- Create: `apps/web/src/routes/landlord/onboarding.tsx`
- Create: `apps/web/src/routes/landlord/verification.tsx`

**Interfaces:**

- Consumes: `getDashboardStats`.

- [ ] **Step 1: Dashboard**

`landlord/index.tsx`: `useQuery(['dashboard'], getDashboardStats)`; four `Card`s for `occupancy`, `revenue`, `renewals`, `payment_alerts` inside `RoleShell`.

- [ ] **Step 2: Onboarding + verification**

`onboarding.tsx` and `verification.tsx`: static multi-step forms (document upload inputs). Wire the submit to `updateProfile`/a placeholder mutation only if a matching endpoint exists; otherwise keep as local form state with a note. Read `client/js/views/landlord/` init files during execution to recover any endpoint these pages actually call.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/landlord/index.tsx apps/web/src/routes/landlord/onboarding.tsx apps/web/src/routes/landlord/verification.tsx
git commit -m "feat(web): add landlord dashboard, onboarding, and verification"
```

### Task 4.2: Listings + properties CRUD

**Files:**

- Create: `apps/web/src/routes/landlord/listings/index.tsx`
- Create: `apps/web/src/routes/landlord/listings/create.tsx`
- Create: `apps/web/src/routes/landlord/listings/$id/edit.tsx`
- Create: `apps/web/src/routes/landlord/properties.tsx`

**Interfaces:**

- Consumes: `getProperties`, `createListing`, `updateListing`, `deleteProperty`, `uploadPropertyPhotos`.

- [ ] **Step 1: Listings list**

`listings/index.tsx`: `useQuery(['landlord-properties'], getProperties)` → `DataTable` with columns `Name`, `Address`, `Status`, and an edit link per row.

- [ ] **Step 2: Create**

`listings/create.tsx`: form (title, description, address, city, gender preference, price, amenities, rooms) → `createListing` mutation → navigate `/landlord/listings`.

- [ ] **Step 3: Edit + photos**

`listings/$id/edit.tsx`: form seeded from `getProperty` → `updateListing`; a photo dropzone calling `uploadPropertyPhotos` (multipart). `properties.tsx`: alias list page (same table, "My properties" title).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/landlord/listings apps/web/src/routes/landlord/properties.tsx
git commit -m "feat(web): add landlord listings and properties CRUD"
```

### Task 4.3: Rooms + boarders + applications

**Files:**

- Create: `apps/web/src/routes/landlord/rooms/$id/edit.tsx`
- Create: `apps/web/src/routes/landlord/boarders.tsx`
- Create: `apps/web/src/routes/landlord/applications.tsx`

**Interfaces:**

- Consumes: `getRooms`, `updateRoom`, `uploadRoomPhotos`, `getBoarders`, `addBoarder`, `updateBoarder`, `removeBoarder`, `getApplications`, `patchApplicationStatus`.

- [ ] **Step 1: Room edit**

`rooms/$id/edit.tsx`: `useQuery(['room', id])` seeded room form → `updateRoom`; photo upload via `uploadRoomPhotos`.

- [ ] **Step 2: Boarders**

`boarders.tsx`: `useQuery(['boarders'], getBoarders)` → `DataTable` with add/edit/remove (`Modal` forms calling `addBoarder`/`updateBoarder`/`removeBoarder`).

- [ ] **Step 3: Applications**

`applications.tsx`: `useQuery(['landlord-applications'], getApplications)` → `DataTable`; status actions call `patchApplicationStatus`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/landlord/rooms apps/web/src/routes/landlord/boarders.tsx apps/web/src/routes/landlord/applications.tsx
git commit -m "feat(web): add landlord rooms, boarders, and applications"
```

### Task 4.4: Announcements, activity, calendar, pricing, settings, maps, stubs

**Files:**

- Create: `apps/web/src/routes/landlord/announcements.tsx`
- Create: `apps/web/src/routes/landlord/activity.tsx`
- Create: `apps/web/src/routes/landlord/calendar.tsx`
- Create: `apps/web/src/routes/landlord/pricing.tsx`
- Create: `apps/web/src/routes/landlord/settings.tsx`
- Create: `apps/web/src/routes/landlord/maps.tsx`
- Create: `apps/web/src/routes/landlord/messages.tsx`
- Create: `apps/web/src/routes/landlord/payments/index.tsx`
- Create: `apps/web/src/routes/landlord/payments/record.tsx`

**Interfaces:**

- Consumes: `getAnnouncements`, `createAnnouncement`, `updateAnnouncement`, `deleteAnnouncement`, `updateProfile`, `uploadAvatar`.

- [ ] **Step 1: Announcements CRUD**

`announcements.tsx`: list + `Modal` create/edit/delete calling the four announcement functions.

- [ ] **Step 2: Settings**

`settings.tsx`: profile + avatar + password (same components as boarder settings).

- [ ] **Step 3: Static/calendar/pricing/activity/maps**

`calendar.tsx`, `activity.tsx`, `pricing.tsx`, `maps.tsx`: render static content lifted from the matching legacy views.

- [ ] **Step 4: Messages/payments stubs**

`messages.tsx`, `payments/index.tsx`, `payments/record.tsx`: `EmptyState` "Coming soon".

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/routes/landlord
git commit -m "feat(web): add landlord announcements, settings, and remaining pages"
```

---

# Phase 5 — Admin + cross-cutting (view 57)

**Goal:** the admin overview plus any shared cross-cutting UI (notifications, deferred stubs) not already delivered.

### Task 5.1: Admin overview

**Files:**

- Create: `apps/web/src/routes/admin/index.tsx`

**Interfaces:**

- Consumes: `getSummary`, `getUsers`, `getProperties`, `getApplications`, `getSettings`, `patchSettings`, `getLandlords`, `approveLandlord`.

- [ ] **Step 1: Admin dashboard**

`admin/index.tsx`: `Protected role="admin"` + `RoleShell` with `ADMIN_NAV`; summary `Card`s from `getSummary`; tabs rendering `DataTable`s for users (`patchUserStatus`), properties (`patchPropertyStatus`), applications, and landlords (`approveLandlord`); a settings form from `getSettings`/`patchSettings`.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/routes/admin
git commit -m "feat(web): add admin dashboard"
```

### Task 5.2: Notifications bell (cross-cutting)

**Files:**

- Create: `apps/web/src/components/layout/NotificationBell.tsx`
- Modify: `apps/web/src/components/layout/Topbar.tsx`

**Interfaces:**

- Consumes: `getNotifications`, `getUnreadCount`, `markRead`, `markAllRead`, `deleteNotification`.

- [ ] **Step 1: Bell component**

`NotificationBell.tsx`: `useQuery(['unread'], getUnreadCount)` badge in the `Topbar`; a dropdown (`Modal`) listing `getNotifications` with mark-read and delete actions.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/layout
git commit -m "feat(web): add notification bell to the topbar"
```

---

# Phase 6 — Cutover and legacy removal

**Goal:** make `apps/web` the only frontend, delete every `.html`/`.css`/`.js` view file, and wire root scripts + docs.

### Task 6.1: Root scripts and docs

**Files:**

- Modify: `package.json` (root)
- Modify: `Readme.md`

- [ ] **Step 1: Add root scripts**

In the root `package.json` `scripts`, add:

```json
"web:dev": "bun run --cwd apps/web dev",
"web:build": "bun run --cwd apps/web build",
"web:deploy": "bun run --cwd apps/web deploy",
"web:test": "bun run --cwd apps/web test",
"web:typecheck": "bun run --cwd apps/web typecheck"
```

- [ ] **Step 2: Update Readme.md**

Replace the Frontend stack row and document `apps/web` (dev on `:3000`, API on `:8000`, `API_BASE_URL` var), and record that the API Worker's `ALLOWED_ORIGINS` must include the web Worker's origin.

- [ ] **Step 3: Commit**

```bash
git add package.json Readme.md
git commit -m "docs(web): document the TanStack Start frontend"
```

### Task 6.2: Delete the legacy frontend

**Files:**

- Delete: `client/` (entire directory)
- Delete: `scripts/build.ts`
- Modify: `package.json` (remove `build`, `cf:pages:*`, `deploy` Pages references; keep `deploy` = API deploy + web deploy)

- [ ] **Step 1: Remove the old build/deploy scripts**

In root `package.json`, delete `"build"`, `"cf:pages:create"`, `"cf:pages:dev"`, `"cf:pages:deploy"`; change `"deploy"` to `"bun run cf:api:deploy && bun run web:deploy"`.

- [ ] **Step 2: Delete legacy files**

```bash
git rm -r client scripts/build.ts
```

- [ ] **Step 3: Verify nothing references the removed paths**

```bash
rg -n "client/|scripts/build|cf:pages" --glob '!node_modules' --glob '!apps/web/node_modules' || echo "no references"
```

Expected: only historical references in `docs/` (leave those). Fix any live reference.

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(web): remove legacy vanilla-JS frontend and Pages deploy"
```

### Task 6.3: Final smoke pass

- [ ] **Step 1: Full local stack**

Run `bun run cf:api:dev` and `bun run web:dev`; walk one flow per role (public browse → signup → boarder save/apply → landlord list → admin summary) and confirm each route renders and each mutation hits the API.

- [ ] **Step 2: Full checks**

```bash
bun run web:test
bun run web:typecheck
bun run web:build
bun run cf:api:test
bun run cf:api:typecheck
```

Expected: all green.

- [ ] **Step 3: Commit any fixes**

```bash
git commit -am "fix(web): final smoke-pass corrections"
```

---

## Self-Review

**1. Spec coverage:** every one of the 57 legacy views appears in the Master View → Route Map and is assigned to a phase task: 12 public (Phase 1), 7 auth (Phase 2), 18 boarder (Phase 3), 19 landlord (Phase 4), 1 admin + notifications (Phase 5), and deletion of `.html`/`.css`/`.js` (Phase 6). The "no .js/.css/.html" requirement is enforced by Global Constraints, the single `app.css` Tailwind entry, and Task 6.2's deletion.

**2. Placeholder scan:** abbreviated `landlord.ts`/`admin.ts`/`notifications.ts` bodies are flagged with an explicit **Contract verification** step instructing the executor to read the named route/repository files before Phase 4 — the signatures are fixed, so no later task depends on an undefined name. The `LinkFromSimilar` `require()` and legal-page copy are marked as "fix/read during execution" with concrete instructions, not silent omissions.

**3. Type consistency:** later phases import only from `lib/api/*` (signatures fixed in Task 0.5), `lib/types.ts` (extended in Task 0.5/Task 2.2), `components/ui/*` (Task 0.2), `components/layout/*` (Task 0.4), `components/auth/Protected` (Task 0.3), and `lib/nav.ts` (Task 3.1). `useAuth()` returns exactly `{ user, token, isAuthenticated, login, register, logout, refreshUser }`; `RoleShell({ title, nav, children })`, `Protected({ role, children })`, and `DataTable({ rows, columns, keyFor })` are used consistently.
