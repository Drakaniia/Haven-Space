# MySQL Database Setup Guide

Complete guide for setting up and configuring MySQL for Haven Space.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Step 1: Install MySQL](#step-1-install-mysql)
- [Step 2: Create Database](#step-2-create-database)
- [Step 3: Configure Backend Environment](#step-3-configure-backend-environment)
- [Step 4: Import Database Schema](#step-4-import-database-schema)
- [Step 5: Seed Test Users](#step-5-seed-test-users)
- [Step 6: Verify Setup](#step-6-verify-setup)
- [Step 7: Start Servers](#step-7-start-servers)
- [Troubleshooting](#troubleshooting)
- [Database Structure](#database-structure)

---

## Prerequisites

Before setting up the database, ensure you have:

| Software     | Version               | Purpose                | Download Link                                       |
| ------------ | --------------------- | ---------------------- | --------------------------------------------------- |
| **MySQL**    | 5.7+ or MariaDB 10.3+ | Database server        | [mysql.com](https://dev.mysql.com/downloads)        |
| **PHP**      | 8.0+                  | Backend runtime        | [php.net](https://www.php.net/downloads)            |
| **Composer** | 2.0+                  | PHP dependency manager | [getcomposer.org](https://getcomposer.org/download) |

### Required PHP Extensions

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
# Check MySQL version
mysql --version

# Check PHP version
php -v

# Check Composer
composer -V
```

---

## Quick Start

If you have MySQL installed and running, run these commands:

```bash
# 1. Create database
mysql -u root -p -e "CREATE DATABASE havenspace_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Configure environment
cd server
copy .env.example .env
# Edit .env with your MySQL password

# 3. Import schema
mysql -u root -p havenspace_db < database/schema.sql
mysql -u root -p havenspace_db < database/migrations/001_create_users_table.sql

# 4. Seed test users (optional)
php database/seeds/UserSeeder.php

# 5. Start backend server
php -S localhost:8000 -t api
```

---

## Step 1: Install MySQL

### Option A: XAMPP (Recommended for Windows)

XAMPP includes MySQL, Apache, and PHP in one package.

1. **Download XAMPP:** [apachefriends.org](https://www.apachefriends.org/)
2. **Install XAMPP:** Run installer and select MySQL, Apache, PHP
3. **Start MySQL:** Open XAMPP Control Panel → Start MySQL
4. **Verify:** MySQL is running if you see green status indicator

**Default XAMPP MySQL credentials:**

- Host: `127.0.0.1` or `localhost`
- Port: `3306`
- User: `root`
- Password: _(empty)_

### Option B: Standalone MySQL

1. **Download MySQL:** [dev.mysql.com/downloads](https://dev.mysql.com/downloads/installer/)
2. **Install:** Run installer and remember your root password
3. **Start Service:** MySQL should auto-start, or use Windows Services
4. **Verify:** Run `mysql --version` in terminal

### Option C: MariaDB (Alternative)

MariaDB is a drop-in replacement for MySQL.

1. **Download MariaDB:** [mariadb.org/download](https://mariadb.org/download/)
2. **Install:** Run installer
3. **Start Service:** MariaDB service starts automatically
4. **Verify:** Run `mariadb --version`

---

## Step 2: Create Database

### Create Database via Command Line

```bash
mysql -u root -p -e "CREATE DATABASE havenspace_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

**What this does:**

- Logs into MySQL as root user
- Prompts for your MySQL password
- Creates database named `havenspace_db`
- Sets UTF-8 character set with full Unicode support

### Create Database via MySQL Client

If you prefer interactive mode:

```bash
mysql -u root -p
```

Then run these SQL commands:

```sql
CREATE DATABASE IF NOT EXISTS havenspace_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

SHOW DATABASES;
-- You should see havenspace_db in the list

EXIT;
```

### Create Database via phpMyAdmin (XAMPP)

1. Open browser: `http://localhost/phpmyadmin`
2. Click **"New"** in left sidebar
3. Database name: `havenspace_db`
4. Collation: `utf8mb4_unicode_ci`
5. Click **"Create"**

---

## Step 3: Configure Backend Environment

### 1. Navigate to Server Directory

```bash
cd server
```

### 2. Create Environment File

```bash
copy .env.example .env
```

### 3. Edit `.env` File

Open `.env` in your text editor and configure database settings:

```env
# Application Environment
APP_ENV=local
APP_DEBUG=true

# Database Configuration
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=havenspace_db
DB_USER=root
DB_PASS=your_mysql_password_here

# JWT Configuration
JWT_SECRET=your_generated_secret_key
JWT_EXPIRATION=3600
REFRESH_TOKEN_EXPIRATION=604800

# CORS - Allowed Origins
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback.php
```

### 4. Generate JWT Secret

```bash
php -r "echo bin2hex(random_bytes(32));"
```

Copy the output and paste it into `JWT_SECRET` in your `.env` file.

---

## Step 4: Import Database Schema

### Option A: Import All at Once

```bash
# From server directory
mysql -u root -p havenspace_db < database/schema.sql
```

### Option B: Import Migrations Sequentially

```bash
# Import base schema
mysql -u root -p havenspace_db < database/schema.sql

# Import user table migration
mysql -u root -p havenspace_db < database/migrations/001_create_users_table.sql

# Import Google Auth migration (optional)
mysql -u root -p havenspace_db < database/migrations/002_add_google_auth_to_users.sql
```

### Option C: Use Composer Script

```bash
composer migrate
```

This runs the migration script defined in `composer.json`.

### Verify Tables Created

```bash
mysql -u root -p havenspace_db -e "SHOW TABLES;"
```

You should see tables like:

- `users`
- `properties`
- `rooms`
- `applications`
- `payments`
- `maintenance_requests`
- `messages`
- `notices`

---

## Step 5: Seed Test Users

### Run User Seeder

```bash
php database/seeds/UserSeeder.php
```

This creates test users you can use to login immediately.

### Manual User Creation

If you prefer to create users manually:

```bash
mysql -u root -p havenspace_db
```

```sql
INSERT INTO users (name, email, password, role, created_at, updated_at)
VALUES (
  'Test Boarder',
  'boarder@test.com',
  '$2y$10$YourHashedPasswordHere',
  'boarder',
  NOW(),
  NOW()
);
```

**Note:** Passwords must be hashed using PHP's `password_hash()`:

```bash
php -r "echo password_hash('password123', PASSWORD_BCRYPT);"
```

### Default Test Credentials

After running the seeder, you can login with:

| Email             | Password    | Role     |
| ----------------- | ----------- | -------- |
| boarder@test.com  | password123 | Boarder  |
| landlord@test.com | password123 | Landlord |
| admin@test.com    | password123 | Admin    |

---

## Step 6: Verify Setup

### 1. Check Database Connection

```bash
php -r "
require 'vendor/autoload.php';
\$pdo = new PDO('mysql:host=127.0.0.1;dbname=havenspace_db', 'root', 'your_password');
echo 'Connection successful!';
"
```

### 2. Check Tables Exist

```bash
mysql -u root -p havenspace_db -e "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'havenspace_db';"
```

### 3. Check Users Exist

```bash
mysql -u root -p havenspace_db -e "SELECT id, name, email, role FROM users;"
```

### 4. Test API Endpoint

```bash
curl -X POST http://localhost:8000/auth/login.php \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"boarder@test.com\",\"password\":\"password123\"}"
```

You should receive a JWT token in response.

---

## Step 7: Start Servers

### Start Backend Server

```bash
cd server
php -S localhost:8000 -t api
```

Keep this terminal open - the backend server must keep running.

### Start Frontend Server (New Terminal)

```bash
bun run start
```

### Access Application

- **Frontend:** `http://localhost:3000/client/views/public/index.html`
- **Login:** `http://localhost:3000/client/views/public/auth/login.html`
- **Signup:** `http://localhost:3000/client/views/public/auth/signup.html`
- **Backend API:** `http://localhost:8000`

---

## Troubleshooting

### Issue: Cannot Connect to MySQL

**Error:** `SQLSTATE[HY000] [2002] No such file or directory`

**Solutions:**

1. **Check MySQL is running:**

   - Windows: Open Task Manager → Look for `mysqld.exe`
   - XAMPP: Check MySQL shows green "Running" status

2. **Verify connection details in `.env`:**

   ```env
   DB_HOST=127.0.0.1
   DB_PORT=3306
   ```

3. **Try localhost instead:**

   ```env
   DB_HOST=localhost
   ```

4. **Check MySQL socket (Linux/Mac):**
   ```bash
   mysql_config --socket
   ```

### Issue: Access Denied for User

**Error:** `Access denied for user 'root'@'localhost'`

**Solutions:**

1. **Verify password in `.env` is correct**
2. **Test MySQL login manually:**
   ```bash
   mysql -u root -p
   ```
3. **Reset root password (if forgotten):**
   - Stop MySQL service
   - Start with skip-grant-tables
   - Reset password
   - Restart normally

### Issue: Database Does Not Exist

**Error:** `Unknown database 'havenspace_db'`

**Solution:**

```bash
mysql -u root -p -e "CREATE DATABASE havenspace_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### Issue: Tables Don't Exist

**Error:** `Table 'users' doesn't exist`

**Solution:**

```bash
# Re-import schema
mysql -u root -p havenspace_db < database/schema.sql
mysql -u root -p havenspace_db < database/migrations/001_create_users_table.sql
```

### Issue: PDO Extension Not Found

**Error:** `Fatal error: Uncaught Error: Class 'PDO' not found`

**Solution:**

1. Open `php.ini` (find it with `php --ini`)
2. Uncomment or add: `extension=pdo_mysql`
3. Restart PHP/web server

### Issue: Port Already in Use

**Error:** `Address already in use`

**Solution:**

1. Find process using port 8000:
   ```bash
   netstat -ano | findstr :8000
   ```
2. Kill the process or use different port:
   ```bash
   php -S localhost:8001 -t api
   ```

### Issue: CORS Errors in Browser

**Error:** `Access to fetch has been blocked by CORS policy`

**Solution:**

1. Check `.env` has correct origins:
   ```env
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
   ```
2. Verify `api/cors.php` is included in API endpoints
3. Check browser console for exact error details

---

## Database Structure

### Core Tables

#### `users`

| Column     | Type         | Description                 |
| ---------- | ------------ | --------------------------- |
| id         | INT (PK)     | Auto-increment user ID      |
| name       | VARCHAR(255) | User's full name            |
| email      | VARCHAR(255) | Unique email address        |
| password   | VARCHAR(255) | Bcrypt hashed password      |
| role       | ENUM         | boarder, landlord, or admin |
| created_at | TIMESTAMP    | Account creation date       |
| updated_at | TIMESTAMP    | Last update date            |

#### `properties`

| Column      | Type         | Description                |
| ----------- | ------------ | -------------------------- |
| id          | INT (PK)     | Auto-increment property ID |
| landlord_id | INT (FK)     | References users.id        |
| name        | VARCHAR(255) | Property name              |
| address     | TEXT         | Full address               |
| description | TEXT         | Property description       |
| created_at  | TIMESTAMP    | Creation date              |
| updated_at  | TIMESTAMP    | Last update date           |

#### `rooms`

| Column      | Type        | Description                      |
| ----------- | ----------- | -------------------------------- |
| id          | INT (PK)    | Auto-increment room ID           |
| property_id | INT (FK)    | References properties.id         |
| room_number | VARCHAR(50) | Room identifier                  |
| price       | DECIMAL     | Monthly rent amount              |
| status      | ENUM        | available, occupied, maintenance |
| created_at  | TIMESTAMP   | Creation date                    |
| updated_at  | TIMESTAMP   | Last update date                 |

#### `applications`

| Column     | Type      | Description                   |
| ---------- | --------- | ----------------------------- |
| id         | INT (PK)  | Auto-increment application ID |
| room_id    | INT (FK)  | References rooms.id           |
| boarder_id | INT (FK)  | References users.id           |
| status     | ENUM      | pending, approved, rejected   |
| created_at | TIMESTAMP | Application date              |
| updated_at | TIMESTAMP | Status update date            |

#### `payments`

| Column         | Type      | Description                |
| -------------- | --------- | -------------------------- |
| id             | INT (PK)  | Auto-increment payment ID  |
| application_id | INT (FK)  | References applications.id |
| amount         | DECIMAL   | Payment amount             |
| payment_date   | DATE      | Date of payment            |
| status         | ENUM      | pending, completed, failed |
| created_at     | TIMESTAMP | Record creation date       |

#### `maintenance_requests`

| Column      | Type      | Description                 |
| ----------- | --------- | --------------------------- |
| id          | INT (PK)  | Auto-increment request ID   |
| room_id     | INT (FK)  | References rooms.id         |
| boarder_id  | INT (FK)  | References users.id         |
| description | TEXT      | Issue description           |
| status      | ENUM      | open, in_progress, resolved |
| created_at  | TIMESTAMP | Report date                 |
| updated_at  | TIMESTAMP | Status update date          |

#### `messages`

| Column      | Type      | Description               |
| ----------- | --------- | ------------------------- |
| id          | INT (PK)  | Auto-increment message ID |
| sender_id   | INT (FK)  | References users.id       |
| receiver_id | INT (FK)  | References users.id       |
| message     | TEXT      | Message content           |
| is_read     | BOOLEAN   | Read status               |
| created_at  | TIMESTAMP | Sent date                 |

#### `notices`

| Column     | Type         | Description              |
| ---------- | ------------ | ------------------------ |
| id         | INT (PK)     | Auto-increment notice ID |
| title      | VARCHAR(255) | Notice title             |
| content    | TEXT         | Notice body              |
| created_by | INT (FK)     | References users.id      |
| created_at | TIMESTAMP    | Publication date         |

---

## Additional Resources

- [Google OAuth Setup](./GOOGLE_OAUTH_SETUP.md) - Configure Google sign-in
- [Backend README](../Readme.md) - Complete backend documentation
- [Environment Setup](../../docs/ENVIRONMENT_SETUP.md) - Environment configuration guide

---

**Last Updated:** 2026-04-11
**Version:** 1.0.0
