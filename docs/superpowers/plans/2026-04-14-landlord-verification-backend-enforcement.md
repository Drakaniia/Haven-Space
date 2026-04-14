# Landlord Verification Backend Enforcement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the existing `Middleware::authorizeVerifiedLandlord()` to all landlord write-operation API endpoints so unverified landlords cannot bypass read-only restrictions via direct API calls.

**Architecture:** The middleware already exists and works correctly — it checks if the user is a landlord, allows GET requests unconditionally, and blocks POST/PUT/PATCH/DELETE if `is_verified` is false. The fix is to replace `Middleware::authorize(['landlord'])` calls (or add verification checks) in every landlord write endpoint. Since the router dispatches directly to controllers without middleware in the route definitions, we need to add the middleware call inside each controller method that handles write operations.

**Tech Stack:** PHP 8.0+, MySQL, custom PHP router

---

## File Map

| File                                                                   | Action | Responsibility                                                                                                                                       |
| ---------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/api/routes.php`                                                | Modify | Update landlord write routes to note middleware requirement (documentation only — middleware is called inside controllers)                           |
| `server/src/Modules/Maintenance/Controllers/MaintenanceController.php` | Modify | Add `Middleware::authorizeVerifiedLandlord()` to write methods: `updateStatus`, `addComment`, `destroy`, `bulkUpdateStatus`, `assignContractor`      |
| `server/src/Modules/Application/Controllers/ApplicationController.php` | Modify | Add `Middleware::authorizeVerifiedLandlord()` to landlord write method: `updateStatus`                                                               |
| `server/src/Modules/Onboarding/Controllers/OnboardingController.php`   | Modify | Add `Middleware::authorizeVerifiedLandlord()` to landlord write methods: `saveWelcomeTemplate`, `uploadDocument`, `toggleAutoSend`, `deleteDocument` |
| `server/api/landlord/profile.php`                                      | Modify | Add verification check for POST, PATCH methods                                                                                                       |
| `server/api/landlord/payment-methods.php`                              | Modify | Add verification check for POST, PATCH, DELETE methods                                                                                               |
| `server/api/landlord/property-location.php`                            | Modify | Add verification check for POST method                                                                                                               |

**Note:** The project uses a simple router that dispatches directly to controllers without a middleware pipeline. Since controllers are classes, we call the middleware at the start of each controller method. For standalone endpoint files (like `profile.php`), we add the check inline.

---

### Task 1: Add verification to MaintenanceController write methods

**Files:**

- Modify: `server/src/Modules/Maintenance/Controllers/MaintenanceController.php`

- [ ] **Step 1: Read the MaintenanceController to identify write methods**

Read `server/src/Modules/Maintenance/Controllers/MaintenanceController.php` to find these methods:

- `updateStatus()` — PATCH
- `addComment()` — POST
- `destroy()` — DELETE
- `bulkUpdateStatus()` — PATCH
- `assignContractor()` — POST

- [ ] **Step 2: Add middleware to updateStatus()**

At the very start of the `updateStatus()` method (before any business logic), add:

```php
use App\Api\Middleware;

// ... inside updateStatus() method, as the first line:
Middleware::authorizeVerifiedLandlord();
```

This ensures only verified landlords can update maintenance request status.

- [ ] **Step 3: Add middleware to addComment()**

At the start of `addComment()`:

```php
Middleware::authorizeVerifiedLandlord();
```

- [ ] **Step 4: Add middleware to destroy()**

At the start of `destroy()`:

```php
Middleware::authorizeVerifiedLandlord();
```

- [ ] **Step 5: Add middleware to bulkUpdateStatus()**

At the start of `bulkUpdateStatus()`:

```php
Middleware::authorizeVerifiedLandlord();
```

- [ ] **Step 6: Add middleware to assignContractor()**

At the start of `assignContractor()`:

```php
Middleware::authorizeVerifiedLandlord();
```

- [ ] **Step 7: Add the import at the top of the file**

At the top of `MaintenanceController.php`, after the `namespace` declaration and existing `use` statements, add:

```php
use App\Api\Middleware;
```

If the file doesn't have a namespace, add the require and use before the class:

```php
require_once __DIR__ . '/../../../api/middleware.php';
use App\Api\Middleware;
```

- [ ] **Step 8: Verify GET methods are NOT modified**

Confirm that `index()` and `show()` methods in MaintenanceController do NOT have `authorizeVerifiedLandlord()` — these are read operations and should remain accessible to unverified landlords.

---

### Task 2: Add verification to ApplicationController landlord write method

**Files:**

- Modify: `server/src/Modules/Application/Controllers/ApplicationController.php`

- [ ] **Step 1: Read the ApplicationController**

Read `server/src/Modules/Application/Controllers/ApplicationController.php`. Find the `updateStatus()` method used by the landlord route `PATCH /api/landlord/applications/{id}/status`.

**Important:** This controller is shared between boarder and landlord routes. Only the landlord `updateStatus()` call needs `authorizeVerifiedLandlord()`. If there's a single `updateStatus()` method used by both roles, add a role check inside:

```php
require_once __DIR__ . '/../../../api/middleware.php';
use App\Api\Middleware;

