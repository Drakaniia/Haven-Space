# Haven Space - CSS Architecture

## Directory Structure

```
css/
├── components/          # Reusable component styles
│   ├── logo-cloud.css   # Infinite logo slider styles
│   └── sidebar.css      # Dashboard sidebar navigation styles
├── views/               # View-specific styles (nested by type)
│   ├── admin/
│   │   └── admin.css
│   ├── boarder/
│   │   ├── boarder.css
│   │   ├── boarder-applications.css
│   │   ├── boarder-maintenance.css
│   │   ├── boarder-payments.css
│   │   └── boarder-rooms.css
│   ├── landing/
│   │   └── landing.css
│   ├── landlord/
│   │   ├── landlord.css
│   │   ├── landlord-applications.css
│   │   ├── landlord-listings.css
│   │   ├── landlord-maintenance.css
│   │   └── landlord-payments.css
│   └── public/
│       ├── auth.css
│       └── public.css
└── global.css           # Global styles and CSS variables
```

## CSS Custom Properties

All CSS variables are defined in `global.css` under `:root`:

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

  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  /* Typography */
  --font-family: 'Plus Jakarta Sans', sans-serif;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;

  /* Borders */
  --border-radius: 0.5rem;
  --border-color: #e5e5e5;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
}
```

## File Organization

### Component Styles (`components/`)

Component styles are for reusable UI elements that appear across multiple views:

| File             | Description                                   |
| ---------------- | --------------------------------------------- |
| `logo-cloud.css` | Styles for the infinite logo slider component |
| `sidebar.css`    | Styles for the dashboard sidebar navigation   |

### View Styles (`views/`)

View styles are organized by dashboard type and feature. Each view type has its own directory:

#### Admin (`views/admin/`)

| File        | Description            |
| ----------- | ---------------------- |
| `admin.css` | Admin dashboard styles |

#### Boarder (`views/boarder/`)

| File                       | Description                   |
| -------------------------- | ----------------------------- |
| `boarder.css`              | Boarder dashboard home styles |
| `boarder-rooms.css`        | Room browsing styles          |
| `boarder-applications.css` | Rental application styles     |
| `boarder-payments.css`     | Payment management styles     |
| `boarder-maintenance.css`  | Maintenance request styles    |

#### Landing (`views/landing/`)

| File          | Description                      |
| ------------- | -------------------------------- |
| `landing.css` | Landing page/hero section styles |

#### Landlord (`views/landlord/`)

| File                        | Description                        |
| --------------------------- | ---------------------------------- |
| `landlord.css`              | Landlord dashboard home styles     |
| `landlord-listings.css`     | Property listing management styles |
| `landlord-applications.css` | Application review styles          |
| `landlord-payments.css`     | Payment tracking styles            |
| `landlord-maintenance.css`  | Maintenance tracking styles        |

#### Public (`views/public/`)

| File         | Description                                                 |
| ------------ | ----------------------------------------------------------- |
| `public.css` | Public page layouts                                         |
| `auth.css`   | Authentication page styles (login, signup, forgot-password) |

## Import Order

`global.css` is the main entry point and imports all other stylesheets:

```css
/* global.css */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

:root {
  /* CSS variables */
}

* {
  /* Reset styles */
}

/* Base styles */

@import './components/logo-cloud.css';
@import './components/sidebar.css';

@import './views/landing/landing.css';
@import './views/public/public.css';
@import './views/public/auth.css';
@import './views/admin/admin.css';
@import './views/boarder/boarder.css';
@import './views/boarder/boarder-rooms.css';
@import './views/boarder/boarder-applications.css';
@import './views/boarder/boarder-payments.css';
@import './views/boarder/boarder-maintenance.css';
@import './views/landlord/landlord.css';
@import './views/landlord/landlord-listings.css';
@import './views/landlord/landlord-applications.css';
@import './views/landlord/landlord-payments.css';
@import './views/landlord/landlord-maintenance.css';
```

## Naming Conventions

- Use lowercase with hyphens for class names: `.user-card`, `.nav-link`
- Use BEM-like structure for component-specific classes: `.sidebar__item`, `.sidebar__item--active`
- Prefix view-specific classes with view name: `.boarder-dashboard`, `.landlord-listings`
- Use descriptive names that indicate purpose, not appearance

## Responsive Design

Use mobile-first approach with min-width media queries:

```css
/* Base mobile styles */
.card {
  padding: var(--spacing-md);
}

/* Tablet and up */
@media (min-width: 768px) {
  .card {
    padding: var(--spacing-lg);
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .card {
    padding: var(--spacing-xl);
  }
}
```
