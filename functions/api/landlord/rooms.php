<?php
/**
 * Landlord Rooms API
 *
 * GET    /api/landlord/rooms?propertyId=X          – list all rooms for a property
 * GET    /api/landlord/rooms?propertyId=X&id=Y     – get single room
 * POST   /api/landlord/rooms                       – create a room
 * PUT    /api/landlord/rooms?id=Y                  – update a room
 * DELETE /api/landlord/rooms?id=Y                  – soft-delete a room
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

$user       = Middleware::authorize(['landlord']);
$landlordId = $user['user_id'];
$method     = $_SERVER['REQUEST_METHOD'];

$pdo = Connection::getInstance()->getPdo();

/* ------------------------------------------------------------------ */
/* GET – list rooms for a property, or fetch a single room             */
/* ------------------------------------------------------------------ */
if ($method === 'GET') {
    $propertyId = isset($_GET['propertyId']) ? intval($_GET['propertyId']) : null;
    $roomId     = isset($_GET['id'])         ? intval($_GET['id'])         : null;

    if (!$propertyId) {
        json_response(400, ['error' => 'propertyId is required']);
    }

    // Verify property belongs to this landlord (or allow admin access to any property)
    $propStmt = $pdo->prepare(
        "SELECT id, title, status FROM properties
         WHERE id = ? AND (landlord_id = ? OR ? = 'admin') AND deleted_at IS NULL"
    );
    $propStmt->execute([$propertyId, $landlordId, $user['role'] ?? '']);
    $property = $propStmt->fetch(PDO::FETCH_ASSOC);

    if (!$property) {
        json_response(404, ['error' => 'Property not found or access denied']);
    }

    if ($roomId) {
        // Single room
        $stmt = $pdo->prepare(
            "SELECT r.*
             FROM rooms r
             WHERE r.id = ? AND r.property_id = ? AND (r.landlord_id = ? OR ? = 'admin') AND r.deleted_at IS NULL"
        );
        $stmt->execute([$roomId, $propertyId, $landlordId, $user['role'] ?? '']);
        $room = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$room) {
            json_response(404, ['error' => 'Room not found']);
        }

        json_response(200, ['data' => formatRoom($room)]);
    }

    // All rooms for the property
    $stmt = $pdo->prepare(
        "SELECT r.*
         FROM rooms r
         WHERE r.property_id = ? AND (r.landlord_id = ? OR ? = 'admin') AND r.deleted_at IS NULL
         ORDER BY r.room_number ASC, r.id ASC"
    );
    $stmt->execute([$propertyId, $landlordId, $user['role'] ?? '']);
    $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Property summary counts
    $totalRooms    = count($rooms);
    $occupiedRooms = 0;
    foreach ($rooms as $r) {
        if ($r['status'] === 'occupied') $occupiedRooms++;
    }

    json_response(200, [
        'data' => [
            'property' => [
                'id'             => intval($property['id']),
                'name'           => $property['title'],
                'status'         => $property['status'],
                'total_rooms'    => $totalRooms,
                'occupied_rooms' => $occupiedRooms,
            ],
            'rooms' => array_map('formatRoom', $rooms),
        ],
    ]);
}

