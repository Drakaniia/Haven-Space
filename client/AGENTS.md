# Client

## Package Identity

- `client/` contains the browser app served from Apache/XAMPP: HTML views, CSS, static components, and ES module JavaScript.
- There is no frontend framework. Routing is page-based and initialization flows through [main.js](/C:/Users/Qwenzy/Desktop/haven-space/client/js/main.js).

## Setup & Run

- Frontend base URL: `http://localhost`
- Production/debug URL: `https://haven-space.appwrite.network`
- Lint JS: `bun run lint`
- Format touched files: `bun run format`
- Build deployable static output: `bun run build`
- Read frontend design guidance before UI work: [DESIGN.md](/C:/Users/Qwenzy/Desktop/haven-space/DESIGN.md)

## Patterns & Conventions

- Treat [client/js/main.js](/C:/Users/Qwenzy/Desktop/haven-space/client/js/main.js) as the entry router. New page logic should be wired through a `data-view` branch there or through an existing page module.
- Keep reusable UI behavior in `client/js/components/` and shared browser helpers in `client/js/shared/`.
- Put role/page logic under `client/js/views/<role>/`; mirror the HTML structure under `client/views/<role>/` and CSS under `client/css/views/<role>/`.
- Use the shared auth/network helpers before inventing new request wrappers. Start with [client/js/shared/state.js](/C:/Users/Qwenzy/Desktop/haven-space/client/js/shared/state.js), [auth-check.js](/C:/Users/Qwenzy/Desktop/haven-space/client/js/shared/auth-check.js), and [auth-sync.js](/C:/Users/Qwenzy/Desktop/haven-space/client/js/shared/auth-sync.js).
- Reuse centralized icons from [client/js/shared/icons.js](/C:/Users/Qwenzy/Desktop/haven-space/client/js/shared/icons.js) instead of scattering inline SVG strings.
- **New Icons**: Add new icons as SVG files in `client/assets/svg/` directory. The icon system now prioritizes SVG files over path data for better maintainability and easier updates.
- **Direct SVG Usage**: For simple cases, you can directly include SVG files in HTML using `<img src="../../../assets/svg/icon-name.svg">` or inline the SVG content, following the pattern used in sidebar components.
- DO: follow the component injection and path-resolution pattern from [client/js/components/sidebar.js](/C:/Users/Qwenzy/Desktop/haven-space/client/js/components/sidebar.js).
- DO: follow the view bootstrap style from [client/js/views/public/index.js](/C:/Users/Qwenzy/Desktop/haven-space/client/js/views/public/index.js) or the role initializers imported by `main.js`.
- DO: keep page styles in the matching CSS tree, for example [client/css/views/public/public.css](/C:/Users/Qwenzy/Desktop/haven-space/client/css/views/public/public.css).
- DON'T: add more large inline page controllers inside HTML files like [client/views/boarder/settings/index.html](/C:/Users/Qwenzy/Desktop/haven-space/client/views/boarder/settings/index.html); prefer moving logic into `client/js/views/...`.
- DON'T: duplicate auth header logic beside files like [client/js/shared/auth-headers.js](/C:/Users/Qwenzy/Desktop/haven-space/client/js/shared/auth-headers.js) and `state.js`; extend shared code instead.
- When touching UI/UX, preserve the existing product tone and check relative asset paths because the build script rewrites them for `dist/`.

## Key Files

- Entry router: [client/js/main.js](/C:/Users/Qwenzy/Desktop/haven-space/client/js/main.js)
- Environment config: [client/js/config.js](/C:/Users/Qwenzy/Desktop/haven-space/client/js/config.js)
- Appwrite browser SDK setup: [client/js/appwrite.js](/C:/Users/Qwenzy/Desktop/haven-space/client/js/appwrite.js)
- Shared state/auth fetch logic: [client/js/shared/state.js](/C:/Users/Qwenzy/Desktop/haven-space/client/js/shared/state.js)
- Shared icons: [client/js/shared/icons.js](/C:/Users/Qwenzy/Desktop/haven-space/client/js/shared/icons.js)
- Reusable sidebar component: [client/js/components/sidebar.js](/C:/Users/Qwenzy/Desktop/haven-space/client/js/components/sidebar.js)
- Global CSS imports and tokens: [client/css/global.css](/C:/Users/Qwenzy/Desktop/haven-space/client/css/global.css)
- Build path-rewrite logic: [scripts/build.js](/C:/Users/Qwenzy/Desktop/haven-space/scripts/build.js)

## JIT Index Hints

- Find page initializers: `rg -n "export function init|export async function init" client/js/views client/js/components`
- Find API calls from the browser: `rg -n "fetch\\(" client/js`
- Find shared localStorage usage: `rg -n "localStorage\\." client/js/shared client/js/components client/js/views`
- Find a view by role or feature: `rg --files client/views client/js/views client/css/views | rg "boarder|landlord|admin|public"`
- Find inline scripts to extract: `rg -n "document.addEventListener\\('DOMContentLoaded'|<script type=\"module\">" client/views`

## Common Gotchas

- `http://localhost` serves the frontend, while many JS modules talk to `http://localhost:8000`; keep both local and production URLs working.
- `scripts/build.js` rewrites paths for `dist/`, so hardcoded relative paths can break production even if localhost works.
- Authentication state is spread across `token`, `user`, `user_id`, and related flags in `localStorage`; changes usually need to stay consistent across all shared auth utilities.

## Pre-PR Checks

`bun run lint && bun run format:check && bun run build`
