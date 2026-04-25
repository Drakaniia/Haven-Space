# Haven Space - Design System

## Color Palette

### Primary Colors

- **Primary Green**: `#4a7c23` - Primary actions, branding, CTAs
- **Dark Green**: `#2d4a14` - Hover states, accents, secondary actions
- **Light Green**: `#7cb342` - Success states, highlights, active states

### Neutral Colors

- **Background Cream**: `#fef9f0` - Main background, cards, surfaces
- **Background Green**: `#e8f5e9` - Success highlights, subtle accents
- **Text Dark**: `#1a1a1a` - Primary text, headings
- **Text Gray**: `#555555` - Secondary text, labels, placeholders
- **White**: `#ffffff` - Text on dark backgrounds, contrast elements

### Semantic Colors

- **Error**: `#d32f2f` - Error states, validation messages
- **Warning**: `#ff9800` - Warning states, attention needed
- **Info**: `#1976d2` - Informational messages, neutral actions
- **Success**: `#388e3c` - Success states, confirmation messages

### State Colors

- **Hover**: `rgba(74, 124, 35, 0.1)` - Hover overlay on interactive elements
- **Focus**: `#4a7c23` with 2px outline - Focus states for accessibility
- **Disabled**: `rgba(74, 124, 35, 0.3)` - Disabled button states
- **Loading**: `#7cb342` - Loading indicators and spinners

## Typography

### Font Family

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
  sans-serif;
```

### Font Scale (rem-based)

- **h1**: 2.5rem (40px) - Page titles
- **h2**: 2rem (32px) - Section headings
- **h3**: 1.75rem (28px) - Subsection headings
- **h4**: 1.5rem (24px) - Card titles, modal titles
- **h5**: 1.25rem (20px) - Small section headings
- **h6**: 1rem (16px) - Label-style headings
- **body**: 1rem (16px) - Base text
- **small**: 0.875rem (14px) - Captions, secondary text
- **tiny**: 0.75rem (12px) - Legal text, fine print

### Font Weights

- **Regular**: 400 - Body text, standard content
- **Medium**: 500 - Subheadings, emphasis
- **SemiBold**: 600 - Headings, important labels
- **Bold**: 700 - Primary headings, CTAs

### Line Heights

- **Headings**: 1.2 - Tight for impact
- **Body**: 1.5 - Comfortable reading
- **Small text**: 1.4 - Compact but readable

## Spacing System

### Base Unit: 0.5rem (8px)

- **xxs**: 0.25rem (4px) - Tightest spacing
- **xs**: 0.5rem (8px) - Small gaps
- **sm**: 0.75rem (12px) - Standard small spacing
- **md**: 1rem (16px) - Default spacing
- **lg**: 1.5rem (24px) - Section gaps
- **xl**: 2rem (32px) - Large sections
- **xxl**: 3rem (48px) - Page sections
- **xxxl**: 4rem (64px) - Hero sections

## Elevation / Shadow System

```css
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1);
--shadow-2xl: 0 25px 50px rgba(0, 0, 0, 0.15);
```

## Border Radius

```css
--radius-none: 0;
--radius-sm: 0.125rem (2px);
--radius-md: 0.25rem (4px); /* Default */
--radius-lg: 0.5rem (8px);
--radius-xl: 1rem (16px);
--radius-full: 9999px;
```

## Components

### Buttons

- **Primary**: Solid green background, white text
- **Secondary**: Outline with green border, green text
- **Tertiary**: Text-only with green color
- **Danger**: Red background for destructive actions
- **Sizes**: sm, md (default), lg

### Cards

- **Background**: White or cream
- **Border**: 1px solid #e0e0e0
- **Shadow**: shadow-sm by default
- **Padding**: md (16px) internally
- **Hover**: shadow-md on hover

### Forms

- **Input fields**: 1px border, radius-md
- **Focus state**: 2px green outline
- **Error state**: Red border + error message
- **Labels**: Medium weight, required fields marked

### Navigation

- **Sidebar**: 256px wide, collapsible
- **Top bar**: 64px height
- **Active state**: Green background or underline
- **Hover state**: Light green background

## Breakpoints

```css
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
--breakpoint-2xl: 1536px;
```

## Animation

### Timing

- **Fast**: 150ms - Hover states, quick transitions
- **Medium**: 250ms - Modal animations, state changes
- **Slow**: 400ms - Page transitions, complex animations

### Easing

```css
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
```

## Design Tokens Implementation

All design tokens are implemented as CSS custom properties in `client/css/global.css` and should be used consistently across all components and views.
