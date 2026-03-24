# Haven Space - Project Context

## Project Overview

**Haven Space** is a web application that connects boarders with verified boarding houses near their location. The platform serves two user types:

- **Landlords**: Property owners looking for boarders
- **Boarders**: Individuals seeking rooms/boarding houses

The application provides property listings, booking management, and a mobile-friendly experience for searching and settling into boarding accommodations.

## Technology Stack

| Category            | Technology                                        |
| ------------------- | ------------------------------------------------- |
| **Frontend**        | HTML5, CSS3, Vanilla JavaScript (ES6+)            |
| **Fonts**           | Plus Jakarta Sans (Google Fonts)                  |
| **Styling**         | Custom CSS with CSS custom properties (variables) |
| **Code Formatting** | Prettier                                          |
| **Deployment**      | GitHub Pages                                      |
| **CI/CD**           | GitHub Actions                                    |

## Project Structure

```
Final/
├── .github/
│   ├── CONTRIBUTING.md          # Contribution guidelines
│   ├── pull_request_template.md # PR template
│   └── workflows/
│       ├── github-pages.yml     # Deployment workflow
│       └── prettier-check.yml   # Code formatting check
├── backend/                     # Backend API
│   ├── api/
│   │   ├── config/              # Database configuration
│   │   ├── controllers/         # Request handlers
│   │   ├── middleware/          # Auth, validation middleware
│   │   ├── models/              # Database models
│   │   └── routes.php           # API route definitions
│   └── Readme.md
├── frontend/
│   ├── assets/
│   │   ├── images/              # Image assets (logos, illustrations)
│   │   │   └── public/          # Public-facing images
│   │   │       ├── login.png
│   │   │       └── PrimeRealEstate.png
│   │   ├── nvidia.svg
│   │   └── README.md
│   ├── components/              # Reusable HTML components
│   │   ├── logo-cloud.html      # Infinite logo slider
│   │   └── sidebar.html         # Dashboard sidebar navigation
│   ├── css/
│   │   ├── components/          # Component-specific styles
│   │   │   ├── logo-cloud.css   # Logo cloud slider styles
│   │   │   └── sidebar.css      # Sidebar navigation styles
│   │   ├── views/               # Page-specific styles (nested by view type)
│   │   │   ├── admin/
│   │   │   │   └── admin.css
│   │   │   ├── boarder/
│   │   │   │   ├── boarder.css
│   │   │   │   ├── boarder-applications.css
│   │   │   │   ├── boarder-maintenance.css
│   │   │   │   ├── boarder-payments.css
│   │   │   │   └── boarder-rooms.css
│   │   │   ├── landing/
│   │   │   │   └── landing.css
│   │   │   ├── landlord/
│   │   │   │   ├── landlord.css
│   │   │   │   ├── landlord-applications.css
│   │   │   │   ├── landlord-listings.css
│   │   │   │   ├── landlord-maintenance.css
│   │   │   │   └── landlord-payments.css
│   │   │   └── public/
│   │   │       ├── auth.css
│   │   │       └── public.css
│   │   ├── global.css           # Global styles & CSS variables
│   │   └── README.md
│   ├── js/
│   │   ├── auth/                # Authentication logic
│   │   │   ├── forgot-password.js
│   │   │   ├── login.js
│   │   │   └── signup.js
│   │   ├── components/          # Component logic
│   │   │   ├── logo-cloud.js
│   │   │   └── sidebar.js
│   │   ├── shared/              # Shared utilities
│   │   │   └── state.js
│   │   ├── views/               # Page-specific logic (nested by view type)
│   │   │   ├── admin/
│   │   │   │   └── admin.js
│   │   │   ├── boarder/
│   │   │   │   ├── boarder.js
│   │   │   │   ├── boarder-applications.js
│   │   │   │   ├── boarder-maintenance.js
│   │   │   │   ├── boarder-payments.js
│   │   │   │   └── boarder-rooms.js
│   │   │   ├── landing/
│   │   │   │   └── landing.js
│   │   │   ├── landlord/
│   │   │   │   ├── landlord.js
│   │   │   │   ├── landlord-applications.js
│   │   │   │   ├── landlord-listings.js
│   │   │   │   ├── landlord-maintenance.js
│   │   │   │   └── landlord-payments.js
│   │   │   └── public/          # Reserved for public view logic
│   │   ├── main.js              # Entry point
│   │   └── README.md
│   ├── views/
│   │   ├── admin/               # Admin dashboard views
│   │   │   └── index.html
│   │   ├── boarder/             # Boarder dashboard views
│   │   │   ├── applications/    # Rental applications
│   │   │   │   ├── index.html
│   │   │   │   └── detail.html
│   │   │   ├── index.html       # Boarder dashboard home
│   │   │   ├── maintenance/     # Maintenance requests
│   │   │   │   ├── index.html
│   │   │   │   └── create.html
│   │   │   ├── messages/        # Messaging system
│   │   │   │   └── index.html
│   │   │   ├── notices/         # Notices/announcements
│   │   │   │   └── index.html
│   │   │   ├── payments/        # Payment management
│   │   │   │   ├── index.html
│   │   │   │   └── pay.html
│   │   │   ├── profile/         # User profile
│   │   │   │   └── index.html
│   │   │   └── rooms/           # Room browsing
│   │   │       ├── index.html
│   │   │       └── detail.html
│   │   ├── landlord/            # Landlord dashboard views
│   │   │   ├── applications/    # Application management
│   │   │   │   ├── index.html
│   │   │   │   └── detail.html
│   │   │   ├── boarders/        # Boarder management
│   │   │   │   ├── index.html
│   │   │   │   └── detail.html
│   │   │   ├── index.html       # Landlord dashboard home
│   │   │   ├── listings/        # Property listings
│   │   │   │   ├── index.html
│   │   │   │   ├── create.html
│   │   │   │   └── edit.html
│   │   │   ├── maintenance/     # Maintenance tracking
│   │   │   │   ├── index.html
│   │   │   │   └── detail.html
│   │   │   ├── messages/        # Messaging system
│   │   │   │   └── index.html
│   │   │   ├── payments/        # Payment tracking
│   │   │   │   ├── index.html
│   │   │   │   └── record.html
│   │   │   ├── profile/         # User profile
│   │   │   │   └── index.html
│   │   │   └── reports/         # Reports & analytics
│   │   │       └── index.html
│   │   └── public/              # Public-facing views
│   │       ├── auth/            # Authentication pages
│   │       │   ├── login.html
│   │       │   ├── signup.html
│   │       │   └── forgot-password.html
│   │       ├── index.html       # Public homepage
│   │       └── maps.html        # Map view
│   ├── index.html               # Root redirect to views/public/index.html
│   └── README.md
├── .prettierrc                  # Prettier configuration
├── .prettierignore
├── package.json
└── Readme.md
```

