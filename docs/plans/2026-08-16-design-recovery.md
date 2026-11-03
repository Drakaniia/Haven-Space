# Design Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the original Haven Space visual design, images, icons, and per-role flows (public, auth, boarder, landlord, admin, maps) in the TanStack Start frontend (`apps/web`), reusing a shared component library so every page has one consistent design language.

**Architecture:** The legacy `client/` (restored from `e751e40^` for reference) contains the canonical design: CSS variables in `client/css/global.css`, an SVG icon set in `client/assets/svg/`, and per-role layouts. Rather than copy old CSS wholesale, we port the design _language_ into the existing Tailwind `@theme`, copy every asset into `apps/web/public/assets/` (so `/assets/...` URLs resolve exactly like the legacy `resolveSvgBasePath()`), and rebuild each page as React components that reuse a shared UI kit (`Button`, `Card`, `StatCard`, `Sidebar`, `Topbar`, `PublicNavbar`, `AuthSplitLayout`, `StatusBadge`, `Icon`). Each role's shell (boarder/landlord/admin) renders through `RoleShell` with the icon-grouped `Sidebar`; public pages get `PublicNavbar` + `Footer`; auth pages get `AuthSplitLayout`.

**Tech Stack:** React 19, TanStack Router/Start, Tailwind CSS v4 (`@theme` tokens), Plus Jakarta Sans (Google Fonts), existing `apps/web` structure. No new dependencies.

**Spec:** The source of truth for the design is the legacy frontend restored at `client/` (from commit `e751e40^`). Every task names the exact legacy file(s) to copy the design from and the exact assets to wire in.

## Global Constraints

- No `.html`/`.css`/`.js` frontend files may be added outside `apps/web` (Phase 6 constraint). The restored `client/` is a **reference only** — it stays untracked in the working tree and must NOT be re-committed or served.
- All styling goes through Tailwind utility classes or the `@theme` tokens in `apps/web/src/styles/app.css`. No new standalone `.css` view files.
- Assets are served from `apps/web/public/assets/...`; code references them as `/assets/...` (Vite serves `public/` at the site root).
- Font: Plus Jakarta Sans, weights 400–800, loaded via Google Fonts `<link>` in `apps/web/src/routes/__root.tsx` `head`.
- Shared UI kit lives in `apps/web/src/components/ui/` and `apps/web/src/components/layout/`; pages import from there — no page-local copies of shared chrome.
- Existing API contracts (`lib/api/*`, `lib/types.ts`) are unchanged; this is a presentational recovery. All 21 web tests + 148 API tests must stay green.
- Each task ends with: `bun run web:typecheck`, `bun run web:build`, `bun run web:test`, plus an SSR curl smoke of the touched routes, then a commit.

---

### Task 1: Assets + design tokens + font foundation

**Files:**

- Create: `apps/web/public/assets/` (copied from `client/assets/`, 131 files, ~22MB)
- Modify: `apps/web/src/styles/app.css`
- Modify: `apps/web/src/routes/__root.tsx`

**Interfaces:**

- Produces: `/assets/svg/*.svg`, `/assets/images/*`, `/assets/teams/*` resolvable from any page; Tailwind tokens `--color-primary`, `--color-primary-dark`, `--color-primary-light`, `--color-cream`, `--color-mint`, `--color-ink`, `--color-gray-ink`, plus new `--font-sans` and shadow/radius utilities.

- [ ] **Step 1: Copy the asset tree**

```bash
mkdir -p apps/web/public
cp -r client/assets apps/web/public/assets
```

Verify: `ls apps/web/public/assets/svg/dashboard.svg` exists and `find apps/web/public/assets -type f | wc -l` = 131.

- [ ] **Step 2: Load Plus Jakarta Sans in the root head**

In `apps/web/src/routes/__root.tsx`, inside the `head: () => ({ links: [...] })` array, add the Google Fonts stylesheet **before** the `appCss` link:

```tsx
links: [
  {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
  },
  { rel: 'stylesheet', href: appCss },
],
```

- [ ] **Step 3: Extend the Tailwind theme**

Replace the current `apps/web/src/styles/app.css` with:

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
  --color-muted: #9ca3af;
  --color-success: #388e3c;
  --color-warning: #ff9800;
  --color-error: #d32f2f;
  --color-info: #1976d2;
  --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
    Arial, sans-serif;
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-pop: 0 10px 15px rgba(0, 0, 0, 0.1);
}

