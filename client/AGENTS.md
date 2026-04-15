# Haven Space - Frontend

**Directory:** `client/`
**Stack:** Vanilla HTML5, CSS3, ES6+ (no frameworks)

## OVERVIEW

Public pages + role-based dashboards (boarder, landlord, admin). ES modules, dynamic imports, no build step for dev.

## STRUCTURE

```
client/
├── index.html              # Redirects to views/public/
├── assets/                 # Images, SVGs, fonts
├── components/             # Reusable HTML partials
├── css/
│   ├── global.css          # Variables, reset, base styles
│   ├── components/          # Sidebar, logo-cloud, etc.
│   └── views/{role}/        # Per-dashboard styles
├── js/
│   ├── main.js              # Entry point - view router
│   ├── auth/                # Login, signup, forgot-password
│   ├── components/          # Component initializers
│   ├── shared/state.js      # Auth, API fetch, utilities
│   └── views/{role}/        # Dashboard logic
└── views/
    ├── public/              # Landing, maps, auth pages
    ├── boarder/             # Boarder dashboard
    ├── landlord/            # Landlord dashboard
    └── admin/               # Admin dashboard
```

## WHERE TO LOOK

| Task             | Location                          |
| ---------------- | --------------------------------- |
| Public page HTML | `client/views/public/`            |
| Dashboard JS     | `client/js/views/{role}/index.js` |
| Dashboard HTML   | `client/views/{role}/`            |
| Role styles      | `client/css/views/{role}/`        |
| Global styles    | `client/css/global.css`           |
| Auth logic       | `client/js/auth/`                 |
| API state        | `client/js/shared/state.js`       |

## CONVENTIONS

- **Entry detection**: `body[data-view]` attribute determines dashboard type
- **Dynamic imports**: Dashboard modules loaded on-demand (isolation)
- **View init**: Each view exports `init{Role}Dashboard()` or `initPublicViews()`
- **CSS variables**: All colors/spacing in `global.css` as `--var-name`
- **Class naming**: BEM-like pattern (`.block__element--modifier`)
- **Roles**: `public`, `boarder`, `landlord`, `admin`

## ANTI-PATTERNS

- ❌ No frameworks (no React/Vue/Angular)
- ❌ No CSS preprocessors (plain CSS only)
- ❌ No module bundler in dev (native ES modules)
- ❌ No TypeScript (plain JS with JSDoc optional)

## COMMANDS

```bash
# Serve (any static server works)
npx http-server client -p 3000
python -m http.server 3000 --directory client
bun run --hot  # Bun dev server
```