## Building and Running

### Prerequisites

- Node.js 20+ (required for Prettier)
- npm or bun package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/Drakaniia/Haven-Space.git
cd Haven-Space

# Install dependencies
npm install
```

### Development Commands

```bash
# Format all files
npm run format

# Check formatting (CI check)
npm run format:check
```

### Running Locally

Since this is a static frontend application, you can serve it with any static file server:

```bash
# Using Node.js http-server
npx http-server -p 3000

# Using Python
python -m http.server 3000

# Using bun
bun run --hot
```

Navigate to `http://localhost:3000/frontend/views/public/index.html` to view the application.

### Deployment

The application deploys automatically to **GitHub Pages** when changes are pushed to the `main` branch via the GitHub Actions workflow (`.github/workflows/github-pages.yml`).

Manual deployment trigger:

- Go to Actions → "Deploy to GitHub Pages" → Run workflow

## Development Conventions

### Code Formatting (Prettier)

Configuration (`.prettierrc`):

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

**Important**: Line endings must be LF (not CRLF) for GitHub Actions compatibility.

### Commit Message Format

Follow **Conventional Commits** specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Commit Types:**
| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Formatting (Prettier, whitespace) |
| `refactor` | Code refactoring |
| `test` | Tests |
| `chore` | Maintenance, dependencies |
| `ci` | CI/CD workflows |

**Examples:**

```bash
git commit -m "feat: add user authentication system"
git commit -m "fix(css): resolve navigation overflow on mobile"
git commit -m "style: fix line endings for GitHub Actions"
```

### Branch Naming Convention

Format: `<type>/<description>`

```bash
git checkout -b feat/user-authentication
git checkout -b fix/navigation-mobile-overflow
git checkout -b docs/update-readme
```

### CSS Architecture

- **CSS Custom Properties**: Defined in `global.css` under `:root`
- **Component Styles**: Modular files in `css/components/`
- **Page Styles**: Specific styles in `css/views/`
- **Import Order**: `global.css` imports component and view styles

**Color Palette:**

```css
--primary-green: #4a7c23;
--dark-green: #2d4a14;
--light-green: #7cb342;
--bg-cream: #fef9f0;
--bg-green: #e8f5e9;
--text-dark: #1a1a1a;
--text-gray: #555555;
--white: #ffffff;
```

### JavaScript Patterns

- **ES6+ Features**: `const`/`let`, arrow functions, template literals
- **Module Pattern**: ES modules with `import`/`export`
- **DOM Ready**: Wrap initialization in `DOMContentLoaded`
- **Naming**: Descriptive variable/function names

```javascript
// Entry point pattern (main.js)
import { initLogoCloud } from './components/logo-cloud.js';
import { initSidebar } from './components/sidebar.js';

document.addEventListener('DOMContentLoaded', () => {
  initLogoCloud();
  initFloatingHeader();
  initSidebar({
    role: 'boarder',
    user: {
      name: 'Juan Dela Cruz',
      initials: 'JD',
      role: 'Boarder',
    },
  });
});
```

**Main.js Functions:**

- `initLogoCloud()` - Initializes infinite logo slider
- `initSidebar(config)` - Initializes dashboard sidebar with user config
- `initFloatingHeader()` - Handles scroll-triggered header transitions

## Key Features

### Authentication System

- Login page with email/password and social sign-in (Google, Apple)
- Signup flow with role selection (landlord/boarder)
- Forgot password with email recovery
- Password visibility toggle
- Form validation

### Homepage

- Hero section with modern design
- Logo cloud with infinite horizontal slider
- Responsive navigation with floating header effect
- Call-to-action buttons

### Dashboard Views

**Boarder Dashboard:**

- Rooms - Browse and view room details
- Applications - Submit and track rental applications
- Payments - View and make payments
- Maintenance - Submit and track maintenance requests
- Messages - Communication with landlords
- Notices - View announcements
- Profile - Manage user profile

**Landlord Dashboard:**

- Listings - Manage property listings (create, edit, view)
- Boarders - Manage current boarders
- Applications - Review and manage rental applications
- Payments - Track and record payments
- Maintenance - View and manage maintenance requests
- Messages - Communication with boarders
- Reports - View analytics and reports
- Profile - Manage user profile

**Admin Dashboard:**

- System administration and oversight

## Current Branch Status

- **Active Branch**: `feature/auth-and-homepage-redesign`
- **Base Branch**: `main`
- **Open PR**: #7 - "Feature: Authentication pages and homepage redesign"

## Related Documentation

- [Contributing Guidelines](.github/CONTRIBUTING.md)
- [Pull Request Template](.github/pull_request_template.md)
- [Main README](Readme.md)
