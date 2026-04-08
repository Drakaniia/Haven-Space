# Design System: Haven Space

**Project Type:** Web Application for Boarding House Discovery & Management  
**Platform:** Web (Responsive)  
**Last Updated:** April 2026

---

## 1. Visual Theme & Atmosphere

**Atmosphere:** Clean, modern, and trustworthy. The design balances professionalism with approachability, using warm earth tones and generous whitespace to create a sense of reliability and calm.

**Density:** Medium-density layout with clear visual hierarchy. Components breathe well with consistent spacing, avoiding information overload while maintaining functionality.

**Aesthetic Philosophy:**

- Minimalist but warm—avoids sterile corporate feel
- Nature-inspired color palette centered on greens
- Rounded, friendly geometry that feels welcoming
- Subtle depth through soft shadows and layered backgrounds
- Mobile-first responsive design that scales gracefully

---

## 2. Color Palette & Roles

### Primary Colors

- **Primary Green (#4A7C23)** — The core brand color. Used for primary action buttons, active states, links, and key interactive elements. Conveys trust, growth, and nature.
- **Dark Green (#2D4A14)** — Deeper variant used for hover states on primary actions, text accents, and high-contrast scenarios.
- **Light Green (#7CB342)** — Lighter accent used for secondary highlights, subtle backgrounds, and visual variety.

### Background Colors

- **Bg Cream (#FEF9F0)** — Warm, soft cream background used for hero sections and landing pages. Creates a welcoming, homey feel.
- **Bg Green (#E8F5E9)** — Very light green tint used for hover states on navigation items, subtle highlights, and inactive selections.
- **White (#FFFFFF)** — Pure white used for cards, containers, sidebar/navbar backgrounds, and content areas.

### Text Colors

- **Text Dark (#1A1A1A)** — Near-black used for primary headings, body text, and high-contrast content.
- **Text Gray (#555555)** — Medium gray used for secondary text, descriptions, placeholders, and metadata.

### System Colors

- **Border Color (#E5E5E5)** — Light gray used for dividers, input borders, card borders, and subtle separators.
- **Red/Error (#EF4444)** — Used for error states, destructive actions, and critical notifications.
- **Green/Success (#16A34A)** — Used for success states and positive confirmations.
- **Orange/Warning (#D97706)** — Used for warning states and attention-requiring items.
- **Blue/Info (#2563EB)** — Used for informational messages and neutral notifications.

---

## 3. Typography Rules

**Font Family:** Plus Jakarta Sans (Google Fonts) — A modern, geometric sans-serif that feels friendly yet professional.

**Available Weights:** 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold), 800 (Extra Bold)

### Type Scale

| Element    | Size                     | Weight  | Line Height | Usage                              |
| ---------- | ------------------------ | ------- | ----------- | ---------------------------------- |
| Hero Title | 4rem (64px)              | 800     | 1.1         | Landing page hero headline         |
| H1         | 2.5–3rem                 | 700–800 | 1.2         | Major section titles               |
| H2         | 1.875rem (30px)          | 600–700 | 1.3         | Secondary headings                 |
| H3         | 1.5rem (24px)            | 600     | 1.4         | Card titles, subsection headers    |
| Body Large | 1.1rem (18px)            | 400     | 1.6         | Hero descriptions                  |
| Body       | 0.875–1rem (14–16px)     | 400–500 | 1.5–1.6     | Main content text                  |
| Small      | 0.813–0.875rem (13–14px) | 500     | 1.4         | Secondary descriptions, menu items |
| Caption    | 0.688–0.75rem (11–12px)  | 500–600 | 1.4         | Timestamps, metadata, badges       |
| Nav Title  | 0.75rem (12px)           | 600     | 1           | Uppercase, letter-spacing: 0.05em  |

### Letter Spacing

- **Default:** Normal (0)
- **Navigation labels:** 0.05em (uppercase labels only)
- **Headings:** -0.025em (tighter, more impactful)

---

## 4. Component Stylings

### Buttons

**Primary Buttons:**

- Shape: Pill-shaped (border-radius: 25px / 9999px)
- Background: Primary Green (#4A7C23)
- Text: White (#FFFFFF)
- Font: 600 weight, 0.95–1rem
- Padding: 0.6–0.85rem vertical, 1.25–1.75rem horizontal
- Hover: Background shifts to Dark Green (#2D4A14)
- Usage: "Download Our App", "Join now", primary CTAs

**Secondary Buttons (Outlined):**

- Shape: Pill-shaped (border-radius: 25px / 9999px)
- Background: White (#FFFFFF)
- Border: 2px solid Primary Green (#4A7C23)
- Text: Primary Green (#4A7C23)
- Hover: Background shifts to Bg Green (#E8F5E9)
- Usage: "Explore the Map", "Log in"

**Tertiary/Link Buttons:**

- No background or border
- Text: Primary Green or Text Dark
- Font: 500–600 weight
- Hover: Text color shifts to Primary Green
- Usage: Navigation links, "View all notifications"

**Icon Buttons:**

- Shape: Subtly rounded square (border-radius: 10px)
- Size: 40px × 40px
- Background: Transparent
- Hover: Bg Green (#E8F5E9) background, Primary Green icon
- Usage: Notification bell, theme toggle, settings

### Cards & Containers

**Cards:**

- Background: White (#FFFFFF)
- Border: 1px solid Border Color (#E5E5E5) or none
- Border-radius: 12px (generously rounded)
- Shadow: None (flat design) or soft diffused shadow on hover
- Padding: 1.25–1.5rem internal spacing
- Usage: Room cards, notification items, profile cards

**Containers:**

- Max-width: 89rem (1424px) for full-width sections
- Padding: 1.5rem standard, 1rem on mobile
- Background: Varies by section (White, Bg Cream, or Bg Green)

### Navigation

**Top Navbar (Dashboard):**

- Height: 64px
- Background: White (#FFFFFF)
- Border-bottom: 1px solid #E5E7EB
- Position: Sticky
- Z-index: 50

**Top Navbar (Public/Landing):**

- Initial state: Full-width, flush to top
- Scrolled state: Floating pill (border-radius: 50px) with backdrop blur (16px), rgba(255,255,255,0.7) background, and soft shadow (0 10px 25px rgba(0,0,0,0.1))
- Transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1)

**Sidebar:**

- Width: 280px (expanded), 72px (collapsed)
- Background: White (#FFFFFF)
- Border-right: 1px solid #E5E7EB
- Position: Fixed, full height
- Z-index: 100
- Transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1)

**Nav Items:**

- Border-radius: 8px (subtly rounded)
- Padding: 0.625rem vertical, 0.75rem horizontal
- Font: 0.875rem, 500 weight
- Active state: Primary Green background, White text
- Hover state: Bg Green background, Primary Green text

### Inputs & Forms

**Text Inputs:**

- Background: #F9FAFB (light gray)
- Border: 1px solid #E5E7EB
- Border-radius: 8px (standard) or 9999px (search bars)
- Padding: 0.5–0.75rem vertical, 1rem horizontal
- Focus state: Border shifts to Primary Green, subtle glow (box-shadow: 0 0 0 3px rgba(74,124,35,0.1))
- Font: 0.875rem, Plus Jakarta Sans

### Badges & Notifications

**Badges:**

- Shape: Pill-shaped (border-radius: 9999px)
- Min-width: 18px, Height: 18px
- Background: Red (#EF4444) for counts
- Text: White, 0.625rem, 700 weight
- Border: 2px solid White (for contrast)

**Notification Items:**

- Padding: 0.875rem vertical, 1.25rem horizontal
- Unread state: Light green background (#F0FDF4) with Primary Green left border (3px)
- Icon containers: 40px × 40px, border-radius 10px, color-coded backgrounds

### Avatars & Profile

**Avatars (Image):**

- Size: 40px × 40px
- Border-radius: 10px (soft square)
- Border: 2px solid transparent (turns Primary Green on hover)

**Avatars (Initials):**

- Size: 40px × 40px
- Background: Bg Green (#E8F5E9)
- Text: Primary Green (#4A7C23)
- Font: 0.875rem, 600 weight
- Border-radius: 10px

### Dropdowns & Menus

**Dropdown Menus:**

- Width: 280px (user menu), 360px (notifications)
- Max-height: 480px (notification menu)
- Background: White (#FFFFFF)
- Border-radius: 12px
- Border: 1px solid #E5E7EB
- Shadow: 0 10px 40px rgba(0,0,0,0.15) (heavy, high-contrast drop shadow)
- Animation: Fade in + slide up (opacity 0→1, translateY(-10px)→0, 0.2s cubic-bezier)
- Z-index: 1000

### Dividers

**Horizontal Dividers:**

- Height: 1px
- Background: #E5E7EB or #E5E5E5
- Mask: Gradient fade at edges (transparent → black → transparent) for logo cloud section

---

## 5. Layout Principles

### Spacing System

Spacing follows a consistent scale based on 4px increments:

| Token | Value                 | Usage                            |
| ----- | --------------------- | -------------------------------- |
| xs    | 0.25rem (4px)         | Tight gaps between icon and text |
| sm    | 0.5rem (8px)          | Small gaps, internal padding     |
| md    | 0.75rem (12px)        | Standard component gaps          |
| lg    | 1rem (16px)           | Section padding, card gaps       |
| xl    | 1.25–1.5rem (20–24px) | Container padding                |
| 2xl   | 2rem (32px)           | Section gaps                     |
| 3xl   | 3rem (48px)           | Major section dividers           |

### Grid & Alignment

- **Container max-width:** 89rem (1424px), centered
- **Standard padding:** 1.5rem horizontal, reduces to 1rem on mobile (768px breakpoint)
- **Flexbox-first:** Most layouts use flex with `gap` property for spacing
- **Grid usage:** Reserved for card grids and multi-column layouts

### Whitespace Strategy

- **Generous vertical spacing** between sections (3rem padding on logo cloud, 6rem on hero)
- **Tight internal spacing** within components (0.625–0.875rem padding on nav items)
- **Centered content:** Hero sections and major CTAs are center-aligned for impact
- **Breathing room:** Cards and containers have ample internal padding (1.25–1.5rem)

### Responsive Breakpoints

| Breakpoint | Target    | Adjustments                                      |
| ---------- | --------- | ------------------------------------------------ |
| Mobile     | < 640px   | Single column, stacked buttons, hidden nav links |
| Tablet     | 640–768px | Adjusted font sizes, compact padding             |
| Desktop    | 768px+    | Full layout, sidebar visible, multi-column grids |
| Large      | 1024px+   | Max-width containers, expanded spacing           |
| XL         | 1424px+   | Content caps at 89rem max-width                  |

### Depth & Elevation

**Shadow Tiers:**

1. **Flat (No shadow):** Cards, sidebar, default navbar — creates clean, modern look
2. **Soft (0 10px 25px rgba(0,0,0,0.1)):** Scrolled floating navbar — subtle lift
3. **Heavy (0 10px 40px rgba(0,0,0,0.15)):** Dropdown menus, popovers — high visibility

**Z-Index Scale:**

- Base: 0 (content)
- Navbar: 50
- Sidebar: 100
- Dropdowns/Popovers: 1000
- Modals/Overlays: 2000+ (reserved)

### Animation & Transitions

**Timing Function:** `cubic-bezier(0.4, 0, 0.2, 1)` — Standard Material Design easing

**Duration Guidelines:**

- **Fast (0.15s):** Hover states, color changes, small transforms
- **Medium (0.2s):** Dropdowns, menu toggles, icon rotations
- **Slow (0.3s):** Sidebar collapse, navbar scroll state, major layout shifts

**Performance:** Use `will-change: transform` only on animated elements (logo slider), prefer `transform` over positional properties for animations.

---

## 6. Icon System

**Source:** Heroicons v2 (outline style)  
**Implementation:** Centralized icon library via `data-icon` attributes  
**Standard Size:** 24px × 24px, stroke-width: 1.5 (buttons: 20–22px)

### Icon Sizing by Context

| Context             | Size        | Stroke Width |
| ------------------- | ----------- | ------------ |
| Navigation items    | 20px × 20px | 1.5          |
| Button icons        | 20–22px     | 2            |
| Notification icons  | 20px        | 1.5          |
| Dropdown menu icons | 20px        | 1.5          |
| Hero/illustrative   | 48px+       | 1.5          |

**Rule:** Never hardcode SVG elements. Always use `<span data-icon="iconName">` pattern with centralized `icons.js` library.

---

## 7. Design Patterns

### Authentication Flow

- Clean, centered card layout
- Social sign-in buttons (Google, Apple) at top
- Email/password form with visible labels
- Password visibility toggle
- Clear error states below inputs
- "Forgot password?" link prominent
- Role selection (Landlord/Boarder) during signup

### Dashboard Layout

- **Sidebar:** Fixed left, 280px width, collapsible to 72px
- **Navbar:** Fixed top, 64px height
- **Main Content:** Margin-left adjusts from 280px to 72px based on sidebar state
- **Mobile:** Sidebar hides, accessible via hamburger menu overlay

### Card Lists (Rooms, Notifications, etc.)

- Vertical stack or grid layout
- Each card: Image/Icon → Title → Description → Metadata → Actions
- Hover state: Subtle background color shift or shadow
- Active/Unread state: Left border accent or tinted background

### Empty States

- Centered layout
- Large icon (48px+) in muted gray (#D1D5DB)
- Descriptive text below
- Optional CTA button

---

## 8. Accessibility Guidelines

- **Contrast:** All text meets WCAG AA minimum (4.5:1 for normal text, 3:1 for large text)
- **Focus states:** Visible focus rings with Primary Green outline
- **Aria labels:** All icon-only buttons have `aria-label` attributes
- **Semantic HTML:** Proper heading hierarchy (h1 → h2 → h3)
- **Keyboard navigation:** All interactive elements accessible via Tab key
- **Alt text:** All images have descriptive `alt` attributes

---

## 9. Brand Voice & Copy

**Tone:** Warm, professional, trustworthy  
**Language:** Clear, concise, action-oriented

**Examples:**

- ✅ "Find your haven, right next door."
- ✅ "Trusted by experts. Used by the leaders."
- ✅ "Explore the Map"
- ✅ "Download Our App"

**Avoid:** Jargon, overly technical terms, aggressive CTAs

---

## Design Tokens Summary (Quick Reference)

```css
:root {
  /* Colors */
  --primary-green: #4a7c23;
  --dark-green: #2d4a14;
  --light-green: #7cb342;
  --bg-cream: #fef9f0;
  --bg-green: #e8f5e9;
  --text-dark: #1a1a1a;
  --text-gray: #555555;
  --white: #ffffff;
  --border-color: #e5e5e5;

  /* Typography */
  --font-main: 'Plus Jakarta Sans', sans-serif;

  /* Spacing */
  --sidebar-width: 280px;
  --sidebar-collapsed: 72px;
  --navbar-height: 64px;
  --container-max: 89rem;

  /* Border Radius */
  --radius-pill: 9999px;
  --radius-lg: 12px;
  --radius-md: 10px;
  --radius-sm: 8px;

  /* Shadows */
  --shadow-soft: 0 10px 25px rgba(0, 0, 0, 0.1);
  --shadow-heavy: 0 10px 40px rgba(0, 0, 0, 0.15);

  /* Transitions */
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast: 0.15s;
  --duration-medium: 0.2s;
  --duration-slow: 0.3s;
}
```

---

_This design system is extracted from the Haven Space codebase and serves as the source of truth for maintaining visual consistency across all screens and components._
