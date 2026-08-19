-- Seed sample listings so the public "Find a Room" page has data to show.
-- Uses INSERT ... SELECT with NOT EXISTS guards so it is safe to apply to a
-- database that already contains real rows (no hardcoded IDs).
--
-- Demo landlords can log in with email + password `Landlord123!`.

-- ---------------------------------------------------------------------------
-- Demo landlords (verified so they can also create listings through the app)
-- ---------------------------------------------------------------------------
INSERT INTO users (first_name, last_name, email, password_hash, role, is_verified, email_verified, account_status)
SELECT 'Lina', 'Santos', 'lina.santos@haven.demo', '$2b$10$3IZeQRJpGti/mN963p2Aku3Cllxf7OUDwtvOFfykcpu6E0VcJkugi', 'landlord', 1, 1, 'active'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'lina.santos@haven.demo');

INSERT INTO users (first_name, last_name, email, password_hash, role, is_verified, email_verified, account_status)
SELECT 'Ramon', 'Dela Cruz', 'ramon.delacruz@haven.demo', '$2b$10$3IZeQRJpGti/mN963p2Aku3Cllxf7OUDwtvOFfykcpu6E0VcJkugi', 'landlord', 1, 1, 'active'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'ramon.delacruz@haven.demo');

INSERT INTO users (first_name, last_name, email, password_hash, role, is_verified, email_verified, account_status)
SELECT 'Maria', 'Reyes', 'maria.reyes@haven.demo', '$2b$10$3IZeQRJpGti/mN963p2Aku3Cllxf7OUDwtvOFfykcpu6E0VcJkugi', 'landlord', 1, 1, 'active'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'maria.reyes@haven.demo');

-- ---------------------------------------------------------------------------
-- Landlord profiles
-- ---------------------------------------------------------------------------
INSERT INTO landlord_profiles (user_id, boarding_house_name, boarding_house_description, property_type, total_rooms, available_rooms, city, province)
SELECT u.id, 'Sunrise Boarding House', 'A cozy boarding house near UST with friendly staff and clean rooms.', 'Boarding house', 6, 4, 'Sampaloc', 'Manila'
FROM users u WHERE u.email = 'lina.santos@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM landlord_profiles WHERE user_id = u.id);

INSERT INTO landlord_profiles (user_id, boarding_house_name, boarding_house_description, property_type, total_rooms, available_rooms, city, province)
SELECT u.id, 'Greenfield Dormitory', 'Modern dormitory along Katipunan with study areas for students.', 'Dormitory', 8, 6, 'Quezon City', 'Metro Manila'
FROM users u WHERE u.email = 'ramon.delacruz@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM landlord_profiles WHERE user_id = u.id);

INSERT INTO landlord_profiles (user_id, boarding_house_name, boarding_house_description, property_type, total_rooms, available_rooms, city, province)
SELECT u.id, 'Taft Tower Residences', 'Secure apartments along Taft Avenue, minutes away from DLSU.', 'Apartment', 5, 3, 'Malate', 'Manila'
FROM users u WHERE u.email = 'maria.reyes@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM landlord_profiles WHERE user_id = u.id);

-- ---------------------------------------------------------------------------
-- Addresses
-- ---------------------------------------------------------------------------
INSERT INTO addresses (address_line_1, city, province, latitude, longitude)
SELECT '123 España Blvd', 'Sampaloc', 'Manila', 14.6096, 120.9895
WHERE NOT EXISTS (SELECT 1 FROM addresses WHERE address_line_1 = '123 España Blvd' AND city = 'Sampaloc');

INSERT INTO addresses (address_line_1, city, province, latitude, longitude)
SELECT '45 Katipunan Ave', 'Quezon City', 'Metro Manila', 14.6351, 121.0770
WHERE NOT EXISTS (SELECT 1 FROM addresses WHERE address_line_1 = '45 Katipunan Ave' AND city = 'Quezon City');

