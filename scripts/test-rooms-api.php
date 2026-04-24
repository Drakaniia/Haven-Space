<?php
/**
 * Test the rooms API endpoints
 */

// Test configuration
$baseUrl = 'http://localhost:8000/api/landlord/rooms.php';
$testPropertyId = 4; // Using property ID from the test data

echo "=== TESTING ROOMS API ===\n\n";

// Test 1: Get rooms for a property (without authentication - should fail)
echo "Test 1: Get rooms without authentication (should fail)\n";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $baseUrl . '?property_id=' . $testPropertyId);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
echo "Response: $response\n\n";

// Note: For full testing, you would need to:
// 1. Create a test landlord user
// 2. Get an authentication token
// 3. Test all CRUD operations with proper authentication

echo "=== API ENDPOINT READY ===\n";
echo "The rooms API is now available at: $baseUrl\n";
echo "Supported methods:\n";
echo "- GET ?property_id=X (list rooms for property)\n";
echo "- GET ?id=X (get single room)\n";
echo "- POST (create new room)\n";
echo "- PUT ?id=X (update room)\n";
echo "- DELETE ?id=X (delete room)\n";
echo "\nNote: All endpoints require landlord authentication.\n";
?>