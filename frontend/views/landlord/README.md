# Landlord Views

Landlord dashboard views for managing properties and boarders.

## Directory Structure

```
landlord/
├── index.html           # Dashboard home
├── applications/        # Application management
│   ├── index.html       # Application list
│   └── detail.html      # Application review
├── boarders/            # Boarder management
│   ├── index.html       # Boarder list
│   └── detail.html      # Boarder details
├── listings/            # Property listings
│   ├── index.html       # Listing list
│   ├── create.html      # Create new listing
│   └── edit.html        # Edit listing
├── maintenance/         # Maintenance tracking
│   ├── index.html       # Maintenance list
│   └── detail.html      # Maintenance details
├── messages/            # Messaging system
│   └── index.html       # Message inbox
├── payments/            # Payment tracking
│   ├── index.html       # Payment records
│   └── record.html      # Record a payment
├── profile/             # User profile
│   └── index.html       # Profile settings
└── reports/             # Reports and analytics
    └── index.html       # Analytics dashboard
```

## Pages

### Dashboard Home

**File:** `index.html`

Main landlord dashboard with overview of:

- Property portfolio summary
- Occupancy rates
- Recent activity
- Quick actions

### Listings

**Files:** `listings/index.html`, `listings/create.html`, `listings/edit.html`

Manage property listings including creating new listings, editing existing ones, and viewing all properties.

### Boarders

**Files:** `boarders/index.html`, `boarders/detail.html`

View and manage current boarders occupying your properties.

### Applications

**Files:** `applications/index.html`, `applications/detail.html`

Review and manage rental applications from prospective boarders.

### Payments

**Files:** `payments/index.html`, `payments/record.html`

Track rent payments and record received payments from boarders.

### Maintenance

**Files:** `maintenance/index.html`, `maintenance/detail.html`

View and manage maintenance requests from boarders.

### Messages

**File:** `messages/index.html`

Communicate with boarders and prospective tenants.

### Reports

**File:** `reports/index.html`

View analytics and reports on property performance, occupancy, and revenue.

### Profile

**File:** `profile/index.html`

Manage user profile settings, contact information, and business details.

## Related Files

- **CSS:** `/css/views/landlord/`
- **JavaScript:** `/js/views/landlord/`