/* ------------------------------------------------------------------ */
/* POST – create a new room                                            */
/* ------------------------------------------------------------------ */
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];

    $propertyId = isset($input['property_id']) ? intval($input['property_id']) : null;
    if (!$propertyId) {
        json_response(400, ['error' => 'property_id is required']);
    }

    // Verify ownership
    $propStmt = $pdo->prepare(
        "SELECT id FROM properties WHERE id = ? AND landlord_id = ? AND deleted_at IS NULL"
    );
    $propStmt->execute([$propertyId, $landlordId]);
    if (!$propStmt->fetch()) {
        json_response(404, ['error' => 'Property not found or access denied']);
    }

    // Validate required fields
    if (empty($input['room_number'])) {
        json_response(400, ['error' => 'room_number is required']);
    }
    if (!isset($input['price']) || $input['price'] === '') {
        json_response(400, ['error' => 'price is required']);
    }

    // Check for duplicate room number within the property
    $dupStmt = $pdo->prepare(
        "SELECT id FROM rooms WHERE property_id = ? AND room_number = ? AND deleted_at IS NULL"
    );
    $dupStmt->execute([$propertyId, $input['room_number']]);
    if ($dupStmt->fetch()) {
        json_response(409, ['error' => 'A room with this number already exists in this property']);
    }

    $status      = in_array($input['status'] ?? '', ['available', 'occupied', 'maintenance'])
                   ? $input['status'] : 'available';
    $capacity    = isset($input['capacity'])    ? intval($input['capacity'])    : 1;
    $size        = isset($input['size'])        ? floatval($input['size'])      : null;
    $description = $input['description']        ?? null;

    try {
        $stmt = $pdo->prepare(
            "INSERT INTO rooms
             (property_id, landlord_id, room_number, price, status, capacity, size, description, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())"
        );
        $stmt->execute([
            $propertyId,
            $landlordId,
            $input['room_number'],
            floatval($input['price']),
            $status,
            $capacity,
            $size,
            $description,
        ]);
        $newId = intval($pdo->lastInsertId());

        // Fetch the newly created room to return it
        $fetchStmt = $pdo->prepare("SELECT * FROM rooms WHERE id = ?");
        $fetchStmt->execute([$newId]);
        $newRoom = $fetchStmt->fetch(PDO::FETCH_ASSOC);

        json_response(201, [
            'success' => true,
            'message' => 'Room created successfully',
            'data'    => formatRoom($newRoom),
        ]);
    } catch (Exception $e) {
        error_log('Create room error: ' . $e->getMessage());
        json_response(500, ['error' => 'Failed to create room: ' . $e->getMessage()]);
    }
}

/* ------------------------------------------------------------------ */
/* PUT – update an existing room                                       */
/* ------------------------------------------------------------------ */
if ($method === 'PUT') {
    $roomId = isset($_GET['id']) ? intval($_GET['id']) : null;
    $input  = json_decode(file_get_contents('php://input'), true) ?: [];

    // Also accept id from body
    if (!$roomId && isset($input['id'])) {
        $roomId = intval($input['id']);
    }

    if (!$roomId) {
        json_response(400, ['error' => 'Room id is required']);
    }

    // Verify room belongs to this landlord
    $checkStmt = $pdo->prepare(
        "SELECT r.id, r.property_id, r.room_number FROM rooms r
         WHERE r.id = ? AND r.landlord_id = ? AND r.deleted_at IS NULL"
    );
    $checkStmt->execute([$roomId, $landlordId]);
    $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

    if (!$existing) {
        json_response(404, ['error' => 'Room not found or access denied']);
    }

    // Check duplicate room number (if changing it)
    if (isset($input['room_number']) && $input['room_number'] !== $existing['room_number']) {
        $dupStmt = $pdo->prepare(
            "SELECT id FROM rooms
             WHERE property_id = ? AND room_number = ? AND id != ? AND deleted_at IS NULL"
        );
        $dupStmt->execute([$existing['property_id'], $input['room_number'], $roomId]);
        if ($dupStmt->fetch()) {
            json_response(409, ['error' => 'A room with this number already exists in this property']);
        }
    }

    // Build dynamic SET clause from provided fields
    $allowed = ['room_number', 'price', 'status', 'capacity', 'size', 'description'];
    $sets    = ['updated_at = NOW()'];
    $params  = [];

    foreach ($allowed as $field) {
        if (array_key_exists($field, $input)) {
            $sets[]   = "$field = ?";
            $params[] = $field === 'price'    ? floatval($input[$field])
                      : ($field === 'capacity' ? intval($input[$field])
                      : $input[$field]);
        }
    }

    $params[] = $roomId;

    try {
        $stmt = $pdo->prepare("UPDATE rooms SET " . implode(', ', $sets) . " WHERE id = ?");
        $stmt->execute($params);

        // Return updated room
        $fetchStmt = $pdo->prepare(
            "SELECT r.*
             FROM rooms r
             WHERE r.id = ?"
        );
        $fetchStmt->execute([$roomId]);
        $updatedRoom = $fetchStmt->fetch(PDO::FETCH_ASSOC);

        json_response(200, [
            'success' => true,
            'message' => 'Room updated successfully',
            'data'    => formatRoom($updatedRoom),
        ]);
    } catch (Exception $e) {
        error_log('Update room error: ' . $e->getMessage());
        json_response(500, ['error' => 'Failed to update room: ' . $e->getMessage()]);
    }
}

