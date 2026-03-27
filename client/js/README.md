# Haven Space - JavaScript Modules

ES Modules for application logic and component initialization.

## Directory Structure

```
js/
├── main.js                  # Application entry point
├── auth/                    # Authentication logic
│   ├── login.js             # Login page functionality
│   ├── signup.js            # Signup page functionality
│   └── forgot-password.js   # Password recovery functionality
├── components/              # Reusable component initialization
│   ├── logo-cloud.js        # Infinite logo slider
│   └── sidebar.js           # Dashboard sidebar navigation
├── shared/                  # Shared utilities
│   └── state.js             # State management, auth helpers, API utilities
└── views/                   # View-specific logic (nested by type)
    ├── admin/
    │   └── admin.js
    ├── boarder/
    │   ├── boarder.js
    │   ├── boarder-applications.js
    │   ├── boarder-maintenance.js
    │   ├── boarder-payments.js
    │   └── boarder-rooms.js
    ├── landing/
    │   └── landing.js
    ├── landlord/
    │   ├── landlord.js
    │   ├── landlord-applications.js
    │   ├── landlord-listings.js
    │   ├── landlord-maintenance.js
    │   └── landlord-payments.js
    └── public/              # Reserved for public view logic
```

## Usage

Include in HTML as a module:

```html
<script type="module" src="./js/main.js"></script>
```

## Entry Point (`main.js`)

The main entry point initializes all components and handles global functionality:

```javascript
import { initLogoCloud } from './components/logo-cloud.js';
import { initSidebar } from './components/sidebar.js';

document.addEventListener('DOMContentLoaded', () => {
  initLogoCloud();
  initFloatingHeader();
  initSidebar({
    role: 'boarder',
    user: {
      name: 'Juan Dela Cruz',
      initials: 'JD',
      role: 'Boarder',
    },
  });
});
```

### Functions

| Function               | Description                                           |
| ---------------------- | ----------------------------------------------------- |
| `initLogoCloud()`      | Initializes the infinite logo slider animation        |
| `initSidebar(config)`  | Initializes dashboard sidebar with user configuration |
| `initFloatingHeader()` | Handles scroll-triggered header transition effects    |

## Modules

### Authentication (`auth/`)

| Module               | Description                                      |
| -------------------- | ------------------------------------------------ |
| `login.js`           | Login form handling, validation, social sign-in  |
| `signup.js`          | Signup form handling, role selection, validation |
| `forgot-password.js` | Password recovery flow, email submission         |

### Components (`components/`)

Reusable component initialization functions:

| Module          | Description                    | Exports               |
| --------------- | ------------------------------ | --------------------- |
| `logo-cloud.js` | Infinite logo slider animation | `initLogoCloud()`     |
| `sidebar.js`    | Dashboard sidebar navigation   | `initSidebar(config)` |

### Shared (`shared/`)

| Module     | Description                                                                     |
| ---------- | ------------------------------------------------------------------------------- |
| `state.js` | Application state, authentication helpers, API fetch wrapper, utility functions |

### Views (`views/`)

View-specific logic organized by dashboard type:

#### Admin (`views/admin/`)

| Module     | Description                   |
| ---------- | ----------------------------- |
| `admin.js` | Admin dashboard functionality |

#### Boarder (`views/boarder/`)

| Module                    | Description                                 |
| ------------------------- | ------------------------------------------- |
| `boarder.js`              | Boarder dashboard home                      |
| `boarder-rooms.js`        | Room browsing and details                   |
| `boarder-applications.js` | Rental application submission and tracking  |
| `boarder-payments.js`     | Payment viewing and processing              |
| `boarder-maintenance.js`  | Maintenance request submission and tracking |

#### Landing (`views/landing/`)

| Module       | Description                              |
| ------------ | ---------------------------------------- |
| `landing.js` | Landing page interactions and animations |

#### Landlord (`views/landlord/`)

| Module                     | Description                        |
| -------------------------- | ---------------------------------- |
| `landlord.js`              | Landlord dashboard home            |
| `landlord-listings.js`     | Property listing management (CRUD) |
| `landlord-applications.js` | Application review and management  |
| `landlord-payments.js`     | Payment tracking and recording     |
| `landlord-maintenance.js`  | Maintenance request management     |

## Module Pattern

Each module exports specific functions:

```javascript
// components/logo-cloud.js
export function initLogoCloud() {
  // Component initialization logic
}

// views/boarder/boarder-rooms.js
export function initBoarderRooms() {
  // View initialization logic
}
```

## Development

Run with a local server (ES modules require HTTP):

```bash
npx http-server client
# or
python -m http.server 3000
# or
bun run --hot
```

## Guidelines

- Use `const` by default, `let` for reassignable variables
- Use arrow functions for callbacks and anonymous functions
- Wrap DOM-dependent code in `DOMContentLoaded` listener
- Use descriptive variable and function names
- Keep modules focused on single responsibility
- Import only what you need from other modules
