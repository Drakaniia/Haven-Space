# Haven Space API Testing with Codeception

Comprehensive guide for testing Haven Space API endpoints using Codeception.

## Quick Start

### 1. Install Dependencies

```bash
cd functions
composer require --dev codeception/codeception codeception/module-rest codeception/module-phpbrowser
```

### 2. Initialize Codeception

```bash
php vendor/bin/codecept bootstrap
php vendor/bin/codecept generate:suite api ApiTester
```

### 3. Configure Suite

Edit `tests/Api.suite.yml`:

```yaml
actor: ApiTester
modules:
  enabled:
    - REST:
        url: http://localhost:8000
        depends: PhpBrowser
        part: Json
    - PhpBrowser:
        url: http://localhost:8000
```

### 4. Build and Run

```bash
php vendor/bin/codecept build
php vendor/bin/codecept run api
```

---

## Project Structure

```
functions/
├── TESTING/
│   └── README.md              # This file
├── codeception.yml           # Global configuration
├── composer.json            # Dependencies
└── tests/
    ├── Api/
    │   ├── TestCest.php       # Basic endpoint tests
    │   ├── AuthCest.php       # Authentication tests
    │   ├── MessagesCest.php   # Message API tests
    │   ├── MaintenanceCest.php # Maintenance API tests
    │   ├── PropertiesCest.php  # Property API tests
    │   ├── PaymentsCest.php    # Payment API tests
    │   └── NotificationsCest.php # Notification tests
    ├── Api.suite.yml          # API test suite config
    ├── Support/
    │   ├── ApiTester.php      # Actor class
    │   └── _generated/        # Auto-generated traits
    ├── _envs/
    │   └── .env              # Environment variables
    └── _output/              # Test reports
```

---

## Configuration Files

### codeception.yml (Global)

```yaml
namespace: Tests
support_namespace: Support
paths:
  tests: tests
  output: tests/_output
  data: tests/Support/Data
  support: tests/Support
  envs: tests/_envs
actor_suffix: Tester
extensions:
  enabled:
    - Codeception\Extension\RunFailed
settings:
  colors: true
  memory_limit: 1024M
  log_inspectors: true
```

### tests/Api.suite.yml

```yaml
actor: ApiTester
modules:
  enabled:
    - REST:
        url: http://localhost:8000
        depends: PhpBrowser
        part: Json # Parse JSON responses automatically
    - PhpBrowser:
        url: http://localhost:8000
```

### composer.json Scripts

```json
{
  "scripts": {
    "test": "phpunit",
    "test:codeception": "vendor/bin/codecept run",
    "test:api": "vendor/bin/codecept run api",
    "test:api:debug": "vendor/bin/codecept run api --debug",
    "codecept:build": "vendor/bin/codecept build",
    "analyze": "phpstan analyse"
  }
}
```

Run scripts:

```bash
composer test:api         # Run API tests
composer test:api:debug   # Run with debug output
composer codecept:build   # Rebuild actor classes
```

---

## Writing Tests

### Test Template

```php
<?php

class ModuleNameCest
{
    public function _before(ApiTester $I)
    {
        // Setup - runs before each test
        $I->haveHttpHeader('Content-Type', 'application/json');
        $I->haveHttpHeader('Accept', 'application/json');
    }

    public function _after(ApiTester $I)
    {
        // Cleanup - runs after each test
    }

    public function testEndpointName(ApiTester $I)
    {
        $I->wantTo('describe what this test does');

        // Test implementation
        $I->sendGET('/api/endpoint');
        $I->seeResponseCodeIs(200);
        $I->seeResponseIsJson();
    }
}
```

### Authentication Helper

Create `tests/_support/Helper/Api.php`:

```php
<?php
namespace Tests\Support\Helper;

use Codeception\Module;

class Api extends Module
{
    public function loginAsLandlord()
    {
        $I = $this;
        $I->haveHttpHeader('Content-Type', 'application/json');
        $I->sendPOST('/auth/login', [
            'email' => 'qwenzy23062@gmail.com',
            'password' => 'Kenjigwapo_123'
        ]);
        $response = json_decode($I->grabResponse(), true);
        return $response['token'] ?? null;
    }

    public function loginAsBoarder()
    {
        $I = $this;
        $I->haveHttpHeader('Content-Type', 'application/json');
        $I->sendPOST('/auth/login', [
            'email' => 'alistairybaez574@gmail.com',
            'password' => 'Kenjigwapo_123'
        ]);
        $response = json_decode($I->grabResponse(), true);
        return $response['token'] ?? null;
    }

    public function getToken()
    {
        return getenv('AUTH_TOKEN') ?? $this->loginAsLandlord();
    }
}
```

