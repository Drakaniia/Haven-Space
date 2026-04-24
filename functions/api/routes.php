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
use App\Modules\Notification\Controllers\NotificationController;
use App\Modules\Message\Controllers\MessageController;
use App\Modules\Maintenance\Controllers\MaintenanceController;
use App\Modules\Onboarding\Controllers\OnboardingController;
use App\Modules\Application\Controllers\ApplicationController;
use App\Core\Upload\UploadController;
use App\AI\GroqService;

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
// AUTH ROUTES
// ============================================
Router::post('/auth/register', function() {
    require_once __DIR__ . '/auth/register.php';
});

Router::post('/auth/register.php', function() {
    require_once __DIR__ . '/auth/register.php';
});

Router::post('/auth/login', function() {
    require_once __DIR__ . '/auth/login.php';
});

Router::post('/auth/login.php', function() {
    require_once __DIR__ . '/auth/login.php';
});

// ============================================
// GOOGLE OAUTH ROUTES
// ============================================
Router::get('/auth/google/authorize.php', function() {
    require_once __DIR__ . '/auth/google/authorize.php';
});

Router::get('/auth/google/callback.php', function() {
    require_once __DIR__ . '/auth/google/callback.php';
});

Router::post('/auth/google/complete-registration.php', function() {
    require_once __DIR__ . '/auth/google/complete-registration.php';
});

Router::post('/auth/google/link.php', function() {
    require_once __DIR__ . '/auth/google/link.php';
});

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

Router::get('/api/users/profile', function() {
    require_once __DIR__ . '/users/profile.php';
});

Router::put('/api/users/profile', function() {
    require_once __DIR__ . '/users/profile.php';
});

Router::patch('/api/users/profile', function() {
    require_once __DIR__ . '/users/profile.php';
});

