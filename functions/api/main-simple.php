<?php

require_once __DIR__ . '/vendor/autoload.php';

use Appwrite\Client;
use Appwrite\Services\Account;
use Appwrite\Services\Databases;
use Appwrite\Services\Users;
use Appwrite\Services\Storage;
use Appwrite\Services\Teams;
use Appwrite\Permission;
use Appwrite\Role;
use Appwrite\ID;
use Appwrite\Query;

return function ($context) {
    // Helper functions
    function parseJsonBody($body) {
        if (empty($body)) return [];
        $data = json_decode($body, true);
        return $data ?: [];
    }
    
    // Parse query parameters from URL
    function parseQueryParams($context) {
        $params = [];
        
        // Try to get query parameters from different sources
        if (isset($context->req->query) && is_array($context->req->query)) {
            // Appwrite might provide query params directly
            $params = $context->req->query;
        } elseif (isset($context->req->url)) {
            // Parse from full URL
            $queryString = parse_url($context->req->url, PHP_URL_QUERY);
            if ($queryString) {
                parse_str($queryString, $params);
            }
        } elseif (isset($_GET) && !empty($_GET)) {
            // Fallback to $_GET
            $params = $_GET;
        }
        
        return $params;
    }
    
    // Environment variable helper function
    function env($key, $default = null) {
        return $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key) ?? $default;
    }

    // Get request method and path
    $method = $context->req->method ?? 'GET';
    $path = $context->req->path ?? '/';
    $body = $context->req->body ?? '';
    $headers_in = $context->req->headers ?? [];
    
    // Parse request body to get path and method for function executions
    $requestData = parseJsonBody($body);
    $queryParams = parseQueryParams($context);
    
    if (!empty($requestData['path'])) {
        $path = $requestData['path'];
    }
    if (!empty($requestData['method'])) {
        $method = $requestData['method'];
    }
    
    // Enhanced CORS headers
    $origin = $context->req->headers['origin'] ?? $context->req->headers['Origin'] ?? '*';
    
    // Load allowed origins from environment
    $allowedOrigins = explode(',', env('ALLOWED_ORIGINS', 'https://haven-space.appwrite.network,http://localhost:3000'));
    
    // Check if origin is allowed, otherwise use first allowed origin or wildcard
    $corsOrigin = in_array($origin, $allowedOrigins) ? $origin : ($allowedOrigins[0] ?? '*');
    
    $headers = [
        'Access-Control-Allow-Origin' => $corsOrigin,
        'Access-Control-Allow-Methods' => 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Appwrite-Project, X-Appwrite-Key, X-User-Id, X-Session-Id',
        'Access-Control-Allow-Credentials' => 'true',
        'Access-Control-Max-Age' => '86400'
    ];

    // Handle preflight OPTIONS request
    if ($method === 'OPTIONS') {
        return $context->res->text('', 200, $headers);
    }

    // Initialize Appwrite client
    $client = new Client();
    $client
        ->setEndpoint(getenv('APPWRITE_FUNCTION_ENDPOINT') ?: 'https://fra.cloud.appwrite.io/v1')
        ->setProject(getenv('APPWRITE_FUNCTION_PROJECT_ID') ?: '69eae504002697b6749c')
        ->setKey(getenv('APPWRITE_API_KEY') ?: $context->req->headers['x-appwrite-key'] ?? '');

    // Initialize services
    $account = new Account($client);
    $databases = new Databases($client);
    $users = new Users($client);
    $storage = new Storage($client);
    $teams = new Teams($client);

    function generateResponse($data, $status = 200, $message = 'Success') {
        return [
            'success' => $status < 400,
            'status' => $status,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('c')
        ];
    }

    try {
        // Route handling
        switch (true) {
            // Root endpoints
            case $path === '/':
                return $context->res->json(generateResponse([
                    'service' => 'Haven Space API',
                    'version' => '2.0.0-SIMPLE',
                    'status' => 'active',
                    'endpoints' => [
                        'auth' => '/auth/*',
                        'api' => '/api/*',
                        'health' => '/health',
                        'test' => '/test'
                    ]
                ]), 200, $headers);

            case $path === '/health':
                return $context->res->json(generateResponse([
                    'status' => 'healthy',
                    'service' => 'Haven Space API',
                    'version' => '2.0.0-SIMPLE'
                ]), 200, $headers);

            // Google OAuth endpoints
            case preg_match('#^/auth/google/authorize\.php$#', $path):
                // Handle both GET and POST requests
                $action = $requestData['action'] ?? $queryParams['action'] ?? 'login';
                $role = $requestData['role'] ?? $queryParams['role'] ?? null;
                
                $validActions = ['login', 'signup', 'link'];
                if (!in_array($action, $validActions)) {
                    return $context->res->json(generateResponse(null, 400, 'Invalid action parameter'), 400, $headers);
                }
                
                // Generate state token for CSRF protection
                $state = bin2hex(random_bytes(32));
                
                // Build Google OAuth URL
                $clientId = env('GOOGLE_CLIENT_ID');
                $redirectUri = env('GOOGLE_REDIRECT_URI');
                $scope = 'openid email profile';
                
                $authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query([
                    'client_id' => $clientId,
                    'redirect_uri' => $redirectUri,
                    'scope' => $scope,
                    'response_type' => 'code',
                    'state' => $state,
                    'access_type' => 'offline',
                    'prompt' => 'consent'
                ]);
                
                // For browser requests (GET with query params), redirect directly to Google
                // For API requests (POST with JSON), return JSON with redirect URL
                if ($method === 'GET' && !empty($queryParams)) {
                    // Browser request - redirect to Google using Location header
                    $redirectHeaders = array_merge($headers, [
                        'Location' => $authUrl
                    ]);
                    return $context->res->text('', 302, $redirectHeaders);
                } else {
                    // API request - return JSON
                    return $context->res->json(generateResponse([
                        'redirect_url' => $authUrl,
                        'state' => $state
                    ], 200, 'Google OAuth authorization URL generated'), 200, $headers);
                }

            // Default case - route not found
            default:
                return $context->res->json(generateResponse(null, 404, 'Route not found: ' . $path), 404, $headers);
        }
        
    } catch (Exception $e) {
        return $context->res->json(generateResponse(null, 500, 'Server error: ' . $e->getMessage()), 500, $headers);
    } catch (Throwable $e) {
        return $context->res->json(generateResponse(null, 500, 'Fatal error: ' . $e->getMessage()), 500, $headers);
    }
};