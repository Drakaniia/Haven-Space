# Deploy Haven Space to Render + Aiven

Complete step-by-step guide to deploy Haven Space production infrastructure using Render (hosting) and Aiven (database).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
    ┌─────────▼──────────┐        ┌────────▼──────────┐
    │  Frontend (Free)   │        │  Backend ($7/mo)  │
    │  haven-space-web   │        │  haven-space-api  │
    │  .onrender.com     │───────▶│  .onrender.com    │
    │  Static Site       │  CORS  │  Docker (PHP 8.2) │
    └────────────────────┘        └──────────────────┘
                                           │
                                    ┌──────▼────────┐
                                    │  Aiven (Free)  │
                                    │  MySQL 8.0     │
                                    │  .aivencloud.com│
                                    │  SSL Required  │
                                    └────────────────
```

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Set Up Aiven Database](#step-1-set-up-aiven-database)
3. [Step 2: Push Code to GitHub](#step-2-push-code-to-github)
4. [Step 3: Deploy Backend to Render](#step-3-deploy-backend-to-render)
5. [Step 4: Deploy Frontend to Render](#step-4-deploy-frontend-to-render)
6. [Step 5: Configure Environment Variables](#step-5-configure-environment-variables)
7. [Step 6: Run Database Migrations](#step-6-run-database-migrations)
8. [Step 7: Update Google OAuth](#step-7-update-google-oauth)
9. [Step 8: Configure CORS](#step-8-configure-cors)
10. [Verification Checklist](#verification-checklist)
11. [Troubleshooting](#troubleshooting)
12. [Cost Breakdown](#cost-breakdown)
13. [Maintenance](#maintenance)

---

## Prerequisites

### Required Accounts

- [ ] GitHub account (code hosting)
- [ ] Render account (deployment) - [Sign up](https://dashboard.render.com/)
- [ ] Aiven account (database) - [Sign up](https://aiven.io/)
- [ ] Google Cloud Console account (OAuth) - [Console](https://console.cloud.google.com/)

### Required Tools

- [ ] Git installed locally
- [ ] Code editor (VS Code recommended)
- [ ] Your Haven Space codebase ready

### Estimated Time

- **Setup**: 30-45 minutes
- **Deployment**: 10-15 minutes (waiting for builds)

---

## Step 1: Set Up Aiven Database

### 1.1 Create Aiven Account

1. Go to [Aiven.io](https://aiven.io/)
2. Click **Sign Up** (free, no credit card required for free tier)
3. Verify your email

### 1.2 Create MySQL Service

1. From Aiven dashboard, click **Create Service**
2. Choose **MySQL**
3. Select **Hobbyist Plan** (Free tier):
   - 1 CPU
   - 1 GB RAM
   - 5 GB storage
   - 100 max connections
4. Choose **Region** (pick closest to your users):
   - `asia-southeast1` (Singapore) - Recommended for Asia
   - `us-east1` (Virginia) - Recommended for US
   - `europe-west1` (London) - Recommended for Europe
5. Click **Create Service**

### 1.3 Get Database Credentials

After service is created (takes 2-3 minutes):

1. Click your MySQL service
2. Go to **Overview** tab
3. Find **Connection Information** section
4. You'll see:

```
Host:         mysql-3cc11cfe-floresaybaez574-5b34.d.aivencloud.com
Port:         17370
Database:     defaultdb
Username:     avnadmin
Password:     avnadmin_xxxxxxxxxxxx
SSL Mode:     REQUIRED
```

5. Click the **eye icon** next to password to reveal it
6. **Copy and save all these values** - you'll need them for Render

### 1.4 Download CA Certificate (Optional but Recommended)

1. Click **Download** next to "CA certificate"
2. Save it as `ca.pem` in your project root (optional for now)

---

## Step 2: Push Code to GitHub

### 2.1 Verify Project Structure

Your project should have these files:

```
Final/
├── server/
│   ├── Dockerfile              ✅ Required
│   ├── .dockerignore           ✅ Required
│   ├── api/                    ✅ Backend API
│   ├── config/
│   │   └── database.php        ✅ Updated with SSL support
│   └── src/
│       └── Core/
│           └── Database/
│               └── Connection.php  ✅ Updated with SSL
├── client/                     ✅ Frontend
├── render.yaml                 ✅ Render configuration
├── docker-compose.yml          ✅ Local Docker setup
└── docs/
    └── DEPLOYMENT_RENDER_AIVEN.md  ✅ This guide
```

### 2.2 Commit and Push

```bash
# Navigate to project root
cd C:\Users\Qwenzy\Desktop\Final

