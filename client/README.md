# Haven Space - Frontend

The frontend for Haven Space is built with vanilla HTML5, CSS3, and JavaScript (ES6+). No frameworks or build tools are required.

## Directory Structure

```
client/
├── assets/           # Static assets (images, SVGs)
├── components/       # Reusable HTML components
├── css/              # Stylesheets
│   ├── components/   # Component-specific styles
│   ├── views/        # View-specific styles (nested by type)
│   └── global.css    # Global styles and CSS variables
├── js/               # JavaScript modules
│   ├── auth/         # Authentication logic
│   ├── components/   # Component initialization
│   ├── shared/       # Shared utilities
│   ├── views/        # View-specific logic (nested by type)
│   └── main.js       # Application entry point
├── views/            # HTML view templates
│   ├── admin/        # Admin dashboard views
│   ├── boarder/      # Boarder dashboard views
│   ├── landlord/     # Landlord dashboard views
│   └── public/       # Public-facing views
└── index.html        # Root redirect
```

## Getting Started

### Running Locally

Serve the frontend with any static file server:

```bash
# Using Node.js http-server
npx http-server -p 3000

# Using Python
python -m http.server 3000

# Using bun
bun run --hot
```

Navigate to `http://localhost:3000/client/views/public/index.html`

### Entry Point

- `index.html` - Redirects to `./views/public/index.html`
- `js/main.js` - Main JavaScript entry point

## Architecture

### CSS Architecture

Styles are organized into two categories:

1. **Components** (`css/components/`) - Reusable UI component styles (sidebar, logo-cloud)
2. **Views** (`css/views/`) - Page-specific styles organized by view type (admin, boarder, landlord, public)

All styles are imported through `css/global.css`.

### JavaScript Architecture

JavaScript modules are organized by feature:

- **auth/** - Authentication-related logic
- **components/** - Reusable component initialization
- **shared/** - Shared utilities and state management
- **views/** - View-specific logic organized by dashboard type

### Component Pattern

Components are reusable HTML snippets with corresponding CSS and JS:

```
components/
├── logo-cloud.html    # HTML structure
└── sidebar.html       # HTML structure

css/components/
├── logo-cloud.css     # Styles
└── sidebar.css        # Styles

js/components/
├── logo-cloud.js      # Initialization
└── sidebar.js         # Initialization
```

Each component exports an `init` function called from `main.js`.

## View Structure

Views are organized by user role and feature:

### Public Views (`views/public/`)

- `index.html` - Homepage/landing page
- `maps.html` - Interactive map view
- `auth/` - Authentication pages (login, signup, forgot-password)

### Boarder Dashboard (`views/boarder/`)

- `index.html` - Dashboard home
- `rooms/` - Room browsing
- `applications/` - Rental applications
- `payments/` - Payment management
- `maintenance/` - Maintenance requests
- `messages/` - Messaging
- `notices/` - Announcements
- `profile/` - User profile

### Landlord Dashboard (`views/landlord/`)

- `index.html` - Dashboard home
- `listings/` - Property listings management
- `boarders/` - Boarder management
- `applications/` - Application review
- `payments/` - Payment tracking
- `maintenance/` - Maintenance tracking
- `messages/` - Messaging
- `reports/` - Analytics and reports
- `profile/` - User profile

### Admin Dashboard (`views/admin/`)

- `index.html` - Admin dashboard home

## Styling Guidelines

- Use CSS custom properties (variables) from `global.css`
- Follow BEM-like naming conventions for classes
- Keep component styles modular and reusable
- Use view-specific styles for page layout and structure

## JavaScript Guidelines

- Use ES6+ features (const/let, arrow functions, template literals)
- Use ES modules with import/export
- Wrap initialization in `DOMContentLoaded`
- Export init functions for components
- Use descriptive variable and function names

## Color Palette

| Variable          | Value   | Usage                      |
| ----------------- | ------- | -------------------------- |
| `--primary-green` | #4a7c23 | Primary actions, branding  |
| `--dark-green`    | #2d4a14 | Hover states, accents      |
| `--light-green`   | #7cb342 | Secondary actions          |
| `--bg-cream`      | #fef9f0 | Background sections        |
| `--bg-green`      | #e8f5e9 | Success states, highlights |
| `--text-dark`     | #1a1a1a | Primary text               |
| `--text-gray`     | #555555 | Secondary text             |
| `--white`         | #ffffff | Text on dark backgrounds   |