Update `tests/Api.suite.yml` to include the helper:

```yaml
actor: ApiTester
modules:
  enabled:
    - REST:
        url: http://localhost:8000
        depends: PhpBrowser
    - PhpBrowser:
        url: http://localhost:8000
    - \Tests\Support\Helper\Api
```

---

## Available Test Modules

Haven Space has the following API modules that can be tested:

| Module        | Endpoint                      | Type | Description                |
| ------------- | ----------------------------- | ---- | -------------------------- |
| Auth          | `/auth/login`                 | POST | User login                 |
| Auth          | `/auth/register`              | POST | User registration          |
| Messages      | `/api/messages/conversations` | GET  | List conversations         |
| Messages      | `/api/messages`               | POST | Send message               |
| Maintenance   | `/api/landlord/maintenance`   | GET  | List maintenance requests  |
| Maintenance   | `/api/boarder/maintenance`    | POST | Create maintenance request |
| Properties    | `/api/rooms/public`           | GET  | List public properties     |
| Properties    | `/api/landlord/properties`    | GET  | List landlord properties   |
| Payments      | `/api/landlord/payments`      | GET  | List payments              |
| Notifications | `/api/notifications`          | GET  | List notifications         |

---

## Test Examples

### 1. Public Endpoint Test

```php
<?php

class TestCest
{
    public function testPublicEndpoint(ApiTester $I)
    {
        $I->wantTo('test public API endpoint');
        $I->haveHttpHeader('Content-Type', 'application/json');
        $I->sendGET('/api/test');

        $I->seeResponseCodeIs(200);
        $I->seeResponseIsJson();
        $I->seeResponseContains('"status":"success"');
        $I->seeResponseContains('"message":"Router is working"');
    }
}
```

### 2. Authentication Test

```php
<?php

class AuthCest
{
    public function testLoginSuccess(ApiTester $I)
    {
        $I->wantTo('test successful login');
        $I->haveHttpHeader('Content-Type', 'application/json');

        $I->sendPOST('/auth/login', [
            'email' => 'qwenzy23062@gmail.com',
            'password' => 'Kenjigwapo_123'
        ]);

        $I->seeResponseCodeIs(200);
        $I->seeResponseIsJson();
        $I->seeResponseContains('token');
    }

    public function testLoginFailure(ApiTester $I)
    {
        $I->wantTo('test login with wrong credentials');
        $I->haveHttpHeader('Content-Type', 'application/json');

        $I->sendPOST('/auth/login', [
            'email' => 'wrong@example.com',
            'password' => 'wrongpassword'
        ]);

        $I->seeResponseCodeIs(401);
    }
}
```

### 3. Authenticated Endpoint Test

```php
<?php

class MessagesCest
{
    private $token;

    public function _before(ApiTester $I)
    {
        $I->haveHttpHeader('Content-Type', 'application/json');

        // Login
        $I->sendPOST('/auth/login', [
            'email' => 'qwenzy23062@gmail.com',
            'password' => 'Kenjigwapo_123'
        ]);

        $response = json_decode($I->grabResponse(), true);
        $this->token = $response['token'];
    }

    public function testGetConversations(ApiTester $I)
    {
        $I->wantTo('test GET /api/messages/conversations');
        $I->haveHttpHeader('Authorization', "Bearer {$this->token}");

        $I->sendGET('/api/messages/conversations');
        $I->seeResponseCodeIs(200);
        $I->seeResponseIsJson();
    }
}
```

### 4. POST Request Test

```php
<?php

class MaintenanceCest
{
    private $token;

    public function _before(ApiTester $I)
    {
        $I->haveHttpHeader('Content-Type', 'application/json');

        $I->sendPOST('/auth/login', [
            'email' => 'alistairybaez574@gmail.com',
            'password' => 'Kenjigwapo_123'
        ]);

        $response = json_decode($I->grabResponse(), true);
        $this->token = $response['token'];
    }

    public function testCreateMaintenanceRequest(ApiTester $I)
    {
        $I->wantTo('test POST /api/boarder/maintenance');
        $I->haveHttpHeader('Authorization', "Bearer {$this->token}");

        $I->sendPOST('/api/boarder/maintenance', [
            'property_id' => 1,
            'room_id' => 1,
            'title' => 'Broken Light ' . time(),
            'description' => 'The light in the hallway is not working',
            'priority' => 'high',
            'category' => 'electrical'
        ]);

        $I->seeResponseCodeIs(201);
        $I->seeResponseIsJson();
    }
}
```

