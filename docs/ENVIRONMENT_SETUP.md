# Environment Setup Guide

Complete guide for configuring Haven Space across different environments (local development and production).

---

## Table of Contents

- [Overview](#overview)
- [Environment Types](#environment-types)
- [Quick Start](#quick-start)
- [Backend Configuration](#backend-configuration)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [CORS Configuration](#cors-configuration)
- [Frontend Configuration](#frontend-configuration)
  - [Automatic Environment Detection](#automatic-environment-detection)
  - [Manual Override](#manual-override)
- [Local Development with XAMPP](#local-development-with-xampp)
  - [Prerequisites](#prerequisites)
  - [Step-by-Step Setup](#step-by-step-setup)
  - [Database Creation](#database-creation)
- [Production Deployment](#production-deployment)
  - [Environment Variables](#environment-variables-1)
  - [Database Configuration](#database-configuration)
  - [Security Checklist](#security-checklist)
- [Troubleshooting](#troubleshooting)
- [Environment Variables Reference](#environment-variables-reference)

---

## Overview

Haven Space supports **environment-based configuration**, allowing you to seamlessly switch between local development (XAMPP) and production servers without code changes.

### Key Features

- ✅ **Automatic environment detection** - Frontend detects if running locally or in production
- ✅ **Environment-specific databases** - Different databases for local, staging, and production
- ✅ **CORS management** - Allowed origins configured per environment
- ✅ **Debug mode control** - Detailed errors in development, generic messages in production
- ✅ **Single codebase** - No code changes needed between environments

---

## Environment Types

| Environment      | Purpose                         | Database              | API URL                                   | Debug Mode |
| ---------------- | ------------------------------- | --------------------- | ----------------------------------------- | ---------- |
| **local-dev**    | PHP built-in server development | Local XAMPP MySQL     | `http://localhost:8000`                   | `true`     |
| **local-apache** | XAMPP Apache development        | Local XAMPP MySQL     | `http://localhost/haven-space/server/api` | `true`     |
| **production**   | Live deployment                 | Production SQL server | `https://yourdomain.com/api`              | `false`    |

---

## Quick Start

### For Local Development (XAMPP)

```bash
# 1. Copy XAMPP environment template
cp server/.env.xampp server/.env

# 2. Start XAMPP (Apache + MySQL)

# 3. Create database (see Database Creation section)

# 4. Start backend
cd server
php -S localhost:8000 -t api

# 5. In another terminal, start frontend
bun run start
```

### For Production Deployment

```bash
# 1. Copy example environment file
cp server/.env.example server/.env

# 2. Edit .env with production values
# Update APP_ENV=production, DB credentials, API URLs

# 3. Deploy to your server
```

---

## Backend Configuration

### Environment Variables

The backend uses `.env` files to manage environment-specific settings.

**File Priority:**

1. `.env.local` (highest priority - for local overrides)
2. `.env` (main environment file)
3. `.env.example` (fallback template)

**Available Environment Templates:**

- `server/.env.example` - Template with all variables documented
- `server/.env.xampp` - Pre-configured for XAMPP local development

### Creating Your .env File

```bash
# For XAMPP local development
cp server/.env.xampp server/.env

# For production (start from example)
cp server/.env.example server/.env
```

### Core Environment Variables

```env
# Application Environment
APP_ENV=local              # Options: local, production
APP_DEBUG=true             # true for dev, false for production

# JWT Configuration
JWT_SECRET=your_secret     # Generate with: php -r "echo bin2hex(random_bytes(32));"
JWT_EXPIRATION=3600        # Access token lifetime (seconds)
REFRESH_TOKEN_EXPIRATION=604800  # Refresh token lifetime (7 days)

# Database
DB_HOST=127.0.0.1         # Database server address
DB_PORT=3306              # Database port
DB_NAME=havenspace_db     # Database name
DB_USER=root              # Database username
DB_PASS=                  # Database password (empty for XAMPP default)

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback.php

# CORS - Allowed Origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
```

### Database Setup

#### Local Development (XAMPP MySQL)

1. **Start XAMPP Control Panel**

   - Start **Apache** and **MySQL** services

2. **Access phpMyAdmin**

   - Navigate to: `http://localhost/phpmyadmin`

3. **Create Database**

   - Click **New** in the left sidebar
   - Database name: `havenspace_db`
   - Collation: `utf8mb4_unicode_ci`
   - Click **Create**

   **Or using MySQL command line:**

   ```bash
   # Navigate to XAMPP MySQL bin directory
   cd C:\xampp\mysql\bin

   # Login to MySQL (default XAMPP has no password)
   mysql.exe -u root -p
   # Press Enter when prompted for password (leave empty)

   # Create database
   CREATE DATABASE havenspace_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   EXIT;
   ```

4. **Run Database Migrations**

   ```bash
   cd server

   # Import main schema
   mysql -u root -p havenspace_db < database/schema.sql

   # Run migrations in order
   mysql -u root -p havenspace_db < database/migrations/001_create_users_table.sql
   mysql -u root -p havenspace_db < database/migrations/002_add_google_auth_to_users.sql
   ```

5. **Seed Database (Optional)**

   ```bash
   # Seed test users
   php database/seeds/UserSeeder.php

   # Seed test properties
   php database/seeds/PropertySeeder.php
   ```

---

## Frontend Configuration

### Automatic Environment Detection

The frontend automatically detects the environment and sets the correct API base URL.

**Detection Logic** (in `client/js/config.js`):

| Hostname                           | Detected Environment | API URL                                   |
| ---------------------------------- | -------------------- | ----------------------------------------- |
| `localhost` + port `:8000`         | `local-dev`          | `http://localhost:8000`                   |
| `localhost` + path `/haven-space/` | `local-apache`       | `http://localhost/haven-space/server/api` |
| `havenspace.com`                   | `production`         | `https://your-production-domain.com/api`  |

**Console Output in Development:**

When running locally, you'll see this in browser console:

```
🔧 Haven Space - LOCAL-DEV Environment
API Base URL: http://localhost:8000
```

### Manual Override (If Needed)

If automatic detection doesn't work for your setup, you can manually configure the API URL:

**Edit `client/js/config.js`:**

```javascript
const CONFIG = {
  // Manually set your API URL
  API_BASE_URL: 'http://localhost:8000', // Change this line

  // Rest of config...
};
```

**Common Local Configurations:**

```javascript
// PHP Built-in Server (default)
API_BASE_URL: 'http://localhost:8000';

// XAMPP Apache - Project in htdocs/Haven-Space
API_BASE_URL: 'http://localhost/Haven-Space/server/api';

// XAMPP Apache - Project in htdocs/haven-space-website/Haven-Space
API_BASE_URL: 'http://localhost/haven-space-website/Haven-Space/server/api';

// Custom Apache DocumentRoot
API_BASE_URL: 'http://localhost/server/api';
```

---

## Local Development with XAMPP

### Prerequisites

| Software    | Version | Purpose              | Download                                            |
| ----------- | ------- | -------------------- | --------------------------------------------------- |
| **XAMPP**   | 8.0+    | Apache + MySQL + PHP | [apachefriends.org](https://www.apachefriends.org/) |
| **Node.js** | 20+     | Frontend build tools | [nodejs.org](https://nodejs.org)                    |
| **Git**     | Latest  | Version control      | [git-scm.com](https://git-scm.com)                  |

### Step-by-Step Setup

#### 1. Install XAMPP

- Download from [apachefriends.org](https://www.apachefriends.org/)
- Install to default location: `C:\xampp` (Windows) or `/Applications/XAMPP` (Mac)
- Verify PHP version: Open XAMPP Control Panel → Check PHP version is 8.0+

#### 2. Clone Project

```bash
git clone https://github.com/Drakaniia/Haven-Space.git
cd Haven-Space
```

#### 3. Configure Environment

```bash
# Copy XAMPP environment template
cp server/.env.xampp server/.env

# Edit if needed (usually defaults work)
# DB_HOST=127.0.0.1
# DB_USER=root
# DB_PASS=
```

#### 4. Start XAMPP Services

- Open **XAMPP Control Panel**
- Click **Start** for **Apache**
- Click **Start** for **MySQL**
- Both should show green "Running" status

#### 5. Create Database

Follow the [Database Creation](#database-creation) steps above.

#### 6. Start Backend Server

**Option A: PHP Built-in Server (Recommended for Development)**

```bash
cd server
php -S localhost:8000 -t api
```

**Option B: XAMPP Apache**

- Copy project folder to `C:\xampp\htdocs\haven-space`
- Access via: `http://localhost/haven-space`
- API available at: `http://localhost/haven-space/server/api`

#### 7. Start Frontend

```bash
# Install dependencies (first time only)
bun install

# Start development server
bun run start
```

Frontend opens at: `http://localhost:3000`

#### 8. Verify Setup

**Test Backend:**

```bash
curl http://localhost:8000/health
# Should return: {"status": "ok"}
```

**Test Frontend:**

- Open browser to: `http://localhost:3000`
- Open browser console (F12)
- Should see: `🔧 Haven Space - LOCAL-DEV Environment`

---

## Production Deployment

### Environment Variables

Create a production `.env` file on your server:

```env
# Application Environment
APP_ENV=production
APP_DEBUG=false

# JWT Configuration
JWT_SECRET=<generate-secure-random-string>
JWT_EXPIRATION=3600
REFRESH_TOKEN_EXPIRATION=604800

# Database (Production SQL Server)
DB_HOST=your-production-db-host.com
DB_PORT=3306
DB_NAME=havenspace_db
DB_USER=production_db_user
DB_PASS=<strong-production-password>

# Google OAuth (Production)
GOOGLE_CLIENT_ID=<production-google-client-id>
GOOGLE_CLIENT_SECRET=<production-google-client-secret>
GOOGLE_REDIRECT_URI=https://havenspace.com/api/auth/google/callback.php

# CORS (Production Frontend Only)
ALLOWED_ORIGINS=https://havenspace.com,https://www.havenspace.com
```

**Generate Secure JWT Secret:**

```bash
php -r "echo bin2hex(random_bytes(32));"
```

### Database Configuration

1. **Set up Production Database**

   - Use managed database service (AWS RDS, DigitalOcean, etc.)
   - Or configure MySQL/MariaDB on your server

2. **Create Database**

   ```sql
   CREATE DATABASE havenspace_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

3. **Create Dedicated Database User** (Security Best Practice)

   ```sql
   CREATE USER 'havenspace_user'@'%' IDENTIFIED BY '<strong-password>';
   GRANT ALL PRIVILEGES ON havenspace_db.* TO 'havenspace_user'@'%';
   FLUSH PRIVILEGES;
   ```

4. **Run Migrations**
   ```bash
   mysql -u havenspace_user -p havenspace_db < database/schema.sql
   mysql -u havenspace_user -p havenspace_db < database/migrations/*.sql
   ```

### Security Checklist

Before deploying to production:

- [ ] Set `APP_ENV=production`
- [ ] Set `APP_DEBUG=false`
- [ ] Generate new `JWT_SECRET` (don't use example value)
- [ ] Use strong database password
- [ ] Remove default credentials
- [ ] Enable HTTPS (required for secure cookies)
- [ ] Configure CORS to allow only production domain
- [ ] Set up firewall rules (database port, SSH)
- [ ] Enable database backups
- [ ] Set up error logging
- [ ] Configure rate limiting
- [ ] Update Google OAuth redirect URI
- [ ] Test all API endpoints
- [ ] Verify email sending functionality

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Error:** `SQLSTATE[HY000] [2002] No such file or directory`

**Solutions:**

- Verify MySQL is running in XAMPP Control Panel
- Check database credentials in `.env`:
  ```env
  DB_HOST=127.0.0.1
  DB_USER=root
  DB_PASS=
  ```
- Test connection:
  ```bash
  mysql -u root -p -e "SELECT 1;"
  ```
- Ensure database exists:
  ```bash
  mysql -u root -p -e "SHOW DATABASES;" | grep havenspace_db
  ```

#### 2. CORS Errors in Browser Console

**Error:** `Access to fetch at 'http://localhost:8000' from origin 'http://localhost:3000' has been blocked by CORS policy`

**Solutions:**

- Check `server/.env` has correct origin:
  ```env
  ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
  ```
- Restart backend server after changing `.env`
- Verify frontend is using correct API URL (check browser console)

#### 3. Frontend Can't Connect to Backend

**Error:** `Failed to fetch` or `ERR_CONNECTION_REFUSED`

**Solutions:**

- Verify backend is running:
  ```bash
  # Check if port 8000 is listening
  netstat -an | findstr 8000
  ```
- Test backend directly:
  ```bash
  curl http://localhost:8000/
  ```
- Check frontend config in browser console:
  ```javascript
  console.log(CONFIG.API_BASE_URL);
  ```

#### 4. Environment Not Detected Correctly

**Issue:** Frontend shows wrong environment or API URL

**Solutions:**

- Check browser console for detected environment:
  ```
  🔧 Haven Space - LOCAL-DEV Environment
  API Base URL: http://localhost:8000
  ```
- Manually override in `client/js/config.js` if needed
- Ensure you're accessing frontend via `localhost` (not `127.0.0.1` or IP address)

#### 5. JWT Token Errors

**Error:** `Invalid token` or `Token expired`

**Solutions:**

- Verify `JWT_SECRET` matches in all environments
- Check system time is synchronized
- Clear browser localStorage and login again:
  ```javascript
  localStorage.clear();
  ```
- Use refresh token endpoint to get new access token

#### 6. Google OAuth redirect_uri_mismatch

**Error:** `Error 400: redirect_uri_mismatch`

**Solutions:**

- Verify redirect URI in Google Cloud Console matches `.env`:
  ```env
  GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback.php
  ```
- Check for trailing slashes or http/https mismatch
- For production, add production redirect URI in Google Cloud Console

---

## Environment Variables Reference

Complete reference for all environment variables used in Haven Space.

### Application Settings

| Variable    | Type    | Local Default | Production Default | Description                    |
| ----------- | ------- | ------------- | ------------------ | ------------------------------ |
| `APP_ENV`   | string  | `local`       | `production`       | Environment name               |
| `APP_DEBUG` | boolean | `true`        | `false`            | Enable detailed error messages |

### JWT Configuration

| Variable                   | Type   | Default      | Description                                |
| -------------------------- | ------ | ------------ | ------------------------------------------ |
| `JWT_SECRET`               | string | _(required)_ | Secret key for signing JWT tokens          |
| `JWT_EXPIRATION`           | int    | `3600`       | Access token lifetime in seconds (1 hour)  |
| `REFRESH_TOKEN_EXPIRATION` | int    | `604800`     | Refresh token lifetime in seconds (7 days) |

### Database Configuration

| Variable  | Type   | Local Default   | Production Default  | Description              |
| --------- | ------ | --------------- | ------------------- | ------------------------ |
| `DB_HOST` | string | `127.0.0.1`     | _(your db host)_    | Database server hostname |
| `DB_PORT` | int    | `3306`          | `3306`              | Database server port     |
| `DB_NAME` | string | `havenspace_db` | `havenspace_db`     | Database name            |
| `DB_USER` | string | `root`          | _(dedicated user)_  | Database username        |
| `DB_PASS` | string | _(empty)_       | _(strong password)_ | Database password        |

### Google OAuth (Optional)

| Variable               | Type   | Description                                          |
| ---------------------- | ------ | ---------------------------------------------------- |
| `GOOGLE_CLIENT_ID`     | string | Google Cloud OAuth client ID                         |
| `GOOGLE_CLIENT_SECRET` | string | Google Cloud OAuth client secret                     |
| `GOOGLE_REDIRECT_URI`  | string | OAuth callback URL (must match Google Cloud Console) |

### CORS Configuration

| Variable          | Type   | Local Default           | Production Default       | Description                                      |
| ----------------- | ------ | ----------------------- | ------------------------ | ------------------------------------------------ |
| `ALLOWED_ORIGINS` | string | `http://localhost:3000` | `https://yourdomain.com` | Comma-separated list of allowed frontend origins |

---

## Additional Resources

- [Backend README](../server/Readme.md) - Backend API setup and endpoints
- [Frontend README](../client/README.md) - Frontend development guide
- [Contributing Guidelines](../.github/CONTRIBUTING.md) - How to contribute
- [Google OAuth Setup](../server/docs/GOOGLE_OAUTH_SETUP.md) - Detailed OAuth configuration

---

**Last Updated:** 2026-04-09  
**Version:** 1.1.0
