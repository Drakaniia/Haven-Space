# Haven Space API Function

This is the main API function for the Haven Space application, built with PHP and deployed on Appwrite Functions.

## Structure

```
functions/api/
├── main.php          # Main entry point
├── composer.json     # PHP dependencies
├── vendor/           # Installed dependencies
├── .env.example      # Environment variables template
└── README.md         # This file
```

## Features

- **RESTful API endpoints** for users, properties, and applications
- **CORS support** for cross-origin requests
- **Error handling** with proper HTTP status codes
- **Environment-based configuration**
- **Appwrite SDK integration** for database operations

## API Endpoints

### Root Endpoints

- `GET /` - API information
- `GET /health` - Health check

### User Management

- `GET /api/users` - List all users
- `POST /api/users` - Create a new user

### Property Management

- `GET /api/properties` - List all properties
- `POST /api/properties` - Create a new property

### Application Management

- `GET /api/applications` - List all applications
- `POST /api/applications` - Create a new application

## Environment Variables

Copy `.env.example` to `.env` and update with your values:

```bash
# Appwrite Configuration
APPWRITE_FUNCTION_ENDPOINT=https://fra.cloud.appwrite.io/v1
APPWRITE_FUNCTION_PROJECT_ID=69eae504002697b6749c

# Database Configuration
DATABASE_ID=your_database_id
USERS_TABLE_ID=your_users_table_id
PROPERTIES_TABLE_ID=your_properties_table_id
APPLICATIONS_TABLE_ID=your_applications_table_id
```

## Deployment

1. Install dependencies:

   ```bash
   composer install --no-dev --optimize-autoloader
   ```

2. Deploy using Appwrite CLI:

   ```bash
   appwrite functions deploy api-function
   ```

3. Or use the deployment script:
   ```bash
   bash ../../deploy-function.sh
   ```

## Testing

After deployment, test the endpoints:

```bash
# Health check
curl https://fra.cloud.appwrite.io/v1/functions/api-function/executions \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"path": "/health", "method": "GET"}'

# List users
curl https://fra.cloud.appwrite.io/v1/functions/api-function/executions \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"path": "/api/users", "method": "GET"}'
```

## Development

For local development, ensure you have:

- PHP 8.0 or higher
- Composer
- Appwrite CLI

## Error Handling

The function includes comprehensive error handling:

- Database connection errors
- Invalid request formats
- Missing required fields
- Proper HTTP status codes
- CORS headers for all responses