body {
  font-family: var(--font-sans);
  background-color: var(--color-cream);
  color: var(--color-ink);
}
```

- [ ] **Step 4: Verify**

```bash
bun run web:typecheck && bun run web:build && bun run web:test
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/assets/svg/dashboard.svg
```

Expected: typecheck clean, build succeeds, 21 tests pass, asset URL returns 200.

- [ ] **Step 5: Commit**

```bash
git add apps/web/public apps/web/src/styles/app.css apps/web/src/routes/__root.tsx
git commit -m "feat(web): add legacy assets, design tokens, and Plus Jakarta Sans"
```

---

### Task 2: Icon component + Button variants + StatusBadge

**Files:**

- Create: `apps/web/src/components/ui/Icon.tsx`
- Modify: `apps/web/src/components/ui/Button.tsx`
- Create: `apps/web/src/components/ui/StatusBadge.tsx`

**Interfaces:**

- Consumes: asset files `/assets/svg/*.svg` (Task 1).
- Produces: `Icon({ name, size?, className? })`, `Button({ variant?: 'primary' | 'outline' | 'ghost' | 'danger', ... })`, `StatusBadge({ status })` — used by every shell and page in later tasks.

- [ ] **Step 1: Icon component**

`Icon` maps a logical name to an SVG file in `/assets/svg/`, mirroring the legacy `SIDEBAR_ICON_MAP` in `client/js/components/sidebar.ts`:

```tsx
// apps/web/src/components/ui/Icon.tsx
const ICON_FILES: Record<string, string> = {
  home: 'dashboard.svg',
  chat: 'messages.svg',
  announcement: 'announcement.svg',
  payment: 'payment.svg',
  search: 'search.svg',
  settings: 'settings.svg',
  cog: 'settings.svg',
  calendar: 'calendar.svg',
  map: 'maps.svg',
  analytics: 'analytics.svg',
  chartBar: 'analytics.svg',
  list: 'property.svg',
  application: 'applications.svg',
  clipboardList: 'applications.svg',
  document: 'document.svg',
  book: 'handbook.svg',
  users: 'users.svg',
  shieldCheck: 'verified.svg',
  buildingOffice: 'property.svg',
  flag: 'report.svg',
  chevronDown: 'chevron-down.svg',
  logout: 'logout.svg',
  user: 'user.svg',
  arrowRight: 'chevron-right.svg',
  view: 'viewicon.svg',
  google: 'google-icon-logo.svg',
};

export function Icon({
  name,
  size = 20,
  className = '',
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const file = ICON_FILES[name];
  if (!file) return null;
  return (
    <img
      src={`/assets/svg/${file}`}
      alt=""
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    />
  );
}
```

- [ ] **Step 2: Button variants**

Replace `apps/web/src/components/ui/Button.tsx` with:

```tsx
import type { ButtonHTMLAttributes } from 'react';

const VARIANTS: Record<string, string> = {
  primary: 'bg-primary text-white hover:bg-primary-dark',
  outline: 'border-2 border-primary bg-white text-primary hover:bg-mint',
  ghost: 'bg-transparent text-primary hover:bg-mint',
  danger: 'bg-error text-white hover:brightness-90',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
}) {
  return (
    <button
      className={`rounded-full px-4 py-2 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
```

- [ ] **Step 3: StatusBadge**

```tsx
// apps/web/src/components/ui/StatusBadge.tsx
const STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  verified: 'bg-green-100 text-green-800',
  published: 'bg-green-100 text-green-800',
  approved: 'bg-green-100 text-green-800',
  accepted: 'bg-green-100 text-green-800',
  confirmed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  pending_review: 'bg-yellow-100 text-yellow-800',
  rejected: 'bg-red-100 text-red-700',
  banned: 'bg-red-100 text-red-700',
  flagged: 'bg-red-100 text-red-700',
  suspended: 'bg-orange-100 text-orange-700',
};

export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}
    >
      {status.replaceAll('_', ' ')}
    </span>
  );
}
```

- [ ] **Step 4: Verify + commit**

```bash
bun run web:typecheck && bun run web:build && bun run web:test
```

Then swap the ad-hoc badge in `apps/web/src/routes/landlord/applications.tsx` to use `StatusBadge` (delete the local color map) as a smoke check that the shared component works.

Commit: `git add apps/web/src/components/ui && git commit -m "feat(web): add Icon, Button variants, and StatusBadge"`

---

### Task 3: PublicNavbar + Footer (public chrome)

**Files:**

- Create: `apps/web/src/components/layout/PublicNavbar.tsx`
- Create: `apps/web/src/components/layout/Footer.tsx`

**Interfaces:**

- Consumes: `useAuth()` (`{ user, isAuthenticated, logout }`), `Icon`, `/assets/images/sample.png` (avatar), `/assets/images/Haven_Space_Logo.png` (logo).
- Produces: `<PublicNavbar />` and `<Footer />`, mounted by every public route in Task 5.

**Design reference:** `client/views/public/index.html` (navbar markup, lines ~30–90) and `client/css/components/navbar.css` (`.navbar`, `.nav-logo`, `.nav-links`, `.btn-login`, `.btn-join`).

- [ ] **Step 1: PublicNavbar**

Sticky top bar, white background, thin bottom border. Left: logo image + "Haven Space" wordmark. Center: links — Home (`/`), Our Story (`/our-story`), Our Team (`/teams`), For Landlords (`/for-landlords`), Haven AI (`/haven-ai`). Right: if logged out, `Log in` (ghost link → `/auth/login`) and `Join now` (primary → `/auth/choose`); if logged in, a user chip (avatar `sample.png` + first name) with a dropdown (Profile → role home, Settings → role settings, Log out).

```tsx
// apps/web/src/components/layout/PublicNavbar.tsx
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { Icon } from '../ui/Icon';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/our-story', label: 'Our Story' },
  { to: '/teams', label: 'Our Team' },
  { to: '/for-landlords', label: 'For Landlords' },
  { to: '/haven-ai', label: 'Haven AI' },
];

export function PublicNavbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const homeFor = (role: string) =>
    role === 'admin' ? '/admin' : role === 'landlord' ? '/landlord' : '/boarder';

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/assets/images/Haven_Space_Logo.png"
            alt="Haven Space"
            className="h-9 w-9 object-contain"
          />
          <span className="text-lg font-bold text-primary">Haven Space</span>
        </Link>
        <ul className="hidden items-center gap-6 md:flex">
          {LINKS.map(link => (
            <li key={link.to}>
              <Link
                to={link.to}
                className="text-sm font-medium text-gray-700 hover:text-primary"
                activeProps={{ className: 'text-primary font-semibold' }}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(v => !v)}
                className="flex items-center gap-2 rounded-full border border-gray-200 py-1 pl-1 pr-3 hover:bg-mint"
              >
                <img
                  src="/assets/images/sample.png"
                  alt=""
                  className="h-7 w-7 rounded-full object-cover"
                />
                <span className="text-sm font-medium">{user.first_name}</span>
                <Icon name="chevronDown" size={14} />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-pop">
                  <Link to={homeFor(user.role)} className="block px-4 py-2 text-sm hover:bg-mint">
                    Dashboard
                  </Link>
                  <Link
                    to={user.role === 'landlord' ? '/landlord/settings' : '/boarder/settings'}
                    className="block px-4 py-2 text-sm hover:bg-mint"
                  >
                    Settings
                  </Link>
                  <button
                    type="button"
                    className="block w-full px-4 py-2 text-left text-sm text-error hover:bg-mint"
                    onClick={async () => {
                      await logout();
                      setMenuOpen(false);
                      void navigate({ to: '/auth/login' });
                    }}
                  >
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <Link
                to="/auth/login"
                className="text-sm font-medium text-gray-700 hover:text-primary"
              >
                Log in
              </Link>
              <Link
                to="/auth/choose"
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
              >
                Join now
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Footer**

Simple footer matching the old site: cream background, logo, three link columns (Company: Our Story/Our Team/For Landlords; Legal: Privacy Policy/Terms of Service/User Agreement; Resources: Find a Room/Maps/Haven AI), Instagram icon (`/assets/images/instagram.png`), and a copyright line.

```tsx
// apps/web/src/components/layout/Footer.tsx
import { Link } from '@tanstack/react-router';

const COLUMNS: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: 'Company',
    links: [
      { to: '/our-story', label: 'Our Story' },
      { to: '/teams', label: 'Our Team' },
      { to: '/for-landlords', label: 'For Landlords' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/legal/privacy-policy', label: 'Privacy Policy' },
      { to: '/legal/terms-of-service', label: 'Terms of Service' },
      { to: '/legal/user-agreement', label: 'User Agreement' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { to: '/find-a-room', label: 'Find a Room' },
      { to: '/maps', label: 'Maps' },
      { to: '/haven-ai', label: 'Haven AI' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        <div>
          <img
            src="/assets/images/Haven_Space_Logo.png"
            alt="Haven Space"
            className="h-10 w-10 object-contain"
          />
          <p className="mt-3 text-sm text-gray-ink">
            Affordable boarding houses and rooms across the Philippines.
          </p>
        </div>
        {COLUMNS.map(column => (
          <div key={column.title}>
            <p className="mb-3 text-sm font-semibold">{column.title}</p>
            <ul className="space-y-2">
              {column.links.map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-gray-ink hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-100 py-4 text-center text-sm text-gray-ink">
        © {new Date().getFullYear()} Haven Space. All rights reserved.
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Verify + commit**

```bash
bun run web:typecheck && bun run web:build && bun run web:test
```

Commit: `git add apps/web/src/components/layout/PublicNavbar.tsx apps/web/src/components/layout/Footer.tsx && git commit -m "feat(web): add public navbar and footer"`

---

### Task 4: AuthSplitLayout (auth chrome)

**Files:**

- Create: `apps/web/src/components/auth/AuthSplitLayout.tsx` (replaces `AuthLayout.tsx`)
- Delete: `apps/web/src/components/auth/AuthLayout.tsx` (after all auth pages switch to the new component in Task 8)

**Interfaces:**

- Consumes: `/assets/images/public/login_right.png`, `/assets/images/public/signup_lower_left.png`, `/assets/images/public/signup_lower_right.png`, `/assets/images/Haven_Space_Logo.png`, `Icon` (google).
- Produces: `<AuthSplitLayout title subtitle backTo?>{children}</AuthSplitLayout>` — left image panel + right form, matching `client/views/public/auth/login.html` + `client/css/views/public/auth.css` (`.auth-split-container`, `.auth-split-left`, `.auth-split-right`, `.auth-split-title`, `.auth-split-subtitle`, `.auth-logo`, `.auth-divider`).

- [ ] **Step 1: The split layout**

```tsx
// apps/web/src/components/auth/AuthSplitLayout.tsx
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Icon } from '../ui/Icon';

export function AuthSplitLayout({
  title,
  subtitle,
  image = '/assets/images/public/login_right.png',
  children,
}: {
  title: string;
  subtitle?: string;
  image?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left image panel */}
      <div className="relative hidden w-1/2 overflow-hidden bg-primary lg:block">
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/80 to-primary/20" />
        <div className="relative z-10 flex h-full flex-col justify-end p-10 text-white">
          <h2 className="text-3xl font-bold leading-tight">
            Find your haven,
            <br />
            right next door.
          </h2>
          <p className="mt-3 max-w-md text-white/90">
            Verified boarding houses near you, managed by trusted landlords.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex w-full items-center justify-center bg-cream px-4 py-10 lg:w-1/2">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2">
            <img
              src="/assets/images/Haven_Space_Logo.png"
              alt="Haven Space"
              className="h-9 w-9 object-contain"
            />
            <span className="text-lg font-bold text-primary">Haven Space</span>
          </Link>
          <h1 className="text-2xl font-bold text-ink">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-gray-ink">{subtitle}</p> : null}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Google button + divider (shared within auth pages)**

