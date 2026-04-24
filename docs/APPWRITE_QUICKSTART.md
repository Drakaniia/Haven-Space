# Appwrite Quick Start Guide

Get your Haven Space database running on Appwrite in 5 minutes! 🚀

## 1. Setup Appwrite Account

1. **Sign up** at [appwrite.io](https://appwrite.io)
2. **Create a project** (e.g., "Haven Space")
3. **Create a database** (e.g., "havenspace-db")
4. **Generate API key** with database permissions

## 2. Configure Environment

Add to your `server/.env`:

```env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id_here
APPWRITE_API_KEY=your_api_key_here
APPWRITE_DATABASE_ID=your_database_id_here
```

## 3. Test Connection

```bash
bun run appwrite:test
```

This verifies your credentials and permissions.

## 4. Preview Setup (Recommended)

```bash
bun run appwrite:setup:dry
```

This shows what collections and attributes will be created **without making changes**.

## 5. Create Database Schema

```bash
# Create collections and attributes
bun run appwrite:setup

# OR create with sample data
bun run appwrite:setup:seed
```

## 6. Verify Setup

Check your Appwrite console - you should see:

- ✅ **Collections** created from your SQL tables
- ✅ **Attributes** with correct types and constraints
- ✅ **Sample data** (if you used `--seed`)

## What Just Happened?

The setup script automatically:

1. **Parsed** your `server/database/schema.sql`
2. **Parsed** all files in `server/database/migrations/`
3. **Converted** SQL tables → Appwrite collections
4. **Converted** SQL columns → Appwrite attributes
5. **Converted** INSERT statements → Appwrite documents

**No manual migration files needed!** 🎉

## Common Commands

```bash
# Test connection and permissions
bun run appwrite:test

# Preview what will be created
bun run appwrite:setup:dry

# Create database schema
bun run appwrite:setup

# Create schema + seed data
bun run appwrite:setup:seed

# Reset everything (DESTRUCTIVE!)
bun run appwrite:reset

# Check migration status
bun run appwrite:migrate:status
```

## Troubleshooting

**Connection issues?**

- Check your `.env` file
- Verify API key permissions
- Run `bun run appwrite:test`

**Parsing errors?**

- Check SQL syntax in your files
- Use `--dry-run` to debug
- See [full setup guide](./APPWRITE_SETUP.md)

## Next Steps

1. **Update your app** to use Appwrite SDK
2. **Configure permissions** in Appwrite console
3. **Set up authentication**
4. **Deploy to production**

---

**That's it!** Your SQL database is now running on Appwrite. 🎉
