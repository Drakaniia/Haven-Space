<?php
/**
 * Geocoding API Proxy
 * Provides reverse geocoding and address search using Nominatim (OpenStreetMap)
 * This acts as a proxy to avoid CORS issues and rate limiting on the client side
 */

// Include centralized CORS configuration
require_once __DIR__ . '/../cors.php';

header('Content-Type: application/json');

/**
 * GET /api/geocode/reverse.php?lat={lat}&lng={lng}
 * Reverse geocode coordinates to address
 */
if (isset($_GET['lat']) && isset($_GET['lng'])) {
    $lat = floatval($_GET['lat']);
    $lng = floatval($_GET['lng']);

    // Validate coordinates are within Philippines bounds
    if ($lat < 4.5 || $lat > 21.1 || $lng < 116.0 || $lng > 127.0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid coordinates. Location must be within the Philippines.'
        ]);
        exit;
    }

    // Call Nominatim API
    $url = "https://nominatim.openstreetmap.org/reverse?format=json&lat={$lat}&lon={$lng}&zoom=18&addressdetails=1";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'HavenSpace/1.0');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Accept-Language: en'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || !$response) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to geocode location. Please try again.'
        ]);
        exit;
    }

    $data = json_decode($response, true);

    echo json_encode([
        'success' => true,
        'data' => [
            'display_name' => $data['display_name'] ?? '',
            'address' => $data['address'] ?? [],
            'latitude' => $lat,
            'longitude' => $lng
        ]
    ]);
    exit;
}

/**
 * GET /api/geocode/search.php?q={query}
 * Search for addresses
 */
if (isset($_GET['q'])) {
    $query = trim($_GET['q']);

    if (strlen($query) < 3) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Search query must be at least 3 characters'
        ]);
        exit;
    }

    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 5;
    $countryCodes = 'ph'; // Default to Philippines

    // Call Nominatim search API
    $url = "https://nominatim.openstreetmap.org/search?format=json&q=" . urlencode($query) . 
           "&limit={$limit}&countrycodes={$countryCodes}&addressdetails=1";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'HavenSpace/1.0');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Accept-Language: en'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || !$response) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to search address. Please try again.'
        ]);
        exit;
    }

    $data = json_decode($response, true);

    $results = array_map(function($result) {
        return [
            'display_name' => $result['display_name'],
            'latitude' => floatval($result['lat']),
            'longitude' => floatval($result['lon']),
            'address' => $result['address'] ?? []
        ];
    }, $data);

    echo json_encode([
        'success' => true,
        'data' => $results
    ]);
    exit;
}

http_response_code(400);
echo json_encode([
    'success' => false,
    'error' => 'Invalid request. Provide either lat+lng for reverse geocoding or q for search.'
]);