### 5. Parameterized Tests

```php
<?php

class PropertiesCest
{
    private $token;

    public function _before(ApiTester $I)
    {
        $I->haveHttpHeader('Content-Type', 'application/json');

        $I->sendPOST('/auth/login', [
            'email' => 'qwenzy23062@gmail.com',
            'password' => 'Kenjigwapo_123'
        ]);

        $this->token = json_decode($I->grabResponse(), true)['token'];
    }

    public function testPropertyDetailWithId(ApiTester $I)
    {
        $I->wantTo('test GET /api/rooms/detail with property ID');
        $propertyId = 1;

        $I->haveHttpHeader('Authorization', "Bearer {$this->token}");
        $I->sendGET("/api/rooms/detail?id={$propertyId}");

        $I->seeResponseCodeIs(200);
        $I->seeResponseIsJson();
    }

    public function testUpdatePropertyStatus(ApiTester $I)
    {
        $I->wantTo('test PATCH /api/landlord/listings/{id}');
        $propertyId = 1;

        $I->haveHttpHeader('Authorization', "Bearer {$this->token}");
        $I->sendPATCH("/api/landlord/listings/{$propertyId}", [
            'is_active' => false
        ]);

        $I->seeResponseCodeIs(200);
    }
}
```

---

## Common Assertions

Codeception provides powerful assertions for testing API responses:

### HTTP Status Codes

```php
$I->seeResponseCodeIs(200);      // Exact match
$I->seeResponseCodeIs(201);      // Created
$I->seeResponseCodeIs(204);      // No content
$I->seeResponseCodeIs(400);      // Bad request
$I->seeResponseCodeIs(401);      // Unauthorized
$I->seeResponseCodeIs(403);      // Forbidden
$I->seeResponseCodeIs(404);      // Not found
$I->seeResponseCodeIs(500);      // Server error
```

### Response Content

```php
$I->seeResponseIsJson();              // Check if response is JSON
$I->seeResponseContains('success');     // Check if response contains text
$I->seeResponseContainsJson(['status' => 'success']); // Check JSON structure
$I->dontSeeResponseContains('error');   // Negative assertion
$I->seeResponseEquals('expected');      // Exact match
$I->dontSeeResponseEquals('unexpected'); // Negative exact match
```

### HTTP Headers

```php
$I->seeHttpHeader('Content-Type', 'application/json');
$I->seeHttpHeader('Authorization');
$I->seeHttpHeaderContains('Content-Type', 'json');
```

### Response Validation

```php
// Check if response has specific fields
$response = json_decode($I->grabResponse(), true);
$I->assertArrayHasKey('data', $response);
$I->assertArrayHasKey('id', $response['data']);

// Check field values
$I->assertEquals('success', $response['status']);
$I->assertNotEmpty($response['token']);
```

---

## Best Practices

### 1. Test Organization

- **Group by module**: Keep all tests for a module in one Cest file (e.g., `MessagesCest.php`)
- **Single responsibility**: Each test method should test one specific behavior
- **Use descriptive names**: `testLoginWithInvalidPassword` instead of `test2`

### 2. Test Data

- **Use unique identifiers**: Append `time()` or `uniqid()` to avoid conflicts
- **Clean up after tests**: Delete test data in `_after()` method
- **Use test-specific data**: Don't rely on production data

```php
public function testCreateProperty(ApiTester $I)
{
    $I->wantTo('test property creation');

    $propertyName = 'Test Property ' . time();

    // Test creation
    $I->sendPOST('/api/landlord/listings', [
        'name' => $propertyName,
        'description' => 'Test description',
        'price' => 500
    ]);

    $response = json_decode($I->grabResponse(), true);
    $propertyId = $response['id'];

    // Store for cleanup
    $this->createdPropertyIds[] = $propertyId;
}

public function _after(ApiTester $I)
{
    // Cleanup created properties
    foreach ($this->createdPropertyIds ?? [] as $id) {
        $I->sendDELETE("/api/landlord/listings/{$id}");
    }
}
```

### 3. Error Handling

Always test both success and error scenarios:

```php
public function testUpdatePropertySuccess(ApiTester $I)
{
    // Test successful update
    $I->sendPATCH('/api/landlord/listings/1', ['price' => 600]);
    $I->seeResponseCodeIs(200);
}

public function testUpdatePropertyNotFound(ApiTester $I)
{
    // Test error case
    $I->sendPATCH('/api/landlord/listings/99999', ['price' => 600]);
    $I->seeResponseCodeIs(404);
}

public function testUpdatePropertyInvalidData(ApiTester $I)
{
    // Test validation
    $I->sendPATCH('/api/landlord/listings/1', ['price' => -100]);
    $I->seeResponseCodeIs(400);
}
```

