# AGENTS.md - Haven Space Developer Guide

This file provides critical context for agents working in this repository.

## Quick Commands

```bash
# Install deps
bun install

# Build production (outputs to dist/)
bun run build

# Serve frontend (opens browser)
bun run start

# Just serve without opening browser
bun run serve

# Format code
bun run format
bun run format:check   # verify only

# Lint JS
bun run lint
bun run lint:fix

# Run PHP backend (separate terminal)
cd server && php -S localhost:8000 -t api

# Database setup (requires MySQL running)
php scripts/setup-database.php
php scripts/setup-database.php --seed   # with sample data
php scripts/reset-database.php
```

## Technology Stack

| Layer      | Technology                              |
| ---------- | --------------------------------------- |
| Frontend   | Vanilla HTML5, CSS3, ES6+ JavaScript    |
| Build      | Bun + custom `scripts/build.js`         |
| Backend    | PHP 8.0+, Guzzle HTTP, Firebase/JWT     |
| Database   | MySQL 8.0                               |
| Deployment | GitHub Pages (auto-deploy on main push) |

## Architecture

**Frontend:** `client/views/{role}/{page}/index.html`

- Roles: `public/`, `admin/`, `boarder/`, `landlord/`
- Build flattens to `dist/{role}/{page}.html`

**Backend:** `server/api/` (PHP)

- API endpoints at `server/api/auth/`, `server/api/properties/`, etc.
- PSR-4 autoload: `App\` → `server/src/`

**Database:** MySQL via PHP PDO

- Schema: `server/database/schema.sql`
- Migrations: `server/database/migrations/*.sql`
- Setup: `php scripts/setup-database.php`

**Build Output:** `dist/` (auto-generated, gitignored)

## Environment Configuration

The app uses `.env` files with environment detection:

| Env          | Purpose             | DB             |
| ------------ | ------------------- | -------------- |
| `local`      | Development (XAMPP) | Local MySQL    |
| `production` | Live deployment     | Production SQL |

**Setup:**

```bash
# Local (XAMPP)
cp server/.env.xampp server/.env

# Production
cp server/.env.example server/.env
```

## Role-Based Access

- **Public** - Homepage, maps, auth pages
- **Boarder** - renter dashboard, applications, rooms
- **Landlord** - property owner dashboard, listings, boarders
- **Admin** - system admin

## Important Patterns

### File Structure for New Pages

```
client/views/{role}/{feature}/index.html
          └── {role}/{feature}.css   (role-specific)
client/js/views/{role}/{feature}.js
```

### Adding a New Role

1. Create folder in `client/views/{role}/`
2. Add to `roleFolders` array in `scripts/build.js` (lines 164-165)
3. Build outputs to `dist/{role}/`

### API Endpoint Pattern

```php
// server/api/endpoint-name/index.php
require_once __DIR__ . '/../api/middleware.php';
// endpoint logic
```

### Authentication

- JWT tokens in httpOnly cookies
- Refresh tokens for session extension
- Role stored in JWT payload

## Common Tasks

### Add a new frontend page

1. Create HTML in `client/views/{role}/{page}/index.html`
2. Add CSS to `client/css/views/{role}/{page}.css` (or inline)
3. Add JS to `client/js/views/{role}/{page}.js` (or inline)
4. Test: `bun run build && bun run serve`

### Fix database issues

```bash
php scripts/reset-database.php   # WARNING: deletes all data
php scripts/reset-database.php --force
php scripts/fix-rooms.php    # specific fix script
```

### Run both frontend and backend

```bash
# Terminal 1: Backend
cd server && php -S localhost:8000 -t api

# Terminal 2: Frontend
bun run start
```

## Gotchas

- **Use Bun**, not npm/yarn/pnpm
- **Build always** before testing production URLs
- **CORS** is environment-specific (check `server/.env`)
- **dist/ is gitignored** - don't edit files there
- **Database must exist** before running backend
- **PHP 8.0+** required (check extension: pdo_mysql, curl, json, mbstring, openssl)

## Documentation

- Project: [README.md](./README.md)
- Backend: [server/README.md](./server/README.md)
- Env setup: [docs/ENVIRONMENT_SETUP.md](./docs/ENVIRONMENT_SETUP.md)
