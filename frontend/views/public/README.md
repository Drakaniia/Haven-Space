# Public Views

Public-facing views accessible without authentication.

## Directory Structure

```
public/
├── index.html           # Homepage/landing page
├── maps.html            # Interactive map view
└── auth/                # Authentication pages
    ├── login.html           # Login page
    ├── signup.html          # Signup page
    └── forgot-password.html # Password recovery
```

## Pages

### Homepage

**File:** `index.html`

Public landing page featuring:

- Hero section with call-to-action
- Feature highlights
- Logo cloud (partner/investor showcase)
- Navigation to auth pages

### Maps

**File:** `maps.html`

Interactive map view for browsing properties by location.

### Authentication

#### Login

**File:** `auth/login.html`

User login with email/password or social sign-in (Google, Apple).

#### Signup

**File:** `auth/signup.html`

New user registration with role selection (landlord/boarder).

#### Forgot Password

**File:** `auth/forgot-password.html`

Password recovery flow with email-based reset.

## Related Files

- **CSS:** `/css/views/public/`
- **JavaScript:** `/js/views/public/` (reserved), `/js/auth/`
