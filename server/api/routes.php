<?php

/**
 * API Routes
 * Defines all API endpoints for the application
 */

require_once __DIR__ . '/../src/Core/bootstrap.php';
require_once __DIR__ . '/../src/Shared/Helpers/ResponseHelper.php';

// Load CORS configuration
require_once __DIR__ . '/cors.php';

// Load Middleware for route authentication
require_once __DIR__ . '/middleware.php';

// Load Middleware for route authentication
require_once __DIR__ . '/middleware.php';

use App\Api\Middleware;
use App\Modules\Message\Controllers\MessageController;
use App\Modules\Maintenance\Controllers\MaintenanceController;
use App\Modules\Onboarding\Controllers\OnboardingController;
use App\Modules\Application\Controllers\ApplicationController;
use App\Core\Upload\UploadController;

/**
 * Simple Router
 */
class Router
{
    private static array $routes = [];

    public static function get(string $path, array|callable $handler): void
    {
        self::$routes['GET'][$path] = $handler;
    }

    public static function post(string $path, array|callable $handler): void
    {
        self::$routes['POST'][$path] = $handler;
    }

    public static function put(string $path, array|callable $handler): void
    {
        self::$routes['PUT'][$path] = $handler;
    }

    public static function patch(string $path, array|callable $handler): void
    {
        self::$routes['PATCH'][$path] = $handler;
    }

    public static function delete(string $path, array|callable $handler): void
    {
        self::$routes['DELETE'][$path] = $handler;
    }

    public static function dispatch(string $method, string $uri): void
    {
        // Remove query string
        $uri = parse_url($uri, PHP_URL_PATH);

        // Try exact match first
        $routeKey = $uri;
        if (isset(self::$routes[$method][$routeKey])) {
            $handler = self::$routes[$method][$routeKey];
            if (is_callable($handler)) {
                $handler();
                return;
            }
            $controller = new $handler[0]();
            $controller->{$handler[1]}([], null);
            return;
        }

        // Try pattern matching for routes with parameters
        foreach (self::$routes[$method] ?? [] as $pattern => $handler) {
            $pattern = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '([0-9]+)', $pattern);
            $pattern = '#^' . $pattern . '$#';

            if (preg_match($pattern, $uri, $matches)) {
                array_shift($matches); // Remove full match
                $id = $matches[0] ?? null;
                
                if (is_callable($handler)) {
                    $handler($id);
                    return;
                }
                
                $controller = new $handler[0]();
                $controller->{$handler[1]}([], $id);
                return;
            }
        }

        json_response(404, ['error' => 'Route not found']);
    }
}

// ============================================
// UPLOAD ROUTES
// ============================================
Router::post('/api/upload', [UploadController::class, 'upload']);
Router::post('/api/upload/multiple', [UploadController::class, 'uploadMultiple']);
Router::delete('/api/upload/{fileUrl}', [UploadController::class, 'delete']);

// ============================================
// MESSAGE ROUTES
// ============================================
Router::get('/api/messages/conversations', [MessageController::class, 'index']);
Router::get('/api/messages/conversations/{id}', [MessageController::class, 'show']);
Router::post('/api/messages', [MessageController::class, 'store']);
Router::post('/api/messages/new', [MessageController::class, 'startNew']); // New endpoint for modal
Router::put('/api/messages/conversations/{id}/read', [MessageController::class, 'markAsRead']);
Router::get('/api/messages/search', [MessageController::class, 'search']);
Router::get('/api/messages/unread-count', [MessageController::class, 'unreadCount']);

// ============================================
// USER ROUTES
// ============================================
Router::get('/api/users/search', function() {
    require_once __DIR__ . '/users/search.php';
});

// ============================================
// MAINTENANCE ROUTES - LANDLORD
// ============================================
Router::get('/api/landlord/maintenance', [MaintenanceController::class, 'index']);
Router::get('/api/landlord/maintenance/{id}', [MaintenanceController::class, 'show']);
Router::patch('/api/landlord/maintenance/{id}/status', [MaintenanceController::class, 'updateStatus']);
Router::post('/api/landlord/maintenance/{id}/comment', [MaintenanceController::class, 'addComment']);
Router::delete('/api/landlord/maintenance/{id}', [MaintenanceController::class, 'destroy']);
Router::patch('/api/landlord/maintenance/bulk-status', [MaintenanceController::class, 'bulkUpdateStatus']);
Router::post('/api/landlord/maintenance/{id}/assign', [MaintenanceController::class, 'assignContractor']);

