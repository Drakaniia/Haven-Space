# Functions

## Package Identity

- `functions/` contains the PHP backend runtime: router, API endpoints, Appwrite integration, domain modules, storage handling, and supporting scripts.
- The codebase is a hybrid of legacy file-based endpoints under `functions/api/` and newer PSR-4 module code under `functions/src/`.

## Setup & Run

- API/dev server base URL: `http://localhost:8000`
- Do not start `bun run server`; the PHP server is expected to already be running.
- Install PHP deps: `composer install --working-dir functions`
- Install Appwrite function deps: `composer install --working-dir functions/api`
- Run backend tests if present: `composer test --working-dir functions`
- Run static analysis if needed: `composer analyze --working-dir functions`

## Patterns & Conventions

- Bootstrapping starts at [functions/router.php](/C:/Users/Qwenzy/Desktop/haven-space/functions/router.php) and [functions/api/routes.php](/C:/Users/Qwenzy/Desktop/haven-space/functions/api/routes.php); new HTTP routes should usually be registered in `routes.php`.
- Prefer the module structure in `functions/src/Modules/<Domain>/{Controllers,Services,Repositories}` for new domain work.
- Keep request orchestration in controllers, business rules in services, and SQL/data access in repositories.
- Reuse shared bootstrap and response helpers from [functions/src/Core/bootstrap.php](/C:/Users/Qwenzy/Desktop/haven-space/functions/src/Core/bootstrap.php) and [functions/src/Shared/Helpers/ResponseHelper.php](/C:/Users/Qwenzy/Desktop/haven-space/functions/src/Shared/Helpers/ResponseHelper.php).
- DO: model new controller routes after [functions/src/Modules/Notification/Controllers/NotificationController.php](/C:/Users/Qwenzy/Desktop/haven-space/functions/src/Modules/Notification/Controllers/NotificationController.php).
- DO: keep Appwrite integration behind dedicated services such as [functions/src/Services/AppwriteService.php](/C:/Users/Qwenzy/Desktop/haven-space/functions/src/Services/AppwriteService.php).
- DO: keep auth checks in middleware or shared route guards rather than embedding role logic throughout handlers.
- DON'T: put new business logic into the monolithic execution file [functions/api/main.php](/C:/Users/Qwenzy/Desktop/haven-space/functions/api/main.php) unless the change is specifically about the Appwrite function wrapper.
- DON'T: add more one-off route files when an existing module already owns the domain, for example notifications, onboarding, maintenance, messages, payments, or applications under `functions/src/Modules/`.
- If a localhost auth or Appwrite issue is fixed, verify the production path too; this repo explicitly expects parity.

## Key Files

- Unified router: [functions/router.php](/C:/Users/Qwenzy/Desktop/haven-space/functions/router.php)
- Main API route table: [functions/api/routes.php](/C:/Users/Qwenzy/Desktop/haven-space/functions/api/routes.php)
- Bootstrap/autoload/session setup: [functions/src/Core/bootstrap.php](/C:/Users/Qwenzy/Desktop/haven-space/functions/src/Core/bootstrap.php)
- Appwrite configuration: [functions/config/appwrite.php](/C:/Users/Qwenzy/Desktop/haven-space/functions/config/appwrite.php)
- Appwrite service wrapper: [functions/src/Services/AppwriteService.php](/C:/Users/Qwenzy/Desktop/haven-space/functions/src/Services/AppwriteService.php)
- Appwrite function entrypoint: [functions/api/main.php](/C:/Users/Qwenzy/Desktop/haven-space/functions/api/main.php)
- Shared JSON response helpers: [functions/src/Shared/Helpers/ResponseHelper.php](/C:/Users/Qwenzy/Desktop/haven-space/functions/src/Shared/Helpers/ResponseHelper.php)

## API Patterns

- File-based auth endpoints live under `functions/api/auth/**`.
- Legacy direct-inclusion endpoints still exist under folders like `functions/api/landlord/`, `functions/api/boarder/`, `functions/api/payments/`, and `functions/api/rooms/`.
- Modular controller-backed routes are registered in `functions/api/routes.php` and implemented in `functions/src/Modules/**`.
- Use `Middleware::authenticate()` or `Middleware::authorize()` before user-scoped actions.

## JIT Index Hints

- Find route definitions: `rg -n "Router::(get|post|put|patch|delete)" functions/api/routes.php`
- Find a controller/service/repository for a domain: `rg -n "class .*Controller|class .*Service|class .*Repository" functions/src/Modules`
- Find direct endpoint files: `rg --files functions/api | rg "\\.php$"`
- Find Appwrite usage: `rg -n "Appwrite|new Client|Databases|Storage|Account" functions`
- Find temporary PHP test scripts to remove: `rg --files functions | rg "test_.*\\.php|test-.*\\.php"`

## Common Gotchas

- Session handling is configured in bootstrap and skipped for Appwrite function context; careless session changes can break one environment while fixing the other.
- The backend mixes REST-style routes and direct PHP includes, so check whether a domain already has an ownership pattern before adding files.
- Some older debug/test PHP files are still present under `functions/api/`; do not use them as the default pattern for new work.

## Pre-PR Checks

`composer test --working-dir functions && composer analyze --working-dir functions`