# Check status
git status

# Add all files
git add .

# Commit
git commit -m "feat: add Docker support and Render/Aiven deployment configuration"

# Push to GitHub
git push origin main
```

### 2.3 Verify on GitHub

1. Go to your repository on GitHub
2. Verify all files are pushed
3. Check that `server/Dockerfile` and `render.yaml` are present

---

## Step 3: Deploy Backend to Render

### 3.1 Create Render Account

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **Sign Up**
3. Connect with your GitHub account
4. Authorize Render to access your repositories

### 3.2 Deploy via Blueprint (Recommended)

Blueprint auto-deploys everything from `render.yaml`:

1. From Render dashboard, click **New** → **Blueprint**
2. Select your Haven Space repository
3. Render reads `render.yaml` and shows planned services
4. Click **Apply**

### 3.3 Or Deploy Manually

If you prefer manual setup:

#### 3.3.1 Create Backend Service

1. Click **New** → **Web Service**
2. Connect your GitHub repo
3. Configure:

| Field              | Value                                  |
| ------------------ | -------------------------------------- |
| **Name**           | `haven-space-api`                      |
| **Environment**    | `Docker`                               |
| **Root Directory** | `server`                               |
| **Docker Command** | (leave blank)                          |
| **Region**         | Singapore (or match your Aiven region) |
| **Plan**           | Starter ($7/month)                     |

4. Click **Create Web Service**

### 3.4 Wait for Build

- Build takes **3-5 minutes**
- You'll see live logs in the dashboard
- Status changes: **Building** → **Deploying** → **Live**

### 3.5 Note Your Backend URL

After deployment:

```
https://haven-space-api.onrender.com
```

---

## Step 4: Deploy Frontend to Render

### 4.1 Create Frontend Service

1. Click **New** → **Static Site**
2. Connect your GitHub repo
3. Configure:

| Field                 | Value                          |
| --------------------- | ------------------------------ |
| **Name**              | `haven-space-frontend`         |
| **Branch**            | `main`                         |
| **Root Directory**    | (leave blank)                  |
| **Build Command**     | `npm install && npm run build` |
| **Publish Directory** | `./dist`                       |
| **Region**            | Singapore (match backend)      |
| **Plan**              | Free                           |

4. Click **Create Static Site**

### 4.2 Wait for Build

- Build takes **1-2 minutes**
- Status changes: **Building** → **Deploying** → **Live**

### 4.3 Note Your Frontend URL

After deployment:

```
https://haven-space-frontend.onrender.com
```

---

## Step 5: Configure Environment Variables

### 5.1 Backend Environment Variables

1. Go to **haven-space-api** service → **Environment** tab
2. Add these variables:

#### Application Settings

```
APP_ENV=production
APP_DEBUG=false
```

#### JWT Configuration

```
JWT_SECRET=(click "Generate" button for random 64-char key)
JWT_EXPIRATION=3600
REFRESH_TOKEN_EXPIRATION=604800
```

#### Aiven Database Credentials

```
DB_HOST=mysql-3cc11cfe-floresaybaez574-5b34.d.aivencloud.com
DB_PORT=17370
DB_NAME=defaultdb
DB_USER=avnadmin
DB_PASSWORD=avnadmin_xxxxxxxxxxxx
DB_SSL_MODE=REQUIRED
```

#### Google OAuth

```
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=https://haven-space-api.onrender.com/api/auth/google/callback.php
```

#### CORS (Update after frontend deploys)

```
ALLOWED_ORIGINS=https://haven-space-frontend.onrender.com,http://localhost:3000
```

3. Click **Save Changes**
4. Service will redeploy automatically (~2 minutes)

### 5.2 Verify Environment Variables

Go to **haven-space-api** → **Environment** and verify all variables are set correctly.

---

## Step 6: Run Database Migrations

### 6.1 Access Render Shell

1. Go to **haven-space-api** → **Shell** tab
2. Wait for shell to connect (~10 seconds)

### 6.2 Run Migrations

```bash
# Navigate to server directory
cd /opt/render/project/src/server

# Run migrations
php database/migrate.php
```

### 6.3 Verify Tables

```bash
# Connect to database
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME --ssl-mode=REQUIRED

# Show tables
SHOW TABLES;