// ============================================
// MAINTENANCE ROUTES - BOARDER
// ============================================
Router::get('/api/boarder/maintenance', [MaintenanceController::class, 'index']);
Router::get('/api/boarder/maintenance/{id}', [MaintenanceController::class, 'show']);
Router::post('/api/boarder/maintenance', [MaintenanceController::class, 'store']);
Router::post('/api/boarder/maintenance/{id}/comment', [MaintenanceController::class, 'addComment']);
Router::post('/api/boarder/maintenance/{id}/rate', [MaintenanceController::class, 'rateRequest']);

// ============================================
// MAINTENANCE ROUTES - SHARED
// ============================================
Router::get('/api/maintenance/stats', [MaintenanceController::class, 'stats']);

// ============================================
// APPLICATION ROUTES - BOARDER
// ============================================
Router::get('/api/boarder/applications', [ApplicationController::class, 'index']);
Router::get('/api/boarder/applications/{id}', [ApplicationController::class, 'show']);
Router::post('/api/boarder/applications', [ApplicationController::class, 'store']);
Router::delete('/api/boarder/applications/{id}', [ApplicationController::class, 'destroy']);

// ============================================
// APPLICATION ROUTES - LANDLORD
// ============================================
Router::get('/api/landlord/applications', [ApplicationController::class, 'index']);
Router::get('/api/landlord/applications/{id}', [ApplicationController::class, 'show']);
Router::patch('/api/landlord/applications/{id}/status', [ApplicationController::class, 'updateStatus']);

// ============================================
// ONBOARDING ROUTES - LANDLORD
// ============================================
Router::get('/api/landlord/welcome-message', [OnboardingController::class, 'getWelcomeTemplate']);
Router::post('/api/landlord/welcome-message', [OnboardingController::class, 'saveWelcomeTemplate']);
Router::get('/api/landlord/documents', [OnboardingController::class, 'getDocuments']);
Router::post('/api/landlord/documents', [OnboardingController::class, 'uploadDocument']);
Router::post('/api/landlord/documents/auto-send', [OnboardingController::class, 'toggleAutoSend']);
Router::get('/api/landlord/documents/auto-send', [OnboardingController::class, 'getAutoSendDocuments']);
Router::delete('/api/landlord/documents/{id}', [OnboardingController::class, 'deleteDocument']);

// ============================================
// ONBOARDING ROUTES - BOARDER
// ============================================
Router::get('/api/boarder/documents', [OnboardingController::class, 'getBoarderDocuments']);
Router::post('/api/boarder/documents/acknowledge', [OnboardingController::class, 'acknowledgeDocument']);

// ============================================
// ONBOARDING ROUTES - SHARED
// ============================================
Router::post('/api/onboarding/welcome', [OnboardingController::class, 'triggerWelcome']);

// ============================================
// LANDLORD DASHBOARD ROUTES
// ============================================
// Dashboard stats endpoint (handled directly by file)
// GET /api/landlord/dashboard/stats -> /server/api/landlord/dashboard-stats.php
Router::get('/api/landlord/properties', function() {
    require_once __DIR__ . '/landlord/properties.php';
});

Router::post('/api/landlord/listings', function() {
    require_once __DIR__ . '/landlord/create-listing.php';
});

Router::put('/api/landlord/listings/{id}', function($id) {
    require_once __DIR__ . '/landlord/update-listing.php';
});

// ============================================
// PUBLIC ROOM LISTINGS ROUTES
// ============================================
// Get all published properties (no authentication required)
Router::get('/api/rooms/public', function() {
    require_once __DIR__ . '/rooms/public.php';
});

// ============================================
// DISPATCH THE REQUEST
// ============================================
$method = $_SERVER['REQUEST_METHOD'];
$uri = $_SERVER['REQUEST_URI'];

Router::dispatch($method, $uri);
