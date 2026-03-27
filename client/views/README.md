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

| View                   | URL Path                                          | Description                |
| ---------------------- | ------------------------------------------------- | -------------------------- |
| **Public**             |
| Homepage               | `/client/views/public/`                           | Public landing page        |
| Maps                   | `/client/views/public/maps.html`                  | Property map view          |
| Login                  | `/client/views/public/auth/login.html`            | User login                 |
| Signup                 | `/client/views/public/auth/signup.html`           | User registration          |
| Forgot Password        | `/client/views/public/auth/forgot-password.html`  | Password recovery          |
| **Boarder Dashboard**  |
| Dashboard Home         | `/client/views/boarder/`                          | Boarder dashboard          |
| Rooms                  | `/client/views/boarder/rooms/`                    | Browse rooms               |
| Room Detail            | `/client/views/boarder/rooms/detail.html`         | View room details          |
| Applications           | `/client/views/boarder/applications/`             | Manage applications        |
| Application Detail     | `/client/views/boarder/applications/detail.html`  | View application status    |
| Payments               | `/client/views/boarder/payments/`                 | Payment management         |
| Make Payment           | `/client/views/boarder/payments/pay.html`         | Process payment            |
| Maintenance            | `/client/views/boarder/maintenance/`              | Maintenance requests       |
| Create Request         | `/client/views/boarder/maintenance/create.html`   | Submit maintenance request |
| Messages               | `/client/views/boarder/messages/`                 | Messaging inbox            |
| Notices                | `/client/views/boarder/notices/`                  | View announcements         |
| Profile                | `/client/views/boarder/profile/`                  | User profile settings      |
| **Landlord Dashboard** |
| Dashboard Home         | `/client/views/landlord/`                         | Landlord dashboard         |
| Listings               | `/client/views/landlord/listings/`                | Manage properties          |
| Create Listing         | `/client/views/landlord/listings/create.html`     | Add new property           |
| Edit Listing           | `/client/views/landlord/listings/edit.html`       | Modify property            |
| Boarders               | `/client/views/landlord/boarders/`                | Manage boarders            |
| Boarder Detail         | `/client/views/landlord/boarders/detail.html`     | View boarder info          |
| Applications           | `/client/views/landlord/applications/`            | Review applications        |
| Application Detail     | `/client/views/landlord/applications/detail.html` | Review application         |
| Payments               | `/client/views/landlord/payments/`                | Track payments             |
| Record Payment         | `/client/views/landlord/payments/record.html`     | Record received payment    |
| Maintenance            | `/client/views/landlord/maintenance/`             | View maintenance requests  |
| Maintenance Detail     | `/client/views/landlord/maintenance/detail.html`  | Request details            |
| Messages               | `/client/views/landlord/messages/`                | Messaging inbox            |
| Reports                | `/client/views/landlord/reports/`                 | Analytics and reports      |
| Profile                | `/client/views/landlord/profile/`                 | User profile settings      |
| **Admin**              |
| Dashboard              | `/client/views/admin/`                            | Admin dashboard            |

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