# Exit
exit
```

Expected tables:

- `users`
- `properties`
- `rooms`
- `bookings`
- `applications`
- `payments`
- `messages`
- `maintenance_requests`
- `notices`
- `login_attempts`
- `welcome_message_templates`

---

## Step 7: Update Google OAuth

### 7.1 Go to Google Cloud Console

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**

### 7.2 Update Authorized Redirect URIs

1. Find your **OAuth 2.0 Client ID**
2. Click **Edit** (pencil icon)
3. Under **Authorized redirect URIs**, add:

```
http://localhost:8000/api/auth/google/callback.php
https://haven-space-api.onrender.com/api/auth/google/callback.php
```

4. Click **Save**

### 7.3 Verify Google OAuth Settings

- **Authorized JavaScript origins**: (optional, leave empty for now)
- **Authorized redirect URIs**: Must match exactly (no trailing slashes)

---

## Step 8: Configure CORS

### 8.1 Update Backend CORS

1. Go to **haven-space-api** → **Environment**
2. Update `ALLOWED_ORIGINS`:

```
ALLOWED_ORIGINS=https://haven-space-frontend.onrender.com,http://localhost:3000
```

3. Click **Save Changes**
4. Wait for redeployment

### 8.2 Update Frontend API URL

1. Edit `client/js/config.js`:

```javascript
// Production API URL
const API_BASE_URL = 'https://haven-space-api.onrender.com/api';
```

2. Commit and push:

```bash
git add client/js/config.js
git commit -m "chore: update API URL for production"
git push
```

3. Frontend will redeploy automatically

---

## Verification Checklist

### ✅ Deployment Verification

- [ ] Backend is live at `https://haven-space-api.onrender.com`
- [ ] Frontend is live at `https://haven-space-frontend.onrender.com`
- [ ] Health check returns 200: `https://haven-space-api.onrender.com/health.php`
- [ ] Database migrations completed successfully
- [ ] All environment variables are set correctly

### ✅ Functionality Verification

- [ ] Frontend loads without errors
- [ ] Login page displays correctly
- [ ] Google OAuth button redirects to Google
- [ ] Google OAuth callback works (no redirect_uri_mismatch error)
- [ ] User can sign up and log in
- [ ] Database connections work (check Render logs)
- [ ] No CORS errors in browser console
- [ ] API endpoints respond correctly

### ✅ Security Verification

- [ ] `APP_DEBUG=false` (no sensitive info in errors)
- [ ] `DB_SSL_MODE=REQUIRED` (encrypted database connection)
- [ ] `JWT_SECRET` is strong and random (64+ characters)
- [ ] Google OAuth credentials are correct
- [ ] CORS only allows your frontend domain

### Testing Commands

```bash
# Test health endpoint
curl https://haven-space-api.onrender.com/health.php

# Test CORS headers
curl -I -H "Origin: https://haven-space-frontend.onrender.com" \
  https://haven-space-api.onrender.com/api/auth/login.php

# Verify SSL connection to database (from Render shell)
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME --ssl-mode=REQUIRED -e "SELECT 1"
```

---

## Troubleshooting

### Database Connection Fails

**Error:**

```
SQLSTATE[HY000] [2002] Connection refused
```

**Solutions:**

1. Verify `DB_HOST`, `DB_PORT`, `DB_PASSWORD` match Aiven credentials exactly
2. Ensure `DB_SSL_MODE=REQUIRED` is set
3. Check Aiven service status (may be sleeping on free tier)
4. Verify firewall rules in Aiven (allow all IPs for Render)

### SSL Certificate Error

**Error:**

```
SQLSTATE[HY000] [2002] SSL connection is required
```

**Solutions:**

1. Ensure `DB_SSL_MODE=REQUIRED` in environment variables
2. Check that `Connection.php` has SSL configuration
3. Verify PDO MySQL extension is installed in Dockerfile

### Google OAuth Fails

**Error:**

```
Error 400: redirect_uri_mismatch
```

**Solutions:**

1. Check `GOOGLE_REDIRECT_URI` matches exactly in Google Console
2. No trailing slashes in redirect URI
3. Verify both local and production URIs are added
4. Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct

### CORS Errors

**Error:**

```
Access to fetch at 'xxx' has been blocked by CORS policy
```

**Solutions:**

1. Add frontend URL to `ALLOWED_ORIGINS`
2. Verify backend `cors.php` middleware is working
3. Check browser console for exact error message
4. Ensure `Access-Control-Allow-Origin` header is present

### Build Fails on Render

**Error:**

```
Docker build failed
```

**Solutions:**

1. Check `server/Dockerfile` syntax
2. Verify `server/.dockerignore` excludes large files
3. Check build logs for specific error
4. Test Dockerfile locally: `cd server && docker build .`

### Migration Fails

**Error:**

```
Table 'users' already exists
```

**Solutions:**