// Inside updateStatus():
// Check if this is a landlord operation (based on route context or role in token)
// The middleware will handle it:
Middleware::authorizeVerifiedLandlord();
```

However, if `updateStatus()` is also called by boarder routes, we need to be more careful. In that case, check the user's role first:

```php
// At the start of updateStatus(), determine if caller is landlord:
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$token = '';
if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $token = $matches[1];
}
if (!empty($token)) {
    require_once __DIR__ . '/../../../Core/Auth/JWT.php';
    $payload = \App\Core\Auth\JWT::validate($token);
    if ($payload && $payload['role'] === 'landlord') {
        Middleware::authorizeVerifiedLandlord();
    }
}
```

- [ ] **Step 2: Apply the appropriate middleware**

Based on the analysis in Step 1, add the verification middleware to the landlord's `updateStatus()` path only. Do NOT block boarders from calling this endpoint.

---

### Task 3: Add verification to OnboardingController landlord write methods

**Files:**

- Modify: `server/src/Modules/Onboarding/Controllers/OnboardingController.php`

- [ ] **Step 1: Read the OnboardingController**

Read `server/src/Modules/Onboarding/Controllers/OnboardingController.php`. Find these landlord write methods:

- `saveWelcomeTemplate()` — POST
- `uploadDocument()` — POST
- `toggleAutoSend()` — POST
- `deleteDocument()` — DELETE

- [ ] **Step 2: Add middleware import**

At the top of the file, add:

```php
require_once __DIR__ . '/../../../api/middleware.php';
use App\Api\Middleware;
```

- [ ] **Step 3: Add middleware to each write method**

At the start of each of the four methods, add:

```php
Middleware::authorizeVerifiedLandlord();
```

- [ ] **Step 4: Verify GET methods are NOT modified**

Confirm that `getWelcomeTemplate()`, `getDocuments()`, `getAutoSendDocuments()`, and `getBoarderDocuments()` do NOT have the middleware — these are read operations.

---

### Task 4: Add verification to standalone landlord profile endpoint

**Files:**

- Modify: `server/api/landlord/profile.php`

- [ ] **Step 1: Add middleware require at the top**

After the existing requires at the top of `profile.php`, add:

```php
require_once __DIR__ . '/../middleware.php';
use App\Api\Middleware;
```

- [ ] **Step 2: Add verification to POST block**

Inside the `if ($_SERVER['REQUEST_METHOD'] === 'POST')` block, right after the method check and before any business logic, add:

```php
Middleware::authorizeVerifiedLandlord();
```

This blocks unverified landlords from creating/updating their profile.

**Note:** The GET block should remain unchanged — unverified landlords should still be able to read their profile.

---

### Task 5: Add verification to standalone landlord payment methods endpoint

**Files:**

- Modify: `server/api/landlord/payment-methods.php`

- [ ] **Step 1: Add middleware require at the top**

After the existing requires, add:

```php
require_once __DIR__ . '/../middleware.php';
use App\Api\Middleware;
```

- [ ] **Step 2: Add verification to POST block**

Inside the `if ($_SERVER['REQUEST_METHOD'] === 'POST')` block, add:

```php
Middleware::authorizeVerifiedLandlord();
```

- [ ] **Step 3: Add verification to PATCH block**

Inside the `if ($_SERVER['REQUEST_METHOD'] === 'PATCH')` block, add:

```php
Middleware::authorizeVerifiedLandlord();
```

- [ ] **Step 4: Add verification to DELETE block**

Inside the `if ($_SERVER['REQUEST_METHOD'] === 'DELETE')` block, add:

```php
Middleware::authorizeVerifiedLandlord();
```

**Note:** The GET block should remain unchanged — unverified landlords should still be able to view their payment methods.

---

### Task 6: Add verification to standalone landlord property location endpoint

**Files:**

- Modify: `server/api/landlord/property-location.php`

- [ ] **Step 1: Add middleware require at the top**

After the existing requires, add:

```php
require_once __DIR__ . '/../middleware.php';
use App\Api\Middleware;
```

- [ ] **Step 2: Add verification to POST block**

Inside the `if ($_SERVER['REQUEST_METHOD'] === 'POST')` block, add:

```php
Middleware::authorizeVerifiedLandlord();
```

**Note:** The GET block should remain unchanged — unverified landlords should still be able to view their property location.

---

### Task 7: Verify no other landlord write endpoints are missed

**Files:**

- Read: `server/api/routes.php`

- [ ] **Step 1: Audit all landlord routes**

Review `server/api/routes.php` and confirm every landlord POST/PUT/PATCH/DELETE route is covered by one of the previous tasks:

| Route                                    | Method            | Controller/File                           | Covered? |
| ---------------------------------------- | ----------------- | ----------------------------------------- | -------- |
| `/api/landlord/maintenance/{id}/status`  | PATCH             | MaintenanceController::updateStatus       | Task 1   |
| `/api/landlord/maintenance/{id}/comment` | POST              | MaintenanceController::addComment         | Task 1   |
| `/api/landlord/maintenance/{id}`         | DELETE            | MaintenanceController::destroy            | Task 1   |
| `/api/landlord/maintenance/bulk-status`  | PATCH             | MaintenanceController::bulkUpdateStatus   | Task 1   |
| `/api/landlord/maintenance/{id}/assign`  | POST              | MaintenanceController::assignContractor   | Task 1   |
| `/api/landlord/applications/{id}/status` | PATCH             | ApplicationController::updateStatus       | Task 2   |
| `/api/landlord/welcome-message`          | POST              | OnboardingController::saveWelcomeTemplate | Task 3   |
| `/api/landlord/documents`                | POST              | OnboardingController::uploadDocument      | Task 3   |
| `/api/landlord/documents/auto-send`      | POST              | OnboardingController::toggleAutoSend      | Task 3   |
| `/api/landlord/documents/{id}`           | DELETE            | OnboardingController::deleteDocument      | Task 3   |
| `/api/landlord/profile.php`              | POST              | standalone                                | Task 4   |
| `/api/landlord/payment-methods.php`      | POST/PATCH/DELETE | standalone                                | Task 5   |
| `/api/landlord/property-location.php`    | POST              | standalone                                | Task 6   |

If any route is missing from this table, create an additional task for it.

---

### Task 8: Test the middleware enforcement

- [ ] **Step 1: Review middleware logic**

Read `server/api/middleware.php` and confirm `authorizeVerifiedLandlord()`:

1. Calls `self::authorize(['landlord'])` — verifies user is authenticated and has landlord role
2. Checks `$_SERVER['REQUEST_METHOD']` — allows GET, blocks POST/PUT/PATCH/DELETE if `is_verified` is empty/false
3. Returns 403 with clear error message for blocked requests

- [ ] **Step 2: Verify the `is_verified` field is populated from JWT**

The JWT payload must contain `is_verified`. Check `server/src/Core/Auth/JWT.php` to confirm that when the token is created, the `is_verified` field from the users table is included in the payload. If it's NOT included, the middleware's `empty($user['is_verified'])` check will always be true (blocking all writes even for verified landlords).

**If `is_verified` is missing from JWT payload, fix it:**

In `server/src/Core/Auth/JWT.php` (or wherever the token is generated), ensure the payload includes `is_verified`:

```php
$payload = [
    'user_id' => $userId,
    'role' => $role,
    'is_verified' => $isVerified,  // <-- Add this line
    'exp' => time() + 3600,
    'iat' => time(),
];
```

Also check the login endpoint (`server/api/auth/login.php`) to confirm it passes `is_verified` when creating the JWT.

- [ ] **Step 3: Run PHP syntax check on all modified files**

Run:

```bash
php -l server/api/middleware.php
php -l server/api/landlord/profile.php
php -l server/api/landlord/payment-methods.php
php -l server/api/landlord/property-location.php
```

For controller files, run:

```bash
php -l server/src/Modules/Maintenance/Controllers/MaintenanceController.php
php -l server/src/Modules/Application/Controllers/ApplicationController.php
php -l server/src/Modules/Onboarding/Controllers/OnboardingController.php
```

All should report `No syntax errors detected`.

---

### Task 9: Commit

- [ ] **Step 1: Commit all changes**

```bash
git add server/api/landlord/profile.php \
  server/api/landlord/payment-methods.php \
  server/api/landlord/property-location.php \
  server/api/middleware.php \
  server/src/Modules/Maintenance/Controllers/MaintenanceController.php \
  server/src/Modules/Application/Controllers/ApplicationController.php \
  server/src/Modules/Onboarding/Controllers/OnboardingController.php

git commit -m "sec: enforce landlord verification middleware on all write endpoints

Wire up Middleware::authorizeVerifiedLandlord() to all landlord
POST/PUT/PATCH/DELETE endpoints. Unverified landlords now receive
403 errors on write operations at the server level, preventing
API bypass of frontend read-only restrictions."
```
