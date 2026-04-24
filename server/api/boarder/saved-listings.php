<?php

/**
 * Saved Listings API Endpoints
 * Handles saving, retrieving, and removing saved property listings for boarders
 */

require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Database;

/**
 * Get all saved listings for the authenticated boarder
 */
function getSavedListings(): void
{
    try {
        $user = Middleware::authenticate();
        
        if ($user['role'] !== 'boarder') {
            json_response(403, ['error' => 'Access denied. Boarders only.']);
            return;
        }

        $db = Database::getInstance();
        
        // Get saved listings with property and room details
        $query = "
            SELECT 
                sl.id as saved_listing_id,
                sl.saved_at,
                p.id as property_id,
                p.title as property_title,
                p.description as property_description,
                a.address_line_1 as address,
                a.latitude,
                a.longitude,
                p.price as property_price,
                p.status as property_status,
                r.id as room_id,
                r.title as room_title,
                r.price as room_price,
                r.status as room_status,
                CONCAT(u.first_name, ' ', u.last_name) as landlord_name,
                u.email as landlord_email
            FROM saved_listings sl
            INNER JOIN properties p ON sl.property_id = p.id
            INNER JOIN addresses a ON p.address_id = a.id
            INNER JOIN users u ON p.landlord_id = u.id
            LEFT JOIN rooms r ON sl.room_id = r.id
            WHERE sl.boarder_id = ? 
                AND sl.deleted_at IS NULL
                AND p.deleted_at IS NULL
                AND p.status != 'hidden'
                AND p.moderation_status = 'published'
            ORDER BY sl.saved_at DESC
        ";
        
        $stmt = $db->prepare($query);
        $stmt->execute([$user['user_id']]);
        $savedListings = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format the response
        $formattedListings = array_map(function($listing) {
            return [
                'id' => (int)$listing['saved_listing_id'],
                'saved_at' => $listing['saved_at'],
                'property' => [
                    'id' => (int)$listing['property_id'],
                    'title' => $listing['property_title'],
                    'description' => $listing['property_description'],
                    'address' => $listing['address'],
                    'latitude' => $listing['latitude'] ? (float)$listing['latitude'] : null,
                    'longitude' => $listing['longitude'] ? (float)$listing['longitude'] : null,
                    'price' => (float)$listing['property_price'],
                    'status' => $listing['property_status'],
                    'landlord' => [
                        'name' => $listing['landlord_name'],
                        'email' => $listing['landlord_email']
                    ]
                ],
                'room' => $listing['room_id'] ? [
                    'id' => (int)$listing['room_id'],
                    'title' => $listing['room_title'],
                    'price' => (float)$listing['room_price'],
                    'status' => $listing['room_status']
                ] : null
            ];
        }, $savedListings);
        
        json_response(200, [
            'success' => true,
            'data' => $formattedListings,
            'count' => count($formattedListings)
        ]);
        
    } catch (Exception $e) {
        error_log("Error getting saved listings: " . $e->getMessage());
        json_response(500, ['error' => 'Failed to retrieve saved listings']);
    }
}

/**
 * Save a property listing
 */
