# Haven Space - Backend API

Backend API for Haven Space, a platform connecting boarders with verified boarding houses.

---

## Table of Contents

- [Environment Configuration](#environment-configuration)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Server](#running-the-server)
- [Database Setup](#database-setup)
- [API Endpoints](#api-endpoints)
- [Google OAuth Setup](#google-oauth-setup)
- [Testing](#testing)
- [Project Structure](#project-structure)

---

## Environment Configuration

Haven Space supports **environment-based configuration**, allowing seamless switching between local development and production without code changes.

### How It Works

The application automatically detects the environment and loads appropriate settings:

| Environment         | Purpose                | Database              | API URL                      |
| ------------------- | ---------------------- | --------------------- | ---------------------------- |
| **local** (default) | Development with XAMPP | Local MySQL           | `http://localhost:8000`      |
| **production**      | Live deployment        | Production SQL server | `https://yourdomain.com/api` |

### Quick Setup

**For Local Development (XAMPP):**

```bash
# Copy XAMPP environment template
cp server/.env.xampp server/.env

# Start XAMPP (Apache + MySQL), then:
cd server
php -S localhost:8000 -t api
```

**For Production Deployment:**

```bash
# Copy example environment file
cp server/.env.example server/.env

# Edit .env with production values:
# - APP_ENV=production
# - APP_DEBUG=false
# - Production database credentials
# - Production API URLs
```

### Environment Variables

Key environment variables (see `server/.env.example` for full list):

```env
# Application Environment
APP_ENV=local              # Options: local, production
APP_DEBUG=true             # true for dev, false for production

# Database Configuration
DB_HOST=127.0.0.1         # Database server
DB_NAME=havenspace_db     # Database name
DB_USER=root              # Database username
DB_PASS=                  # Database password

# CORS - Allowed Origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
```

📖 **Complete Guide:** See [docs/ENVIRONMENT_SETUP.md](../docs/ENVIRONMENT_SETUP.md) for detailed setup instructions, troubleshooting, and production deployment guide.

---

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

| Software     | Version               | Purpose                | Download Link                                       |
| ------------ | --------------------- | ---------------------- | --------------------------------------------------- |
| **PHP**      | 8.0+                  | Backend runtime        | [php.net](https://www.php.net/downloads)            |
| **Composer** | 2.0+                  | PHP dependency manager | [getcomposer.org](https://getcomposer.org/download) |
| **MySQL**    | 5.7+ or MariaDB 10.3+ | Database               | [mysql.com](https://dev.mysql.com/downloads)        |
| **Node.js**  | 20+                   | Frontend build tools   | [nodejs.org](https://nodejs.org)                    |
| **Git**      | Latest                | Version control        | [git-scm.com](https://git-scm.com)                  |

### PHP Extensions

Ensure these PHP extensions are enabled in `php.ini`:

```ini
extension=pdo_mysql
extension=curl
extension=json
extension=mbstring
extension=openssl
```

### Verify Installation

```bash
# Check PHP version
php -v          # Should show PHP 8.0+

# Check Composer
composer -V     # Should show Composer 2.0+

# Check MySQL
mysql --version # Should show MySQL 5.7+ or MariaDB

# Check Node.js
node -v         # Should show v20+

# Check npm
npm -v
```

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Drakaniia/Haven-Space.git
cd Haven-Space/server
```

### 2. Install PHP Dependencies

```bash
composer install
```

This installs:

- `guzzlehttp/guzzle` - HTTP client for API requests
- `firebase/php-jwt` - JWT token handling
- `phpunit/phpunit` - Testing framework (dev)

### 3. Set Up Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your credentials
# Use your preferred text editor
```

### 4. Configure Database

Edit `.env` with your database credentials:

```env
DB_HOST=127.0.0.1
DB_NAME=havenspace_db
DB_USER=root
DB_PASS=your_password
```

### 5. Set Up Database

Run the automated setup script:

```bash
# Create database and import schema
php setup-database.php

# Or create database with sample seed data
php setup-database.php --seed
```

This automatically creates the database, imports the schema, and runs any pending migrations. See [Database Setup](#database-setup) for details.

---

## Configuration

### Environment Variables (.env)

```env
# Application
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRATION=3600
REFRESH_TOKEN_EXPIRATION=604800

# Database
DB_HOST=127.0.0.1
DB_NAME=havenspace_db
DB_USER=root
DB_PASS=

# Google OAuth (Optional - for social login)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback.php
```

### Generate JWT Secret

Generate a secure random string for `JWT_SECRET`:

```bash
# Using PHP
php -r "echo bin2hex(random_bytes(32));"

# Using OpenSSL
openssl rand -hex 32
```

---

## Running the Server

### Development Server

```bash
# Start PHP built-in server
cd server
php -S localhost:8000 -t api
```

The API will be available at `http://localhost:8000`

### With Frontend

In a separate terminal, start the frontend:

```bash
cd Haven-Space
bun run start
```

Frontend will be available at `http://localhost:3000`

---

## Database Setup

### Option 1: Automated Setup (Recommended)

The database setup script automatically creates the database, imports the schema, runs migrations, and optionally seeds sample data.

```bash
# Basic setup (creates database + imports schema)
php setup-database.php

# Setup with sample data (creates database + schema + seeders)
php setup-database.php --seed
```

**What the script does:**

1. ✅ Connects to MySQL using `.env` credentials
2. ✅ Creates database if it doesn't exist
3. ✅ Imports `database/schema.sql`
4. ✅ Runs any pending migrations in `database/migrations/`
5. ✅ (Optional) Runs seeders when using `--seed` flag

**Troubleshooting:**

- If you get connection errors, verify MySQL is running
- Check database credentials in your `.env` file
- Ensure port 3306 (or your custom port) is correct

### Option 2: Manual Setup

If you prefer manual setup or need more control:

#### 1. Create Database

```bash
mysql -u root -p -e "CREATE DATABASE havenspace_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

#### 2. Run Migrations

```bash
# Import schema
mysql -u root -p havenspace_db < database/schema.sql

# Run migrations in order
mysql -u root -p havenspace_db < database/migrations/001_create_users_table.sql
mysql -u root -p havenspace_db < database/migrations/002_add_google_auth_to_users.sql
```

### 3. Seed Database (Optional)

```bash
# Seed users
php database/seeds/UserSeeder.php

# Seed properties
php database/seeds/PropertySeeder.php
```

---

## API Endpoints

### Authentication

| Method | Endpoint                  | Description          | Auth Required |
| ------ | ------------------------- | -------------------- | ------------- |
| POST   | `/auth/register.php`      | Register new user    | No            |
| POST   | `/auth/login.php`         | Login user           | No            |
| POST   | `/auth/logout.php`        | Logout user          | Yes           |
| GET    | `/auth/me.php`            | Get current user     | Yes           |
| POST   | `/auth/refresh-token.php` | Refresh access token | No            |

### Google OAuth

| Method | Endpoint                            | Description            | Auth Required |
| ------ | ----------------------------------- | ---------------------- | ------------- |
| GET    | `/auth/google/authorize.php`        | Initiate Google OAuth  | No            |
| GET    | `/auth/google/callback.php`         | Handle Google callback | No            |
| GET    | `/auth/google/link.php`             | Link Google account    | Yes           |
| POST   | `/auth/google/finalize-signup.php`  | Complete Google signup | No            |
| GET    | `/auth/google/get-pending-user.php` | Get pending user data  | No            |

### Users

| Method | Endpoint                     | Description      | Auth Required |
| ------ | ---------------------------- | ---------------- | ------------- |
| GET    | `/users/profile.php`         | Get user profile | Yes           |
| PUT    | `/users/profile.php`         | Update profile   | Yes           |
| PUT    | `/users/change-password.php` | Change password  | Yes           |

### Properties

| Method | Endpoint                       | Description          | Auth Required  |
| ------ | ------------------------------ | -------------------- | -------------- |
| GET    | `/properties/index.php`        | List properties      | No             |
| GET    | `/properties/show.php?id={id}` | Get property details | No             |
| POST   | `/properties/store.php`        | Create property      | Yes (Landlord) |
| PUT    | `/properties/update.php`       | Update property      | Yes (Owner)    |
| DELETE | `/properties/delete.php`       | Delete property      | Yes (Owner)    |

### Applications

| Method | Endpoint                   | Description             | Auth Required |
| ------ | -------------------------- | ----------------------- | ------------- |
| GET    | `/applications/index.php`  | List applications       | Yes           |
| POST   | `/applications/store.php`  | Submit application      | Yes (Boarder) |
| GET    | `/applications/show.php`   | Get application details | Yes           |
| PUT    | `/applications/update.php` | Update application      | Yes           |

### Payments

| Method | Endpoint              | Description         | Auth Required |
| ------ | --------------------- | ------------------- | ------------- |
| GET    | `/payments/index.php` | List payments       | Yes           |
| POST   | `/payments/store.php` | Create payment      | Yes           |
| GET    | `/payments/show.php`  | Get payment details | Yes           |

### Maintenance

| Method | Endpoint                  | Description                | Auth Required  |
| ------ | ------------------------- | -------------------------- | -------------- |
| GET    | `/maintenance/index.php`  | List maintenance requests  | Yes            |
| POST   | `/maintenance/store.php`  | Create maintenance request | Yes            |
| PUT    | `/maintenance/update.php` | Update request status      | Yes (Landlord) |

### Messages

| Method | Endpoint                  | Description   | Auth Required |
| ------ | ------------------------- | ------------- | ------------- |
| GET    | `/messages/index.php`     | List messages | Yes           |
| POST   | `/messages/store.php`     | Send message  | Yes           |
| PUT    | `/messages/mark-read.php` | Mark as read  | Yes           |

---

## Google OAuth Setup

### Overview

Google OAuth allows users to sign in with their Google accounts. Follow these steps to enable this feature:

### Step 1: Google Cloud Platform Setup

1. **Create a Google Cloud Project**

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project named "Haven Space"

2. **Enable Google+ API**

   - Navigate to **APIs & Services** → **Library**
   - Search for "Google+ API" and enable it

3. **Configure OAuth Consent Screen**

   - Go to **APIs & Services** → **OAuth consent screen**
   - Select **External** user type
   - Fill in required fields:
     - App name: Haven Space
     - User support email: Your email
     - Developer contact email: Your email

4. **Add Scopes**

   - Add these OAuth scopes:
     - `openid` - Associate with public info
     - `email` - View email address
     - `profile` - View basic profile info

5. **Add Test Users** (for development)

   - Add your test email addresses
   - Save and continue

6. **Create OAuth 2.0 Credentials**

   - Go to **APIs & Services** → **Credentials**
   - Click **CREATE CREDENTIALS** → **OAuth client ID**
   - Select **Web application**

   **Authorized JavaScript origins:**

   ```
   http://localhost:8000
   http://localhost:3000
   ```

   **Authorized redirect URIs:**

   ```
   http://localhost:8000/api/auth/google/callback.php
   ```

7. **Save Credentials**
   - Copy the **Client ID** and **Client Secret**

### Step 2: Configure Environment

Edit `server/.env`:

```env
GOOGLE_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcd1234efgh5678
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback.php
```

### Step 3: Run Database Migration

```bash
mysql -u root -p havenspace_db < database/migrations/002_add_google_auth_to_users.sql
```

### Step 4: Test Google Login

1. Start the backend server: `php -S localhost:8000 -t api`
2. Start the frontend: `bun run start`
3. Go to login page: `http://localhost:3000/client/views/public/auth/login.html`
4. Click **"Log in with Google"**

### Production Configuration

For production deployment:

1. Update Google Cloud Console:

   - Add production domain to **Authorized JavaScript origins**
   - Add production redirect URI

2. Update `.env`:

   ```env
   GOOGLE_REDIRECT_URI=https://havenspace.com/api/auth/google/callback.php
   ```

3. Set `secure=true` for cookies in production

For detailed instructions, see `server/docs/GOOGLE_OAUTH_SETUP.md`

---

## Testing

### Run PHPUnit Tests

```bash
cd server

# Run all tests
composer test

# Run specific test suite
vendor/bin/phpunit tests/Unit
vendor/bin/phpunit tests/Integration

# Run with coverage
vendor/bin/phpunit --coverage-html coverage
```

### Test API Endpoints

Using cURL:

```bash
# Test login endpoint
curl -X POST http://localhost:8000/auth/login.php \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test authenticated endpoint
curl -X GET http://localhost:8000/auth/me.php \
  -H "Cookie: access_token=YOUR_JWT_TOKEN"
```

---

## Project Structure

```
server/
├── api/                      # API entry points
│   ├── auth/                 # Authentication endpoints
│   │   ├── google/           # Google OAuth endpoints
│   │   │   ├── authorize.php
│   │   │   ├── callback.php
│   │   │   ├── link.php
│   │   │   ├── finalize-signup.php
│   │   │   └── get-pending-user.php
│   │   ├── login.php
│   │   ├── register.php
│   │   ├── logout.php
│   │   ├── me.php
│   │   └── refresh-token.php
│   ├── cors.php              # CORS configuration
│   ├── middleware.php        # Global middleware
│   ├── routes.php            # Route definitions
│   └── index.php             # Main entry point
├── config/                   # Configuration files
│   ├── app.php               # App configuration
│   ├── auth.php              # Auth configuration
│   ├── database.php          # Database configuration
│   ├── google.php            # Google OAuth configuration
│   └── constants.php         # App constants
├── database/                 # Database files
│   ├── migrations/           # Database migrations
│   ├── schema.sql            # Database schema
│   └── seeds/                # Database seeders
├── src/                      # Application source
│   ├── Core/                 # Core framework
│   │   ├── Auth/             # Authentication classes
│   │   │   ├── GoogleOAuth.php
│   │   │   ├── JWT.php
│   │   │   ├── Middleware.php
│   │   │   ├── Password.php
│   │   │   └── RateLimiter.php
│   │   ├── Database/         # Database layer
│   │   ├── HTTP/             # HTTP utilities
│   │   └── Exceptions/       # Exception classes
│   └── Modules/              # Feature modules
│       ├── User/             # User management
│       ├── Property/         # Property management
│       ├── Application/      # Rental applications
│       ├── Booking/          # Booking management
│       ├── Payment/          # Payment processing
│       ├── Maintenance/      # Maintenance requests
│       ├── Message/          # Messaging system
│       └── Notice/           # Notices/announcements
├── storage/                  # File storage
├── tests/                    # PHPUnit tests
│   ├── Unit/                 # Unit tests
│   └── Integration/          # Integration tests
├── .env.example              # Environment template
├── composer.json             # PHP dependencies
├── phpunit.xml               # PHPUnit configuration
└── Readme.md                 # This file
```

---

## Troubleshooting

### Common Issues

#### 1. PDO Extension Not Found

**Error:** `Fatal error: Uncaught Error: Class 'PDO' not found`

**Solution:**

- Enable PDO in `php.ini`: `extension=pdo_mysql`
- Restart your web server

#### 2. Database Connection Failed

**Error:** `SQLSTATE[HY000] [2002] No such file or directory`

**Solution:**

- Verify MySQL is running
- Check database credentials in `.env`
- Ensure database exists

#### 3. CORS Errors

**Error:** `Access to fetch has been blocked by CORS policy`

**Solution:**

- Check `api/cors.php` configuration
- Ensure frontend URL is in allowed origins
- Verify cookies are sent with `credentials: 'include'`

#### 4. JWT Token Invalid

**Error:** `Invalid token` or `Token expired`

**Solution:**

- Check `JWT_SECRET` matches in all environments
- Verify system time is synchronized
- Use refresh token endpoint to get new access token

#### 5. Google OAuth redirect_uri_mismatch

**Error:** `Error 400: redirect_uri_mismatch`

**Solution:**

- Verify redirect URI in Google Cloud Console matches `.env`
- Check for trailing slashes or http/https mismatch

---

## Security Best Practices

1. **Never commit `.env`** - Add to `.gitignore`
2. **Use HTTPS in production** - Required for secure cookies
3. **Rotate JWT secrets** - Change periodically
4. **Rate limiting** - Enabled for login attempts
5. **Input validation** - All inputs validated and sanitized
6. **Prepared statements** - Prevents SQL injection
7. **Password hashing** - Using PHP `password_hash()`
8. **HttpOnly cookies** - JWT tokens stored securely

---

## License

MIT License - See LICENSE file for details

---

**Last Updated:** 2026-04-01
**Version:** 1.0.0