### 4. Authentication

- **Always test with auth**: Most endpoints require authentication
- **Test both roles**: Verify landlord and boarder permissions
- **Test unauthorized access**: Ensure endpoints reject unauthenticated requests

```php
public function testUnauthenticatedAccess(ApiTester $I)
{
    $I->wantTo('verify endpoint requires authentication');
    $I->sendGET('/api/landlord/properties');
    $I->seeResponseCodeIs(401);
}
```

---

## Troubleshooting

### 1. "Class ApiTester does not exist"

**Solution:**

```bash
php vendor/bin/codecept build
```

Or regenerate the suite:

```bash
rmdir /s /q tests
php vendor/bin/codecept bootstrap
php vendor/bin/codecept generate:suite api ApiTester
```

### 2. Connection Refused

**Solution:**

- Ensure backend server is running: `http://localhost:8000`
- Check with: `curl http://localhost:8000/api/test`
- Start server if needed

### 3. 401 Unauthorized

**Solution:**

- Verify token is valid
- Check token is in `Authorization: Bearer TOKEN` header
- Login again if token expired
- Verify user exists and password is correct

### 4. "Failed to inject dependencies"

**Solution:** Use `\Codeception\Actor` type hint instead of `ApiTester`:

```php
public function testExample(\Codeception\Actor $I)
```

Or ensure `tests/Api.suite.yml` uses `actor:` instead of `class_name:`

### 5. Module Not Found

**Solution:**

```yaml
# In tests/Api.suite.yml
modules:
  enabled:
    - REST:
        url: http://localhost:8000
        depends: PhpBrowser
    - PhpBrowser:
        url: http://localhost:8000
```

---

## Useful Commands

| Command                                               | Description                 |
| ----------------------------------------------------- | --------------------------- |
| `php vendor/bin/codecept run`                         | Run all test suites         |
| `php vendor/bin/codecept run api`                     | Run only API tests          |
| `php vendor/bin/codecept run api:TestCest`            | Run specific test file      |
| `php vendor/bin/codecept run api:TestCest:testMethod` | Run specific test method    |
| `php vendor/bin/codecept build`                       | Rebuild actor classes       |
| `php vendor/bin/codecept clean`                       | Clean test output           |
| `php vendor/bin/codecept generate:cest api NewTest`   | Generate new test file      |
| `php vendor/bin/codecept run --debug`                 | Run with debug output       |
| `php vendor/bin/codecept run --steps`                 | Show step-by-step execution |
| `php vendor/bin/codecept run --filter "testLogin"`    | Run tests matching filter   |
| `php vendor/bin/codecept run -g unit`                 | Run tests with @unit group  |

---

## Code Coverage

Install Xdebug and run:

```bash
php vendor/bin/codecept run api --coverage --coverage-html
```

Reports are generated in `tests/_output/coverage/`

### Coverage Options

```bash
# HTML report
php vendor/bin/codecept run api --coverage --coverage-html

# XML report (for CI/CD)
php vendor/bin/codecept run api --coverage --coverage-xml

# Text summary
php vendor/bin/codecept run api --coverage --coverage-text

# Multiple formats
php vendor/bin/codecept run api --coverage --coverage-html --coverage-xml
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/api-tests.yml
name: API Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      appwrite:
        image: appwrite/appwrite:latest
        ports:
          - 8000:8000
        env:
          # Your Appwrite configuration

    steps:
      - uses: actions/checkout@v3

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.0'
          extensions: json, mbstring, fileinfo

      - name: Install Composer dependencies
        run: |
          cd functions
          composer install --prefer-dist --no-progress --no-interaction

      - name: Build Codeception
        run: |
          cd functions
          php vendor/bin/codecept build

      - name: Run API tests
        run: |
          cd functions
          php vendor/bin/codecept run api

      - name: Upload coverage report
        uses: actions/upload-artifact@v3
        with:
          name: code-coverage
          path: functions/tests/_output/coverage/
```

---

## API Endpoints Reference

### Authentication

- `POST /auth/login` - Login
- `POST /auth/register` - Register
- `POST /auth/forgot-password` - Forgot password
- `POST /auth/verify-reset-code` - Verify reset code
- `POST /auth/reset-password` - Reset password
- `POST /auth/change-password` - Change password

