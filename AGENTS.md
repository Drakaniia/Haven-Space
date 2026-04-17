# AGENTS.md

This file provides guidance to Qoder (qoder.com) when working with code in this repository.

## OVERVIEW

Haven Space is a boarding house rental platform connecting boarders with verified landlords in the Philippines. Dual-stack architecture: Vanilla JS/HTML/CSS frontend + PHP REST API backend with MySQL database.

**Key Features:**

- Property search with map integration (Leaflet)
- User authentication (email/password + Google OAuth) with JWT + token refresh
- Role-based dashboards: Boarder, Landlord, Admin
- Rental applications workflow
- Messaging system with attachments
- Payment tracking (GCash, PayMaya, Bank Transfer, PayPal, GrabPay)
- Maintenance request system
- Landlord verification and property moderation

## STRUCTURE

```
haven-space/
├── client/            # Frontend (JS/HTML/CSS)
│   ├── index.html     # Redirects to views/public/
│   ├── js/
│   │   ├── main.js    # Entry point - view router (detects data-view on body)
│   │   ├── config.js  # Environment detection, API URL config
│   │   ├── auth/      # Login, signup, password recovery
│   │   ├── shared/    # state.js (auth helpers), icons.js, permissions.js, toast.js, map-utils.js
│   │   └── views/     # Role-specific: boarder/, landlord/, admin/
│   ├── css/           # Global + per-role CSS files
│   └── views/         # HTML templates per role
├── server/            # Backend (PHP 8.2 + MySQL)
│   ├── router.php     # Unified router (serves frontend + API)
│   ├── api/
│   │   ├── routes.php         # Router class + route definitions
│   │   ├── middleware.php     # Auth middleware
│   │   ├── cors.php           # CORS configuration
│   │   └── {module}/          # auth/, admin/, landlord/, rooms/, users/, geocode/
│   ├── src/                   # PHP source (PSR-4: App\)
│   │   ├── Core/              # Database, Auth, Upload, Bootstrap, Env
│   │   └── Modules/           # Application, Message, Notification, Onboarding
│   └── database/
│       ├── schema.sql         # Full MySQL schema
│       └── migrations/        # Migration files
├── scripts/           # Build tooling (build.js, database setup/reset)
├── dist/              # Production build output
├── .github/workflows/ # CI/CD (GitHub Actions)
└── package.json       # Root Node manifest (build scripts)
```

## WHERE TO LOOK

| Task               | Location                     | Notes                                     |
| ------------------ | ---------------------------- | ----------------------------------------- |
| Add public page    | `client/views/public/`       | Auth flows in `client/js/auth/`           |
| Add dashboard view | `client/js/views/{role}/`    | Role: boarder, landlord, admin            |
| API endpoint       | `server/api/{module}/`       | Routes defined in `server/api/routes.php` |
| Styling            | `client/css/views/{role}/`   | Per-role CSS files                        |
| DB schema          | `server/database/schema.sql` | MySQL schema + migrations                 |
| Shared utilities   | `client/js/shared/state.js`  | Auth helpers, API fetch wrapper           |
| PHP core logic     | `server/src/`                | PSR-4 autoloaded (App\ namespace)         |
| Environment config | `server/.env.example`        | Database credentials, API keys            |

## CODE MAP

| Symbol/Entry     | Type       | Location                    | Role                                      |
| ---------------- | ---------- | --------------------------- | ----------------------------------------- |
| `main.js`        | entry      | `client/js/main.js`         | View router - imports correct dashboard   |
| `Router`         | class      | `server/api/routes.php`     | Static route registry for API             |
| `index.html`     | redirect   | `client/index.html`         | Meta refresh to `views/public/index.html` |
| `routes.php`     | router     | `server/api/routes.php`     | API route definitions + handler mapping   |
| `middleware.php` | middleware | `server/api/middleware.php` | JWT auth validation                       |

## CONVENTIONS (THIS PROJECT)

- **ESLint**: `no-console: warn` (allows console.warn/error), `eqeqeq: error`, `no-var: error`, `prefer-const: error`
- **Prettier**: `singleQuote: true`, `trailingComma: es5`, `printWidth: 100`, `semi: true`
- **Lint staged**: JS/JSX/TS/TSX → eslint --fix + prettier; HTML/CSS/SCSS/MD/JSON/YAML → prettier
- **Git commits**: Conventional commits enforced (@commitlint/config-conventional)
- **Branch naming**: `<type>/<description>` (feat/, fix/, docs/, refactor/, chore/, hotfix/)
- **Phone format**: Philippine format `+63 9XX XXX XXXX`
- **JavaScript**: ES6+ modules, prefer `const`/`let`, meaningful names, JSDoc for complex functions
- **CSS**: Custom properties (variables), BEM-like class naming, semantic structure
- **HTML**: Semantic elements, `alt` attributes for images, 2-space indentation
- **PHP**: PSR-4 autoloading, PDO with prepared statements, namespace `App\`

## ANTI-PATTERNS (THIS PROJECT)

- ❌ Do NOT use `var` - use `const`/`let`
- ❌ Do NOT use `==` - use `===` everywhere
- ❌ Do NOT commit `.env` files (only `.env.example`)
- ❌ Do NOT use `latest` Docker base images
- ❌ Do NOT lint node_modules, dist, or vendor folders
- ❌ Do NOT add error handling for scenarios that can't happen internally
- ❌ Do NOT create abstractions for one-time operations

## UNIQUE PATTERNS

- **PHP backend**: Separate `server/` directory with custom MVC-like structure, not Node.js backend
- **Dual dashboard**: Boarder, Landlord, and Admin roles with completely separate views
- **Unified PHP router**: `server/router.php` serves both static frontend files AND API routes
- **ES modules without bundler**: Frontend uses native ES module imports, no Webpack/Vite
- **Build script flattens structure**: `scripts/build.js` copies nested `client/views/{role}/` to flat `dist/` with path rewriting
- **Environment auto-detection**: `config.js` detects local vs production based on hostname/port
- **Role-based view routing**: `main.js` uses `data-view` attribute on `<body>` to dynamically import dashboard module
- **Database soft deletes**: Tables use `deleted_at` columns for soft deletion
- **Dual moderation status**: Properties have both `listing_moderation_status` and `moderation_status`

## COMMANDS

```bash
# Install dependencies
npm install              # or bun install