INSERT INTO addresses (address_line_1, city, province, latitude, longitude)
SELECT '78 Taft Ave', 'Malate', 'Manila', 14.5598, 120.9936
WHERE NOT EXISTS (SELECT 1 FROM addresses WHERE address_line_1 = '78 Taft Ave' AND city = 'Malate');

INSERT INTO addresses (address_line_1, city, province, latitude, longitude)
SELECT '12 Aguinaldo Hwy', 'Dasmariñas', 'Cavite', 14.3294, 120.9367
WHERE NOT EXISTS (SELECT 1 FROM addresses WHERE address_line_1 = '12 Aguinaldo Hwy' AND city = 'Dasmariñas');

INSERT INTO addresses (address_line_1, city, province, latitude, longitude)
SELECT '56 Mabini St', 'Baguio City', 'Benguet', 16.4023, 120.5960
WHERE NOT EXISTS (SELECT 1 FROM addresses WHERE address_line_1 = '56 Mabini St' AND city = 'Baguio City');

INSERT INTO addresses (address_line_1, city, province, latitude, longitude)
SELECT '98 Dapitan St', 'Sampaloc', 'Manila', 14.6150, 120.9930
WHERE NOT EXISTS (SELECT 1 FROM addresses WHERE address_line_1 = '98 Dapitan St' AND city = 'Sampaloc');

-- ---------------------------------------------------------------------------
-- Properties (all published so they appear on Find a Room)
-- ---------------------------------------------------------------------------
INSERT INTO properties (landlord_id, address_id, title, description, property_type, price, deposit, advance, min_stay, house_rules, gender_preference, property_rules, status, listing_moderation_status, created_at)
SELECT u.id, a.id, 'Sunrise Boarding House',
  'A cozy boarding house along España Boulevard, a short walk from UST. Clean rooms, strong WiFi, and a shared kitchen for students who like to cook.',
  'boarding-house', 3500, 3500, '1 month', '1 month',
  '["No smoking indoors","Quiet hours from 10pm to 6am","Visitors allowed until 9pm"]',
  'any', 'Common areas are cleaned weekly. Please pay rent on or before the 5th of each month.', 'available', 'published', datetime('now', '-2 days')
FROM users u, addresses a
WHERE u.email = 'lina.santos@haven.demo' AND a.address_line_1 = '123 España Blvd' AND a.city = 'Sampaloc'
  AND NOT EXISTS (SELECT 1 FROM properties WHERE title = 'Sunrise Boarding House');

INSERT INTO properties (landlord_id, address_id, title, description, property_type, price, deposit, advance, min_stay, house_rules, gender_preference, property_rules, status, listing_moderation_status, created_at)
SELECT u.id, a.id, 'Greenfield Dormitory',
  'Modern dormitory along Katipunan Avenue with dedicated study areas, fast internet, and 24/7 security. Ideal for Ateneo and UP students.',
  'dormitory', 4200, 4200, '1 month', '3 months',
  '["No smoking anywhere on the property","Study hours observed 7pm-10pm","No pets"]',
  'any', 'Monthly rent includes water. Electricity is billed separately based on the sub-meter.', 'available', 'published', datetime('now', '-1 day')
FROM users u, addresses a
WHERE u.email = 'ramon.delacruz@haven.demo' AND a.address_line_1 = '45 Katipunan Ave' AND a.city = 'Quezon City'
  AND NOT EXISTS (SELECT 1 FROM properties WHERE title = 'Greenfield Dormitory');

INSERT INTO properties (landlord_id, address_id, title, description, property_type, price, deposit, advance, min_stay, house_rules, gender_preference, property_rules, status, listing_moderation_status, created_at)
SELECT u.id, a.id, 'Taft Tower Residences',
  'Secure apartment units along Taft Avenue, minutes away from DLSU and St. Scholastica. Fully furnished with air conditioning and parking available.',
  'apartment', 5500, 5500, '2 months', '6 months',
  '["No smoking inside units","Pets allowed with prior approval","Quiet hours 10pm-7am"]',
  'female', 'Association dues included in rent. Guests must register at the lobby.', 'available', 'published', datetime('now', '-5 days')