### Google OAuth

- `GET /auth/google/authorize.php` - Google auth redirect
- `GET /auth/google/callback.php` - Google callback
- `POST /auth/google/complete-registration.php` - Complete Google registration

### Messages

- `GET /api/messages/conversations` - List conversations
- `GET /api/messages/conversations/{id}` - Get conversation
- `POST /api/messages` - Send message
- `POST /api/messages/new` - Start new conversation
- `PUT /api/messages/conversations/{id}/read` - Mark as read
- `GET /api/messages/search` - Search messages
- `GET /api/messages/unread-count` - Unread count

### Maintenance

- `GET /api/landlord/maintenance` - List (landlord)
- `GET /api/boarder/maintenance` - List (boarder)
- `GET /api/maintenance/stats` - Stats
- `POST /api/boarder/maintenance` - Create
- `GET /api/landlord/maintenance/{id}` - Get
- `PATCH /api/landlord/maintenance/{id}/status` - Update status
- `POST /api/landlord/maintenance/{id}/assign` - Assign contractor
- `POST /api/landlord/maintenance/{id}/comment` - Add comment
- `DELETE /api/landlord/maintenance/{id}` - Delete
- `POST /api/boarder/maintenance/{id}/comment` - Add comment (boarder)
- `POST /api/boarder/maintenance/{id}/rate` - Rate request
- `PATCH /api/landlord/maintenance/bulk-status` - Bulk update

### Properties

- `GET /api/rooms/public` - Public properties
- `GET /api/rooms/detail` - Property detail
- `GET /api/rooms/popular-locations` - Popular locations
- `GET /api/rooms/similar` - Similar properties
- `GET /api/properties/all` - All properties (map)
- `GET /api/landlord/properties` - Landlord properties
- `POST /api/landlord/listings` - Create listing
- `PUT /api/landlord/listings/{id}` - Update listing
- `POST /api/landlord/boarders.php` - Add boarder
- `POST /api/landlord/rooms` - Create room
- `PUT /api/landlord/rooms` - Update room

### Payments

- `GET /api/landlord/payments` - List payments
- `POST /api/landlord/payments` - Record payment
- `GET /api/landlord/payment-summary` - Payment summary
- `GET /api/payments/history` - Payment history
- `GET /api/payments/overview` - Payment overview
- `GET /api/payments/methods` - Payment methods
- `POST /api/payments/methods` - Add payment method
- `DELETE /api/payments/methods/{id}` - Delete payment method

### Notifications

- `GET /api/notifications` - List notifications
- `PATCH /api/notifications/{id}/read` - Mark as read
- `PATCH /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/{id}` - Delete notification
- `GET /api/notifications/unread-count` - Unread count
- `GET /api/boarder/accepted-applications` - Accepted applications
- `GET /api/boarder/has-accepted-applications` - Check accepted

### AI Features

- `POST /api/ai/generate-description` - Generate property description
- `POST /api/ai/enhance-search` - Enhance search
- `POST /api/ai/analyze-issue` - Analyze maintenance issue
- `POST /api/ai/draft-message` - Draft message
- `POST /api/ai/analyze-application` - Analyze application
- `POST /api/ai/chat` - AI chat assistant

---

## Credentials for Testing

### Default Test Accounts

| Role     | Email                      | Password       |
| -------- | -------------------------- | -------------- |
| Landlord | qwenzy23062@gmail.com      | Kenjigwapo_123 |
| Boarder  | alistairybaez574@gmail.com | Kenjigwapo_123 |

### Creating Test Accounts

```php
$I->sendPOST('/auth/register', [
    'email' => 'test-' . time() . '@example.com',
    'password' => 'TestPassword123!',
    'first_name' => 'Test',
    'last_name' => 'User',
    'role' => 'boarder', // or 'landlord'
    'phone' => '+1234567890'
]);
```

---

## Maintainers

- **Qwenzy** - Primary developer
- **Haven Space Team**

---

## Version History

| Version | Date       | Description                   |
| ------- | ---------- | ----------------------------- |
| 1.0     | 2026-04-29 | Initial testing documentation |

---

## License

This testing framework is part of the Haven Space project and is licensed under the MIT License.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-tests`)
3. Write comprehensive tests for new features
4. Ensure all tests pass (`php vendor/bin/codecept run`)
5. Commit your changes (`git commit -am 'Add amazing tests'`)
6. Push to the branch (`git push origin feature/amazing-tests`)
7. Open a Pull Request

---

For questions or issues, please refer to the main [Haven Space documentation](/AGENTS.md).
