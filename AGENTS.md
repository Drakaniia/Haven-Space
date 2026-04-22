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
├── .github/
│   ├── CODEOWNERS
│   ├── CONTRIBUTING.md
│   ├── pull_request_template.md
│   └── workflows/
│       ├── docker-ci.yml
│       ├── eslint-check.yml
│       ├── github-pages.yml
│       └── prettier-check.yml
├── client/                              # Frontend (Vanilla JS/HTML/CSS)
│   ├── index.html                       # Meta refresh → views/public/
│   ├── assets/
│   │   ├── favicon.svg
│   │   ├── images/
│   │   │   ├── Haven_Space_Logo.png
│   │   │   ├── pin.png
│   │   │   ├── placeholder-property.svg
│   │   │   ├── placeholder-room.svg
│   │   │   ├── icons/
│   │   │   │   ├── sidebar_hide.png
│   │   │   │   └── sidebar_show.png
│   │   │   └── public/                  # Public-facing marketing images
│   │   └── svg/
│   │       ├── apple-dark-logo.svg
│   │       └── google-icon-logo.svg
│   ├── components/                      # Shared HTML partials
│   │   ├── logo-cloud.html
│   │   ├── navbar.html
│   │   └── sidebar.html
│   ├── css/
│   │   ├── global.css
│   │   ├── components/
│   │   │   ├── accepted-applications-overlay.css
│   │   │   ├── application-modal.css
│   │   │   ├── logo-cloud.css
│   │   │   ├── navbar.css
│   │   │   ├── readonly-mode.css
│   │   │   ├── sidebar.css
│   │   │   └── status-banner.css
│   │   └── views/
│   │       ├── admin/
│   │       │   └── admin.css
│   │       ├── boarder/
│   │       │   ├── application-submitted.css
│   │       │   ├── boarder-announcements.css
│   │       │   ├── boarder-applications-dashboard.css
│   │       │   ├── boarder-applications.css
│   │       │   ├── boarder-documents.css
│   │       │   ├── boarder-find-a-room.css
│   │       │   ├── boarder-house-rules.css
│   │       │   ├── boarder-lease.css
│   │       │   ├── boarder-maintenance-create.css
│   │       │   ├── boarder-maintenance-detail.css
│   │       │   ├── boarder-maintenance.css
│   │       │   ├── boarder-messages.css
│   │       │   ├── boarder-payment-process.css
│   │       │   ├── boarder-payments.css
│   │       │   ├── boarder-settings.css
│   │       │   ├── boarder.css
│   │       │   ├── confirm-application.css
│   │       │   ├── confirm-booking.css
│   │       │   ├── maps.css
│   │       │   └── room-detail.css
│   │       ├── landlord/
│   │       │   ├── applications.css
│   │       │   ├── create-listing.css
│   │       │   ├── edit-listing.css
│   │       │   ├── edit-property.css
│   │       │   ├── landlord-activity.css
│   │       │   ├── landlord-announcements.css
│   │       │   ├── landlord-boarders.css
│   │       │   ├── landlord-calendar.css
│   │       │   ├── landlord-documents.css
│   │       │   ├── landlord-listings.css
│   │       │   ├── landlord-maintenance-detail.css
│   │       │   ├── landlord-maintenance.css
│   │       │   ├── landlord-messages.css
│   │       │   ├── landlord-payment-record.css
│   │       │   ├── landlord-payments.css
│   │       │   ├── landlord-reports.css
│   │       │   ├── landlord-settings.css
│   │       │   ├── landlord-verification.css
│   │       │   ├── landlord-welcome.css
│   │       │   ├── landlord.css
│   │       │   ├── maps.css
│   │       │   ├── onboarding.css
│   │       │   └── your-properties.css
│   │       └── public/
│   │           ├── auth/
│   │           │   ├── choose.css
│   │           │   └── signup-landlord.css
│   │           ├── auth.css
│   │           ├── find-a-room.css
│   │           ├── for-landlords.css
│   │           ├── haven-ai.css
│   │           ├── maps.css
│   │           ├── public.css
│   │           ├── team.css
│   │           └── tos.css
│   ├── js/
│   │   ├── config.js                    # Environment detection & API URL config
│   │   ├── main.js                      # Entry point - view router (data-view on body)
│   │   ├── auth/
│   │   │   ├── choose.js
│   │   │   ├── forgot-password.js
│   │   │   ├── login.js
│   │   │   ├── signup.js
│   │   │   └── verify-email.js
│   │   ├── components/
│   │   │   ├── accepted-applications-overlay.js
│   │   │   ├── logo-cloud.js
│   │   │   ├── navbar.js
│   │   │   └── sidebar.js
│   │   ├── shared/
│   │   │   ├── access-control.js
│   │   │   ├── auth-headers.js
│   │   │   ├── environment-check.js
│   │   │   ├── icons.js
│   │   │   ├── image-utils.js
│   │   │   ├── map-utils.js
│   │   │   ├── notifications.js
│   │   │   ├── permissions.js
│   │   │   ├── routing.js
│   │   │   ├── state.js                 # Auth helpers, API fetch wrapper
│   │   │   └── toast.js
│   │   └── views/
│   │       ├── admin/
│   │       │   ├── admin-dashboard.js
│   │       │   └── index.js
│   │       ├── boarder/
│   │       │   ├── access-control-init.js
│   │       │   ├── announcements.js
│   │       │   ├── application-submitted.js
│   │       │   ├── applications-dashboard.js
│   │       │   ├── applications.js
│   │       │   ├── boarder-find-a-room-auth.js
│   │       │   ├── boarder-find-a-room-init.js
│   │       │   ├── boarder-find-a-room.js
│   │       │   ├── boarder-maintenance.js
│   │       │   ├── boarder-maps-init.js
│   │       │   ├── boarder-payment-process.js
│   │       │   ├── boarder-payments-data.js
│   │       │   ├── boarder-payments.js
│   │       │   ├── boarder-room-detail-init.js
│   │       │   ├── confirm-application.js
│   │       │   ├── confirm-booking.js
│   │       │   ├── dashboard-map.js
│   │       │   ├── dashboard.js
│   │       │   ├── documents.js
│   │       │   ├── house-rules.js
│   │       │   ├── index.js
│   │       │   ├── lease.js
│   │       │   ├── messages.js
│   │       │   ├── payments-page.js
│   │       │   ├── room-detail.js
│   │       │   ├── settings.js
│   │       │   └── status.js
│   │       ├── landlord/
│   │       │   ├── activity.js
│   │       │   ├── announcements.js
│   │       │   ├── applications.js
│   │       │   ├── create-listing.js
│   │       │   ├── documents.js
│   │       │   ├── edit-listing.js
│   │       │   ├── edit-property.js
│   │       │   ├── index.js
│   │       │   ├── landlord-applications.js
│   │       │   ├── landlord-boarders.js
│   │       │   ├── landlord-calendar.js
│   │       │   ├── landlord-listings.js
│   │       │   ├── landlord-payment-record.js
│   │       │   ├── landlord-payments.js
│   │       │   ├── landlord.js
│   │       │   ├── maps.js
│   │       │   ├── messages.js
│   │       │   ├── my-properties.js
│   │       │   ├── onboarding.js
│   │       │   ├── reports.js
│   │       │   ├── settings.js
│   │       │   ├── verification.js
│   │       │   ├── welcome-message.js
│   │       │   └── your-properties.js
│   │       └── public/
│   │           ├── auth/
│   │           │   └── signup-landlord.js
│   │           ├── find-a-room.js
│   │           ├── haven-ai.js
│   │           ├── index.js
│   │           ├── maps.js
│   │           ├── public-find-a-room.js
│   │           └── room-detail.js
│   └── views/
│       ├── admin/
│       │   └── index.html
│       ├── boarder/
│       │   ├── index.html
│       │   ├── announcements/index.html
│       │   ├── application-submitted/index.html
│       │   ├── applications/index.html
│       │   ├── applications-dashboard/index.html
│       │   ├── confirm-booking/index.html
│       │   ├── find-a-room/
│       │   │   ├── confirm-application.html
│       │   │   ├── detail.html
│       │   │   └── index.html
│       │   ├── house-rules/index.html
│       │   ├── lease/index.html
│       │   ├── maps/index.html
│       │   ├── messages/index.html
│       │   ├── payments/
│       │   │   ├── index.html
│       │   │   └── pay.html
│       │   ├── rooms/detail.html
│       │   └── settings/index.html
│       ├── landlord/
│       │   ├── index.html
│       │   ├── onboarding.html
│       │   ├── activity/index.html
│       │   ├── announcements/index.html
│       │   ├── applications/index.html
│       │   ├── boarders/index.html
│       │   ├── calendar/index.html
│       │   ├── listings/
│       │   │   ├── create.html
│       │   │   ├── edit.html
│       │   │   └── index.html
│       │   ├── maps/index.html
│       │   ├── messages/index.html
│       │   ├── myproperties/index.html
│       │   ├── payments/
│       │   │   ├── index.html
│       │   │   └── record.html
│       │   ├── reports/index.html
│       │   ├── settings/index.html
│       │   └── verification/index.html
│       └── public/
│           ├── find-a-room.html
│           ├── for-landlords.html
│           ├── haven-ai.html
│           ├── index.html
│           ├── maps.html
│           ├── privacy-policy.html
│           ├── public-maps.html
│           ├── team.html
│           ├── terms-of-service.html
│           ├── user-agreement.html
│           ├── auth/
│           │   ├── choose.html
│           │   ├── forgot-password.html
│           │   ├── login.html
│           │   ├── signup-landlord.html
│           │   ├── signup.html
│           │   └── verify-email.html
│           └── rooms/
│               └── detail.html
├── dist/                                # Production build output (flattened)
├── docs/
│   ├── MYSQL_SETUP.md
│   ├── TODO.md
│   └── plan.md
├── scripts/
│   ├── build.js                         # Production build (flattens client/ → dist/)
│   ├── clear_user.php
│   ├── list_users.php
│   ├── reset-database.php
│   ├── setup-database.php
│   ├── start-apache.php
│   └── start-mysql.php
├── server/                              # Backend (PHP 8.2 + MySQL)
│   ├── router.php                       # Unified router (frontend + API)
│   ├── Dockerfile
│   ├── composer.json
│   ├── .env.example
│   ├── api/
│   │   ├── routes.php                   # Router class + route definitions
│   │   ├── middleware.php               # JWT auth middleware
│   │   ├── cors.php                     # CORS configuration
│   │   ├── health.php
│   │   ├── admin/
│   │   │   ├── applications.php
│   │   │   ├── landlords.php
│   │   │   ├── properties.php
│   │   │   ├── reports.php
│   │   │   ├── settings.php
│   │   │   ├── summary.php
│   │   │   └── users.php
│   │   ├── auth/
│   │   │   ├── login.php
│   │   │   ├── logout.php
│   │   │   ├── me.php
│   │   │   ├── refresh-token.php
│   │   │   ├── register.php
│   │   │   ├── resend-verification.php
│   │   │   ├── verification-status.php
│   │   │   ├── verify-email.php
│   │   │   └── google/                  # Google OAuth callback handlers
│   │   ├── boarder/
│   │   │   ├── announcements.php
│   │   │   ├── dashboard-stats.php
│   │   │   ├── lease.php
│   │   │   └── saved-listings.php
│   │   ├── geocode/
│   │   │   └── search.php
│   │   ├── landlord/
│   │   │   ├── activity.php
│   │   │   ├── announcements.php
│   │   │   ├── boarders.php
│   │   │   ├── calendar.php
│   │   │   ├── create-listing.php
│   │   │   ├── dashboard-stats.php
│   │   │   ├── listing-photos.php
│   │   │   ├── payment-methods.php
│   │   │   ├── payment-overview.php
│   │   │   ├── payment-summary.php
│   │   │   ├── payments.php
│   │   │   ├── profile.php
│   │   │   ├── properties.php
│   │   │   ├── property-location.php
│   │   │   ├── reports.php
│   │   │   ├── update-listing.php
│   │   │   ├── upload-photos.php
│   │   │   ├── upload-verification-document.php
│   │   │   ├── verification-status.php
│   │   │   └── welcome-settings.php
│   │   ├── payments/
│   │   │   ├── history.php
│   │   │   ├── methods.php
│   │   │   └── overview.php
│   │   ├── properties/
│   │   │   └── all.php
│   │   ├── rooms/
│   │   │   ├── detail.php
│   │   │   ├── popular-locations.php
│   │   │   └── public.php
│   │   └── users/
│   │       ├── avatar.php
│   │       ├── profile.php
│   │       └── search.php
│   ├── config/
│   │   ├── app.php
│   │   ├── database.php
│   │   └── google.php
│   ├── database/
│   │   ├── schema.sql                   # Full MySQL schema
│   │   ├── migrate.php
│   │   ├── migrations/                  # 017 migration files (001–017)
│   │   └── seeds/
│   ├── src/                             # PHP source (PSR-4: App\)
│   │   ├── Core/
│   │   │   ├── bootstrap.php
│   │   │   ├── Env.php
│   │   │   ├── Auth/
│   │   │   │   ├── GoogleOAuth.php
│   │   │   │   ├── JWT.php
│   │   │   │   └── RateLimiter.php
│   │   │   ├── Database/
│   │   │   │   └── Connection.php
│   │   │   └── Upload/
│   │   │       ├── UploadController.php
│   │   │       └── UploadHandler.php
│   │   ├── Modules/
│   │   │   ├── Application/             # Controllers, Repositories, Services
│   │   │   ├── Maintenance/             # Controllers, Repositories, Services
│   │   │   ├── Message/                 # Controllers, Entities, Repositories, Services
│   │   │   ├── Notification/            # Controllers, Helpers, Repositories, Services
│   │   │   ├── Onboarding/              # Controllers, Entities, Helpers, Repositories, Services
│   │   │   └── Payment/                 # Repositories, Services
│   │   └── Shared/
│   │       └── Helpers/
│   │           └── ResponseHelper.php
│   └── storage/
│       └── properties/                  # Uploaded property photos
├── storage/
│   └── uploads/
├── docker-compose.yml
├── package.json
├── render.yaml
├── commitlint.config.js
├── .eslintrc.json
├── .prettierrc
└── AGENTS.md
```

## WHERE TO LOOK

| Task               | Location                     | Notes                                                                |
| ------------------ | ---------------------------- | -------------------------------------------------------------------- |
| Add public page    | `client/views/public/`       | Auth flows in `client/js/auth/`                                      |
| Add dashboard view | `client/js/views/{role}/`    | Role: boarder, landlord, admin                                       |
| API endpoint       | `server/api/{module}/`       | Routes defined in `server/api/routes.php`                            |
| Styling            | `client/css/views/{role}/`   | Per-role CSS files                                                   |
| DB schema          | `server/database/schema.sql` | MySQL schema + migrations                                            |
| Shared utilities   | `client/js/shared/state.js`  | Auth helpers, API fetch wrapper                                      |
| PHP core logic     | `server/src/`                | PSR-4 autoloaded (App\ namespace)                                    |
| PHP modules        | `server/src/Modules/`        | Application, Maintenance, Message, Notification, Onboarding, Payment |
| Environment config | `server/.env.example`        | Database credentials, API keys                                       |

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

## LOCAL DEVELOPMENT SERVER

The frontend is served by **Apache on port 80** (already running — no need to start it or open ports manually).

When using Playwright MCP or browser automation, always use:

```
http://localhost/views/<page>
```

**Never** use `localhost:8000` (PHP API server) or `localhost:3000` (Node dev server) for frontend pages.

Examples:

- `http://localhost/views/public/index.html`
- `http://localhost/views/public/auth/login.html`
- `http://localhost/views/boarder/boarder.html`
- `http://localhost/views/landlord/landlord.html`

The PHP API is still at `http://localhost:8000` but only for direct API calls, not page navigation.

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

## TROUBLESHOOTING

**`bun run db:setup` fails with "could not find driver"**

PHP's `pdo_mysql` extension is not enabled. Fix for local Windows PHP install at `C:\php`:

1. If `C:\php\php.ini` doesn't exist, copy from the template:
   ```powershell
   Copy-Item C:\php\php.ini-development C:\php\php.ini
   ```
2. Enable the extensions in `php.ini`:
   ```powershell
   (Get-Content C:\php\php.ini) -replace ';extension=pdo_mysql', 'extension=pdo_mysql' -replace ';extension=mysqli', 'extension=mysqli' | Set-Content C:\php\php.ini
   ```
3. Verify it's loaded:
   ```powershell
   php -m | Select-String -Pattern "pdo_mysql"
   ```
4. Re-run `bun run db:setup`
