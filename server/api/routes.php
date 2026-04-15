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

    public static function get(string $path, array $handler): void
    {
        self::$routes['GET'][$path] = $handler;
    }

    public static function post(string $path, array $handler): void
    {
        self::$routes['POST'][$path] = $handler;
    }

    public static function put(string $path, array $handler): void
    {
        self::$routes['PUT'][$path] = $handler;
    }

    public static function patch(string $path, array $handler): void
    {
        self::$routes['PATCH'][$path] = $handler;
    }

    public static function delete(string $path, array $handler): void
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
// TODO: Implement MessageController methods for full messaging functionality
// Currently routes are defined but controllers need implementation
// ============================================
Router::get('/api/messages/conversations', [MessageController::class, 'index']); // TODO: Implement - Fetch user conversations
Router::get('/api/messages/conversations/{id}', [MessageController::class, 'show']); // TODO: Implement - Get conversation with messages
Router::post('/api/messages', [MessageController::class, 'store']); // TODO: Implement - Send a message
Router::put('/api/messages/conversations/{id}/read', [MessageController::class, 'markAsRead']); // TODO: Implement - Mark conversation as read
Router::get('/api/messages/search', [MessageController::class, 'search']); // TODO: Implement - Search messages
Router::get('/api/messages/unread-count', [MessageController::class, 'unreadCount']); // TODO: Implement - Get unread message count

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

// ============================================
// DISPATCH THE REQUEST
// ============================================
$method = $_SERVER['REQUEST_METHOD'];
$uri = $_SERVER['REQUEST_URI'];

Router::dispatch($method, $uri);
