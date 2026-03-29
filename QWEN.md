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
| **Backend**         | PHP 8.0+ with MySQL/MariaDB                       |
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
├── client/                      # Frontend source files (renamed from frontend/)
│   ├── assets/
│   │   ├── images/              # Image assets (logos, illustrations)
│   │   ├── svg/                 # SVG icons
│   │   └── README.md
│   ├── components/              # Reusable HTML components
│   │   ├── logo-cloud.html      # Infinite logo slider
│   │   ├── sidebar.html         # Dashboard sidebar navigation
│   │   └── navbar.html          # Top navigation bar
│   ├── css/
│   │   ├── components/          # Component-specific styles
│   │   │   ├── logo-cloud.css   # Logo cloud slider styles
│   │   │   ├── sidebar.css      # Sidebar navigation styles
│   │   │   └── navbar.css       # Navbar styles
│   │   ├── views/               # Page-specific styles (nested by view type)
│   │   │   ├── admin/
│   │   │   ├── boarder/
│   │   │   ├── landlord/
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
│   │   │   ├── sidebar.js
│   │   │   └── navbar.js
│   │   ├── shared/              # Shared utilities
│   │   │   └── state.js
│   │   ├── views/               # Page-specific logic (nested by view type)
│   │   │   ├── admin/
│   │   │   ├── boarder/
│   │   │   ├── landlord/
│   │   │   └── public/
│   │   ├── main.js              # Entry point
│   │   └── README.md
│   ├── views/
│   │   ├── admin/               # Admin dashboard views
│   │   │   └── index.html
│   │   ├── boarder/             # Boarder dashboard views
│   │   │   ├── applications/    # Rental applications
│   │   │   ├── index.html       # Boarder dashboard home
│   │   │   ├── maintenance/     # Maintenance requests
│   │   │   ├── messages/        # Messaging system
│   │   │   ├── notices/         # Notices/announcements
│   │   │   ├── payments/        # Payment management
│   │   │   ├── profile/         # User profile
│   │   │   └── rooms/           # Room browsing
│   │   ├── landlord/            # Landlord dashboard views
│   │   │   ├── applications/    # Application management
│   │   │   ├── boarders/        # Boarder management
│   │   │   ├── index.html       # Landlord dashboard home
│   │   │   ├── listings/        # Property listings
│   │   │   ├── maintenance/     # Maintenance tracking
│   │   │   ├── messages/        # Messaging system
│   │   │   ├── payments/        # Payment tracking
│   │   │   ├── profile/         # User profile
│   │   │   └── reports/         # Reports & analytics
│   │   └── public/              # Public-facing views
│   │       ├── auth/            # Authentication pages
│   │       │   ├── login.html
│   │       │   ├── signup.html
│   │       │   └── forgot-password.html
│   │       ├── index.html       # Public homepage
│   │       └── maps.html        # Map view
│   ├── index.html               # Root redirect to views/public/index.html
│   └── README.md
├── server/                      # Backend API (PHP)
│   ├── api/
│   │   ├── config/              # Database configuration
│   │   ├── controllers/         # Request handlers
│   │   ├── middleware/          # Auth, validation middleware
│   │   ├── models/              # Database models
│   │   └── routes.php           # API route definitions
│   ├── src/                     # Source files
│   ├── public/                  # Public assets
│   ├── config/                  # Configuration files
│   ├── database/                # Database migrations
│   ├── storage/                 # File storage
│   ├── tests/                   # PHPUnit tests
│   ├── vendor/                  # Composer dependencies
│   ├── .env.example
│   ├── composer.json
│   ├── phpunit.xml
│   └── Readme.md
├── scripts/
│   └── build.js                 # Production build script
├── dist/                        # Production build output (auto-generated)
├── docs/
│   └── plan.md                  # Project planning documentation
├── .prettierrc                  # Prettier configuration
├── .prettierignore
├── package.json
└── Readme.md
```

## Building and Running

### Prerequisites

- Node.js 20+ (required for Prettier and build scripts)
- npm or bun package manager
- PHP 8.0+ (for backend development)
- MySQL or MariaDB (for backend database)
- Composer (for PHP dependencies)

### Frontend Installation

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

# Build for production
npm run build

# Serve locally (opens browser)
npm start

# Serve locally (no browser open)
npm run serve
```

### Backend Installation

```bash
cd server
composer install
cp .env.example .env
# Configure database in .env
php migrate
```

### Running Locally

**Frontend:**

```bash
# Using the built-in start script (opens browser)
npm start

# Or serve without opening browser
npm run serve

# Or using any static file server
npx http-server -p 3000
python -m http.server 3000
```

Navigate to `http://localhost:3000/client/views/public/index.html` to view the application.

**Backend:**

```bash
cd server
php -S localhost:8000 -t api
```

### Deployment

The application deploys automatically to **GitHub Pages** when changes are pushed to the `main` branch via the GitHub Actions workflow.

Manual deployment trigger:

- Go to Actions → "Deploy to GitHub Pages" → Run workflow

Production URLs after deployment:

- **Homepage**: `https://havenspace.com/` (or `https://<username>.github.io/haven-space/`)
- **Map View**: `https://havenspace.com/maps.html`
- **Login**: `https://havenspace.com/auth/login.html`
- **Signup**: `https://havenspace.com/auth/signup.html`

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