1. Use `CREATE TABLE IF NOT EXISTS` in migrations
2. Drop tables first: `DROP TABLE IF EXISTS users;`
3. Check migration order (use numbered files: `001_`, `002_`, etc.)

### Frontend Can't Connect to Backend

**Symptoms:**

- Frontend loads but API calls fail
- Console shows network errors

**Solutions:**

1. Verify `API_BASE_URL` in `client/js/config.js`
2. Check backend URL is correct (no typos)
3. Verify backend is live (check Render dashboard)
4. Check browser console for exact error

---

## Cost Breakdown

### Monthly Costs

| Service                      | Plan     | Features             | Cost         |
| ---------------------------- | -------- | -------------------- | ------------ |
| **Frontend** (Render Static) | Free     | 100GB bandwidth, CDN | $0           |
| **Backend** (Render Web)     | Starter  | 512MB RAM, 0.1 CPU   | $7/mo        |
| **Database** (Aiven MySQL)   | Hobbyist | 1GB RAM, 5GB storage | $0           |
| **Google OAuth**             | Free     | Unlimited requests   | $0           |
| **GitHub**                   | Free     | Unlimited repos      | $0           |
| **Total**                    |          |                      | **$7/month** |

### Free Tier Limits

**Render Free:**

- 750 hours/month free instance hours
- Static sites always free
- Web services: $7/mo minimum

**Aiven Hobbyist:**

- 1 CPU, 1 GB RAM
- 5 GB storage
- 100 max connections
- Daily backups (7-day retention)
- Sleeps after 24h inactivity (wakes on connection)

### Scaling Estimates

| Users      | Backend Plan      | Database Plan        | Monthly Cost |
| ---------- | ----------------- | -------------------- | ------------ |
| 0-100      | Starter           | Hobbyist             | $7           |
| 100-1000   | Standard ($25/mo) | Startup-4 ($50/mo)   | $75          |
| 1000-10000 | Pro ($100/mo)     | Business-4 ($200/mo) | $300         |

---

## Maintenance

### Daily Tasks

- [ ] Monitor Render dashboard for errors
- [ ] Check Aiven metrics (CPU, memory, connections)
- [ ] Review error logs in Render

### Weekly Tasks

- [ ] Check disk usage (Aiven: 5GB limit)
- [ ] Review slow queries in Aiven
- [ ] Verify backups are running

### Monthly Tasks

- [ ] Update dependencies (`composer update`, `npm update`)
- [ ] Review and rotate secrets (JWT_SECRET, DB_PASSWORD)
- [ ] Check for PHP/MySQL security updates

### Monitoring

#### Render Dashboard

- **Logs**: `haven-space-api` → **Logs** tab
- **Metrics**: CPU, Memory, Response time
- **Events**: Deployment history, rollbacks

#### Aiven Console

- **Overview**: CPU, Memory, Disk usage
- **Metrics**: Connections, queries, replication lag
- **Backups**: Automatic daily backups

### Backup Strategy

**Aiven Backups:**

- Automatic daily backups
- 7-day retention (free tier)
- Point-in-time recovery (paid tiers)

**Manual Backup:**

```bash
# From Render shell
mysqldump -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME \
  --ssl-mode=REQUIRED > backup_$(date +%Y%m%d).sql
```

**Restore Backup:**

```bash
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME \
  --ssl-mode=REQUIRED < backup_20260410.sql
```

### Updating the Application

#### Deploy New Code

```bash
# Make changes
git add .
git commit -m "feat: add new feature"
git push
```

Render auto-deploys on push to `main` branch.

#### Rollback

1. Go to **haven-space-api** → **Events**
2. Find previous deployment
3. Click **Rollback**

### Security Updates

#### PHP Updates

Update Dockerfile:

```dockerfile
FROM php:8.3-apache  # Upgrade from 8.2
```

#### Dependency Updates

```bash
# Backend
cd server
composer update
git commit -am "chore: update PHP dependencies"
git push

# Frontend
npm update
git commit -am "chore: update Node dependencies"
git push
```

#### Database Security

- Rotate passwords regularly via Aiven console
- Enable IP allowlist (restrict to Render IPs)
- Monitor login attempts table

---

## Environment Variables Reference

### Required Variables

