<?php
/**
 * Landlord Rooms API
 * GET /api/landlord/rooms.php?property_id=X - Get all rooms for a property
 * GET /api/landlord/rooms.php?id=X - Get single room details
 * POST /api/landlord/rooms.php - Create a new room
 * PUT /api/landlord/rooms.php?id=X - Update an existing room
 * DELETE /api/landlord/rooms.php?id=X - Delete a room (soft delete)
 */

require_once __DIR__ . '/../cors.php';

if (!function_exists('json_response')) {
    require_once __DIR__ . '/../../src/Core/bootstrap.php';
    require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
}

require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

// Handle POST request - Create new room
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Authenticate user and authorize as landlord
    $user = Middleware::authorize(['landlord']);
    $landlordId = $user['user_id'];

    $input = json_decode(file_get_contents('php://input'), true);

    // Validate required fields
    if (!isset($input['property_id']) || !isset($input['room_number']) || !isset($input['price'])) {
        json_response(400, ['error' => 'Missing required fields: property_id, room_number, price']);
    }

    try {
        $pdo = Connection::getInstance()->getPdo();

        // Verify the property belongs to this landlord
        $propertyStmt = $pdo->prepare("
            SELECT id FROM properties 
            WHERE id = ? AND landlord_id = ? AND deleted_at IS NULL
        ");
        $propertyStmt->execute([$input['property_id'], $landlordId]);
        if (!$propertyStmt->fetch()) {
            json_response(403, ['error' => 'Property not found or access denied']);
        }

        // Check if room number already exists for this property
        $checkStmt = $pdo->prepare("
            SELECT id FROM rooms 
            WHERE property_id = ? AND room_number = ? AND deleted_at IS NULL
        ");
        $checkStmt->execute([$input['property_id'], $input['room_number']]);
        if ($checkStmt->fetch()) {
            json_response(400, ['error' => 'Room number already exists for this property']);
        }

        // Insert new room
        $stmt = $pdo->prepare("
            INSERT INTO rooms 
            (property_id, landlord_id, title, room_number, price, status, capacity, room_type, description, size, tenant_name, tenant_contact, lease_start, lease_end)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $title = "Room " . $input['room_number'];
        $status = $input['status'] ?? 'available';
        $capacity = $input['capacity'] ?? 1;
        $roomType = $capacity > 1 ? 'shared' : 'single';
        $description = $input['description'] ?? '';
        $size = isset($input['size']) && $input['size'] !== '' ? floatval($input['size']) : null;
        
        // Tenant information (only if status is occupied)
        $tenantName = ($status === 'occupied' && isset($input['tenant_name'])) ? $input['tenant_name'] : null;
        $tenantContact = ($status === 'occupied' && isset($input['tenant_contact'])) ? $input['tenant_contact'] : null;
        $leaseStart = ($status === 'occupied' && isset($input['lease_start'])) ? $input['lease_start'] : null;
        $leaseEnd = ($status === 'occupied' && isset($input['lease_end'])) ? $input['lease_end'] : null;

        $stmt->execute([
            $input['property_id'],
            $landlordId,
            $title,
            $input['room_number'],
            floatval($input['price']),
            $status,
            intval($capacity),
            $roomType,
            $description,
            $size,
            $tenantName,
            $tenantContact,
            $leaseStart,
            $leaseEnd
        ]);

        $roomId = $pdo->lastInsertId();

        json_response(201, [
            'success' => true,
            'data' => [
                'room_id' => $roomId,
                'message' => 'Room created successfully'
            ]
        ]);

    } catch (Exception $e) {
        error_log('Create room error: ' . $e->getMessage());
        error_log('Stack trace: ' . $e->getTraceAsString());
        json_response(500, ['error' => 'Failed to create room: ' . $e->getMessage()]);
    }
}

// Handle PUT request - Update existing room
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    // Authenticate user and authorize as landlord
    $user = Middleware::authorize(['landlord']);
    $landlordId = $user['user_id'];

    // Get room ID from query parameter
    $roomId = $_GET['id'] ?? null;
    
    if (!$roomId) {
        json_response(400, ['error' => 'Room ID is required']);
    }

    $input = json_decode(file_get_contents('php://input'), true);

    try {
        $pdo = Connection::getInstance()->getPdo();

        // Verify the room belongs to this landlord
        $checkStmt = $pdo->prepare("
            SELECT r.id, r.property_id, r.room_number 
            FROM rooms r
            JOIN properties p ON r.property_id = p.id
            WHERE r.id = ? AND p.landlord_id = ? AND r.deleted_at IS NULL
        ");
        $checkStmt->execute([$roomId, $landlordId]);
        $room = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$room) {
            json_response(404, ['error' => 'Room not found or access denied']);
        }

        // Check if room number conflicts with another room (if room_number is being changed)
        if (isset($input['room_number']) && $input['room_number'] !== $room['room_number']) {
            $conflictStmt = $pdo->prepare("
                SELECT id FROM rooms 
                WHERE property_id = ? AND room_number = ? AND id != ? AND deleted_at IS NULL
            ");
            $conflictStmt->execute([$room['property_id'], $input['room_number'], $roomId]);
            if ($conflictStmt->fetch()) {
                json_response(400, ['error' => 'Room number already exists for this property']);
            }
        }

        // Build update query dynamically based on provided fields
        $updateFields = [];
        $updateValues = [];

        if (isset($input['room_number'])) {
            $updateFields[] = 'room_number = ?';
            $updateValues[] = $input['room_number'];
            
            // Update title to match room number
            $updateFields[] = 'title = ?';
            $updateValues[] = "Room " . $input['room_number'];
        }

        if (isset($input['price'])) {
            $updateFields[] = 'price = ?';
            $updateValues[] = floatval($input['price']);
        }

        if (isset($input['status'])) {
            $updateFields[] = 'status = ?';
            $updateValues[] = $input['status'];
        }

        if (isset($input['capacity'])) {
            $updateFields[] = 'capacity = ?';
            $updateValues[] = intval($input['capacity']);
            
            // Update room_type based on capacity
            $updateFields[] = 'room_type = ?';
            $updateValues[] = intval($input['capacity']) > 1 ? 'shared' : 'single';
        }

        if (isset($input['description'])) {
            $updateFields[] = 'description = ?';
            $updateValues[] = $input['description'];
        }

        if (isset($input['size'])) {
            $updateFields[] = 'size = ?';
            $updateValues[] = $input['size'] !== '' ? floatval($input['size']) : null;
        }

        // Handle tenant information
        $status = $input['status'] ?? null;
        if ($status === 'occupied') {
            if (isset($input['tenant_name'])) {
                $updateFields[] = 'tenant_name = ?';
                $updateValues[] = $input['tenant_name'];
            }
            if (isset($input['tenant_contact'])) {
                $updateFields[] = 'tenant_contact = ?';
                $updateValues[] = $input['tenant_contact'];
            }
            if (isset($input['lease_start'])) {
                $updateFields[] = 'lease_start = ?';
                $updateValues[] = $input['lease_start'] ?: null;
            }
            if (isset($input['lease_end'])) {
                $updateFields[] = 'lease_end = ?';
                $updateValues[] = $input['lease_end'] ?: null;
            }
        } else if ($status && $status !== 'occupied') {
            // Clear tenant information if status is not occupied
            $updateFields[] = 'tenant_name = NULL';
            $updateFields[] = 'tenant_contact = NULL';
            $updateFields[] = 'lease_start = NULL';
            $updateFields[] = 'lease_end = NULL';
        }

        if (empty($updateFields)) {
            json_response(400, ['error' => 'No fields to update']);
        }

        // Add updated_at
        $updateFields[] = 'updated_at = NOW()';
        $updateValues[] = $roomId;

        $updateQuery = "UPDATE rooms SET " . implode(', ', $updateFields) . " WHERE id = ?";
        $updateStmt = $pdo->prepare($updateQuery);
        $updateStmt->execute($updateValues);

        json_response(200, [
            'success' => true,
            'message' => 'Room updated successfully'
        ]);

    } catch (Exception $e) {
        error_log('Update room error: ' . $e->getMessage());
        error_log('Stack trace: ' . $e->getTraceAsString());
        json_response(500, ['error' => 'Failed to update room: ' . $e->getMessage()]);
    }
}

// Handle DELETE request - Delete room
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    // Authenticate user and authorize as landlord
    $user = Middleware::authorize(['landlord']);
    $landlordId = $user['user_id'];

    // Get room ID from query parameter
    $roomId = $_GET['id'] ?? null;
    
    if (!$roomId) {
        json_response(400, ['error' => 'Room ID is required']);
    }

    try {
        $pdo = Connection::getInstance()->getPdo();

        // Verify the room belongs to this landlord
        $checkStmt = $pdo->prepare("
            SELECT r.id, r.room_number, r.status
            FROM rooms r
            JOIN properties p ON r.property_id = p.id
            WHERE r.id = ? AND p.landlord_id = ? AND r.deleted_at IS NULL
        ");
        $checkStmt->execute([$roomId, $landlordId]);
        $room = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$room) {
            json_response(404, ['error' => 'Room not found or access denied']);
        }

        // Check if room is occupied
        if ($room['status'] === 'occupied') {
            json_response(400, ['error' => 'Cannot delete occupied room. Please move tenant first.']);
        }

        // Soft delete the room
        $deleteStmt = $pdo->prepare("
            UPDATE rooms 
            SET deleted_at = NOW(), status = 'deleted'
            WHERE id = ?
        ");
        $deleteStmt->execute([$roomId]);

        json_response(200, [
            'success' => true,
            'message' => 'Room deleted successfully',
            'data' => [
                'room_id' => intval($roomId),
                'room_number' => $room['room_number']
            ]
        ]);

    } catch (Exception $e) {
        error_log('Delete room error: ' . $e->getMessage());
        error_log('Stack trace: ' . $e->getTraceAsString());
        json_response(500, ['error' => 'Failed to delete room: ' . $e->getMessage()]);
    }
}

// Handle GET request - List rooms or get single room
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Authenticate user and authorize as landlord
    $user = Middleware::authorize(['landlord']);
    $landlordId = $user['user_id'];

    try {
        $pdo = Connection::getInstance()->getPdo();

        // Check if requesting a single room
        $roomId = $_GET['id'] ?? null;
        $propertyId = $_GET['property_id'] ?? null;

        if ($roomId) {
            // Get single room with full details
            $stmt = $pdo->prepare("
                SELECT 
                    r.id,
                    r.property_id,
                    r.title,
                    r.room_number,
                    r.price,
                    r.status,
                    r.capacity,
                    r.room_type,
                    r.description,
                    r.size,
                    r.tenant_name,
                    r.tenant_contact,
                    r.lease_start,
                    r.lease_end,
                    r.created_at,
                    r.updated_at,
                    p.title as property_name
                FROM rooms r
                JOIN properties p ON r.property_id = p.id
                WHERE r.id = ? AND p.landlord_id = ? AND r.deleted_at IS NULL
            ");
            $stmt->execute([$roomId, $landlordId]);
            $room = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$room) {
                json_response(404, ['error' => 'Room not found']);
            }

            // Transform data for frontend
            $transformedRoom = [
                'id' => intval($room['id']),
                'property_id' => intval($room['property_id']),
                'property_name' => $room['property_name'],
                'room_number' => $room['room_number'],
                'title' => $room['title'],
                'price' => floatval($room['price']),
                'status' => $room['status'],
                'capacity' => intval($room['capacity']),
                'room_type' => $room['room_type'],
                'description' => $room['description'] ?? '',
                'size' => $room['size'] ? floatval($room['size']) : null,
                'tenant_name' => $room['tenant_name'],
                'tenant_contact' => $room['tenant_contact'],
                'lease_start' => $room['lease_start'],
                'lease_end' => $room['lease_end'],
                'created_at' => $room['created_at'],
                'updated_at' => $room['updated_at']
            ];

            json_response(200, ['data' => $transformedRoom]);

        } else if ($propertyId) {
            // Get all rooms for a specific property
            
            // First verify the property belongs to this landlord
            $propertyStmt = $pdo->prepare("
                SELECT id, title FROM properties 
                WHERE id = ? AND landlord_id = ? AND deleted_at IS NULL
            ");
            $propertyStmt->execute([$propertyId, $landlordId]);
            $property = $propertyStmt->fetch(PDO::FETCH_ASSOC);

            if (!$property) {
                json_response(404, ['error' => 'Property not found or access denied']);
            }

            // Get all rooms for this property
            $stmt = $pdo->prepare("
                SELECT 
                    r.id,
                    r.property_id,
                    r.title,
                    r.room_number,
                    r.price,
                    r.status,
                    r.capacity,
                    r.room_type,
                    r.description,
                    r.size,
                    r.tenant_name,
                    r.tenant_contact,
                    r.lease_start,
                    r.lease_end,
                    r.created_at,
                    r.updated_at
                FROM rooms r
                WHERE r.property_id = ? AND r.deleted_at IS NULL
                ORDER BY r.room_number ASC
            ");
            $stmt->execute([$propertyId]);
            $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Transform data for frontend
            $transformedRooms = array_map(function($room) {
                return [
                    'id' => intval($room['id']),
                    'property_id' => intval($room['property_id']),
                    'room_number' => $room['room_number'],
                    'title' => $room['title'],
                    'price' => floatval($room['price']),
                    'status' => $room['status'],
                    'capacity' => intval($room['capacity']),
                    'room_type' => $room['room_type'],
                    'description' => $room['description'] ?? '',
                    'size' => $room['size'] ? floatval($room['size']) : null,
                    'tenant_name' => $room['tenant_name'],
                    'tenant_contact' => $room['tenant_contact'],
                    'lease_start' => $room['lease_start'],
                    'lease_end' => $room['lease_end'],
                    'created_at' => $room['created_at'],
                    'updated_at' => $room['updated_at']
                ];
            }, $rooms);

            json_response(200, [
                'data' => [
                    'property' => [
                        'id' => intval($property['id']),
                        'name' => $property['title']
                    ],
                    'rooms' => $transformedRooms,
                    'total_count' => count($transformedRooms)
                ]
            ]);

        } else {
            json_response(400, ['error' => 'Either room_id or property_id parameter is required']);
        }

    } catch (Exception $e) {
        error_log('Landlord rooms API error: ' . $e->getMessage());
        error_log('Stack trace: ' . $e->getTraceAsString());
        json_response(500, ['error' => 'Failed to load rooms: ' . $e->getMessage()]);
    }
}

// Method not allowed
json_response(405, ['error' => 'Method not allowed']);
?>