| Type       | Description                       |
| ---------- | --------------------------------- |
| `feat`     | New feature                       |
| `fix`      | Bug fix                           |
| `docs`     | Documentation                     |
| `style`    | Formatting (Prettier, whitespace) |
| `refactor` | Code refactoring                  |
| `test`     | Tests                             |
| `chore`    | Maintenance, dependencies         |
| `ci`       | CI/CD workflows                   |
| `perf`     | Performance improvements          |
| `build`    | Build system changes              |
| `setup`    | Initial setup, scaffolding        |

**Examples:**

```bash
git commit -m "feat: add user authentication system"
git commit -m "fix(css): resolve navigation overflow on mobile"
git commit -m "docs: update README with setup instructions"
git commit -m "style: fix line endings for GitHub Actions"
```

### Branch Naming Convention

Format: `<type>/<description>`

```bash
git checkout -b feat/user-authentication
git checkout -b fix/navigation-mobile-overflow
git checkout -b docs/update-readme
git checkout -b refactor/api-error-handling
git checkout -b hotfix/critical-security-patch
```

### CSS Architecture

- **CSS Custom Properties**: Defined in `global.css` under `:root`
- **Component Styles**: Modular files in `css/components/`
- **Page Styles**: Specific styles in `css/views/`
- **Import Order**: `global.css` imports component and view styles

**Color Palette:**

```css
:root {
  --primary-green: #4a7c23;
  --dark-green: #2d4a14;
  --light-green: #7cb342;
  --bg-cream: #fef9f0;
  --bg-green: #e8f5e9;
  --text-dark: #1a1a1a;
  --text-gray: #555555;
  --white: #ffffff;
  --font-main: 'Plus Jakarta Sans', sans-serif;
  --border-color: #e5e5e5;
}
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
import { initNavbar } from './components/navbar.js';

document.addEventListener('DOMContentLoaded', () => {
  // Only init logo cloud if element exists (homepage only)
  if (document.getElementById('logoSlider')) {
    initLogoCloud();
  }

  initFloatingHeader();

  // Only init sidebar if container exists (dashboard pages only)
  if (document.getElementById('sidebar-container')) {
    initSidebar({
      role: 'boarder',
      user: {
        name: 'Juan Dela Cruz',
        initials: 'JD',
        role: 'Boarder',
      },
    });
  }

  // Only init navbar if container exists (dashboard pages only)
  if (document.getElementById('navbar-container')) {
    initNavbar({
      user: {
        name: 'Juan Dela Cruz',
        initials: 'JD',
        avatarUrl: '',
      },
      notificationCount: 3,
    });
  }
});
```

**Main.js Functions:**

- `initLogoCloud()` - Initializes infinite logo slider
- `initSidebar(config)` - Initializes dashboard sidebar with user config
- `initNavbar(config)` - Initializes top navigation bar with user config
- `initFloatingHeader()` - Handles scroll-triggered header transitions

### PHP Backend Patterns

**Keep it simple:**

```php
// Good: Simple and clear
public function show($id) {
    $room = Room::find($id);

    if (!$room) {
        return json_response(404, ['error' => 'Room not found']);
    }

    return json_response(200, ['data' => $room]);
}
```

**Guidelines:**

- Write straightforward, readable code
- Keep functions short and focused (ideally under 30 lines)
- Avoid nested logic deeper than 2-3 levels
- Use prepared statements for security
- Return consistent JSON response format

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

## Code Generation Philosophy

**Keep it simple, keep it functional.** Before generating any code, always prioritize simplicity over complexity.

### Guidelines

- **Simple by default**: Write the simplest code that solves the problem. Avoid over-engineering.
- **Functional first**: Every line of code must serve a clear purpose. Remove decorative or unnecessary code.
- **No premature optimization**: Don't add abstractions, patterns, or utilities "just in case." Add them when the need arises.
- **Vanilla over libraries**: Use native JavaScript/CSS features before reaching for external dependencies.
- **Readable names**: Use clear, descriptive variable and function names. Avoid clever abbreviations.
- **Single responsibility**: Each function should do one thing well. Split complex functions into smaller ones.
- **Minimal DOM manipulation**: Cache DOM references, batch updates, and avoid redundant queries.
- **CSS efficiency**: Reuse existing CSS variables and utility classes. Don't create new styles for what existing styles can handle.

### Before Writing Code Checklist

1. Can this be done with fewer lines?
2. Am I adding unnecessary abstractions?
3. Does every line have a clear purpose?
4. Can I use existing project patterns instead of inventing new ones?
5. Will this be easy for another developer to understand?

### Example: Simple vs. Over-engineered

**❌ Over-engineered:**

```javascript
const createRoomCard = room => {
  const factory = new RoomCardFactory(room);
  const renderer = factory.getRenderer();
  return renderer.render({
    metadata: new MetadataBuilder(room).build(),
    actions: ActionRegistry.get('room'),
  });
};
```

**✅ Simple and functional:**

```javascript
function createRoomCard(room) {
  const card = document.createElement('div');
  card.className = 'room-card';
  card.innerHTML = `
    <h3>${room.title}</h3>
    <p>${room.location}</p>
    <span>$${room.price}/month</span>
  `;
  return card;
}
```

## Related Documentation

- [Contributing Guidelines](.github/CONTRIBUTING.md)
- [Pull Request Template](.github/pull_request_template.md)
- [Frontend README](client/README.md)
- [Backend README](server/Readme.md)
- [Views Documentation](client/views/README.md)
