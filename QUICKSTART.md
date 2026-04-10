# Quick Start Guide - Haven Space Environment Setup

## 🚀 Get Running in 5 Minutes (Local Development)

### Prerequisites

- ✅ XAMPP installed (with Apache + MySQL)
- ✅ Node.js 20+ installed
- ✅ Git installed

---

### Step 1: Clone Repository (if not already done)

```bash
git clone https://github.com/Drakaniia/Haven-Space.git
cd Haven-Space
```

---

### Step 2: Setup Backend Environment

```bash
# Copy XAMPP environment template
copy server\.env.xampp server\.env
```

**That's it!** The `.env.xampp` file is pre-configured with XAMPP defaults.

---

### Step 3: Start XAMPP Services

1. Open **XAMPP Control Panel**
2. Click **Start** for **Apache**
3. Click **Start** for **MySQL**
4. Verify both show green "Running" status

---

### Step 4: Create Database

**Option A: Using phpMyAdmin (Easier)**

1. Open browser: `http://localhost/phpmyadmin`
2. Click **New** in left sidebar
3. Database name: `havenspace_db`
4. Collation: `utf8mb4_unicode_ci`
5. Click **Create**

**Option B: Using Command Line**

```bash
cd C:\xampp\mysql\bin
mysql.exe -u root -p
# Press Enter when asked for password (leave empty)

CREATE DATABASE havenspace_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

---

### Step 5: Start Backend Server

```bash
cd server
php -S localhost:8000 -t api
```

You should see: `PHP 8.x Development Server started`

---

### Step 6: Start Frontend

Open **new terminal** in project root:

```bash
# Install dependencies (first time only)
bun install

# Start development server
bun run start
```

Your browser should auto-open to `http://localhost:3000`

---

### Step 7: Verify Setup

**Check Browser Console:**

- Press `F12` to open DevTools
- Should see: `🔧 Haven Space - LOCAL-DEV Environment`
- Should show: `API Base URL: http://localhost:8000`

**Test Backend Connection:**

```bash
curl http://localhost:8000/
```

Should return backend response (not connection error).

---

## ✅ You're All Set!

The application is now running with:

- **Frontend:** `http://localhost:3000`
- **Backend API:** `http://localhost:8000`
- **Database:** XAMPP MySQL (`havenspace_db`)

---

## 📝 What Happened?

The app **automatically detected** your local environment and:

- ✅ Connected to XAMPP MySQL database
- ✅ Configured CORS for localhost
- ✅ Enabled debug mode for development
- ✅ Set API endpoints to `http://localhost:8000`

**No code changes needed!** Everything is controlled through environment variables.

---

## 🔧 Common Next Steps

### Run Database Migrations

```bash
cd server
mysql -u root -p havenspace_db < database/schema.sql
mysql -u root -p havenspace_db < database/migrations/001_create_users_table.sql
```

### Seed Test Data

```bash
php database/seeds/UserSeeder.php
php database/seeds/PropertySeeder.php
```

### Setup Google OAuth (Optional)

1. Get credentials from [Google Cloud Console](https://console.cloud.google.com/)
2. Update `server/.env`:
   ```env
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```

---

## 🆘 Troubleshooting

### Backend won't start

```bash
# Check if port 8000 is already in use
netstat -an | findstr 8000

# Kill process using port 8000 (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Database connection error

- Verify MySQL is running in XAMPP Control Panel
- Check database exists: `mysql -u root -p -e "SHOW DATABASES;"`
- Verify `.env` file exists in `server/` folder

### Frontend can't connect to backend

- Check backend is running on port 8000
- Verify browser console shows correct `API_BASE_URL`
- Check CORS errors in console

---

## 📚 Learn More

- **Complete Setup Guide:** [docs/ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md)
- **Backend API Docs:** [server/Readme.md](server/Readme.md)
- **Frontend Docs:** [client/README.md](client/README.md)

---

**Last Updated:** 2026-04-09  
**Estimated Setup Time:** 5 minutes
