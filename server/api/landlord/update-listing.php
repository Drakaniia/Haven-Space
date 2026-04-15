<?php
/**
 * Landlord Update Listing API
 * PUT /api/landlord/listings/{id}
 *
 * Updates an existing property listing
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['error' => 'Method not allowed']);
}

$user = Middleware::authorize(['landlord']);
$landlordId = $user['user_id'];

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    $input = $_POST;
}

$propertyId = $input['id'] ?? null;

if (!$propertyId) {
    json_response(400, ['error' => 'Property ID is required']);
}

try {
    $pdo = Connection::getInstance()->getPdo();

    $stmt = $pdo->prepare("
        UPDATE properties 
        SET title = ?,
            description = ?,
            address = ?,
            latitude = ?,
            longitude = ?,
            price = ?,
            updated_at = NOW()
        WHERE id = ? AND landlord_id = ?
    ");

    $stmt->execute([
        $input['propertyName'],
        $input['propertyDescription'] ?? '',
        $input['propertyAddress'],
        !empty($input['propertyLatitude']) ? floatval($input['propertyLatitude']) : null,
        !empty($input['propertyLongitude']) ? floatval($input['propertyLongitude']) : null,
        floatval($input['propertyPrice']),
        $propertyId,
        $landlordId,
    ]);

    json_response(200, [
        'message' => 'Listing updated successfully',
        'data' => ['id' => $propertyId],
    ]);
} catch (PDOException $e) {
    error_log('Update listing error: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to update listing']);
}