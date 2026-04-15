<?php
/**
 * Landlord Create Listing API
 * POST /api/landlord/listings
 *
 * Creates a new property listing for the authenticated landlord
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['error' => 'Method not allowed']);
}

// Authenticate user and authorize as landlord
$user = Middleware::authorize(['landlord']);
$landlordId = $user['user_id'];

// Get input data
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    // Try FormData
    $input = $_POST;
}

// Validate required fields
$requiredFields = [
    'propertyName',
    'propertyType',
    'propertyDescription',
    'propertyPrice',
    'propertyDeposit',
    'propertyRooms',
    'propertyCapacity',
    'propertyAddress',
    'propertyCity',
    'propertyProvince',
];

$errors = [];
foreach ($requiredFields as $field) {
    if (empty($input[$field])) {
        $errors[$field] = ucfirst(str_replace('property', '', $field)) . ' is required';
    }
}

if (!empty($errors)) {
    json_response(400, ['errors' => $errors]);
}

try {
    $pdo = Connection::getInstance()->getPdo();

    // Begin transaction
    $pdo->beginTransaction();

    // Insert property
    $stmt = $pdo->prepare("
        INSERT INTO properties (
            landlord_id,
            title,
            description,
            address,
            latitude,
            longitude,
            price,
            status,
            listing_moderation_status,
            created_at,
            updated_at
        ) VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            'available',
            'published',
            NOW(),
            NOW()
        )
    ");

    $propertyName = trim($input['propertyName']);
    $propertyDescription = trim($input['propertyDescription']);
    $propertyAddress = trim($input['propertyAddress']);
    $latitude = !empty($input['propertyLatitude']) ? floatval($input['propertyLatitude']) : null;
    $longitude = !empty($input['propertyLongitude']) ? floatval($input['propertyLongitude']) : null;
    $price = floatval($input['propertyPrice']);

    $stmt->execute([
        $landlordId,
        $propertyName,
        $propertyDescription,
        $propertyAddress,
        $latitude,
        $longitude,
        $price,
    ]);

    $propertyId = $pdo->lastInsertId();

    // Insert property details if table exists
    try {
        $detailStmt = $pdo->prepare("
            INSERT INTO property_details (
                property_id,
                property_type,
                deposit,
                rooms_available,
                capacity_per_room,
                city,
                province,
                amenities,
                created_at,
                updated_at
            ) VALUES (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                NOW(),
                NOW()
            )
        ");

        // Process amenities as JSON
        $amenities = !empty($input['amenities']) ? json_encode($input['amenities']) : json_encode([]);

        $detailStmt->execute([
            $propertyId,
            $input['propertyType'],
            floatval($input['propertyDeposit']),
            intval($input['propertyRooms']),
            $input['propertyCapacity'],
            $input['propertyCity'],
            $input['propertyProvince'],
            $amenities,
        ]);
    } catch (PDOException $e) {
        // property_details table might not exist, continue without it
        error_log('property_details insert failed: ' . $e->getMessage());
    }

    // Handle photo uploads
    $uploadedPhotos = [];
    if (!empty($_FILES['propertyPhotos']) && !empty($_FILES['propertyPhotos']['name'][0])) {
        $uploadDir = __DIR__ . '/../../storage/properties/' . $propertyId . '/';

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $files = $_FILES['propertyPhotos'];
        $fileCount = count($files['name']);

        for ($i = 0; $i < $fileCount; $i++) {
            if ($files['error'][$i] === UPLOAD_ERR_OK) {
                $tmpName = $files['tmp_name'][$i];
                $originalName = $files['name'][$i];
                $ext = pathinfo($originalName, PATHINFO_EXTENSION);
                $newName = 'listing_' . ($i + 1) . '_' . time() . '.' . $ext;
                $targetPath = $uploadDir . $newName;

                if (move_uploaded_file($tmpName, $targetPath)) {
                    $uploadedPhotos[] = '/storage/properties/' . $propertyId . '/' . $newName;
                }
            }
        }
    }

    // Insert photos if any uploaded
    if (!empty($uploadedPhotos)) {
        $photoStmt = $pdo->prepare("
            INSERT INTO property_photos (
                property_id,
                photo_url,
                is_cover,
                sort_order,
                created_at
            ) VALUES (
                ?,
                ?,
                ?,
                ?,
                NOW()
            )
        ");

        foreach ($uploadedPhotos as $index => $photoUrl) {
            $photoStmt->execute([
                $propertyId,
                $photoUrl,
                $index === 0 ? 1 : 0,
                $index,
            ]);
        }
    }

    // Commit transaction
    $pdo->commit();

    json_response(201, [
        'message' => 'Listing created successfully',
        'data' => [
            'id' => $propertyId,
            'title' => $propertyName,
            'status' => 'available',
        ],
    ]);
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('Create listing error: ' . $e->getMessage());
    json_response(500, ['error' => 'Failed to create listing. Please try again.']);
}