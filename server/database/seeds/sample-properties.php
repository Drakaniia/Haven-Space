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
    $stmt = $pdo->prepare("
        INSERT IGNORE INTO users (id, first_name, last_name, email, role, is_verified, email_verified) 
        VALUES (1, 'Juan', 'Dela Cruz', 'landlord@example.com', 'landlord', 1, 1)
    ");
    $stmt->execute();

    // Create sample properties
    $properties = [
        [
            'id' => 1,
            'title' => 'Cozy Student Boarding House',
            'description' => 'A comfortable and affordable boarding house perfect for students. Located near major universities with easy access to public transportation. Features include high-speed WiFi, 24/7 security, and a friendly community atmosphere.',
            'address' => '123 University Ave, Diliman, Quezon City',
            'price' => 4500.00,
            'latitude' => 14.6537,
            'longitude' => 121.0685
        ],
        [
            'id' => 2,
            'title' => 'Campus View Residences',
            'description' => 'Modern boarding house with excellent amenities and great views of the campus. Perfect for students who want comfort and convenience.',
            'address' => '456 Loyola Heights, Quezon City',
            'price' => 6500.00,
            'latitude' => 14.6400,
            'longitude' => 121.0776
        ],
        [
            'id' => 3,
            'title' => 'Greenfield Boarding House',
            'description' => 'Spacious rooms in a quiet neighborhood. Great for students who prefer a peaceful environment for studying.',
            'address' => '789 Commonwealth Ave, Quezon City',
            'price' => 5200.00,
            'latitude' => 14.6760,
            'longitude' => 121.0437
        ],
        [
            'id' => 4,
            'title' => 'Metro Student Hub',
            'description' => 'Centrally located boarding house with modern facilities and excellent connectivity to major universities.',
            'address' => '321 Katipunan Ave, Quezon City',
            'price' => 5800.00,
            'latitude' => 14.6350,
            'longitude' => 121.0700
        ],
        [
            'id' => 5,
            'title' => 'Haven Student Residence',
            'description' => 'Premium boarding house offering comfortable living spaces for students. Features include study areas, recreational facilities, and 24/7 security. Located in a safe and accessible area with nearby convenience stores and restaurants.',
            'address' => '567 Maginhawa St, Teachers Village, Quezon City',
            'price' => 4500.00,
            'latitude' => 14.6421,
            'longitude' => 121.0658
        ]
    ];

    foreach ($properties as $property) {
        $stmt = $pdo->prepare("
            INSERT IGNORE INTO properties (id, landlord_id, title, description, address, price, latitude, longitude, listing_moderation_status) 
            VALUES (?, 1, ?, ?, ?, ?, ?, ?, 'published')
        ");
        $stmt->execute([
            $property['id'],
            $property['title'],
            $property['description'],
            $property['address'],
            $property['price'],
            $property['latitude'],
            $property['longitude']
        ]);
    }

    // Create property details for property ID 5
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS property_details (
                id INT AUTO_INCREMENT PRIMARY KEY,
                property_id INT NOT NULL,
                city VARCHAR(100),
                province VARCHAR(100),
                property_type VARCHAR(100),
                deposit VARCHAR(100),
                min_stay VARCHAR(100),
                capacity VARCHAR(10),
                availability VARCHAR(50),
                total_rooms INT,
                house_rules JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
            )
        ");

        $stmt = $pdo->prepare("
            INSERT IGNORE INTO property_details (property_id, city, province, property_type, deposit, min_stay, capacity, availability, total_rooms, house_rules) 
            VALUES (5, 'Quezon City', 'Metro Manila', 'Boarding House', '2 months', '6 months', '1-2', 'available-now', 8, ?)
        ");
        $houseRules = json_encode([
            ['title' => 'Curfew', 'desc' => 'Building locks at 11:00 PM on weekdays, 12:00 AM on weekends', 'icon' => 'clock'],
            ['title' => 'No Smoking', 'desc' => 'Smoking is not allowed inside the building', 'icon' => 'noSmoking'],
            ['title' => 'No Pets', 'desc' => 'Pets are not allowed on the premises', 'icon' => 'noPets'],
            ['title' => 'Visitors', 'desc' => 'Visitors allowed until 9:00 PM only', 'icon' => 'userGroup']
        ]);
        $stmt->execute([$houseRules]);
    } catch (PDOException $e) {
        echo "Note: Could not create property_details table: " . $e->getMessage() . "\n";
    }

    // Create property amenities
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS property_amenities (
                id INT AUTO_INCREMENT PRIMARY KEY,
                property_id INT NOT NULL,
                amenity_name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
            )
        ");

        $amenities = [
            'High-Speed WiFi', 'Air Conditioning', 'Parking Space', 'Laundry Area',
            '24/7 Security', 'CCTV Surveillance', 'Kitchen Access', 'Furnished Rooms',
            'Backup Generator', 'Water Heater', 'Weekly Cleaning', 'Common Area'
        ];

        foreach ($amenities as $amenity) {
            $stmt = $pdo->prepare("INSERT IGNORE INTO property_amenities (property_id, amenity_name) VALUES (5, ?)");
            $stmt->execute([$amenity]);
        }
    } catch (PDOException $e) {
        echo "Note: Could not create property_amenities table: " . $e->getMessage() . "\n";
    }

    // Create rooms for property ID 5
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS rooms (
                id INT AUTO_INCREMENT PRIMARY KEY,
                property_id INT NOT NULL,
                room_number VARCHAR(10),
                room_type VARCHAR(50),
                price DECIMAL(10,2),
                status ENUM('available', 'occupied', 'maintenance') DEFAULT 'available',
                capacity INT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP NULL,
                FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
            )
        ");

        $rooms = [
            ['room_number' => 'R101', 'room_type' => 'Single Room', 'price' => 4500.00, 'status' => 'available', 'capacity' => 1],
            ['room_number' => 'R102', 'room_type' => 'Single Room', 'price' => 4500.00, 'status' => 'available', 'capacity' => 1],
            ['room_number' => 'R103', 'room_type' => 'Shared Room', 'price' => 3000.00, 'status' => 'available', 'capacity' => 2],
            ['room_number' => 'R104', 'room_type' => 'Shared Room', 'price' => 3000.00, 'status' => 'occupied', 'capacity' => 2],
            ['room_number' => 'R201', 'room_type' => 'Single Room', 'price' => 4500.00, 'status' => 'available', 'capacity' => 1],
            ['room_number' => 'R202', 'room_type' => 'Single Room', 'price' => 4500.00, 'status' => 'available', 'capacity' => 1],
            ['room_number' => 'R203', 'room_type' => 'Shared Room', 'price' => 3000.00, 'status' => 'available', 'capacity' => 2],
            ['room_number' => 'R204', 'room_type' => 'Shared Room', 'price' => 3000.00, 'status' => 'available', 'capacity' => 2]
        ];

        foreach ($rooms as $room) {
            $stmt = $pdo->prepare("
                INSERT IGNORE INTO rooms (property_id, room_number, room_type, price, status, capacity) 
                VALUES (5, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $room['room_number'],
                $room['room_type'],
                $room['price'],
                $room['status'],
                $room['capacity']
            ]);
        }
    } catch (PDOException $e) {
        echo "Note: Could not create rooms table: " . $e->getMessage() . "\n";
    }

    // Create property photos
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS property_photos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                property_id INT NOT NULL,
                photo_url TEXT NOT NULL,
                is_cover BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
            )
        ");

        $photos = [
            ['url' => 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1200&q=80', 'is_cover' => true],
            ['url' => 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80', 'is_cover' => false],
            ['url' => 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80', 'is_cover' => false],
            ['url' => 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80', 'is_cover' => false],
            ['url' => 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=1200&q=80', 'is_cover' => false]
        ];

        foreach ($photos as $photo) {
            $stmt = $pdo->prepare("INSERT IGNORE INTO property_photos (property_id, photo_url, is_cover) VALUES (5, ?, ?)");
            $stmt->execute([$photo['url'], $photo['is_cover']]);
        }
    } catch (PDOException $e) {
        echo "Note: Could not create property_photos table: " . $e->getMessage() . "\n";
    }

    echo "Sample data created successfully!\n";
    echo "Properties created: " . count($properties) . "\n";
    echo "Property ID 5 'Haven Student Residence' is ready for testing.\n";

} catch (PDOException $e) {
    echo "Database error: " . $e->getMessage() . "\n";
    exit(1);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}