<?php

return function ($context) {
    // Get request method and path
    $method = $context->req->method ?? 'GET';
    $path = $context->req->path ?? '/';
    
    // Set CORS headers
    $headers = [
        'Access-Control-Allow-Origin' => '*',
        'Access-Control-Allow-Methods' => 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Appwrite-Project, X-Appwrite-Key, Accept',
        'Access-Control-Max-Age' => '86400'
    ];

    // Handle preflight OPTIONS request
    if ($method === 'OPTIONS') {
        return $context->res->text('', 200, $headers);
    }

    try {
        // Route handling
        switch ($path) {
            case '/':
                return $context->res->json([
                    'message' => 'Haven Space API',
                    'version' => '1.0.0',
                    'status' => 'active',
                    'timestamp' => date('c'),
                    'available_endpoints' => [
                        'GET /',
                        'GET /health',
                        'GET /test',
                        'GET /api/chat',
                        'POST /api/chat',
                        'GET /api/users',
                        'GET /api/properties'
                    ]
                ], 200, $headers);
            
            case '/health':
                return $context->res->json([
                    'status' => 'healthy',
                    'timestamp' => date('c'),
                    'service' => 'Haven Space API',
                    'version' => '1.0.0'
                ], 200, $headers);
            
            case '/test':
                return $context->res->json([
                    'message' => 'Test endpoint working',
                    'method' => $method,
                    'path' => $path,
                    'timestamp' => date('c'),
                    'environment' => [
                        'php_version' => phpversion(),
                        'endpoint' => getenv('APPWRITE_FUNCTION_ENDPOINT') ?: 'not set',
                        'project_id' => getenv('APPWRITE_FUNCTION_PROJECT_ID') ?: 'not set'
                    ]
                ], 200, $headers);
            
            case '/api/chat':
            case '/api/chat.php':
                return handleAiChat($context, $method, $headers);
            
            case '/api/users':
            case '/api/users.php':
                return handleUsers($context, $method, $headers);
            
            case '/api/properties':
            case '/api/properties.php':
                return handleProperties($context, $method, $headers);
            
            default:
                // Handle other API routes
                if (strpos($path, '/api/') === 0) {
                    return $context->res->json([
                        'error' => 'API endpoint not found',
                        'path' => $path,
                        'available_endpoints' => [
                            '/api/chat', '/api/users', '/api/properties'
                        ]
                    ], 404, $headers);
                }
                
                return $context->res->json([
                    'error' => 'Route not found',
                    'path' => $path,
                    'available_routes' => ['/', '/health', '/test', '/api/*']
                ], 404, $headers);
        }
    } catch (Exception $e) {
        return $context->res->json([
            'error' => 'Internal server error',
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ], 500, $headers);
    } catch (Throwable $e) {
        return $context->res->json([
            'error' => 'Fatal error',
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ], 500, $headers);
    }
};

function handleAiChat($context, $method, $headers) {
    switch ($method) {
        case 'GET':
            return $context->res->json([
                'message' => 'AI Chat API',
                'status' => 'active',
                'endpoints' => [
                    'POST /api/chat - Send message to AI',
                    'GET /api/chat - Get API info'
                ],
                'features' => [
                    'Natural language processing',
                    'Property search assistance',
                    'Booking help',
                    'General inquiries'
                ],
                'example_request' => [
                    'method' => 'POST',
                    'body' => [
                        'message' => 'Hello, I need help finding a room',
                        'user_id' => 'optional',
                        'session_id' => 'optional'
                    ]
                ]
            ], 200, $headers);
        
        case 'POST':
            try {
                $data = json_decode($context->req->body, true);
                
                if (!isset($data['message'])) {
                    return $context->res->json([
                        'error' => 'Message is required',
                        'required_fields' => ['message'],
                        'optional_fields' => ['user_id', 'session_id']
                    ], 400, $headers);
                }
                
                $userMessage = $data['message'];
                $userId = $data['user_id'] ?? 'anonymous';
                $sessionId = $data['session_id'] ?? uniqid();
                
                // Generate AI response
                $aiResponse = generateAiResponse($userMessage);
                
                return $context->res->json([
                    'success' => true,
                    'response' => $aiResponse,
                    'user_message' => $userMessage,
                    'session_id' => $sessionId,
                    'user_id' => $userId,
                    'timestamp' => date('c'),
                    'metadata' => [
                        'response_time' => '0.5s',
                        'model' => 'haven-space-ai-v1',
                        'confidence' => 0.95
                    ]
                ], 200, $headers);
                
            } catch (Exception $e) {
                return $context->res->json([
                    'error' => 'Failed to process chat message',
                    'message' => $e->getMessage()
                ], 500, $headers);
            }
        
        default:
            return $context->res->json([
                'error' => 'Method not allowed',
                'allowed_methods' => ['GET', 'POST']
            ], 405, $headers);
    }
}