FROM users u, addresses a
WHERE u.email = 'maria.reyes@haven.demo' AND a.address_line_1 = '78 Taft Ave' AND a.city = 'Malate'
  AND NOT EXISTS (SELECT 1 FROM properties WHERE title = 'Taft Tower Residences');

INSERT INTO properties (landlord_id, address_id, title, description, property_type, price, deposit, advance, min_stay, house_rules, gender_preference, property_rules, status, listing_moderation_status, created_at)
SELECT u.id, a.id, 'Casa Amara Boarding House',
  'Affordable and homey boarding house along Aguinaldo Highway, walking distance to DCAT and nearby schools in Dasmariñas.',
  'boarding-house', 3000, 3000, '1 month', '1 month',
  '["No smoking indoors","Curfew at 11pm on weekdays","No visitors overnight"]',
  'any', 'Rent is due on the 1st of every month. Late payments incur a 100 peso fee per day.', 'available', 'published', datetime('now', '-10 days')
FROM users u, addresses a
WHERE u.email = 'lina.santos@haven.demo' AND a.address_line_1 = '12 Aguinaldo Hwy' AND a.city = 'Dasmariñas'
  AND NOT EXISTS (SELECT 1 FROM properties WHERE title = 'Casa Amara Boarding House');

INSERT INTO properties (landlord_id, address_id, title, description, property_type, price, deposit, advance, min_stay, house_rules, gender_preference, property_rules, status, listing_moderation_status, created_at)
SELECT u.id, a.id, 'Baguio Pine Haven',
  'Cozy studio units in the heart of Baguio with mountain views, heated showers, and a quiet study lounge. Perfect for SLU and BSU students.',
  'studio-unit', 4800, 4800, '1 month', '3 months',
  '["No smoking inside units","Keep noise down after 9pm","No pets"]',
  'male', 'Electricity and water billed monthly based on submeter reading.', 'available', 'published', datetime('now', '-15 days')
FROM users u, addresses a
WHERE u.email = 'ramon.delacruz@haven.demo' AND a.address_line_1 = '56 Mabini St' AND a.city = 'Baguio City'
  AND NOT EXISTS (SELECT 1 FROM properties WHERE title = 'Baguio Pine Haven');

INSERT INTO properties (landlord_id, address_id, title, description, property_type, price, deposit, advance, min_stay, house_rules, gender_preference, property_rules, status, listing_moderation_status, created_at)
SELECT u.id, a.id, 'University Haven Dorm',
  'Budget-friendly dormitory near UST with bunk-style shared rooms, lockers, and a common study hall. Free WiFi for all boarders.',
  'dormitory', 3800, 3800, '1 month', '1 month',
  '["No smoking indoors","Quiet hours from 10pm","Guests need landlord approval"]',
  'any', 'Includes water and WiFi. Electricity shared equally among boarders.', 'available', 'published', datetime('now', '-3 days')
FROM users u, addresses a
WHERE u.email = 'maria.reyes@haven.demo' AND a.address_line_1 = '98 Dapitan St' AND a.city = 'Sampaloc'
  AND NOT EXISTS (SELECT 1 FROM properties WHERE title = 'University Haven Dorm');

-- ---------------------------------------------------------------------------
-- Rooms
-- ---------------------------------------------------------------------------
-- Sunrise Boarding House (6 rooms, 2 occupied)
INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Room 1', 'single', 'Single Room - Room 1', 'Private room with a single bed, desk, and cabinet.', 3500, 3500, 1, 'available'
FROM properties p, users u
WHERE p.title = 'Sunrise Boarding House' AND u.email = 'lina.santos@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Room 1');

INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Room 2', 'single', 'Single Room - Room 2', 'Private room with a single bed, desk, and cabinet.', 3500, 3500, 1, 'available'
FROM properties p, users u
WHERE p.title = 'Sunrise Boarding House' AND u.email = 'lina.santos@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Room 2');

INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Room 3', 'single', 'Single Room - Room 3', 'Private room with a single bed, desk, and cabinet.', 3500, 3500, 1, 'available'
FROM properties p, users u
WHERE p.title = 'Sunrise Boarding House' AND u.email = 'lina.santos@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Room 3');

INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Room 4', 'single', 'Single Room - Room 4', 'Private room with a single bed, desk, and cabinet.', 3500, 3500, 1, 'occupied'
FROM properties p, users u
WHERE p.title = 'Sunrise Boarding House' AND u.email = 'lina.santos@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Room 4');

INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Room 5', 'shared', 'Shared Room (2 persons) - Room 5', 'Shared room for two with bunk beds.', 1750, 3500, 2, 'available'
FROM properties p, users u
WHERE p.title = 'Sunrise Boarding House' AND u.email = 'lina.santos@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Room 5');

INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Room 6', 'shared', 'Shared Room (2 persons) - Room 6', 'Shared room for two with bunk beds.', 1750, 3500, 2, 'occupied'
FROM properties p, users u
WHERE p.title = 'Sunrise Boarding House' AND u.email = 'lina.santos@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Room 6');

-- Greenfield Dormitory (8 rooms, 2 occupied)
INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Room 1', 'single', 'Single Room - Room 1', 'Private dorm room with study desk and high-speed internet.', 4200, 4200, 1, 'available'
FROM properties p, users u
WHERE p.title = 'Greenfield Dormitory' AND u.email = 'ramon.delacruz@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Room 1');

INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Room 2', 'single', 'Single Room - Room 2', 'Private dorm room with study desk and high-speed internet.', 4200, 4200, 1, 'available'
FROM properties p, users u
WHERE p.title = 'Greenfield Dormitory' AND u.email = 'ramon.delacruz@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Room 2');

INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Room 3', 'single', 'Single Room - Room 3', 'Private dorm room with study desk and high-speed internet.', 4200, 4200, 1, 'available'
FROM properties p, users u
WHERE p.title = 'Greenfield Dormitory' AND u.email = 'ramon.delacruz@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Room 3');

INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Room 4', 'single', 'Single Room - Room 4', 'Private dorm room with study desk and high-speed internet.', 4200, 4200, 1, 'available'
FROM properties p, users u
WHERE p.title = 'Greenfield Dormitory' AND u.email = 'ramon.delacruz@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Room 4');

INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Room 5', 'single', 'Single Room - Room 5', 'Private dorm room with study desk and high-speed internet.', 4200, 4200, 1, 'available'
FROM properties p, users u
WHERE p.title = 'Greenfield Dormitory' AND u.email = 'ramon.delacruz@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Room 5');

INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Room 6', 'single', 'Single Room - Room 6', 'Private dorm room with study desk and high-speed internet.', 4200, 4200, 1, 'available'
FROM properties p, users u
WHERE p.title = 'Greenfield Dormitory' AND u.email = 'ramon.delacruz@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Room 6');

INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Room 7', 'shared', 'Shared Room (4 persons) - Room 7', 'Shared room for four with individual lockers.', 1050, 4200, 4, 'occupied'
FROM properties p, users u
WHERE p.title = 'Greenfield Dormitory' AND u.email = 'ramon.delacruz@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Room 7');

INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Room 8', 'shared', 'Shared Room (4 persons) - Room 8', 'Shared room for four with individual lockers.', 1050, 4200, 4, 'occupied'
FROM properties p, users u
WHERE p.title = 'Greenfield Dormitory' AND u.email = 'ramon.delacruz@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Room 8');

-- Taft Tower Residences (5 rooms, 2 occupied)
INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Unit 1', 'studio', 'Studio Unit - Unit 1', 'Fully furnished studio with air conditioning and private bathroom.', 5500, 5500, 1, 'available'
FROM properties p, users u
WHERE p.title = 'Taft Tower Residences' AND u.email = 'maria.reyes@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Unit 1');

INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Unit 2', 'studio', 'Studio Unit - Unit 2', 'Fully furnished studio with air conditioning and private bathroom.', 5500, 5500, 1, 'available'
FROM properties p, users u
WHERE p.title = 'Taft Tower Residences' AND u.email = 'maria.reyes@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Unit 2');

INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Unit 3', 'studio', 'Studio Unit - Unit 3', 'Fully furnished studio with air conditioning and private bathroom.', 5500, 5500, 1, 'available'
FROM properties p, users u
WHERE p.title = 'Taft Tower Residences' AND u.email = 'maria.reyes@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Unit 3');

INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Unit 4', 'studio', 'Studio Unit - Unit 4', 'Fully furnished studio with air conditioning and private bathroom.', 5500, 5500, 1, 'occupied'
FROM properties p, users u
WHERE p.title = 'Taft Tower Residences' AND u.email = 'maria.reyes@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Unit 4');

INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Unit 5', 'studio', 'Studio Unit - Unit 5', 'Fully furnished studio with air conditioning and private bathroom.', 5500, 5500, 1, 'occupied'
FROM properties p, users u
WHERE p.title = 'Taft Tower Residences' AND u.email = 'maria.reyes@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Unit 5');

-- Casa Amara Boarding House (4 rooms, all available)
INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Room 1', 'single', 'Single Room - Room 1', 'Simple private room with a bed and study table.', 3000, 3000, 1, 'available'
FROM properties p, users u
WHERE p.title = 'Casa Amara Boarding House' AND u.email = 'lina.santos@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Room 1');

INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Room 2', 'single', 'Single Room - Room 2', 'Simple private room with a bed and study table.', 3000, 3000, 1, 'available'
FROM properties p, users u
WHERE p.title = 'Casa Amara Boarding House' AND u.email = 'lina.santos@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Room 2');

INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Room 3', 'single', 'Single Room - Room 3', 'Simple private room with a bed and study table.', 3000, 3000, 1, 'available'
FROM properties p, users u
WHERE p.title = 'Casa Amara Boarding House' AND u.email = 'lina.santos@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Room 3');

INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Room 4', 'shared', 'Shared Room (2 persons) - Room 4', 'Shared room for two with bunk beds.', 1500, 3000, 2, 'available'
FROM properties p, users u
WHERE p.title = 'Casa Amara Boarding House' AND u.email = 'lina.santos@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Room 4');

-- Baguio Pine Haven (3 rooms, 1 occupied)
INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Unit A', 'studio', 'Studio Unit - Unit A', 'Studio with a queen bed, kitchenette, and mountain view.', 4800, 4800, 1, 'available'
FROM properties p, users u
WHERE p.title = 'Baguio Pine Haven' AND u.email = 'ramon.delacruz@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Unit A');

INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Unit B', 'studio', 'Studio Unit - Unit B', 'Studio with a queen bed, kitchenette, and mountain view.', 4800, 4800, 1, 'available'
FROM properties p, users u
WHERE p.title = 'Baguio Pine Haven' AND u.email = 'ramon.delacruz@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Unit B');

INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Unit C', 'studio', 'Studio Unit - Unit C', 'Studio with a queen bed, kitchenette, and mountain view.', 4800, 4800, 1, 'occupied'
FROM properties p, users u
WHERE p.title = 'Baguio Pine Haven' AND u.email = 'ramon.delacruz@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Unit C');

-- University Haven Dorm (7 rooms, 2 occupied)
INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Room 1', 'single', 'Single Room - Room 1', 'Budget single room with a bed, desk, and cabinet.', 3800, 3800, 1, 'available'
FROM properties p, users u
WHERE p.title = 'University Haven Dorm' AND u.email = 'maria.reyes@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Room 1');

INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Room 2', 'single', 'Single Room - Room 2', 'Budget single room with a bed, desk, and cabinet.', 3800, 3800, 1, 'available'
FROM properties p, users u
WHERE p.title = 'University Haven Dorm' AND u.email = 'maria.reyes@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Room 2');

INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Room 3', 'single', 'Single Room - Room 3', 'Budget single room with a bed, desk, and cabinet.', 3800, 3800, 1, 'available'
FROM properties p, users u
WHERE p.title = 'University Haven Dorm' AND u.email = 'maria.reyes@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Room 3');

INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Room 4', 'single', 'Single Room - Room 4', 'Budget single room with a bed, desk, and cabinet.', 3800, 3800, 1, 'available'
FROM properties p, users u
WHERE p.title = 'University Haven Dorm' AND u.email = 'maria.reyes@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Room 4');

INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Room 5', 'single', 'Single Room - Room 5', 'Budget single room with a bed, desk, and cabinet.', 3800, 3800, 1, 'available'
FROM properties p, users u
WHERE p.title = 'University Haven Dorm' AND u.email = 'maria.reyes@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Room 5');

INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Room 6', 'shared', 'Shared Room (3 persons) - Room 6', 'Shared room for three with individual beds.', 1267, 3800, 3, 'occupied'
FROM properties p, users u
WHERE p.title = 'University Haven Dorm' AND u.email = 'maria.reyes@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Room 6');

INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, description, price, deposit, capacity, status)
SELECT p.id, u.id, 'Room 7', 'shared', 'Shared Room (3 persons) - Room 7', 'Shared room for three with individual beds.', 1267, 3800, 3, 'occupied'
FROM properties p, users u
WHERE p.title = 'University Haven Dorm' AND u.email = 'maria.reyes@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE property_id = p.id AND room_number = 'Room 7');

-- ---------------------------------------------------------------------------
-- Amenities
-- ---------------------------------------------------------------------------
INSERT INTO amenities (property_id, amenity_name)
SELECT p.id, v.name
FROM properties p
JOIN (SELECT column1 AS name FROM (VALUES ('WiFi'), ('Air conditioning'), ('Furnished'), ('Laundry'), ('Kitchen'), ('CCTV'))) v
WHERE p.title = 'Sunrise Boarding House'
  AND NOT EXISTS (SELECT 1 FROM amenities WHERE property_id = p.id AND amenity_name = v.name);

INSERT INTO amenities (property_id, amenity_name)
SELECT p.id, v.name
FROM properties p
JOIN (SELECT column1 AS name FROM (VALUES ('WiFi'), ('Study area'), ('Laundry'), ('Security'), ('Generator'))) v
WHERE p.title = 'Greenfield Dormitory'
  AND NOT EXISTS (SELECT 1 FROM amenities WHERE property_id = p.id AND amenity_name = v.name);

INSERT INTO amenities (property_id, amenity_name)
SELECT p.id, v.name
FROM properties p
JOIN (SELECT column1 AS name FROM (VALUES ('WiFi'), ('Air conditioning'), ('Parking'), ('CCTV'), ('Security'), ('Furnished'))) v
WHERE p.title = 'Taft Tower Residences'
  AND NOT EXISTS (SELECT 1 FROM amenities WHERE property_id = p.id AND amenity_name = v.name);

INSERT INTO amenities (property_id, amenity_name)
SELECT p.id, v.name
FROM properties p
JOIN (SELECT column1 AS name FROM (VALUES ('WiFi'), ('Parking'), ('Kitchen'), ('Laundry'))) v
WHERE p.title = 'Casa Amara Boarding House'
  AND NOT EXISTS (SELECT 1 FROM amenities WHERE property_id = p.id AND amenity_name = v.name);

INSERT INTO amenities (property_id, amenity_name)
SELECT p.id, v.name
FROM properties p
JOIN (SELECT column1 AS name FROM (VALUES ('WiFi'), ('Furnished'), ('Kitchen'), ('Security'))) v
WHERE p.title = 'Baguio Pine Haven'
  AND NOT EXISTS (SELECT 1 FROM amenities WHERE property_id = p.id AND amenity_name = v.name);

INSERT INTO amenities (property_id, amenity_name)
SELECT p.id, v.name
FROM properties p
JOIN (SELECT column1 AS name FROM (VALUES ('WiFi'), ('Study area'), ('Laundry'), ('CCTV'))) v
WHERE p.title = 'University Haven Dorm'
  AND NOT EXISTS (SELECT 1 FROM amenities WHERE property_id = p.id AND amenity_name = v.name);
