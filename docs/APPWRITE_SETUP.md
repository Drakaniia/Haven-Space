# Appwrite Database Setup Guide

This guide explains how to use the automated Appwrite setup script that converts your SQL schema and migrations to Appwrite collections automatically.

## Overview

The `scripts/appwrite-setup.js` script is a **smart SQL parser** that:

1. **Reads your existing SQL files** (schema.sql + all migrations)
2. **Parses table structures** (columns, data types, constraints)
3. **Extracts seed data** from INSERT statements
4. **Translates everything to Appwrite API calls** automatically
5. **Creates collections and documents** without manual intervention

**No more manual .js migration files needed!** 🎉

## Prerequisites

1. **Appwrite Account**: Sign up at [appwrite.io](https://appwrite.io)
2. **Project Created**: Create a new project in Appwrite console
3. **Database Created**: Create a database in your project
4. **API Key**: Generate an API key with database permissions

## Configuration

### 1. Environment Variables

Add these to your `server/.env` file:

```env
# Appwrite Configuration
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id_here
APPWRITE_API_KEY=your_api_key_here
APPWRITE_DATABASE_ID=your_database_id_here
```

### 2. Get Your Credentials

**Project ID**: Found in your Appwrite project settings
**Database ID**: Found in your database settings (or create a new one)
**API Key**: Create in Project Settings → API Keys with these scopes:

- `databases.read`
- `databases.write`
- `collections.read`
- `collections.write`
- `attributes.read`
- `attributes.write`
- `documents.read`
- `documents.write`

## Usage

### Basic Setup

```bash
# Preview what will be created (recommended first)
bun run appwrite:setup:dry

# Create collections and attributes
bun run appwrite:setup

# Create collections + seed initial data
bun run appwrite:setup:seed
```

### Advanced Options

```bash
# Reset everything and recreate (DESTRUCTIVE!)
bun run appwrite:reset

# Preview reset operation
bun run appwrite:reset:dry

# Check migration status
bun run appwrite:migrate:status
```

## What Gets Parsed

### SQL Tables → Appwrite Collections

The parser automatically converts:

| SQL Feature            | Appwrite Equivalent         | Notes                     |
| ---------------------- | --------------------------- | ------------------------- |
| `CREATE TABLE users`   | Collection "users"          | Collection ID sanitized   |
| `VARCHAR(255)`         | String attribute (size 255) | Size preserved            |
| `INT AUTO_INCREMENT`   | Skipped                     | Appwrite handles IDs      |
| `ENUM('a','b','c')`    | Enum attribute              | Options extracted         |
| `BOOLEAN DEFAULT TRUE` | Boolean attribute           | Default preserved         |
| `TIMESTAMP`            | DateTime attribute          | Converted to ISO format   |
| `DECIMAL(10,2)`        | Float attribute             | Precision handled         |
| `NOT NULL`             | Required attribute          | Constraint preserved      |
| `INSERT INTO...`       | Document creation           | Data seeded automatically |

### Example Conversion

**SQL Input:**

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    role ENUM('boarder', 'landlord') DEFAULT 'boarder',
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (email, role) VALUES
('admin@mail.com', 'admin'),
('test@mail.com', 'boarder');
```

**Appwrite Output:**

- ✅ Collection: `users`
- ✅ Attributes:
  - `email` (string, required, size 255)
  - `role` (enum, options: ['boarder', 'landlord'], default: 'boarder')
  - `is_verified` (boolean, default: false)
  - `created_at` (datetime, default: current timestamp)
- ✅ Documents: 2 records seeded

## Supported SQL Features

### ✅ Fully Supported

- **Tables**: `CREATE TABLE`, `ALTER TABLE ADD COLUMN`
- **Data Types**: VARCHAR, CHAR, TEXT, INT, DECIMAL, FLOAT, BOOLEAN, TIMESTAMP, ENUM, JSON
- **Constraints**: NOT NULL, DEFAULT values, PRIMARY KEY (ignored), FOREIGN KEY (parsed but not enforced)
- **Data**: `INSERT INTO` statements with VALUES
- **Comments**: Single-line (`--`) and multi-line (`/* */`) comments are stripped

### ⚠️ Partially Supported

- **Foreign Keys**: Parsed but not enforced (Appwrite doesn't support FK constraints)
- **Indexes**: Parsed but not created (Appwrite handles indexing automatically)
- **Complex Defaults**: `CURRENT_TIMESTAMP` converted to current date, functions not supported

### ❌ Not Supported

- **Stored Procedures**: Not applicable to Appwrite
- **Triggers**: Not applicable to Appwrite
- **Views**: Not applicable to Appwrite
- **Complex JOINs in INSERT**: Only simple INSERT...VALUES supported

## File Structure

The parser reads SQL files in this order:

1. **`server/database/schema.sql`** - Main schema file
2. **`server/database/migrations/*.sql`** - All migration files (sorted alphabetically)

## Troubleshooting

### Common Issues

**1. Connection Failed**

```
✗ Failed to connect to Appwrite database
```

- Check your `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, and `APPWRITE_API_KEY`
- Verify API key has database permissions
- Ensure database exists in your project

**2. Collection Creation Failed**

```
✗ Failed to create collection: Invalid collection ID
```

- Collection IDs are auto-sanitized (lowercase, underscores only)
- Check for duplicate collection names

**3. Attribute Creation Failed**

```
✗ Failed users.email: Attribute already exists
```

- Use `--reset` to recreate collections
- Or manually delete attributes in Appwrite console

**4. Parsing Errors**

```
⚠ Skipped statement: Invalid CREATE TABLE syntax
```

- Check SQL syntax in your files
- Complex statements may need manual review

### Debug Mode

Use `--dry-run` to see what would be created without making changes:

```bash
bun run appwrite:setup:dry
```

This shows:

- Which collections would be created
- Which attributes would be added
- Which documents would be seeded

## Migration Workflow

### Development to Production

1. **Develop locally** with MySQL/PHP
2. **Test Appwrite setup** with `--dry-run`
3. **Apply to staging** with `appwrite:setup`
4. **Verify data** in Appwrite console
5. **Deploy to production** with same commands

### Schema Changes

1. **Add SQL migration** to `server/database/migrations/`
2. **Test locally** with MySQL
3. **Run Appwrite setup** to apply changes
4. **Verify** new attributes/collections created

## Performance Notes

- **Large datasets**: The parser handles INSERT statements, but for large datasets consider using Appwrite's bulk import
- **Rate limits**: The script includes delays between API calls to respect Appwrite rate limits
- **Batch operations**: Collections are created sequentially, attributes in parallel where possible

## Security Considerations

- **API Keys**: Never commit API keys to version control
- **Permissions**: Use least-privilege API keys (only database permissions needed)
- **Data**: Sensitive data in INSERT statements will be visible in Appwrite console

## Next Steps

After running the setup:

1. **Test API endpoints** with your frontend
2. **Configure Appwrite permissions** for your collections
3. **Set up authentication** in Appwrite console
4. **Update your app** to use Appwrite SDK instead of direct MySQL

## Support

If you encounter issues:

1. Check the [Appwrite Documentation](https://appwrite.io/docs)
2. Review the console output for specific error messages
3. Use `--dry-run` to debug without making changes
4. Check your SQL syntax if parsing fails

---

**Happy coding!** 🚀 Your SQL schema is now automatically converted to Appwrite collections.
