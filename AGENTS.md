# Haven Space - Project Knowledge Base

**Generated:** 2026-04-15
**Commit:** 1cf6aff
**Branch:** feat/landlord-dashboard-enhancements

## OVERVIEW

Boarding house rental platform connecting boarders with verified landlords in the Philippines. Dual-stack: Vanilla JS/HTML/CSS frontend + PHP REST API backend.

## STRUCTURE

```
haven-space/
├── client/            # Frontend (JS/HTML/CSS)
├── server/            # Backend (PHP API)
├── dist/              # Production build output
├── scripts/           # Build tooling
├── .github/workflows/ # CI/CD (GitHub Actions)
├── package.json       # Root Node manifest (build scripts)
└── docs/              # Documentation
```

## WHERE TO LOOK

| Task               | Location                     | Notes                           |
| ------------------ | ---------------------------- | ------------------------------- |
| Add public page    | `client/views/public/`       | Auth flows in `client/js/auth/` |
| Add dashboard view | `client/js/views/{role}/`    | Role: boarder, landlord, admin  |
| API endpoint       | `server/api/{module}/`       | REST structure in routes.php    |
| Styling            | `client/css/views/{role}/`   | Per-role CSS files              |
| DB schema          | `server/database/schema.sql` | MySQL migrations                |
| Shared utilities   | `client/js/shared/state.js`  | Auth helpers, API fetch         |

## CODE MAP

| Symbol       | Type     | Location                | Role                                 |
| ------------ | -------- | ----------------------- | ------------------------------------ |
| `main.js`    | entry    | `client/js/main.js`     | View router - detects dashboard type |
| `Router`     | class    | `server/api/routes.php` | Static route registry                |
| `index.html` | redirect | `client/`               | Routes to `views/public/`            |

## CONVENTIONS (THIS PROJECT)

- **ESLint**: `no-console: warn` (allows console.warn/error), `eqeqeq: error`, `no-var: error`
- **Prettier**: `singleQuote: true`, `trailingComma: es5`, `printWidth: 100`
- **Lint staged**: JS/JSX/TS/TSX → eslint --fix + prettier; HTML/CSS/MD/JSON → prettier
- **Git commits**: Conventional commits enforced (commitlint/config-conventional)
- **Phone format**: Philippine format `+63 9XX XXX XXXX` (see validation files)

## ANTI-PATTERNS (THIS PROJECT)

- ❌ Do NOT use `var` - use `const`/`let`
- ❌ Do NOT use `==` - use `===` everywhere
- ❌ Do NOT commit `.env` files
- ❌ Do NOT use `latest` Docker base images
- ❌ Do NOT lint node_modules or dist folders

## UNIQUE STYLES

- **PHP backend**: Separate `server/` directory, not typical Node backend
- **Dual dashboard**: Boarder and Landlord roles with separate views
- **Static serving**: PHP router serves both frontend and API
- **Final/dist split**: Production output in `Final/dist/`, not root `dist/`
- **ES modules**: Frontend uses native ES modules, no bundler

## COMMANDS

```bash
# Development
bun run start          # Build + serve frontend
npm run server        # PHP API server (localhost:8000)
npm run client        # Apache frontend server

# Database
npm run db:setup      # Create + migrate database
npm run db:seed       # Seed sample data
npm run db:reset      # Reset database

# Code quality
npm run format        # Format all files
npm run format:check  # Check formatting
npm run lint          # ESLint client/js/**
npm run lint:fix      # ESLint + fix

# Build
npm run build         # Production build to Final/dist
```

## NOTES

- Frontend redirects from `/` → `/views/public/` via meta refresh
- API routes: `/auth/*` → `server/api/auth/*`, `/api/*` → `server/api/*`
- Production deploys to GitHub Pages via `.github/workflows/github-pages.yml`
- PHP runs as built-in server for dev; Apache/Nginx for production