# Development servers
npm run server          # PHP API server (localhost:8000)
npm run client          # Apache frontend server (localhost:3000)
npm run mysql           # MySQL dev server (Docker, port 3307)

# Database
npm run db:setup        # Create + migrate database
npm run db:seed         # Seed sample data
npm run db:reset        # Reset database
npm run db:reset:force  # Force reset (no backup)

# Code quality
npm run format          # Prettier --write all files
npm run format:check    # Prettier --check all files
npm run lint            # ESLint client/js/**/*.js
npm run lint:fix        # ESLint --fix client/js/**/*.js

# Build
npm run build           # Production build to dist/
npm run serve           # Serve dist/ locally for testing

# Git hooks (auto-installed via husky)
npm run prepare         # Install husky hooks

# PHP backend (from server/)
composer test           # Run PHPUnit tests
composer analyze        # Run PHPStan static analysis
```

## TESTING

- **Frontend**: No formal test framework configured
- **Backend PHP**: PHPUnit (`server/tests/`) + PHPStan for static analysis
- **CI**: GitHub Actions runs ESLint, Prettier check, and Docker build on push/PR to main

## GIT HOOKS

Pre-commit hook runs:

1. `npx lint-staged` (eslint --fix + prettier on staged files)
2. `bun run build` (full production build)

Commit-msg hook runs:

- `bun x commitlint --edit` (validates conventional commit format)

## DEPLOYMENT

**Frontend (GitHub Pages):**

- Triggered on push to `main` or PR to `main`
- Workflow: `.github/workflows/github-pages.yml`
- Uses Bun, runs `bun run build`, deploys `dist/`
- URL: `https://<username>.github.io/haven-space/`

**Backend (Render - Docker):**

- Config: `render.yaml`
- Dockerfile: `server/Dockerfile` (PHP 8.2 + Apache)
- Health check: `/health.php`
- Region: Singapore

**Docker Compose (local):**

- `backend`: PHP 8.2-Apache on port 8000
- `db`: MySQL 8.0 on port 3307
- `frontend`: Node.js on port 3000

## NOTES

- Frontend redirects from `/` → `/views/public/` via meta refresh in `client/index.html`
- API routes: `/auth/*` → `server/api/auth/*`, `/api/*` → `server/api/*`
- Production build outputs to `dist/`, not `Final/dist/` (README is outdated on this)
- JWT auth pattern with refresh tokens for session management
- Google OAuth with intermediate "pending user" state for new signups
- Messages support attachments with separate `message_attachments` table
- Landlord profiles are separate from users table (one-to-one relationship)
- Leaflet map library available globally (exposed as `L` in ESLint globals)

## AUTHENTICATION FLOW

**Email/Password:**

1. User submits credentials to `/api/auth/login.php`
2. Server validates and returns JWT access token + refresh token
3. Client stores token in localStorage, includes in `Authorization: Bearer <token>` header
4. Token refresh via `/api/auth/refresh-token.php`

**Google OAuth:**

1. User clicks Google login → `/api/auth/google/authorize.php`
2. Callback to `/api/auth/google/callback.php`
3. New users enter "pending" state, existing users get JWT tokens
4. Landlord signups require admin verification before write operations

**Middleware:**

- `Middleware::authenticate()` - Validates JWT token (supports `X-User-ID` header for testing)
- `Middleware::authorize(['role'])` - Checks user role
- `Middleware::authorizeVerifiedLandlord()` - Blocks write operations for unverified landlords

## DATABASE SCHEMA HIGHLIGHTS

**Core Tables:**

- `users` - All user types (boarder, landlord, admin) with soft deletes
- `properties` - Boarding house listings with dual moderation status
- `rooms` - Individual rooms under a property
- `applications` - Rental applications linking boarders to rooms
- `landlord_profiles` - Extended landlord info (one-to-one with users)
- `conversations`, `messages`, `message_attachments` - Messaging system
- `notifications` - User notifications with JSON metadata
- `payment_methods` - Landlord payment options (GCash, PayMaya, etc.)

**Soft Deletes:** Most tables use `deleted_at` timestamp instead of hard deletes

## ENVIRONMENT SETUP

**Server `.env` (copy from `server/.env.example`):**

- Database credentials (default: MySQL `haven_space` on localhost:3306)
- JWT secret and expiration times
- Google OAuth credentials
- CORS allowed origins

**Frontend Config:**

- Auto-detects environment via `client/js/config.js`
- Local dev: API at `http://localhost:8000`
- Production: API at `https://haven-space-api.onrender.com`
