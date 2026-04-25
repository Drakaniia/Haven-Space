<?php
/**
 * Sample Properties Seeder
 * Creates sample properties for testing
 */

require_once __DIR__ . '/../../config/app.php';

try {
    // Database connection
    $dbHost = env('DB_HOST', '127.0.0.1');
    $dbPort = env('DB_PORT', '3306');
    $dbName = env('DB_NAME', 'havenspace_db');
    $dbUser = env('DB_USER', 'root');
    $dbPass = env('DB_PASS', '');

    $pdo = new PDO(
        "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4",
        $dbUser,
        $dbPass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );

    echo "Creating sample data...\n";

    // Create a sample landlord user
    $stmt = $pdo->prepare("\n        INSERT IGNORE INTO users (id, first_name, last_name, email, role_id, is_verified, email_verified) \n        VALUES (1, 'Juan', 'Dela Cruz', 'landlord@example.com', 2, 1, 1)\n    ");
    $stmt->execute();

    // Create sample properties
    $properties = [
        [
            'id' => 1,
            'title' => 'Cozy Student Boarding House',
            'description' => 'A comfortable and affordable boarding house perfect for students. Located near major universities with easy access to public transportation. Features include high-speed WiFi, 24/7 security, and a friendly community atmosphere.',
            'address' => '123 University Ave, Diliman, Quezon City',
            'city' => 'Quezon City',
            'province' => 'Metro Manila',
            'price' => 4500.00,
            'latitude' => 14.6537,
            'longitude' => 121.0685
        ],
        [
            'id' => 2,
            'title' => 'Campus View Residences',
            'description' => 'Modern boarding house with excellent amenities and great views of the campus. Perfect for students who want comfort and convenience.',
            'address' => '456 Loyola Heights, Quezon City',
            'city' => 'Quezon City',
            'province' => 'Metro Manila',
            'price' => 6500.00,
            'latitude' => 14.6400,
            'longitude' => 121.0776
        ],
        [
            'id' => 3,
            'title' => 'Greenfield Boarding House',
            'description' => 'Spacious rooms in a quiet neighborhood. Great for students who prefer a peaceful environment for studying.',
            'address' => '789 Commonwealth Ave, Quezon City',
            'city' => 'Quezon City',
            'province' => 'Metro Manila',
            'price' => 5200.00,
            'latitude' => 14.6760,
            'longitude' => 121.0437
        ],
        [
            'id' => 4,
            'title' => 'Metro Student Hub',
            'description' => 'Centrally located boarding house with modern facilities and excellent connectivity to major universities.',
            'address' => '321 Katipunan Ave, Quezon City',
            'city' => 'Quezon City',
            'province' => 'Metro Manila',
            'price' => 5800.00,
            'latitude' => 14.6350,
            'longitude' => 121.0700
        ],
        [
            'id' => 5,
            'title' => 'Haven Student Residence',
            'description' => 'Premium boarding house offering comfortable living spaces for students. Features include study areas, recreational facilities, and 24/7 security. Located in a safe and accessible area with nearby convenience stores and restaurants.',
            'address' => '567 Maginhawa St, Teachers Village, Quezon City',
            'city' => 'Quezon City',
            'province' => 'Metro Manila',
            'price' => 4500.00,
            'latitude' => 14.6421,
            'longitude' => 121.0658
        ]
    ];

    foreach ($properties as $property) {
        // First insert address
        $addressStmt = $pdo->prepare("
            INSERT IGNORE INTO addresses (address_line_1, city, province, country_id, latitude, longitude) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $addressStmt->execute([
            $property['address'],
            $property['city'],
            $property['province'],
            1, // Default to Philippines
            $property['latitude'],
            $property['longitude']
        ]);
        $addressId = $pdo->lastInsertId();

        // Then insert property with address_id
        $stmt = $pdo->prepare("\n            INSERT IGNORE INTO properties (id, landlord_id, title, description, address_id, price, listing_moderation_status) \n            VALUES (?, 1, ?, ?, ?, ?, 'published')\n        ");
        $stmt->execute([
            $property['id'],
            $property['title'],
            $property['description'],
            $addressId,
            $property['price']
        ]);
    }

    // Create property details for property ID 5
    try {
        $pdo->exec("\n            CREATE TABLE IF NOT EXISTS property_details (\n                id INT AUTO_INCREMENT PRIMARY KEY,\n                property_id INT NOT NULL,\n                city VARCHAR(100),\n                province VARCHAR(100),\n                property_type VARCHAR(100),\n                deposit VARCHAR(100),\n                rooms_available INT,\n                capacity_per_room INT,\n                amenities TEXT,\n                house_rules JSON NULL,\n                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP\n            )\n        ");

        $detailStmt = $pdo->prepare("\n            INSERT IGNORE INTO property_details (property_id, city, province, property_type, deposit, amenities, house_rules) \n            VALUES (?, ?, ?, ?, ?, ?, ?)\n        ");
        $detailStmt->execute([
            5,
            'Quezon City',
            'Metro Manila',
            'Single unit',
            '4500',
            json_encode(['WiFi', 'Air Conditioning', 'Study Area', 'Laundry Service', '24/7 Security']),
            json_encode([
                ['icon' => 'clock', 'title' => 'Curfew', 'desc' => 'Building locks at 11:00 PM on weekdays, 12:00 AM on weekends'],
                ['icon' => 'noSmoking', 'title' => 'No Smoking', 'desc' => 'Smoking is not allowed inside the building'],
                ['icon' => 'noPets', 'title' => 'No Pets', 'desc' => 'Pets are not allowed on the premises'],
                ['icon' => 'userGroup', 'title' => 'Visitors', 'desc' => 'Visitors allowed until 9:00 PM only']
            ])
        ]);
    } catch (PDOException $e) {
        // property_details table might not exist, continue without it
        error_log('property_details insert failed: ' . $e->getMessage());
    }

    // Create rooms for property ID 5
    try {
        $pdo->exec("\n            CREATE TABLE IF NOT EXISTS rooms (\n                id INT AUTO_INCREMENT PRIMARY KEY,\n                property_id INT NOT NULL,\n                landlord_id INT NOT NULL,\n                title VARCHAR(255) NOT NULL,\n                price DECIMAL(10, 2) NOT NULL,\n                status ENUM('available', 'occupied', 'maintenance') DEFAULT 'available',\n                room_number VARCHAR(50),\n                room_type VARCHAR(50),\n                capacity INT,\n                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP\n            )\n        ");

        $rooms = [
            ['Room 101', 4500.00, 'Room 101', 'single', 1],
            ['Room 102', 4500.00, 'Room 102', 'single', 1],
            ['Room 103', 4500.00, 'Room 103', 'shared', 2],
            ['Room 104', 4500.00, 'Room 104', 'shared', 2],
            ['Room 105', 4500.00, 'Room 105', 'single', 1],
        ];

        $roomStmt = $pdo->prepare("\n            INSERT IGNORE INTO rooms (property_id, landlord_id, title, price, status, room_number, room_type, capacity) \n            VALUES (?, 1, ?, ?, 'available', ?, ?, ?)\n        ");

        foreach ($rooms as $room) {
            $roomStmt->execute([5, $room[0], $room[1], $room[2], $room[3], $room[4]]);
        }
    } catch (PDOException $e) {
        // rooms table might not exist, continue without it
        error_log('rooms insert failed: ' . $e->getMessage());
    }

    echo "Sample data created successfully!\n";
} catch (PDOException $e) {
    echo "Error creating sample data: " . $e->getMessage() . "\n";
    exit(1);
}