function saveProperty(): void
{
    try {
        $user = Middleware::authenticate();
        
        if ($user['role'] !== 'boarder') {
            json_response(403, ['error' => 'Access denied. Boarders only.']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['property_id'])) {
            json_response(400, ['error' => 'Property ID is required']);
            return;
        }
        
        $propertyId = (int)$input['property_id'];
        $roomId = isset($input['room_id']) ? (int)$input['room_id'] : null;
        
        $db = Database::getInstance();
        
        // Verify property exists and is available
        $propertyQuery = "
            SELECT id, title, status, moderation_status 
            FROM properties 
            WHERE id = ? AND deleted_at IS NULL
        ";
        $stmt = $db->prepare($propertyQuery);
        $stmt->execute([$propertyId]);
        $property = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$property) {
            json_response(404, ['error' => 'Property not found']);
            return;
        }
        
        if ($property['status'] === 'hidden' || $property['moderation_status'] !== 'published') {
            json_response(400, ['error' => 'Property is not available for saving']);
            return;
        }
        
        // Verify room exists if room_id is provided
        if ($roomId) {
            $roomQuery = "
                SELECT id, title, status 
                FROM rooms 
                WHERE id = ? AND property_id = ?
            ";
            $stmt = $db->prepare($roomQuery);
            $stmt->execute([$roomId, $propertyId]);
            $room = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$room) {
                json_response(404, ['error' => 'Room not found']);
                return;
            }
        }
        
        // Check if already saved (handle unique constraint)
        $checkQuery = "
            SELECT id FROM saved_listings 
            WHERE boarder_id = ? AND property_id = ? AND deleted_at IS NULL
        ";
        $stmt = $db->prepare($checkQuery);
        $stmt->execute([$user['user_id'], $propertyId]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existing) {
            json_response(409, ['error' => 'Property already saved']);
            return;
        }
        
        // Save the listing
        $insertQuery = "
            INSERT INTO saved_listings (boarder_id, property_id, room_id, saved_at)
            VALUES (?, ?, ?, NOW())
        ";
        $stmt = $db->prepare($insertQuery);
        $stmt->execute([$user['user_id'], $propertyId, $roomId]);
        
        $savedListingId = $db->lastInsertId();
        
        json_response(201, [
            'success' => true,
            'message' => 'Property saved successfully',
            'data' => [
                'id' => (int)$savedListingId,
                'property_id' => $propertyId,
                'room_id' => $roomId,
                'saved_at' => date('Y-m-d H:i:s')
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Error saving property: " . $e->getMessage());
        json_response(500, ['error' => 'Failed to save property']);
    }
}

/**
 * Remove a saved property listing
 */
function removeSavedProperty(): void
{
    try {
        $user = Middleware::authenticate();
        
        if ($user['role'] !== 'boarder') {
            json_response(403, ['error' => 'Access denied. Boarders only.']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['property_id'])) {
            json_response(400, ['error' => 'Property ID is required']);
            return;
        }
        
        $propertyId = (int)$input['property_id'];
        
        $db = Database::getInstance();
        
        // Check if the saved listing exists
        $checkQuery = "
            SELECT id FROM saved_listings 
            WHERE boarder_id = ? AND property_id = ? AND deleted_at IS NULL
        ";
        $stmt = $db->prepare($checkQuery);
        $stmt->execute([$user['user_id'], $propertyId]);
        $savedListing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$savedListing) {
            json_response(404, ['error' => 'Saved listing not found']);
            return;
        }
        
        // Soft delete the saved listing
        $deleteQuery = "
            UPDATE saved_listings 
            SET deleted_at = NOW() 
            WHERE boarder_id = ? AND property_id = ? AND deleted_at IS NULL
        ";
        $stmt = $db->prepare($deleteQuery);
        $stmt->execute([$user['user_id'], $propertyId]);
        
        json_response(200, [
            'success' => true,
            'message' => 'Property removed from saved listings'
        ]);
        
    } catch (Exception $e) {
        error_log("Error removing saved property: " . $e->getMessage());
        json_response(500, ['error' => 'Failed to remove saved property']);
    }
}

/**
 * Check if a property is saved by the current user
 */
function checkSavedStatus(): void
{
    try {
        $user = Middleware::authenticate();
        
        if ($user['role'] !== 'boarder') {
            json_response(403, ['error' => 'Access denied. Boarders only.']);
            return;
        }

        $propertyId = $_GET['property_id'] ?? null;
        
        if (!$propertyId) {
            json_response(400, ['error' => 'Property ID is required']);
            return;
        }
        
        $propertyId = (int)$propertyId;
        
        $db = Database::getInstance();
        
        $checkQuery = "
            SELECT id, saved_at FROM saved_listings 
            WHERE boarder_id = ? AND property_id = ? AND deleted_at IS NULL
        ";
        $stmt = $db->prepare($checkQuery);
        $stmt->execute([$user['user_id'], $propertyId]);
        $savedListing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        json_response(200, [
            'success' => true,
            'is_saved' => (bool)$savedListing,
            'saved_at' => $savedListing ? $savedListing['saved_at'] : null
        ]);
        
    } catch (Exception $e) {
        error_log("Error checking saved status: " . $e->getMessage());
        json_response(500, ['error' => 'Failed to check saved status']);
    }
}

// Route handling
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['property_id'])) {
            checkSavedStatus();
        } else {
            getSavedListings();
        }
        break;
        
    case 'POST':
        saveProperty();
        break;
        
    case 'DELETE':
        removeSavedProperty();
        break;
        
    default:
        json_response(405, ['error' => 'Method not allowed']);
        break;
}