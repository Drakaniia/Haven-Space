# Haven Space - Backend API

## Overview

This is the backend API for Haven Space, built with PHP. It provides RESTful endpoints for the frontend application to interact with.

## Code Generation Guidelines

**When generating backend code, follow these principles:**

### 1. Keep It Simple

- Write straightforward, readable code
- Avoid unnecessary complexity or over-engineering
- Use clear, descriptive variable and function names
- One thing at a time - don't try to do too much in a single function

### 2. Prioritize Readability

- Use consistent formatting and indentation
- Add comments only when necessary to explain _why_, not _what_
- Keep functions short and focused (ideally under 30 lines)
- Avoid nested logic deeper than 2-3 levels

### 3. No Fancy Patterns Unless Needed

- Don't use design patterns just for the sake of using them
- Simple procedural code is better than complex abstractions
- Only introduce interfaces, traits, or abstract classes when there's a clear benefit

### 4. Database Queries

- Use simple, direct SQL queries
- Avoid complex joins when multiple simple queries work
- Use prepared statements for security
- Keep query logic in models, not controllers

### 5. Error Handling

- Use simple try-catch blocks where needed
- Return clear, consistent error messages
- Don't over-engineer error handling - handle expected errors, log unexpected ones

### 6. API Responses

- Use consistent JSON response format
- Keep response structures flat and simple
- Return only the data that's needed

### Example: Simple Controller

```php
// Good: Simple and clear
public function show($id) {
    $room = Room::find($id);

    if (!$room) {
        return json_response(404, ['error' => 'Room not found']);
    }

    return json_response(200, ['data' => $room]);
}

// Bad: Over-engineered
public function show($id) {
    return tap(Room::findOrFail($id), function($room) {
        return $this->transformResponse(
            $this->formatData(
                $this->applyFilters($room)
            )
        );
    });
}
```

## Project Structure

```
server/
├── api/                 # REST endpoints (auth, admin, landlord, geocode)
│   ├── auth/           # Login, register, logout, Google OAuth
│   ├── admin/          # Admin endpoints
│   ├── landlord/       # Landlord endpoints
│   └── routes.php      # Route definitions
├── config/             # App, auth, database, Google OAuth config
├── database/           # Schema, migrations, seeds
├── src/                # Core framework
│   └── Core/           # Auth (JWT, GoogleOAuth, Middleware), Database, HTTP
└── router.php          # Unified router (serves client + API)
```

## Getting Started

### Prerequisites

- PHP 8.0+
- MySQL or MariaDB
- Composer (for dependencies)

### Running the Server

```bash
# Start PHP server
php -S localhost:8000 -t server server/router.php

# Or use npm scripts
npm run server
```

## API Endpoints

### Authentication (`/auth/`)

- `POST /auth/login.php` - User login
- `POST /auth/register.php` - User registration
- `POST /auth/logout.php` - Logout user
- `GET /auth/me.php` - Get current user
- `POST /auth/refresh-token.php` - Refresh access token

### Google OAuth (`/auth/google/`)

- `GET /auth/google/authorize.php` - Initiate Google OAuth
- `GET /auth/google/callback.php` - Handle OAuth callback
- `POST /auth/google/finalize-signup.php` - Complete Google signup

### Users (`/users/`)

- `GET /users/profile.php` - Get user profile
- `PUT /users/profile.php` - Update profile
- `PUT /users/change-password.php` - Change password

### Admin (`/admin/`)

- Admin endpoints for platform management

### Landlord (`/landlord/`)

- Property management, boarder management, payments, maintenance

## Contributing

See [CONTRIBUTING.md](../.github/CONTRIBUTING.md) for contribution guidelines.

Remember: **Simple code is maintainable code.**

## Notes

- Phone validation: Philippine format `+63 9XX XXX XXXX`
- CORS origins configured per environment (see config/cors.php)