/* ------------------------------------------------------------------ */
/* DELETE – soft-delete a room                                         */
/* ------------------------------------------------------------------ */
if ($method === 'DELETE') {
    $roomId = isset($_GET['id']) ? intval($_GET['id']) : null;

    if (!$roomId) {
        json_response(400, ['error' => 'Room id is required']);
    }

    // Verify ownership
    $checkStmt = $pdo->prepare(
        "SELECT id FROM rooms WHERE id = ? AND landlord_id = ? AND deleted_at IS NULL"
    );
    $checkStmt->execute([$roomId, $landlordId]);
    if (!$checkStmt->fetch()) {
        json_response(404, ['error' => 'Room not found or access denied']);
    }

    try {
        $stmt = $pdo->prepare(
            "UPDATE rooms SET deleted_at = NOW(), status = 'deleted' WHERE id = ?"
        );
        $stmt->execute([$roomId]);

        json_response(200, [
            'success' => true,
            'message' => 'Room deleted successfully',
        ]);
    } catch (Exception $e) {
        error_log('Delete room error: ' . $e->getMessage());
        json_response(500, ['error' => 'Failed to delete room: ' . $e->getMessage()]);
    }
}

json_response(405, ['error' => 'Method not allowed']);

/* ------------------------------------------------------------------ */
/* Helper – normalise a rooms row for the frontend                     */
/* ------------------------------------------------------------------ */
function formatRoom(array $room): array {
    // Get PDO instance for fetching photos
    $pdo = Connection::getInstance()->getPdo();
    
    // Fetch room photos
    $photosStmt = $pdo->prepare(
        "SELECT id, photo_url, is_cover, display_order 
         FROM room_photos 
         WHERE room_id = ? 
         ORDER BY is_cover DESC, display_order ASC"
    );
    $photosStmt->execute([intval($room['id'])]);
    $photos = $photosStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get cover photo or first photo
    $coverPhoto = null;
    if (!empty($photos)) {
        foreach ($photos as $photo) {
            if ($photo['is_cover']) {
                $coverPhoto = $photo['photo_url'];
                break;
            }
        }
        if (!$coverPhoto) {
            $coverPhoto = $photos[0]['photo_url'];
        }
    }
    
    return [
        'id'          => intval($room['id']),
        'property_id' => intval($room['property_id']),
        'room_number' => $room['room_number'] ?? '',
        'price'       => floatval($room['price']),
        'status'      => $room['status'] ?? 'available',
        'capacity'    => intval($room['capacity'] ?? 1),
        'size'        => $room['size'] ? floatval($room['size']) : null,
        'description' => $room['description'] ?? '',
        'cover_photo' => $coverPhoto,
        'photos'      => array_map(function($p) {
            return [
                'id'            => intval($p['id']),
                'photo_url'     => $p['photo_url'],
                'is_cover'      => (bool)$p['is_cover'],
                'display_order' => intval($p['display_order'])
            ];
        }, $photos),
        'tenant'      => null, // No tenant info for now since leases table doesn't exist
        'created_at'  => $room['created_at'] ?? null,
        'updated_at'  => $room['updated_at'] ?? null,
    ];
}
