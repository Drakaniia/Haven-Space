<?php

require(__DIR__ . '/vendor/autoload.php');

use Appwrite\Client;
use Appwrite\Services\TablesDB;
use Appwrite\Query;
use Appwrite\ID;

return function ($context) {
    // Initialize Appwrite client
    $client = new Client();
    $endpoint = getenv('APPWRITE_FUNCTION_ENDPOINT') ?: 'https://fra.cloud.appwrite.io/v1';
    $projectId = getenv('APPWRITE_FUNCTION_PROJECT_ID') ?: '69eae504002697b6749c';
    
    $client
        ->setEndpoint($endpoint)
        ->setProject($projectId)
        ->setKey($context->req->headers['x-appwrite-key'] ?? '');

    $tablesDB = new TablesDB($client);

    // Get request method and path
    $method = $context->req->method;
    $path = $context->req->path;
    
    // Set CORS headers
    $headers = [
        'Access-Control-Allow-Origin' => '*',
        'Access-Control-Allow-Methods' => 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Appwrite-Project, X-Appwrite-Key'
    ];

    // Handle preflight OPTIONS request
    if ($method === 'OPTIONS') {
        return $context->res->text('', 200, $headers);
    }

    try {
        // Route handling
        switch ($path) {
            case '/':
                return handleRoot($context, $headers);
            
            case '/health':
                return handleHealth($context, $headers);
            
            default:
                // Handle API routes
                if (strpos($path, '/api/') === 0) {
                    return handleApiRoutes($context, $tablesDB, $headers);
                }
                
                return $context->res->json([
                    'error' => 'Route not found',
                    'path' => $path
                ], 404, $headers);
        }
    } catch (Exception $e) {
        return $context->res->json([
            'error' => 'Internal server error',
            'message' => $e->getMessage()
        ], 500, $headers);
    }
};

function handleRoot($context, $headers) {
    return $context->res->json([
        'message' => 'Haven Space API',
        'version' => '1.0.0',
        'status' => 'active'
    ], 200, $headers);
}

function handleHealth($context, $headers) {
    return $context->res->json([
        'status' => 'healthy',
        'timestamp' => date('c')
    ], 200, $headers);
}

function handleApiRoutes($context, $tablesDB, $headers) {
    $path = $context->req->path;
    $method = $context->req->method;
    
    // Remove /api prefix
    $apiPath = substr($path, 4);
    
    // Example API routes
    switch ($apiPath) {
        case '/users':
            return handleUsers($context, $tablesDB, $headers);
        
        case '/properties':
            return handleProperties($context, $tablesDB, $headers);
        
        case '/applications':
            return handleApplications($context, $tablesDB, $headers);
        
        default:
            return $context->res->json([
                'error' => 'API endpoint not found',
                'path' => $apiPath
            ], 404, $headers);
    }
}

function handleUsers($context, $tablesDB, $headers) {
    $method = $context->req->method;
    $databaseId = getenv('DATABASE_ID') ?: '<DATABASE_ID>';
    $usersTableId = getenv('USERS_TABLE_ID') ?: '<USERS_TABLE_ID>';
    
    switch ($method) {
        case 'GET':
            // List users
            try {
                $users = $tablesDB->listRows(
                    databaseId: $databaseId,
                    tableId: $usersTableId
                );
                
                return $context->res->json([
                    'users' => $users['rows'],
                    'total' => $users['total']
                ], 200, $headers);
            } catch (Exception $e) {
                return $context->res->json([
                    'error' => 'Failed to fetch users',
                    'message' => $e->getMessage()
                ], 500, $headers);
            }
        
        case 'POST':
            // Create user
            try {
                $data = json_decode($context->req->body, true);
                
                $user = $tablesDB->createRow(
                    databaseId: $databaseId,
                    tableId: $usersTableId,
                    rowId: ID::unique(),
                    data: $data
                );
                
                return $context->res->json([
                    'message' => 'User created successfully',
                    'user' => $user
                ], 201, $headers);
            } catch (Exception $e) {
                return $context->res->json([
                    'error' => 'Failed to create user',
                    'message' => $e->getMessage()
                ], 500, $headers);
            }
        
        default:
            return $context->res->json([
                'error' => 'Method not allowed'
            ], 405, $headers);
    }
}

function handleProperties($context, $tablesDB, $headers) {
    $method = $context->req->method;
    $databaseId = getenv('DATABASE_ID') ?: '<DATABASE_ID>';
    $propertiesTableId = getenv('PROPERTIES_TABLE_ID') ?: '<PROPERTIES_TABLE_ID>';
    
    switch ($method) {
        case 'GET':
            // List properties
            try {
                $properties = $tablesDB->listRows(
                    databaseId: $databaseId,
                    tableId: $propertiesTableId
                );
                
                return $context->res->json([
                    'properties' => $properties['rows'],
                    'total' => $properties['total']
                ], 200, $headers);
            } catch (Exception $e) {
                return $context->res->json([
                    'error' => 'Failed to fetch properties',
                    'message' => $e->getMessage()
                ], 500, $headers);
            }
        
        case 'POST':
            // Create property
            try {
                $data = json_decode($context->req->body, true);
                
                $property = $tablesDB->createRow(
                    databaseId: $databaseId,
                    tableId: $propertiesTableId,
                    rowId: ID::unique(),
                    data: $data
                );
                
                return $context->res->json([
                    'message' => 'Property created successfully',
                    'property' => $property
                ], 201, $headers);
            } catch (Exception $e) {
                return $context->res->json([
                    'error' => 'Failed to create property',
                    'message' => $e->getMessage()
                ], 500, $headers);
            }
        
        default:
            return $context->res->json([
                'error' => 'Method not allowed'
            ], 405, $headers);
    }
}

function handleApplications($context, $tablesDB, $headers) {
    $method = $context->req->method;
    $databaseId = getenv('DATABASE_ID') ?: '<DATABASE_ID>';
    $applicationsTableId = getenv('APPLICATIONS_TABLE_ID') ?: '<APPLICATIONS_TABLE_ID>';
    
    switch ($method) {
        case 'GET':
            // List applications
            try {
                $applications = $tablesDB->listRows(
                    databaseId: $databaseId,
                    tableId: $applicationsTableId
                );
                
                return $context->res->json([
                    'applications' => $applications['rows'],
                    'total' => $applications['total']
                ], 200, $headers);
            } catch (Exception $e) {
                return $context->res->json([
                    'error' => 'Failed to fetch applications',
                    'message' => $e->getMessage()
                ], 500, $headers);
            }
        
        case 'POST':
            // Create application
            try {
                $data = json_decode($context->req->body, true);
                
                $application = $tablesDB->createRow(
                    databaseId: $databaseId,
                    tableId: $applicationsTableId,
                    rowId: ID::unique(),
                    data: $data
                );
                
                return $context->res->json([
                    'message' => 'Application created successfully',
                    'application' => $application
                ], 201, $headers);
            } catch (Exception $e) {
                return $context->res->json([
                    'error' => 'Failed to create application',
                    'message' => $e->getMessage()
                ], 500, $headers);
            }
        
        default:
            return $context->res->json([
                'error' => 'Method not allowed'
            ], 405, $headers);
    }
}