# Haven Space

## Project Snapshot

- Single-repo boarding house platform deployed on Appwrite, with a vanilla frontend in `client/` and PHP backend/runtime code in `functions/`.
- Root tooling uses Bun for package tasks and formatting; PHP dependencies live under `functions/` and `functions/api/`.
- The frontend is served from `http://localhost`; the PHP API server is expected at `http://localhost:8000` and is already running in this environment.
- The production/debug URL for browser verification is `https://haven-space.appwrite.network`.
- This root file stays lightweight. Use the nearest guide before editing inside `client/`, `functions/`, or `functions/database/`.

## Root Setup Commands

- Install JS deps: `bun install`
- Install backend deps: `composer install --working-dir functions`
- Install Appwrite function deps: `composer install --working-dir functions/api`
- Format repo: `bun run format`
- Check formatting: `bun run format:check`
- Lint frontend JS: `bun run lint`
- Build deployable frontend: `bun run build`
- Run backend tests when available: `composer test --working-dir functions`

## Universal Conventions

- Use Bun commands for root package management and task running.
- Do not start `bun run server`; investigate logs or routing if `localhost:8000` is unhealthy.
- Keep frontend changes aligned with [DESIGN.md](/C:/Users/Qwenzy/Desktop/haven-space/DESIGN.md) and `/.agents/skills/frontend-design/SKILL.md`.
- Preserve the current split: static client assets in `client/`, request handling and business logic in `functions/`.
- Match existing naming and file placement before introducing new folders or abstractions.
- After feature work, add a small `.php` verification script only if needed for backend validation, then remove it once confirmed.
- Do not commit secrets, `.env` values, Appwrite API keys, or production-only identifiers.
- Push repo changes after finishing, because Appwrite deployment tracks the repository.
- **Icon System**: New icons should be added as SVG files in `client/assets/svg/` directory. The system now prioritizes SVG files over path data for better maintainability. icons.js is depricated remove whats referencing it.
- **Direct SVG Usage**: For simple icons, you can directly include SVG files in HTML using `<img src="../../../assets/svg/icon-name.svg">` or inline SVG, similar to the pattern used in sidebar components, icons.js is depricated remove whats referencing it. dont create new svgs, instead notify users if he needs to download that svg before proceeding

## JIT Index

### Package Structure

- Frontend app: `client/` -> [see client/AGENTS.md](/C:/Users/Qwenzy/Desktop/haven-space/client/AGENTS.md)
- Backend and API runtime: `functions/` -> [see functions/AGENTS.md](/C:/Users/Qwenzy/Desktop/haven-space/functions/AGENTS.md)
- SQL and Appwrite migrations: `functions/database/` -> [see functions/database/AGENTS.md](/C:/Users/Qwenzy/Desktop/haven-space/functions/database/AGENTS.md)

### Quick Find Commands

- Find a frontend view initializer: `rg -n "init[A-Z]" client/js/views client/js/components`
- Find a page by body view key: `rg -n "data-view" client/views`
- Find API routes: `rg -n "Router::(get|post|put|patch|delete)" functions/api/routes.php`
- Find a PHP controller/service pair: `rg -n "class .*Controller|class .*Service" functions/src`
- Find migrations or seeds: `rg --files functions/database | rg "(migrations|seeds|appwrite-migrations)"`

## Definition of Done

- Relevant lint, format, build, or PHP checks pass for the touched area, or any gap is called out explicitly.
- Changes work for localhost and do not obviously break the Appwrite-hosted production path.
- New work follows the closest AGENTS guide and uses existing repo patterns rather than parallel ones.
- Any temporary debug or test scripts created during implementation are removed before handoff.

## Bug Fix Documentation

Whenever a recurring bug appears across prompts, and a fix has been identified and implemented, the fix should be documented in AGENTS.md. This ensures that when a similar issue arises in the future, the solution is already recorded, helping to avoid repeating the same mistake.

### Fixed: Missing Authorization Headers in API Requests (2026-04-27)

**Problem**: Several frontend JavaScript files were making API requests without including the required Authorization header with JWT token, resulting in 401 Unauthorized errors.

**Root Cause**: The authentication system uses JWT tokens stored in `localStorage` with key `token` that must be sent as `Authorization: Bearer {token}` header in all API requests to protected endpoints.

**Files Affected**:

- `client/js/views/landlord/announcements.js` - All fetch requests missing auth headers
- `client/js/views/landlord/landlord-calendar.js` - Calendar API requests
- `client/js/views/landlord/activity.js` - Activity feed requests

**Solution Pattern**: Add authentication headers to all fetch requests:

```javascript
const token = localStorage.getItem('token');
const headers = { 'Content-Type': 'application/json' };
if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}

const response = await fetch(url, {
  method: 'GET/POST/PUT/DELETE',
  headers,
  credentials: 'include',
  // ... other options
});
```

**Prevention**: When adding new API calls, always check existing files like `landlord-boarders.js` or `my-properties.js` for the correct authentication pattern.

## landlord credentials

qwenzy23062@gmail.com
Kenjigwapo_123
