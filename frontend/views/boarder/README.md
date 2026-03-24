# Boarder Views

Boarder dashboard views for managing rental experience.

## Directory Structure

```
boarder/
├── index.html           # Dashboard home
├── applications/        # Rental applications
│   ├── index.html       # Application list
│   └── detail.html      # Application details
├── maintenance/         # Maintenance requests
│   ├── index.html       # Request list
│   └── create.html      # Create new request
├── messages/            # Messaging system
│   └── index.html       # Message inbox
├── notices/             # Notices and announcements
│   └── index.html       # Notice board
├── payments/            # Payment management
│   ├── index.html       # Payment history
│   └── pay.html         # Make a payment
├── profile/             # User profile
│   └── index.html       # Profile settings
└── rooms/               # Room browsing
    ├── index.html       # Room listings
    └── detail.html      # Room details
```

## Pages

### Dashboard Home

**File:** `index.html`

Main boarder dashboard with overview of:

- Current room/rental status
- Upcoming payments
- Recent notifications
- Quick actions

### Rooms

**Files:** `rooms/index.html`, `rooms/detail.html`

Browse available rooms and view detailed information about specific properties.

### Applications

**Files:** `applications/index.html`, `applications/detail.html`

Submit new rental applications and track the status of existing applications.

### Payments

**Files:** `payments/index.html`, `payments/pay.html`

View payment history, upcoming dues, and process rent payments.

### Maintenance

**Files:** `maintenance/index.html`, `maintenance/create.html`

Submit maintenance requests and track their resolution status.

### Messages

**File:** `messages/index.html`

Communicate with landlords and property managers.

### Notices

**File:** `notices/index.html`

View announcements from landlords and property management.

### Profile

**File:** `profile/index.html`

Manage user profile settings, contact information, and preferences.

## Related Files

- **CSS:** `/css/views/boarder/`
- **JavaScript:** `/js/views/boarder/`
