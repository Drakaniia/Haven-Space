# JavaScript Modules

ES Modules for application logic and view controllers.

## Structure

```
js/
├── main.js              # Entry point - auto-detects and initializes views
├── shared/
│   └── state.js         # Shared state, auth, API utilities
└── views/
    ├── landing.js       # Landing page controller
    ├── landlord.js      # Landlord dashboard controller
    ├── boarder.js       # Boarder dashboard controller
    └── admin.js         # Admin dashboard controller
```

## Usage

Include in HTML as a module:

```html
<script type="module" src="/js/main.js"></script>
```

## Modules

### `main.js`

- Auto-detects current view from URL path
- Initializes appropriate view controller
- Handles global events (theme toggle, navigation)

### `shared/state.js`

- Application state management
- Authentication helpers
- API fetch wrapper with auth
- Utility functions (date formatting)

### View Controllers

Each view module exports an `init` function:

- `initLandingView()`
- `initLandlordView()`
- `initBoarderView()`
- `initAdminView()`

## Development

Run with a local server (ES modules require HTTP):

```bash
npx serve frontend
# or
npx http-server frontend
```
