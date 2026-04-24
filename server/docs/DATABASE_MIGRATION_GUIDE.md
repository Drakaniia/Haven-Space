# Database Environment Switching Migration Guide

## Overview

The Haven Space application now supports automatic database switching based on the `APP_ENV` environment variable:

- **Local Development** (`APP_ENV=local`): Uses XAMPP MySQL database
- **Production** (`APP_ENV=production`): Uses Appwrite Cloud Database

## How It Works

### Environment Detection

The system automatically detects the environment using the `APP_ENV` variable in your `.env` file:

```env
# For local development
APP_ENV=local

# For production deployment
APP_ENV=production
```

### Database Adapters

- **MySQLAdapter**: Handles traditional MySQL operations via PDO
- **AppwriteAdapter**: Handles Appwrite database operations via Appwrite SDK
- **DatabaseInterface**: Unified interface that both adapters implement

## Migration Steps for Existing Code

### 1. Replace Direct Database Calls

**Old Code (MySQL only):**

```php
require_once __DIR__ . '/../../config/database.php';
$pdo = getDB();
$stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
$stmt->execute([$userId]);
$user = $stmt->fetch();
```

**New Code (Environment-aware):**

```php
require_once __DIR__ . '/../../config/database.php';
$db = getUnifiedDB();
$user = $db->select('users', ['id' => $userId]);
```

### 2. Update CRUD Operations

#### SELECT Operations

```php
// Simple select
$users = $db->select('users');

// With conditions
$activeUsers = $db->select('users', ['status' => 'active']);

// With options (limit, order, etc.)
$recentUsers = $db->select('users', [], [
    'order' => 'created_at DESC',
    'limit' => 10
]);
```

#### INSERT Operations

```php
$userId = $db->insert('users', [
    'name' => 'John Doe',
    'email' => 'john@example.com',
    'status' => 'active'
]);
```

#### UPDATE Operations

```php
$affectedRows = $db->update('users',
    ['status' => 'inactive'],
    ['id' => $userId]
);
```

#### DELETE Operations

```php
$deletedRows = $db->delete('users', ['id' => $userId]);
```

### 3. Handle Complex Queries

For complex MySQL queries that can't be easily converted to the unified interface:

```php
$db = getUnifiedDB();
$dbType = \App\Core\Database\DatabaseManager::getDatabaseType();

if ($dbType === 'mysql') {
    // Use MySQL-specific complex query
    $mysqlAdapter = $db;
    $pdo = $mysqlAdapter->getPdo();
    $stmt = $pdo->prepare("
        SELECT u.*, p.property_name
        FROM users u
        LEFT JOIN properties p ON u.id = p.landlord_id
        WHERE u.created_at > ?
    ");
    $stmt->execute([$date]);
    $results = $stmt->fetchAll();
} else {
    // Use Appwrite-specific operations
    $users = $db->select('users', ['created_at' => ['>', $date]]);
    // Handle joins manually or restructure data model
}
```

## Testing the Implementation

### 1. Test Local Environment

```bash
# Ensure APP_ENV=local in .env
curl http://localhost/api/test-environment.php
```

### 2. Test Production Environment

```bash
# Change APP_ENV=production in .env
curl https://haven-space.appwrite.network/api/test-environment.php
```

## Important Considerations

### 1. Data Model Differences

- **MySQL**: Uses traditional relational tables with foreign keys
- **Appwrite**: Uses document-based collections with embedded relationships

### 2. Transaction Support

- **MySQL**: Full transaction support (BEGIN, COMMIT, ROLLBACK)
- **Appwrite**: No traditional transactions (implement application-level logic)

### 3. Query Complexity

- **MySQL**: Supports complex SQL queries, JOINs, subqueries
- **Appwrite**: Limited to document queries, no JOINs (denormalize data)

### 4. Migration Strategy

1. **Phase 1**: Implement unified interface for simple CRUD operations
2. **Phase 2**: Migrate complex queries to work with both systems
3. **Phase 3**: Optimize data models for each database type

## Example API Endpoint Migration

### Before (MySQL only):

```php
<?php
require_once __DIR__ . '/../../config/database.php';

$pdo = getDB();
$stmt = $pdo->prepare("SELECT * FROM properties WHERE status = 'active'");
$stmt->execute();
$properties = $stmt->fetchAll();

echo json_encode(['properties' => $properties]);
?>
```

### After (Environment-aware):

```php
<?php
require_once __DIR__ . '/../../config/database.php';

$db = getUnifiedDB();
$properties = $db->select('properties', ['status' => 'active']);

echo json_encode(['properties' => $properties]);
?>
```

## Deployment Process

### Local to Production Switch

1. Update `.env` file: `APP_ENV=production`
2. Ensure Appwrite collections match MySQL table structure
3. Test all API endpoints
4. Deploy to production

### Production to Local Switch

1. Update `.env` file: `APP_ENV=local`
2. Ensure XAMPP is running
3. Import latest database backup
4. Test locally

## Troubleshooting

### Common Issues

1. **Missing Appwrite Collections**: Ensure all MySQL tables have corresponding Appwrite collections
2. **Field Name Mismatches**: Appwrite uses different field naming conventions
3. **Data Type Differences**: Handle date/time formats between systems
4. **Authentication**: Ensure Appwrite API keys are correctly configured

### Debug Mode

Enable debug mode in `.env`:

```env
APP_DEBUG=true
```

This will provide detailed error messages for troubleshooting database issues.
