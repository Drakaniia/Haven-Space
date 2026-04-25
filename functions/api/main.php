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
    if (!empty($requestData['path'])) {
        $path = $requestData['path'];
    }
    if (!empty($requestData['method'])) {
        $method = $requestData['method'];
    }
    // Keep the original request data for processing
    $originalRequestData = $requestData;
    // Make it available globally for included files
    $GLOBALS['originalRequestData'] = $originalRequestData;
    
    // Enhanced CORS headers - use specific origin for credentials support
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

    // Database and collection IDs
    $databaseId = 'haven-space-db';
    $collections = [
        'users' => 'users',
        'properties' => 'properties',
        'rooms' => 'rooms',
        'applications' => 'applications',
        'messages' => 'messages',
        'payments' => 'payments',
        'notifications' => 'notifications',
        'documents' => 'documents'
    ];

    function getAuthHeaders($headers_in) {
        return [
            'session' => $headers_in['x-session-id'] ?? $headers_in['authorization'] ?? '',
            'user_id' => $headers_in['x-user-id'] ?? ''
        ];
    }

    function authenticateUser($client, $headers_in) {
        $auth = getAuthHeaders($headers_in);
        if (!empty($auth['session'])) {
            $client->setSession($auth['session']);
        }
        return $auth;
    }

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
        // Route handling with comprehensive API endpoints
        switch (true) {
            // Root endpoints
            case $path === '/':
                return $context->res->json(generateResponse([
                    'service' => 'Haven Space API',
                    'version' => '2.0.0-COMPREHENSIVE',
                    'status' => 'active',
                    'endpoints' => [
                        'auth' => '/auth/*',
                        'api' => '/api/*',
                        'health' => '/health',
                        'test' => '/test'
                    ],
                    'deployment_test' => 'NEW_COMPREHENSIVE_API_DEPLOYED'
                ]), 200, $headers);

            case $path === '/health':
                return $context->res->json(generateResponse([
                    'status' => 'healthy',
                    'service' => 'Haven Space API',
                    'version' => '2.0.0',
                    'environment' => [
                        'php_version' => phpversion(),
                        'endpoint' => getenv('APPWRITE_FUNCTION_ENDPOINT') ?: 'not set',
                        'project_id' => getenv('APPWRITE_FUNCTION_PROJECT_ID') ?: 'not set'
                    ]
                ]), 200, $headers);

            case $path === '/test':
                return $context->res->json(generateResponse([
                    'message' => 'Test endpoint working',
                    'method' => $method,
                    'path' => $path,
                    'body_received' => !empty($body),
                    'headers_count' => count($headers_in)
                ]), 200, $headers);

            // Authentication endpoints
            case preg_match('#^/auth/register\.php$#', $path):
            case preg_match('#^/auth/register$#', $path):
                if ($method !== 'POST') {
                    return $context->res->json(generateResponse(null, 405, 'Method not allowed'), 405, $headers);
                }
                
                $email = $originalRequestData['email'] ?? '';
                $password = $originalRequestData['password'] ?? '';
                $name = $originalRequestData['name'] ?? '';
                $role = $originalRequestData['role'] ?? 'boarder';
                
                if (empty($email) || empty($password)) {
                    return $context->res->json(generateResponse(null, 400, 'Email and password required'), 400, $headers);
                }
                
                // Create account
                $user = $account->create(ID::unique(), $email, $password, $name);
                
                // Create session
                $session = $account->createEmailPasswordSession($email, $password);
                
                // Store additional user data in database
                $userData = [
                    'user_id' => $user['$id'],
                    'email' => $email,
                    'name' => $name,
                    'role' => $role,
                    'status' => 'active',
                    'created_at' => date('c'),
                    'updated_at' => date('c')
                ];
                
                $databases->createDocument($databaseId, $collections['users'], ID::unique(), $userData);
                
                return $context->res->json(generateResponse([
                    'user' => $user,
                    'session' => $session
                ], 201, 'User registered successfully'), 201, $headers);

            // Google OAuth endpoints
            case preg_match('#^/auth/google/authorize\.php$#', $path):
                // Handle Google OAuth authorization
                define('APPWRITE_FUNCTION_CONTEXT', true);
                require_once __DIR__ . '/auth/google/authorize.php';
                
                // Get the authorization URL that was generated
                $authUrl = $authUrl ?? null;
                
                if ($authUrl) {
                    // Return a redirect response
                    return $context->res->json(generateResponse([
                        'redirect_url' => $authUrl
                    ], 302, 'Redirect to Google OAuth'), 302, [
                        'Location' => $authUrl
                    ]);
                } else {
                    return $context->res->json(generateResponse(null, 500, 'Failed to generate authorization URL'), 500, $headers);
                }

            case preg_match('#^/auth/google/callback\.php$#', $path):
                // Handle Google OAuth callback
                define('APPWRITE_FUNCTION_CONTEXT', true);
                require_once __DIR__ . '/auth/google/callback.php';
                
                // The callback.php should set some result that we can return
                $oauthResult = $oauthResult ?? null;
                
                if ($oauthResult && isset($oauthResult['success']) && $oauthResult['success']) {
                    return $context->res->json(generateResponse($oauthResult, 200, 'Google OAuth callback processed'), 200, $headers);
                } elseif ($oauthResult && isset($oauthResult['success']) && !$oauthResult['success']) {
                    return $context->res->json(generateResponse(null, 400, $oauthResult['error'] ?? 'Google OAuth callback failed'), 400, $headers);
                } else {
                    return $context->res->json(generateResponse(null, 500, 'Failed to process OAuth callback'), 500, $headers);
                }

            case preg_match('#^/auth/google/check-pending-registration\.php$#', $path):
                if ($method !== 'GET') {
                    return $context->res->json(generateResponse(null, 405, 'Method not allowed'), 405, $headers);
                }
                
                // Handle check pending registration
                define('APPWRITE_FUNCTION_CONTEXT', true);
                require_once __DIR__ . '/auth/google/check-pending-registration.php';
                
                // The check-pending-registration.php should set some result that we can return
                $checkResult = $checkResult ?? null;
                
                if ($checkResult && isset($checkResult['success'])) {
                    return $context->res->json(generateResponse($checkResult, 200, 'Pending registration check completed'), 200, $headers);
                } else {
                    return $context->res->json(generateResponse(null, 500, 'Failed to check pending registration'), 500, $headers);
                }

            case preg_match('#^/auth/login\.php$#', $path):
            case preg_match('#^/auth/login$#', $path):
                if ($method !== 'POST') {
                    return $context->res->json(generateResponse(null, 405, 'Method not allowed'), 405, $headers);
                }
                
                $email = $originalRequestData['email'] ?? '';
                $password = $originalRequestData['password'] ?? '';
                
                if (empty($email) || empty($password)) {
                    return $context->res->json(generateResponse(null, 400, 'Email and password required'), 400, $headers);
                }
                
                $session = $account->createEmailPasswordSession($email, $password);
                $client->setSession($session['secret']);
                $user = $account->get();
                
                return $context->res->json(generateResponse([
                    'user' => $user,
                    'session' => $session
                ], 200, 'Login successful'), 200, $headers);

            case preg_match('#^/auth/logout\.php$#', $path):
            case preg_match('#^/auth/logout$#', $path):
                if ($method !== 'POST') {
                    return $context->res->json(generateResponse(null, 405, 'Method not allowed'), 405, $headers);
                }
                
                authenticateUser($client, $headers_in);
                $account->deleteSession('current');
                
                return $context->res->json(generateResponse(null, 200, 'Logout successful'), 200, $headers);

            case preg_match('#^/auth/me\.php$#', $path):
            case preg_match('#^/auth/me$#', $path):
                if ($method !== 'GET') {
                    return $context->res->json(generateResponse(null, 405, 'Method not allowed'), 405, $headers);
                }
                
                authenticateUser($client, $headers_in);
                $user = $account->get();
                
                // Get additional user data from database
                $userDocs = $databases->listDocuments($databaseId, $collections['users'], [
                    Query::equal('user_id', $user['$id'])
                ]);
                
                $userData = $userDocs['documents'][0] ?? null;
                
                return $context->res->json(generateResponse([
                    'user' => $user,
                    'profile' => $userData
                ], 200, 'User data retrieved'), 200, $headers);

            // User management endpoints
            case preg_match('#^/api/users/profile$#', $path):
                authenticateUser($client, $headers_in);
                
                if ($method === 'GET') {
                    $user = $account->get();
                    $userDocs = $databases->listDocuments($databaseId, $collections['users'], [
                        Query::equal('user_id', $user['$id'])
                    ]);
                    
                    return $context->res->json(generateResponse([
                        'user' => $user,
                        'profile' => $userDocs['documents'][0] ?? null
                    ]), 200, $headers);
                    
                } elseif ($method === 'PUT') {
                    $user = $account->get();
                    
                    // Update account info
                    if (!empty($originalRequestData['name'])) {
                        $account->updateName($originalRequestData['name']);
                    }
                    if (!empty($originalRequestData['email'])) {
                        $account->updateEmail($originalRequestData['email'], $originalRequestData['password'] ?? '');
                    }
                    
                    // Update profile in database
                    $userDocs = $databases->listDocuments($databaseId, $collections['users'], [
                        Query::equal('user_id', $user['$id'])
                    ]);
                    
                    if (!empty($userDocs['documents'])) {
                        $profileData = array_merge($userDocs['documents'][0], $originalRequestData);
                        $profileData['updated_at'] = date('c');
                        
                        $databases->updateDocument($databaseId, $collections['users'], 
                            $userDocs['documents'][0]['$id'], $profileData);
                    }
                    
                    return $context->res->json(generateResponse(null, 200, 'Profile updated'), 200, $headers);
                }
                break;

            case preg_match('#^/api/users/search$#', $path):
                if ($method !== 'GET') {
                    return $context->res->json(generateResponse(null, 405, 'Method not allowed'), 405, $headers);
                }
                
                authenticateUser($client, $headers_in);
                $query = $_GET['q'] ?? '';
                $role = $_GET['role'] ?? '';
                
                $queries = [];
                if (!empty($query)) {
                    $queries[] = Query::search('name', $query);
                }
                if (!empty($role)) {
                    $queries[] = Query::equal('role', $role);
                }
                
                $results = $databases->listDocuments($databaseId, $collections['users'], $queries);
                
                return $context->res->json(generateResponse($results['documents']), 200, $headers);

            // Property management endpoints
            case preg_match('#^/api/properties/all\.php$#', $path):
            case preg_match('#^/api/properties/all$#', $path):
                if ($method !== 'GET') {
                    return $context->res->json(generateResponse(null, 405, 'Method not allowed'), 405, $headers);
                }
                
                $properties = $databases->listDocuments($databaseId, $collections['properties'], [
                    Query::equal('status', 'active')
                ]);
                
                return $context->res->json(generateResponse($properties['documents']), 200, $headers);

            case preg_match('#^/api/landlord/properties\.php$#', $path):
            case preg_match('#^/api/landlord/properties$#', $path):
                authenticateUser($client, $headers_in);
                $user = $account->get();
                
                if ($method === 'GET') {
                    $properties = $databases->listDocuments($databaseId, $collections['properties'], [
                        Query::equal('landlord_id', $user['$id'])
                    ]);
                    
                    return $context->res->json(generateResponse($properties['documents']), 200, $headers);
                    
                } elseif ($method === 'POST') {
                    $propertyData = array_merge($originalRequestData, [
                        'landlord_id' => $user['$id'],
                        'status' => 'active',
                        'created_at' => date('c'),
                        'updated_at' => date('c')
                    ]);
                    
                    $property = $databases->createDocument($databaseId, $collections['properties'], 
                        ID::unique(), $propertyData);
                    
                    return $context->res->json(generateResponse($property, 201, 'Property created'), 201, $headers);
                }
                break;

            // Room endpoints
            case preg_match('#^/api/rooms/detail$#', $path):
                if ($method !== 'GET') {
                    return $context->res->json(generateResponse(null, 405, 'Method not allowed'), 405, $headers);
                }
                
                $roomId = $_GET['id'] ?? '';
                if (empty($roomId)) {
                    return $context->res->json(generateResponse(null, 400, 'Room ID required'), 400, $headers);
                }
                
                $room = $databases->getDocument($databaseId, $collections['rooms'], $roomId);
                
                return $context->res->json(generateResponse($room), 200, $headers);

            case preg_match('#^/api/rooms/public$#', $path):
                if ($method !== 'GET') {
                    return $context->res->json(generateResponse(null, 405, 'Method not allowed'), 405, $headers);
                }
                
                $queries = [Query::equal('status', 'available')];
                
                // Add filters based on query parameters
                if (!empty($_GET['location'])) {
                    $queries[] = Query::search('location', $_GET['location']);
                }
                if (!empty($_GET['min_price'])) {
                    $queries[] = Query::greaterThanEqual('price', (float)$_GET['min_price']);
                }
                if (!empty($_GET['max_price'])) {
                    $queries[] = Query::lessThanEqual('price', (float)$_GET['max_price']);
                }
                
                $rooms = $databases->listDocuments($databaseId, $collections['rooms'], $queries);
                
                return $context->res->json(generateResponse($rooms['documents']), 200, $headers);

            // Application endpoints
            case preg_match('#^/api/boarder/dashboard/stats$#', $path):
                authenticateUser($client, $headers_in);
                $user = $account->get();
                
                if ($method === 'GET') {
                    // Get application statistics
                    $applications = $databases->listDocuments($databaseId, $collections['applications'], [
                        Query::equal('boarder_id', $user['$id'])
                    ]);
                    
                    $totalApplications = count($applications['documents']);
                    $pendingApplications = 0;
                    $acceptedApplications = 0;
                    $rejectedApplications = 0;
                    
                    foreach ($applications['documents'] as $app) {
                        if ($app['status'] === 'pending') $pendingApplications++;
                        if ($app['status'] === 'accepted') $acceptedApplications++;
                        if ($app['status'] === 'rejected') $rejectedApplications++;
                    }
                    
                    // Get saved properties count
                    $savedProperties = $databases->listDocuments($databaseId, $collections['saved_listings'], [
                        Query::equal('boarder_id', $user['$id'])
                    ]);
                    $savedPropertiesCount = count($savedProperties['documents']);
                    
                    // Calculate profile completion (simplified for Appwrite)
                    $userProfile = $account->get();
                    $profileFields = [
                        'name' => !empty($userProfile['name']),
                        'email' => !empty($userProfile['email']),
                        'phone' => !empty($userProfile['phone']),
                    ];
                    $completedFields = array_sum($profileFields);
                    $totalFields = count($profileFields);
                    $profileCompletionPercentage = round(($completedFields / $totalFields) * 100);
                    
                    $stats = [
                        'applications' => [
                            'total' => $totalApplications,
                            'pending' => $pendingApplications,
                            'accepted' => $acceptedApplications,
                            'rejected' => $rejectedApplications
                        ],
                        'saved_properties' => [
                            'count' => $savedPropertiesCount
                        ],
                        'profile_completion' => [
                            'percentage' => $profileCompletionPercentage,
                            'completed_fields' => $completedFields,
                            'total_fields' => $totalFields,
                            'checklist' => [
                                ['field' => 'basic_info', 'label' => 'Basic Information', 'completed' => $profileFields['name'] && $profileFields['email']],
                                ['field' => 'contact_info', 'label' => 'Contact Information', 'completed' => $profileFields['phone']],
                            ]
                        ]
                    ];
                    
                    return $context->res->json(generateResponse($stats), 200, $headers);
                }
                break;

            case preg_match('#^/api/boarder/applications$#', $path):
                authenticateUser($client, $headers_in);
                $user = $account->get();
                
                if ($method === 'GET') {
                    $applications = $databases->listDocuments($databaseId, $collections['applications'], [
                        Query::equal('boarder_id', $user['$id'])
                    ]);
                    
                    return $context->res->json(generateResponse($applications['documents']), 200, $headers);
                    
                } elseif ($method === 'POST') {
                    $applicationData = array_merge($originalRequestData, [
                        'boarder_id' => $user['$id'],
                        'status' => 'pending',
                        'created_at' => date('c'),
                        'updated_at' => date('c')
                    ]);
                    
                    $application = $databases->createDocument($databaseId, $collections['applications'], 
                        ID::unique(), $applicationData);
                    
                    return $context->res->json(generateResponse($application, 201, 'Application submitted'), 201, $headers);
                }
                break;

            case preg_match('#^/api/landlord/applications$#', $path):
                authenticateUser($client, $headers_in);
                $user = $account->get();
                
                if ($method === 'GET') {
                    // Get applications for landlord's properties
                    $properties = $databases->listDocuments($databaseId, $collections['properties'], [
                        Query::equal('landlord_id', $user['$id'])
                    ]);
                    
                    $propertyIds = array_map(fn($p) => $p['$id'], $properties['documents']);
                    
                    $applications = $databases->listDocuments($databaseId, $collections['applications'], [
                        Query::equal('property_id', $propertyIds)
                    ]);
                    
                    return $context->res->json(generateResponse($applications['documents']), 200, $headers);
                }
                break;

            // Message endpoints
            case preg_match('#^/api/messages/conversations$#', $path):
                authenticateUser($client, $headers_in);
                $user = $account->get();
                
                if ($method === 'GET') {
                    $conversations = $databases->listDocuments($databaseId, $collections['messages'], [
                        Query::or([
                            Query::equal('sender_id', $user['$id']),
                            Query::equal('recipient_id', $user['$id'])
                        ])
                    ]);
                    
                    return $context->res->json(generateResponse($conversations['documents']), 200, $headers);
                }
                break;

            case preg_match('#^/api/messages$#', $path):
                authenticateUser($client, $headers_in);
                $user = $account->get();
                
                if ($method === 'POST') {
                    $messageData = array_merge($originalRequestData, [
                        'sender_id' => $user['$id'],
                        'status' => 'sent',
                        'created_at' => date('c')
                    ]);
                    
                    $message = $databases->createDocument($databaseId, $collections['messages'], 
                        ID::unique(), $messageData);
                    
                    return $context->res->json(generateResponse($message, 201, 'Message sent'), 201, $headers);
                }
                break;

            // Payment endpoints
            case preg_match('#^/api/payments/overview$#', $path):
            case preg_match('#^/api/landlord/payment-overview\.php$#', $path):
                authenticateUser($client, $headers_in);
                $user = $account->get();
                
                $payments = $databases->listDocuments($databaseId, $collections['payments'], [
                    Query::equal('user_id', $user['$id'])
                ]);
                
                return $context->res->json(generateResponse($payments['documents']), 200, $headers);

            case preg_match('#^/api/payments/history$#', $path):
            case preg_match('#^/api/landlord/payments\.php$#', $path):
                authenticateUser($client, $headers_in);
                $user = $account->get();
                
                if ($method === 'GET') {
                    $payments = $databases->listDocuments($databaseId, $collections['payments'], [
                        Query::equal('user_id', $user['$id']),
                        Query::orderDesc('created_at')
                    ]);
                    
                    return $context->res->json(generateResponse($payments['documents']), 200, $headers);
                    
                } elseif ($method === 'POST') {
                    $paymentData = array_merge($originalRequestData, [
                        'user_id' => $user['$id'],
                        'status' => 'pending',
                        'created_at' => date('c')
                    ]);
                    
                    $payment = $databases->createDocument($databaseId, $collections['payments'], 
                        ID::unique(), $paymentData);
                    
                    return $context->res->json(generateResponse($payment, 201, 'Payment recorded'), 201, $headers);
                }
                break;

            // Notification endpoints
            case preg_match('#^/api/notifications/unread-count$#', $path):
                authenticateUser($client, $headers_in);
                $user = $account->get();
                
                $notifications = $databases->listDocuments($databaseId, $collections['notifications'], [
                    Query::equal('user_id', $user['$id']),
                    Query::equal('read', false)
                ]);
                
                return $context->res->json(generateResponse([
                    'count' => $notifications['total']
                ]), 200, $headers);

            // AI Chat endpoint
            case preg_match('#^/api/(ai/)?chat(\.php)?$#', $path):
                if ($method !== 'POST') {
                    return $context->res->json(generateResponse(null, 405, 'Method not allowed'), 405, $headers);
                }
                
                $message = $originalRequestData['message'] ?? '';
                $sessionId = $originalRequestData['session_id'] ?? uniqid();
                $userId = $originalRequestData['user_id'] ?? 'anonymous';
                
                if (empty($message)) {
                    return $context->res->json(generateResponse(null, 400, 'Message is required'), 400, $headers);
                }
                
                // Simple AI response logic
                $response = '';
                $lowerMessage = strtolower($message);
                
                if (strpos($lowerMessage, 'hello') !== false || strpos($lowerMessage, 'hi') !== false) {
                    $response = "Hello! Welcome to Haven Space. I'm here to help you find the perfect room or manage your property. How can I assist you today?";
                } elseif (strpos($lowerMessage, 'room') !== false || strpos($lowerMessage, 'property') !== false) {
                    $response = "I can help you find available rooms! We have various properties with different amenities. Would you like me to show you available rooms in a specific area or price range?";
                } elseif (strpos($lowerMessage, 'book') !== false || strpos($lowerMessage, 'apply') !== false) {
                    $response = "Great! To book a room, you can browse our available properties and submit an application. I can guide you through the application process. Would you like to see available rooms first?";
                } elseif (strpos($lowerMessage, 'price') !== false || strpos($lowerMessage, 'cost') !== false || strpos($lowerMessage, 'budget') !== false) {
                    $response = "Our rooms range from budget-friendly options to premium accommodations. What's your preferred budget range? I can help you find rooms that fit your financial needs.";
                } elseif (strpos($lowerMessage, 'location') !== false || strpos($lowerMessage, 'area') !== false || strpos($lowerMessage, 'where') !== false) {
                    $response = "We have properties in various locations! Popular areas include downtown, university districts, and suburban neighborhoods. Which area interests you most?";
                } elseif (strpos($lowerMessage, 'amenities') !== false || strpos($lowerMessage, 'facilities') !== false) {
                    $response = "Our properties offer various amenities including WiFi, laundry facilities, parking, gym access, and more. What specific amenities are important to you?";
                } elseif (strpos($lowerMessage, 'help') !== false || strpos($lowerMessage, 'support') !== false) {
                    $response = "I'm here to help! I can assist with finding rooms, explaining the application process, answering questions about properties, or connecting you with our support team. What do you need help with?";
                } else {
                    $response = "Thank you for your message! I'm here to help with room searches, property information, and booking assistance. Could you please be more specific about what you're looking for?";
                }
                
                return $context->res->json(generateResponse([
                    'response' => $response,
                    'session_id' => $sessionId,
                    'user_id' => $userId,
                    'metadata' => [
                        'message_length' => strlen($message),
                        'response_type' => 'ai_generated'
                    ]
                ], 200, 'AI response generated'), 200, $headers);

            // Dashboard and stats endpoints
            case preg_match('#^/api/landlord/dashboard-stats\.php$#', $path):
                authenticateUser($client, $headers_in);
                $user = $account->get();
                
                // Get landlord's properties
                $properties = $databases->listDocuments($databaseId, $collections['properties'], [
                    Query::equal('landlord_id', $user['$id'])
                ]);
                
                // Get applications for landlord's properties
                $propertyIds = array_map(fn($p) => $p['$id'], $properties['documents']);
                $applications = $databases->listDocuments($databaseId, $collections['applications'], [
                    Query::equal('property_id', $propertyIds)
                ]);
                
                // Get payments
                $payments = $databases->listDocuments($databaseId, $collections['payments'], [
                    Query::equal('landlord_id', $user['$id'])
                ]);
                
                return $context->res->json(generateResponse([
                    'total_properties' => $properties['total'],
                    'total_applications' => $applications['total'],
                    'total_payments' => $payments['total'],
                    'monthly_revenue' => array_sum(array_map(fn($p) => $p['amount'] ?? 0, $payments['documents']))
                ]), 200, $headers);

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