// Avatar upload endpoint
Router::post('/api/users/avatar', function() {
    require_once __DIR__ . '/users/avatar.php';
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
// SAVED LISTINGS ROUTES - BOARDER
// ============================================
Router::get('/api/boarder/saved-listings', function() {
    require_once __DIR__ . '/boarder/saved-listings.php';
});

Router::post('/api/boarder/saved-listings', function() {
    require_once __DIR__ . '/boarder/saved-listings.php';
});

Router::delete('/api/boarder/saved-listings', function() {
    require_once __DIR__ . '/boarder/saved-listings.php';
});

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

Router::post('/api/landlord/upload-photos', function() {
    require_once __DIR__ . '/landlord/upload-photos.php';
});

Router::post('/api/landlord/listings/{id}/photos', function($id) {
    require_once __DIR__ . '/landlord/listing-photos.php';
});

// ============================================
// BOARDER ROUTES - LANDLORD
// ============================================
Router::get('/api/landlord/boarders.php', function() {
    require_once __DIR__ . '/landlord/boarders.php';
});

Router::post('/api/landlord/boarders.php', function() {
    require_once __DIR__ . '/landlord/boarders.php';
});

Router::delete('/api/landlord/boarders.php', function() {
    require_once __DIR__ . '/landlord/boarders.php';
});

// ============================================
// ANNOUNCEMENT ROUTES - LANDLORD
// ============================================
Router::get('/api/landlord/announcements', function() {
    require_once __DIR__ . '/landlord/announcements.php';
});

Router::post('/api/landlord/announcements', function() {
    require_once __DIR__ . '/landlord/announcements.php';
});

Router::put('/api/landlord/announcements/{id}', function($id) {
    require_once __DIR__ . '/landlord/announcements.php';
});

Router::delete('/api/landlord/announcements/{id}', function($id) {
    require_once __DIR__ . '/landlord/announcements.php';
});

// ============================================
// ANNOUNCEMENT ROUTES - BOARDER
// ============================================
Router::get('/api/boarder/announcements', function() {
    require_once __DIR__ . '/boarder/announcements.php';
});

Router::post('/api/boarder/announcements/{id}/view', function($id) {
    require_once __DIR__ . '/boarder/announcements.php';
});

// ============================================
// BOARDER DASHBOARD ROUTES
// ============================================
Router::get('/api/boarder/dashboard/stats', function() {
    require_once __DIR__ . '/boarder/dashboard-stats.php';
});

// ============================================
// LEASE ROUTES - BOARDER
// ============================================
Router::get('/api/boarder/lease', function() {
    require_once __DIR__ . '/boarder/lease.php';
});

// ============================================
// PAYMENT ROUTES - LANDLORD
// ============================================
Router::get('/api/landlord/payments', function() {
    require_once __DIR__ . '/landlord/payments.php';
});

Router::post('/api/landlord/payments', function() {
    require_once __DIR__ . '/landlord/payments.php';
});

Router::get('/api/landlord/payment-summary', function() {
    require_once __DIR__ . '/landlord/payment-summary.php';
});

Router::get('/api/landlord/reports', function() {
    require_once __DIR__ . '/landlord/reports.php';
});

// ============================================
// PAYMENT ROUTES - SHARED
// ============================================
Router::get('/api/payments/history', function() {
    require_once __DIR__ . '/payments/history.php';
});

Router::get('/api/payments/overview', function() {
    require_once __DIR__ . '/payments/overview.php';
});

Router::get('/api/payments/methods', function() {
    require_once __DIR__ . '/payments/methods.php';
});

Router::post('/api/payments/methods', function() {
    require_once __DIR__ . '/payments/methods.php';
});

Router::delete('/api/payments/methods/{id}', function($id) {
    require_once __DIR__ . '/payments/methods.php';
});

// ============================================
// CALENDAR ROUTES - LANDLORD
// ============================================
Router::get('/api/landlord/calendar', function() {
    require_once __DIR__ . '/landlord/calendar.php';
});

// Welcome settings
Router::get('/api/landlord/welcome-settings', function() {
    require_once __DIR__ . '/landlord/welcome-settings.php';
});

Router::post('/api/landlord/welcome-settings', function() {
    require_once __DIR__ . '/landlord/welcome-settings.php';
});

// ============================================
// PUBLIC ROOM LISTINGS ROUTES
// ============================================
// Get all published properties (no authentication required)
Router::get('/api/rooms/public', function() {
    require_once __DIR__ . '/rooms/public.php';
});

// Get single property detail (no authentication required)
Router::get('/api/rooms/detail', function() {
    require_once __DIR__ . '/rooms/detail.php';
});

// Get popular locations based on property data (no authentication required)
Router::get('/api/rooms/popular-locations', function() {
    require_once __DIR__ . '/rooms/popular-locations.php';
});

// ============================================
// ALL PROPERTIES ROUTES (FOR MAPS)
// ============================================
// Get all active properties from all landlords for map display
Router::get('/api/properties/all', function() {
    require_once __DIR__ . '/properties/all.php';
});

// ============================================
// NOTIFICATION ROUTES
// ============================================
Router::get('/api/notifications', [NotificationController::class, 'index']);
Router::get('/api/notifications/unread-count', [NotificationController::class, 'unreadCount']);
Router::patch('/api/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
Router::patch('/api/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
Router::delete('/api/notifications/{id}', [NotificationController::class, 'destroy']);

// Boarder accepted applications (for overlay)
Router::get('/api/boarder/accepted-applications', [NotificationController::class, 'getAcceptedApplications']);
Router::get('/api/boarder/has-accepted-applications', [NotificationController::class, 'hasAcceptedApplications']);

// ============================================
// AI POWERED FEATURES
// ============================================
// Property description generator for landlords
Router::post('/api/ai/generate-description', function() {
    require_once __DIR__ . '/ai/generate-description.php';
});

// Smart search enhancement
Router::post('/api/ai/enhance-search', function() {
    require_once __DIR__ . '/ai/enhance-search.php';
});

// Maintenance request analysis
Router::post('/api/ai/analyze-issue', function() {
    require_once __DIR__ . '/ai/analyze-issue.php';
});

// Message drafting assistant
Router::post('/api/ai/draft-message', function() {
    require_once __DIR__ . '/ai/draft-message.php';
});

// Application analysis for landlords
Router::post('/api/ai/analyze-application', function() {
    require_once __DIR__ . '/ai/analyze-application.php';
});

// AI Chat endpoint for Haven AI assistant
Router::post('/api/ai/chat', function() {
    require_once __DIR__ . '/ai/chat.php';
});

// ============================================
// DISPATCH THE REQUEST
// ============================================
$method = $_SERVER['REQUEST_METHOD'];
$uri = $_SERVER['REQUEST_URI'];

Router::dispatch($method, $uri);