Add to `apps/web/src/components/auth/AuthSplitLayout.tsx` two exports used by login/signup:

```tsx
export function GoogleButton({
  onClick,
  label = 'Continue with Google',
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-mint"
    >
      <Icon name="google" size={18} />
      {label}
    </button>
  );
}

export function AuthDivider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-gray-ink">
      <span className="h-px flex-1 bg-gray-200" />
      or
      <span className="h-px flex-1 bg-gray-200" />
    </div>
  );
}
```

- [ ] **Step 3: Verify + commit**

```bash
bun run web:typecheck && bun run web:build && bun run web:test
```

Commit: `git add apps/web/src/components/auth/AuthSplitLayout.tsx && git commit -m "feat(web): add auth split layout"`

---

### Task 5: Public page shells — wire navbar/footer into public routes

**Files:**

- Modify: `apps/web/src/routes/__root.tsx` (mount `PublicNavbar` + `Footer` around a public `<Outlet />`, and the existing role shells keep their own chrome)

**Design decision:** Public routes and role routes must not double-render chrome. Approach: `__root.tsx` renders `<Outlet />` only (unchanged). Instead, the **public** route group gets a layout.

- [ ] **Step 1: PublicLayout component**

```tsx
// apps/web/src/components/layout/PublicLayout.tsx
import type { ReactNode } from 'react';
import { Footer } from './Footer';
import { PublicNavbar } from './PublicNavbar';

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Wrap the public routes**

In `apps/web/src/routes/index.tsx`, `find-a-room/index.tsx`, `for-landlords.tsx`, `our-story.tsx`, `teams.tsx`, `maps.tsx`, `public-maps.tsx`, `haven-ai.tsx`, and each `legal/*.tsx` route component, wrap the page body with `<PublicLayout>`. Example for `for-landlords.tsx`:

```tsx
export const Route = createFileRoute('/for-landlords')({
  component: () => <PublicLayout>{/* existing page content */}</PublicLayout>,
});
```

Leave the auth pages (`/auth/*`) and role pages (`/boarder`, `/landlord`, `/admin`) alone — they get their own chrome in Tasks 8 and 9.

- [ ] **Step 3: Verify + commit**

```bash
bun run web:typecheck && bun run web:build
# smoke: navbar + footer appear on a public page
(bun run web:dev > /tmp/web-des.log 2>&1 &) ; sleep 8
curl -s http://localhost:3000/ | grep -oE 'Join now|Haven Space|Our Story' | sort -u
```

Expected output includes `Join now`, `Haven Space`, `Our Story`.

Commit: `git add apps/web/src/components/layout/PublicLayout.tsx apps/web/src/routes && git commit -m "feat(web): wrap public pages in navbar and footer"`

---

### Task 6: Homepage + find-a-room + room detail (public content flow)

**Files:**

- Modify: `apps/web/src/routes/index.tsx`
- Modify: `apps/web/src/routes/find-a-room/index.tsx`
- Modify: `apps/web/src/components/rooms/Hero.tsx`
- Modify: `apps/web/src/components/rooms/FindARoomContent.tsx`
- Modify: `apps/web/src/components/rooms/RoomCard.tsx`
- Modify: `apps/web/src/components/rooms/RoomDetailView.tsx`

**Design reference:** `client/views/public/index.html` (hero, app preview, logo cloud, features, testimonials), `client/css/views/public/public.css` (`.hero`, `.hero-title` 4rem/800, `.hero-background` radial gradients, `.btn-landlords` outline pill, `.btn-download` solid pill), `client/css/components/logo-cloud.css` (marquee).

- [ ] **Step 1: Homepage hero — restore the real hero**

Replace `apps/web/src/components/rooms/Hero.tsx` (currently a plain green band) with the old hero: radial-gradient background, "NEW · Introducing Haven AI" pill, 4rem/800 title "Find your haven, right next door.", subtitle, and two pill buttons (View Map outline → `/public-maps`, Find a Room solid → `/find-a-room`). Then below the hero on `index.tsx`, add the **app preview image** (`/assets/images/public/main.png`) with a negative-margin overlap, the **logo cloud** marquee (`/assets/images/public/logo-cloud/*.png`, 7 logos, duplicated for a seamless loop), a **features grid** (icons `seamless_discovery`, `trusted_connection`, `community_first`, `isntant_notification`, `payment_tracking`, `secure_platform`, `verified_boarder` from `/assets/images/icons/`), and a **testimonials** row (photos `public/jasmine.jpg`, `public/carlos.jpg`, `public/maria.jpg` with names Jasmiene, Carlos, Maria). Keep the existing `loadLocations` popular-locations section but style its cards with the `Card` component + mint accents.

- [ ] **Step 2: Find-a-room page — restore filters + list styling**

Keep the existing server-function data flow (`loadRooms`) and `PropertySearchFilters` logic; restyle the page with the old search aesthetic: a compact hero band ("Find your next room" + search hint), filter inputs on a white `Card`, and the results grid. Use the `Icon` `search` asset as the search-button icon.

- [ ] **Step 3: RoomCard — add imagery**

`RoomCard.tsx` already links to `/rooms/$id`; add a photo strip at the top using the room's first photo (field `photo_url` or `photos[0]`, whichever the API returns — check `lib/types.ts` `RoomListing`), falling back to `/assets/images/placeholder-room.svg` when absent. Show price in `₱` bold, title, location with a `map` icon, and the `StatusBadge` for availability (available → green, else gray).

- [ ] **Step 4: RoomDetailView — amenity icons + gallery**

`RoomDetailView.tsx` (shared by public + boarder detail): render the first photo large (fallback `placeholder-room.svg`), the house rules / amenities list with the legacy SVG icons — `/assets/svg/Kitchen.svg`, `/assets/svg/Toilet.svg`, `/assets/svg/Laundry.svg`, `/assets/svg/LocationPin.svg`, `/assets/svg/aircon.svg`, `/assets/svg/cctv.svg`, `/assets/svg/parking.svg`, `/assets/svg/furnished.svg`, `/assets/svg/wfifi.svg` — beside each matching amenity name (map amenity string → icon filename in a local record). Keep the existing "Similar rooms" grid.

- [ ] **Step 5: Verify + commit**

```bash
bun run web:typecheck && bun run web:build && bun run web:test
# SSR smoke — images present in HTML
(bun run web:dev > /tmp/web-des2.log 2>&1 &) ; sleep 8
curl -s http://localhost:3000/ | grep -oE '/assets/images/(public/main|logo-cloud/AgriTrack)\.png' | sort -u
```

Expected: both asset URLs appear in the server HTML.

Commit: `git add apps/web/src && git commit -m "feat(web): restore homepage, find-a-room, and room detail design"`

---

### Task 7: Marketing + legal + maps + haven-ai pages

**Files:**

- Modify: `apps/web/src/routes/for-landlords.tsx`, `our-story.tsx`, `teams.tsx`, `maps.tsx`, `public-maps.tsx`, `haven-ai.tsx`, `legal/*.tsx`

**Design reference:** the matching `client/views/public/*.html` files and `client/css/views/public/public.css` (feature cards, stats band, timeline, team grid, map hero).

- [ ] **Step 1: For Landlords**

Port the legacy sections: hero ("List your space, grow your income" + `btn-download`), the three-feature grid (icons `analytics_dashboard`, `payment_tracking`, `isntant_notification`), the landlord-interview split section (image `/assets/images/landlord_interview.jpg`), and a stats band (rooms listed, landlords, cities) — numbers can stay static text from the legacy HTML.

- [ ] **Step 2: Our Story + Teams**

`our-story.tsx`: hero + story timeline with `/assets/images/public/story_hero.png`, `public/beginnings.png`, `public/carlos.jpg`, `public/maria.jpg`, `public/jasmine.jpg`. `teams.tsx`: team grid from `/assets/teams/` (`abecia.png`, `digal.png`, `palmares.png`, `ybanez.jpeg`) with the names/roles in the legacy HTML.

- [ ] **Step 3: Maps + public-maps**

Keep the existing iframe approach (Google Maps embed) but wrap with the new public chrome; add a page header ("Explore the map") and a hint card. `maps.tsx` keeps its full-height iframe; `public-maps.tsx` matches `client/views/public/public-maps.html` (hero + embedded map + "View map" CTA).

- [ ] **Step 4: Haven AI + legal pages**

`haven-ai.tsx`: keep the existing chat client + `lib/api/ai.ts` degradation, but restyle the shell (message bubbles, input bar) with the brand palette. Legal pages: keep the prose, restyle headings with `PageHeader` and the ink/primary colors.

- [ ] **Step 5: Verify + commit**

```bash
bun run web:typecheck && bun run web:build && bun run web:test
```

Smoke: `curl -s http://localhost:3000/for-landlords | grep -oE 'landlord_interview\.jpg'` returns the asset.

Commit: `git add apps/web/src/routes && git commit -m "feat(web): restore marketing, maps, haven-ai, and legal page design"`

---

### Task 8: Auth pages — apply AuthSplitLayout

**Files:**

- Modify: `apps/web/src/routes/auth/choose.tsx`, `login.tsx`, `signup/index.tsx`, `signup/landlord.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `verify-email.tsx`
- Delete: `apps/web/src/components/auth/AuthLayout.tsx` (after all pages migrated)

**Design reference:** `client/views/public/auth/*.html` and `client/css/views/public/auth.css`.

- [ ] **Step 1: Choose page**

Wrap in `AuthSplitLayout` with title "Join Haven Space", subtitle "Choose how you want to get started", image `/assets/images/public/signup_lower_left.png`. Two large choice cards side by side (Boarder / Landlord) with `Icon` (`search` / `buildingOffice`) and descriptive copy, styled like the legacy `choose.css` cards (rounded-xl border, hover ring-primary).

- [ ] **Step 2: Login**

Wrap in `AuthSplitLayout` ("Welcome back" / "Log in to your Haven Space account"). Keep the full existing logic (email blur check → Google-account notice, `ApiRequestError` inline errors, role redirect). Layout: email + password `Field`/`TextInput` (password with an eye toggle using `Icon view`), `GoogleButton` + `AuthDivider` above the form, "Forgot password?" link → `/auth/forgot-password`, submit `Button variant="primary"` full width.

- [ ] **Step 3: Signup (boarder) + signup/landlord**

Wrap both in `AuthSplitLayout` (image `public/signup_lower_right.png` for boarder, `public/signup_lower_left.png` for landlord). Keep all existing fields + client-side validation (`lib/validation.ts`). Full-width primary submit.

- [ ] **Step 4: Forgot / reset / verify**

`forgot-password.tsx`: `AuthSplitLayout` "Reset your password" — the existing two-step email → code flow, styled. `reset-password.tsx`: same shell, reading `email` + `request_id` from search params. `verify-email.tsx`: `AuthSplitLayout` "Check your email" with a `Icon envelope` illustration and the resend button.

- [ ] **Step 5: Delete the old AuthLayout + verify + commit**

```bash
rm apps/web/src/components/auth/AuthLayout.tsx
grep -rn "AuthLayout" apps/web/src || echo "no references"
bun run web:typecheck && bun run web:build && bun run web:test
```

Smoke: `curl -s http://localhost:3000/auth/login | grep -oE 'login_right\.png'`.

Commit: `git add apps/web/src && git commit -m "feat(web): restore auth pages with split layout"`

---

### Task 9: Role shells — Sidebar (icons + groups), Topbar, RoleShell

**Files:**

- Modify: `apps/web/src/lib/nav.ts` (add `icon` + `group` to `NavItem`)
- Modify: `apps/web/src/components/layout/Sidebar.tsx`
- Modify: `apps/web/src/components/layout/Topbar.tsx`
- Modify: `apps/web/src/components/layout/RoleShell.tsx`

**Design reference:** `client/js/components/sidebar.ts` (NAV_CONFIG groups + SIDEBAR_ICON_MAP), `client/css/components/sidebar.css` (fixed 280px, collapsible to 80px, group labels, active mint background), `client/css/components/navbar.css` (dashboard navbar with greeting + search + bell).

- [ ] **Step 1: Extend nav config**

```ts
// apps/web/src/lib/nav.ts
export interface NavItem {
  to: string;
  label: string;
  icon: string; // logical name for Icon
  group: string; // 'Main' | 'Communication' | 'Payments' | 'Discovery' | 'Info' | 'Account' | 'Management' | 'Operations'
}
```

Set the groups to match the legacy sidebar exactly:

- `BOARDER_NAV`: Dashboard (home/Main), Tenancy (document/Main), Find a Room (search/Discovery), Applications (application/Main), Announcements (announcement/Communication), House Rules (book/Info), Settings (settings/Account). Payments (payment/Payments) and Messages (chat/Communication) keep their existing routes and get icons too.
- `LANDLORD_NAV`: Dashboard (home/Main), Listings (list/Main), Properties (buildingOffice/Main), Applications (application/Main), Boarders (users/Main), Messages (chat/Communication), Payments (payment/Payments), Announcements (announcement/Communication), Calendar (calendar/Management), Activity (analytics/Management), Pricing (flag/Management), Maps (map/Main), Settings (settings/Account).
- `ADMIN_NAV`: Overview (home/Operations), Landlord verification (shieldCheck/Operations), Users (users/Operations), Properties (buildingOffice/Operations), Applications (application/Operations), Settings (cog/Operations). Note: admin routes use `#tab` anchors in the old app; keep the single `/admin` route and render the tab list in `admin/index.tsx` as before (Task 10).

- [ ] **Step 2: Sidebar**

Rewrite `Sidebar.tsx` to the legacy layout: fixed `w-72` (280px) column, white bg, right border; header with `Haven_Space_Logo.png` + "Haven Space" wordmark; scrollable nav with group labels (uppercase, 11px, muted) and icon+label `Link`s; active state = `bg-mint text-primary font-semibold`; hover = `bg-mint/50`. Add a `collapsed` state toggle (w-20, labels hidden) driven by a button in the header using `Icon chevronDown` — optional but cheap; a `useState` in `Sidebar` is fine.

```tsx
// apps/web/src/components/layout/Sidebar.tsx
import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Icon } from '../ui/Icon';
import type { NavItem } from '../../lib/nav';

export function Sidebar({ nav }: { nav: NavItem[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const groups = useMemo(() => {
    const map = new Map<string, NavItem[]>();
    for (const item of nav) {
      const key = item.group ?? 'Main';
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()];
  }, [nav]);

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-gray-200 bg-white transition-all ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
        {!collapsed ? (
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/assets/images/Haven_Space_Logo.png"
              alt=""
              className="h-8 w-8 object-contain"
            />
            <span className="font-bold text-primary">Haven Space</span>
          </Link>
        ) : (
          <img
            src="/assets/images/Haven_Space_Logo.png"
            alt=""
            className="h-8 w-8 object-contain"
          />
        )}
        <button
          type="button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed(v => !v)}
          className="rounded p-1 hover:bg-mint"
        >
          <Icon
            name="chevronDown"
            size={16}
            className={`transition-transform ${collapsed ? '' : 'rotate-180'}`}
          />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        {groups.map(([group, items]) => (
          <div key={group} className="mb-6 px-3">
            {!collapsed ? (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
                {group}
              </p>
            ) : null}
            <div className="space-y-1">
              {items.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-mint/50"
                  activeProps={{ className: 'bg-mint font-semibold text-primary' }}
                >
                  <Icon name={item.icon} size={20} className="shrink-0" />
                  {!collapsed ? <span>{item.label}</span> : null}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 3: Topbar**

Rewrite `Topbar.tsx` to the legacy dashboard navbar: left = page title (bold) + optional greeting subtitle; right = `NotificationBell` (already exists), user avatar (`sample.png`) + name, logout button with `Icon logout`. Keep the existing `useAuth`/`logout` logic.

- [ ] **Step 4: RoleShell**

Keep `RoleShell({ title, nav, children })` signature (all 38 role pages already use it) — it now automatically picks up the new Sidebar/Topbar since they're imported internally.

- [ ] **Step 5: Verify + commit**

```bash
bun run web:typecheck && bun run web:build && bun run web:test
(bun run web:dev > /tmp/web-des3.log 2>&1 &) ; sleep 8
curl -s http://localhost:3000/boarder | grep -oE '/assets/svg/dashboard\.svg|Haven_Space_Logo\.png' | sort -u
```

Expected: both assets appear (sidebar renders server-side for authenticated shells — note `Protected` renders null server-side, so verify the components compile and appear when a token exists; the grep may need a logged-in session, in which case rely on `web:build` + a dev-server render of the admin page with a stubbed token in tests. If Protected blocks SSR, add one happy-path test rendering `RoleShell` with a mock `useAuth` via `apps/web/test/components.test.tsx`.)

Commit: `git add apps/web/src && git commit -m "feat(web): restore role shells with icon sidebar and topbar"`

---

### Task 10: Boarder pages restyle

**Files:** all 18 files under `apps/web/src/routes/boarder/` (already built in Phase 3) — **presentational restyle only**, keep every API call and data shape.

**Design reference:** `client/views/boarder/*.html`, `client/css/views/boarder/boarder.css` (`.boarder-dashboard`, `.boarder-main`, `.boarder-topbar` greeting, `.boarder-btn` variants, stat cards, `.boarder-card`).

- [ ] **Step 1: Dashboard**

`boarder/index.tsx`: restore the greeting block ("Welcome home, {first_name}" + "Manage your tenancy and utilities") above the stat cards; add a "Pay rent" primary action linking to `/boarder/payments/pay`; stat cards become `Card`s with `Icon` headers (tenancy → `document`, applications → `application`, announcements → `announcement`, payments → `payment`). Keep the tenancy + accepted-applications queries.

- [ ] **Step 2: Find-a-room + detail + apply**

`find-a-room/index.tsx`, `find-a-room/$id/index.tsx`, `find-a-room/$id/apply.tsx`, `rooms/$id.tsx`: reuse the Task 6 restyled `RoomCard`/`RoomDetailView`/`SaveButton` (they're already shared). The apply page keeps its `room_id` + `landlord_id` + message form; style the confirm step with a success `Card` + `Icon shieldCheck`.

- [ ] **Step 3: Applications + tenancy + confirm-booking + house-rules**

`applications/*`, `application-submitted.tsx`, `confirm-booking.tsx`, `tenancy.tsx`, `house-rules.tsx`: restyle tables with the mint-header `DataTable` (already exists), statuses with `StatusBadge`, and give house-rules its handbook look (sections with `Icon book` headers + numbered rule lists, cream background cards). Keep all mutations.

- [ ] **Step 4: Announcements, settings, maps, messages/payments stubs**

`announcements.tsx`: unread-badge chips with `Icon announcement`. `settings.tsx`: tabbed profile/avatar/password in `Card`s with `Icon user` / `Icon settings`. `maps.tsx`: page header + full iframe. `messages.tsx`, `payments/*`: keep the "coming soon" stubs but restyle with `Icon chat` / `Icon payment` and the brand palette.

- [ ] **Step 5: Verify + commit**

```bash
bun run web:typecheck && bun run web:build && bun run web:test
```

Commit: `git add apps/web/src/routes/boarder && git commit -m "feat(web): restore boarder page design"`

---

### Task 11: Landlord pages restyle

**Files:** all 19 files under `apps/web/src/routes/landlord/` — presentational restyle only.

**Design reference:** `client/views/landlord/*.html`, `client/css/views/landlord/landlord.css` (`.landlord-dashboard`, stat cards, `.landlord-table`, `.landlord-btn` variants, `.property-card`).

- [ ] **Step 1: Dashboard + onboarding + verification**

`landlord/index.tsx`: greeting + four stat `Card`s with `Icon` headers (occupancy → `analytics`, revenue → `payment`, renewals → `calendar`, payment alerts → `flag`), plus a "Create listing" primary CTA → `/landlord/listings/create`. Keep the existing nested stats shape. `onboarding.tsx` + `verification.tsx`: multi-step progress indicator (step circles with `Icon shieldCheck` when done) — keep the local-form-state behavior from Phase 4.

- [ ] **Step 2: Listings + properties + room edit**

`listings/*`, `properties.tsx`, `rooms/$id/edit.tsx`: property cards with photo (`photo_url` fallback `placeholder-room.svg`), title, price, status `StatusBadge`, edit link. Create/edit forms in `Card`s with full-width fields (keep all validation + photo upload). Empty states use `EmptyState` with `Icon buildingOffice`.

- [ ] **Step 3: Boarders + applications**

`boarders.tsx` (property selector + add/edit/remove modals), `applications.tsx` (status actions): restyle with `DataTable` + `StatusBadge` + `Modal`, `Icon users` / `Icon application` in headers. Keep all mutations + `propertyId` handling.

- [ ] **Step 4: Announcements, settings, statics, stubs**

`announcements.tsx`: CRUD modals restyled. `settings.tsx`: reuse the boarder settings component pattern. `calendar.tsx`/`activity.tsx`/`pricing.tsx`/`maps.tsx`: `PageHeader` + `Icon calendar`/`analytics`/`flag`/`map`, keep static content. `messages.tsx`, `payments/*`: restyled stubs.

- [ ] **Step 5: Verify + commit**

```bash
bun run web:typecheck && bun run web:build && bun run web:test
```

Commit: `git add apps/web/src/routes/landlord && git commit -m "feat(web): restore landlord page design"`

---

### Task 12: Admin page restyle

**Files:**

- Modify: `apps/web/src/routes/admin/index.tsx`

**Design reference:** `client/views/admin/index.html` + `client/css/views/admin/admin.css` (`.admin-card`, `.admin-table`, `.admin-section-header`, `.admin-panel`, tabs/panels).

- [ ] **Step 1: Admin overview**

Keep the existing summary queries + five tabs; restyle: stat `Card`s with `Icon` headers (users → `users`, properties → `buildingOffice`, applications → `application`, landlord verification → `shieldCheck`), tab bar matching the legacy `admin-panel` look (underline tabs), tables via the shared `DataTable` + `StatusBadge`, and the settings form in a `Card` with the admin section header ("System settings"). Add the legacy `admin-section-subtitle` copy under each section title (e.g., "Review and moderate listings" under Properties).

- [ ] **Step 2: Verify + commit**

```bash
bun run web:typecheck && bun run web:build && bun run web:test
```

Commit: `git add apps/web/src/routes/admin && git commit -m "feat(web): restore admin overview design"`

---

### Task 13: Final verification + screenshot pass

- [ ] **Step 1: Full checks**

```bash
bun run web:test
bun run web:typecheck
bun run web:build
bun run cf:api:test
bun run cf:api:typecheck
```

Expected: 21 web tests + 148 API tests pass, both typechecks clean, build succeeds.

- [ ] **Step 2: Visual smoke per flow**

Start `bun run web:dev` and screenshot every flow with the preview tools:

1. `/` — navbar + hero + app preview + logo cloud + features + testimonials + footer
2. `/find-a-room`, `/rooms/1` — search filters, room cards with images, detail with amenity icons
3. `/auth/login`, `/auth/signup`, `/auth/choose` — split layout with side image
4. `/boarder`, `/landlord`, `/admin` (with a mocked token in a test render or via `apps/web/test/components.test.tsx` render of `RoleShell`) — icon sidebar + topbar + stat cards
5. `/maps`, `/public-maps`, `/for-landlords`, `/our-story`, `/teams`, `/haven-ai`, one legal page

- [ ] **Step 3: Fix any gaps**

Any page missing chrome, broken image paths (`/assets/...` 404s), or inconsistent spacing gets fixed in-place; re-run `web:build` + `web:test`.

- [ ] **Step 4: Commit fixes**

```bash
git commit -am "fix(web): final design-recovery corrections"
```

---

## Self-Review

**1. Spec coverage:** The user asked to analyze the flow and split every main page (admin, landlord, boarder, maps, login flow), reuse shared components, and restore images/icons/full design. Task 1 restores all 131 assets + tokens + font; Task 2–4 build the shared kit (Icon, Button, StatusBadge, PublicNavbar, Footer, AuthSplitLayout); Task 5 wires public chrome; Tasks 6–7 restore public content flow (home, find-a-room, detail, marketing, maps, haven-ai, legal); Task 8 restores the login/auth flow; Tasks 9–12 restore the three role shells and their pages; Task 13 verifies. Maps appear in Tasks 6/7 (public) and 10/11 (role map pages). Every legacy view's design language maps to a task.

**2. Placeholder scan:** No "TBD"/"TODO" steps; every code step contains the actual component code or an exact legacy file + class to port from, plus the exact asset paths. The one judgment call (SSR of `Protected` shells) is flagged explicitly in Task 9 Step 5 with the fallback (test render), not left vague.

**3. Type consistency:** `NavItem` gains `icon` + `group` in Task 9 and all three nav arrays are updated in the same task; `Icon`'s name map is defined once (Task 2) and consumed everywhere; `Button` variants and `StatusBadge` are defined once and reused; `RoleShell({ title, nav, children })` signature is unchanged so the 38 existing role pages keep compiling. `AuthSplitLayout` replaces `AuthLayout` in Task 8 and the old file is deleted in the same task, after a `grep` confirms no references. Asset paths are all `/assets/...` per Global Constraints.
