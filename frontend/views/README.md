# Views

HTML views for different user roles and pages.

## Structure

```
views/
├── landing/         # Public landing page
│   └── index.html
├── landlord/        # Landlord dashboard
│   └── index.html
├── boarder/         # Boarder dashboard
│   └── index.html
└── admin/           # Admin dashboard
│   └── index.html
```

## Routes

| View     | URL Path                 | Description                  |
| -------- | ------------------------ | ---------------------------- |
| landing  | `/` or `/views/landing/` | Public homepage              |
| landlord | `/views/landlord/`       | Landlord property management |
| boarder  | `/views/boarder/`        | Boarder property browsing    |
| admin    | `/views/admin/`          | Admin system management      |

## Features

Each view includes:

- Navigation (loaded from `/partials/nav.html`)
- Header (loaded from `/partials/header.html`)
- Footer (loaded from `/partials/footer.html`)
- View-specific CSS from `/css/views/`
- View-specific JS from `/js/views/`

## Navigation

The app auto-detects the current view from the URL path and initializes the appropriate controller in `main.js`.
