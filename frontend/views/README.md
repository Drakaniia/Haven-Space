# Haven Space - Views

HTML view templates organized by user role and feature.

## Directory Structure

```
views/
├── admin/               # Admin dashboard views
│   └── index.html       # Admin dashboard home
├── boarder/             # Boarder dashboard views
│   ├── index.html       # Boarder dashboard home
│   ├── applications/    # Rental applications
│   │   ├── index.html   # Application list
│   │   └── detail.html  # Application details
│   ├── maintenance/     # Maintenance requests
│   │   ├── index.html   # Request list
│   │   └── create.html  # Create new request
│   ├── messages/        # Messaging system
│   │   └── index.html   # Message inbox
│   ├── notices/         # Notices and announcements
│   │   └── index.html   # Notice board
│   ├── payments/        # Payment management
│   │   ├── index.html   # Payment history
│   │   └── pay.html     # Make a payment
│   ├── profile/         # User profile
│   │   └── index.html   # Profile settings
│   └── rooms/           # Room browsing
│       ├── index.html   # Room listings
│       └── detail.html  # Room details
├── landlord/            # Landlord dashboard views
│   ├── index.html       # Landlord dashboard home
│   ├── applications/    # Application management
│   │   ├── index.html   # Application list
│   │   └── detail.html  # Application review
│   ├── boarders/        # Boarder management
│   │   ├── index.html   # Boarder list
│   │   └── detail.html  # Boarder details
│   ├── listings/        # Property listings
│   │   ├── index.html   # Listing list
│   │   ├── create.html  # Create new listing
│   │   └── edit.html    # Edit listing
│   ├── maintenance/     # Maintenance tracking
│   │   ├── index.html   # Maintenance list
│   │   └── detail.html  # Maintenance details
│   ├── messages/        # Messaging system
│   │   └── index.html   # Message inbox
│   ├── payments/        # Payment tracking
│   │   ├── index.html   # Payment records
│   │   └── record.html  # Record a payment
│   ├── profile/         # User profile
│   │   └── index.html   # Profile settings
│   └── reports/         # Reports and analytics
│       └── index.html   # Analytics dashboard
└── public/              # Public-facing views
    ├── index.html       # Homepage/landing page
    ├── maps.html        # Interactive map view
    └── auth/            # Authentication pages
        ├── login.html           # Login page
        ├── signup.html          # Signup page
        └── forgot-password.html # Password recovery
```

## View Routes

| View                   | URL Path                                            | Description                |
| ---------------------- | --------------------------------------------------- | -------------------------- |
| **Public**             |
| Homepage               | `/frontend/views/public/`                           | Public landing page        |
| Maps                   | `/frontend/views/public/maps.html`                  | Property map view          |
| Login                  | `/frontend/views/public/auth/login.html`            | User login                 |
| Signup                 | `/frontend/views/public/auth/signup.html`           | User registration          |
| Forgot Password        | `/frontend/views/public/auth/forgot-password.html`  | Password recovery          |
| **Boarder Dashboard**  |
| Dashboard Home         | `/frontend/views/boarder/`                          | Boarder dashboard          |
| Rooms                  | `/frontend/views/boarder/rooms/`                    | Browse rooms               |
| Room Detail            | `/frontend/views/boarder/rooms/detail.html`         | View room details          |
| Applications           | `/frontend/views/boarder/applications/`             | Manage applications        |
| Application Detail     | `/frontend/views/boarder/applications/detail.html`  | View application status    |
| Payments               | `/frontend/views/boarder/payments/`                 | Payment management         |
| Make Payment           | `/frontend/views/boarder/payments/pay.html`         | Process payment            |
| Maintenance            | `/frontend/views/boarder/maintenance/`              | Maintenance requests       |
| Create Request         | `/frontend/views/boarder/maintenance/create.html`   | Submit maintenance request |
| Messages               | `/frontend/views/boarder/messages/`                 | Messaging inbox            |
| Notices                | `/frontend/views/boarder/notices/`                  | View announcements         |
| Profile                | `/frontend/views/boarder/profile/`                  | User profile settings      |
| **Landlord Dashboard** |
| Dashboard Home         | `/frontend/views/landlord/`                         | Landlord dashboard         |
| Listings               | `/frontend/views/landlord/listings/`                | Manage properties          |
| Create Listing         | `/frontend/views/landlord/listings/create.html`     | Add new property           |
| Edit Listing           | `/frontend/views/landlord/listings/edit.html`       | Modify property            |
| Boarders               | `/frontend/views/landlord/boarders/`                | Manage boarders            |
| Boarder Detail         | `/frontend/views/landlord/boarders/detail.html`     | View boarder info          |
| Applications           | `/frontend/views/landlord/applications/`            | Review applications        |
| Application Detail     | `/frontend/views/landlord/applications/detail.html` | Review application         |
| Payments               | `/frontend/views/landlord/payments/`                | Track payments             |
| Record Payment         | `/frontend/views/landlord/payments/record.html`     | Record received payment    |
| Maintenance            | `/frontend/views/landlord/maintenance/`             | View maintenance requests  |
| Maintenance Detail     | `/frontend/views/landlord/maintenance/detail.html`  | Request details            |
| Messages               | `/frontend/views/landlord/messages/`                | Messaging inbox            |
| Reports                | `/frontend/views/landlord/reports/`                 | Analytics and reports      |
| Profile                | `/frontend/views/landlord/profile/`                 | User profile settings      |
| **Admin**              |
| Dashboard              | `/frontend/views/admin/`                            | Admin dashboard            |

## Component Usage

Views use reusable components from the `/components/` directory:

```html
<!-- Include sidebar component -->
<div id="sidebar-container"></div>
<script>
  fetch('/components/sidebar.html')
    .then(r => r.text())
    .then(html => {
      document.getElementById('sidebar-container').innerHTML = html;
    });
</script>
```

## Styling

Each view has corresponding CSS in `/css/views/`:

- Boarder views → `/css/views/boarder/`
- Landlord views → `/css/views/landlord/`
- Public views → `/css/views/public/`
- Admin views → `/css/views/admin/`

## JavaScript

Each view has corresponding JS modules in `/js/views/`:

- Boarder views → `/js/views/boarder/`
- Landlord views → `/js/views/landlord/`
- Public views → `/js/views/public/`
- Admin views → `/js/views/admin/`

## Layout Structure

All views follow a consistent layout structure:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Page Title | Haven Space</title>
    <link rel="stylesheet" href="../../css/global.css" />
    <link rel="stylesheet" href="../../css/views/[view]/[page].css" />
  </head>
  <body>
    <!-- Sidebar Navigation -->
    <div id="sidebar-container"></div>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Page content here -->
    </main>

    <script type="module" src="../../js/main.js"></script>
    <script type="module" src="../../js/views/[view]/[page].js"></script>
  </body>
</html>
```
