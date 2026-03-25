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
- Add comments only when necessary to explain *why*, not *what*
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
backend/
├── api/
│   ├── config/          # Database configuration
│   ├── controllers/     # Request handlers (keep these simple)
│   ├── middleware/      # Auth, validation middleware
│   ├── models/          # Database models
│   └── routes.php       # API route definitions
```

## Getting Started

### Prerequisites

- PHP 8.0+
- MySQL or MariaDB
- Composer

### Installation

```bash
cd backend
composer install
cp .env.example .env
# Configure database in .env
php migrate
```

### Running the Server

```bash
php -S localhost:8000 -t api
```

## API Endpoints (Draft)

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/forgot-password` - Request password reset

### Rooms

- `GET /api/rooms` - List all rooms
- `GET /api/rooms/{id}` - Get room details
- `POST /api/rooms` - Create room (landlord only)
- `PUT /api/rooms/{id}` - Update room (landlord only)
- `DELETE /api/rooms/{id}` - Delete room (landlord only)

### Applications

- `GET /api/applications` - List applications
- `POST /api/applications` - Submit application
- `GET /api/applications/{id}` - Get application details
- `PUT /api/applications/{id}` - Update application status

### Payments

- `GET /api/payments` - List payments
- `POST /api/payments` - Record payment
- `GET /api/payments/{id}` - Get payment details

### Maintenance

- `GET /api/maintenance` - List maintenance requests
- `POST /api/maintenance` - Create maintenance request
- `PUT /api/maintenance/{id}` - Update request status

## Contributing

See [CONTRIBUTING.md](../.github/CONTRIBUTING.md) for contribution guidelines.

Remember: **Simple code is maintainable code.**