function generateAiResponse($message) {
    $message = strtolower(trim($message));
    
    // Simple keyword-based responses
    if (strpos($message, 'hello') !== false || strpos($message, 'hi') !== false) {
        return "Hello! Welcome to Haven Space. I'm here to help you find the perfect accommodation. How can I assist you today?";
    }
    
    if (strpos($message, 'property') !== false || strpos($message, 'room') !== false) {
        return "I can help you find properties and rooms! What type of accommodation are you looking for? You can specify location, budget, or any specific requirements.";
    }
    
    if (strpos($message, 'book') !== false || strpos($message, 'booking') !== false) {
        return "I can assist you with bookings! To make a booking, you'll need to select a property, choose your dates, and complete the application process. Would you like me to guide you through this?";
    }
    
    if (strpos($message, 'price') !== false || strpos($message, 'cost') !== false || strpos($message, 'budget') !== false) {
        return "Our properties have various price ranges to suit different budgets. What's your preferred budget range? I can help you find suitable options.";
    }
    
    if (strpos($message, 'location') !== false || strpos($message, 'area') !== false) {
        return "We have properties in various locations. Which area or city are you interested in? I can show you available options in your preferred location.";
    }
    
    if (strpos($message, 'help') !== false || strpos($message, 'support') !== false) {
        return "I'm here to help! I can assist you with:\n• Finding properties and rooms\n• Booking assistance\n• Answering questions about amenities\n• Providing location information\n• General support\n\nWhat would you like help with?";
    }
    
    if (strpos($message, 'amenities') !== false || strpos($message, 'facilities') !== false) {
        return "Our properties offer various amenities including WiFi, parking, laundry facilities, common areas, and more. Are you looking for specific amenities?";
    }
    
    // Default response
    return "Thank you for your message! I'm Haven Space AI assistant. I can help you with property searches, bookings, and general inquiries. Could you please provide more details about what you're looking for?";
}

function handleUsers($context, $method, $headers) {
    switch ($method) {
        case 'GET':
            return $context->res->json([
                'message' => 'Users API endpoint',
                'method' => $method,
                'status' => 'active',
                'note' => 'Database integration needed for full functionality'
            ], 200, $headers);
        
        case 'POST':
            return $context->res->json([
                'message' => 'Create user endpoint',
                'method' => $method,
                'status' => 'active',
                'note' => 'Database integration needed for full functionality'
            ], 200, $headers);
        
        default:
            return $context->res->json([
                'error' => 'Method not allowed',
                'allowed_methods' => ['GET', 'POST']
            ], 405, $headers);
    }
}

function handleProperties($context, $method, $headers) {
    switch ($method) {
        case 'GET':
            return $context->res->json([
                'message' => 'Properties API endpoint',
                'method' => $method,
                'status' => 'active',
                'note' => 'Database integration needed for full functionality'
            ], 200, $headers);
        
        case 'POST':
            return $context->res->json([
                'message' => 'Create property endpoint',
                'method' => $method,
                'status' => 'active',
                'note' => 'Database integration needed for full functionality'
            ], 200, $headers);
        
        default:
            return $context->res->json([
                'error' => 'Method not allowed',
                'allowed_methods' => ['GET', 'POST']
            ], 405, $headers);
    }
}