# Haven Space design system

Direction: **warm editorial hospitality** — a well-printed neighbourhood guide, not a SaaS
template. Calm, grounded, trustworthy. The people using it are students and young professionals
looking for a room near school or work in the Philippines, landlords running small boarding
houses, and a handful of admins.

Source of truth for values: `apps/web/src/styles/app.css` (`@theme`). Token names are stable;
use them, never literal hex values.

## Palette

- **Paper neutrals:** `bg-cream` (page canvas), `bg-surface` (cards, inputs), `bg-subtle`
  (hover, quiet fills), `border-border`, `border-border-strong`. Text: `text-ink` (primary),
  `text-gray-ink` (secondary), `text-muted` (tertiary, never for essential copy).
- **Moss brand:** `text-primary` / `border-primary` for accents, `bg-primary-strong` for solid
  fills with white text, `bg-mint` for selected/active tints, `text-primary-dark` on mint.
- **Clay accent (`text-clay`, `bg-clay`, `bg-clay-tint`):** the ONE deliberate accent. Use it at
  most once or twice per screen, at the key moment (the price on a room, the emphasised word in a
  hero, the unread badge). Never for chrome, buttons, or status.
- **Semantics:** `success|warning|error|info|critical` each with `-tint`, `-ink`, `-border`.
  Status always goes through `StatusBadge` / `statusTone()`.

## Type

- Display: **Fraunces** via `font-display` (soft optical serif). Use for page titles, section
  headings, empty-state titles, big numbers on marketing pages. Helpers: `display-xl`,
  `display-lg`, `display-md` (fluid sizes with size-specific tracking/leading).
- UI/body: **Hanken Grotesk** (`font-sans`, the default). Weights 400–700.
- `kicker` = small sentence-case section label in moss. No shouting `UPPERCASE TRACKING-WIDEST`
  eyebrows, and no pill badge above an H1 that repeats the headline.
- Large text tightens (`tracking-[-0.02em]`), body stays at 0. Numbers that compare get
  `tabular` / tables already use tabular figures.

## Shape, elevation, material

- Radii: controls `rounded-xl` (buttons, inputs), small buttons `rounded-lg`, cards/panels
  `rounded-2xl`, modals `rounded-[20px]`. `rounded-full` only for avatars, dots, counters,
  toggles — not for every button or badge. Status badges are `rounded-md`.
- Shadows: most things sit flat. `shadow-card` hairline lift for cards, `shadow-lift` for hover on
  clickable cards (`press-card` class does this), `shadow-pop` for floating layers only.
- Glass (`chrome-topbar`, `chrome-sidebar`, `chrome-float`) only for chrome. Cards are opaque.
- `paper-grain` is a faint canvas texture for large marketing/auth backgrounds only.
- No background grids, glow orbs, purple gradients, decorative pulsing dots, emoji, or arrows on
  every button.

## Primitives (reuse; don't hand-roll)

`components/ui/*`: `Button` / `buttonClasses()` (variants primary, secondary, outline, ghost,
danger, dangerGhost, warning, warningGhost; sizes sm, md, lg), `Card`, `PageHeader`, `Field` +
`TextInput` / `PasswordInput` / `SelectInput` / `TextArea`, `Modal`, `Drawer`, `ConfirmDialog`,
`DataTable`, `StatusBadge`, `EmptyState`, `ErrorState`, `Skeleton`, `Spinner`, `Toggle`,
`Avatar`, `Icon`.

- Link that looks like a button: `className={buttonClasses({ variant, size })}`.
- Never put colour utilities in a `<Button className>` (a test enforces this); pick a variant.
- `Icon` renders as a mask filled with `currentColor`, so set its colour with `text-*` on it or
  its parent.

## Layout rhythm

- Role pages: `RoleShell` provides sidebar + topbar + a `max-w-[1240px]` column. Each page names
  itself once with `PageHeader`. Spacing scale: `gap-3` inside a group, `gap-6` between cards,
  `mt-10`/`mt-12` between page sections.
- App screens are built around the one decision the user makes there; avoid the default
  "4 stat cards + chart + table" shell when the job is something else.
- Marketing pages vary section composition (asymmetric splits, full-bleed bands, lists) instead
  of repeating centred title + card grid.

## Motion

- Press feedback: `active:scale-[0.97]` (buttons) / `press-card` (cards). Exact properties in
  transitions, never `transition-all`.
- Entrances: `rise-in` on a container staggers its children once on load (heroes, page
  headers). `menu-pop`, `modal-pop`, `toast-in`, `drawer-in` for floating layers.
- Under 300ms for UI. No endless loops. Everything respects `prefers-reduced-motion`.

## Content honesty

Real data or an honest empty state. No invented metrics, testimonials, logos or people. Empty /
loading / error states say what is happening and what to do next.
