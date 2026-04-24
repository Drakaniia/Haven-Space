<?php
/**
 * Landlord Listings API Router
 * 
 * This file routes requests to the appropriate listing endpoints:
 * - POST /api/landlord/listings: Create new listing
 * - GET /api/landlord/listings: Get landlord's listings  
 * - POST /api/landlord/listings/{id}/photos: Upload property photos
 * - POST /api/landlord/listings/{id}/room-photos: Upload room photos
 */

require_once __DIR__ . '/../cors.php';

// Parse the request URI to determine routing
$uri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

// Remove query string if present
$uri = strtok($uri, '?');

// Route based on URI pattern and HTTP method
if ($method === 'POST' && preg_match('#/api/landlord/listings/(\d+)/photos$#', $uri)) {
    // Property photos upload
    require_once __DIR__ . '/listing-photos.php';
} elseif ($method === 'POST' && preg_match('#/api/landlord/listings/(\d+)/room-photos$#', $uri)) {
    // Room photos upload
    require_once __DIR__ . '/room-photos.php';
} elseif ($method === 'POST' && $uri === '/api/landlord/listings') {
    // Create new listing
    require_once __DIR__ . '/create-listing.php';
} elseif ($method === 'GET' && $uri === '/api/landlord/listings') {
    // Get listings
    require_once __DIR__ . '/properties.php';
} else {
    // Method not allowed or invalid route
    if (!function_exists('json_response')) {
        require_once __DIR__ . '/../../src/Core/bootstrap.php';
        require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
    }
    json_response(405, ['error' => 'Method not allowed or invalid route']);
}