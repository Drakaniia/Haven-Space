# Haven Space - Project Context

## Project Overview

**Haven Space** is a web application that connects boarders with verified boarding houses near their location. The platform serves two user types:

- **Landlords**: Property owners looking for boarders
- **Boarders**: Individuals seeking rooms/boarding houses

The application provides property listings, booking management, and a mobile-friendly experience for searching and settling into boarding accommodations.

## Technology Stack

| Category | Technology |
|----------|------------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| **Fonts** | Plus Jakarta Sans (Google Fonts) |
| **Styling** | Custom CSS with CSS custom properties (variables) |
| **Code Formatting** | Prettier |
| **Deployment** | GitHub Pages |
| **CI/CD** | GitHub Actions |

## Project Structure

```
Final/
├── .github/
│   ├── CONTRIBUTING.md          # Contribution guidelines
│   ├── pull_request_template.md # PR template
│   └── workflows/
│       ├── github-pages.yml     # Deployment workflow
│       └── prettier-check.yml   # Code formatting check
├── backend/                     # Backend (placeholder - .gitkeep)
├── frontend/
│   ├── assets/
│   │   ├── images/              # Image assets (logos, illustrations)
│   │   ├── maps_sample.html
│   │   └── README.md
│   ├── components/              # Reusable HTML components
│   │   └── logo-cloud.html
│   ├── css/
│   │   ├── components/          # Component-specific styles
│   │   │   ├── buttons.css
│   │   │   ├── cards.css
│   │   │   ├── forms.css
│   │   │   ├── logo-cloud.css
│   │   │   └── nav.css
│   │   ├── views/               # Page-specific styles
│   │   │   ├── admin.css
│   │   │   ├── auth.css
│   │   │   ├── boarder.css
│   │   │   ├── landing.css
│   │   │   ├── landlord.css
│   │   │   └── public.css
│   │   ├── global.css           # Global styles & CSS variables
│   │   └── README.md
│   ├── js/
│   │   ├── auth/                # Authentication logic
│   │   │   ├── forgot-password.js
│   │   │   ├── login.js
│   │   │   └── signup.js
│   │   ├── components/          # Component logic
│   │   │   └── logo-cloud.js
│   │   ├── shared/              # Shared utilities
│   │   │   └── state.js
│   │   ├── views/               # Page-specific logic
│   │   │   ├── admin.js
│   │   │   ├── boarder.js
│   │   │   ├── landing.js
│   │   │   └── landlord.js
│   │   ├── main.js              # Entry point
│   │   └── README.md
│   ├── partials/                # Reusable HTML partials
│   │   ├── footer.html
│   │   ├── header.html
│   │   └── nav.html
│   ├── views/
│   │   ├── admin/               # Admin dashboard views
│   │   ├── boarder/             # Boarder dashboard views
│   │   ├── landing/             # Landing page views
│   │   ├── landlord/            # Landlord dashboard views
│   │   └── public/              # Public-facing views
│   │       ├── auth/
│   │       │   ├── login.html
│   │       │   ├── signup.html
│   │       │   └── forgot-password.html
│   │       └── index.html       # Public homepage
│   └── index.html               # Root redirect
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

document.addEventListener('DOMContentLoaded', () => {
  initLogoCloud();
});
```

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
- Responsive navigation
- Call-to-action buttons

### User Dashboards (Planned/In Progress)
- **Admin**: System administration
- **Landlord**: Property management, tenant connections
- **Boarder**: Property search, booking management

## Current Branch Status

- **Active Branch**: `feature/auth-and-homepage-redesign`
- **Base Branch**: `main`
- **Open PR**: #7 - "Feature: Authentication pages and homepage redesign"

## Related Documentation

- [Contributing Guidelines](.github/CONTRIBUTING.md)
- [Pull Request Template](.github/pull_request_template.md)
- [Main README](Readme.md)
