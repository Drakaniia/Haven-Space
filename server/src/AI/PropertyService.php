<?php

namespace App\AI;

use App\Core\Database\Connection;
use PDO;

class PropertyService
{
    private $pdo;

    public function __construct()
    {
        $this->pdo = Connection::getInstance()->getPdo();
    }

    /**
     * Get all active properties with details for AI chat
     *
     * @return array Array of property data
     */
    public function getActivePropertiesForAI(): array
    {
        try {
            $stmt = $this->pdo->prepare(" 
                SELECT 
                    p.id,
                    p.title as name,
                    p.description,
                    a.address_line_1 as address,
                    a.latitude,
                    a.longitude,
                    p.price,
                    p.status,
                    pd.city,
                    pd.province,
                    pd.property_type,
                    pd.total_rooms as property_total_rooms,
                    COUNT(DISTINCT r.id) as rooms_count,
                    COALESCE(SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END), 0) as occupied_rooms,
                    u.first_name as landlord_first_name,
                    u.last_name as landlord_last_name,
                    lp.boarding_house_name as landlord_business_name
                FROM properties p
                LEFT JOIN addresses a ON p.address_id = a.id
                LEFT JOIN property_details pd ON pd.property_id = p.id
                LEFT JOIN rooms r ON p.id = r.property_id AND r.deleted_at IS NULL
                LEFT JOIN users u ON u.id = p.landlord_id
                LEFT JOIN landlord_profiles lp ON lp.user_id = p.landlord_id
                WHERE p.deleted_at IS NULL 
                    AND p.status IN ('available', 'active')
                    AND p.listing_moderation_status = 'approved'
                    AND a.latitude IS NOT NULL 
                    AND a.longitude IS NOT NULL
                GROUP BY p.id, p.title, p.description, a.address_line_1, a.latitude, a.longitude, p.price, p.status, p.listing_moderation_status, p.created_at, p.landlord_id, pd.city, pd.province, pd.property_type, pd.total_rooms, u.first_name, u.last_name, lp.boarding_house_name
                ORDER BY p.created_at DESC
                LIMIT 50
            ");
            $stmt->execute();
            $properties = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get amenities for all properties
            $propertyIds = array_column($properties, 'id');
            $amenitiesMap = [];
            
            if (!empty($propertyIds)) {
                $placeholders = implode(',', array_fill(0, count($propertyIds), '?'));
                
                $amenitiesStmt = $this->pdo->prepare(" 
                    SELECT pa.property_id, a.amenity_name 
                    FROM property_amenities pa
                    JOIN amenities a ON pa.amenity_id = a.id
                    WHERE pa.property_id IN ($placeholders)
                ");
                $amenitiesStmt->execute($propertyIds);
                $amenitiesRows = $amenitiesStmt->fetchAll(PDO::FETCH_ASSOC);
                foreach ($amenitiesRows as $row) {
                    if (!isset($amenitiesMap[$row['property_id']])) {
                        $amenitiesMap[$row['property_id']] = [];
                    }
                    $amenitiesMap[$row['property_id']][] = $row['amenity_name'];
                }
            }

            // Transform data for AI consumption
            $transformedProperties = [];
            foreach ($properties as $property) {
                // Use property_total_rooms from property_details if available, otherwise fall back to rooms_count
                $totalRooms = $property['property_total_rooms'] ? intval($property['property_total_rooms']) : intval($property['rooms_count']);
                $occupiedRooms = intval($property['occupied_rooms']);
                $occupancyRate = $totalRooms > 0 ? round(($occupiedRooms / $totalRooms) * 100) : 0;

                // Determine status based on occupancy
                $displayStatus = 'active';
                if ($occupancyRate === 100 && $totalRooms > 0) {
                    $displayStatus = 'full';
                }

                // Determine landlord display name
                $landlordName = $property['landlord_business_name'] 
                    ? $property['landlord_business_name']
                    : trim($property['landlord_first_name'] . ' ' . $property['landlord_last_name']);

                $transformedProperties[] = [
                    'id' => intval($property['id']),
                    'name' => htmlspecialchars($property['name']),
                    'description' => htmlspecialchars($property['description'] ?? ''),
                    'address' => htmlspecialchars($property['address']),
                    'latitude' => floatval($property['latitude']),
                    'longitude' => floatval($property['longitude']),
                    'city' => htmlspecialchars($property['city'] ?? ''),
                    'province' => htmlspecialchars($property['province'] ?? ''),
                    'price' => floatval($property['price']),
                    'status' => $displayStatus,
                    'total_rooms' => $totalRooms,
                    'occupied_rooms' => $occupiedRooms,
                    'occupancy_rate' => $occupancyRate,
                    'landlord_name' => htmlspecialchars($landlordName),
                    'amenities' => $amenitiesMap[$property['id']] ?? [],
                ];
            }

            return $transformedProperties;
            
        } catch (\Exception $e) {
            error_log('PropertyService error: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Check if a user message is property-related
     *
     * @param string $message User message
     * @return bool True if message is property-related
     */
    public static function isPropertyRelatedQuery(string $message): bool
    {
        $lowerMessage = strtolower($message);
        
        // Keywords that indicate property-related queries
        $propertyKeywords = [
            'property', 'properties', 'boarding house', 'boarding houses', 'rental',
            'room', 'rooms', 'apartment', 'dormitory', 'accommodation',
            'available', 'price', 'location', 'amenities', 'landlord',
            'find', 'search', 'list', 'show', 'near', 'area', 'city',
            'cheap', 'affordable', 'expensive', 'luxury', 'budget'
        ];
        
        // Questions about properties
        $questionPatterns = [
            'how much', 'what is the price', 'where is', 'where are',
            'what amenities', 'who is the landlord', 'is there', 'are there',
            'do you have', 'can you show', 'tell me about', 'information about'
        ];
        
        foreach ($propertyKeywords as $keyword) {
            if (strpos($lowerMessage, $keyword) !== false) {
                return true;
            }
        }
        
        foreach ($questionPatterns as $pattern) {
            if (strpos($lowerMessage, $pattern) !== false) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Format properties data for AI context
     *
     * @param array $properties Array of property data
     * @return string Formatted string for AI context
     */
    public static function formatPropertiesForAIContext(array $properties): string
    {
        if (empty($properties)) {
            return "No current property listings available.";
        }
        
        $context = "Current Property Listings:\n\n";
        
        foreach ($properties as $property) {
            $context .= sprintf("Property: %s\n", $property['name']);
            $context .= sprintf("Location: %s, %s, %s\n", 
                $property['address'], 
                $property['city'] ?? 'N/A', 
                $property['province'] ?? 'N/A'
            );
            $context .= sprintf("Price: ₱%.2f per month\n", $property['price']);
            $context .= sprintf("Status: %s\n", ucfirst($property['status']));
            $context .= sprintf("Rooms: %d total, %d occupied (%d%% occupancy)\n", 
                $property['total_rooms'], 
                $property['occupied_rooms'], 
                $property['occupancy_rate']
            );
            
            if (!empty($property['amenities'])) {
                $context .= "Amenities: " . implode(', ', $property['amenities']) . "\n";
            }
            
            if (!empty($property['description'])) {
                $context .= "Description: " . $property['description'] . "\n";
            }
            
            $context .= "Landlord: " . $property['landlord_name'] . "\n";
            $context .= str_repeat("-", 50) . "\n";
        }
        
        return $context;
    }
}