| Variable                   | Description            | Example                                                 | Sensitive |
| -------------------------- | ---------------------- | ------------------------------------------------------- | --------- |
| `APP_ENV`                  | Environment name       | `production`                                            | No        |
| `APP_DEBUG`                | Debug mode             | `false`                                                 | No        |
| `JWT_SECRET`               | JWT signing key        | (64-char random)                                        | **Yes**   |
| `JWT_EXPIRATION`           | Token expiry (seconds) | `3600`                                                  | No        |
| `REFRESH_TOKEN_EXPIRATION` | Refresh token expiry   | `604800`                                                | No        |
| `DB_HOST`                  | Database host          | `mysql-xxx.d.aivencloud.com`                            | No        |
| `DB_PORT`                  | Database port          | `17370`                                                 | No        |
| `DB_NAME`                  | Database name          | `defaultdb`                                             | No        |
| `DB_USER`                  | Database user          | `avnadmin`                                              | No        |
| `DB_PASSWORD`              | Database password      | `avnadmin_xxx`                                          | **Yes**   |
| `DB_SSL_MODE`              | SSL requirement        | `REQUIRED`                                              | No        |
| `GOOGLE_CLIENT_ID`         | Google OAuth ID        | `xxxxx.apps.googleusercontent.com`                      | No        |
| `GOOGLE_CLIENT_SECRET`     | Google OAuth secret    | `GOCSPX-xxxxx`                                          | **Yes**   |
| `GOOGLE_REDIRECT_URI`      | OAuth callback URL     | `https://xxx.onrender.com/api/auth/google/callback.php` | No        |
| `ALLOWED_ORIGINS`          | CORS origins           | `https://frontend.onrender.com`                         | No        |

### How to Generate JWT_SECRET

```bash
# Option 1: Use Render's "Generate" button
# Option 2: Generate locally
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 3: Use openssl
openssl rand -hex 32
```

---

## Custom Domain Setup (Optional)

### Purchase Domain

Buy from any registrar (Namecheap, GoDaddy, Cloudflare, etc.)

### Configure DNS

#### Frontend Custom Domain

1. Go to **haven-space-frontend** → **Settings** → **Custom Domains**
2. Add domain: `havenspace.com` or `www.havenspace.com`
3. Render provides DNS targets:
   ```
   havenspace.com → CNAME to havenspace-web.onrender.com
   www.havenspace.com → CNAME to havenspace-web.onrender.com
   ```
4. Add CNAME records in your domain registrar

#### Backend Custom Domain

1. Go to **haven-space-api** → **Settings** → **Custom Domains**
2. Add domain: `api.havenspace.com`
3. Render provides DNS target:
   ```
   api.havenspace.com → CNAME to havenspace-api.onrender.com
   ```
4. Add CNAME record in your domain registrar

### Update Environment Variables

After custom domain is set up:

```bash
# Backend
GOOGLE_REDIRECT_URI=https://api.havenspace.com/api/auth/google/callback.php
ALLOWED_ORIGINS=https://havenspace.com,https://www.havenspace.com

# Frontend
const API_BASE_URL = 'https://api.havenspace.com/api';
```

### Enable HTTPS

Render automatically provisions SSL certificates via Let's Encrypt (free).

---

## Useful Commands

### Render CLI (Optional)

Install Render CLI:

```bash
npm install -g @render-oss/cli
```

View services:

```bash
render services list
```

View logs:

```bash
render logs tail haven-space-api
```

### Docker Commands (Local Testing)

```bash
# Build image
cd server
docker build -t haven-space-api .

# Run container
docker run -d -p 8000:80 --env-file .env haven-space-api

# View logs
docker logs -f haven-space-api

# Execute shell
docker exec -it haven-space-api bash
```

### Database Commands (From Render Shell)

```bash
# Connect to database
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME --ssl-mode=REQUIRED

# Show tables
SHOW TABLES;

# Describe table
DESCRIBE users;

# Count users
SELECT COUNT(*) FROM users;

# Exit
exit
```

---

## Support and Resources

### Documentation

- [Render Docs](https://render.com/docs)
- [Aiven Docs](https://docs.aiven.io/)
- [Docker Docs](https://docs.docker.com/)
- [PHP Docs](https://www.php.net/docs.php)

### Community

- [Render Discord](https://discord.gg/render)
- [Aiven Slack](https://aiven.io/slack)
- [GitHub Issues](https://github.com/Drakaniia/Haven-Space/issues)

### Contact

- **Render Support**: support@render.com
- **Aiven Support**: support@aiven.io
- **Project Issues**: Create issue on GitHub

---

## Changelog

| Date       | Version | Changes                         |
| ---------- | ------- | ------------------------------- |
| 2026-04-10 | 1.0.0   | Initial deployment guide        |
|            |         | - Added Docker support          |
|            |         | - Added Aiven MySQL integration |
|            |         | - Added SSL configuration       |
|            |         | - Added Render deployment steps |

---

## License

This guide is part of the Haven Space project. See project license for details.
