<?php

require_once __DIR__ . '/../vendor/autoload.php';

use Appwrite\Client;
use Appwrite\Services\Databases;
use Appwrite\Services\Users;

return function ($context) {
    // Get request data
    $req = $context->req;
    $res = $context->res;
    
    // Initialize Appwrite client with server SDK
    $client = new Client();
    $client
        ->setEndpoint($context->env['APPWRITE_FUNCTION_ENDPOINT'])
        ->setProject($context->env['APPWRITE_FUNCTION_PROJECT_ID'])
        ->setKey($context->env['APPWRITE_FUNCTION_API_KEY']);
    
    $databases = new Databases($client);
    $users = new Users($client);
    
    // Parse the request path and method
    $path = $req->path ?? '/';
    $method = $req->method ?? 'GET';
    
    // Basic routing
    try {
        switch ($path) {
            case '/health':
                return $res->json(['status' => 'healthy', 'timestamp' => date('c')]);
                
            case '/users':
                if ($method === 'GET') {
                    $usersList = $users->list();
                    return $res->json($usersList);
                }
                break;
                
            case '/properties':
                if ($method === 'GET') {
                    $properties = $databases->listDocuments(
                        $context->env['APPWRITE_DATABASE_ID'],
                        'properties' // collection ID
                    );
                    return $res->json($properties);
                } elseif ($method === 'POST') {
                    $data = json_decode($req->body, true);
                    $property = $databases->createDocument(
                        $context->env['APPWRITE_DATABASE_ID'],
                        'properties',
                        'unique()',
                        $data
                    );
                    return $res->json($property);
                }
                break;
                
            default:
                return $res->json(['error' => 'Route not found'], 404);
        }
    } catch (Exception $e) {
        return $res->json(['error' => $e->getMessage()], 500);
    }
    
    return $res->json(['error' => 'Method not allowed'], 405);
};